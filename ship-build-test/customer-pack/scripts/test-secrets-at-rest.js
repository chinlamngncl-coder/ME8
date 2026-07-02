'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const vaultCrypto = require('../lib/secretsVaultCrypto');
const serverSecrets = require('../lib/serverSecrets');

const storage = fs.mkdtempSync(path.join(os.tmpdir(), 'me8-secrets-test-'));
const secretsPath = path.join(storage, 'secrets', 'server-secrets.json');

const sample = {
    version: 1,
    sip: { password: 'test-sip', passwordAlt: '' },
    onvif: { password: '' },
    bwcRegistration: { password: '' },
    ftp: { password: 'test-ftp' },
};

vaultCrypto.clearCachedVaultKey();
fs.mkdirSync(path.dirname(secretsPath), { recursive: true });
fs.writeFileSync(secretsPath, JSON.stringify(sample, null, 2), 'utf8');

const loaded = serverSecrets.loadSecrets(storage);
const okRuntime = loaded.sip.password === 'test-sip' && loaded.ftp.password === 'test-ftp';
const encrypted = serverSecrets.vaultIsEncrypted(storage);
const raw = fs.readFileSync(secretsPath, 'utf8');
const noPlainPassword = !/test-sip/.test(raw) && !/test-ftp/.test(raw);

console.log('runtime passwords ok:', okRuntime);
console.log('vault encrypted on disk:', encrypted);
console.log('no plaintext in file:', noPlainPassword);
console.log('envelope format:', encrypted ? JSON.parse(raw).format : 'n/a');

try {
    fs.rmSync(storage, { recursive: true, force: true });
} catch (_) { /* ignore */ }

if (!okRuntime || !encrypted || !noPlainPassword) {
    process.exit(1);
}
console.log('secrets-at-rest test OK');
