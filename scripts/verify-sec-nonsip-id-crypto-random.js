'use strict';

/**
 * SEC-NONSIP-ID-CRYPTO-RANDOM-V1
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
    randomHex,
    fixedCamId,
    conferenceShareFileName,
    multerTempFileName,
} = require('../lib/secureId');

const ids = new Set();
for (let i = 0; i < 512; i++) {
    const fc = fixedCamId();
    assert.match(fc, /^fc-[0-9a-z]+[0-9a-f]{6}$/);
    ids.add(fc);

    const share = conferenceShareFileName('.png');
    assert.match(share, /^share-\d+-[0-9a-f]{8}\.png$/);
    ids.add(share);

    const multer = multerTempFileName('photo.jpg');
    assert.match(multer, /^\d+-[0-9a-f]{8}-photo\.jpg$/);
    ids.add(multer);
}
assert.ok(ids.size >= 1500, 'generated IDs must be unique in sample');
assert.match(randomHex(4), /^[0-9a-f]{8}$/);

const files = [
    'lib/fixedCamRegistry.js',
    'lib/conferenceModule.js',
    'server.js',
];
for (const rel of files) {
    const body = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
    assert.match(body, /secureId/, rel + ' must use secureId helpers');
    assert.doesNotMatch(
        body,
        /Math\.random\(\)\.toString\(36\)/,
        rel + ' must not use Math.random base36 for IDs'
    );
}

const wall = fs.readFileSync(path.join(__dirname, '..', 'public/js/command-wall.js'), 'utf8');
assert.match(wall, /getRandomValues/, 'command-wall owner token must use getRandomValues');
assert.doesNotMatch(
    wall,
    /fixedCameraOwner\s*=\s*['"]command-wall:['"]\s*\+\s*Math\.random/,
    'command-wall must not use Math.random for owner token'
);

console.log('verify-sec-nonsip-id-crypto-random: PASS');
