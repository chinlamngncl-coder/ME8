'use strict';
/**
 * VMS-INVESTIGATION-AI-ALARM-MARKERS-V1
 * On-demand bridge: FR / ANPR / Weapon → vms_alarm_markers for Investigation timeline.
 *
 * Safety (no flood / no crash):
 * - Only when timeline loads (cam + time window)
 * - Deterministic ids → re-index does not duplicate
 * - Caps per source + total query LIMIT on read path
 * - FR: match=true only; ANPR: clear plate + 45s plate bucket; Weapon: ops cases only
 * - Never throws to caller
 */
const crypto = require('crypto');
const siteDb = require('./siteDb');
const log = require('./fleetLog');

const INDEX_COOLDOWN_MS = 15000;
const MAX_FR = 60;
const MAX_ANPR = 60;
const MAX_WEAPON = 40;
const ANPR_BUCKET_MS = 45000;
const lastIndexAt = new Map();

function stableId(prefix, sourceKey) {
    const h = crypto.createHash('sha256').update(String(sourceKey)).digest('hex').slice(0, 22);
    return prefix + h;
}

function windowKey(camId, fromIso, toIso) {
    return String(camId) + '|' + String(fromIso) + '|' + String(toIso);
}

async function upsertMarker(row) {
    await siteDb.query(
        `INSERT INTO vms_alarm_markers (id, cam_id, occurred_at, event_type, note, retain_marker)
         VALUES ($1, $2, $3, $4, $5, TRUE)
         ON CONFLICT (id) DO UPDATE SET
           cam_id = EXCLUDED.cam_id,
           occurred_at = EXCLUDED.occurred_at,
           event_type = EXCLUDED.event_type,
           note = EXCLUDED.note,
           retain_marker = TRUE`,
        [row.id, row.camId, row.occurredAt, row.eventType, row.note]
    );
}

async function indexFr(camId, fromIso, toIso) {
    const aliases = [camId];
    try {
        const devices = await siteDb.listDevices();
        (devices || []).forEach((d) => {
            if (!d) return;
            const id = String(d.deviceId || '').trim();
            const ser = String(d.serialNo || '').trim();
            if (id === camId || ser === camId) {
                if (id) aliases.push(id);
                if (ser) aliases.push(ser);
            }
        });
    } catch (_) { /* ignore */ }
    const uniq = [...new Set(aliases.map((a) => String(a).trim()).filter(Boolean))];
    const { rows } = await siteDb.query(
        `SELECT id, captured_at, bwc_id, display_name, score_pct, blacklist_id, hit_id
         FROM fr_capture_history
         WHERE match = TRUE
           AND captured_at >= $1 AND captured_at <= $2
           AND (bwc_id = ANY($3::text[]) OR device_label = ANY($3::text[]))
         ORDER BY captured_at ASC
         LIMIT $4`,
        [fromIso, toIso, uniq, MAX_FR]
    );
    let n = 0;
    for (const r of rows || []) {
        const name = String(r.display_name || 'Watchlist').slice(0, 80);
        const score = r.score_pct != null ? Math.round(Number(r.score_pct)) : null;
        const note = score != null
            ? ('FR · ' + name + ' · ' + score + '%')
            : ('FR · ' + name);
        await upsertMarker({
            id: stableId('ai-fr-', 'fr:' + (r.hit_id || r.id)),
            camId,
            occurredAt: r.captured_at,
            eventType: 'analytics',
            note: note.slice(0, 500),
        });
        n += 1;
    }
    return n;
}

