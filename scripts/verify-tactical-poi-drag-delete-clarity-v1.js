'use strict';

/**
 * MOB-APPLY TACTICAL-POI-DRAG-DELETE-CLARITY-V1
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'public', 'js', 'tactical-poi.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public', 'css', 'global.css'), 'utf8');
const en = fs.readFileSync(path.join(root, 'public', 'locales', 'en.json'), 'utf8');
const disc = fs.readFileSync(
    path.join(root, 'docs', 'MOB-DISC-TACTICAL-PIN-KINDS-BWC-FIXED-POI-20260726.md'),
    'utf8',
);

assert.ok(/TACTICAL-POI-DRAG-DELETE-CLARITY-V1/.test(js), 'header');
assert.ok(/!host\._liveBwc && !host\._ephemeral/.test(js)
    || /Prepared \/ fixed-linked POIs stay/.test(js), 'spread excludes prepared');
assert.ok(/dragstart/.test(js) && /Dragging POI/.test(js), 'dragstart');
assert.ok(/poiDeleteConfirm/.test(js) && /confirm\(/.test(js), 'delete confirm');
assert.ok(/ax-tactical-poi-row-del/.test(js), 'list delete');
assert.ok(/syncSelectedHint/.test(js), 'selected hint');
assert.ok(/poiPopupPinHint/.test(js), 'popup pin vs video hint');
assert.ok(/ax-tactical-poi-selected-hint/.test(html), 'hint in html');
assert.ok(/tactical-poi\.js\?v=20260726-poi-drag-delete-clarity-v1/.test(html), 'cache');
assert.ok(/ax-tactical-poi-selected-hint/.test(css), 'hint css');
assert.ok(/"tactical\.poiSelectedHint"/.test(en), 'i18n');
assert.ok(/BWC live/.test(disc) && /Prepared POI/.test(disc), 'disc lock');

console.log('[ok] verify-tactical-poi-drag-delete-clarity-v1');
