document.addEventListener("DOMContentLoaded", async () => {
        await Promise.all([
            loadPlayer(),
            loadPreferences()
        ]);
    });

    async function loadPlayer() {
        const res = await fetch("http://127.0.0.1:8000/player");

        if (!res.ok) return;

        const player = await res.json();

        document.getElementById("username").textContent =
            player.name;

        document.getElementById("email").value =
            player.email ?? "";

        if (player.avatar) {
            document.getElementById("avatar").src =
                player.avatar;
        } else {
            document.getElementById("avatar").src =
                `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=0f172a&color=ffffff`;
        }

        const games = player.games ?? [];

        document.getElementById("totalGames").textContent =
            games.length;

        const bestScore = games.length
            ? Math.min(...games.map(g => g.score))
            : 0;

        document.getElementById("bestScore").textContent =
            bestScore;

        const average = games.length
            ? Math.round(
                games.reduce((sum, g) => sum + g.score, 0) /
                games.length
            )
            : 0;

        document.getElementById("averageScore").textContent =
            average;

        const latestGames = [...games]
            .sort((a, b) =>
                new Date(b.date.date) -
                new Date(a.date.date)
            )
            .slice(0, 3);

        const container =
            document.getElementById("latestGames");

        if (!latestGames.length) {
            container.innerHTML =
                '<div class="empty-games">No games played yet.</div>';
            return;
        }

        container.innerHTML = latestGames.map(game => `
            <div class="game-row">
                <div>
                    <div>${game.day}</div>
                    <div class="game-date">
                        ${game.api || "Default"}
                    </div>
                </div>

                <div class="game-score">
                    ${game.score}
                </div>
            </div>
        `).join("");
    }

    async function loadPreferences() {
        const res = await fetch(
            "http://127.0.0.1:8000/player/preferences"
        );

        if (!res.ok) return;

        const data = await res.json();

        document.getElementById("api").value =
            data.api ?? "";

        document.getElementById("foundColor").value =
            data.foundColor ?? "#00ff00";

        document.getElementById("closedColor").value =
            data.closedColor ?? "#ff0000";
    }

    document.getElementById("savePreferences")
        .addEventListener("click", async () => {

            const payload = {
                api: document.getElementById("api").value,
                color_found: document.getElementById("foundColor").value,
                color_closed: document.getElementById("closedColor").value
            };

            const res = await fetch(
                "http://127.0.0.1:8000/player/preferences",
                {
                    method: "POST",
                    body: JSON.stringify(payload)
                }
            );

            if (res.status === 204) {
                alert("Preferences saved!");
            } else {
                alert("Saving failed.");
            }
        });

    document.getElementById("saveEmail")
        .addEventListener("click", async () => {

            const payload = {
                email: document.getElementById("email").value
            };

            const res = await fetch(
                "http://127.0.0.1:8000/player/email",
                {
                    method: "PUT",
                    body: JSON.stringify(payload)
                }
            );

            if (res.status === 204) {
                alert("Email updated!");
            } else {
                alert("Update failed.");
            }
        });