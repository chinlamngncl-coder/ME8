/**

 * Server credentials vault — SIP / ONVIF / FTP / BWC registration passwords.

 * Stored only under storage/secrets/; encrypted at rest; never returned to clients.

 */

const fs = require('fs');

const path = require('path');

const vaultCrypto = require('./secretsVaultCrypto');



const SECRETS_REL = path.join('secrets', 'server-secrets.json');



function secretsFilePath(storageDir) {

    return path.join(storageDir, SECRETS_REL);

}



function secretsDir(storageDir) {

    return vaultCrypto.secretsDir(storageDir);

}



function emptySecrets() {

    return {

        version: 1,

        sip: { password: '', passwordAlt: '' },

        onvif: { password: '' },

        bwcRegistration: { password: '' },

        ftp: { password: '' },

        tech: { engineerPinHash: '', engineerPinSalt: '' },

    };

}



function envBootstrapSecrets() {

    return {

        version: 1,

        sip: {

            password: String(process.env.FM_GB28181_PASSWORD || '').trim(),

            passwordAlt: String(process.env.FM_GB28181_PASSWORD_ALT || '').trim(),

        },

        onvif: { password: '' },

        bwcRegistration: { password: '' },

        ftp: { password: String(process.env.FM_FTP_PASS || '').trim() },

    };

}



function normalizeSecrets(raw) {

    const base = emptySecrets();

    return {

        version: 1,

        sip: Object.assign({}, base.sip, raw.sip || {}),

        onvif: Object.assign({}, base.onvif, raw.onvif || {}),

        bwcRegistration: Object.assign({}, base.bwcRegistration, raw.bwcRegistration || {}),

        ftp: Object.assign({}, base.ftp, raw.ftp || {}),

        tech: Object.assign({}, base.tech, raw.tech || {}),

    };

}



function readSecretsFile(storageDir) {

    const filePath = secretsFilePath(storageDir);

    try {

        if (!fs.existsSync(filePath)) return null;

        const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        if (vaultCrypto.isEncryptedEnvelope(raw)) {

            return normalizeSecrets(vaultCrypto.decryptSecretsObject(storageDir, raw));

        }

        if (vaultCrypto.isPlaintextSecrets(raw)) {

            return normalizeSecrets(raw);

        }

    } catch (_) { /* rebuild */ }

    return null;

}



function writeSecretsFile(storageDir, secrets) {

    fs.mkdirSync(secretsDir(storageDir), { recursive: true });

    const envelope = vaultCrypto.encryptSecretsObject(storageDir, secrets);

    fs.writeFileSync(secretsFilePath(storageDir), JSON.stringify(envelope, null, 2), 'utf8');

}



function loadSecrets(storageDir) {

    const fromFile = readSecretsFile(storageDir);

    if (fromFile) {

        migratePlaintextVaultIfNeeded(storageDir, fromFile);

        return fromFile;

    }

    const boot = envBootstrapSecrets();

    writeSecretsFile(storageDir, boot);

    return boot;

}



function saveSecrets(storageDir, secrets) {

    writeSecretsFile(storageDir, secrets);

    return secrets;

}



function migratePlaintextVaultIfNeeded(storageDir, secrets) {

    const filePath = secretsFilePath(storageDir);

    if (!fs.existsSync(filePath)) return false;

    try {

        const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        if (!vaultCrypto.isPlaintextSecrets(raw)) return false;

        writeSecretsFile(storageDir, secrets);

        return true;

    } catch (_) {

        return false;

    }

}



function effectiveSecrets(secrets) {
    const sec = normalizeSecrets(secrets || emptySecrets());
    const boot = envBootstrapSecrets();
    return {
        version: 1,
        sip: {
            password: nonEmpty(sec.sip.password) ? sec.sip.password : boot.sip.password,
            passwordAlt: nonEmpty(sec.sip.passwordAlt) ? sec.sip.passwordAlt : boot.sip.passwordAlt,
        },
        onvif: {
            password: nonEmpty(sec.onvif.password) ? sec.onvif.password : boot.onvif.password,
        },
        bwcRegistration: {
            password: nonEmpty(sec.bwcRegistration.password)
                ? sec.bwcRegistration.password
                : boot.bwcRegistration.password,
        },
        ftp: {
            password: nonEmpty(sec.ftp.password) ? sec.ftp.password : boot.ftp.password,
        },
        tech: Object.assign({}, sec.tech || {}),
    };
}

function hydrateVaultFromEnvIfEmpty(storageDir) {
    const secrets = readSecretsFile(storageDir) || loadSecrets(storageDir);
    const boot = envBootstrapSecrets();
    const next = normalizeSecrets(secrets);
    let dirty = false;
    if (!nonEmpty(next.sip.password) && nonEmpty(boot.sip.password)) {
        next.sip.password = boot.sip.password;
        dirty = true;
    }
    if (!nonEmpty(next.sip.passwordAlt) && nonEmpty(boot.sip.passwordAlt)) {
        next.sip.passwordAlt = boot.sip.passwordAlt;
        dirty = true;
    }
    if (!nonEmpty(next.ftp.password) && nonEmpty(boot.ftp.password)) {
        next.ftp.password = boot.ftp.password;
        dirty = true;
    }
    if (dirty) saveSecrets(storageDir, next);
    return dirty;
}

function ensureVaultAtRest(storageDir) {

    vaultCrypto.getVaultKey(storageDir);

    const secrets = readSecretsFile(storageDir);

    if (secrets) {

        migratePlaintextVaultIfNeeded(storageDir, secrets);

    }

    hydrateVaultFromEnvIfEmpty(storageDir);

    return vaultCrypto.applySecretsDirAcl(storageDir);

}