/** Live / ledger fallback when PG history is empty or siteDb lag */
async function indexFrLedger(camId, fromIso, toIso) {
    let frSnapLedger;
    try {
        frSnapLedger = require('./frSnapLedger');
    } catch (_) {
        return 0;
    }
    if (!frSnapLedger || typeof frSnapLedger.list !== 'function') return 0;
    const fromMs = Date.parse(fromIso);
    const toMs = Date.parse(toIso);
    if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) return 0;
    let rows = [];
    try {
        rows = frSnapLedger.list({ camId, matchOnly: true, limit: MAX_FR }) || [];
    } catch (_) {
        return 0;
    }
    let n = 0;
    for (const e of rows) {
        if (n >= MAX_FR) break;
        const t = Date.parse(e.at);
        if (!Number.isFinite(t) || t < fromMs || t > toMs) continue;
        if (!e.match) continue;
        const name = String(e.displayName || 'Watchlist').slice(0, 80);
        const score = e.scorePct != null ? Math.round(Number(e.scorePct)) : null;
        const note = score != null
            ? ('FR · ' + name + ' · ' + score + '%')
            : ('FR · ' + name);
        const key = e.hitId || e.id || (e.cropFile + ':' + e.at);
        await upsertMarker({
            id: stableId('ai-fr-', 'fr:' + key),
            camId,
            occurredAt: e.at,
            eventType: 'analytics',
            note: note.slice(0, 500),
        });
        n += 1;
    }
    return n;
}

/**
 * Live hit writers — called from poller onHit so Investigation sees the pin without re-index race.
 */
async function logLiveFrHit(hit) {
    if (!hit || !hit.camId || !siteDb.isReady()) return;
    const name = String(hit.displayName || 'Watchlist').slice(0, 80);
    const score = hit.scorePct != null ? Math.round(Number(hit.scorePct)) : null;
    const note = score != null
        ? ('FR · ' + name + ' · ' + score + '%')
        : ('FR · ' + name);
    const key = hit.hitId || (hit.blacklistId + ':' + hit.at + ':' + hit.camId);
    try {
        await upsertMarker({
            id: stableId('ai-fr-', 'fr:' + key),
            camId: String(hit.camId),
            occurredAt: hit.at || new Date().toISOString(),
            eventType: 'analytics',
            note: note.slice(0, 500),
        });
    } catch (err) {
        log.web.warn('[vms-ai-alarm-index] live FR marker failed', { error: err && err.message });
    }
}

async function logLiveAnprHit(hit) {
    if (!hit || !hit.camId || !siteDb.isReady()) return;
    const plate = String(hit.plate || hit.plateCompact || '').slice(0, 32);
    if (!plate) return;
    const key = hit.hitId || (plate + ':' + hit.at + ':' + hit.camId);
    try {
        await upsertMarker({
            id: stableId('ai-anpr-', 'anpr:' + key),
            camId: String(hit.camId),
            occurredAt: hit.at || new Date().toISOString(),
            eventType: 'anpr',
            note: ('ANPR · ' + plate).slice(0, 500),
        });
    } catch (err) {
        log.web.warn('[vms-ai-alarm-index] live ANPR marker failed', { error: err && err.message });
    }
}

async function logLiveWeaponHit(hit) {
    if (!hit || !hit.camId || !siteDb.isReady()) return;
    const cls = String(hit.cls || 'weapon').slice(0, 40);
    const key = hit.hitId || (cls + ':' + hit.at + ':' + hit.camId);
    const atIso = Number.isFinite(Number(hit.at))
        ? new Date(Number(hit.at)).toISOString()
        : (hit.at || new Date().toISOString());
    try {
        await upsertMarker({
            id: stableId('ai-wd-', 'wd:' + key),
            camId: String(hit.camId),
            occurredAt: atIso,
            eventType: 'analytics',
            note: ('Weapon · ' + cls).slice(0, 500),
        });
    } catch (err) {
        log.web.warn('[vms-ai-alarm-index] live Weapon marker failed', { error: err && err.message });
    }
}

