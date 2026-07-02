/**
 * Parse SIP / HDA MANSCDP device telemetry from Notify or Response XML.
 * Tag names vary by firmware — match several aliases from raw XML.
 * HDA DeviceStatus responses commonly use Record, Encode, Online, DeviceTime (see fleet.log).
 */

const BATTERY_KEYS = [
    'Battery', 'battery', 'BatteryLevel', 'BatteryPercent', 'RemainBattery', 'RemainingPower',
    'Power', 'PowerValue', 'PowerLevel', 'Electric', 'ElectricQuantity', 'Electricity',
    'SOC', 'Capacity', 'MainBattery', 'SubBattery', 'RemainPower', 'PowerPercent',
    'vbat_adc', 'CellResidualCapacity', '电量', '电池', '剩余电量', '剩余电量百分比',
];

function firstTag(xml, names) {
    if (!xml || typeof xml !== 'string') return null;
    for (let i = 0; i < names.length; i += 1) {
        const n = names[i];
        const m = xml.match(new RegExp('<' + n + '[^>]*>([^<]*)', 'i'));
        if (m && m[1].trim()) return m[1].trim();
        const attr = xml.match(new RegExp('<' + n + '[^>]*\\b(?:Level|Value|Percent|Power)\\s*=\\s*"([^"]+)"', 'i'));
        if (attr && attr[1].trim()) return attr[1].trim();
    }
    return null;
}

/** HDA firmware often nests battery: <Battery><Level>85</Level></Battery> */
function tagContentDeep(xml, names) {
    if (!xml) return null;
    for (let i = 0; i < names.length; i += 1) {
        const n = names[i];
        const direct = firstTag(xml, [n]);
        if (direct) return direct;
        const nestedChild = xml.match(new RegExp('<' + n + '[^>]*>[\\s\\S]*?<(?:Level|Value|Percent|Text|Num|Count)>([^<]+)</', 'i'));
        if (nestedChild && nestedChild[1].trim()) return nestedChild[1].trim();
        const block = xml.match(new RegExp('<' + n + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + n + '>', 'i'));
        if (block) {
            const inner = block[1];
            const sub = inner.match(/<(?:Level|Value|Percent|Text)>([^<]+)</i);
            if (sub && sub[1].trim()) return sub[1].trim();
            const plain = inner.replace(/<[^>]+>/g, '').trim();
            if (plain) return plain;
        }
        const selfAttr = xml.match(new RegExp('<' + n + '[^>]*\\b(?:Level|Value|Percent|Power)\\s*=\\s*"([^"]+)"', 'i'));
        if (selfAttr && selfAttr[1].trim()) return selfAttr[1].trim();
    }
    const itemAttr = xml.match(/<Item[^>]*\s(?:Battery|BatteryLevel|Power|Percent)\s*=\s*"([^"]+)"/i);
    if (itemAttr && itemAttr[1].trim()) return itemAttr[1].trim();
    return null;
}

function deepNotifyField(node, keys) {
    if (!node || typeof node !== 'object') return null;
    for (let i = 0; i < keys.length; i += 1) {
        const k = keys[i];
        if (node[k] == null) continue;
        const raw = node[k];
        const list = Array.isArray(raw) ? raw : [raw];
        for (let j = 0; j < list.length; j += 1) {
            const v = list[j];
            if (v == null) continue;
            if (typeof v === 'string' || typeof v === 'number') {
                const s = String(v).trim();
                if (s) return s;
            }
            if (typeof v === 'object') {
                if (v.Level && v.Level[0] != null) return String(v.Level[0]).trim();
                if (v.Value && v.Value[0] != null) return String(v.Value[0]).trim();
                if (v.Percent && v.Percent[0] != null) return String(v.Percent[0]).trim();
            }
        }
    }
    const childKeys = Object.keys(node);
    for (let c = 0; c < childKeys.length; c += 1) {
        const val = node[childKeys[c]];
        if (!Array.isArray(val)) continue;
        for (let i = 0; i < val.length; i += 1) {
            const child = val[i];
            if (child && typeof child === 'object') {
                const found = deepNotifyField(child, keys);
                if (found) return found;
            }
        }
    }
    return null;
}

function notifyField(notify, keys) {
    if (!notify) return null;
    for (let i = 0; i < keys.length; i += 1) {
        const k = keys[i];
        if (notify[k] && notify[k][0] != null && String(notify[k][0]).trim() !== '') {
            const v = notify[k][0];
            if (typeof v === 'object') continue;
            return String(v).trim();
        }
    }
    return null;
}