function vaultIsEncrypted(storageDir) {

    const filePath = secretsFilePath(storageDir);

    if (!fs.existsSync(filePath)) return false;

    try {

        const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        return vaultCrypto.isEncryptedEnvelope(raw);

    } catch (_) {

        return false;

    }

}



function nonEmpty(value) {

    return value != null && String(value).trim() !== '';

}



function mergeFromPatch(secrets, patch) {

    const next = JSON.parse(JSON.stringify(secrets || emptySecrets()));

    const body = patch || {};

    const sip = body.sip || {};

    const onvif = body.onvif || {};

    const bwc = body.bwcRegistration || {};

    const ftp = body.ftp || {};

    if (nonEmpty(sip.password)) next.sip.password = String(sip.password).trim();

    if (nonEmpty(sip.passwordAlt)) next.sip.passwordAlt = String(sip.passwordAlt).trim();

    if (nonEmpty(onvif.password)) next.onvif.password = String(onvif.password).trim();

    if (nonEmpty(bwc.password)) next.bwcRegistration.password = String(bwc.password).trim();

    if (nonEmpty(ftp.password)) next.ftp.password = String(ftp.password).trim();

    return next;

}



function applySecrets(settings, secrets) {

    const s = settings || {};

    const eff = effectiveSecrets(secrets);

    s.sip = Object.assign({}, s.sip || {}, {

        password: String(eff.sip.password || ''),

        passwordAlt: String(eff.sip.passwordAlt || ''),

    });

    s.onvif = Object.assign({}, s.onvif || {}, {

        password: String(eff.onvif.password || ''),

    });

    s.bwcRegistration = Object.assign({}, s.bwcRegistration || {}, {

        password: String(eff.bwcRegistration.password || ''),

    });

    s.ftp = Object.assign({}, s.ftp || {}, {

        password: String(eff.ftp.password || ''),

    });

    return s;

}



function stripSecretsForDisk(settings) {

    const copy = JSON.parse(JSON.stringify(settings || {}));

    if (copy.sip) {

        delete copy.sip.password;

        delete copy.sip.passwordAlt;

    }

    if (copy.onvif) delete copy.onvif.password;

    if (copy.bwcRegistration) delete copy.bwcRegistration.password;

    if (copy.ftp) delete copy.ftp.password;

    return copy;

}



function secretFlags(secrets) {

    const eff = effectiveSecrets(secrets);

    return {

        sip: {

            passwordConfigured: nonEmpty(eff.sip.password),

            passwordAltConfigured: nonEmpty(eff.sip.passwordAlt),

        },

        onvif: { passwordConfigured: nonEmpty(eff.onvif.password) },

        bwcRegistration: { passwordConfigured: nonEmpty(eff.bwcRegistration.password) },

        ftp: { passwordConfigured: nonEmpty(eff.ftp.password) },

        vaultEncrypted: true,

    };

}



function migrateLegacySettingsFile(storageDir) {

    const settingsPath = path.join(storageDir, 'server-settings.json');

    if (!fs.existsSync(settingsPath)) return false;

    let raw;

    try {

        raw = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

    } catch (_) {

        return false;

    }

    const secrets = loadSecrets(storageDir);

    let dirty = false;

    const sip = raw.sip || {};

    if (nonEmpty(sip.password)) {

        secrets.sip.password = String(sip.password).trim();

        dirty = true;

    }

    if (nonEmpty(sip.passwordAlt)) {

        secrets.sip.passwordAlt = String(sip.passwordAlt).trim();

        dirty = true;

    }

    const onvif = raw.onvif || {};

    if (nonEmpty(onvif.password)) {

        secrets.onvif.password = String(onvif.password).trim();

        dirty = true;

    }

    const bwc = raw.bwcRegistration || {};

    if (nonEmpty(bwc.password)) {

        secrets.bwcRegistration.password = String(bwc.password).trim();

        dirty = true;

    }

    const ftp = raw.ftp || {};

    if (nonEmpty(ftp.password)) {

        secrets.ftp.password = String(ftp.password).trim();

        dirty = true;

    }

    if (!dirty) return false;

    saveSecrets(storageDir, secrets);

    if (sip.password != null) delete sip.password;

    if (sip.passwordAlt != null) delete sip.passwordAlt;

    if (onvif.password != null) delete onvif.password;

    if (bwc.password != null) delete bwc.password;

    if (ftp.password != null) delete ftp.password;

    fs.writeFileSync(settingsPath, JSON.stringify(raw, null, 2), 'utf8');

    return true;

}



function settingsFileContainsSecrets(storageDir) {

    const settingsPath = path.join(storageDir, 'server-settings.json');

    if (!fs.existsSync(settingsPath)) return false;

    try {

        const raw = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

        const sip = raw.sip || {};

        const onvif = raw.onvif || {};

        const bwc = raw.bwcRegistration || {};

        const ftp = raw.ftp || {};

        return nonEmpty(sip.password) || nonEmpty(sip.passwordAlt)

            || nonEmpty(onvif.password) || nonEmpty(bwc.password) || nonEmpty(ftp.password);

    } catch (_) {

        return false;

    }

}



module.exports = {

    SECRETS_REL,

    emptySecrets,

    loadSecrets,

    saveSecrets,

    ensureVaultAtRest,

    vaultIsEncrypted,

    mergeFromPatch,

    effectiveSecrets,

    hydrateVaultFromEnvIfEmpty,

    applySecrets,

    stripSecretsForDisk,

    secretFlags,

    migrateLegacySettingsFile,

    settingsFileContainsSecrets,

};


