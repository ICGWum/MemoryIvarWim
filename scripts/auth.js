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