/** Flatten nested DeviceStatus / DevStatus / Alarmstatus Item nodes from xml2js. */
function flattenStatusNode(notify) {
    if (!notify) return notify;
    const out = Object.assign({}, notify);
    ['DeviceStatus', 'DevStatus', 'Status', 'DeviceInfo', 'Response', 'Notify'].forEach((wrap) => {
        if (!notify[wrap] || !notify[wrap][0]) return;
        const inner = notify[wrap][0];
        if (typeof inner !== 'object') return;
        Object.keys(inner).forEach((k) => {
            if (inner[k] != null && out[k] == null) out[k] = inner[k];
        });
    });
    const alarm = out.Alarmstatus && out.Alarmstatus[0];
    if (alarm && alarm.Item) {
        const items = Array.isArray(alarm.Item) ? alarm.Item : [alarm.Item];
        items.forEach((item) => {
            if (!item || typeof item !== 'object') return;
            Object.keys(item).forEach((k) => {
                if (item[k] != null && out[k] == null) out[k] = item[k];
            });
        });
    }
    return out;
}

/** SIP Record/Encode: ON, OFF, 1, 0, true, false */
function normalizeOnOff(val) {
    if (val == null || val === '') return null;
    const s = String(val).trim().toUpperCase();
    if (s === 'ON' || s === '1' || s === 'TRUE' || s === 'YES') return '1';
    if (s === 'OFF' || s === '0' || s === 'FALSE' || s === 'NO') return '0';
    return null;
}

/** Battery: percent, or mV band from HDA sysfs docs (~0–4200). */
function formatBattery(raw) {
    if (raw == null || raw === '') return null;
    const s = String(raw).trim();
    if (/^(--|unknown)$/i.test(s)) return null;
    if (/^N\/A$/i.test(s)) return 'N/A';
    if (s.includes('%')) return s;
    const n = parseInt(s, 10);
    if (Number.isNaN(n)) return s;
    if (n >= 0 && n <= 100) return String(n) + '%';
    if (n > 100 && n <= 5000) {
        const pct = Math.min(100, Math.max(0, Math.round((n / 4200) * 100)));
        return pct + '%';
    }
    return s;
}

function pickField(node, xml, keys) {
    return notifyField(node, keys) || deepNotifyField(node, keys) || tagContentDeep(xml, keys) || firstTag(xml, keys);
}

function batteryFromAlarmItems(xml) {
    if (!xml) return null;
    const items = xml.match(/<Item\b[^>]*>[\s\S]*?<\/Item>/gi) || [];
    for (let i = 0; i < items.length; i += 1) {
        const block = items[i];
        const fromTags = tagContentDeep(block, BATTERY_KEYS);
        if (fromTags) return formatBattery(fromTags);
        const ds = block.match(/<DeviceStatus>(\d{1,3})<\/DeviceStatus>/i);
        if (ds) return formatBattery(ds[1]);
        const batInline = block.match(/Battery[:\s]*(\d{1,3})\s*%?/i);
        if (batInline) return formatBattery(batInline[1]);
    }
    return null;
}

function extractBatteryFromXml(rawXml, notify) {
    const xml = rawXml || '';
    const node = flattenStatusNode(notify);
    const batteryRaw = pickField(node, xml, BATTERY_KEYS);
    let battery = formatBattery(batteryRaw);
    if (!battery) {
        const fromItems = batteryFromAlarmItems(xml);
        if (fromItems) battery = fromItems;
    }
    if (!battery) {
        const nv = xml.match(/<Name>\s*Battery[^<]*<\/Name>\s*<Value>([^<]+)<\/Value>/i);
        if (nv) battery = formatBattery(nv[1].trim());
    }
    return battery;
}

function extractDeviceTimeFromXml(rawXml, notify) {
    const xml = rawXml || '';
    if (!xml && !notify) return null;
    const node = flattenStatusNode(notify);
    const raw = pickField(node, xml, [
        'DeviceTime', 'deviceTime', 'Time', 'LocalTime', 'SystemTime', 'CurrentTime',
    ]);
    if (!raw) return null;
    return String(raw).trim().replace('T', ' ');
}

function parseDeviceStatusRawFallback(rawXml) {
    const xml = rawXml || '';
    if (!xml) return { hasData: false };
    const battery = extractBatteryFromXml(xml, null);
    const signalRaw = tagContentDeep(xml, [
        'Signal', 'signal', 'RSSI', 'NetSignal', 'Network', 'SignalStrength',
    ]);
    const recordRaw = tagContentDeep(xml, [
        'Record', 'VideoRecord', 'VideoStatus', 'RecordStatus', 'Recording',
    ]);
    const recording = normalizeOnOff(recordRaw);
    const deviceTime = extractDeviceTimeFromXml(xml, null);
    const hasData = !!(battery || signalRaw || recording != null || deviceTime);
    return {
        hasData,
        battery,
        signal: signalRaw || null,
        recording: recording != null ? recording : null,
        encode: null,
        audio: null,
        callstate: null,
        volume: null,
        antishake: null,
        appversion: null,
        deviceTime,
        online: null,
    };
}

