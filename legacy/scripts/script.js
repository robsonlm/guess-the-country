const button1El = document.getElementById("button1");
const button2El = document.getElementById("button2");
const flagEl = document.getElementById("flag");
const lastEl = document.getElementById("last");
const rightEl = document.getElementById("right");
const wrongEl = document.getElementById("wrong");
const totalEl = document.getElementById("total");
const totalPerEl = document.getElementById("total-per");
const answerEl = document.getElementById("last-answer");
const loadingEl = document.getElementById("loading");
const errorEl = document.getElementById("error");
const scoreEl = document.getElementById("score");
const gameAreaEl = document.getElementById("game-area");
const keyFormEl = document.getElementById("key-form");
const keyInputEl = document.getElementById("api-key");
const keyErrorEl = document.getElementById("key-error");
const settingsBtnEl = document.getElementById("settings-btn");

const API_BASE = "https://api.restcountries.com/countries/v5";
const FLAG_CDN = "https://flags.restcountries.com/v5/w320";
const RESPONSE_FIELDS = "names.common,codes.alpha_2,links.google_maps";
const KEY_STORAGE = "guessTheCountry.apiKey";
const SCORE_STORAGE = "guessTheCountry.score";
const PAGE_LIMIT = 100;

const score = loadScore();
let countries = [];
let lastShownIdx = -1;
let activeController = null;

function loadScore() {
  try {
    const raw = localStorage.getItem(SCORE_STORAGE);
    if (!raw) return { right: 0, wrong: 0, total: 0 };
    const parsed = JSON.parse(raw);
    return {
      right: Number(parsed.right) || 0,
      wrong: Number(parsed.wrong) || 0,
      total: Number(parsed.total) || 0,
    };
  } catch {
    return { right: 0, wrong: 0, total: 0 };
  }
}

function saveScore() {
  localStorage.setItem(SCORE_STORAGE, JSON.stringify(score));
}

function getApiKey() {
  return localStorage.getItem(KEY_STORAGE) || "";
}

function setApiKey(key) {
  if (key) localStorage.setItem(KEY_STORAGE, key);
  else localStorage.removeItem(KEY_STORAGE);
}

function flagUrl(alpha2) {
  return alpha2 ? `${FLAG_CDN}/${alpha2.toLowerCase()}.png` : "";
}

