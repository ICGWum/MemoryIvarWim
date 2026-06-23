const RESTCOUNTRIES_KEY = "rc_live_b20feb4284d34250b68f52c8784246d3";

let countriesGeo;
const countryMap = new Map();

async function setupGeoMap() {
    countriesGeo = await fetch("/data/countries.geojson").then(r => r.json());
    countriesGeo.features.forEach(f => {
        const iso = f.properties["ISO3166-1-Alpha-3"];
        countryMap.set(iso, f);
    });
}

let region = "europe";
let countryCount = 10;

let difficulty = "Easy";
let difficultyNumber = 1;

function getDifficultyNumber(diff) {
    difficultyNumber =
        diff === "Easy" ? 1 :
        diff === "Normal" ? 2 :
        diff === "Hard" ? 3 :
        diff === "Extreme" ? 4 :
        1;
}

let cards = [];

function normalizeRegion(value) {
    return String(value ?? "Europe").trim().toLowerCase();
}

function formatRegionLabel(value) {
    const normalized = normalizeRegion(value);
    const labels = {
        world: "World",
        africa: "Africa",
        asia: "Asia",
        europe: "Europe",
        americas: "Americas",
        oceania: "Oceania"
    };

    return labels[normalized] ?? normalized;
}

function isLoggedIn() {
    return Boolean(localStorage.getItem("token"));
}

function getScorePayload() {
    const time = getElapsedSeconds();

    return {
        score: attempts + time,
        api: `${region}-${difficulty}`,
        color_found: "",
        color_closed: ""
    };
}

async function saveScoreIfLoggedIn() {
    if (!isLoggedIn() || scoreSaved) {
        return;
    }

    scoreSaved = true;

    const payload = getScorePayload();

    try {
        await fetch('http://127.0.0.1:8000/game/save', {
            method: "POST",
            body: JSON.stringify(payload)
        });

        saveStatusElement.textContent = "Score opgeslagen.";
    } catch (error) {
        scoreSaved = false;
        saveStatusElement.textContent = "Score kon niet worden opgeslagen.";
        console.error("Failed to save score:", error);
    }
}

// premade list of country names for each region for easy mode, normal mode will use api
function getCountriesForRegionOnEasy(regionName) {
    switch (regionName) {
        case "europe":
            return ["France", "Germany", "Italy", "Spain", "United Kingdom", "Poland", "Netherlands", "Belgium", "Sweden", "Norway", "Finland", "Denmark", "Switzerland", "Austria", "Portugal", "Greece", "Ireland", "Czech Republic", "Hungary", "Romania"];
        case "asia":
            return ["China", "India", "Japan", "South Korea", "Indonesia", "Thailand", "Vietnam", "Philippines", "Singapore", "Pakistan", "Bangladesh", "Sri Lanka", "Nepal", "Mongolia", "Kazakhstan"];
        case "africa":
            return ["Nigeria", "Ethiopia", "Egypt", "South Africa", "Kenya", "Morocco", "Algeria", "Sudan", "Uganda", "Tanzania", "Angola", "Zimbabwe", "Senegal", "Tunisia", "Libya", "Namibia", "Botswana", "Republic of the Congo"];
        case "americas":
            return ["United States", "Brazil", "Mexico", "Argentina", "Canada", "Colombia", "Chile", "Peru", "Venezuela", "Ecuador", "Guatemala", "Cuba", "Paraguay", "Uruguay", "Jamaica", "Costa Rica"];
        case "oceania":
            return ["Australia", "New Zealand", "Fiji", "Papua New Guinea", "Samoa", "Tonga", "Vanuatu", "Solomon Islands", "Kiribati", "Marshall Islands", "Palau", "Micronesia", "Nauru", "Tuvalu", "New Caledonia"];
        default:
            return [];
    }
}

async function getCountriesForRegion(regionName) {
    const response = await fetch(
        `https://api.restcountries.com/countries/v5?region=${regionName}&limit=100`,
        {
            headers: {
                Authorization: `Bearer ${RESTCOUNTRIES_KEY}`
            }
        }
    );

    if (!response.ok) {
        throw new Error(`API error ${response.status}`);
    }

    const data = await response.json();
    return data.data ?? data.results ?? data;
}

