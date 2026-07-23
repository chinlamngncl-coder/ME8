'use strict';

/**
 * LAB-DEFAULT-CREDS-AND-IMAGE-PIN-V1
 * - LiveKit ingress must not float on :latest
 * - LiveKit compose keys must come from FM_LIVEKIT_* env (not bare devkey literals)
 * - livekit.yaml template must not commit lab key pair
 * - WVP compose secrets must be ${ENV} form (lab :-fallback OK)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function read(rel) {
    return fs.readFileSync(path.join(root, rel), 'utf8');
}

const livekitComposeFiles = [
    'docker/livekit.compose.yaml',
    'ship-build-test/customer-pack/docker/livekit.compose.yaml',
];

for (const rel of livekitComposeFiles) {
    const abs = path.join(root, rel);
    assert.ok(fs.existsSync(abs), 'missing ' + rel);
    const body = read(rel);
    assert.ok(
        /image:\s*livekit\/ingress:v1\.8\.4/.test(body),
        rel + ' must pin livekit/ingress:v1.8.4'
    );
    assert.ok(
        !/image:\s*livekit\/ingress:latest/.test(body),
        rel + ' must not use ingress:latest'
    );
    assert.ok(
        /livekit\.runtime\.yaml/.test(body),
        rel + ' must mount livekit.runtime.yaml (not raw secrets template)'
    );
    assert.ok(
        !/^\s*api_key:\s*devkey\s*$/m.test(body),
        rel + ' must not hardcode api_key: devkey (use ${FM_LIVEKIT_API_KEY…})'
    );
    assert.ok(
        /api_key:\s*\$\{FM_LIVEKIT_API_KEY/.test(body),
        rel + ' must take api_key from FM_LIVEKIT_API_KEY'
    );
    assert.ok(
        /api_secret:\s*\$\{FM_LIVEKIT_API_SECRET/.test(body),
        rel + ' must take api_secret from FM_LIVEKIT_API_SECRET'
    );
}

const templates = [
    'docker/livekit.yaml',
    'ship-build-test/customer-pack/docker/livekit.yaml',
];
for (const rel of templates) {
    const body = read(rel);
    assert.ok(
        !/^\s*devkey:\s*secret\s*$/m.test(body),
        rel + ' must not commit lab key pair devkey: secret'
    );
    assert.ok(
        /PLACEHOLDER_KEY:\s*PLACEHOLDER_SECRET/.test(body),
        rel + ' must keep placeholder keys for START-LIVEKIT runtime build'
    );
}

const wvp = read('docker/wvp/docker-compose.wvp.yml');
assert.ok(/WVP_PWD:\s*\$\{WVP_PWD/.test(wvp), 'WVP_PWD must come from env');
assert.ok(/POSTGRES_PASSWORD:\s*\$\{WVP_DB_PASSWORD/.test(wvp), 'DB password from env');
assert.ok(/REDIS_PWD:\s*\$\{WVP_REDIS_PASSWORD/.test(wvp), 'Redis password from env');
assert.ok(
    /--requirepass",\s*"\$\{WVP_REDIS_PASSWORD/.test(wvp)
        || /--requirepass", "\$\{WVP_REDIS_PASSWORD/.test(wvp),
    'Valkey requirepass from env'
);
assert.ok(!/WVP_PWD:\s*"admin123"/.test(wvp), 'no bare quoted WVP_PWD admin123');
assert.ok(!/POSTGRES_PASSWORD:\s*root123/.test(wvp), 'no bare POSTGRES_PASSWORD root123');

const startLk = read('scripts/START-LIVEKIT.ps1');
assert.ok(/livekit\.runtime\.yaml/.test(startLk), 'START-LIVEKIT must write runtime yaml');
assert.ok(/FM_LIVEKIT_API_KEY/.test(startLk), 'START-LIVEKIT must read FM_LIVEKIT_API_KEY');

const startWvp = read('scripts/START-WVP-LAB.ps1');
assert.ok(/WVP_REDIS_PASSWORD/.test(startWvp), 'START-WVP-LAB must export redis password');
assert.ok(/WVP_DB_PASSWORD/.test(startWvp), 'START-WVP-LAB must export DB password');

const gitignore = read('.gitignore');
assert.ok(
    /livekit\.runtime\.yaml/.test(gitignore),
    '.gitignore must ignore livekit.runtime.yaml'
);

console.log('verify-lab-default-creds-and-image-pin: PASS');
