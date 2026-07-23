/**
 * Site readiness checklist — Server Config deployment health (read-only).
 */
const storageStatus = require('./storageStatus');

function isIpv4(host) {
    const s = String(host || '').trim();
    if (!s || /[a-zA-Z]/.test(s)) return false;
    const m = s.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!m) return false;
    return m.slice(1).every(function (oct) {
        const n = parseInt(oct, 10);
        return n >= 0 && n <= 255;
    });
}

function deploymentMode(settings) {
    const mode = settings && settings.deployment && settings.deployment.mode;
    return mode === 'lan' || mode === 'cloud' || mode === 'hybrid' ? mode : 'lab';
}

function isRemoteMode(mode) {
    return mode === 'cloud' || mode === 'hybrid';
}

function looksLikeDirectHttpsPortal(operatorUrl) {
    const url = String(operatorUrl || '').trim();
    if (!/^https:\/\//i.test(url)) return false;
    let host = '';
    let port = null;
    try {
        const u = new URL(url);
        host = String(u.hostname || '').trim();
        if (u.port) port = parseInt(u.port, 10);
        else port = 443;
    } catch (_) {
        return true;
    }
    if (isIpv4(host) || host === 'localhost') return true;
    /* Non-443 listen (lab Node HTTPS :4438, etc.) = direct app, not nginx front door */
    if (port && port !== 443) return true;
    return false;
}

/**
 * Honest PASS/FAIL for trust proxy (REVERSE-PROXY-UI-POLISH-V1).
 * PASS proxy: https portal + trust ON
 * PASS direct: https (or lab) without front door + trust OFF
 * WARN: https company URL on :443 with trust OFF (likely need ON)
 */
function classifyTrustProxyReadiness(opts) {
    opts = opts || {};
    const mode = deploymentMode(opts.settings || { deployment: { mode: opts.mode } });
    const remote = isRemoteMode(mode);
    const operatorUrl = String(opts.operatorUrl != null
        ? opts.operatorUrl
        : ((opts.settings && opts.settings.deployment && opts.settings.deployment.operatorUrl) || '')).trim();
    const trustProxy = !!opts.trustProxy;
    const operatorHttps = /^https:\/\//i.test(operatorUrl);
    const operatorHttp = /^http:\/\//i.test(operatorUrl);

    if (trustProxy && operatorHttps) {
        return {
            status: 'ok',
            detailKey: 'server.readiness.production.passProxy',
            passKind: 'proxy',
        };
    }
    if (trustProxy && !operatorHttps) {
        return {
            status: 'warn',
            detailKey: 'server.readiness.production.trustOnWithoutHttps',
            passKind: null,
        };
    }
    /* trust OFF */
    if (remote && operatorHttp) {
        return {
            status: 'warn',
            detailKey: 'server.readiness.production.https',
            passKind: null,
        };
    }
    if (operatorHttps && looksLikeDirectHttpsPortal(operatorUrl)) {
        return {
            status: 'ok',
            detailKey: 'server.readiness.production.passDirect',
            passKind: 'direct',
        };
    }
    if (operatorHttps && !looksLikeDirectHttpsPortal(operatorUrl)) {
        return {
            status: 'warn',
            detailKey: 'server.readiness.production.needTrustBehindProxy',
            passKind: null,
        };
    }
    /* No https portal yet — direct path with trust OFF is fine */
    return {
        status: 'ok',
        detailKey: 'server.readiness.production.passDirectOff',
        passKind: 'direct',
    };
}

function countAssignedOperators(users) {
    const list = Array.isArray(users) ? users : [];
    return list.filter(function (u) {
        if (!u || u.active === false) return false;
        if (u.role !== 'operator') return false;
        const perms = u.permissions || {};
        if (perms.seeAllDispatchGroups) return false;
        return Array.isArray(u.assignedGroupIds) && u.assignedGroupIds.length > 0;
    }).length;
}

function buildReadiness(opts) {
    opts = opts || {};
    const settings = opts.settings || {};
    const mode = deploymentMode(settings);
    const remote = isRemoteMode(mode);
    const operatorUrl = String((settings.deployment && settings.deployment.operatorUrl) || '').trim();
    const operatorHttps = /^https:\/\//i.test(operatorUrl);
    const publicHost = String(settings.publicHost || '').trim();
    const trustProxy = !!opts.trustProxy;
    const license = opts.license || {};
    const groups = Array.isArray(opts.groups) ? opts.groups : [];
    const users = Array.isArray(opts.users) ? opts.users : [];
    const validation = opts.storageValidation || {};

    const items = [];

    let opStatus = 'ok';
    let opDetailKey = 'server.readiness.operatorUrl.ok';
    if (!operatorUrl) {
        opStatus = remote ? 'fail' : 'warn';
        opDetailKey = remote
            ? 'server.readiness.operatorUrl.missingRemote'
            : 'server.readiness.operatorUrl.missing';
    } else if (remote && !operatorHttps) {
        opStatus = 'warn';
        opDetailKey = 'server.readiness.operatorUrl.httpWarn';
    }
    items.push({
        id: 'operatorUrl',
        status: opStatus,
        labelKey: 'server.readiness.operatorUrl.label',
        detailKey: opDetailKey,
        link: { tab: 'server', section: 'ss-section-operator' },
    });

    let devStatus = isIpv4(publicHost) ? 'ok' : 'fail';
    let devDetailKey = isIpv4(publicHost)
        ? 'server.readiness.deviceIp.ok'
        : 'server.readiness.deviceIp.missing';
    items.push({
        id: 'deviceIp',
        status: devStatus,
        labelKey: 'server.readiness.deviceIp.label',
        detailKey: devDetailKey,
        link: { tab: 'server', section: 'ss-section-bwc-register' },
    });

    let licStatus = 'ok';
    let licDetailKey = 'server.readiness.license.ok';
    if (license.required) {
        if (!license.valid) {
            licStatus = 'fail';
            licDetailKey = license.filePresent
                ? 'server.readiness.license.invalid'
                : 'server.readiness.license.missing';
        } else {
            licDetailKey = 'server.readiness.license.valid';
        }
    } else if (!license.filePresent) {
        licDetailKey = 'server.readiness.license.optionalLab';
    }
    items.push({
        id: 'license',
        status: licStatus,
        labelKey: 'server.readiness.license.label',
        detailKey: licDetailKey,
        link: { tab: 'server', section: 'ss-section-deployment' },
    });

    const groupCount = groups.length;
    items.push({
        id: 'dispatchGroups',
        status: groupCount >= 1 ? 'ok' : 'warn',
        labelKey: 'server.readiness.dispatchGroups.label',
        detailKey: groupCount >= 1
            ? 'server.readiness.dispatchGroups.ok'
            : 'server.readiness.dispatchGroups.none',
        link: { tab: 'groups' },
        detailParams: { count: groupCount },
    });

    const assignedOps = countAssignedOperators(users);
    const operatorCount = users.filter(function (u) {
        return u && u.active !== false && u.role === 'operator';
    }).length;
    let opScopeStatus = 'ok';
    let opScopeDetailKey = 'server.readiness.operators.ok';
    if (operatorCount === 0) {
        opScopeStatus = 'warn';
        opScopeDetailKey = 'server.readiness.operators.onlySuperAdmin';
    } else if (assignedOps === 0) {
        opScopeStatus = 'warn';
        opScopeDetailKey = 'server.readiness.operators.noAssigned';
    }
    items.push({
        id: 'operators',
        status: opScopeStatus,
        labelKey: 'server.readiness.operators.label',
        detailKey: opScopeDetailKey,
        link: { tab: 'dashboard', dashSub: 'operators' },
        detailParams: { assigned: assignedOps, operators: operatorCount },
    });

    const ftpOk = !!(validation.ftpDetail && validation.ftpDetail.writable);
    items.push({
        id: 'storage',
        status: ftpOk ? 'ok' : 'fail',
        labelKey: 'server.readiness.storage.label',
        detailKey: ftpOk
            ? 'server.readiness.storage.ok'
            : 'server.readiness.storage.fail',
        link: { tab: 'server', action: 'evidenceStorage' },
    });

    const trustClass = classifyTrustProxyReadiness({
        settings: settings,
        trustProxy: trustProxy,
        operatorUrl: operatorUrl,
    });
    items.push({
        id: 'production',
        status: trustClass.status,
        labelKey: 'server.readiness.production.label',
        detailKey: trustClass.detailKey,
        link: { tab: 'server', section: 'ss-section-production' },
        passKind: trustClass.passKind,
    });

    const score = items.filter(function (i) { return i.status === 'ok'; }).length;
    const total = items.length;
    return {
        items: items,
        score: score,
        total: total,
        readyPct: total ? Math.round((score / total) * 100) : 0,
        deploymentMode: mode,
    };
}

function buildFromRuntime(ctx) {
    ctx = ctx || {};
    const settings = ctx.settings || {};
    const validation = storageStatus.pathValidation(ctx.baseDir, settings);
    return buildReadiness({
        settings: settings,
        trustProxy: ctx.trustProxy,
        license: ctx.license,
        groups: ctx.groups,
        users: ctx.users,
        storageValidation: validation,
    });
}

module.exports = {
    buildReadiness,
    buildFromRuntime,
    isIpv4,
    looksLikeDirectHttpsPortal,
    classifyTrustProxyReadiness,
};
