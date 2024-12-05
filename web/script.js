console.log("Script loaded"); // Add this line at the beginning of script.js

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

    // 初始化 EventSource
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

// Function to handle the Admin / Log Out button behavior
function handleAdminButton() {
    if (document.getElementById('adminButton').innerText === "Admin") {
        showLoginModal();  // Show login modal if not logged in
    } else {
        logout();  // Log out if already logged in
    }
}

// Show login modal
function showLoginModal() {
    const loginModal = document.getElementById('loginModal');
    loginModal.classList.add('show');  // Show modal on button click
}

// Hide login modal
function closeLoginModal() {
    const loginModal = document.getElementById('loginModal');
    loginModal.classList.remove('show');  // Hide modal when closed
}

// Check login status, toggle button text, and show/hide admin message
async function checkLoginStatus() {
    const response = await fetch('/check-login');
    const data = await response.json();
    const adminButton = document.getElementById('adminButton');
    const adminMessage = document.getElementById('adminMessage');  // Select the message element

    if (data.loggedIn) {
        adminButton.innerText = "Log Out";
        adminMessage.style.display = "block";  // Show the message when logged in
    } else {
        adminButton.innerText = "Admin";
        adminMessage.style.display = "none";   // Hide the message when logged out
    }
}

// Log out function
async function logout() {
    const response = await fetch('/logout', { method: 'POST' });
    const data = await response.json();

    if (data.success) {
        document.getElementById('adminButton').innerText = "Admin";  // Reset button text
        document.getElementById('adminMessage').style.display = "none";  // Hide the message on logout
    }
}

// After successful login, change button text to "Log Out" and show the message
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
        document.getElementById('adminButton').innerText = "Log Out";  // Update button text
        document.getElementById('adminMessage').style.display = "block";  // Show the message on login
        closeLoginModal();
    } else {
        document.getElementById('loginMessage').innerText = "Login failed. Try again.";
    }
}

// 切換顯示/隱藏密碼
document.getElementById('togglePassword').addEventListener('click', function () {
    const passwordField = document.getElementById('password');
    const toggleButton = this;

    // 切換密碼框類型
    if (passwordField.type === 'password') {
        passwordField.type = 'text';
        toggleButton.innerHTML = '&#128065;'; // 眼睛打開的符號
    } else {
        passwordField.type = 'password';
        toggleButton.innerHTML = '&#128065;'; // 眼睛關閉的符號
    }
});


// Call checkLoginStatus on page load to set initial button state and message visibility
window.onload = checkLoginStatus;

