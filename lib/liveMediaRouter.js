/**
 * Live media router — ZLM ingest + silent ffmpeg failover + wall play routing (mob-me8-zlm-wall-mvp).
 */
'use strict';

const zlmSidecar = require('./zlmSidecar');
const zlmIngest = require('./zlmIngestAdapter');
const zlmFailover = require('./zlmFailover');

const activeIngests = new Map();
const notifyStateByCam = new Map();
let onStreamReadyCb = null;

function zlmHealthy() {
    const st = zlmSidecar.getCachedStatus();
    return !!(st && st.ok);
}

function logFailover(log, camId, reason, detail) {
    if (!log || !log.media) return;
    log.media.info('zlm failover', Object.assign({
        camId: camId,
        reason: reason,
        engine: 'ffmpeg',
    }, detail || {}));
}

function browserFlvPlayUrl(camId) {
    return '/api/live/flv?camId=' + encodeURIComponent(String(camId || '').trim());
}

function isMediaAlive(row) {
    if (!row) return false;
    if (row.bytesSpeed > 0) return true;
    if (row.totalBytes > 2048) return true;
    if (row.originType != null && row.totalReaderCount >= 0 && row.aliveSecond > 0) return true;
    return false;
}

function emitStreamReady(camId, engine, playUrl) {
    const id = String(camId || '').trim();
    if (!id || !onStreamReadyCb) return;
    const prev = notifyStateByCam.get(id);
    if (prev && prev.engine === engine) return;
    notifyStateByCam.set(id, { engine: engine, playUrl: playUrl || null, at: Date.now() });
    onStreamReadyCb(id, {
        engine: engine,
        playUrl: playUrl || (engine === 'zlm' ? browserFlvPlayUrl(id) : null),
    });
}

function clearIngestTimers(entry) {
    if (!entry) return;
    if (entry.readinessTimer) {
        clearTimeout(entry.readinessTimer);
        entry.readinessTimer = null;
    }
    if (entry.stallTimer) {
        clearTimeout(entry.stallTimer);
        entry.stallTimer = null;
    }
    if (entry.zlmReadyTimer) {
        clearTimeout(entry.zlmReadyTimer);
        entry.zlmReadyTimer = null;
    }
}

function scheduleZlmReadyPoll(entry, log) {
    if (!entry || entry.zlmStreamReady || entry.zlmReadyPollStarted) return;
    entry.zlmReadyPollStarted = true;
    const cfg = zlmFailover.readFailoverConfig();
    const deadline = Date.now() + cfg.startTimeoutMs;

    const tick = function () {
        const cur = activeIngests.get(entry.camId);
        if (!cur || cur !== entry || cur.zlmStreamReady) return;
        zlmIngest.getMediaEntry(entry.camId).then(function (row) {
            const live = activeIngests.get(entry.camId);
            if (!live || live !== entry || entry.zlmStreamReady) return;
            if (isMediaAlive(row)) {
                entry.zlmStreamReady = true;
                if (entry.readinessTimer) {
                    clearTimeout(entry.readinessTimer);
                    entry.readinessTimer = null;
                }
                if (log && log.media) {
                    log.media.info('zlm stream ready', {
                        camId: entry.camId,
                        streamId: entry.streamId,
                        bytesSpeed: row.bytesSpeed,
                        totalBytes: row.totalBytes,
                    });
                }
                emitStreamReady(entry.camId, 'zlm', browserFlvPlayUrl(entry.camId));
                scheduleStallWatch(entry, log);
                return;
            }
            if (Date.now() < deadline) {
                entry.zlmReadyTimer = setTimeout(tick, 400);
                if (entry.zlmReadyTimer.unref) entry.zlmReadyTimer.unref();
                return;
            }
            if (!entry.zlmStreamReady) {
                zlmFailover.recordFailure('readiness_timeout', entry.camId);
                logFailover(log, entry.camId, 'readiness_timeout', { timeoutMs: cfg.startTimeoutMs, phase: 'zlm_publish' });
                detachIngest(entry.camId, log, 'readiness_timeout');
            }
        }).catch(function () {
            if (Date.now() < deadline) {
                entry.zlmReadyTimer = setTimeout(tick, 400);
                if (entry.zlmReadyTimer.unref) entry.zlmReadyTimer.unref();
                return;
            }
            if (!entry.zlmStreamReady) {
                zlmFailover.recordFailure('readiness_timeout', entry.camId);
                logFailover(log, entry.camId, 'readiness_timeout', { timeoutMs: cfg.startTimeoutMs, phase: 'zlm_publish' });
                detachIngest(entry.camId, log, 'readiness_timeout');
            }
        });
    };

    entry.zlmReadyTimer = setTimeout(tick, 300);
    if (entry.zlmReadyTimer.unref) entry.zlmReadyTimer.unref();
}

