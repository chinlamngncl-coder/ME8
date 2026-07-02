/**
 * SIP DeviceControl (PDF §10, pages 21–23). RecordCmd is passed through as-is.
 */

const KNOWN_RECORD_CMDS = [
    'Lock',
    'Unlock',
    'Record',
    'StopRecord',
    'TakePicture',
    'OutElectricFence',
    'ShutDown',
    'Reboot',
    'FormatSdcard',
    'RestoreFactory',
    'CleanData:1',
    'CleanData:3',
    'CleanData:4',
    'CleanData:5',
];

function buildControlXml(deviceId, recordCmd, sn) {
    const seq = sn != null ? sn : Math.floor(Math.random() * 100000);
    return `<?xml version="1.0"?>\n<Control>\n<CmdType>DeviceControl</CmdType>\n<SN>${seq}</SN>\n<DeviceID>${deviceId}</DeviceID>\n<RecordCmd>${recordCmd}</RecordCmd>\n</Control>`;
}

function sendDeviceControl(sip, opts) {
    const { cameraContactUri, deviceId, realm, serverId, recordCmd, log } = opts;
    if (!cameraContactUri || !deviceId || !recordCmd) return false;

    const content = buildControlXml(deviceId, String(recordCmd));
    sip.send({
        method: 'MESSAGE',
        uri: cameraContactUri,
        headers: {
            to: { uri: `sip:${deviceId}@${realm}` },
            from: { uri: `sip:${serverId}@${realm}`, params: { tag: Math.floor(Math.random() * 10000).toString() } },
            'call-id': Math.random().toString(36).substring(7),
            cseq: { method: 'MESSAGE', seq: 1 },
            'content-type': 'Application/MANSCDP+xml',
            'content-length': content.length,
        },
        content,
    }, () => {});

    if (log) {
        log.sip.info('device control sent', { device: deviceId, recordCmd: String(recordCmd) });
    }
    return true;
}

/** SIP voice broadcast notify — device initiates audio INVITE (no platform Play INVITE). */
function buildBroadcastXml(sourceId, targetId, sn) {
    const seq = sn != null ? sn : Math.floor(Math.random() * 100000);
    return `<?xml version="1.0"?>\n<Notify>\n<CmdType>Broadcast</CmdType>\n<SN>${seq}</SN>\n<SourceID>${sourceId}</SourceID>\n<TargetID>${targetId}</TargetID>\n</Notify>`;
}

function sendVoiceBroadcastNotify(sip, opts) {
    const { cameraContactUri, deviceId, realm, serverId, log } = opts;
    if (!cameraContactUri || !deviceId || !serverId) return false;

    const content = buildBroadcastXml(serverId, deviceId);
    sip.send({
        method: 'MESSAGE',
        uri: cameraContactUri,
        headers: {
            to: { uri: `sip:${deviceId}@${realm}` },
            from: { uri: `sip:${serverId}@${realm}`, params: { tag: Math.floor(Math.random() * 10000).toString() } },
            'call-id': Math.random().toString(36).substring(7),
            cseq: { method: 'MESSAGE', seq: 1 },
            'content-type': 'Application/MANSCDP+xml',
            'content-length': content.length,
        },
        content,
    }, () => {});

    if (log) {
        log.sip.info('voice broadcast sent', { device: deviceId });
    }
    return true;
}

module.exports = {
    KNOWN_RECORD_CMDS,
    buildControlXml,
    sendDeviceControl,
    buildBroadcastXml,
    sendVoiceBroadcastNotify,
};
