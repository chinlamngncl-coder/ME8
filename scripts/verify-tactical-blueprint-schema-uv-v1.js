'use strict';

/**
 * Phase 2 Task 2.1 — tactical blueprint schema migration present + siteDb wired
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const sqlPath = path.join(root, 'db', 'migrations', '002_tactical_blueprint_uv.sql');
const siteDbPath = path.join(root, 'lib', 'siteDb.js');

assert.ok(fs.existsSync(sqlPath), '002_tactical_blueprint_uv.sql exists');
const sql = fs.readFileSync(sqlPath, 'utf8');
const siteDb = fs.readFileSync(siteDbPath, 'utf8');

assert.ok(/CREATE TABLE IF NOT EXISTS tactical_blueprints/.test(sql), 'tactical_blueprints');
assert.ok(/CREATE TABLE IF NOT EXISTS tactical_pins/.test(sql), 'tactical_pins');
assert.ok(/image_url/.test(sql) && /original_width/.test(sql) && /original_height/.test(sql), 'blueprint geometry');
assert.ok(/mime_type IN \('image\/jpeg', 'image\/png', 'image\/webp'\)/.test(sql), 'mime allowlist');
assert.ok(/byte_size <= 5242880/.test(sql), '002 historical 5 MB check');
assert.ok(/blueprint_id\s+UUID NULL REFERENCES tactical_blueprints/.test(sql), 'FK nullable');
assert.ok(/uv_x/.test(sql) && /uv_y/.test(sql), 'UV columns');
assert.ok(/tactical_pins_placement_chk/.test(sql), 'placement constraint');
assert.ok(/VALUES\s*\(\s*2\s*,\s*'tactical_blueprint_uv'/.test(sql), 'schema_migrations v2');

assert.ok(/002_tactical_blueprint_uv\.sql/.test(siteDb), 'siteDb loads 002');
assert.ok(/005_tactical_blueprint_size_raise\.sql/.test(siteDb), 'siteDb loads 005');
assert.ok(/006_tactical_blueprint_placement\.sql/.test(siteDb), 'siteDb loads 006');
assert.ok(/schema_version\) < 6/.test(siteDb), 'siteDb requires version >= 6');

const sql005 = fs.readFileSync(
    path.join(root, 'db', 'migrations', '005_tactical_blueprint_size_raise.sql'),
    'utf8',
);
assert.ok(/byte_size <= 52428800/.test(sql005), '005 raises CHECK to 50 MB');
assert.ok(/VALUES\s*\(\s*5\s*,\s*'tactical_blueprint_size_raise'/.test(sql005), 'schema_migrations v5');

console.log('[ok] verify-tactical-blueprint-schema-uv-v1');
