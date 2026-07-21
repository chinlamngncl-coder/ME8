'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const runtimeRoots = ['server.js', 'lib'];
const forbidden = [
    ['sync-over-async Atomics.wait', /\bAtomics\.wait\s*\(/],
    ['sync-over-async SharedArrayBuffer', /\bSharedArrayBuffer\b/],
    ['retired catalogPgSync', /catalogPgSync/],
    ['runtime node:sqlite', /require\s*\(\s*['"]node:sqlite['"]\s*\)/],
    ['SQLite prepare API', /\.prepare\s*\([^)]*\)\s*\.(?:get|all|run)\s*\(/s],
    ['SQLite json_extract', /\bjson_extract\s*\(/i],
    ['SQLite IFNULL', /\bIFNULL\s*\(/i],
    ['SQLite positional query placeholder', /(?:query|execute)\s*\(\s*['"`][^'"`\n]*\?/i],
];

function filesUnder(target) {
    const full = path.join(root, target);
    if (!fs.statSync(full).isDirectory()) return [full];
    const out = [];
    fs.readdirSync(full, { withFileTypes: true }).forEach((entry) => {
        const item = path.join(full, entry.name);
        if (entry.isDirectory()) out.push(...filesUnder(path.relative(root, item)));
        else if (/\.js$/i.test(entry.name)) out.push(item);
    });
    return out;
}

const failures = [];
runtimeRoots.flatMap(filesUnder).forEach((file) => {
    const text = fs.readFileSync(file, 'utf8');
    forbidden.forEach(([label, pattern]) => {
        if (pattern.test(text)) failures.push(path.relative(root, file) + ': ' + label);
    });
});
assert.deepStrictEqual(failures, [], failures.join('\n'));
assert.ok(!fs.existsSync(path.join(root, 'lib', 'catalogPgSync.js')), 'catalogPgSync.js must be removed');

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
assert.ok(pkg.dependencies && pkg.dependencies.pg, 'pg must be a runtime dependency');
assert.strictEqual(pkg.dependencies.pg, '^8.22.0');

const legal = fs.readFileSync(path.join(root, 'public', 'legal-notices.html'), 'utf8');
const shipLegal = fs.readFileSync(path.join(root, 'scripts', 'trial-ship', 'THIRD-PARTY-NOTICES.ship.md'), 'utf8');
[legal, shipLegal].forEach((text) => {
    assert.match(text, /PostgreSQL\s+16\.10/i);
    assert.match(text, /\bpg\s+8\.22\.0\b/i);
    assert.match(text, /PostgreSQL License/i);
    assert.match(text, /MIT License/i);
    assert.match(text, /pg dependency family/i);
    assert.match(text, /pg-int8/i);
});

console.log('PostgreSQL catalog retirement and legal notice gate passed.');
