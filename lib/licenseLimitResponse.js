'use strict';

/**
 * Standard 403 body for license capacity gates.
 * Frontend maps context → i18n via LicenseEntitlementsUi.showLimitUpsell(context).
 */
function limitReached(context) {
    return {
        ok: false,
        error: 'limit_reached',
        context: String(context || '').trim() || 'users',
    };
}

function limitReached403(res, context) {
    return res.status(403).json(limitReached(context));
}

module.exports = {
    limitReached,
    limitReached403,
};
