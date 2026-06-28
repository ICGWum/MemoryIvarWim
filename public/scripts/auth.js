const originalFetch = window.fetch;

function clearStoredToken() {
    console.log("Clearing stored token");
    localStorage.removeItem("token");
}

function validateToken() {
    const token = localStorage.getItem("token");

    try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const expiresInMs = (payload.exp * 1000) - Date.now();

        if (expiresInMs <= 0) {
            clearStoredToken();
        }

    } catch {
        clearStoredToken();
    }
}

window.fetch = (url, options = {}) => {

    const isBackend = url.startsWith("http://127.0.0.1:8000") || url.startsWith("/");

    if (isBackend) {

        validateToken();
        const token = localStorage.getItem("token");

        options.headers = {
            ...options.headers,
            Authorization: "Bearer " + token,
            "Content-Type": "application/json"
        };
    }

    return originalFetch(url, options);
};

function getTokenExpirationMs(token) {
    try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        return (payload.exp * 1000) - Date.now();
    } catch {
        return -1;
    }
}

function showSessionExpiredPopup() {
    // voorkom dubbele popup
    if (document.getElementById("session-expired-popup")) return;

    const overlay = document.createElement("div");
    overlay.id = "session-expired-popup";
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.background = "rgba(0,0,0,0.6)";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.zIndex = "99999";

    const box = document.createElement("div");
    box.style.background = "#0018a1";
    box.style.padding = "24px";
    box.style.borderRadius = "12px";
    box.style.textAlign = "center";
    box.style.minWidth = "280px";

    const text = document.createElement("p");
    text.textContent = "Je sessie is verlopen. Log opnieuw in om verder te gaan.";

    const btn = document.createElement("button");
    btn.textContent = "Ga naar login";
    btn.style.marginTop = "12px";
    btn.style.padding = "10px 16px";
    btn.style.cursor = "pointer";

    const btn2 = document.createElement("button");
    btn2.textContent = "Sluiten";
    btn2.style.marginTop = "12px";
    btn2.style.padding = "10px 16px";
    btn2.style.cursor = "pointer";

    btn.onclick = () => {
        localStorage.removeItem("token");
        window.location.href = "login.html";
    };

    btn2.onclick = () => {
        document.body.removeChild(overlay);
    };

    box.appendChild(text);
    box.appendChild(btn);
    box.appendChild(btn2);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
}

function startSessionWatcher() {
    setInterval(() => {
        const token = localStorage.getItem("token");
        if (!token) return;

        const expiresInMs = getTokenExpirationMs(token);

        if (expiresInMs <= 0) {
            clearStoredToken();
            showSessionExpiredPopup();
        }
    }, 5000);
}

startSessionWatcher();