'use strict';

const assert = require('assert');
const path = require('path');
const {
    safeExtension,
    buildSafeFileName,
    assertPathInsideRoot,
    safeOriginalDisplayName,
} = require('../lib/evidenceUploadSafeName');

const TEST_UUID = '123e4567-e89b-42d3-a456-426614174000';

function expectThrow(fn, pattern) {
    assert.throws(fn, pattern);
}

assert.strictEqual(safeExtension('bodycam.MP4'), '.mp4');
assert.strictEqual(safeExtension('../../../outside/evidence.pdf'), '.pdf');
assert.strictEqual(
    buildSafeFileName('../../../outside/evil.mp4', () => TEST_UUID),
    'ev-' + TEST_UUID + '.mp4',
);
assert.strictEqual(
    buildSafeFileName('C:\\Windows\\System32\\evil.H265', () => TEST_UUID),
    'ev-' + TEST_UUID + '.h265',
);
assert.strictEqual(safeOriginalDisplayName('../../../outside/evidence.mp4'), 'evidence.mp4');
assert.strictEqual(safeOriginalDisplayName('C:\\capture\\officer-01.mp4'), 'officer-01.mp4');

expectThrow(() => safeExtension('evidence.mp4.exe'), /type not permitted/i);
expectThrow(() => safeExtension('evidence'), /type not permitted/i);
expectThrow(() => safeExtension('evil.mp4\0.exe'), /name is not permitted/i);
expectThrow(() => safeExtension('evil\n.mp4'), /name is not permitted/i);
expectThrow(
    () => buildSafeFileName('evidence.mp4', () => '../../not-a-uuid'),
    /identifier generation failed/i,
);

const root = path.resolve('C:\\evidence-root');
const safe = path.join(root, 'ev-' + TEST_UUID + '.mp4');
assert.strictEqual(assertPathInsideRoot(root, safe), path.resolve(safe));
expectThrow(() => assertPathInsideRoot(root, root), /escaped its storage root/i);
expectThrow(
    () => assertPathInsideRoot(root, path.resolve(root, '..', 'outside.mp4')),
    /escaped its storage root/i,
);

const generated = buildSafeFileName('/absolute/path/evidence.mkv');
assert.match(generated, /^ev-[0-9a-f-]{36}\.mkv$/);
assert.strictEqual(path.basename(generated), generated);
assert.strictEqual(generated.includes('..'), false);
assert.strictEqual(generated.includes('/'), false);
assert.strictEqual(generated.includes('\\'), false);
expectThrow(() => buildSafeFileName('/absolute/path/evidence.zip'), /type not permitted/i);

console.log('Evidence upload safe-name verification passed.');
