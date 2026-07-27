'use strict';

/**
 * MOB-APPLY DASHBOARD-AUTH-COMPACT-V1
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const setupJs = fs.readFileSync(path.join(root, 'public', 'js', 'server-setup.js'), 'utf8');
const themeCss = fs.readFileSync(path.join(root, 'public', 'css', 'settings-theme-unify.css'), 'utf8');
const en = JSON.parse(fs.readFileSync(path.join(root, 'public', 'locales', 'en.json'), 'utf8'));

assert.ok(indexHtml.includes('id="ss-dash-sub-site"'), 'site security subtab');
assert.ok(indexHtml.includes('id="ss-site-security-section"'), 'site security wrapper');
assert.ok(
  /id="ss-site-security-section"[\s\S]*id="ss-tech-pin-section"[\s\S]*id="ss-smtp-section"[\s\S]*id="ss-voice-alerts-section"/.test(indexHtml),
  'PIN/SMTP/voice under site section',
);

assert.ok(!/#server-setup-panel\.ss-layout-admin #ss-users-body\.ss-users-list \{[^}]*max-height/.test(indexHtml), 'no admin inner max-height');
assert.ok(/#ss-users-body\.ss-users-list \{[^}]*overflow:\s*visible/.test(indexHtml) || themeCss.includes('max-height: none'), 'list overflow visible');

assert.ok(setupJs.includes("activeDashSubTab === 'site'"), 'site tab layout');
assert.ok(setupJs.includes("setDashSubTab('site')") || setupJs.includes('ss-dash-sub-site'), 'site click wire');
assert.ok(setupJs.includes('ss-user-name-chip'), 'username chip render');
assert.ok(setupJs.includes('ss-user-card'), 'compact card class');

assert.ok(themeCss.includes('ss-user-name-chip') || indexHtml.includes('ss-user-name-chip'), 'chip CSS');
assert.ok(en['server.dashSub.siteSecurity'] === 'Site security', 'i18n site');

assert.ok(indexHtml.includes('dashboard-auth-compact-v1'), 'cache bust');

console.log('[ok] verify-dashboard-auth-compact-v1');
