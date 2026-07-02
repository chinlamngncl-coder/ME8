/**
 * SOS incidents — ledger for dashboard + human-readable folders on disk.
 * storage/sos-incidents/YYYY-MM-DD/HH-MM-SS_operator_deviceId/incident.html
 */

const fs = require('fs');
const path = require('path');

let baseDir = null;
let ledgerPath = null;
let activePath = null;

function init(storageDir) {
    baseDir = path.join(storageDir, 'sos-incidents');
    ledgerPath = path.join(baseDir, 'ledger.json');
    activePath = path.join(baseDir, 'active-alarm.json');
    if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
    if (!fs.existsSync(ledgerPath)) {
        fs.writeFileSync(ledgerPath, JSON.stringify({ entries: [] }, null, 2), 'utf8');
    }
    migrateLegacyEntries();
}

function readStore() {
    try {
        const raw = fs.readFileSync(ledgerPath, 'utf8');
        const data = JSON.parse(raw);
        if (data && Array.isArray(data.entries)) return data;
    } catch (_) { /* empty */ }
    return { entries: [] };
}

function atomicWriteJson(filePath, data) {
    const tmp = filePath + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, filePath);
}

function writeStore(data) {
    atomicWriteJson(ledgerPath, data);
}

function readActiveAlarm() {
    try {
        if (!fs.existsSync(activePath)) return null;
        return JSON.parse(fs.readFileSync(activePath, 'utf8'));
    } catch (_) {
        return null;
    }
}

function writeActiveAlarm(entry) {
    atomicWriteJson(activePath, entry);
}

function clearActiveAlarm() {
    try {
        if (fs.existsSync(activePath)) fs.unlinkSync(activePath);
    } catch (_) { /* ignore */ }
}

function isImageFile(name) {
    return /\.(jpe?g|png|gif|webp|bmp)$/i.test(name || '');
}

