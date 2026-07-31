'use strict';

/**
 * Glass Fortress diagnostic logging — every failure tells the operator:
 * [WHAT HAPPENED], [WHY IT HAPPENED], [HOW TO FIX IT]
 */

function glassFortress(what, why, how) {
    const w = String(what || 'Unknown failure').trim();
    const y = String(why || 'Cause not determined').trim();
    const h = String(how || 'Contact Ubitron support with this log block').trim();
    console.error('[GLASS-FORTRESS]');
    console.error('[WHAT HAPPENED] ' + w);
    console.error('[WHY IT HAPPENED] ' + y);
    console.error('[HOW TO FIX IT] ' + h);
}

function glassFortressWarn(what, why, how) {
    const w = String(what || 'Warning').trim();
    const y = String(why || 'Cause not determined').trim();
    const h = String(how || 'Review the steps below').trim();
    console.warn('[GLASS-FORTRESS]');
    console.warn('[WHAT HAPPENED] ' + w);
    console.warn('[WHY IT HAPPENED] ' + y);
    console.warn('[HOW TO FIX IT] ' + h);
}

module.exports = {
    glassFortress,
    glassFortressWarn,
};
