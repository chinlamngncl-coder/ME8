'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
    createSipCallId,
    createSipTag,
    createGbSequenceNumber,
} = require('../lib/sipCryptoIdentifiers');

const callIds = new Set();
for (let i = 0; i < 1024; i++) {
    const callId = createSipCallId();
    assert.match(callId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    callIds.add(callId);

    const tagged = createSipCallId('conf-');
    assert.match(tagged, /^conf-[0-9a-f-]{36}$/i);

    const tag = createSipTag();
    assert.match(tag, /^\d{1,4}$/);
    assert(Number(tag) >= 0 && Number(tag) < 10000);

    const sn = createGbSequenceNumber();
    assert.match(sn, /^\d{1,5}$/);
    assert(Number(sn) >= 0 && Number(sn) < 100000);
}
assert.strictEqual(callIds.size, 1024, 'SIP call IDs must be unique across the verification sample');

const serverSource = fs.readFileSync(path.resolve(__dirname, '..', 'server.js'), 'utf8');
assert.doesNotMatch(serverSource, /['"]call-id['"]\s*:\s*Math\.random/);
assert.doesNotMatch(serverSource, /params:\s*\{\s*tag:\s*Math\.floor\(Math\.random/);
assert.doesNotMatch(serverSource, /const\s+sn\s*=\s*String\(Math\.floor\(Math\.random/);

const callIdUses = serverSource.match(/['"]call-id['"]\s*:\s*createSipCallId\(\)/g) || [];
const tagUses = serverSource.match(/params:\s*\{\s*tag:\s*createSipTag\(\)\s*\}/g) || [];
const snUses = serverSource.match(/const\s+sn\s*=\s*createGbSequenceNumber\(\)/g) || [];
assert.strictEqual(callIdUses.length, 4, 'expected all four server SIP call-id sites to use crypto');
assert.strictEqual(tagUses.length, 4, 'expected all four server SIP tag sites to use crypto');
assert.strictEqual(snUses.length, 3, 'expected all three server GB sequence sites to use crypto');

const liveModules = [
    'lib/deviceControl.js',
    'lib/pttServer.js',
    'lib/mediaSession.js',
    'lib/liveStreamPool.js',
    'lib/sosResponseTeam.js',
    'lib/frFieldAlert.js',
    'lib/conferenceBwcIngress.js',
    'lib/wvpPttGroupRelay.js',
];

liveModules.forEach((relativePath) => {
    const source = fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf8');
    assert.match(source, /sipCryptoIdentifiers/, relativePath + ' must import sip crypto helpers');
    assert.doesNotMatch(
        source,
        /['"]call-id['"]\s*:\s*(?:'conf-'\s*\+\s*)?Math\.random/,
        relativePath + ' must not generate SIP Call-ID with Math.random',
    );
    assert.doesNotMatch(
        source,
        /tag:\s*(?:Math\.floor\(Math\.random|String\(Math\.floor\(Math\.random)/,
        relativePath + ' must not generate SIP tags with Math.random',
    );
    assert.doesNotMatch(
        source,
        /Math\.floor\(Math\.random\(\)\s*\*\s*100000\)/,
        relativePath + ' must not generate GB SN with Math.random',
    );
});

console.log('SIP cryptographic identifier verification passed.');
