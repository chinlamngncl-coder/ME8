/**
 * Human-readable labels, categories, and detail summaries for audit log actions.
 */

const ACTION_LABELS = {
    'auth.login': 'User login',
    'alarm.raise': 'Alarm raised',
    'sos.acknowledge': 'SOS acknowledged',
    'sos.ptt_team': 'SOS team call',
    'sos.group_call.start': 'SOS group call started',
    'sos.group_call.end': 'SOS group call ended',
    'dispatch.call_group.start': 'Call group started',
    'dispatch.call_group.end': 'Call group ended',
    'voice.call': 'Voice call started',
    'voice.call.end': 'Voice call ended',
    'voice.call.rx': 'Inbound voice (BWC)',
    'ptt.dispatch_group': 'PTT group joined',
    'ptt.dispatch_ungroup': 'PTT ungrouped',
    'bwc.registry.save': 'BWC list saved',
    'server.settings.save': 'Server settings saved',
    'docking.settings.save': 'Docking settings saved',
    'voice_alerts.settings.save': 'Voice alert settings saved',
    'evidence.settings.save': 'Evidence settings saved',
    'evidence.live_record_start': 'Live evidence recording started',
    'evidence.live_record_stop': 'Live evidence recording stopped',
    'user.create': 'User created',
    'user.update': 'User updated',
    'dispatch_groups.save': 'Map groups saved',
    'dispatch_groups.import': 'Map groups imported',
    'evidence.download_request': 'Evidence download requested',
    'evidence.download_stream': 'Evidence downloaded',
    'evidence.preview': 'Evidence previewed',
    'evidence.storage_missing_observed': 'Missing file observed in library',
    'evidence.meta_update': 'Evidence metadata updated',
    'evidence.archive': 'Evidence archived (off active library)',
    'evidence.restore': 'Evidence restored to active library',
    'evidence.attachment_add': 'Evidence attachment added',
    'evidence.trim_export': 'Evidence clip exported',
    'evidence.export_stream': 'Evidence export downloaded',
    'evidence.catalog.scan': 'Evidence catalog scanned',
    'evidence.ingest_admitted': 'Evidence admitted after security checks',
    'evidence.ingest_rejected': 'Evidence quarantined by security checks',
    'evidence.integrity_mismatch': 'Evidence integrity mismatch detected',
    'evidence.integrity_unverified': 'Evidence integrity could not be verified',
    'evidence.secure_export_request': 'Secure export requested',
    'evidence.secure_export_approve': 'Secure export approved',
    'evidence.secure_export_deny': 'Secure export denied',
    'evidence.secure_export_download': 'Secure export downloaded',
    'evidence.redact_start': 'Video redaction opened',
    'evidence.redact_save': 'Redacted copy saved',
    'evidence.redact_autoface': 'Auto face redaction scanned',
    'evidence.redact_note_draft': 'Redaction note saved',
    'evidence.redact_finalize': 'Redacted copy finalized',
    'evidence.redact_export_removed': 'Redacted draft removed',
    'evidence.redact_drafts_cleaned': 'Redacted drafts cleaned',
    'evidence.redact_finalized_removed': 'Finalized redacted copy removed',
    'evidence.redact_finalized_cleaned': 'Finalized redacted copies cleared',
    'analytics.fr_hold_cleared': 'Investigation hold cleared',
    'analytics.fr_hold_discarded': 'Investigation hold discarded',
    'dock.create': 'Dock station registered',
    'dock.update': 'Dock station updated',
    'dock.delete': 'Dock station removed',
    'device.remote_control': 'Remote device command',
    'device.kill_switch': 'BWC shut down / reboot',
    'device.kill_switch_denied': 'BWC shut down / reboot denied',
    'device.kill_switch_request': 'Kill switch approval requested',
    'device.kill_switch_request_cancelled': 'Kill switch request cancelled',
    'geofence.set': 'Geofence saved',
    'geofence.clear': 'Geofence cleared',
    'geofence.breach': 'Geofence breach detected',
    'geofence.enter': 'Geofence re-entered',
    'conference.start': 'Conference room started',
    'conference.end': 'Conference room ended',
    'conference.record.start': 'Conference recording started',
    'conference.record.stop': 'Conference recording stopped',
    'conference.bwc.ingress': 'BWC shared to conference',
    'conference.bwc.ingress.remove': 'BWC removed from conference',
    'lab_security.save': 'Identity & monitoring settings saved',
    'production_access.save': 'Reverse proxy (trust proxy) saved',
    'cloud_deployment.save': 'Cloud deployment settings saved',
    'audit.export': 'Audit trail exported',
    'operation.create': 'Operation created',
    'operation.update': 'Operation updated',
    'operation.activate': 'Operation activated',
    'operation.close': 'Operation closed',
    'overlay.create': 'Map overlay pin added',
    'overlay.update': 'Map overlay pin updated',
    'overlay.delete': 'Map overlay pin removed',
    'usb.maintenance.launch-tool': 'USB maintenance tool launched',
};

