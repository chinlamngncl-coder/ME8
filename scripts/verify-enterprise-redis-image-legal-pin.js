'use strict';

/**
 * ENTERPRISE-REDIS-IMAGE-LEGAL-PIN-V1
 * Active compose must not pull floating Docker Hub redis:7* (SSPL/RSAL risk).
 * Valkey (BSD-3-Clause) is required for Fleet / LiveKit / WVP lab cache images.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

const MUST_USE_VALKEY = [
    'docker/docker-compose.enterprise.yml',
    'docker/livekit.compose.yaml',
    'docker/wvp/docker-compose.wvp.yml',
    'ship-build-test/customer-pack/docker/livekit.compose.yaml',
];

const FORBIDDEN = [
    /image:\s*['"]?redis:7/i,
    /image:\s*['"]?redis:latest/i,
    /image:\s*['"]?redis:8/i,
];

function read(rel) {
    return fs.readFileSync(path.join(root, rel), 'utf8');
}

for (const rel of MUST_USE_VALKEY) {
    const abs = path.join(root, rel);
    assert.ok(fs.existsSync(abs), 'missing ' + rel);
    const body = read(rel);
    assert.ok(
        /valkey\/valkey:8-alpine/i.test(body),
        rel + ' must use valkey/valkey:8-alpine'
    );
    for (const re of FORBIDDEN) {
        assert.ok(!re.test(body), rel + ' must not use forbidden redis image tag: ' + re);
    }
}

const livekit = read('docker/livekit.compose.yaml');
assert.ok(/^\s*redis:\s*$/m.test(livekit), 'LiveKit DNS service name must stay "redis"');
assert.ok(/address:\s*redis:6379/.test(livekit), 'LiveKit clients must still address redis:6379');

const wvp = read('docker/wvp/docker-compose.wvp.yml');
assert.ok(/container_name:\s*me8-wvp-redis/.test(wvp), 'WVP Valkey must keep me8-wvp-redis DNS name');
assert.ok(/--requirepass/.test(wvp), 'WVP Valkey must keep requirepass');

const enterprise = read('docker/docker-compose.enterprise.yml');
assert.ok(/mobility-valkey/.test(enterprise), 'Fleet enterprise Valkey container name required');

/* Baselines are historical snapshots — do not scan. Active docker/ only. */
const dockerDir = path.join(root, 'docker');
function walkYml(dir, out) {
    for (const name of fs.readdirSync(dir)) {
        const p = path.join(dir, name);
        const st = fs.statSync(p);
        if (st.isDirectory()) walkYml(p, out);
        else if (/\.(ya?ml)$/i.test(name)) out.push(p);
    }
}
const ymls = [];
walkYml(dockerDir, ymls);
for (const abs of ymls) {
    const body = fs.readFileSync(abs, 'utf8');
    for (const re of FORBIDDEN) {
        assert.ok(
            !re.test(body),
            'active docker tree must not use ' + re + ' in ' + path.relative(root, abs)
        );
    }
}

console.log('verify-enterprise-redis-image-legal-pin: PASS');
