'use strict';

/**
 * SETTINGS-VISUAL-OVERHAUL-V2 — layout polish guards (IDs intact, cards present)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public', 'css', 'settings-theme-unify.css'), 'utf8');
const setup = fs.readFileSync(path.join(root, 'public', 'js', 'server-setup.js'), 'utf8');
const smtp = fs.readFileSync(path.join(root, 'public', 'js', 'platform-smtp.js'), 'utf8');

assert.ok(html.indexOf('settings-visual-overhaul-v2') >= 0 || html.indexOf('settings-theme-unify.css') >= 0);

function mustHaveId(id) {
    assert.ok(new RegExp('id="' + id + '"').test(html), 'missing id=' + id);
}

[
    'server-setup-save',
    'server-setup-cancel',
    'server-setup-back',
    'server-setup-bwc',
    'ss-smtp-host',
    'ss-smtp-port',
    'ss-smtp-save',
    'ss-smtp-test',
    'ss-site-readiness',
    'lab-readiness',
    'cd-readiness',
    'cd-firewall',
    'ss-trust-proxy',
].forEach(mustHaveId);

assert.ok(html.indexOf('ss-type-on-bwc-card') >= 0, 'TYPE ON BWC card wrapper');
assert.ok(html.indexOf('id="server-setup-bwc" class="ss-type-on-bwc-grid"') >= 0, 'BWC checklist grid class');
assert.ok(css.indexOf('grid-template-columns: 200px 1fr') >= 0, '2-col TYPE ON BWC grid');

assert.ok(html.indexOf('ss-smtp-card') >= 0, 'SMTP enterprise card');
assert.ok(/id="ss-smtp-save"/.test(html) && /class="btn btn-primary" id="ss-smtp-save"|id="ss-smtp-save"[^>]*btn-primary|class="[^"]*btn-primary[^"]*"[^>]*id="ss-smtp-save"/.test(html), 'SMTP save primary');
assert.ok(/id="ss-smtp-test"/.test(html) && /class="btn btn-secondary" id="ss-smtp-test"|id="ss-smtp-test"[^>]*btn-secondary|class="[^"]*btn-secondary[^"]*"[^>]*id="ss-smtp-test"/.test(html), 'SMTP test secondary');
assert.ok(/id="ss-smtp-host"[^>]*enterprise-form-control|class="[^"]*enterprise-form-control[^"]*"[^>]*id="ss-smtp-host"/.test(html), 'SMTP host control');
assert.ok(css.indexOf('max-width: 400px') >= 0, 'SMTP max-width constraint');

assert.ok(html.indexOf('ss-inbound-checklist-card') >= 0, 'inbound checklist card');
assert.ok(css.indexOf('.cd-firewall-table th') >= 0, 'firewall table header style');

assert.ok(html.indexOf('ss-readiness-card') >= 0, 'readiness cards');
assert.ok(css.indexOf('.ss-readiness-row:hover') >= 0 || css.indexOf('ss-readiness-row:hover') >= 0);

assert.ok(/id="server-setup-save"[^>]*class="[^"]*btn-primary/.test(html));
assert.ok(/id="server-setup-cancel"[^>]*class="[^"]*btn-secondary/.test(html));
assert.ok(setup.indexOf("getElementById('server-setup-save')") >= 0);
assert.ok(setup.indexOf("getElementById('server-setup-cancel')") >= 0);
assert.ok(setup.indexOf('fillBwcChecklist') >= 0);
assert.ok(smtp.indexOf("ss-smtp-save") >= 0);
assert.ok(smtp.indexOf("ss-smtp-test") >= 0);

assert.ok(html.indexOf('OFF = browser talks straight to this server') >= 0, 'reverse-proxy copy kept');

console.log('[ok] verify-settings-visual-overhaul-v2');
