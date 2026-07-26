'use strict';

/**
 * MOB-APPLY TACTICAL-BLUEPRINT-SIZE-RAISE-V1
 * Default 25 MB upload; env FM_TACTICAL_BP_MAX_MB clamps 5..50; DB CHECK ≤ 50 MB.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { dimensionsFromBuffer } = require('../lib/imageDimensions');

const root = path.join(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const siteDb = fs.readFileSync(path.join(root, 'lib/siteDb.js'), 'utf8');
const sql005 = fs.readFileSync(
    path.join(root, 'db', 'migrations', '005_tactical_blueprint_size_raise.sql'),
    'utf8',
);
const envEx = fs.readFileSync(path.join(root, '.env.example'), 'utf8');

// 1x1 PNG probe still works
const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
);
const dim = dimensionsFromBuffer(png);
assert.ok(dim && dim.width === 1 && dim.height === 1, 'png 1x1');

assert.ok(/\/api\/tactical\/blueprints\/upload/.test(server), 'upload route');
assert.ok(/resolveTacticalBpMaxBytes/.test(server), 'resolve max');
assert.ok(/FM_TACTICAL_BP_MAX_MB/.test(server), 'env');
assert.ok(/\|\|\s*'25'/.test(server), 'default 25 MB');
assert.ok(/mb > 50/.test(server) && /mb = 50/.test(server), 'clamp 50');
assert.ok(/Blueprint exceeds '\s*\+\s*TACTICAL_BP_MAX_MB_LABEL/.test(server), 'dynamic error');
assert.ok(/image\/jpeg/.test(server) && /image\/png/.test(server) && /image\/webp/.test(server), 'mime');
assert.ok(/crypto\.randomUUID\(\)/.test(server), 'uuid filename');
assert.ok(/requireStorageFreeDiskSpace/.test(server), 'free disk gate');
assert.ok(/insertTacticalBlueprint/.test(siteDb) && /insertTacticalBlueprint/.test(server), 'db insert');
assert.ok(/005_tactical_blueprint_size_raise\.sql/.test(siteDb), 'siteDb loads 005');
assert.ok(/schema_version\) < 6/.test(siteDb), 'siteDb requires version >= 6');
assert.ok(/byte_size <= 52428800/.test(sql005), 'DB CHECK 50 MB');
assert.ok(/VALUES\s*\(\s*5\s*,\s*'tactical_blueprint_size_raise'/.test(sql005), 'schema_migrations v5');
assert.ok(/FM_TACTICAL_BP_MAX_MB/.test(envEx), '.env.example documents env');
assert.ok(!/TACTICAL_BP_MAX_BYTES\s*=\s*5\s*\*\s*1024\s*\*\s*1024/.test(server), 'old 5 MB hardcode gone');

console.log('[ok] verify-tactical-blueprint-size-raise-v1');
