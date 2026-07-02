/**
 * Command centre summary — fleet status, SOS trends, storage, activity rollup.
 */

const fs = require('fs');
const path = require('path');
const auditActionLabels = require('./auditActionLabels');

const PERIOD_DAYS = {
    daily: 1,
    weekly: 7,
    monthly: 30,
    yearly: 365,
};

const STORAGE_AREA_LABELS = {
    storage: 'Storage',
    ftp: 'FTP',
    sosIncidents: 'SOS Incident',
    fleetLog: 'Mobility Log',
    facePlate: 'Face / Plate',
    'sos-incidents': 'SOS Incident',
    'face-plate': 'Face / Plate',
};

function storageAreaLabel(key) {
    const k = String(key || '').trim();
    if (STORAGE_AREA_LABELS[k]) return STORAGE_AREA_LABELS[k];
    return k
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/[-_]+/g, ' ')
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => {
            const lower = w.toLowerCase();
            if (lower === 'sos') return 'SOS';
            if (lower === 'ftp') return 'FTP';
            if (lower === 'sd') return 'SD';
            if (w.toUpperCase() === w && w.length <= 4) return w.toUpperCase();
            return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
        })
        .join(' ');
}

function dirSizeBytes(root) {
    if (!root || !fs.existsSync(root)) return 0;
    let total = 0;
    const stack = [root];
    while (stack.length) {
        const cur = stack.pop();
        let entries;
        try {
            entries = fs.readdirSync(cur, { withFileTypes: true });
        } catch (_) {
            continue;
        }
        entries.forEach((ent) => {
            const p = path.join(cur, ent.name);
            try {
                if (ent.isDirectory()) stack.push(p);
                else if (ent.isFile()) total += fs.statSync(p).size;
            } catch (_) { /* ignore */ }
        });
    }
    return total;
}

function formatBytes(n) {
    const b = Number(n) || 0;
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    if (b < 1073741824) return (b / 1048576).toFixed(1) + ' MB';
    return (b / 1073741824).toFixed(2) + ' GB';
}

/** Whole-number percent, rounded up (min 1 when part > 0). */
function ceilPct(part, total) {
    const p = Number(part) || 0;
    const t = Number(total) || 0;
    if (!t || !p) return 0;
    return Math.min(100, Math.ceil((p / t) * 100));
}

function sosEntriesInRange(entries, fromMs, toMs) {
    return (entries || []).filter((e) => {
        if (!e || e.kind !== 'alarm' || !e.at) return false;
        const t = new Date(e.at).getTime();
        return !Number.isNaN(t) && t >= fromMs && t <= toMs;
    });
}

function bucketTrend(entries, period, nowMs) {
    nowMs = nowMs || Date.now();
    const days = PERIOD_DAYS[period] || PERIOD_DAYS.weekly;
    const fromMs = nowMs - days * 86400000;
    const inRange = sosEntriesInRange(entries, fromMs, nowMs);
    const buckets = [];

    if (period === 'daily') {
        for (let h = 23; h >= 0; h -= 1) {
            const start = nowMs - (h + 1) * 3600000;
            const end = nowMs - h * 3600000;
            const label = new Date(end).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
            const count = inRange.filter((e) => {
                const t = new Date(e.at).getTime();
                return t >= start && t < end;
            }).length;
            buckets.push({ key: label, label, count, open: 0, ack: 0 });
        }
        inRange.forEach((e) => {
            const t = new Date(e.at).getTime();
            const idx = Math.min(23, Math.max(0, Math.floor((nowMs - t) / 3600000)));
            const b = buckets[23 - idx];
            if (!b) return;
            if (e.acknowledged) b.ack += 1;
            else b.open += 1;
        });
        return { period, from: new Date(fromMs).toISOString(), to: new Date(nowMs).toISOString(), buckets, total: inRange.length };
    }

    for (let i = days - 1; i >= 0; i -= 1) {
        const d = new Date(nowMs);
        d.setHours(12, 0, 0, 0);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
        buckets.push({ key, label, count: 0, open: 0, ack: 0, fall: 0, sos: 0 });
    }
    const bucketMap = {};
    buckets.forEach((b) => { bucketMap[b.key] = b; });

    inRange.forEach((e) => {
        const key = String(e.at).slice(0, 10);
        const b = bucketMap[key];
        if (!b) return;
        b.count += 1;
        if (e.acknowledged) b.ack += 1;
        else b.open += 1;
        if (e.alarmKind === 'fall') b.fall += 1;
        else b.sos += 1;
    });

    return { period, from: new Date(fromMs).toISOString(), to: new Date(nowMs).toISOString(), buckets, total: inRange.length };
}

function listYearMonths(nowMs, count) {
    const months = [];
    const d = new Date(nowMs || Date.now());
    d.setDate(1);
    d.setHours(12, 0, 0, 0);
    const n = count || 12;
    for (let i = 0; i < n; i += 1) {
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        months.unshift(y + '-' + String(m).padStart(2, '0'));
        d.setMonth(d.getMonth() - 1);
    }
    return months;
}

