/**
 * Title Case for en.json label keys only. Hints/body copy stay sentence case.
 * See CS.md. Preserves BWC, IPv4, CSV, etc.
 */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'public', 'locales', 'en.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

const LOWER = new Set(['a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'from', 'by', 'in', 'of', 'as', 'with', 'via', 'per']);

const ACRONYM = {
    bwc: 'BWC', bwcs: 'BWCs', ip: 'IP', ipv4: 'IPv4', sip: 'SIP', ftp: 'FTP',
    csv: 'CSV', vc: 'VC', url: 'URL', lan: 'LAN', wan: 'WAN', vpn: 'VPN', onvif: 'ONVIF',
    usb: 'USB', sd: 'SD', sos: 'SOS', ptt: 'PTT', gps: 'GPS', ai: 'AI', id: 'ID', ids: 'IDs',
    pc: 'PC', rtmp: 'RTMP', vm: 'VM', node: 'Node',
};

const SKIP_KEY = /\.(hint|desc|intro|note|empty|error|msg|placeholder|steps|preview|warn|confirm|sub|chat|loading|generated|permGrantSteps|streamNote|groupsHint|presetSosDesc|bwcTabHint|myAccount\.hint|gate\.hint|users\.addHint|wan\.hint|lan\.hint|cloudHint|summary|onlineOne|noOnline|toast|llm\.|exportChart|viewLocal|refresh|ask|suggestions|checking|offlineMsg|onlineMsg|launchOk|launching|launchErr|statusErr|statusOk|groupsEmpty|hintNoDevice|hintUnknownId|hintRotate|listHint|allHint|fixedHint|groupHint)/i;

function shouldTitleCase(key, val) {
    if (typeof val !== 'string' || !val.trim()) return false;
    if (SKIP_KEY.test(key)) return false;
    if (val.length > 90) return false;
    if (/^server\.(configBtn|signOut|signedIn|customerLogin|deploymentMode|bwcSipIp|bwcSipServer|techAdmin|auditTrail|openAllBwcs|openVideoWall|publicIp|tab\.|users\.col|users\.adminConfirm|network\.|wan\.title|onvif)/.test(key)) return true;
    if (/^video\.wall\.(title|mode\.|panelRow|mapGroupPick|sourceMode|exportCsv|importCsv|downloadTemplate|enterIdManually|manualId|rotateSec|pickGroup|deviceId|deviceList|device|none|mapGroup)/.test(key)) return true;
    if (/^centre\.(title|exportCsv|refresh|period\.|kpi\.)/.test(key)) return true;
    if (/^conference\.(bwcAdd|bwcAddBtn|bwcRemove|bwcShare|bwcHead|tab|layoutExpand|noPerm|feature|pickBwc)/.test(key)) return true;
    if (/^(nav\.|commandWall\.|displayRoom\.(monitor\dNum|monitor\dTitle|openOps|openWall|openMap|openCentre|launchAll|groupsLabel|autoScreens|presetSosTitle))/.test(key)) return true;
    if (/\.(title|btn|Btn|Tab|label|Label|col|Col|head|Head|signOut|configBtn|clearWall|tabLive|tabLobby|addBtn|meta|devices|loadingRoster)$/.test(key)) return true;
    if (/^call\.(end|start)/.test(key)) return true;
    if (/^fleet\.(searchPlaceholder|groupUngrouped|addNicknameHint)/.test(key)) return true;
    return false;
}

function fixAcronyms(word) {
    const bare = word.replace(/[^A-Za-z0-9]/g, '');
    const lower = bare.toLowerCase();
    if (ACRONYM[lower]) return word.replace(bare, ACRONYM[lower]);
    if (/^[A-Z0-9]{2,}$/.test(bare)) return word;
    return null;
}

function titleCaseWords(s) {
    const parts = s.split(/(\s+|\/|→|,|\(|\)|—|–|-)/);
    const words = parts.filter((p) => /[A-Za-z]/.test(p));
    let wi = 0;
    return parts.map((part) => {
        if (!/[A-Za-z]/.test(part)) return part;
        const idx = wi++;
        const ac = fixAcronyms(part);
        if (ac) return ac;
        const lower = part.toLowerCase();
        if (idx > 0 && idx < words.length - 1 && LOWER.has(lower)) return lower;
        return lower.charAt(0).toUpperCase() + lower.slice(1);
    }).join('');
}

let n = 0;
for (const [key, val] of Object.entries(data)) {
    if (!shouldTitleCase(key, val)) continue;
    const next = titleCaseWords(val);
    if (next !== val) {
        console.log(`${key}: ${val} -> ${next}`);
        data[key] = next;
        n++;
    }
}

for (const [key, val] of Object.entries(data)) {
    if (typeof val !== 'string') continue;
    const next = val
        .replace(/\bServer config\b/g, 'Server Config')
        .replace(/\bTech admin\b/g, 'Tech Admin')
        .replace(/\bSign out\b/g, 'Sign Out')
        .replace(/\bSuperadmin\b/g, 'Super Admin');
    if (next !== val) {
        data[key] = next;
        n++;
    }
}

// Manual acronym fixes the script may miss
const MANUAL = {
    'server.lan.static': 'Static IPv4',
    'server.lan.serverIp': 'Server IP Address',
    'server.wan.publicIp': 'Public WAN IPv4',
    'server.wan.vpnEndpoint': 'VPN Endpoint IPv4 (Hybrid)',
    'server.network.lanStatic': 'LAN — Static Private IPv4',
    'server.network.cloudFixed': 'Cloud — Public Fixed IPv4',
    'server.network.vpn': 'VPN — Site VPN Endpoint IPv4',
    'server.users.adminConfirm': 'Super Admin Password',
    'conference.bwcAddBtn': 'Add to Room',
    'conference.bwcAdd': 'Add BWC Live Share',
    'conference.bwcShare': 'BWC Live Share',
};
for (const [k, v] of Object.entries(MANUAL)) {
    if (data[k] !== v) {
        console.log(`${k}: ${data[k]} -> ${v}`);
        data[k] = v;
        n++;
    }
}

if (!data['conference.bwcHead']) data['conference.bwcHead'] = 'Body Cameras (BWC)';
if (!data['conference.bwcIngressUnavailable']) {
    data['conference.bwcIngressUnavailable'] = 'BWC live share needs the LiveKit Ingress service. Run scripts\\START-LIVEKIT.ps1 on the server, then try Add to Room again.';
    n++;
}
if (!data['conference.bwcNoOnline']) {
    data['conference.bwcNoOnline'] = 'No body cameras online. Phones and PC join with Join room below.';
    n++;
}
if (!data['conference.bwcOnlineOne']) {
    data['conference.bwcOnlineOne'] = '{count} body camera online — select it and tap Add to Room';
    n++;
}

fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log(`Updated ${n} entries`);
