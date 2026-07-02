'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');

const root = path.join(__dirname, '..');
const techAccess = require(path.join(root, 'lib', 'techAccess'));
const serverSecrets = require(path.join(root, 'lib', 'serverSecrets'));

const serverJs = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const setupJs = fs.readFileSync(path.join(root, 'public', 'js', 'server-setup.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const en = JSON.parse(fs.readFileSync(path.join(root, 'public', 'locales', 'en.json'), 'utf8'));
const secretsSrc = fs.readFileSync(path.join(root, 'lib', 'serverSecrets.js'), 'utf8');

let fail = 0;
function check(label, ok) {
    if (!ok) {
        console.error('FAIL:', label);
        fail++;
    }
}

check('provision API route', serverJs.includes("app.post('/api/tech/provision'"));
check('provision status route', serverJs.includes("app.get('/api/tech/provision/status'"));
check('techAccess.provisionPin', typeof techAccess.provisionPin === 'function');
check('serverSecrets tech vault field', secretsSrc.includes('engineerPinHash'));
check('showTechProvision UI', setupJs.includes('function showTechProvision'));
check('provision backdrop in HTML', indexHtml.includes('ss-tech-provision-backdrop'));
check('en tech.provision.title', !!en['tech.provision.title']);
check('en tech.provision.hint has no .env', !/\.env/i.test(en['tech.provision.hint'] || ''));

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'me8-tech-pin-'));
try {
    serverSecrets.saveSecrets(tmp, serverSecrets.emptySecrets());
    check('init not configured', techAccess.init(tmp) === false);
    techAccess.provisionPin(tmp, 'abcdefghijkl');
    check('provision configures', techAccess.isConfigured() === true);
    check('init loads vault', techAccess.init(tmp) === true);
    const secrets = serverSecrets.loadSecrets(tmp);
    check('vault stores hash only', !!(secrets.tech && secrets.tech.engineerPinHash && secrets.tech.engineerPinSalt));
    check('vault never stores plaintext pin', !JSON.stringify(secrets).includes('abcdefghijkl'));
} finally {
    fs.rmSync(tmp, { recursive: true, force: true });
}

if (fail) process.exit(1);
console.log('tech-pin-provision verify OK');
