/**
 * ME8 secrets vault — AES-256-GCM at rest; key from env or DPAPI-wrapped file (Windows).
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ENVELOPE_FORMAT = 'me8-secrets-v2';
const CIPHER = 'aes-256-gcm';
const IV_BYTES = 12;
const KEY_BYTES = 32;
const DPAPI_KEY_FILE = 'vault-key.dpapi';
const DPAPI_DEV_KEY_FILE = 'vault-key.dev';

let cachedVaultKey = null;

function secretsDir(storageDir) {
    return path.join(storageDir, 'secrets');
}

function dpapiScope() {
    return String(process.env.FM_SECRETS_DPAPI_SCOPE || 'CurrentUser').trim() === 'LocalMachine'
        ? 'LocalMachine'
        : 'CurrentUser';
}

function parseMasterKeyEnv(raw) {
    const text = String(raw || '').trim();
    if (!text) throw new Error('FM_SECRETS_MASTER_KEY is empty');
    let buf;
    if (/^[0-9a-fA-F]{64}$/.test(text)) {
        buf = Buffer.from(text, 'hex');
    } else {
        buf = Buffer.from(text, 'base64');
    }
    if (buf.length !== KEY_BYTES) {
        throw new Error(`FM_SECRETS_MASTER_KEY must be ${KEY_BYTES} bytes`);
    }
    return buf;
}

function runPowerShell(script) {
    return execFileSync(
        'powershell',
        ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script],
        { encoding: 'utf8', windowsHide: true },
    ).trim();
}

function psQuote(filePath) {
    return String(filePath).replace(/'/g, "''");
}

function unwrapDpapiKey(filePath) {
    if (process.platform !== 'win32') {
        throw new Error('DPAPI vault key requires Windows or set FM_SECRETS_MASTER_KEY');
    }
    const scope = dpapiScope();
    const ps = [
        `$p='${psQuote(filePath)}'`,
        'Add-Type -AssemblyName System.Security',
        `$prot=[IO.File]::ReadAllBytes($p)`,
        `$raw=[Security.Cryptography.ProtectedData]::Unprotect($prot,$null,[Security.Cryptography.DataProtectionScope]::${scope})`,
        '[Convert]::ToBase64String($raw)',
    ].join('; ');
    const b64 = runPowerShell(ps);
    const key = Buffer.from(b64, 'base64');
    if (key.length !== KEY_BYTES) throw new Error('Vault key has invalid length');
    return key;
}

function wrapDpapiKey(filePath, keyBuf) {
    if (process.platform !== 'win32') {
        fs.writeFileSync(filePath, keyBuf);
        return;
    }
    const scope = dpapiScope();
    const b64 = keyBuf.toString('base64');
    const ps = [
        `$p='${psQuote(filePath)}'`,
        'Add-Type -AssemblyName System.Security',
        `$raw=[Convert]::FromBase64String('${b64}')`,
        `$prot=[Security.Cryptography.ProtectedData]::Protect($raw,$null,[Security.Cryptography.DataProtectionScope]::${scope})`,
        '[IO.File]::WriteAllBytes($p,$prot)',
    ].join('; ');
    runPowerShell(ps);
}

function vaultKeyPath(storageDir) {
    if (process.env.FM_SECRETS_MASTER_KEY) return null;
    const dir = secretsDir(storageDir);
    if (process.platform === 'win32') {
        return path.join(dir, DPAPI_KEY_FILE);
    }
    return path.join(dir, DPAPI_DEV_KEY_FILE);
}

function getVaultKey(storageDir) {
    if (cachedVaultKey) return cachedVaultKey;
    const envKey = process.env.FM_SECRETS_MASTER_KEY;
    if (envKey) {
        cachedVaultKey = parseMasterKeyEnv(envKey);
        return cachedVaultKey;
    }
    const keyPath = vaultKeyPath(storageDir);
    if (keyPath && fs.existsSync(keyPath)) {
        if (process.platform === 'win32') {
            cachedVaultKey = unwrapDpapiKey(keyPath);
        } else {
            const raw = fs.readFileSync(keyPath);
            if (raw.length !== KEY_BYTES) throw new Error('Dev vault key has invalid length');
            cachedVaultKey = raw;
        }
        return cachedVaultKey;
    }
    cachedVaultKey = crypto.randomBytes(KEY_BYTES);
    fs.mkdirSync(secretsDir(storageDir), { recursive: true });
    wrapDpapiKey(keyPath, cachedVaultKey);
    return cachedVaultKey;
}

function isEncryptedEnvelope(raw) {
    return !!(raw && raw.format === ENVELOPE_FORMAT && raw.cipher === CIPHER && raw.data);
}

function isPlaintextSecrets(raw) {
    return !!(raw && raw.version === 1 && (raw.sip || raw.ftp || raw.onvif || raw.bwcRegistration));
}

function encryptSecretsObject(storageDir, secrets) {
    const key = getVaultKey(storageDir);
    const iv = crypto.randomBytes(IV_BYTES);
    const cipher = crypto.createCipheriv(CIPHER, key, iv);
    const plaintext = JSON.stringify(secrets);
    const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {
        format: ENVELOPE_FORMAT,
        cipher: CIPHER,
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
        data: enc.toString('base64'),
    };
}

function decryptSecretsObject(storageDir, envelope) {
    if (!isEncryptedEnvelope(envelope)) {
        throw new Error('Secrets file is not an encrypted vault envelope');
    }
    const key = getVaultKey(storageDir);
    const iv = Buffer.from(envelope.iv, 'base64');
    const tag = Buffer.from(envelope.tag, 'base64');
    const data = Buffer.from(envelope.data, 'base64');
    const decipher = crypto.createDecipheriv(CIPHER, key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
    return JSON.parse(plaintext);
}

function applySecretsDirAcl(storageDir) {
    if (process.platform !== 'win32') return { ok: false, reason: 'not-windows' };
    const aclScript = path.join(__dirname, '..', 'scripts', 'me8-ship', 'LOCK-SECRETS-ACL.ps1');
    if (!fs.existsSync(aclScript)) return { ok: false, reason: 'script-missing' };
    try {
        execFileSync(
            'powershell',
            ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', aclScript, '-AppRoot', path.join(storageDir, '..')],
            { encoding: 'utf8', windowsHide: true },
        );
        return { ok: true };
    } catch (err) {
        return { ok: false, reason: err.message || String(err) };
    }
}

function clearCachedVaultKey() {
    cachedVaultKey = null;
}

module.exports = {
    ENVELOPE_FORMAT,
    DPAPI_KEY_FILE,
    getVaultKey,
    isEncryptedEnvelope,
    isPlaintextSecrets,
    encryptSecretsObject,
    decryptSecretsObject,
    applySecretsDirAcl,
    clearCachedVaultKey,
    secretsDir,
};
