#!/usr/bin/env node
/**
 * scripts/fetch-br-state-flags.mjs
 *
 * Downloads the official Brazilian state flag PNGs from Wikimedia Commons
 * and writes them to public/flags/br-states/ and public/flags/br-states/low/.
 *
 *   high-res: 320px wide thumbnail   -> public/flags/br-states/<code>.png
 *   low-res:  80px wide thumbnail    -> public/flags/br-states/low/<code>.png
 *
 * Idempotent: existing files are skipped unless --force is passed.
 *
 * Usage:
 *   node scripts/fetch-br-state-flags.mjs           # download missing
 *   node scripts/fetch-br-state-flags.mjs --force   # re-download all
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const USER_AGENT = 'GuessTheCountry/2.0 (education@guessthecountry.app)';
const HIGH_WIDTH = 320;
const LOW_WIDTH = 80;

// Canonical Wikimedia titles for each state's flag (Bandeira_do_<State>.svg).
// The API expects the File: prefix on titles.
const STATES = [
  { code: 'AC', file: 'File:Bandeira_do_Acre.svg' },
  { code: 'AL', file: 'File:Bandeira_de_Alagoas.svg' },
  { code: 'AP', file: 'File:Bandeira_do_Amapá.svg' },
  { code: 'AM', file: 'File:Bandeira_do_Amazonas.svg' },
  { code: 'BA', file: 'File:Bandeira_da_Bahia.svg' },
  { code: 'CE', file: 'File:Bandeira_do_Ceará.svg' },
  { code: 'DF', file: 'File:Bandeira_do_Distrito_Federal_(Brasil).svg' },
  { code: 'ES', file: 'File:Bandeira_do_Espírito_Santo.svg' },
  { code: 'GO', file: 'File:Bandeira_de_Goiás.svg' },
  { code: 'MA', file: 'File:Bandeira_do_Maranhão.svg' },
  { code: 'MT', file: 'File:Bandeira_de_Mato_Grosso.svg' },
  { code: 'MS', file: 'File:Bandeira_de_Mato_Grosso_do_Sul.svg' },
  { code: 'MG', file: 'File:Bandeira_de_Minas_Gerais.svg' },
  { code: 'PA', file: 'File:Bandeira_do_Pará.svg' },
  { code: 'PB', file: 'File:Bandeira_da_Paraíba.svg' },
  { code: 'PR', file: 'File:Bandeira_do_Paraná.svg' },
  { code: 'PE', file: 'File:Bandeira_de_Pernambuco.svg' },
  { code: 'PI', file: 'File:Bandeira_do_Piauí.svg' },
  { code: 'RJ', file: 'File:Bandeira do estado do Rio de Janeiro.svg' },
  { code: 'RN', file: 'File:Bandeira_do_Rio_Grande_do_Norte.svg' },
  { code: 'RS', file: 'File:Bandeira_do_Rio_Grande_do_Sul.svg' },
  { code: 'RO', file: 'File:Bandeira_de_Rondônia.svg' },
  { code: 'RR', file: 'File:Bandeira_de_Roraima.svg' },
  { code: 'SC', file: 'File:Bandeira_de_Santa_Catarina.svg' },
  { code: 'SP', file: 'File:Bandeira do estado de São Paulo.svg' },
  { code: 'SE', file: 'File:Bandeira_de_Sergipe.svg' },
  { code: 'TO', file: 'File:Bandeira_do_Tocantins.svg' },
];

const HIGH_DIR = path.join(ROOT, 'public', 'flags', 'br-states');
const LOW_DIR = path.join(HIGH_DIR, 'low');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': USER_AGENT } }, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(err);
          }
        });
      })
      .on('error', reject);
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const request = (targetUrl) => {
      https
        .get(
          targetUrl,
          { headers: { 'User-Agent': USER_AGENT } },
          (res) => {
            if (
              res.statusCode &&
              res.statusCode >= 300 &&
              res.statusCode < 400 &&
              res.headers.location
            ) {
              return request(res.headers.location);
            }
            if (res.statusCode !== 200) {
              file.close();
              fs.unlink(dest, () => {});
              return reject(
                new Error(`Failed to download ${targetUrl}, status ${res.statusCode}`)
              );
            }
            res.pipe(file);
            file.on('finish', () => file.close(resolve));
          }
        )
        .on('error', (err) => {
          fs.unlink(dest, () => {});
          reject(err);
        });
    };
    request(url);
  });
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function resolveThumbUrls(titles, width) {
  // Wikimedia API expects literal "|" between titles (and the "File:" namespace).
  const joined = titles.join('|');
  const url =
    `https://commons.wikimedia.org/w/api.php?action=query&titles=` +
    encodeURIComponent(joined) +
    `&prop=imageinfo&iiprop=url&iiurlwidth=${width}&redirects=1&format=json`;
  const data = await fetchJson(url);
  const map = {};
  if (data && data.query && data.query.pages) {
    for (const page of Object.values(data.query.pages)) {
      if (page.imageinfo && page.imageinfo[0]) {
        map[page.title] = page.imageinfo[0].thumburl || page.imageinfo[0].url;
      }
    }
  }
  // Normalize the API response so callers can look up by either the original
  // requested title (e.g. "File:Bandeira_do_Acre.svg") or its normalized form
  // (e.g. "File:Bandeira do Acre.svg").
  if (data && data.query && data.query.normalized) {
    for (const n of data.query.normalized) {
      if (map[n.to]) {
        map[n.from] = map[n.to];
      }
    }
  }
  if (data && data.query && data.query.redirects) {
    for (const r of data.query.redirects) {
      if (map[r.to]) {
        map[r.from] = map[r.to];
      }
    }
  }
  return map;
}

async function main() {
  const force = process.argv.includes('--force');
  ensureDir(HIGH_DIR);
  ensureDir(LOW_DIR);

  console.log(`Resolving Wikimedia thumb URLs (high=${HIGH_WIDTH}, low=${LOW_WIDTH})...`);

  const titleList = STATES.map((s) => s.file);
  const [titleToHigh, titleToLow] = await Promise.all([
    resolveThumbUrls(titleList, HIGH_WIDTH),
    resolveThumbUrls(titleList, LOW_WIDTH),
  ]);

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;
  const failures = [];

  for (const s of STATES) {
    const normTitle = s.file.replace(/_/g, ' ');
    const highUrl = titleToHigh[s.file] || titleToHigh[normTitle];
    const lowUrl = titleToLow[s.file] || titleToLow[normTitle];

    const highDest = path.join(HIGH_DIR, `${s.code.toLowerCase()}.png`);
    const lowDest = path.join(LOW_DIR, `${s.code.toLowerCase()}.png`);

    const highExists = fs.existsSync(highDest);
    const lowExists = fs.existsSync(lowDest);

    if (!force && highExists && lowExists) {
      skipped++;
      continue;
    }

    if (!highUrl) {
      failed++;
      failures.push(s.code);
      console.warn(`  ✗ ${s.code}: no Wikimedia URL found for "${s.file}"`);
      continue;
    }

    process.stdout.write(`  ↓ ${s.code}... `);
    try {
      if (force || !highExists) await downloadFile(highUrl, highDest);
      if (force || !lowExists) {
        if (lowUrl) {
          await downloadFile(lowUrl, lowDest);
        } else {
          await downloadFile(highUrl, lowDest);
        }
      }
      console.log('ok');
      downloaded++;
    } catch (err) {
      console.log(`FAILED (${err.message})`);
      failed++;
      failures.push(s.code);
    }
  }

  console.log('\nSummary:');
  console.log(`  Downloaded: ${downloaded}`);
  console.log(`  Skipped (already on disk): ${skipped}`);
  console.log(`  Failed: ${failed}`);
  if (failures.length > 0) {
    console.log(`  Failed codes: ${failures.join(', ')}`);
  }

  const highCount = fs.readdirSync(HIGH_DIR).filter((f) => f.endsWith('.png')).length;
  const lowCount = fs
    .readdirSync(LOW_DIR)
    .filter((f) => f.endsWith('.png')).length;
  console.log(`  public/flags/br-states/*.png: ${highCount}`);
  console.log(`  public/flags/br-states/low/*.png: ${lowCount}`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('fetch-br-state-flags failed:', err);
  process.exit(1);
});
