'use strict';

/**
 * Valkey / Redis-compatible runtime cache for Fleet GPS, online, and SIP contact.
 * Never blocks SOS / live / PTT. Missing URL = off. Failures = CACHE_DEGRADED.
 */

function nowTs() {
    return Date.now();
}

function safeJsonParse(raw) {
    try {
        return JSON.parse(String(raw || ''));
    } catch (_) {
        return null;
    }
}

function newestByTs(a, b) {
    const aTs = a && a.at != null ? Number(a.at) : 0;
    const bTs = b && b.at != null ? Number(b.at) : 0;
    if (bTs > aTs) return b;
    return a;
}

function createRedisRuntime(options = {}) {
    const url = String(options.url || '').trim();
    const keyPrefix = String(options.keyPrefix || 'me8:').trim() || 'me8:';
    const connectTimeoutMs = Number.isFinite(options.connectTimeoutMs)
        ? Math.max(1000, options.connectTimeoutMs)
        : 5000;
    const log = options.log || null;
    const RedisCtor = options.Redis || null;

    let client = null;
    let mode = url ? 'connecting' : 'off';
    let lastError = null;
    let started = false;

    const keys = {
        gps: keyPrefix + 'gps',
        online: keyPrefix + 'online',
        contact: keyPrefix + 'contact',
    };

    function info(message, detail) {
        try {
            if (log && log.web && typeof log.web.info === 'function') log.web.info(message, detail || {});
        } catch (_) { /* ignore */ }
    }

    function warn(message, detail) {
        try {
            if (log && log.web && typeof log.web.warn === 'function') log.web.warn(message, detail || {});
        } catch (_) { /* ignore */ }
    }

    function markDegraded(err) {
        if (!url) {
            mode = 'off';
            return;
        }
        mode = 'degraded';
        lastError = err && err.message ? err.message : String(err || 'cache_degraded');
        warn('cache_degraded', { message: lastError });
    }

    function markReady() {
        mode = 'ready';
        lastError = null;
    }

    function snapshot() {
        return {
            configured: !!url,
            mode,
            ready: mode === 'ready',
            degraded: mode === 'degraded',
            keyPrefix,
            lastError,
        };
    }

    async function withClient(fn) {
        if (!url || !client || typeof fn !== 'function') return null;
        try {
            return await fn(client);
        } catch (err) {
            markDegraded(err);
            return null;
        }
    }

    function fireAndForget(fn) {
        Promise.resolve()
            .then(fn)
            .catch((err) => markDegraded(err));
    }

    async function start() {
        if (started) return snapshot();
        started = true;
        if (!url) {
            mode = 'off';
            return snapshot();
        }
        if (!RedisCtor) {
            markDegraded(new Error('Redis client constructor unavailable'));
            return snapshot();
        }
        try {
            client = new RedisCtor(url, {
                connectTimeout: connectTimeoutMs,
                maxRetriesPerRequest: 1,
                enableOfflineQueue: false,
                lazyConnect: true,
            });
            client.on('error', (err) => markDegraded(err));
            client.on('ready', () => markReady());
            client.on('end', () => {
                if (mode !== 'off') markDegraded(new Error('connection ended'));
            });
            await client.connect();
            const pong = await client.ping();
            if (String(pong).toUpperCase() !== 'PONG') {
                throw new Error('unexpected PING response');
            }
            markReady();
            info('valkey runtime cache ready', { keyPrefix });
        } catch (err) {
            markDegraded(err);
            try {
                if (client && typeof client.disconnect === 'function') client.disconnect();
            } catch (_) { /* ignore */ }
            client = null;
        }
        return snapshot();
    }

    async function stop() {
        const current = client;
        client = null;
        if (!current) return;
        try {
            if (typeof current.quit === 'function') await current.quit();
            else if (typeof current.disconnect === 'function') current.disconnect();
        } catch (_) { /* ignore */ }
    }

    function writeGps(camId, fix) {
        const id = String(camId || '').trim();
        if (!id || !fix || fix.lat == null || fix.lon == null) return;
        const payload = {
            lat: Number(fix.lat),
            lon: Number(fix.lon),
            at: fix.at != null ? Number(fix.at) : nowTs(),
        };
        fireAndForget(() => withClient((c) => c.hset(keys.gps, id, JSON.stringify(payload))));
    }

    function writeContact(camId, uri) {
        const id = String(camId || '').trim();
        const contact = String(uri || '').trim();
        if (!id || !contact) return;
        const payload = { uri: contact, at: nowTs() };
        fireAndForget(() => withClient((c) => c.hset(keys.contact, id, JSON.stringify(payload))));
    }

    function writeOnline(camId, patch) {
        const id = String(camId || '').trim();
        if (!id || !patch) return;
        const payload = {
            online: patch.online ? 1 : 0,
            lastSeen: patch.lastSeen != null ? Number(patch.lastSeen) : nowTs(),
            lastIp: patch.lastIp != null ? patch.lastIp : null,
            pttOnline: patch.pttOnline ? 1 : 0,
            at: nowTs(),
        };
        fireAndForget(() => withClient((c) => c.hset(keys.online, id, JSON.stringify(payload))));
    }

    async function readHashMap(hashKey) {
        const raw = await withClient((c) => c.hgetall(hashKey));
        if (!raw || typeof raw !== 'object') return {};
        const out = {};
        Object.keys(raw).forEach((id) => {
            const parsed = safeJsonParse(raw[id]);
            if (parsed) out[id] = parsed;
        });
        return out;
    }

    async function hydrateGps(memoryMap) {
        if (!memoryMap || typeof memoryMap !== 'object') return { merged: 0 };
        const remote = await readHashMap(keys.gps);
        let merged = 0;
        Object.keys(remote).forEach((id) => {
            const remoteFix = remote[id];
            if (!remoteFix || remoteFix.lat == null || remoteFix.lon == null) return;
            const current = memoryMap[id];
            const winner = newestByTs(current, {
                lat: Number(remoteFix.lat),
                lon: Number(remoteFix.lon),
                at: remoteFix.at != null ? Number(remoteFix.at) : 0,
            });
            if (winner && winner !== current) {
                memoryMap[id] = winner;
                merged += 1;
            }
        });
        return { merged };
    }

    async function hydrateContact(memoryMap) {
        if (!memoryMap || typeof memoryMap !== 'object') return { merged: 0 };
        const remote = await readHashMap(keys.contact);
        let merged = 0;
        Object.keys(remote).forEach((id) => {
            const row = remote[id];
            const uri = row && row.uri ? String(row.uri).trim() : '';
            if (!uri) return;
            if (!memoryMap[id]) {
                memoryMap[id] = uri;
                merged += 1;
            }
        });
        return { merged };
    }

    async function hydrateOnline(applyFn) {
        if (typeof applyFn !== 'function') return { merged: 0 };
        const remote = await readHashMap(keys.online);
        let merged = 0;
        Object.keys(remote).forEach((id) => {
            const row = remote[id];
            if (!row) return;
            applyFn(id, {
                online: !!(row.online === 1 || row.online === true),
                lastSeen: row.lastSeen != null ? Number(row.lastSeen) : (row.at != null ? Number(row.at) : nowTs()),
                lastIp: row.lastIp != null ? row.lastIp : null,
                pttOnline: !!(row.pttOnline === 1 || row.pttOnline === true),
            });
            merged += 1;
        });
        return { merged };
    }

    return {
        start,
        stop,
        snapshot,
        writeGps,
        writeContact,
        writeOnline,
        hydrateGps,
        hydrateContact,
        hydrateOnline,
        newestByTs,
        keys,
        _markDegraded: markDegraded,
        _setClientForTests(testClient) {
            client = testClient;
            started = true;
            mode = testClient ? 'ready' : (url ? 'degraded' : 'off');
        },
    };
}

module.exports = {
    createRedisRuntime,
    newestByTs,
};