function safeFolderPart(s) {
    return String(s || 'unknown')
        .replace(/[<>:"/\\|?*]/g, '-')
        .replace(/\s+/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 48);
}

function formatLocalDateTime(iso) {
    const d = iso ? new Date(iso) : new Date();
    if (Number.isNaN(d.getTime())) return { date: 'unknown', time: 'unknown', display: 'Unknown' };
    const date = d.toISOString().slice(0, 10);
    const time = d.toTimeString().slice(0, 8);
    return {
        date,
        time,
        display: d.toLocaleString(),
    };
}

function folderRelForEntry(entry) {
    const at = entry.at ? new Date(entry.at) : new Date();
    const datePart = Number.isNaN(at.getTime()) ? 'unknown-date' : at.toISOString().slice(0, 10);
    const timePart = Number.isNaN(at.getTime())
        ? 'unknown-time'
        : at.toISOString().slice(11, 19).replace(/:/g, '-');
    const parts = [timePart];
    if (entry.operatorName) parts.push(safeFolderPart(entry.operatorName));
    parts.push(safeFolderPart(entry.cameraId || 'unknown'));
    let rel = `${datePart}/${parts.join('_')}`;
    let candidate = path.join(baseDir, rel);
    if (fs.existsSync(candidate) && entry.id) {
        const suffix = safeFolderPart(String(entry.id).slice(-8));
        rel = `${datePart}/${parts.join('_')}_${suffix}`;
    }
    return rel;
}

function incidentDirForEntry(entry) {
    const rel = entry.folderRel || folderRelForEntry(entry);
    return { abs: path.join(baseDir, rel), rel };
}

function snapshotPublicUrl(entry) {
    if (!entry.folderRel) return entry.snapshot || null;
    const snapPath = path.join(baseDir, entry.folderRel, 'snapshot.jpg');
    if (fs.existsSync(snapPath)) {
        return `/sos-media/${entry.folderRel.replace(/\\/g, '/')}/snapshot.jpg`;
    }
    return entry.snapshot || null;
}

function escHtml(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function serverRecordingPublicUrl(entry) {
    if (!entry || !entry.folderRel) return null;
    const localName = entry.serverRecordingLocalFile || 'server-recording.mp4';
    const snapPath = path.join(baseDir, entry.folderRel, localName);
    if (fs.existsSync(snapPath)) {
        return `/sos-media/${entry.folderRel.replace(/\\/g, '/')}/${localName}`;
    }
    return null;
}

function serverRecordingHtml(entry) {
    const localName = entry.serverRecordingLocalFile || 'server-recording.mp4';
    const localFile = path.join(baseDir, entry.folderRel || '', localName);
    const hasLocal = fs.existsSync(localFile);
    const evidenceId = entry.serverRecordingEvidenceId || null;
    if (!hasLocal && !evidenceId) {
        return '<h2>Server recording</h2><p class="muted">No server recording for this incident.</p>';
    }
    let html = '<h2>Server recording</h2>';
    if (hasLocal) {
        html += `<video controls preload="metadata" style="max-width:100%;border-radius:8px;border:1px solid #334155;background:#0f172a" src="${escHtml(localName)}"></video>`;
    }
    if (evidenceId) {
        const id = escHtml(evidenceId);
        html += `<p><a href="/api/evidence/preview/${id}" target="_blank" rel="noopener">Watch in Mobility dashboard</a></p>`;
        html += `<p class="muted">Evidence ID: <code>${id}</code> — use Evidence hub or super admin download.</p>`;
    }
    if (entry.serverRecordingFileName) {
        html += `<p class="muted">File: ${escHtml(entry.serverRecordingFileName)}</p>`;
    }
    return html;
}

function buildIncidentHtml(entry) {
    const when = formatLocalDateTime(entry.at);
    const status = entry.acknowledged ? 'Acknowledged' : 'Open';
    const note = entry.note ? escHtml(entry.note) : (entry.acknowledged ? '(No note entered)' : 'Not acknowledged yet.');
    const op = entry.operatorName ? escHtml(entry.operatorName) : '—';
    const cam = escHtml(entry.cameraId || '—');
    const alarmKind = entry.alarmKind === 'fall' ? 'Fall alert' : 'SOS';
    const alarmTime = escHtml(entry.alarmTime || when.display);
    const lat = entry.lat != null ? escHtml(entry.lat) : '—';
    const lon = entry.lon != null ? escHtml(entry.lon) : '—';
    const snapFile = path.join(baseDir, entry.folderRel || '', 'snapshot.jpg');
    const hasSnap = fs.existsSync(snapFile);
    const snapHtml = hasSnap
        ? '<h2>Snapshot</h2><img src="snapshot.jpg" alt="SOS snapshot" style="max-width:100%;border-radius:8px;border:1px solid #334155">'
        : '<p class="muted">No snapshot saved for this incident.</p>';
    const mapLink = (entry.lat != null && entry.lon != null)
        ? `<p><a href="https://www.google.com/maps?q=${encodeURIComponent(entry.lat)},${encodeURIComponent(entry.lon)}" target="_blank" rel="noopener">Open location in Google Maps</a></p>`
        : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${entry.alarmKind === 'fall' ? 'Fall' : 'SOS'} ${when.date} ${when.time} — ${cam}</title>
<style>
body{font-family:Segoe UI,system-ui,sans-serif;background:#0f172a;color:#e2e8f0;margin:0;padding:24px;line-height:1.5}
main{max-width:720px;margin:0 auto;background:#1e293b;border:1px solid #334155;border-radius:12px;padding:24px}
h1{margin:0 0 8px;font-size:1.35rem;color:#fca5a5}
h2{margin:24px 0 8px;font-size:1rem;color:#93c5fd}
.meta{color:#94a3b8;font-size:0.95rem;margin-bottom:20px}
table{width:100%;border-collapse:collapse;font-size:0.95rem}
td{padding:8px 0;border-bottom:1px solid #334155;vertical-align:top}
td:first-child{color:#94a3b8;width:140px}
.note{background:#0f172a;border-radius:8px;padding:12px;white-space:pre-wrap}
.muted{color:#64748b}
.status-open{color:#fca5a5;font-weight:600}
.status-ack{color:#86efac;font-weight:600}
a{color:#93c5fd}
</style>
</head>
<body>
<main>
<h1>${entry.alarmKind === 'fall' ? 'Fall alert report' : 'SOS incident report'}</h1>
<p class="meta">${escHtml(when.display)} · BWC ${cam}</p>
<table>
<tr><td>Status</td><td class="${entry.acknowledged ? 'status-ack' : 'status-open'}">${status}</td></tr>
<tr><td>Alarm type</td><td>${escHtml(alarmKind)}</td></tr>
<tr><td>Operator</td><td>${op}</td></tr>
<tr><td>BWC device ID</td><td>${cam}</td></tr>
<tr><td>Alarm time (device)</td><td>${alarmTime}</td></tr>
<tr><td>Recorded (server)</td><td>${escHtml(when.display)}</td></tr>
<tr><td>Latitude</td><td>${lat}</td></tr>
<tr><td>Longitude</td><td>${lon}</td></tr>
</table>
${mapLink}
<h2>Acknowledgement note</h2>
<div class="note">${note}</div>
${snapHtml}
${serverRecordingHtml(entry)}
</main>
</body>
</html>`;
}

function buildIncidentTxt(entry) {
    const when = formatLocalDateTime(entry.at);
    const lines = [
        entry.alarmKind === 'fall' ? 'FALL ALERT REPORT' : 'SOS INCIDENT REPORT',
        entry.alarmKind === 'fall' ? '===================' : '===================',
        '',
        `Alarm type: ${entry.alarmKind === 'fall' ? 'Fall alert' : 'SOS'}`,
        `Status: ${entry.acknowledged ? 'Acknowledged' : 'Open'}`,
        `Date: ${when.date}`,
        `Time: ${when.time}`,
        `Operator: ${entry.operatorName || '—'}`,
        `BWC device ID: ${entry.cameraId || '—'}`,
        `Alarm time (device): ${entry.alarmTime || when.display}`,
        `Latitude: ${entry.lat != null ? entry.lat : '—'}`,
        `Longitude: ${entry.lon != null ? entry.lon : '—'}`,
        '',
        'Acknowledgement note:',
        entry.note || (entry.acknowledged ? '(No note entered)' : 'Not acknowledged yet.'),
        '',
        'Double-click incident.html in this folder for a formatted view.',
        'Snapshot (if any): snapshot.jpg',
        entry.serverRecordingEvidenceId
            ? `Server recording evidence ID: ${entry.serverRecordingEvidenceId}`
            : 'Server recording: none',
        entry.serverRecordingLocalFile ? `Local copy: ${entry.serverRecordingLocalFile}` : '',
    ].filter(Boolean);
    return lines.join('\r\n') + '\r\n';
}

function writeIncidentFiles(entry) {
    if (!entry || entry.kind !== 'alarm') return entry;
    if (!entry.folderRel) entry.folderRel = folderRelForEntry(entry);
    const { abs: dir } = incidentDirForEntry(entry);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(path.join(dir, 'incident.html'), buildIncidentHtml(entry), 'utf8');
    fs.writeFileSync(path.join(dir, 'incident.txt'), buildIncidentTxt(entry), 'utf8');

    entry.snapshot = snapshotPublicUrl(entry);
    return entry;
}

function persistEntry(entry) {
    writeIncidentFiles(entry);
    return entry;
}

function migrateLegacyEntries() {
    const store = readStore();
    let changed = false;
    store.entries.forEach((entry) => {
        if (entry.kind !== 'alarm') return;
        if (!entry.folderRel) {
            entry.folderRel = folderRelForEntry(entry);
            changed = true;
        }
        const dir = incidentDirForEntry(entry).abs;
        const htmlPath = path.join(dir, 'incident.html');
        if (!fs.existsSync(htmlPath)) {
            writeIncidentFiles(entry);
            changed = true;
        }
        const legacySnap = entry.snapshot && String(entry.snapshot).includes('/snapshots/');
        if (legacySnap) {
            const legacyName = path.basename(entry.snapshot);
            const legacyPath = path.join(baseDir, 'snapshots', legacyName);
            if (fs.existsSync(legacyPath)) {
                fs.copyFileSync(legacyPath, path.join(dir, 'snapshot.jpg'));
                entry.snapshot = snapshotPublicUrl(entry);
                writeIncidentFiles(entry);
                changed = true;
            }
        }
    });
    if (changed) writeStore(store);
}

function findEntryById(id) {
    if (!id) return null;
    return readStore().entries.find((e) => e.id === id) || null;
}

function recordAlarm({ cameraId, alarmTime, lat, lon, operatorName, alarmKind }) {
    const id = `alarm-${Date.now()}`;
    const kindLabel = alarmKind === 'fall' ? 'fall' : 'sos';
    const entry = {
        id,
        kind: 'alarm',
        alarmKind: kindLabel,
        at: new Date().toISOString(),
        cameraId: cameraId || null,
        operatorName: operatorName ? String(operatorName).trim() : '',
        alarmTime: alarmTime || null,
        lat: lat != null ? lat : null,
        lon: lon != null ? lon : null,
        snapshot: null,
        note: null,
        acknowledged: false,
        folderRel: null,
    };
    entry.folderRel = folderRelForEntry(entry);
    persistEntry(entry);

    const store = readStore();
    store.entries.unshift(entry);
    if (store.entries.length > 500) store.entries.length = 500;
    writeStore(store);
    writeActiveAlarm(entry);
    return entry;
}

function recordAcknowledgement({ cameraId, alarmTime, note, incidentId }) {
    const store = readStore();
    let linked = null;
    if (incidentId) {
        linked = store.entries.find((e) => e.id === incidentId);
    }
    if (!linked) {
        linked = store.entries.find((e) => e.kind === 'alarm' && e.cameraId === cameraId && !e.acknowledged);
    }
    if (linked) {
        linked.acknowledged = true;
        linked.note = note || '';
        linked.ackAt = new Date().toISOString();
        persistEntry(linked);
    } else {
        const entry = {
            id: `ack-${Date.now()}`,
            kind: 'ack',
            at: new Date().toISOString(),
            cameraId: cameraId || null,
            operatorName: '',
            alarmTime: alarmTime || null,
            note: note || '',
            snapshot: null,
            acknowledged: true,
            ackAt: new Date().toISOString(),
            folderRel: null,
        };
        store.entries.unshift(entry);
        linked = entry;
    }
    writeStore(store);
    clearActiveAlarm();
    return linked;
}

function attachSnapshotFromFtp(fullPath, fileName, cameraId) {
    if (!fullPath || !fs.existsSync(fullPath) || !isImageFile(fileName)) return null;

    const store = readStore();
    const active = readActiveAlarm();
    let linked = null;

    if (active && active.cameraId === cameraId && Date.now() - new Date(active.at).getTime() < 300000) {
        linked = store.entries.find((e) => e.id === active.id);
    }
    if (!linked && cameraId) {
        linked = store.entries.find((e) => e.kind === 'alarm' && e.cameraId === cameraId && !e.acknowledged);
    }
    if (!linked) return null;

    if (!linked.folderRel) linked.folderRel = folderRelForEntry(linked);
    const dir = incidentDirForEntry(linked).abs;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const dest = path.join(dir, 'snapshot.jpg');
    fs.copyFileSync(fullPath, dest);
    linked.snapshot = snapshotPublicUrl(linked);
    writeIncidentFiles(linked);
    writeStore(store);

    return {
        snapshotUrl: linked.snapshot,
        cameraId,
        linkedAlarmId: linked.id,
        fileName: 'snapshot.jpg',
    };
}

function saveDashboardSnapshot(incidentId, imageBuffer) {
    const store = readStore();
    const entry = store.entries.find((e) => e.id === incidentId && e.kind === 'alarm');
    if (!entry || !imageBuffer || !imageBuffer.length) return null;
    if (!entry.folderRel) entry.folderRel = folderRelForEntry(entry);
    const dir = incidentDirForEntry(entry).abs;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'snapshot.jpg'), imageBuffer);
    entry.snapshot = snapshotPublicUrl(entry);
    writeIncidentFiles(entry);
    writeStore(store);
    return entry;
}

function clearDashboardList() {
    writeStore({ entries: [] });
    clearActiveAlarm();
    return { cleared: true };
}

function getIncidentFolderPath(incidentId) {
    const entry = findEntryById(incidentId);
    if (!entry || !entry.folderRel) return null;
    return incidentDirForEntry(entry).abs;
}

function getIncidentReportPath(incidentId) {
    const folder = getIncidentFolderPath(incidentId);
    if (!folder) return null;
    const html = path.join(folder, 'incident.html');
    return fs.existsSync(html) ? html : null;
}

const DEFAULT_DASHBOARD_DAYS = Math.max(1, parseInt(process.env.FM_SOS_LEDGER_DAYS || '7', 10) || 7);

function entriesWithinDays(entries, days) {
    const span = Math.max(1, days || DEFAULT_DASHBOARD_DAYS);
    const cutoff = Date.now() - span * 86400000;
    return (entries || []).filter((e) => {
        if (!e.at) return false;
        const t = new Date(e.at).getTime();
        return !Number.isNaN(t) && t >= cutoff;
    });
}

function escapeCsvCell(val) {
    const s = val == null ? '' : String(val);
    if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
}

function exportCsv(days) {
    const span = Math.max(1, days || DEFAULT_DASHBOARD_DAYS);
    const rows = entriesWithinDays(readStore().entries, span).filter((e) => e.kind === 'alarm');
    const header = ['Date', 'Time (UTC)', 'Type', 'Operator', 'Camera ID', 'Status', 'Alarm time', 'Note', 'Latitude', 'Longitude', 'Folder', 'Snapshot'];
    const lines = [header.join(',')];
    rows.forEach((e) => {
        const at = e.at ? new Date(e.at) : null;
        const date = at && !Number.isNaN(at.getTime()) ? at.toISOString().slice(0, 10) : '';
        const time = at && !Number.isNaN(at.getTime()) ? at.toISOString().slice(11, 19) : '';
        lines.push([
            date,
            time,
            e.alarmKind === 'fall' ? 'Fall' : 'SOS',
            e.operatorName || '',
            e.cameraId || '',
            e.acknowledged ? 'Acknowledged' : 'Open',
            e.alarmTime || '',
            (e.note || '').replace(/\r?\n/g, ' '),
            e.lat != null ? e.lat : '',
            e.lon != null ? e.lon : '',
            e.folderRel || '',
            snapshotPublicUrl(e) || '',
        ].map(escapeCsvCell).join(','));
    });
    return lines.join('\r\n') + '\r\n';
}

function attachServerRecording({ incidentId, cameraId, evidenceId, fileName, relativePath, sourceFullPath }) {
    if (!evidenceId) return null;
    const store = readStore();
    let linked = incidentId ? store.entries.find((e) => e.id === incidentId) : null;
    if (!linked && cameraId) {
        linked = store.entries.find((e) => e.kind === 'alarm' && e.cameraId === cameraId && !e.acknowledged);
    }
    if (!linked && incidentId) {
        linked = store.entries.find((e) => e.id === incidentId);
    }
    if (!linked || linked.kind !== 'alarm') return null;
    if (linked.serverRecordingEvidenceId === evidenceId) return linked;

    linked.serverRecordingEvidenceId = evidenceId;
    linked.serverRecordingFileName = fileName || null;
    linked.serverRecordingRelativePath = relativePath || null;
    linked.serverRecordingStoppedAt = new Date().toISOString();
    if (!linked.serverRecordingStartedAt) {
        linked.serverRecordingStartedAt = linked.at || linked.serverRecordingStoppedAt;
    }

    const copyName = 'server-recording.mp4';
    if (sourceFullPath && fs.existsSync(sourceFullPath)) {
        if (!linked.folderRel) linked.folderRel = folderRelForEntry(linked);
        const dir = incidentDirForEntry(linked).abs;
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const dest = path.join(dir, copyName);
        try {
            fs.copyFileSync(sourceFullPath, dest);
            linked.serverRecordingLocalFile = copyName;
        } catch (_) { /* keep evidence catalog link even if copy fails */ }
    }

    persistEntry(linked);
    writeStore(store);
    return linked;
}

function enrichEntry(e) {
    if (!e || e.kind !== 'alarm') return e;
    const copy = { ...e };
    copy.snapshot = snapshotPublicUrl(e);
    if (e.serverRecordingEvidenceId) {
        copy.serverRecordingPreviewUrl = '/api/evidence/preview/' + encodeURIComponent(e.serverRecordingEvidenceId);
    }
    copy.serverRecordingLocalUrl = serverRecordingPublicUrl(e);
    if (e.folderRel) {
        copy.reportUrl = '/sos-media/' + String(e.folderRel).replace(/\\/g, '/') + '/incident.html';
    } else {
        copy.reportUrl = null;
    }
    return copy;
}

function getDashboard(limit, days) {
    const windowDays = Math.max(1, days || DEFAULT_DASHBOARD_DAYS);
    const store = readStore();
    const inWindow = entriesWithinDays(store.entries, windowDays);
    const alarms = inWindow.filter((e) => e.kind === 'alarm').map(enrichEntry);
    const entries = alarms.slice(0, Math.min(limit || 30, 100));
    const counts = {};
    const now = new Date();
    for (let i = windowDays - 1; i >= 0; i -= 1) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        counts[key] = 0;
    }
    alarms.forEach((e) => {
        const key = (e.at || '').slice(0, 10);
        if (counts[key] != null) counts[key] += 1;
    });
    const chart = Object.keys(counts).sort().map((day) => ({
        day,
        label: new Date(day + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short' }),
        count: counts[day],
    }));
    return {
        entries,
        chart,
        folder: baseDir,
        windowDays,
        totalInWindow: alarms.length,
        ledgerTotal: store.entries.filter((e) => e.kind === 'alarm').length,
    };
}

function getSnapshotCameraId() {
    const active = readActiveAlarm();
    if (active && active.cameraId) return active.cameraId;
    const store = readStore();
    const open = store.entries.find((e) => e.kind === 'alarm' && !e.acknowledged);
    return open && open.cameraId ? open.cameraId : null;
}

function getOpenAlarms() {
    const store = readStore();
    const open = store.entries.filter((e) => e.kind === 'alarm' && !e.acknowledged && e.cameraId);
    const active = readActiveAlarm();
    if (active && !active.acknowledged && active.cameraId) {
        if (!open.some((e) => e.id === active.id)) open.push(active);
    }
    return open.sort((a, b) => new Date(a.at) - new Date(b.at));
}

function hasOpenAlarm(cameraId) {
    const active = readActiveAlarm();
    if (active && !active.acknowledged) {
        if (!cameraId || active.cameraId === cameraId) return true;
    }
    const store = readStore();
    return store.entries.some((e) => {
        if (e.kind !== 'alarm' || e.acknowledged) return false;
        return !cameraId || e.cameraId === cameraId;
    });
}

function getPublicEntry(id) {
    const e = findEntryById(id);
    return e ? enrichEntry(e) : null;
}

module.exports = {
    init,
    getBaseDir: () => baseDir,
    recordAlarm,
    recordAcknowledgement,
    attachSnapshotFromFtp,
    attachServerRecording,
    getSnapshotCameraId,
    getOpenAlarms,
    hasOpenAlarm,
    getDashboard,
    exportCsv,
    clearDashboardList,
    saveDashboardSnapshot,
    getIncidentFolderPath,
    getIncidentReportPath,
    findEntryById,
    getPublicEntry,
    DEFAULT_DASHBOARD_DAYS,
};