function monthLabel(yearMonth) {
    const parts = String(yearMonth || '').split('-');
    if (parts.length < 2) return yearMonth;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (!y || !m) return yearMonth;
    return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function bucketTrendYearMonth(entries, yearMonth) {
    const parts = String(yearMonth || '').split('-');
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (!y || !m) return { period: 'yearly', yearMonth, buckets: [], total: 0 };
    const daysInMonth = new Date(y, m, 0).getDate();
    const fromMs = new Date(y, m - 1, 1, 0, 0, 0, 0).getTime();
    const toMs = new Date(y, m, 0, 23, 59, 59, 999).getTime();
    const inRange = sosEntriesInRange(entries, fromMs, toMs);
    const buckets = [];
    for (let d = 1; d <= daysInMonth; d += 1) {
        const key = yearMonth + '-' + String(d).padStart(2, '0');
        buckets.push({ key, label: String(d), count: 0, open: 0, ack: 0, fall: 0, sos: 0 });
    }
    const bucketMap = {};
    buckets.forEach((b) => { bucketMap[b.key] = b; });
    inRange.forEach((e) => {
        const key = String(e.at).slice(0, 10);
        const b = bucketMap[key];
        if (!b) return;
        b.count += 1;
        if (e.acknowledged) b.ack += 1;
        else b.open += 1;
        if (e.alarmKind === 'fall') b.fall += 1;
        else b.sos += 1;
    });
    return {
        period: 'yearly',
        yearMonth,
        monthLabel: monthLabel(yearMonth),
        from: new Date(fromMs).toISOString(),
        to: new Date(toMs).toISOString(),
        buckets,
        total: inRange.length,
    };
}

function buildYearlyTrends(entries, nowMs) {
    const months = listYearMonths(nowMs, 12);
    const byMonth = {};
    months.forEach((ym) => {
        byMonth[ym] = bucketTrendYearMonth(entries, ym);
    });
    const defaultMonth = months[months.length - 1] || months[0];
    return {
        months,
        defaultMonth,
        byMonth,
        current: defaultMonth ? byMonth[defaultMonth] : null,
    };
}

function buildSummary(deps) {
    const now = Date.now();
    const fleet = deps.getFleet ? deps.getFleet() : [];
    const online = fleet.filter((d) => d && d.online);
    const offline = fleet.filter((d) => d && !d.online);
    const store = deps.readSosStore ? deps.readSosStore() : { entries: [] };
    const entries = store.entries || [];
    const openAlarms = deps.getOpenAlarms ? deps.getOpenAlarms() : [];
    const audit = deps.getAuditEntries ? deps.getAuditEntries(40) : [];
    const displayName = typeof deps.displayName === 'function' ? deps.displayName : null;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayMs = todayStart.getTime();
    const weekMs = now - 7 * 86400000;
    const monthMs = now - 30 * 86400000;
    const yearMs = now - 365 * 86400000;

    const alarms = entries.filter((e) => e.kind === 'alarm');
    const countSince = (ms) => alarms.filter((e) => e.at && new Date(e.at).getTime() >= ms).length;
    const openCount = openAlarms.length;

    const storagePaths = deps.storagePaths || {};
    const storageBreakdown = {};
    Object.keys(storagePaths).forEach((k) => {
        const p = storagePaths[k];
        if (typeof p === 'string' && p) storageBreakdown[k] = dirSizeBytes(p);
    });
    const totalStorageBytes = Object.values(storageBreakdown).reduce((a, b) => a + b, 0);
    const deviceCapacity = Math.max(1, parseInt(deps.deviceCapacity, 10) || 5000);
    const storageCapGb = Math.max(1, parseInt(deps.storageReportCapGb, 10) || 500);
    const storageCapBytes = storageCapGb * 1073741824;
    const onlinePct = ceilPct(online.length, deviceCapacity);
    const storageUsedPct = totalStorageBytes > 0
        ? ceilPct(totalStorageBytes, storageCapBytes)
        : 50;

    return {
        ok: true,
        generatedAt: new Date().toISOString(),
        serverUptimeSec: deps.uptimeSec != null ? deps.uptimeSec : process.uptime(),
        fleet: {
            total: fleet.length,
            online: online.length,
            offline: offline.length,
            capacity: deviceCapacity,
            onlinePct,
            onlineIds: online.map((d) => d.id),
            offlineIds: offline.slice(0, 50).map((d) => d.id),
        },
        sos: {
            openNow: openCount,
            today: countSince(todayMs),
            week: countSince(weekMs),
            month: countSince(monthMs),
            year: countSince(yearMs),
            ledgerTotal: alarms.length,
        },
        storage: {
            totalBytes: totalStorageBytes,
            totalLabel: formatBytes(totalStorageBytes),
            capacityGb: storageCapGb,
            usedPct: storageUsedPct,
            isSample: totalStorageBytes === 0,
            breakdown: Object.keys(storageBreakdown).map((k) => ({
                key: k,
                area: storageAreaLabel(k),
                bytes: storageBreakdown[k],
                label: formatBytes(storageBreakdown[k]),
            })),
        },
        services: deps.serviceStatus || {},
        recentActivity: audit.slice(0, 25).map((e) => ({
            at: e.ts || e.at,
            action: e.action,
            actionLabel: auditActionLabels.formatAction(e.action),
            target: auditActionLabels.resolveTargetLabel(e.target, displayName),
            user: e.actor || e.username || '',
        })),
        trends: {
            daily: bucketTrend(entries, 'daily', now),
            weekly: bucketTrend(entries, 'weekly', now),
            monthly: bucketTrend(entries, 'monthly', now),
            yearly: buildYearlyTrends(entries, now),
        },
    };
}

function escapeCsvCell(val) {
    const s = val == null ? '' : String(val);
    if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
}

function trendForExport(summary, period, opts) {
    const trends = summary.trends || {};
    if (period !== 'yearly') return trends[period] || null;
    const yearly = trends.yearly;
    if (!yearly || !yearly.byMonth) return null;
    const month = opts && opts.month ? String(opts.month) : '';
    if (month && yearly.byMonth[month]) return yearly.byMonth[month];
    return yearly.current || null;
}

function appendTrendCsvLines(lines, trend, heading) {
    if (heading) lines.push(heading);
    if (!trend || !trend.buckets || !trend.buckets.length) {
        lines.push('No SOS events in this period');
        lines.push('');
        return;
    }
    lines.push('Day,SOS count,Open,Acknowledged,Fall,SOS');
    trend.buckets.forEach((b) => {
        lines.push([
            b.label,
            b.count,
            b.open || 0,
            b.ack || 0,
            b.fall || 0,
            b.sos || 0,
        ].map(escapeCsvCell).join(','));
    });
    lines.push('');
}

function exportReportCsv(summary, period, opts) {
    period = period || 'weekly';
    opts = opts || {};
    const lines = [];
    lines.push('Mobility Axiom Centre Summary Report');
    lines.push('Generated,' + escapeCsvCell(summary.generatedAt));
    lines.push('');
    lines.push('Mobility total,' + summary.fleet.total);
    lines.push('Online,' + summary.fleet.online);
    lines.push('Offline,' + summary.fleet.offline);
    lines.push('');
    lines.push('SOS open now,' + summary.sos.openNow);
    lines.push('SOS today,' + summary.sos.today);
    lines.push('SOS this week,' + summary.sos.week);
    lines.push('SOS this month,' + summary.sos.month);
    lines.push('SOS this year,' + summary.sos.year);
    lines.push('');
    lines.push('Storage total,' + escapeCsvCell(summary.storage.totalLabel));
    (summary.storage.breakdown || []).forEach((row) => {
        lines.push(escapeCsvCell(row.area || storageAreaLabel(row.key)) + ',' + escapeCsvCell(row.label));
    });
    lines.push('');
    lines.push('Trend period,' + period);
    if (period === 'yearly' && summary.trends && summary.trends.yearly && summary.trends.yearly.byMonth) {
        const yearly = summary.trends.yearly;
        const month = opts.month ? String(opts.month) : '';
        if (month && yearly.byMonth[month]) {
            appendTrendCsvLines(lines, yearly.byMonth[month], 'Month,' + escapeCsvCell(monthLabel(month)));
        } else {
            (yearly.months || Object.keys(yearly.byMonth)).forEach((ym) => {
                appendTrendCsvLines(lines, yearly.byMonth[ym], 'Month,' + escapeCsvCell(monthLabel(ym)));
            });
        }
    } else {
        const trend = trendForExport(summary, period, opts);
        if (trend && trend.buckets) {
            lines.push('Bucket,SOS count,Open,Acknowledged,Fall,SOS');
            trend.buckets.forEach((b) => {
                lines.push([
                    b.label,
                    b.count,
                    b.open || 0,
                    b.ack || 0,
                    b.fall || 0,
                    b.sos || 0,
                ].map(escapeCsvCell).join(','));
            });
            lines.push('');
        }
    }
    lines.push('Recent activity');
    lines.push('Time,Action,Name,User');
    (summary.recentActivity || []).forEach((a) => {
        lines.push([
            a.at,
            a.actionLabel || auditActionLabels.formatAction(a.action),
            a.target,
            a.user,
        ].map(escapeCsvCell).join(','));
    });
    return lines.join('\r\n') + '\r\n';
}

module.exports = {
    PERIOD_DAYS,
    buildSummary,
    bucketTrend,
    bucketTrendYearMonth,
    buildYearlyTrends,
    listYearMonths,
    monthLabel,
    exportReportCsv,
    formatBytes,
    dirSizeBytes,
    storageAreaLabel,
};