function getRandomCountries(countries, count) {
    const shuffled = [...countries].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

async function getCountryOutline(cca3) {
    return countryMap.get(cca3) ?? null;
}

function normalizeCountry(country) {
    if (!country) return null;

    return {
        name: {
            common: country.names?.common ?? "Unknown"
        },
        cca3: country.codes?.alpha_3 ?? null,
        flags: {
            svg: country.flag?.url_svg ?? "",
            png: country.flag?.url_png ?? ""
        },
        capital: country.capitals?.map(c => c.name) ?? []
    };
}

function isValidCountry(c) {
    return (
        c &&
        c.name?.common &&
        c.cca3 &&
        c.flags &&
        (c.flags.svg || c.flags.png)
    );
}

async function makeCardsForDifficulty(selectedDifficulty, selectedRegion) {
    const normalizedRegion = normalizeRegion(selectedRegion);

    const countriesRaw =
        selectedDifficulty === "Easy"
            ? getCountriesForRegionOnEasy(normalizedRegion).map(name => ({ name }))
            : await getCountriesForRegion(normalizedRegion);

    const countriesArray = countriesRaw.objects ?? countriesRaw.data ?? countriesRaw;
    const countries = countriesArray.map(normalizeCountry).filter(isValidCountry);
    const countriesWithOutline = countries.filter(c => countryMap.has(c.cca3));

    const countryList = getRandomCountries(countriesWithOutline, countryCount);

    const flagList = countryList.map(country => ({
        country: country.name.common,
        cca3: country.cca3,
        flag: country.flags.svg || country.flags.png
    }));

    const resultCards = [];

    flagList.forEach(item => {
        resultCards.push({
            type: "country",
            value: item.country,
            countryId: item.cca3
        });

        resultCards.push({
            type: "flag",
            value: item.flag,
            country: item.country,
            countryId: item.cca3
        });
    });

    if (difficultyNumber >= 3) {
        for (const item of flagList) {
            if (!item.cca3) continue;

            const geojson = await getCountryOutline(item.cca3);
            if (!geojson) {
                continue;
            }

            resultCards.push({
                type: "outline",
                value: geojson,
                country: item.country,
                countryId: item.cca3
            });
        }
    }

    if (difficultyNumber >= 4) {
        countryList.forEach(country => {
            const name = country.name.common;
            const capital = country.capital?.[0];

            if (!capital) return;

            resultCards.push({
                type: "capital",
                value: capital,
                country: name,
                countryId: country.cca3
            });
        });
    }

    return shuffleCards(resultCards);
}

const boardElement = document.getElementById("board");
const matchesElement = document.getElementById("matches");
const messageElement = document.getElementById("message");
const restartButton = document.getElementById("restartButton");
const scoreElement = document.getElementById("score");
const timePlayedElement = document.getElementById("timePlayed");
const attemptsSideElement = document.getElementById("attemptsSide");
const regionValueElement = document.getElementById("regionValue");
const difficultyValueElement = document.getElementById("difficultyValue");
const saveStatusElement = document.getElementById("saveStatus");

let selectedCards = [];
let lockBoard = false;
let attempts = 0;
let matches = 0;
let timerInterval = null;
let timerStartMs = null;
let elapsedSeconds = 0;
let scoreSaved = false;

function loadTheme() {
    const savedColors = JSON.parse(localStorage.getItem("themeColors"));

    if (!savedColors) return;

    document.body.style.background = savedColors[0];
    document.documentElement.style.setProperty("--button-color", savedColors[1]);
    document.documentElement.style.setProperty("--card-color", savedColors[2]);
    document.documentElement.style.setProperty("--card-revealed", savedColors[3]);
}

function shuffleCards(values) {
    const cards = [...values];

    for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
    }

    return cards;
}

function getElapsedSeconds() {
    if (timerStartMs === null) {
        return elapsedSeconds;
    }

    return Math.floor((Date.now() - timerStartMs) / 1000);
}

function updateScoreboard() {
    const time = getElapsedSeconds();
    const score = attempts + time;

    matchesElement.textContent = String(matches);
    attemptsSideElement.textContent = String(attempts);
    timePlayedElement.textContent = String(time);
    scoreElement.textContent = String(score);
}

function updateGameInfo() {
    regionValueElement.textContent = formatRegionLabel(region);
    difficultyValueElement.textContent = difficulty;
}

function updateLoginStatus() {
    if (isLoggedIn()) {
        saveStatusElement.textContent = "Score wordt opgeslagen zodra je wint.";
        saveStatusElement.classList.remove("warning");
    } else {
        saveStatusElement.textContent = "login om je score op te slaan.";
        saveStatusElement.classList.add("warning");
    }
}

function setMessage(text) {
    messageElement.textContent = text;
}

function startTimer() {
    stopTimer();
    elapsedSeconds = 0;
    timerStartMs = Date.now();
    timerInterval = window.setInterval(() => {
        updateScoreboard();
    }, 1000);
    updateScoreboard();
}

