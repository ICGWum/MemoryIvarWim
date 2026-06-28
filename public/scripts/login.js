const message = document.getElementById("message");

document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
        username: document.getElementById("username").value,
        password: document.getElementById("password").value
    };

    try {
        const res = await fetch("http://127.0.0.1:8000/memory/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (res.ok && data.token) {
            localStorage.setItem("token", data.token);

            message.style.color = "#22c55e";
            message.textContent = "Login successful...";

            setTimeout(() => {
                window.location.href = "index.html";
            }, 800);

        } else {
            message.style.color = "#ef4444";
            message.textContent = "Invalid login";
        }

    } catch (e) {
        message.style.color = "#ef4444";
        message.textContent = "Server error";
    }
});

document.getElementById("githubLoginBtn").addEventListener("click", () => {
    window.location.href = "http://127.0.0.1:8000/connect/github";
});