'use strict';

/**
 * MOB-APPLY CLOUD-DEPLOYMENT-GRID-UNIFY
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const start = html.indexOf('id="ss-panel-cloud"');
const end = html.indexOf('id="ss-tech-unlock"');
assert.ok(start > 0 && end > start, 'cloud panel slice');
const cloud = html.slice(start, end);

assert.ok(/ss-config-section[\s\S]*cloud\.site\.title[\s\S]*ss-east-west-grid[\s\S]*cd-site-reference/.test(cloud),
  'site identity section + grid');
assert.ok(/ss-config-section[\s\S]*cloud\.access\.title[\s\S]*ss-east-west-grid[\s\S]*cd-deployment-mode/.test(cloud),
  'public access section + grid');
assert.ok(/ss-config-section[\s\S]*cloud\.verification\.title[\s\S]*ss-east-west-grid[\s\S]*cd-verification-url[\s\S]*cd-verification-token/.test(cloud),
  'verification section + grid');
assert.ok((cloud.match(/id="cd-site-reference"/g) || []).length === 1, 'site ref id once');
assert.ok((cloud.match(/id="cd-deployment-mode"/g) || []).length === 1, 'deploy mode id once');
assert.ok((cloud.match(/id="cd-verification-token"/g) || []).length === 1, 'token id once');
assert.ok(!cloud.includes('enterprise-section-title" data-i18n="cloud.site.title"'), 'site not old h5 card');
assert.ok(!cloud.includes('enterprise-section-title" data-i18n="cloud.access.title"'), 'access not old h5 card');
assert.ok(/<h4 data-i18n="cloud\.verification\.title">/.test(cloud), 'verification h4');
assert.ok(/<label>\s*<span data-i18n="cloud\.site\.reference">/.test(cloud), 'label span above input');

console.log('[ok] verify-cloud-deployment-grid-unify');