function stopTimer() {
    if (timerInterval !== null) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    if (timerStartMs !== null) {
        elapsedSeconds = Math.floor((Date.now() - timerStartMs) / 1000);
        timerStartMs = null;
    }
}

function resetTurn() {
    selectedCards = [];
    lockBoard = false;
}

function hideCards() {
    selectedCards.forEach(card => {
        card.classList.remove("revealed");
        card.innerHTML = "?";
    });
    resetTurn();
}

function markMatch() {
    selectedCards.forEach(card => {
        card.classList.add("matched");
        card.disabled = true;
    });

    selectedCards = [];
    matches++;
    updateScoreboard();

    if (matches === cards.length / selectedCardAmount()) {
        stopTimer();
        updateScoreboard();
        setMessage(`You won in ${attempts} attempts.`);
        saveScoreIfLoggedIn();
    } else {
        setMessage("Nice. Find the next pair.");
    }

    resetTurn();
}

function selectedCardAmount() {
    switch (difficulty) {
        case "Easy":
            return 2;
        case "Normal":
            return 2;
        case "Hard":
            return 3;
        case "Extreme":
            return 4;
        default:
            return 2;
    }
}

function handleCardClick(event) {
    const card = event.currentTarget;

    if (lockBoard || card.classList.contains("matched")) {
        return;
    }

    if (selectedCards.includes(card)) return;

    card.classList.add("revealed");
    card.textContent = card.dataset.symbol;
    renderCardContent(card, card._item);

    selectedCards.push(card);

    const required = selectedCardAmount();

    if (selectedCards.length < required) {
        return;
    }

    attempts++;
    updateScoreboard();
    lockBoard = true;

    const allMatch = selectedCards.every(
        c => c.dataset.countryId === selectedCards[0].dataset.countryId
    );

    if (allMatch) {
        markMatch();
    } else {
        setMessage("Not a match. Try again.");
        setTimeout(hideCards, 900);
    }
}

function createCard(cardListItem) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "card";

    card.dataset.symbol = cardListItem.value;
    card.dataset.countryId = cardListItem.countryId;
    card.dataset.type = cardListItem.type;

    card.textContent = "?";
    card.setAttribute("aria-label", "Memory card");

    card.addEventListener("click", handleCardClick);

    card._item = cardListItem;

    return card;
}

function renderCardContent(card, item) {
    card.innerHTML = "";

    switch (item.type) {
        case "country":
            card.textContent = item.value;
            break;

        case "flag": {
            const img = document.createElement("img");
            img.src = item.value;
            img.alt = "flag";
            img.style.width = "70%";
            img.style.height = "70%";
            img.style.objectFit = "contain";
            card.appendChild(img);
            break;
        }

        case "capital":
            card.textContent = item.value;
            break;

        case "outline":
            renderGeoJSON(card, item.value);
            break;
    }
}

function renderGeoJSON(card, geojson) {
    if (!geojson) return;

    const feature =
        geojson.type === "Feature"
            ? geojson
            : geojson.features?.[0];

    if (!feature) {
        return;
    }

    const width = 80;
    const height = 80;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

    const projection = d3.geoMercator().fitSize([width, height], feature);
    const path = d3.geoPath(projection);

    const d = path(feature);
    if (!d) return;

    const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
    pathEl.setAttribute("d", d);
    pathEl.setAttribute("fill", "#93c5fd");
    pathEl.setAttribute("stroke", "#0f172a");
    pathEl.setAttribute("stroke-width", "0.5");

    svg.appendChild(pathEl);
    card.appendChild(svg);
}

async function buildBoard() {
    try {
        await setupGeoMap();
        boardElement.innerHTML = "";

        region = localStorage.getItem("miw_selected_continent") ?? "Europe";
        difficulty = localStorage.getItem("miw_selected_difficulty") ?? "Easy";
        getDifficultyNumber(difficulty);

        updateGameInfo();
        updateLoginStatus();

        const cardList = await makeCardsForDifficulty(difficulty, region);
        cards = cardList;

        cardList.forEach(cardListItem => {
            boardElement.appendChild(createCard(cardListItem));
        });

        startTimer();
    } catch (error) {
        console.error("Board build failed:", error);
        setMessage("Could not build the board.");
    }
}

function restartGame() {
    selectedCards = [];
    lockBoard = false;
    attempts = 0;
    matches = 0;
    cards = [];
    scoreSaved = false;
    stopTimer();
    updateScoreboard();
    setMessage("Find every matching pair to win.");
    updateLoginStatus();
    buildBoard();
}

restartButton.addEventListener("click", restartGame);

loadTheme();
restartGame();