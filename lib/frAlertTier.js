/**
 * FR watchlist grade → alert urgency tier (server gate).
 * mob-fr-alert-tier-server: poi/monitoring do not interrupt operators.
 */
'use strict';

const TIER_BY_GRADE = Object.freeze({
    poi: 'silent',
    monitoring: 'low',
    suspect: 'medium',
    blacklist: 'high',
});

function alertTierFor(listStatus) {
    const s = String(listStatus || 'blacklist').trim().toLowerCase();
    return TIER_BY_GRADE[s] || 'high';
}

function shouldInterruptOperators(tier) {
    return tier === 'medium' || tier === 'high';
}

/** Soft grades still get a colour toast (client); map jump stays blacklist-only. */
function shouldNotifyOperators(/* tier */) {
    return true;
}

module.exports = {
    alertTierFor,
    shouldInterruptOperators,
    shouldNotifyOperators,
    TIER_BY_GRADE,
};
