'use strict';

/** Operational labels for BWCs — nickname + unit code; wire deviceId stays internal. */
function primaryLabel(rec, camId, tr) {
    const nick = rec && rec.operatorName ? String(rec.operatorName).trim() : '';
    if (nick) return nick;
    const unit = rec && rec.unitCode ? String(rec.unitCode).trim() : '';
    if (unit) return unit;
    const id = String(camId || '').trim();
    if (id.length > 8) return tr('fleet.bwcShort', { suffix: id.slice(-4) });
    if (id) return tr('fleet.bwcWithId', { id });
    return tr('fleet.bwc');
}

function subLabel(rec) {
    const nick = rec && rec.operatorName ? String(rec.operatorName).trim() : '';
    const unit = rec && rec.unitCode ? String(rec.unitCode).trim() : '';
    if (nick && unit) return unit;
    return '';
}

function searchHaystack(rec, camId, fleetName, mapGroup) {
    const parts = [];
    if (fleetName) parts.push(fleetName);
    if (rec && rec.operatorName) parts.push(rec.operatorName);
    if (rec && rec.unitCode) parts.push(rec.unitCode);
    if (mapGroup) parts.push(mapGroup);
    const id = String(camId || '').trim();
    if (id.length > 4) parts.push(id.slice(-4));
    return parts.join(' ').toLowerCase();
}

module.exports = {
    primaryLabel,
    subLabel,
    searchHaystack,
};
