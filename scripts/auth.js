const originalFetch = window.fetch;

window.fetch = (url, options = {}) => {

    // alleen backend calls
    const isBackend = url.startsWith("http://127.0.0.1:8000") || url.startsWith("/");

    if (isBackend) {
        const token = localStorage.getItem("token");

        options.headers = {
            ...options.headers,
            Authorization: "Bearer " + token,
            "Content-Type": "application/json"
        };
    }

    return originalFetch(url, options);
};