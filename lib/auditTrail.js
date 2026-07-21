/**
 * Audit trail — query, format, and CSV export for compliance UI.
 */
const siteDb = require('./siteDb');
const auditActionLabels = require('./auditActionLabels');

const EXPORT_MAX = 10000;

const KILL_SWITCH_ACTIONS = Object.freeze([
    'device.kill_switch',
    'device.kill_switch_denied',
    'device.kill_switch_request',
    'device.kill_switch_request_cancelled',
]);

const GEOFENCE_ACTIONS = Object.freeze([
    'geofence.set',
    'geofence.clear',
    'geofence.breach',
    'geofence.enter',
]);

const REPORT_PRESETS = Object.freeze({
    kill_switch: {
        id: 'kill_switch',
        labelKey: 'auditTrail.presetKillSwitch',
        actions: KILL_SWITCH_ACTIONS,
        defaultDays: 30,
    },
    geofence: {
        id: 'geofence',
        labelKey: 'auditTrail.presetGeofence',
        actions: GEOFENCE_ACTIONS,
        defaultDays: 30,
    },
});

function isoDateDaysAgo(days) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - Math.max(0, parseInt(days, 10) || 0));
    return d.toISOString().slice(0, 10);
}

function resolvePresetOpts(opts) {
    opts = opts || {};
    const presetId = opts.preset ? String(opts.preset).trim() : '';
    const preset = REPORT_PRESETS[presetId];
    if (!preset) return opts;
    const out = Object.assign({}, opts, {
        actions: preset.actions.slice(),
        action: '',
        category: '',
    });
    if (!out.since && preset.defaultDays) {
        out.since = isoDateDaysAgo(preset.defaultDays);
    }
    return out;
}

function parseRowDetail(row) {
    if (!row || !row.detail_json) return null;
    try {
        return JSON.parse(row.detail_json);
    } catch (_) {
        return null;
    }
}

function formatEntry(row, displayNameFn) {
    const detail = parseRowDetail(row);
    const action = row.action || '';
    return {
        id: row.id,
        ts: row.ts,
        actor: row.actor || '',
        role: row.role || '',
        action,
        actionLabel: auditActionLabels.formatAction(action),
        category: auditActionLabels.categoryForAction(action),
        categoryLabel: auditActionLabels.formatCategory(auditActionLabels.categoryForAction(action)),
        target: row.target || '',
        targetLabel: auditActionLabels.resolveTargetLabel(row.target, displayNameFn),
        detail,
        detailSummary: auditActionLabels.formatDetailSummary(action, detail),
        clientIp: row.client_ip || '',
    };
}

function normalizeQueryOpts(opts) {
    opts = opts || {};
    const limit = Math.min(Math.max(parseInt(opts.limit, 10) || 50, 1), 500);
    const offset = Math.max(parseInt(opts.offset, 10) || 0, 0);
    const out = { limit, offset };
    if (opts.since) out.since = String(opts.since).trim();
    if (opts.until) {
        let until = String(opts.until).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(until)) until += 'T23:59:59.999Z';
        out.until = until;
    }
    if (opts.actor) out.actor = String(opts.actor).trim();
    if (opts.action) out.action = String(opts.action).trim();
    if (opts.category) out.category = String(opts.category).trim();
    if (opts.q) out.q = String(opts.q).trim();
    if (opts.preset) out.preset = String(opts.preset).trim();
    if (opts.actions) {
        out.actions = Array.isArray(opts.actions)
            ? opts.actions.map(function (a) { return String(a || '').trim(); }).filter(Boolean)
            : String(opts.actions).split(',').map(function (a) { return a.trim(); }).filter(Boolean);
    }
    return resolvePresetOpts(out);
}

async function list(opts, displayNameFn) {
    const q = normalizeQueryOpts(opts);
    const result = await siteDb.queryAudit(q);
    return {
        entries: (result.rows || []).map(function (row) {
            return formatEntry(row, displayNameFn);
        }),
        total: result.total || 0,
        limit: q.limit,
        offset: q.offset,
        storeTotal: siteDb.countAudit ? await siteDb.countAudit() : result.total,
    };
}

async function listMeta() {
    const actions = siteDb.listDistinctAuditActions ? await siteDb.listDistinctAuditActions() : [];
    return {
        categories: auditActionLabels.listCategories(),
        actions: actions.map(function (action) {
            return {
                action,
                label: auditActionLabels.formatAction(action),
                category: auditActionLabels.categoryForAction(action),
            };
        }),
        presets: Object.keys(REPORT_PRESETS).map(function (id) {
            const p = REPORT_PRESETS[id];
            return { id: p.id, labelKey: p.labelKey, defaultDays: p.defaultDays || null };
        }),
        storeTotal: siteDb.countAudit ? await siteDb.countAudit() : 0,
    };
}

function csvEscape(val) {
    const s = val == null ? '' : String(val);
    if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
}

async function exportCsv(opts, displayNameFn) {
    const q = normalizeQueryOpts(Object.assign({}, opts, {
        limit: Math.min(Math.max(parseInt(opts && opts.limit, 10) || EXPORT_MAX, 1), EXPORT_MAX),
        offset: 0,
    }));
    const result = await siteDb.queryAudit(q);
    const rows = (result.rows || []).map(function (row) {
        return formatEntry(row, displayNameFn);
    });
    const header = ['ID', 'Time (UTC)', 'User', 'Role', 'Category', 'Action', 'Target', 'Details', 'Client IP'];
    const lines = [header.map(csvEscape).join(',')];
    rows.forEach(function (e) {
        lines.push([
            e.id,
            e.ts,
            e.actor,
            e.role,
            e.categoryLabel,
            e.actionLabel,
            e.targetLabel || e.target,
            e.detailSummary,
            e.clientIp,
        ].map(csvEscape).join(','));
    });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const baseName = q.preset === 'kill_switch'
        ? 'mobility-kill-switch-audit-'
        : q.preset === 'geofence'
            ? 'mobility-geofence-audit-'
            : 'mobility-audit-trail-';
    return {
        csv: '\uFEFF' + lines.join('\r\n') + '\r\n',
        filename: baseName + stamp + '.csv',
        rowCount: rows.length,
        totalMatched: result.total || rows.length,
    };
}

module.exports = {
    EXPORT_MAX,
    KILL_SWITCH_ACTIONS,
    GEOFENCE_ACTIONS,
    REPORT_PRESETS,
    list,
    listMeta,
    exportCsv,
    formatEntry,
    isoDateDaysAgo,
};
