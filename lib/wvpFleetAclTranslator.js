/**

 * MOB-APPLY-BACKEND-ACL-TRANSLATOR-V1

 * Anti-corruption: WVP/GB payloads → classic Fleet shapes the frozen UI already expects.

 * No frontend knowledge of WVP.

 */

'use strict';



const telemetryFromXml = require('./telemetryFromXml');
const alarmFromXml = require('./alarmFromXml');



/**

 * @param {object} body — raw event-bus / webhook JSON (may include xml)

 * @returns {{ cameraId: string, type: string, alarmKind?: string, battery?: string|null, signal?: string|null, recording?: string|null, online?: boolean|null, lat?: *, lon?: *, alarmTime?: string, xml?: string|null, source: string }}

 */

function normalize(body) {

    body = body || {};

    const xml = body.xml || body.rawXml || body.content || body.message || null;

    const xmlStr = xml != null ? String(xml) : '';



    let cameraId = String(body.cameraId || body.deviceId || body.camId || '').trim();

    if (!cameraId && xmlStr) {

        const m = xmlStr.match(/<DeviceID>([^<]+)<\/DeviceID>/i)

            || xmlStr.match(/sip:(\d{20})@/i);

        if (m) cameraId = String(m[1]).trim();

    }



    let type = String(body.type || body.event || body.kind || '').trim().toLowerCase();

    let cmdType = String(body.cmdType || body.CmdType || '').trim();

    if (!cmdType && xmlStr) {

        const cm = xmlStr.match(/<CmdType>([^<]+)<\/CmdType>/i);

        if (cm) cmdType = String(cm[1]).trim();

    }

    const cmdLower = cmdType.toLowerCase();



    if (!type || type === 'message' || type === 'notify' || type === 'manscdp') {

        if (cmdLower === 'alarm' || body.alarmKind || body.alarmType === 'Alarm') {
            const classified = xmlStr ? alarmFromXml.classifyAlarmNotify(null, xmlStr) : null;
            if (classified && classified.alarmKind !== 'sos' && classified.alarmKind !== 'fall') {
                type = 'ignored-alarm';
            } else type = 'alarm';
        }

        else if (cmdLower === 'devstatus' || cmdLower === 'devicestatus') type = 'device-status';

        else if (cmdLower === 'keepalive' || type === 'keepalive') type = 'keepalive';

        else if (cmdLower === 'mobileposition') type = 'gps';

        else if (type === 'ptt-rx' || type === 'ptt_rx') type = 'ptt-rx';

        else if (cmdLower) type = 'device-status';

    }

    if (type === 'alarm' && xmlStr) {
        const classified = alarmFromXml.classifyAlarmNotify(null, xmlStr);
        if (classified && classified.alarmKind !== 'sos' && classified.alarmKind !== 'fall') {
            type = 'ignored-alarm';
        }
    }



    if (type === 'sos' || type === 'device-alarm') type = 'alarm';

    if (type === 'status') type = 'device-status';

    /* WVP-GPS-LIVE-INGEST-V1 — WVP / GB position names → gps (any camera). */
    if (type === 'position' || type === 'gps' || type === 'location' || type === 'locationinfo'
        || type === 'mobileposition' || type === 'channelposition' || type === 'onposition') {
        type = 'gps';
    }
    if (cmdLower === 'mobileposition' || cmdLower === 'locationinfo') {
        type = 'gps';
    }



    let battery = body.battery != null ? body.battery : (body.batteryPct != null ? body.batteryPct : null);

    let signal = body.signal != null ? body.signal : null;

    let recording = body.recording != null ? body.recording : null;

    let online = body.online != null ? body.online : null;



    if (xmlStr) {

        const parsed = telemetryFromXml.parseDeviceStatus(null, xmlStr)

            || telemetryFromXml.parseDeviceStatusRawFallback(xmlStr);

        if (parsed && parsed.hasData) {

            if (battery == null && parsed.battery) battery = parsed.battery;

            if (signal == null && parsed.signal) signal = parsed.signal;

            if (recording == null && parsed.recording != null) recording = parsed.recording;

            if (online == null && parsed.online != null) online = parsed.online;

        }

        if (battery == null) {

            const b = telemetryFromXml.extractBatteryFromXml(xmlStr, null)

                || telemetryFromXml.parseBatteryFromText(xmlStr);

            if (b) battery = b;

        }

        if (signal == null) {

            const sm = xmlStr.match(/<Signal>([^<]+)<\/Signal>/i);

            if (sm) signal = String(sm[1]).trim();

        }

    }



    if (battery != null && typeof telemetryFromXml.formatBattery === 'function') {

        battery = telemetryFromXml.formatBattery(battery) || String(battery).trim();

    } else if (battery != null) {

        battery = String(battery).trim();

    }



    return {

        cameraId,

        type,

        cmdType: cmdType || null,

        alarmKind: body.alarmKind === 'fall' ? 'fall' : (type === 'alarm' ? 'sos' : undefined),

        battery: battery || null,

        signal: signal != null ? String(signal).trim() : null,

        recording: recording != null ? String(recording) : null,

        online: online == null ? null : !!(online === true || online === 1 || online === '1' || String(online).toLowerCase() === 'online'),

        lat: (function () {
            let v = body.lat != null ? body.lat : (body.latitude != null ? body.latitude : null);
            if (v == null && xmlStr) {
                const m = xmlStr.match(/<(?:Latitude|latitude|Lat|GPSLatitude)[^>]*>([^<]+)</i);
                if (m) v = m[1];
            }
            return v;
        })(),

        lon: (function () {
            let v = body.lon != null ? body.lon
                : (body.lng != null ? body.lng
                    : (body.longitude != null ? body.longitude : null));
            if (v == null && xmlStr) {
                const m = xmlStr.match(/<(?:Longitude|longitude|Lon|Long|GPSLongitude)[^>]*>([^<]+)</i);
                if (m) v = m[1];
            }
            return v;
        })(),

        alarmTime: body.alarmTime || body.time || null,

        xml: xmlStr || null,

        source: body.source || 'wvp_acl_translator',

        active: body.active,

    };

}



/**

 * Classic `device-status` socket payload fields (subset the UI already renders).

 */

function toClassicDeviceStatus(norm, prevTel) {

    prevTel = prevTel || {};

    const camId = norm.cameraId;

    return {

        cameraId: camId,

        battery: norm.battery != null ? norm.battery : (prevTel.battery || '—'),

        signal: norm.signal != null ? norm.signal : (prevTel.signal || '—'),

        recording: norm.recording != null ? norm.recording : (prevTel.recording != null ? prevTel.recording : '0'),

        audio: prevTel.audio != null ? prevTel.audio : '0',

        callstate: prevTel.callstate != null ? prevTel.callstate : '0',

        volume: prevTel.volume || '—',

        antishake: prevTel.antishake != null ? prevTel.antishake : '0',

        appversion: prevTel.appversion || '—',

        deviceTime: prevTel.deviceTime || '—',

        aclSource: 'wvp-fleet-acl',

    };

}



module.exports = {

    normalize,

    toClassicDeviceStatus,

};


