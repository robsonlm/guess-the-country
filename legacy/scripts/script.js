/* =============================================================================
 * NOT SHIPPED — LEGACY REFERENCE ONLY
 * -----------------------------------------------------------------------------
 * This file is the original single-page vanilla JavaScript implementation of
 * the game. It is kept here for historical reference only and is NOT bundled
 * into the production build (see vite.config.ts / index.html, which loads
 * ./src/main.tsx). It still references the deprecated api.restcountries.com
 * endpoint and is not safe for production use.
 * ============================================================================= */

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