function scheduleStallWatch(entry, log) {
    const cfg = zlmFailover.readFailoverConfig();
    clearIngestTimers(entry);
    entry.stallTimer = setTimeout(function () {
        const cur = activeIngests.get(entry.camId);
        if (!cur || cur !== entry) return;
        const idleMs = Date.now() - (entry.lastPacketAt || entry.attachedAt);
        if (idleMs < cfg.stallTimeoutMs) {
            scheduleStallWatch(entry, log);
            return;
        }
        zlmFailover.recordFailure('stall', entry.camId);
        logFailover(log, entry.camId, 'stall', { idleMs: idleMs, packets: entry.packets });
        detachIngest(entry.camId, log, 'stall');
    }, cfg.stallTimeoutMs);
    if (entry.stallTimer.unref) entry.stallTimer.unref();
}

function scheduleReadinessWatch(entry, log) {
    const cfg = zlmFailover.readFailoverConfig();
    entry.readinessTimer = setTimeout(function () {
        const cur = activeIngests.get(entry.camId);
        if (!cur || cur !== entry || cur.firstPacketAt) return;
        zlmFailover.recordFailure('readiness_timeout', entry.camId);
        logFailover(log, entry.camId, 'readiness_timeout', { timeoutMs: cfg.startTimeoutMs });
        detachIngest(entry.camId, log, 'readiness_timeout');
    }, cfg.startTimeoutMs);
    if (entry.readinessTimer.unref) entry.readinessTimer.unref();
}

async function attachIngest(session, pool, log) {
    const camId = session && session.camId;
    if (!camId) return null;
    if (activeIngests.has(camId)) {
        detachIngest(camId, log, 'reattach');
    }

    const attempt = zlmFailover.shouldAttemptZlm(camId, zlmHealthy);
    if (!attempt.ok) {
        if (zlmFailover.isPrimaryMode() && zlmFailover.isFallbackEnabled()) {
            logFailover(log, camId, attempt.reason, { phase: 'startup' });
        } else if (log && log.media) {
            log.media.info('zlm ingest skip', { camId: camId, reason: attempt.reason });
        }
        return null;
    }

    try {
        const opened = await zlmIngest.openRtpServer(camId);
        let firstPacket = false;
        const unregister = pool.registerRtpMirror(camId, function (msg, rinfo) {
            zlmIngest.forwardRtp(opened.port, msg, rinfo.address, rinfo.port);
            const entry = activeIngests.get(camId);
            if (!entry) return;
            entry.packets += 1;
            entry.lastPacketAt = Date.now();
            if (!firstPacket) {
                firstPacket = true;
                entry.firstPacketAt = entry.lastPacketAt;
                if (log && log.media) {
                    log.media.info('zlm ingest first rtp', {
                        camId: camId,
                        zlmPort: opened.port,
                        from: rinfo.address,
                    });
                }
                scheduleZlmReadyPoll(entry, log);
            }
            if (entry.zlmStreamReady) scheduleStallWatch(entry, log);
        });

        const record = {
            camId: camId,
            streamId: opened.streamId,
            zlmPort: opened.port,
            playUrl: zlmIngest.flvPlayUrl(camId),
            unregister: unregister,
            packets: 0,
            attachedAt: Date.now(),
            firstPacketAt: null,
            lastPacketAt: null,
            readinessTimer: null,
            stallTimer: null,
            zlmReadyTimer: null,
            zlmReadyPollStarted: false,
            zlmStreamReady: false,
        };
        session.zlmIngestActive = true;
        activeIngests.set(camId, record);
        scheduleReadinessWatch(record, log);
        if (log && log.media) {
            log.media.info('zlm ingest attached', {
                camId: camId,
                zlmPort: opened.port,
                streamId: opened.streamId,
                failoverFfmpeg: zlmFailover.isFallbackEnabled(),
            });
        }
        return record;
    } catch (err) {
        zlmFailover.recordFailure('attach_failed', camId);
        if (zlmFailover.isPrimaryMode() && zlmFailover.isFallbackEnabled()) {
            logFailover(log, camId, 'attach_failed', { message: err.message });
        } else if (log && log.media) {
            log.media.warn('zlm ingest attach failed', { camId: camId, message: err.message });
        }
        return null;
    }
}