const CATEGORY_LABELS = {
    auth: 'Sign-in & access',
    alarm: 'Alarms',
    sos: 'SOS & distress',
    ptt: 'PTT & radio',
    voice: 'Voice calls',
    evidence: 'Evidence',
    dock: 'Docking',
    conference: 'Video conference',
    server: 'Server configuration',
    users: 'User administration',
    dispatch: 'Dispatch groups',
    bwc: 'BWC registry',
    device: 'Device control',
    geofence: 'Geofencing',
    lab: 'LAB & security',
    cloud: 'Cloud deployment',
    usb: 'USB maintenance',
    audit: 'Audit trail',
    operation: 'Operation overlays',
    other: 'Other',
};

function categoryForAction(action) {
    const key = String(action || '').trim();
    if (!key) return 'other';
    if (key.indexOf('dispatch_groups') === 0) return 'dispatch';
    if (key.indexOf('lab_security') === 0) return 'lab';
    if (key.indexOf('cloud_deployment') === 0) return 'cloud';
    if (key.indexOf('voice_alerts') === 0) return 'server';
    if (key.indexOf('usb.maintenance') === 0) return 'usb';
    if (key.indexOf('bwc.') === 0) return 'bwc';
    if (key.indexOf('geofence.') === 0) return 'geofence';
    const prefix = key.split('.')[0];
    const map = {
        auth: 'auth',
        alarm: 'alarm',
        sos: 'sos',
        ptt: 'ptt',
        voice: 'voice',
        evidence: 'evidence',
        dock: 'dock',
        conference: 'conference',
        server: 'server',
        user: 'users',
        users: 'users',
        device: 'device',
        geofence: 'geofence',
        audit: 'audit',
        operation: 'operation',
        overlay: 'operation',
    };
    return map[prefix] || 'other';
}

function formatCategory(category) {
    const c = String(category || '').trim();
    return CATEGORY_LABELS[c] || CATEGORY_LABELS.other;
}

