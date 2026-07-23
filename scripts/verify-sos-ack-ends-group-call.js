'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const serverSource = fs.readFileSync(path.resolve(__dirname, '..', 'server.js'), 'utf8');
const ackBlockMatch = serverSource.match(
    /app\.post\(\s*['"]\/api\/sos-acknowledge['"][\s\S]*?res\.json\(\{[\s\S]*?\}\);[\s\S]*?\}\);/
);
assert.ok(ackBlockMatch, 'sos-acknowledge route must exist');
const ackBlock = ackBlockMatch[0];
assert.match(ackBlock, /sosGroupCall\.isActive\(\)/);
assert.match(ackBlock, /sosGroupCall\.stop\(\s*['"]sos_acknowledged['"]\s*\)/);
assert.match(ackBlock, /endedGroupCall/);
assert.match(ackBlock, /reason:\s*['"]sos_acknowledged['"]/);

const pttBlock = serverSource.match(
    /const groupCallBlocked = camIds\.find\(\(id\) => sosGroupCall\.isParticipant\(id\)\);[\s\S]{0,240}BWC is active in SOS group call/
);
assert.ok(pttBlock, 'PTT must still refuse talk while a group-call participant is live');

const callBlock = serverSource.match(
    /if \(sosGroupCall\.isActive\(\)\) \{[\s\S]{0,200}End the active SOS group call first/
);
assert.ok(callBlock, 'individual Call must still refuse while a group call is live');

console.log('SOS ACK ends group-call verification passed.');