async function indexAnpr(camId, fromIso, toIso) {
    const { rows } = await siteDb.query(
        `SELECT id, captured_at, cam_id, bwc_id, plate, plate_compact, confidence
         FROM anpr_capture_history
         WHERE unclear = FALSE
           AND plate_compact IS NOT NULL AND plate_compact <> ''
           AND captured_at >= $1 AND captured_at <= $2
           AND (cam_id = $3 OR bwc_id = $3)
         ORDER BY captured_at ASC
         LIMIT $4`,
        [fromIso, toIso, camId, MAX_ANPR * 3]
    );
    const kept = [];
    const lastByPlate = new Map();
    for (const r of rows || []) {
        const plate = String(r.plate_compact || r.plate || '').trim();
        if (!plate) continue;
        const t = Date.parse(r.captured_at);
        if (!Number.isFinite(t)) continue;
        const prev = lastByPlate.get(plate);
        if (prev != null && (t - prev) < ANPR_BUCKET_MS) continue;
        lastByPlate.set(plate, t);
        kept.push(r);
        if (kept.length >= MAX_ANPR) break;
    }
    let n = 0;
    for (const r of kept) {
        const plate = String(r.plate || r.plate_compact || '').slice(0, 32);
        await upsertMarker({
            id: stableId('ai-anpr-', 'anpr:' + r.id),
            camId,
            occurredAt: r.captured_at,
            eventType: 'anpr',
            note: ('ANPR · ' + plate).slice(0, 500),
        });
        n += 1;
    }
    return n;
}

async function indexWeapon(camId, fromIso, toIso) {
    let opsCaseStore;
    try {
        opsCaseStore = require('./opsCaseStore');
    } catch (_) {
        return 0;
    }
    if (!opsCaseStore || typeof opsCaseStore.listCases !== 'function') return 0;
    const fromMs = Date.parse(fromIso);
    const toMs = Date.parse(toIso);
    if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) return 0;
    const days = Math.max(1, Math.min(90, Math.ceil((toMs - fromMs) / 86400000) + 2));
    let cases = [];
    try {
        cases = opsCaseStore.listCases({
            type: 'WEAPON',
            days,
            limit: 120,
            archive: 'all',
        }) || [];
    } catch (_) {
        return 0;
    }
    let n = 0;
    for (const c of cases) {
        if (n >= MAX_WEAPON) break;
        const cam = String(c.cameraId || (c.refs && c.refs.camId) || '').trim();
        if (!cam || cam !== camId) continue;
        const at = c.createdAt || c.closedAt || c.day;
        const atMs = Date.parse(at);
        if (!Number.isFinite(atMs) || atMs < fromMs || atMs > toMs) continue;
        const hitId = (c.refs && (c.refs.weaponHitId || c.refs.hitId)) || c.caseId;
        const cls = (c.refs && c.refs.cls) || 'weapon';
        await upsertMarker({
            id: stableId('ai-wd-', 'wd:' + String(hitId)),
            camId,
            occurredAt: new Date(atMs).toISOString(),
            eventType: 'analytics',
            note: ('Weapon · ' + String(cls)).slice(0, 500),
        });
        n += 1;
    }
    return n;
}

const MAX_SOS = 80;

function sosOccurredIso(entry) {
    if (!entry) return null;
    const candidates = [entry.alarmTime, entry.at, entry.ackAt, entry.createdAt];
    for (let i = 0; i < candidates.length; i++) {
        const t = Date.parse(candidates[i]);
        if (Number.isFinite(t)) return new Date(t).toISOString();
    }
    return null;
}

