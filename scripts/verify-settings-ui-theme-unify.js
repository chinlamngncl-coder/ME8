'use strict';

/**
 * SETTINGS-UI-THEME-UNIFY-V1 — visual polish guards (IDs + wiring + no full-bleed saves)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public', 'css', 'settings-theme-unify.css'), 'utf8');
const setup = fs.readFileSync(path.join(root, 'public', 'js', 'server-setup.js'), 'utf8');

assert.ok(html.indexOf('/css/settings-theme-unify.css') >= 0, 'settings-theme-unify.css must be linked');

function mustHaveId(id) {
    const re = new RegExp('id="' + id + '"');
    assert.ok(re.test(html), 'missing id=' + id);
}

[
    'server-setup-panel',
    'server-setup-save',
    'server-setup-cancel',
    'server-setup-back',
    'ss-save-bwc-list',
    'cd-save',
    'lab-save',
    'ss-trust-proxy',
    'ss-trust-proxy-help',
    'ss-proxy-readiness',
    'ss-save-production-access',
    'server-setup-bwc',
    'ss-tab-sip',
    'ss-tab-onvif',
    'ss-panel-scroll',
].forEach(mustHaveId);

assert.ok(/id="server-setup-save"[^>]*class="[^"]*btn-primary/.test(html), 'save must keep btn-primary');
assert.ok(/id="server-setup-cancel"[^>]*class="[^"]*btn-secondary/.test(html), 'cancel must keep btn-secondary');
assert.ok(/id="server-setup-back"[^>]*class="[^"]*btn-ghost/.test(html), 'back must keep btn-ghost');

assert.ok(!/id="cd-save"[^>]*style="[^"]*width:\s*100%/.test(html), 'cd-save must not be width 100% inline');
assert.ok(!/id="lab-save"[^>]*style="[^"]*width:\s*100%/.test(html), 'lab-save must not be width 100% inline');

assert.ok(/\.ss-protocol-tabs button[\s\S]*?flex:\s*0\s+0\s+auto/.test(html) || /ss-protocol-tabs button[\s\S]*?flex:\s*0\s+0\s+auto/.test(css),
    'protocol tabs must not flex:1 stretch');
assert.ok(css.indexOf('flex: 0 0 auto !important') >= 0 || css.indexOf('flex: 0 0 auto') >= 0,
    'theme CSS must pin protocol / action button flex');

assert.ok(html.indexOf('ss-trust-proxy-help') >= 0);
assert.ok(html.indexOf('Trust reverse proxy') >= 0);
assert.ok(html.indexOf('OFF = browser talks straight to this server') >= 0);

assert.ok(setup.indexOf("getElementById('server-setup-save')") >= 0);
assert.ok(setup.indexOf("getElementById('server-setup-cancel')") >= 0);
assert.ok(setup.indexOf("getElementById('server-setup-back')") >= 0);
assert.ok(/server-setup-cancel'\)\.addEventListener\('click'/.test(setup));
assert.ok(/server-setup-save'\)\.addEventListener\('click'/.test(setup));

assert.ok(css.indexOf('--accent-blue') >= 0);
assert.ok(css.indexOf('#server-setup-panel') >= 0);

console.log('[ok] verify-settings-ui-theme-unify');
