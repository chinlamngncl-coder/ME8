/**
 * SOS cold-start connection lock — debounce duplicate BWC Alarm MESSAGE bursts.
 * Google rule: one INVITE sequence per device while connecting; 5s timeout releases lock.
 */

const log = require('./fleetLog');

const LOCK_MS = parseInt(process.env.FM_SOS_CONNECT_LOCK_MS || '5000', 10);
const locks = new Map();

function isConnecting(camId) {
    return !!(camId && locks.has(String(camId)));
}

function release(camId, reason) {
    const id = camId ? String(camId) : '';
    if (!id) return;
    const entry = locks.get(id);
    if (!entry) return;
    if (entry.timer) clearTimeout(entry.timer);
    locks.delete(id);
    log.sip.info('sos connect lock released', { camId: id, reason: reason || 'unknown', heldMs: Date.now() - entry.since });
}

/**
 * @returns {boolean} true if lock acquired (caller may start INVITE)
 */
function tryAcquire(camId, timeoutMs) {
    const id = camId ? String(camId) : '';
    if (!id) return false;
    if (locks.has(id)) return false;
    const ms = typeof timeoutMs === 'number' && timeoutMs > 0 ? timeoutMs : LOCK_MS;
    const entry = { since: Date.now(), timer: null };
    entry.timer = setTimeout(() => release(id, 'timeout'), ms);
    locks.set(id, entry);
    log.sip.info('sos connect lock acquired', { camId: id, timeoutMs: ms });
    return true;
}

module.exports = {
    tryAcquire,
    isConnecting,
    release,
    LOCK_MS,
};
