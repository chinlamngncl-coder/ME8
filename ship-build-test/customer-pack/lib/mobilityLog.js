const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'storage');
const LOG_FILE = path.join(LOG_DIR, 'mobility.log');

function stamp() {
    return new Date().toISOString();
}

function emit(channel, level, message, detail) {
    let line = `${stamp()} [${channel}] ${level} ${message}`;
    if (detail !== undefined && detail !== null) {
        const extra = typeof detail === 'string' ? detail : JSON.stringify(detail);
        line += ` | ${extra}`;
    }
    console.log(line);
    try {
        if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
        fs.appendFileSync(LOG_FILE, `${line}\n`);
    } catch (_) { /* disk optional */ }
}

function channel(name) {
    return {
        info: (message, detail) => emit(name, 'INFO', message, detail),
        warn: (message, detail) => emit(name, 'WARN', message, detail),
        err: (message, detail) => emit(name, 'ERR', message, detail),
    };
}

module.exports = {
    logFile: LOG_FILE,
    sip: channel('SIP'),
    messaging: channel('Messaging'),
    media: channel('Media'),
    ptt: channel('PTT'),
    ftp: channel('FTP'),
    web: channel('Web'),
};
