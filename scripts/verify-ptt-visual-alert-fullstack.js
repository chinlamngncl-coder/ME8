'use strict';

/**
 * PTT-VISUAL-ALERT-FULLSTACK-V1 — guards
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const ptt = fs.readFileSync(path.join(root, 'lib', 'pttServer.js'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const wall = fs.readFileSync(path.join(root, 'public', 'js', 'video-wall.js'), 'utf8');
const cw = fs.readFileSync(path.join(root, 'public', 'js', 'command-wall.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');

assert.ok(/RX_IDLE_MS\s*=\s*800/.test(ptt), 'debounce must be 800ms');
assert.ok(/CMD_PTT_AUDIO\s*=\s*130/.test(ptt), 'dwCMD 130 still PTT audio');
assert.ok(/io\.emit\('ptt_state'/.test(server), 'ptt_state emit');
assert.ok(/io\.emit\('ptt-rx-state'/.test(server), 'ptt-rx-state kept');

assert.ok(wall.indexOf('ptt-incoming-alert') >= 0, 'wall class');
assert.ok(!/const rx = !!\(camId && !liveActive && \(pttRxActive/.test(wall),
    'must not suppress pulse when liveActive');
assert.ok(wall.indexOf('rxTalking') >= 0);

assert.ok(cw.indexOf('ptt-incoming-alert') >= 0, 'command wall class');
assert.ok(html.indexOf('ptt-incoming-alert') >= 0, 'CSS for pulse');
assert.ok(html.indexOf('ptt-visual-alert-fullstack-v1') >= 0, 'cache bust');

console.log('[ok] verify-ptt-visual-alert-fullstack');
