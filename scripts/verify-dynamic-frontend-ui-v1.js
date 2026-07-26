'use strict';

/**
 * MOB-APPLY DYNAMIC-FRONTEND-UI-V1
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public', 'css', 'settings-theme-unify.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'public', 'js', 'server-setup.js'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const depMod = fs.readFileSync(path.join(root, 'lib', 'deploymentMode.js'), 'utf8');
const en = JSON.parse(fs.readFileSync(path.join(root, 'public', 'locales', 'en.json'), 'utf8'));

assert.ok(/DYNAMIC-FRONTEND-UI-V1/.test(css), 'css marker');
assert.ok(/max-width:\s*1100px/.test(css), 'panel max-width in unify css');
assert.ok(/#server-setup-panel\s*\{[^}]*max-width:\s*1100px/s.test(html) || /max-width: 1100px/.test(html), 'html panel max-width');
assert.ok(/flex:\s*0\s+0\s+auto/.test(css) || /flex: 0 0 auto/.test(html), 'content-sized tabs');
assert.ok(/data-ss-saas-hide="cloud_leased"/.test(html), 'saas hide attrs');
assert.ok(/id="ss-section-ssl"/.test(html), 'ssl section');
assert.ok(/id="ss-ssl-cert"/.test(html) && /id="ss-ssl-key"/.test(html), 'ssl file inputs');
assert.ok(/ss-ssl-form/.test(css) && /max-width:\s*420px/.test(css), 'ssl form containment');
assert.ok(/applySaasDeploymentChrome/.test(js), 'saas chrome fn');
assert.ok(/DEPLOYMENT_MODE/.test(js) && /cloud_leased/.test(js), 'mode toggle');
assert.ok(/bindSslScaffold/.test(js), 'ssl bind');
assert.ok(/require\('\.\/lib\/deploymentMode'\)/.test(server), 'server require');
assert.ok(/saasDeployment/.test(server), 'api payload');
assert.ok(/resolveDeploymentMode/.test(depMod), 'deploymentMode module');
assert.ok(en['server.ssl.title'] && en['server.ssl.certLabel'], 'ssl i18n');
assert.ok(/dynamic-frontend-ui-v1/.test(html), 'cache bust');

const dm = require(path.join(root, 'lib', 'deploymentMode'));
assert.strictEqual(dm.normalizeMode('cloud-leased'), 'cloud_leased');
assert.strictEqual(dm.normalizeMode('onprem'), 'on_prem');
process.env.FM_DEPLOYMENT_MODE = 'cloud_leased';
assert.strictEqual(dm.resolveDeploymentMode(), 'cloud_leased');
delete process.env.FM_DEPLOYMENT_MODE;
assert.strictEqual(dm.resolveDeploymentMode(), 'on_prem');

console.log('[ok] verify-dynamic-frontend-ui-v1');
