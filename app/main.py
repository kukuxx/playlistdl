from flask import Flask, send_from_directory, jsonify, request, Response
import subprocess
import os
import zipfile
import uuid
import shutil
import threading
import time
import re  # Add regex for capturing album/playlist name

app = Flask(__name__, static_folder='web')
BASE_DOWNLOAD_FOLDER = '/app/downloads'
AUDIO_DOWNLOAD_PATH = os.getenv('AUDIO_DOWNLOAD_PATH', BASE_DOWNLOAD_FOLDER)
ADMIN_USERNAME = os.getenv('ADMIN_USERNAME')
ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD')
CLEANUP_INTERVAL = os.getenv('CLEANUP_INTERVAL')

sessions = {}

os.makedirs(BASE_DOWNLOAD_FOLDER, exist_ok=True)


@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')


@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)


@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
        session_id = str(uuid.uuid4())
        sessions[session_id] = username
        response = jsonify({"success": True})
        response.set_cookie('session', session_id)
        return response
    return jsonify({"success": False}), 401


def is_logged_in():
    session_id = request.cookies.get('session')
    return session_id in sessions


@app.route('/logout', methods=['POST'])
def logout():
    response = jsonify({"success": True})
    response.delete_cookie('session')  # Remove session cookie
    return response


@app.route('/check-login')
def check_login():
    is_logged_in_status = is_logged_in()
    return jsonify({"loggedIn": is_logged_in_status})


@app.route('/download')
def download_media():
    spotify_link = request.args.get('spotify_link')
    youtube_link = request.args.get('youtube_link')
    if not spotify_link and not youtube_link:
        return jsonify({"status": "error", "output": "No link provided"}), 400

    link = spotify_link or youtube_link
    is_spotify = bool(spotify_link)
    session_id = str(uuid.uuid4())
    download_folder = AUDIO_DOWNLOAD_PATH if is_logged_in(
    ) else os.path.join(BASE_DOWNLOAD_FOLDER, session_id)
    os.makedirs(download_folder, exist_ok=True)

    # Set up command for Spotify links with spotdl
    if is_spotify:
        command = [
            'spotdl', '--output', f"{download_folder}/{{album}}/{{title}}.{{output-ext}}", link
        ]

    # Set up command for YouTube links with yt-dlp
    else:
        command = [
            'yt-dlp', '-x', '--audio-format', 'mp3', '-o',
            f"{download_folder}/%(album)s/%(title)s.%(ext)s", link
        ]

    is_admin = is_logged_in()
    return Response(
        generate(is_admin, command, download_folder, session_id), mimetype='text/event-stream'
    )


def generate(is_admin, command, download_folder, session_id):
    album_name = None  # Placeholder for album/playlist name
    try:
        process = subprocess.Popen(
            command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True
        )

        for line in process.stdout:
            yield f"data: {line.strip()}\n\n"

            # Look for the playlist or album name in SpotDL output
            match = re.search(r'Found \d+ songs in (.+?) \(', line)
            if match:
                album_name = match.group(1).strip()

        process.stdout.close()
        process.wait()

        if process.returncode == 0:
            # 遍歷資料夾找檔案
            album_folder = os.path.join(
                download_folder, album_name
            ) if album_name else download_folder
            downloaded_files = [
                os.path.join(root, file) for root, _, files in os.walk(album_folder)
                for file in files
            ]

            if len(downloaded_files) > 1 and not is_admin:
                zip_folder = os.path.join(download_folder, album_name if album_name else "unknown")
                os.makedirs(zip_folder, exist_ok=True)
                zip_filename = f"{album_name or 'playlist'}.zip"
                zip_path = os.path.join(zip_folder, zip_filename)

                with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                    for file_path in downloaded_files:
                        arcname = os.path.relpath(file_path, start=download_folder)
                        zipf.write(file_path, arcname=arcname)

                relative_path = os.path.relpath(zip_path, start=download_folder)
                yield f"data: DOWNLOAD: {session_id}/{relative_path}\n\n"

            elif downloaded_files and not is_admin:
                relative_path = os.path.relpath(downloaded_files[0], start=download_folder)
                yield f"data: DOWNLOAD: {session_id}/{relative_path}\n\n"

            else:
                yield "data: No files were downloaded.\n\n"

            if not is_admin:
                threading.Thread(target=delayed_delete, args=(download_folder, )).start()
        else:
            yield f"data: Error: Download exited with code {process.returncode}.\n\n"

    except Exception as e:
        yield f"data: Error: {str(e)}\n\n"


def delayed_delete(folder_path):
    time.sleep(CLEANUP_INTERVAL)
    shutil.rmtree(folder_path, ignore_errors=True)


@app.route('/downloads/<session_id>/<path:filename>')
def serve_download(session_id, filename):
    # 定義 session 的下載目錄
    session_download_folder = os.path.join(BASE_DOWNLOAD_FOLDER, session_id)
    # 檢查檔案是否存在
    file_path = os.path.join(session_download_folder, filename)
    if not os.path.isfile(file_path):
        return jsonify({"status": "error", "message": "File not found"}), 404
    # 下載檔案
    return send_from_directory(session_download_folder, filename, as_attachment=True)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
