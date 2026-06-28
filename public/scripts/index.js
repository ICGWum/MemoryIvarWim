
const token = localStorage.getItem("token");

const guestButtons = document.getElementById("guestButtons");
const userButtons = document.getElementById("userButtons");

if (token) {
    guestButtons.style.display = "none";
    userButtons.style.display = "flex";
} else {
    guestButtons.style.display = "flex";
    userButtons.style.display = "none";
}

document.getElementById("logout")?.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.reload();
});

async function loadTopScores() {
    const res = await fetch("http://127.0.0.1:8000/memory/top-scores");

    if (!res.ok) return;

    const data = await res.json();

    const list = document.getElementById("topScores");
    list.innerHTML = "";

    data.slice(0, 5).forEach((p, i) => {
        const li = document.createElement("li");

        li.innerHTML = `
            <span>#${i + 1} ${p.username}</span>
            <strong>${p.score}</strong>
        `;

        list.appendChild(li);
    });
}

loadTopScores();