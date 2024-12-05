console.log("Script loaded");

document.addEventListener('DOMContentLoaded', function () {
    // 添加清除功能
    document.querySelectorAll('.input-container').forEach(container => {
        const input = container.querySelector('input');
        const clearButton = container.querySelector('.clear-input');

        if (input && clearButton) {
            input.addEventListener('input', function () {
                clearButton.style.display = this.value ? 'block' : 'none';
            });

            // 清除按鈕點擊事件
            clearButton.addEventListener('click', function () {
                input.value = '';
                this.style.display = 'none';
                input.focus();
            });

            clearButton.style.display = input.value ? 'block' : 'none';
        }
    });

    const passwordToggle = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');

    if (passwordToggle && passwordInput) {
        passwordToggle.addEventListener('click', function () {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.textContent = type === 'password' ? '👁️' : '👁️‍🗨️';
        });
    }
});

async function download() {
    const inputLink = document.getElementById('inputLink').value;

    if (!inputLink) {
        document.getElementById('result').innerText = "Please enter a valid link.";
        return;
    }

    // 判斷連結類型
    const isSpotify = /spotify\.com/.test(inputLink);
    const isYouTube = /youtube\.com|youtu\.be/.test(inputLink);

    if (!isSpotify && !isYouTube) {
        document.getElementById('result').innerText =
            "The link you provided is not recognized. Please enter a Spotify or YouTube link.";
        return;
    }

    // 決定請求的伺服器端點
    const endpoint = isSpotify
        ? `/download?spotify_link=${encodeURIComponent(inputLink)}`
        : `/download?youtube_link=${encodeURIComponent(inputLink)}`;

    const eventSource = new EventSource(endpoint);

    // 清除舊的日誌和進度條
    const logsElement = document.getElementById('logs');
    logsElement.innerHTML = "";
    document.getElementById('result').innerText = "";

    const progressBar = document.getElementById('progress');
    progressBar.style.display = 'block';
    progressBar.value = 0;
    const increment = 10;

    // 處理伺服器的事件訊息
    eventSource.onmessage = function (event) {
        const log = event.data;

        if (log.startsWith("DOWNLOAD:")) {
            progressBar.value = 100;
            const path = log.split("DOWNLOAD: ")[1];
            const downloadLink = document.createElement('a');
            downloadLink.href = `/downloads/${path}`;
            downloadLink.download = path.split('/').pop();
            downloadLink.innerText = "Click to download your file";
            document.getElementById('result').appendChild(downloadLink);
            downloadLink.click();

            eventSource.close();
            progressBar.style.display = 'none';
        } else if (log.includes("Download completed")) {
            logsElement.innerHTML += "Download completed successfully.<br>";
        } else if (log.startsWith("Error")) {
            document.getElementById('result').innerText = `Error: ${log}`;
            eventSource.close();
            progressBar.style.display = 'none';
        } else {
            progressBar.value = Math.min(progressBar.value + increment, 95);
            logsElement.innerHTML += log + "<br>";
            logsElement.scrollTop = logsElement.scrollHeight;
        }
    };

    eventSource.onerror = function () {
        if (!logsElement.innerHTML.includes("Download completed successfully")) {
            document.getElementById('result').innerText = "Error occurred while downloading.";
        }
        progressBar.style.display = 'none';
        eventSource.close();
    };
}

function handleAdminButton() {
    if (document.getElementById('adminButton').innerText === "Admin") {
        showLoginModal();
    } else {
        logout();
    }
}

function showLoginModal() {
    const loginModal = document.getElementById('loginModal');
    loginModal.classList.add('show');

    // 清除之前的輸入
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    document.getElementById('loginMessage').innerText = '';

    // 重置密碼顯示狀態
    document.getElementById('password').type = 'password';
    document.getElementById('togglePassword').textContent = '👁️';

    // 隱藏所有清除按鈕
    document.querySelectorAll('.clear-input').forEach(button => {
        button.style.display = 'none';
    });
}

function closeLoginModal() {
    const loginModal = document.getElementById('loginModal');
    loginModal.classList.remove('show');
}

async function checkLoginStatus() {
    const response = await fetch('/check-login');
    const data = await response.json();
    const adminButton = document.getElementById('adminButton');
    const adminMessage = document.getElementById('adminMessage');

    if (data.loggedIn) {
        adminButton.innerText = "Log Out";
        adminMessage.style.display = "block";
    } else {
        adminButton.innerText = "Admin";
        adminMessage.style.display = "none";
    }
}

async function logout() {
    const response = await fetch('/logout', { method: 'POST' });
    const data = await response.json();

    if (data.success) {
        document.getElementById('adminButton').innerText = "Admin";
        document.getElementById('adminMessage').style.display = "none";
    }
}

async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const response = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    const data = await response.json();
    if (data.success) {
        document.getElementById('loginMessage').innerText = "Login successful!";
        document.getElementById('adminButton').innerText = "Log Out";
        document.getElementById('adminMessage').style.display = "block";
        closeLoginModal();
    } else {
        document.getElementById('loginMessage').innerText = "Login failed. Try again.";
    }
}

window.onload = function () {
    checkLoginStatus();
};
