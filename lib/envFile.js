/**
 * Safe read/update of Mobility .env (key=value lines only).
 */
const fs = require('fs');
const path = require('path');

function readEnvFile(envPath) {
    const out = {};
    if (!envPath || !fs.existsSync(envPath)) return out;
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    lines.forEach(function (line) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const eq = trimmed.indexOf('=');
        if (eq <= 0) return;
        const key = trimmed.slice(0, eq).trim();
        let val = trimmed.slice(eq + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
        }
        out[key] = val;
    });
    return out;
}

function setEnvVars(envPath, updates) {
    updates = updates || {};
    const keys = Object.keys(updates);
    if (!keys.length) return;
    let lines = [];
    if (envPath && fs.existsSync(envPath)) {
        lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    }
    const seen = new Set();
    const next = lines.map(function (line) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return line;
        const eq = trimmed.indexOf('=');
        if (eq <= 0) return line;
        const key = trimmed.slice(0, eq).trim();
        if (!Object.prototype.hasOwnProperty.call(updates, key)) return line;
        seen.add(key);
        const val = updates[key] == null ? '' : String(updates[key]);
        return key + '=' + val;
    });
    keys.forEach(function (key) {
        if (seen.has(key)) return;
        next.push(key + '=' + (updates[key] == null ? '' : String(updates[key])));
    });
    fs.mkdirSync(path.dirname(envPath), { recursive: true });
    fs.writeFileSync(envPath, next.join('\n').replace(/\n*$/, '') + '\n', 'utf8');
}

module.exports = {
    readEnvFile,
    setEnvVars,
};
