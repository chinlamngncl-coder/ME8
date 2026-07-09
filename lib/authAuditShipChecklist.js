/**
 * Auth / audit ship checklist — Dashboard Auth (read-only).
 * Does not change TOTP bench flag; only reports status for go-live.
 */
const platformSmtp = require('./platformSmtp');
const authRecoveryEmail = require('./authRecoveryEmail');
const dashboardTotp = require('./dashboardTotp');

function buildChecklist(opts) {
    opts = opts || {};
    const settings = opts.settings || {};
    const sessionUser = opts.sessionUser || null;
    const techPinConfigured = !!opts.techPinConfigured;

    const items = [];

    // 1) TOTP ship flag — bench may be suspended; ship must not be.
    const totpSuspended = dashboardTotp.isTotpSuspended();
    if (totpSuspended) {
        items.push({
            id: 'totpShip',
            status: 'warn',
            labelKey: 'authAudit.checklist.totp.label',
            detailKey: 'authAudit.checklist.totp.benchSuspended',
            link: { tab: 'dashboard', section: 'ss-auth-audit-checklist' },
        });
    } else {
        const enrolled = !!(sessionUser && dashboardTotp.userTotpEnabled(sessionUser));
        items.push({
            id: 'totpShip',
            status: enrolled ? 'ok' : 'warn',
            labelKey: 'authAudit.checklist.totp.label',
            detailKey: enrolled
                ? 'authAudit.checklist.totp.shipReady'
                : 'authAudit.checklist.totp.enrollNeeded',
            link: { tab: 'dashboard', dashSub: 'me' },
        });
    }

    // 2) SMTP (password reset / recovery mail)
    const smtpRuntime = platformSmtp.resolveSmtpRuntime(settings);
    const smtpProblems = platformSmtp.validateForSend(smtpRuntime);
    items.push({
        id: 'smtp',
        status: smtpProblems.length ? 'warn' : 'ok',
        labelKey: 'authAudit.checklist.smtp.label',
        detailKey: smtpProblems.length
            ? 'authAudit.checklist.smtp.missing'
            : 'authAudit.checklist.smtp.ok',
        link: { tab: 'dashboard', section: 'ss-smtp-section' },
    });

    // 3) Recovery email for this super admin
    const recovery = authRecoveryEmail.recoveryStatus(sessionUser);
    let recoveryStatus = 'warn';
    let recoveryDetail = 'authAudit.checklist.recovery.missing';
    if (recovery && recovery.verified) {
        recoveryStatus = 'ok';
        recoveryDetail = 'authAudit.checklist.recovery.ok';
    } else if (recovery && recovery.pending) {
        recoveryStatus = 'warn';
        recoveryDetail = 'authAudit.checklist.recovery.pending';
    } else if (recovery && recovery.email) {
        recoveryStatus = 'warn';
        recoveryDetail = 'authAudit.checklist.recovery.unverified';
    }
    items.push({
        id: 'recoveryEmail',
        status: recoveryStatus,
        labelKey: 'authAudit.checklist.recovery.label',
        detailKey: recoveryDetail,
        link: { tab: 'dashboard', dashSub: 'me', section: 'ss-recovery-email-block' },
    });

    // 4) IT administrator PIN
    items.push({
        id: 'techPin',
        status: techPinConfigured ? 'ok' : 'warn',
        labelKey: 'authAudit.checklist.techPin.label',
        detailKey: techPinConfigured
            ? 'authAudit.checklist.techPin.ok'
            : 'authAudit.checklist.techPin.missing',
        link: { tab: 'dashboard', section: 'ss-tech-pin-section' },
    });

    // 5) Audit trail — feature present; open to verify
    items.push({
        id: 'auditTrail',
        status: 'ok',
        labelKey: 'authAudit.checklist.audit.label',
        detailKey: 'authAudit.checklist.audit.ok',
        link: { action: 'openAudit' },
    });

    const score = items.filter(function (i) { return i.status === 'ok'; }).length;
    const total = items.length;
    const readyPct = total ? Math.round((score / total) * 100) : 0;

    return {
        score: score,
        total: total,
        readyPct: readyPct,
        totpSuspended: totpSuspended,
        items: items,
    };
}

module.exports = {
    buildChecklist,
};
