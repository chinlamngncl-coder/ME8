/**
 * Build locale JSON from en.json + curated packs.
 * Run: node scripts/build-i18n-locales.js
 */
const fs = require('fs');
const path = require('path');

const LOCALE_DIR = path.join(__dirname, '..', 'public', 'locales');
const packs = require('./i18n-packs');
const ext = require('./i18n-packs-ext');
const wire = require('./i18n-packs-wire');
const filFix = require('./i18n-packs-fil-fix');
const fix2 = require('./i18n-packs-fix2');
const dockingTerm = require('./i18n-packs-docking-term');
const messagesPack = require('./i18n-packs-messages');
const gapFill = require('./i18n-packs-gap-20260618');
const trialPack = require('./i18n-packs-trial-20260628');

const en = JSON.parse(fs.readFileSync(path.join(LOCALE_DIR, 'en.json'), 'utf8'));
Object.assign(en, fix2.en || {}, messagesPack.en || {});

function writeLocale(code, data) {
  const sorted = {};
  Object.keys(data).sort().forEach((k) => { sorted[k] = data[k]; });
  fs.writeFileSync(
    path.join(LOCALE_DIR, code + '.json'),
    JSON.stringify(sorted, null, 2) + '\n',
    'utf8'
  );
}

writeLocale('en', en);

['ko', 'fil', 'id', 'th'].forEach((code) => {
  let tr = {};
  const localePath = path.join(LOCALE_DIR, code + '.json');
  if (fs.existsSync(localePath)) {
    try {
      Object.assign(tr, JSON.parse(fs.readFileSync(localePath, 'utf8')));
    } catch (_) { /* ignore */ }
  }
  Object.assign(tr, ext[code] || {}, wire[code] || {}, packs[code]);
  if (code === 'fil') Object.assign(tr, filFix);
  Object.assign(tr, fix2[code] || {});
  Object.assign(tr, dockingTerm[code] || {});
  Object.assign(tr, messagesPack[code] || {});
  Object.assign(tr, gapFill[code] || {});
  Object.assign(tr, trialPack[code] || {});
  if (!packs[code]) throw new Error('missing pack: ' + code);
  const out = {};
  let fallbackEn = 0;
  Object.keys(en).forEach((k) => {
    if (!tr[k]) {
      tr[k] = en[k];
      fallbackEn++;
    }
    out[k] = tr[k];
  });
  writeLocale(code, out);
  const sameAsEn = Object.keys(en).filter((k) => out[k] === en[k]);
  console.log(code, Object.keys(out).length, 'keys, en-fallback:', fallbackEn,
    'same-as-en:', sameAsEn.length,
    sameAsEn.length ? '(' + sameAsEn.slice(0, 8).join(', ') + (sameAsEn.length > 8 ? '…' : '') + ')' : '');
});
