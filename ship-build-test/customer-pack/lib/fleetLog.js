const fs = require('fs');
const path = require('path');
const siteTime = require('./siteTime');

const LOG_DIR = path.join(__dirname, '..', 'storage');
const LOG_FILE = path.join(LOG_DIR, 'fleet.log');
const RING_MAX = 4000;

const ringBuffer = [];
let traceEnabled = process.env.FM_TRACE === '1';

function pushRing(line) {
    ringBuffer.push(line);
    if (ringBuffer.length > RING_MAX) ringBuffer.shift();
}

function stamp() {
    return siteTime.formatLogStamp(new Date());
}

function emit(channel, level, message, detail) {
    let line = `${stamp()} [${channel}] ${level} ${message}`;
    if (detail !== undefined && detail !== null) {
        const extra = typeof detail === 'string' ? detail : JSON.stringify(detail);
        line += ` | ${extra}`;
    }
    console.log(line);
    pushRing(line);
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
        trace: (message, detail) => {
            if (traceEnabled) emit(name, 'TRACE', message, detail);
        },
    };
}

function isTraceEnabled() {
    return traceEnabled;
}

function setTraceEnabled(on) {
    if (process.env.FM_TRACE === '1') return true;
    traceEnabled = !!on;
    return traceEnabled;
}

function tailRing(opts) {
    const lines = opts && opts.lines ? Math.min(parseInt(opts.lines, 10) || 200, RING_MAX) : 200;
    const channelFilter = opts && opts.channel ? String(opts.channel).trim() : '';
    const contains = opts && opts.contains ? String(opts.contains).trim().toLowerCase() : '';
    let rows = ringBuffer.slice(-lines);
    if (channelFilter) {
        const needle = `[${channelFilter}]`;
        rows = rows.filter((l) => l.includes(needle));
    }
    if (contains) {
        rows = rows.filter((l) => l.toLowerCase().includes(contains));
    }
    return rows;
}

function tailFile(opts) {
    const lines = opts && opts.lines ? Math.min(parseInt(opts.lines, 10) || 200, 2000) : 200;
    try {
        if (!fs.existsSync(LOG_FILE)) return [];
        const raw = fs.readFileSync(LOG_FILE, 'utf8');
        let rows = raw.split(/\r?\n/).filter(Boolean);
        rows = rows.slice(-lines);
        const channelFilter = opts && opts.channel ? String(opts.channel).trim() : '';
        const contains = opts && opts.contains ? String(opts.contains).trim().toLowerCase() : '';
        if (channelFilter) {
            const needle = `[${channelFilter}]`;
            rows = rows.filter((l) => l.includes(needle));
        }
        if (contains) {
            rows = rows.filter((l) => l.toLowerCase().includes(contains));
        }
        return rows;
    } catch (_) {
        return [];
    }
}

module.exports = {
    logFile: LOG_FILE,
    sip: channel('SIP'),
    messaging: channel('Messaging'),
    media: channel('Media'),
    ptt: channel('PTT'),
    ftp: channel('FTP'),
    web: channel('Web'),
    isTraceEnabled,
    setTraceEnabled,
    tailRing,
    tailFile,
};
