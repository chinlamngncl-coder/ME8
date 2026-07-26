'use strict';

/**
 * MOB-APPLY TACTICAL-BLUEPRINT-ZERO-RAW-ERRORS-V1
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'public', 'js', 'tactical-blueprint-ui.js'), 'utf8');
const en = JSON.parse(fs.readFileSync(path.join(root, 'public', 'locales', 'en.json'), 'utf8'));

assert.ok(/tactical-blueprint-ui\.js\?v=20260726-tactical-blueprint-zero-raw-v1/.test(html), 'cache bust');
assert.ok(/ZERO-RAW-ERRORS-V1/.test(js), 'MOB marker');
assert.ok(/function fetchBpJson/.test(js), 'safe fetch');
assert.ok(/function failMsg/.test(js), 'failMsg');
assert.ok(/function looksRawTech/.test(js), 'raw filter');
assert.ok(!/setStatus\(\s*err\s*&&\s*err\.message/.test(js), 'no err.message on status');
assert.ok(/tactical\.bpNeedRestart/.test(js), 'need restart key used');
assert.ok(en['tactical.bpNeedRestart'], 'i18n need restart');
assert.ok(en['tactical.bpSessionExpired'], 'i18n session');
assert.ok(en['tactical.bpForbidden'], 'i18n forbidden');
assert.ok(en['tactical.bpCatalogBusy'], 'i18n catalog');

console.log('[ok] verify-tactical-blueprint-zero-raw-errors-v1');
