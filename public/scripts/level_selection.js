const CONT_KEY = "miw_selected_continent";
  const DIFF_KEY = "miw_selected_difficulty";

  let selectedContinent = localStorage.getItem(CONT_KEY) || "World";
  let selectedDifficulty = localStorage.getItem(DIFF_KEY) || "Easy";

  // CONTINENT
  const continentTiles = document.querySelectorAll(".tile");

  function updateContinents() {
    continentTiles.forEach(t => {
      t.classList.toggle(
        "active",
        t.dataset.continent === selectedContinent
      );
    });
  }

  continentTiles.forEach(tile => {
    tile.addEventListener("click", () => {
      selectedContinent = tile.dataset.continent;
      localStorage.setItem(CONT_KEY, selectedContinent);
      updateContinents();
    });
  });

  updateContinents();

  // DIFFICULTY
  const diffTiles = document.querySelectorAll(".difficulty");

  function updateDifficulty() {
    diffTiles.forEach(d => {
      d.classList.toggle(
        "active",
        d.dataset.difficulty === selectedDifficulty
      );
    });
  }

  diffTiles.forEach(tile => {
    tile.addEventListener("click", () => {
      selectedDifficulty = tile.dataset.difficulty;
      localStorage.setItem(DIFF_KEY, selectedDifficulty);
      updateDifficulty();
    });
  });

  updateDifficulty();

  // START
  document.getElementById("startBtn").addEventListener("click", () => {
    localStorage.setItem(CONT_KEY, selectedContinent);
    localStorage.setItem(DIFF_KEY, selectedDifficulty);
    window.location.href = "game.html";
  });