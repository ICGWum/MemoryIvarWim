document
        .getElementById("registerForm")
        .addEventListener("submit", async (e) => {

            e.preventDefault();

            const message = document.getElementById("message");

            const payload = {
                username: document.getElementById("username").value,
                email: document.getElementById("email").value,
                password: document.getElementById("password").value
            };

            try {

                const response = await fetch(
                    `http://127.0.0.1:8000/memory/register`,
                    {
                        method: "POST",
                        body: JSON.stringify(payload)
                    }
                );

                if (response.status === 201) {

                    localStorage.setItem(
                        "username",
                        payload.username
                    );

                    message.style.color = "green";
                    message.textContent =
                        "Registration successful! Redirecting to login...";

                    setTimeout(() => {
                        window.location.href = "login.html";
                    }, 1500);
                } else {

                    const error = await response.json();

                    message.style.color = "red";
                    message.textContent =
                        error.error || "Registration failed";
                }

            } catch (err) {

                message.style.color = "red";
                message.textContent =
                    "Could not connect to server";

                console.error(err);
            }
        });

    document
        .getElementById("startBtn")
        .addEventListener("click", () => {

            if (!localStorage.getItem("difficulty")) {
                localStorage.setItem("difficulty", "Easy");
            }

            window.location.href = "index.html";
        });