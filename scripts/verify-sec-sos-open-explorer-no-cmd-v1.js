'use strict';

/**
 * SEC Phase 1.2 — SOS open without cmd.exe
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const runJs = fs.readFileSync(path.join(root, 'run.js'), 'utf8');

function openRouteSlice(src) {
    const i = src.indexOf("app.post('/api/sos-incidents/open'");
    const j = src.indexOf('app.post("/api/sos-incidents/open"');
    const start = i >= 0 ? i : j;
    assert.ok(start >= 0, 'sos-incidents/open route');
    const slice = src.slice(start, start + 1200);
    return slice;
}

const serverSlice = openRouteSlice(server);
const runSlice = openRouteSlice(runJs);

assert.ok(!/spawn\s*\(\s*['"]cmd\.exe['"]/.test(serverSlice), 'server no spawn cmd');
assert.ok(!/spawn\s*\(\s*['"]cmd\.exe['"]/.test(runSlice), 'run no spawn cmd');
assert.ok(!/['"]\/c['"]\s*,\s*['"]start['"]/.test(serverSlice), 'server no start shell');
assert.ok(!/['"]\/c['"]\s*,\s*['"]start['"]/.test(runSlice), 'run no start shell');
assert.ok(/spawn\(\s*['"]explorer\.exe['"]\s*,\s*\[\s*folderPath/.test(serverSlice), 'server folder explorer');
assert.ok(/spawn\(\s*['"]explorer\.exe['"]\s*,\s*\[\s*reportPath/.test(serverSlice), 'server report explorer');
assert.ok(/spawn\(\s*['"]explorer\.exe['"]\s*,\s*\[\s*reportPath/.test(runSlice), 'run report explorer');

console.log('[ok] verify-sec-sos-open-explorer-no-cmd-v1');