function formatAction(action) {
    const key = String(action || '').trim();
    if (!key) return '';
    if (ACTION_LABELS[key]) return ACTION_LABELS[key];
    if (key.indexOf('usb.maintenance.') === 0) {
        const part = key.slice('usb.maintenance.'.length);
        return 'USB maintenance: ' + part.replace(/[._]/g, ' ');
    }
    return key
        .split(/[._]/)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

function looksLikeDeviceId(value) {
    const s = String(value || '').trim();
    return /^[0-9A-Fa-f]{10,32}$/.test(s);
}

function resolveTargetLabel(target, displayNameFn) {
    const t = String(target || '').trim();
    if (!t) return '';
    if (typeof displayNameFn === 'function' && looksLikeDeviceId(t)) {
        const name = displayNameFn(t);
        if (name && name !== t) return name + ' (' + t + ')';
    }
    return t;
}

/** mob-evidence-custody-redact-words-v1 — never dump JSON for redact custody rows. */
function formatEvidenceRedactSummary(action, detail) {
    if (!detail || typeof detail !== 'object') return '';
    const parts = [];
    const mode = String(detail.mode || '');
    if (detail.faceFollow || mode === 'face-follow' || action === 'evidence.redact_autoface') {
        parts.push('Auto face tracking');
    } else if (mode === 'static-regions' || mode === 'static') {
        parts.push('Manual marks');
    } else if (mode) {
        parts.push('Redact mode set');
    }
    const regionN = detail.regionCount != null ? Number(detail.regionCount)
        : (typeof detail.regions === 'number' ? detail.regions : null);
    if (Number.isFinite(regionN) && regionN >= 0) {
        parts.push(regionN === 1 ? '1 area' : (regionN + ' areas'));
    }
    if (detail.sampled != null && Number.isFinite(Number(detail.sampled))) {
        parts.push(Number(detail.sampled) + ' samples');
    }
    const preview = String(detail.preview || '');
    if (preview === 'tight-sample' || preview === 'tight') {
        parts.push('tight preview');
    } else if (preview) {
        parts.push('preview ready');
    }
    if (detail.exportId) parts.push('Export on file');
    if (detail.fileName) {
        const fn = String(detail.fileName);
        parts.push('File: ' + (fn.length <= 48 ? fn : fn.slice(0, 45) + '…'));
    }
    if (detail.reason) {
        const reason = String(detail.reason);
        parts.push('Reason: ' + (reason.length <= 80 ? reason : reason.slice(0, 77) + '…'));
    }
    if (detail.status === 'finalized' || action === 'evidence.redact_finalize') {
        if (parts.indexOf('Finalized') < 0 && action === 'evidence.redact_finalize') {
            /* label already says finalized — keep summary light */
        }
    }
    if (action === 'evidence.redact_export_removed' || action === 'evidence.redact_drafts_cleaned'
        || action === 'evidence.redact_finalized_removed' || action === 'evidence.redact_finalized_cleaned') {
        if (detail.count != null && Number.isFinite(Number(detail.count))) {
            parts.push(Number(detail.count) === 1 ? '1 copy' : (Number(detail.count) + ' copies'));
        }
        if (detail.status) parts.push('Was: ' + String(detail.status));
    }
    return parts.join(' · ');
}

function formatDetailSummary(action, detail) {
    if (!detail || typeof detail !== 'object') return '';
    if (String(action || '').indexOf('evidence.redact') === 0) {
        return formatEvidenceRedactSummary(action, detail);
    }
    const parts = [];
    if (detail.alarmKind) parts.push('Type: ' + String(detail.alarmKind).toUpperCase());
    if (detail.role) parts.push('Role: ' + detail.role);
    if (detail.roomId) parts.push('Room: ' + detail.roomId);
    if (detail.branchCode) parts.push('Branch: ' + detail.branchCode);
    if (detail.count != null) parts.push('Count: ' + detail.count);
    if (detail.rows != null) parts.push('Rows: ' + detail.rows);
    if (detail.mode) parts.push('Mode: ' + detail.mode);
    if (detail.radiusM != null) parts.push('Radius: ' + detail.radiusM + ' m');
    if (detail.vertexCount != null) parts.push('Vertices: ' + detail.vertexCount);
    if (detail.lat != null && detail.lon != null) {
        parts.push('GPS: ' + Number(detail.lat).toFixed(5) + ', ' + Number(detail.lon).toFixed(5));
    }
    if (detail.operatorName) parts.push('Officer: ' + detail.operatorName);
    if (detail.outcome) parts.push('Outcome: ' + detail.outcome);
    if (detail.reason) {
        const reason = String(detail.reason);
        parts.push('Reason: ' + (reason.length <= 80 ? reason : reason.slice(0, 77) + '…'));
    }
    if (detail.incidentId) parts.push('Incident: ' + detail.incidentId);
    if (detail.fileName) parts.push('File: ' + detail.fileName);
    if (detail.relativePath) {
        const rp = String(detail.relativePath);
        parts.push('Path: ' + (rp.length <= 60 ? rp : '…' + rp.slice(-57)));
    }
    if (detail.indexed != null) parts.push('Indexed: ' + detail.indexed);
    if (detail.repaired != null) parts.push('Repaired: ' + detail.repaired);
    if (detail.missing != null) parts.push('Missing: ' + detail.missing);
    if (detail.requester) parts.push('Requester: ' + detail.requester);
    if (detail.approver) parts.push('Approver: ' + detail.approver);
    if (detail.requestId) parts.push('Request: ' + detail.requestId);
    if (detail.recordCmd) parts.push('Command: ' + detail.recordCmd);
    else if (detail.command) parts.push('Command: ' + detail.command);
    if (detail.source) parts.push('Source: ' + detail.source);
    if (detail.alarmMethod != null) parts.push('Alarm method: ' + detail.alarmMethod);
    if (detail.alarmType != null) parts.push('Alarm type: ' + detail.alarmType);
    if (detail.format) parts.push('Format: ' + detail.format);
    if (detail.limit != null) parts.push('Limit: ' + detail.limit);
    if (detail.filters && typeof detail.filters === 'object') {
        const f = detail.filters;
        const ff = [];
        if (f.since) ff.push('from ' + f.since);
        if (f.until) ff.push('to ' + f.until);
        if (f.category) ff.push('category ' + f.category);
        if (f.actor) ff.push('user ' + f.actor);
        if (f.q) ff.push('search "' + f.q + '"');
        if (ff.length) parts.push('Filters: ' + ff.join(', '));
    }
    if (!parts.length) {
        try {
            const raw = JSON.stringify(detail);
            if (raw.length <= 120) return raw;
            return raw.slice(0, 117) + '…';
        } catch (_) {
            return '';
        }
    }
    return parts.join(' · ');
}

function listCategories() {
    return Object.keys(CATEGORY_LABELS).map(function (id) {
        return { id: id, label: CATEGORY_LABELS[id] };
    });
}

module.exports = {
    ACTION_LABELS,
    CATEGORY_LABELS,
    categoryForAction,
    formatCategory,
    formatAction,
    resolveTargetLabel,
    looksLikeDeviceId,
    formatDetailSummary,
    listCategories,
};
