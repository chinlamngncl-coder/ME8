'use strict';

const wvpPttGroupRelay = require('./wvpPttGroupRelay');
const { createSipCallId, createSipTag } = require('./sipCryptoIdentifiers');

function uniqueCamIds(list) {
    const seen = new Set();
    const out = [];
    (list || []).forEach((id) => {
        const s = String(id || '').trim();
        if (!s || seen.has(s)) return;
        seen.add(s);
        out.push(s);
    });
    return out;
}

const HQ_PTT_DEVICE = {
    id: 'HQ',
    sn: '10A01000822E82BFC00',
    policeNumber: '00002',
    svcid: '1',
    name: 'Headquarters (Command)',
    channeltype: '0',
};

function buildTeamPttDevices(camIds, nameResolver) {
    const devices = camIds.map((camId, i) => ({
        id: String(i + 1),
        sn: camId,
        policeNumber: String(i + 1).padStart(5, '0'),
        svcid: '1',
        name: (nameResolver && nameResolver(camId)) || camId.slice(-8),
        channeltype: '0',
    }));
    if (!devices.some((d) => d.sn === HQ_PTT_DEVICE.sn)) {
        devices.push({ ...HQ_PTT_DEVICE, id: String(devices.length + 1) });
    }
    return devices;
}

function pushPttGroupToTeam(opts) {
    const {
        sip,
        pttServer,
        camIds,
        getContactUriForCam,
        PTT_ENABLED,
        REALM,
        SERVER_ID,
        HOST,
        PTT_GTID,
        PTT_PORT,
        PTT_GROUP_STATUS,
        snid,
        devices,
        log,
    } = opts;
    if (!PTT_ENABLED) return { pushed: 0, skipped: camIds.length };
    let pushed = 0;
    let skipped = 0;
    camIds.forEach((camId) => {
        if (wvpPttGroupRelay.shouldRelayForCam(camId)) {
            wvpPttGroupRelay.pushPttGroup({
                camId: camId,
                realm: REALM,
                serverId: SERVER_ID,
                host: HOST,
                gtid: PTT_GTID,
                port: PTT_PORT,
                status: PTT_GROUP_STATUS,
                snid: snid || '77',
                devices: devices,
                log: log,
            }).then(function (out) {
                if (out && out.ok && log && log.ptt) {
                    log.ptt.info('group config sent', {
                        camId: camId,
                        gtid: PTT_GTID,
                        host: HOST,
                        port: PTT_PORT,
                        status: PTT_GROUP_STATUS,
                        path: 'fleet-ptt-contact-wvp-homed-v1',
                        peer: out.peer,
                        team: true,
                    });
                }
            }).catch(function () { /* ignore */ });
            pushed += 1;
            return;
        }
        const contact = getContactUriForCam(camId);
        if (!contact) {
            skipped += 1;
            return;
        }
        pttServer.pushPttGroupToDevice(sip, {
            cameraContactUri: contact,
            camId,
            realm: REALM,
            serverId: SERVER_ID,
            host: HOST,
            gtid: PTT_GTID,
            port: PTT_PORT,
            status: PTT_GROUP_STATUS,
            snid: snid || '77',
            devices,
            log,
        });
        pushed += 1;
    });
    return { pushed, skipped };
}

function sendDispatchTextToDevice(sip, opts) {
    const { camId, text, getContactUriForCam, REALM, SERVER_ID } = opts;
    const contact = getContactUriForCam(camId);
    if (!contact || !text) return false;
    const body = String(text);
    sip.send({
        method: 'MESSAGE',
        uri: contact,
        headers: {
            to: { uri: `sip:${camId}@${REALM}` },
            from: { uri: `sip:${SERVER_ID}@${REALM}`, params: { tag: createSipTag() } },
            'call-id': createSipCallId(),
            cseq: { method: 'MESSAGE', seq: 1 },
            'content-type': 'text/plain;charset=utf-8',
            'content-length': Buffer.byteLength(body, 'utf8'),
        },
        content: body,
    }, () => {});
    return true;
}

module.exports = {
    uniqueCamIds,
    buildTeamPttDevices,
    pushPttGroupToTeam,
    sendDispatchTextToDevice,
};
