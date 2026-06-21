//first get level: meaning which region to use and get country's from.

//then get difficulty
//when diff = easy, use list of country names premade.
//when diff = normal, get list of country names from api.
//when diff = hard, get list of country names from api and add capitals to the list.
//when diff = extreme, get list of country names from api and add capitals to the list.

const RESTCOUNTRIES_KEY = "rc_live_b20feb4284d34250b68f52c8784246d3";

let countriesGeo;
const countryMap = new Map();

async function setupGeoMap() {
    countriesGeo = await fetch("/data/countries.geojson").then(r => r.json());
    countriesGeo.features.forEach(f => {
        const iso = f.properties["ISO3166-1-Alpha-3"];
        countryMap.set(iso, f);
    });
    console.log("Loaded country geo data:", countriesGeo);
    console.log("ISO sample keys:", [...countryMap.keys()].slice(0, 20));
}

let region = "europe";
let countryCount = 10;

let difficulty = "easy";
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

//premade list of country names for each region for easy mode, normal mode will use api
function getCountriesForRegionOnEasy(region) {
    switch (region) {
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

async function getCountriesForRegion(region) {

    const response = await fetch(
        `https://api.restcountries.com/countries/v5?region=${region}&limit=100`,
        {
            headers: {
                Authorization: `Bearer ${RESTCOUNTRIES_KEY}`
            }
        }
    );

    console.log(response.status);

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

function getFlagForCountry(country) {
    return country.flags.svg || country.flags.png;
}

async function getCountryOutline(cca3) {
    console.log("Getting outline for country:", cca3);
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

async function makeCardsForDifficulty(difficulty, region) {
    const countriesRaw =
        difficulty === "Easy"
            ? getCountriesForRegionOnEasy(region).map(name => ({ name }))
            : await getCountriesForRegion(region);

    const countriesArray = countriesRaw.objects ?? countriesRaw.data ?? countriesRaw;
    const countries = countriesArray.map(normalizeCountry).filter(isValidCountry);
    const countriesWithOutline = countries.filter(c => countryMap.has(c.cca3));

    console.log("RAW API:", countriesRaw);
    console.log("NORMALIZED:", countries);

    const countryList = getRandomCountries(countriesWithOutline, countryCount);

    const flagList = countryList.map(country => ({
        country: country.name.common,
        cca3: country.cca3,
        flag: country.flags.svg || country.flags.png
    }));

    const resultCards = [];

    // FLAGS + COUNTRY
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

    // OUTLINES
    if (difficultyNumber >= 3) {
        for (const item of flagList) {
            if (!item.cca3) continue;

            const geojson = await getCountryOutline(item.cca3);
            if(!geojson) {
                console.error("Failed to get outline for country:", item.cca3);
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

    // CAPITALS
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

    const shuffledCards = shuffleCards(resultCards);
    return shuffledCards;
}

const boardElement = document.getElementById("board");
const attemptsElement = document.getElementById("attempts");
const matchesElement = document.getElementById("matches");
const messageElement = document.getElementById("message");
const restartButton = document.getElementById("restartButton");

let selectedCards = [];

let lockBoard = false;
let attempts = 0;
let matches = 0;

function loadTheme() {

    const savedColors =
        JSON.parse(localStorage.getItem("themeColors"));

    if (!savedColors) return;

    document.body.style.background = savedColors[0];

    document.documentElement.style.setProperty(
        "--button-color",
        savedColors[1]
    );

    document.documentElement.style.setProperty(
        "--card-color",
        savedColors[2]
    );

    document.documentElement.style.setProperty(
        "--card-revealed",
        savedColors[3]
    );
}

function shuffleCards(values) {
    const cards = [...values];

    for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
    }

    return cards;
}

function updateScoreboard() {
    attemptsElement.textContent = String(attempts);
    matchesElement.textContent = String(matches);
    //later for adding more automatic lvls.
    // if(matches === cards.length/selectedCardAmount()) {
    //     currentLevel += 1;
    //     restartGame();
    // }
}

function setMessage(text) {
    messageElement.textContent = text;
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
    matches ++;
    updateScoreboard();

    if (matches === cards.length/selectedCardAmount()) {
        setMessage(`You won in ${attempts} attempts.`);
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

    attempts ++;
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

        case "flag":
            const img = document.createElement("img");
            img.src = item.value;
            img.alt = "flag";
            img.style.width = "70%";
            img.style.height = "70%";
            img.style.objectFit = "contain";
            card.appendChild(img);
            break;

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

    // Normalize MapTiler output
    const feature =
        geojson.type === "Feature"
            ? geojson
            : geojson.features?.[0];

    if (!feature) {
        console.warn("Invalid geojson:", geojson);
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
        console.log("Building board with region:", region, "and difficulty:", difficulty, "(", difficultyNumber, ")");

        const cardList = await makeCardsForDifficulty(difficulty, region);
        cards = cardList;

        cardList.forEach((cardListItem) => {
            boardElement.appendChild(createCard(cardListItem));
        });

    } catch (err) {
        console.error("Board build failed:", err);
    }
}
function restartGame() {
    selectedCards = [];
    lockBoard = false;
    attempts = 0;
    matches = 0;
    cards = [];
    updateScoreboard();
    setMessage("Find every matching pair to win.");
    buildBoard();
}

restartButton.addEventListener("click", restartGame);

loadTheme();
restartGame();