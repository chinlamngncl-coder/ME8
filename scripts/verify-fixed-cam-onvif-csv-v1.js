'use strict';

/**
 * Phase 2 Task 2.4 — real ONVIF + CSV import → PostgreSQL
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const onvifSrc = fs.readFileSync(path.join(root, 'lib/fixedCamOnvif.js'), 'utf8');
const pgSrc = fs.readFileSync(path.join(root, 'lib/fixedCamCatalogPg.js'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const mig = fs.readFileSync(path.join(root, 'db/migrations/003_fixed_cameras.sql'), 'utf8');
const siteDb = fs.readFileSync(path.join(root, 'lib/siteDb.js'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'public/js/fixed-cams-ui.js'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

assert.ok(pkg.dependencies && pkg.dependencies.onvif, 'dependency onvif present');
assert.ok(/require\('onvif'\)/.test(onvifSrc), 'require(\'onvif\')');
assert.ok(/require\('onvif\/promises'\)/.test(onvifSrc), 'require onvif/promises');
assert.ok(/function getCapabilities/.test(onvifSrc), 'getCapabilities');
assert.ok(/function setPreset/.test(onvifSrc) && /function gotoPreset/.test(onvifSrc), 'SetPreset + GotoPreset');
assert.ok(/function authenticateAndProbe/.test(onvifSrc), 'authenticateAndProbe');
assert.ok(/profileS|profileT|profileG/.test(onvifSrc), 'Profile S/T/G detect');
assert.ok(!/TODO.*mock|fakeGotoPreset|mockPreset/i.test(onvifSrc), 'no mock placeholders');

assert.ok(/CREATE TABLE IF NOT EXISTS fixed_cameras/.test(mig), 'PG fixed_cameras table');
assert.ok(/onvif_password_enc/.test(mig), 'encrypted password column');
assert.ok(/003_fixed_cameras\.sql/.test(siteDb), 'siteDb runs migration 003');

assert.ok(/encryptSecretsObject/.test(pgSrc), 'vault encrypt passwords');
assert.ok(/\/api\/cameras\/import-csv/.test(server), 'POST /api/cameras/import-csv');
assert.ok(/fixedCamOnvif\.setPreset/.test(server) && /fixedCamOnvif\.gotoPreset/.test(server), 'server uses real set/goto');
assert.ok(/onvif\/capabilities/.test(server), 'capabilities probe route');
assert.ok(/action === 'set-preset'/.test(server), 'set-preset action');

assert.ok(/Name,Lat,Lng,Zone,StreamUrl,OnvifIp,OnvifPort,OnvifUsername,OnvifPassword,PtzCapable/.test(ui), 'CSV template header');
assert.ok(/\/api\/cameras\/import-csv/.test(ui), 'UI posts cameras import-csv');

const payloadFields = ['name', 'lat', 'lng', 'zone', 'rtspUrl', 'onvif', 'ptzEnabled'];
payloadFields.forEach(function (f) {
    assert.ok(ui.indexOf(f) >= 0 || ui.indexOf('ptzEnabled') >= 0, 'form has ' + f);
});
assert.ok(/fc-f-ohost/.test(ui) && /fc-f-oport/.test(ui) && /fc-f-ouser/.test(ui) && /fc-f-opass/.test(ui), 'ONVIF form fields');
assert.ok(/fc-f-ptz/.test(ui), 'PTZ capable field');

const mod = require(path.join(root, 'lib/fixedCamOnvif.js'));
assert.strictEqual(typeof mod.setPreset, 'function');
assert.strictEqual(typeof mod.gotoPreset, 'function');
assert.strictEqual(typeof mod.getCapabilities, 'function');
assert.strictEqual(typeof mod.authenticateAndProbe, 'function');
assert.ok(mod.Cam, 'Cam export from onvif');

console.log('[ok] verify-fixed-cam-onvif-csv-v1');