async function fetchPage(key, offset, signal) {
  const url = `${API_BASE}?limit=${PAGE_LIMIT}&offset=${offset}&response_fields=${RESPONSE_FIELDS}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${key}` },
    signal,
  });
  if (res.status === 401) {
    const err = new Error("Invalid API key");
    err.code = "AUTH";
    throw err;
  }
  if (res.status === 403) {
    const err = new Error("Rate limit reached or plan restriction");
    err.code = "FORBIDDEN";
    throw err;
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchAllCountries(key, signal) {
  const collected = [];
  let offset = 0;
  for (let i = 0; i < 20; i++) {
    const json = await fetchPage(key, offset, signal);
    const data = json?.data ?? {};
    const objects = Array.isArray(data.objects) ? data.objects : [];
    const meta = data.meta ?? {};
    collected.push(...objects);
    const isMore = meta.more === true && objects.length > 0;
    if (!isMore) break;
    offset += meta.count ?? objects.length;
    if (typeof meta.total === "number" && offset >= meta.total) break;
  }
  return collected;
}

function normalizeCountries(raw) {
  return raw
    .map((c) => ({
      name: c?.names?.common ?? "",
      alpha2: c?.codes?.alpha_2 ?? "",
      mapUrl: c?.links?.google_maps ?? "",
    }))
    .filter((c) => c.name && c.alpha2);
}

function showKeyForm(errorMsg) {
  countries = [];
  lastShownIdx = -1;
  gameAreaEl.hidden = true;
  scoreEl.hidden = true;
  settingsBtnEl.hidden = true;
  keyFormEl.hidden = false;
  keyErrorEl.hidden = !errorMsg;
  keyErrorEl.textContent = errorMsg ?? "";
  keyInputEl.focus();
}

function showGame() {
  keyFormEl.hidden = true;
  gameAreaEl.hidden = false;
  scoreEl.hidden = false;
  settingsBtnEl.hidden = false;
}

async function init() {
  renderScore();
  const key = getApiKey();
  if (!key) {
    showKeyForm();
    return;
  }
  showGame();
  await loadCountries(key);
}

async function loadCountries(key) {
  if (activeController) activeController.abort();
  activeController = new AbortController();
  const { signal } = activeController;

  loadingEl.hidden = false;
  errorEl.hidden = true;
  try {
    const raw = await fetchAllCountries(key, signal);
    countries = normalizeCountries(raw);
    if (countries.length < 2) throw new Error("Not enough countries returned");
    loadingEl.hidden = true;
    lastShownIdx = -1;
    renderGame();
  } catch (err) {
    loadingEl.hidden = true;
    if (err.name === "AbortError") return;
    if (err.code === "AUTH") {
      setApiKey("");
      showKeyForm("Invalid API key. Please enter a valid key.");
      return;
    }
    errorEl.hidden = false;
    errorEl.textContent = `Failed to load: ${err.message}`;
    console.error(err);
  }
}

function pickIndex(max, exclude) {
  if (max <= 1) return 0;
  let idx;
  do {
    idx = Math.floor(Math.random() * max);
  } while (idx === exclude);
  return idx;
}

function renderGame() {
  const correctIdx = pickIndex(countries.length, lastShownIdx);
  const wrongIdx = pickIndex(countries.length, correctIdx);
  const answerOnLeft = Math.random() < 0.5;

  const correct = countries[correctIdx];
  const wrong = countries[wrongIdx];

  button1El.textContent = countries[answerOnLeft ? correctIdx : wrongIdx].name;
  button2El.textContent = countries[answerOnLeft ? wrongIdx : correctIdx].name;

  const shown = answerOnLeft ? correct : wrong;
  flagEl.src = flagUrl(shown.alpha2);
  flagEl.alt = `Flag of ${shown.name}`;

  button1El.dataset.correct = answerOnLeft ? "true" : "false";
  button2El.dataset.correct = answerOnLeft ? "false" : "true";

  lastShownIdx = correctIdx;
}

function handleChoice(isButton1) {
  const correct = isButton1
    ? button1El.dataset.correct === "true"
    : button2El.dataset.correct === "true";

  if (correct) score.right++;
  else score.wrong++;
  score.total++;
  saveScore();

  const country = countries[lastShownIdx];
  lastEl.textContent = country?.name ?? "—";
  if (country?.mapUrl) answerEl.href = country.mapUrl;
  answerEl.classList.toggle("game__answer--wrong", !correct);

  renderScore();
  renderGame();
}

function renderScore() {
  rightEl.textContent = score.right;
  wrongEl.textContent = score.wrong;
  totalEl.textContent = score.total;
  const pct = score.total === 0 ? 0 : ((score.right / score.total) * 100).toFixed(1);
  totalPerEl.textContent = pct;
}

keyFormEl.addEventListener("submit", (e) => {
  e.preventDefault();
  const key = keyInputEl.value.trim();
  if (key.length < 10) {
    keyErrorEl.hidden = false;
    keyErrorEl.textContent = "Key looks too short.";
    return;
  }
  setApiKey(key);
  keyInputEl.value = "";
  showGame();
  loadCountries(key);
});

settingsBtnEl.addEventListener("click", () => {
  showKeyForm();
});

button1El.addEventListener("click", () => handleChoice(true));
button2El.addEventListener("click", () => handleChoice(false));

document.addEventListener("keydown", (e) => {
  if (gameAreaEl.hidden) return;
  if (e.key === "1") handleChoice(true);
  else if (e.key === "2") handleChoice(false);
});

init();