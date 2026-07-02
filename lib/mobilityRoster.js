/**
 * Device roster shared by OnlineStatus (SIP) and PTT group lists (PDF 31–33).
 */

const mobilityRegistry = require('./mobilityRegistry');

function getMobilityRoster(activeCamId, online) {
    const roster = mobilityRegistry.getPttRoster(activeCamId, online);
    if (roster.length) return roster;
    const cam = activeCamId || '34020000001329000008';
    const isOnline = online !== false;
    return [
        {
            name: isOnline ? 'Field Officer (Active)' : 'Field Officer (Offline)',
            id: cam,
            pnumber: '00001',
            status: isOnline ? '1' : '0',
            ertId: '11100000001',
        },
        { name: 'Headquarters (Command)', id: '10A01000822E82BFC00', pnumber: '00002', status: '1', ertId: '11100000002' },
    ];
}

function rosterToPttDevices(roster, channeltype = '0') {
    return (roster || []).map((dev, i) => ({
        id: String(i + 1),
        sn: dev.id,
        policeNumber: dev.pnumber || '00001',
        svcid: '1',
        name: (dev.name || dev.pnumber || '').replace(/\s*\([^)]*\)\s*/g, '').trim() || dev.pnumber,
        channeltype,
    }));
}

module.exports = {
    getMobilityRoster,
    rosterToPttDevices,
};