function parseDeviceStatus(notify, rawXml) {
    const xml = rawXml || '';
    const node = flattenStatusNode(notify);

    const batteryRaw = pickField(node, xml, BATTERY_KEYS);
    let battery = formatBattery(batteryRaw);
    if (!battery) battery = extractBatteryFromXml(xml, notify);

    const signalRaw = pickField(node, xml, [
        'Signal', 'signal', 'RSSI', 'NetSignal', 'Network', 'SignalStrength', '信号', '信号强度',
    ]);

    const recordRaw = pickField(node, xml, [
        'Record', 'VideoRecord', 'VideoStatus', 'RecordStatus', 'Recording', '录像', '录像状态',
    ]);

    const encodeRaw = pickField(node, xml, ['Encode', 'encode', 'StreamStatus', '编码']);

    const audioRaw = pickField(node, xml, ['AudioRecord', 'AudioStatus', '录音', 'Audio']);
    const callstateRaw = pickField(node, xml, ['CallState', 'CallStatus']);
    const volumeRaw = pickField(node, xml, ['CallVolume', 'Volume']);
    const antishakeRaw = pickField(node, xml, ['AntiShake', 'AntiShakeStatus']);
    const deviceTime = pickField(node, xml, ['DeviceTime', 'deviceTime', 'Time', 'LocalTime']);
    const appversionRaw = pickField(node, xml, ['AppVersion', 'Version', 'Firmware', 'SoftwareVersion']);

    const recording = normalizeOnOff(recordRaw) != null ? normalizeOnOff(recordRaw) : recordRaw;
    const encode = normalizeOnOff(encodeRaw);

    const onlineRaw = pickField(node, xml, ['Online', 'online']);
    const hasOnlineOnly = onlineRaw && !battery && !signalRaw && recording == null && encode == null && !deviceTime;

    const hasData = !!(
        battery
        || signalRaw
        || recording != null
        || encode != null
        || audioRaw != null
        || callstateRaw != null
        || volumeRaw != null
        || antishakeRaw != null
        || appversionRaw
        || deviceTime
    ) && !hasOnlineOnly;

    return {
        hasData,
        battery,
        signal: signalRaw || null,
        recording: recording != null ? recording : null,
        encode,
        audio: audioRaw != null ? audioRaw : null,
        callstate: callstateRaw != null ? callstateRaw : null,
        volume: volumeRaw || null,
        antishake: antishakeRaw != null ? antishakeRaw : null,
        appversion: appversionRaw || null,
        deviceTime: deviceTime || null,
        online: onlineRaw || null,
    };
}

function toDashboardPayload(camId, parsed) {
    let signal = parsed.signal;
    if ((!signal || /^N\/A$/i.test(signal)) && parsed.encode != null) {
        signal = parsed.encode === '1' ? 'Encode ON' : 'Encode OFF';
    }

    let appversion = parsed.appversion || null;

    const recording = parsed.recording === '1' || parsed.recording === 'true'
        || String(parsed.recording).toUpperCase() === 'ON'
        ? '1'
        : '0';

    return {
        cameraId: camId,
        battery: parsed.battery != null ? parsed.battery : '—',
        signal: signal != null ? signal : '—',
        recording,
        audio: parsed.audio === '1' || parsed.audio === 'true' || String(parsed.audio).toUpperCase() === 'ON' ? '1' : '0',
        callstate: parsed.callstate === '1' || parsed.callstate === 'true' ? '1' : '0',
        volume: parsed.volume != null ? parsed.volume : '—',
        antishake: parsed.antishake === '1' || parsed.antishake === 'true' ? '1' : '0',
        appversion: appversion || '—',
        deviceTime: parsed.deviceTime || '—',
    };
}

/** Battery from HDA message-service text / JSON (WS :6000). */
function parseBatteryFromText(text) {
    if (!text || typeof text !== 'string') return null;
    const trimmed = text.trim();
    if (!trimmed || trimmed.startsWith('[type ')) return null;
    if (trimmed.includes('<') && trimmed.includes('>')) {
        const fromXml = extractBatteryFromXml(trimmed, null);
        if (fromXml) return fromXml;
    }
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
            const obj = JSON.parse(trimmed);
            const keys = ['battery', 'Battery', 'BatteryLevel', 'power', 'Power', 'soc', 'SOC', '电量', '剩余电量'];
            for (let i = 0; i < keys.length; i += 1) {
                const k = keys[i];
                if (obj[k] == null) continue;
                const b = formatBattery(obj[k]);
                if (b) return b;
            }
        } catch (_) {
            /* ignore */
        }
    }
    const patterns = [
        /(?:battery|Battery|电量|剩余电量)[:\s=]+(\d{1,3})\s*%?/i,
        /(\d{1,3})\s*%\s*(?:battery|Battery|电量)/i,
        /^(\d{1,3})%$/,
    ];
    for (let i = 0; i < patterns.length; i += 1) {
        const m = trimmed.match(patterns[i]);
        if (m) return formatBattery(m[1]);
    }
    return null;
}

module.exports = {
    parseDeviceStatus,
    parseDeviceStatusRawFallback,
    extractBatteryFromXml,
    extractDeviceTimeFromXml,
    parseBatteryFromText,
    toDashboardPayload,
    normalizeOnOff,
    formatBattery,
};