async function indexSos(camId, fromIso, toIso) {
    let sosIncidents;
    try {
        sosIncidents = require('./sosIncidents');
    } catch (_) {
        return 0;
    }
    if (!sosIncidents || typeof sosIncidents.getLedgerEntries !== 'function') return 0;
    const fromMs = Date.parse(fromIso);
    const toMs = Date.parse(toIso);
    if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) return 0;
    let entries = [];
    try {
        entries = sosIncidents.getLedgerEntries() || [];
    } catch (_) {
        return 0;
    }
    let n = 0;
    for (const e of entries) {
        if (n >= MAX_SOS) break;
        if (!e || e.kind === 'ack') continue;
        const cam = String(e.cameraId || e.deviceId || e.bwcId || '').trim();
        if (!cam || cam !== camId) continue;
        const occurredAt = sosOccurredIso(e);
        if (!occurredAt) continue;
        const atMs = Date.parse(occurredAt);
        if (!Number.isFinite(atMs) || atMs < fromMs || atMs > toMs) continue;
        const kind = e.alarmKind === 'fall' ? 'Fall' : 'SOS';
        const op = e.operatorName ? String(e.operatorName).trim().slice(0, 40) : '';
        const note = op ? (kind + ' · ' + op) : kind;
        await upsertMarker({
            id: stableId('sos-', 'sos:' + String(e.id || occurredAt + ':' + cam)),
            camId,
            occurredAt,
            eventType: 'sos',
            note: note.slice(0, 500),
        });
        n += 1;
    }
    return n;
}

async function logLiveSosAlarm(entry) {
    if (!entry || !siteDb.isReady()) return;
    const camId = String(entry.cameraId || entry.deviceId || entry.bwcId || '').trim();
    if (!camId) return;
    const occurredAt = sosOccurredIso(entry);
    if (!occurredAt) return;
    const kind = entry.alarmKind === 'fall' ? 'Fall' : 'SOS';
    const op = entry.operatorName ? String(entry.operatorName).trim().slice(0, 40) : '';
    const note = op ? (kind + ' · ' + op) : kind;
    try {
        await upsertMarker({
            id: stableId('sos-', 'sos:' + String(entry.id || occurredAt + ':' + camId)),
            camId,
            occurredAt,
            eventType: 'sos',
            note: note.slice(0, 500),
        });
    } catch (err) {
        log.web.warn('[vms-ai-alarm-index] live SOS marker failed', { error: err && err.message });
    }
}

/**
 * @returns {{ ok: boolean, fr?: number, anpr?: number, weapon?: number, sos?: number, skipped?: string }}
 */
async function indexForCamWindow(camId, fromIso, toIso, opts) {
    opts = opts || {};
    const id = String(camId || '').trim();
    if (!id || !fromIso || !toIso || !siteDb.isReady()) {
        return { ok: true, skipped: 'noop' };
    }
    const key = windowKey(id, fromIso, toIso);
    const now = Date.now();
    if (!opts.force && (now - (lastIndexAt.get(key) || 0)) < INDEX_COOLDOWN_MS) {
        return { ok: true, skipped: 'cooldown' };
    }
    lastIndexAt.set(key, now);

    let fr = 0;
    let anpr = 0;
    let weapon = 0;
    let sos = 0;
    try {
        fr = await indexFr(id, fromIso, toIso);
        if (fr < 1) fr = await indexFrLedger(id, fromIso, toIso);
    } catch (err) {
        log.web.warn('[vms-ai-alarm-index] FR failed', { camId: id, error: err && err.message });
    }
    try {
        anpr = await indexAnpr(id, fromIso, toIso);
    } catch (err) {
        log.web.warn('[vms-ai-alarm-index] ANPR failed', { camId: id, error: err && err.message });
    }
    try {
        weapon = await indexWeapon(id, fromIso, toIso);
    } catch (err) {
        log.web.warn('[vms-ai-alarm-index] Weapon failed', { camId: id, error: err && err.message });
    }
    try {
        sos = await indexSos(id, fromIso, toIso);
    } catch (err) {
        log.web.warn('[vms-ai-alarm-index] SOS failed', { camId: id, error: err && err.message });
    }
    return { ok: true, fr, anpr, weapon, sos };
}

module.exports = {
    indexForCamWindow,
    logLiveFrHit,
    logLiveAnprHit,
    logLiveWeaponHit,
    logLiveSosAlarm,
    MAX_TIMELINE_ALARMS: 180,
};
