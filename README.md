# Playlist Downloader

A self-hosted web application for downloading playlists from Spotify and YouTube as MP3 files. The application provides a web interface for users to input playlist links, which are then downloaded as audio files using `spotdl` (for Spotify) or `yt-dlp` (for YouTube).

## Features

- **Download Spotify and YouTube playlists**: Automatically detects and processes playlists based on the URL.
- **Session-based download directories**: Isolates each user session to a unique download directory.
- **Progress bar and download logs**: View download progress and logs in real-time via the web interface.
- **Auto-cleanup**: Deletes temporary session download folders after a specified time.
<!--- **Admin mode**: Allows the admin to specify a custom directory for downloads.
-->
## Prerequisites

- **Docker** and **Docker Compose** installed on your system.

## Installation

**Run with Docker Compose**:
   Use the provided `docker-compose.yaml` configuration to start the container.
   ```yaml
    services:
      playlistdl:
        image: yourdockerhubusername/playlistdl:v1
        container_name: playlistdl
        build: .
        ports:
          - "5000:5000"
        volumes:
          - ./downloads:/app/downloads
        environment:
          - CLEANUP_INTERVAL=300  # Cleanup interval in seconds (optional)
        restart: unless-stopped
```

## Usage

1. **Access the Web Interface**:
   Open a browser and navigate to `http://localhost:5000` (replace `localhost` with your server IP if remote).

2. **Download a Playlist**:
   - Enter a Spotify or YouTube playlist URL.
   - Click **Download** to start the process.
   - Monitor download progress and logs via the interface.
<!--
3. **Admin Mode**:
   - Click the **Admin** button to log in with your credentials.
   - Once logged in, specify a custom folder name where the files will be downloaded.
-->
## Configuration

### Environment Variables

- `CLEANUP_INTERVAL`: (Optional) Sets the cleanup interval for session-based download folders. Defaults to `300` seconds (5 minutes) if not specified.

## Technical Overview

- **Backend**: Flask application that handles download requests and manages session-based directories.
- **Frontend**: Simple HTML/JavaScript interface for input, progress display, and log viewing.
- **Tools**:
  - `spotdl` for downloading Spotify playlists.
  - `yt-dlp` for downloading YouTube playlists as MP3s.

## Notes

- This application is intended for personal use. Make sure to follow copyright laws and only download media you’re authorized to use.
- Ensure that the `downloads` directory has appropriate permissions if running on a remote server.

## Troubleshooting

- **Permissions**: Ensure the `downloads` directory has the correct permissions for Docker to write files.
- **Port Conflicts**: If port 5000 is in use, adjust the port mapping in the `docker-compose.yaml` file.