function detachIngest(camId, log, why) {
    const id = String(camId || '').trim();
    const entry = activeIngests.get(id);
    if (!entry) return;
    clearIngestTimers(entry);
    if (entry.unregister) {
        try { entry.unregister(); } catch (_) { /* ignore */ }
    }
    zlmIngest.releaseForwardSocket(entry.zlmPort);
    zlmIngest.closeRtpServer(entry.streamId).catch(function () { /* ignore */ });
    activeIngests.delete(id);
    const prev = notifyStateByCam.get(id);
    if (zlmFailover.isFallbackEnabled()) {
        if (prev && prev.engine === 'zlm') {
            notifyStateByCam.delete(id);
            emitStreamReady(id, 'ffmpeg', null);
        } else if (!prev && (why === 'readiness_timeout' || why === 'stall' || why === 'attach_failed')) {
            emitStreamReady(id, 'ffmpeg', null);
        }
    }
    if (log && log.media) {
        log.media.info('zlm ingest detached', {
            camId: id,
            packets: entry.packets,
            why: why || null,
        });
    }
}

function detachSession(session, log) {
    if (!session || !session.camId) return;
    session.zlmIngestActive = false;
    zlmFailover.clearCamBlock(session.camId);
    notifyStateByCam.delete(String(session.camId));
    detachIngest(session.camId, log, 'session_end');
}

function shouldNotifyFfmpegReady(camId) {
    const id = String(camId || '').trim();
    const st = notifyStateByCam.get(id);
    if (st && st.engine === 'zlm') return false;
    const ingest = activeIngests.get(id);
    if (ingest && !ingest.zlmStreamReady) return false;
    return true;
}

function getStreamNotifyMeta(camId) {
    const id = String(camId || '').trim();
    const st = notifyStateByCam.get(id);
    if (st && st.engine === 'zlm') {
        return { engine: 'zlm', playUrl: st.playUrl || browserFlvPlayUrl(id) };
    }
    return { engine: 'ffmpeg', playUrl: null };
}

function setOnStreamReady(cb) {
    onStreamReadyCb = typeof cb === 'function' ? cb : null;
}

function getIngest(camId) {
    return activeIngests.get(String(camId || '')) || null;
}

function listActiveIngests() {
    return Array.from(activeIngests.values()).map(function (e) {
        return {
            camId: e.camId,
            zlmPort: e.zlmPort,
            packets: e.packets,
            playUrl: e.playUrl,
            attachedAt: e.attachedAt,
            firstPacketAt: e.firstPacketAt,
        };
    });
}

function getPublicStats() {
    return {
        active: activeIngests.size,
        streams: listActiveIngests(),
        failover: zlmFailover.getPublicStats(),
    };
}

function wire(deps) {
    const pool = deps.liveStreamPool;
    const log = deps.log;
    if (!pool || typeof pool.setOnSessionUdpBegin !== 'function') {
        throw new Error('liveMediaRouter.wire requires liveStreamPool session hooks');
    }

    pool.setOnSessionUdpBegin(function (session) {
        attachIngest(session, pool, log).catch(function (err) {
            zlmFailover.recordFailure('attach_failed', session.camId);
            if (zlmFailover.isPrimaryMode() && zlmFailover.isFallbackEnabled()) {
                logFailover(log, session.camId, 'attach_async', { message: err.message });
            } else if (log && log.media) {
                log.media.warn('zlm ingest attach async fail', {
                    camId: session.camId,
                    message: err.message,
                });
            }
        });
    });

    pool.setOnSessionEnd(function (session) {
        detachSession(session, log);
    });
}

module.exports = {
    wire,
    attachIngest,
    detachIngest,
    detachSession,
    getIngest,
    listActiveIngests,
    getPublicStats,
    setOnStreamReady,
    shouldNotifyFfmpegReady,
    getStreamNotifyMeta,
    browserFlvPlayUrl,
};
