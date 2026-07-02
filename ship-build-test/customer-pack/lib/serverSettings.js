/**
 * Server config (fixed IP, BWC registration, SIP / ONVIF). Saved in storage; .env is default on first run.
 */
const fs = require('fs');
const path = require('path');
const storagePaths = require('./storagePaths');
const siteTime = require('./siteTime');
const serverSecrets = require('./serverSecrets');

function ftpDefaultsFromEnv() {
    return {
        enabled: process.env.FM_FTP_ENABLED === '1',
        port: parseInt(process.env.FM_FTP_PORT || '21', 10),
        user: (process.env.FM_FTP_USER || '').trim(),
        password: (process.env.FM_FTP_PASS || '').trim(),
        pasvMin: parseInt(process.env.FM_FTP_PASV_MIN || '20000', 10),
        pasvMax: parseInt(process.env.FM_FTP_PASV_MAX || '20100', 10),
    };
}

function normalizeFtp(ftpIn, envBase) {
    const base = envBase || ftpDefaultsFromEnv();
    const inF = ftpIn || {};
    let pasvMin = parseInt(inF.pasvMin != null ? inF.pasvMin : base.pasvMin, 10) || 20000;
    let pasvMax = parseInt(inF.pasvMax != null ? inF.pasvMax : base.pasvMax, 10) || 20100;
    if (pasvMin > pasvMax) {
        const swap = pasvMin;
        pasvMin = pasvMax;
        pasvMax = swap;
    }
    const port = parseInt(inF.port != null ? inF.port : base.port, 10) || 21;
    return {
        enabled: inF.enabled != null ? !!inF.enabled : base.enabled,
        port: Math.min(65535, Math.max(1, port)),
        user: String(inF.user != null ? inF.user : base.user).trim(),
        password: String(inF.password != null ? inF.password : base.password),
        pasvMin: Math.min(65535, Math.max(1024, pasvMin)),
        pasvMax: Math.min(65535, Math.max(1024, pasvMax)),
    };
}

function resolveFtpRuntime(settings) {
    const s = settings && typeof settings === 'object' ? settings : {};
    return normalizeFtp(s.ftp, ftpDefaultsFromEnv());
}

function ftpPublicView(settings) {
    const r = resolveFtpRuntime(settings);
    const host = String((settings && settings.publicHost) || '').trim()
        || (process.env.FM_GB28181_PUBLIC_HOST || process.env.HOST || '').trim();
    return {
        enabled: r.enabled,
        port: r.port,
        user: r.user,
        pasvMin: r.pasvMin,
        pasvMax: r.pasvMax,
        passwordConfigured: !!r.password,
        host,
    };
}

function envDefaults() {
    const publicHost = (process.env.FM_GB28181_PUBLIC_HOST || process.env.HOST || '192.168.1.8').trim();
    const httpPort = parseInt(process.env.FM_HTTP_PORT || process.env.PORT || '3888', 10);
    return {
        publicHost,
        bindHost: (process.env.FM_GB28181_BIND_HOST || '0.0.0.0').trim(),
        deployment: {
            mode: 'lan',
            networkAccess: 'lan-static',
            operatorUrl: `http://${publicHost}:${httpPort}`,
            tenantName: '',
        },
        activeProtocol: 'sip',
        bwcRegistration: {
            operatorName: '',
            deviceId: '',
            userName: '',
            password: '',
        },
        sip: {
            sipPort: parseInt(process.env.FM_GB28181_SIP_PORT || '5060', 10),
            platformId: (process.env.FM_GB28181_PLATFORM_ID || '34020000002000000001').trim(),
            realm: (process.env.FM_GB28181_REALM || '3402000000').trim(),
            password: process.env.FM_GB28181_PASSWORD || '12345678',
            passwordAlt: process.env.FM_GB28181_PASSWORD_ALT || '123456',
            mediaTransport: (process.env.FM_MEDIA_TRANSPORT || 'udp').trim().toLowerCase() === 'tcp' ? 'tcp' : 'udp',
            msgWsPort: parseInt(process.env.FM_MSG_WS_PORT || '6000', 10),
        },
        onvif: {
            port: 80,
            user: '',
            password: '',
            devicePath: '/onvif/device_service',
            rtspUrl: '',
            rtspTransport: 'tcp',
        },
    };
}

function normalizeNetwork(merged, base, mode, publicHost) {
    const netIn = merged.network || {};
    const lanIn = netIn.lan || {};
    const wanIn = netIn.wan || {};
    const ph = String(publicHost || base.publicHost).trim();
    return {
        lan: {
            ipMode: lanIn.ipMode === 'dhcp' ? 'dhcp' : 'static',
            serverIp: String(lanIn.serverIp || ph).trim(),
            subnetMask: String(lanIn.subnetMask || '255.255.255.0').trim(),
            gateway: String(lanIn.gateway || '').trim(),
            dns1: String(lanIn.dns1 || lanIn.dnsPrimary || '').trim(),
            dns2: String(lanIn.dns2 || lanIn.dnsSecondary || '').trim(),
            hostname: String(lanIn.hostname || '').trim(),
        },
        wan: {
            publicIp: String(wanIn.publicIp || ((mode === 'cloud' || mode === 'hybrid') ? ph : '')).trim(),
            ddnsHostname: String(wanIn.ddnsHostname || wanIn.ddns || '').trim(),
            vpnEndpoint: String(wanIn.vpnEndpoint || wanIn.vpn || '').trim(),
            routerGateway: String(wanIn.routerGateway || wanIn.routerGw || '').trim(),
        },
    };
}

function deriveNetworkAccess(mode) {
    if (mode === 'cloud') return 'cloud-fixed';
    if (mode === 'hybrid') return 'vpn';
    return 'lan-static';
}

function normalize(s) {
    const base = envDefaults();
    const merged = { ...base, ...(s || {}) };
    const sipIn = merged.sip || merged;
    const onvifIn = merged.onvif || {};
    const bwcIn = merged.bwcRegistration || {};
    const depIn = merged.deployment || {};
    const modeRaw = String(depIn.mode || merged.deploymentMode || 'lan').toLowerCase();
    const mode = ['lab', 'lan', 'cloud', 'hybrid'].includes(modeRaw) ? modeRaw : 'lan';
    const publicHost = String(merged.publicHost || '').trim() || base.publicHost;
    const network = normalizeNetwork(merged, base, mode, publicHost);
    const netRaw = String(depIn.networkAccess || merged.networkAccess || '').toLowerCase();
    const networkAccess = ['cloud-fixed', 'lan-static', 'vpn'].includes(netRaw)
        ? netRaw
        : deriveNetworkAccess(mode);
    return {
        publicHost,
        bindHost: String(merged.bindHost || '').trim() || base.bindHost,
        network,
        deployment: {
            mode,
            networkAccess,
            operatorUrl: String(depIn.operatorUrl || merged.operatorUrl || '').trim()
                || `http://${publicHost}:${parseInt(process.env.FM_HTTP_PORT || '3888', 10)}`,
            tenantName: String(depIn.tenantName || merged.tenantName || '').trim(),
        },
        activeProtocol: merged.activeProtocol === 'onvif' ? 'onvif' : 'sip',
        bwcRegistration: {
            operatorName: String(bwcIn.operatorName || '').trim(),
            deviceId: String(bwcIn.deviceId || '').trim(),
            userName: String(bwcIn.userName || '').trim(),
            password: String(bwcIn.password != null ? bwcIn.password : ''),
        },
        sip: {
            sipPort: parseInt(sipIn.sipPort != null ? sipIn.sipPort : merged.sipPort, 10) || 5060,
            platformId: String(sipIn.platformId || merged.platformId || '').trim() || base.sip.platformId,
            realm: String(sipIn.realm || merged.realm || '').trim() || base.sip.realm,
            password: String(sipIn.password != null ? sipIn.password : merged.password != null ? merged.password : base.sip.password),
            passwordAlt: String(sipIn.passwordAlt != null ? sipIn.passwordAlt : merged.passwordAlt != null ? merged.passwordAlt : base.sip.passwordAlt),
            mediaTransport: String(sipIn.mediaTransport || merged.mediaTransport || 'udp').toLowerCase() === 'tcp' ? 'tcp' : 'udp',
            msgWsPort: parseInt(sipIn.msgWsPort != null ? sipIn.msgWsPort : merged.msgWsPort, 10) || 6000,
        },
        onvif: {
            port: parseInt(onvifIn.port, 10) || 80,
            user: String(onvifIn.user || '').trim(),
            password: String(onvifIn.password != null ? onvifIn.password : ''),
            devicePath: String(onvifIn.devicePath || '/onvif/device_service').trim(),
            rtspUrl: String(onvifIn.rtspUrl || '').trim(),
            rtspTransport: String(onvifIn.rtspTransport || 'tcp').toLowerCase() === 'udp' ? 'udp' : 'tcp',
        },
        docking: {
            ftpUploadPath: String((merged.docking && merged.docking.ftpUploadPath) || merged.ftpUploadPath || '').trim(),
        },
        ftp: normalizeFtp(merged.ftp, ftpDefaultsFromEnv()),
        evidence: {
            archivePrimary: storagePaths.normalizeArchivePrimary(
                merged.evidence && merged.evidence.archivePrimary
            ),
            liveCaptureEnabled: !!(merged.evidence && merged.evidence.liveCaptureEnabled),
            liveCapturePath: String((merged.evidence && merged.evidence.liveCapturePath) || 'evidence/live-capture').trim(),
            liveCaptureAutoOnSos: (function () {
                if (merged.evidence && merged.evidence.liveCaptureAutoOnSos != null) {
                    return !!merged.evidence.liveCaptureAutoOnSos;
                }
                return !!(merged.evidence && merged.evidence.liveCaptureEnabled);
            })(),
            retentionDays: Math.max(0, parseInt((merged.evidence && merged.evidence.retentionDays) || 0, 10) || 0),
            nasMountPath: String((merged.evidence && merged.evidence.nasMountPath) || '').trim(),
            dockFtpTargetNote: String((merged.evidence && merged.evidence.dockFtpTargetNote) || '').trim(),
            sanInstallerNote: String((merged.evidence && merged.evidence.sanInstallerNote) || '').trim(),
        },
        voiceAlerts: normalizeVoiceAlerts(merged.voiceAlerts),
        site: {
            timezone: (function () {
                const tzIn = String((merged.site && merged.site.timezone) || '').trim();
                return siteTime.isValidTimezone(tzIn) ? tzIn : siteTime.getTimezone();
            })(),
        },
        ptt: {
            modelVoicePrefixes: Array.isArray(merged.ptt && merged.ptt.modelVoicePrefixes)
                ? merged.ptt.modelVoicePrefixes.map(String).filter(Boolean)
                : [],
            downlinkByCamId: (merged.ptt && merged.ptt.downlinkByCamId && typeof merged.ptt.downlinkByCamId === 'object')
                ? merged.ptt.downlinkByCamId
                : {},
            audioCmdByCamId: (merged.ptt && merged.ptt.audioCmdByCamId && typeof merged.ptt.audioCmdByCamId === 'object')
                ? merged.ptt.audioCmdByCamId
                : {},
        },
    };
}

function clampVoiceNum(v, min, max, fallback) {
    const n = parseFloat(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
}

function voiceAlertsDefaults() {
    return {
        enabled: true,
        autoSpeak: true,
        speakSos: true,
        speakFall: true,
        speakGeofence: true,
        speakRecStart: false,
        speakRecStop: false,
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
        voiceLang: '',
    };
}

function normalizeVoiceAlerts(va) {
    const base = voiceAlertsDefaults();
    const inVa = va || {};
    return {
        enabled: inVa.enabled != null ? !!inVa.enabled : base.enabled,
        autoSpeak: inVa.autoSpeak != null ? !!inVa.autoSpeak : base.autoSpeak,
        speakSos: inVa.speakSos != null ? !!inVa.speakSos : base.speakSos,
        speakFall: inVa.speakFall != null ? !!inVa.speakFall : base.speakFall,
        speakGeofence: inVa.speakGeofence != null ? !!inVa.speakGeofence : base.speakGeofence,
        speakRecStart: inVa.speakRecStart != null ? !!inVa.speakRecStart : base.speakRecStart,
        speakRecStop: inVa.speakRecStop != null ? !!inVa.speakRecStop : base.speakRecStop,
        rate: clampVoiceNum(inVa.rate, 0.5, 2, base.rate),
        pitch: clampVoiceNum(inVa.pitch, 0.5, 2, base.pitch),
        volume: clampVoiceNum(inVa.volume, 0, 1, base.volume),
        voiceLang: String(inVa.voiceLang || '').trim(),
    };
}

function load(storageDir) {
    serverSecrets.migrateLegacySettingsFile(storageDir);
    const filePath = path.join(storageDir, 'server-settings.json');
    let settings;
    try {
        if (fs.existsSync(filePath)) {
            settings = normalize(JSON.parse(fs.readFileSync(filePath, 'utf8')));
        } else {
            settings = normalize(null);
        }
    } catch (_) {
        settings = normalize(null);
    }
    const secrets = serverSecrets.loadSecrets(storageDir);
    return serverSecrets.applySecrets(settings, secrets);
}

function save(storageDir, body) {
    const filePath = path.join(storageDir, 'server-settings.json');
    const current = load(storageDir);
    const merged = Object.assign({}, current, body || {});
    const secrets = serverSecrets.mergeFromPatch(serverSecrets.loadSecrets(storageDir), body || {});
    serverSecrets.saveSecrets(storageDir, secrets);
    const next = serverSecrets.applySecrets(normalize(merged), secrets);
    fs.mkdirSync(storageDir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(serverSecrets.stripSecretsForDisk(next), null, 2), 'utf8');
    return next;
}

function publicView(settings) {
    const s = JSON.parse(JSON.stringify(settings || {}));
    const flags = serverSecrets.secretFlags({
        sip: { password: s.sip && s.sip.password, passwordAlt: s.sip && s.sip.passwordAlt },
        onvif: { password: s.onvif && s.onvif.password },
        bwcRegistration: { password: s.bwcRegistration && s.bwcRegistration.password },
        ftp: { password: s.ftp && s.ftp.password },
    });
    if (s.sip) {
        delete s.sip.password;
        delete s.sip.passwordAlt;
        s.sip.passwordConfigured = flags.sip.passwordConfigured;
        s.sip.passwordAltConfigured = flags.sip.passwordAltConfigured;
    }
    if (s.onvif) {
        delete s.onvif.password;
        s.onvif.passwordConfigured = flags.onvif.passwordConfigured;
    }
    if (s.bwcRegistration) {
        delete s.bwcRegistration.password;
        s.bwcRegistration.passwordConfigured = flags.bwcRegistration.passwordConfigured;
    }
    if (s.ftp) {
        s.ftp = ftpPublicView(settings);
    }
    return s;
}

/** Flat fields used by server.js at runtime */
function runtimeFlat(s) {
    return {
        publicHost: s.publicHost,
        bindHost: s.bindHost,
        sipPort: s.sip.sipPort,
        platformId: s.sip.platformId,
        realm: s.sip.realm,
        password: s.sip.password,
        passwordAlt: s.sip.passwordAlt,
        mediaTransport: s.sip.mediaTransport,
        msgWsPort: s.sip.msgWsPort,
    };
}

function passwordStatus(configured) {
    return configured ? 'configured' : 'missing';
}

function bwcChecklist(s) {
    const reg = s.bwcRegistration || {};
    if (s.activeProtocol === 'onvif') {
        return {
            protocol: 'ONVIF / RTSP',
            serverHost: s.publicHost,
            port: String(s.onvif.port),
            user: s.onvif.user,
            passwordStatus: passwordStatus(!!s.onvif.password),
            path: s.onvif.devicePath,
            rtspUrl: s.onvif.rtspUrl || '(set RTSP URL from dock / VMS)',
            rtspTransport: s.onvif.rtspTransport,
            operatorName: reg.operatorName,
            deviceId: reg.deviceId,
        };
    }
    return {
        protocol: 'SIP',
        sipServer: s.publicHost,
        sipServerNote: 'IPv4 only on BWC keypad (dynamic SIM — no hostnames)',
        sipPort: String(s.sip.sipPort),
        serverId: s.sip.platformId,
        realm: s.sip.realm,
        passwordStatus: passwordStatus(!!s.sip.password),
        messageServer: `ws://${s.publicHost}:${s.sip.msgWsPort}`,
        mediaTransport: s.sip.mediaTransport,
        operatorName: reg.operatorName,
        deviceId: reg.deviceId,
    };
}

function deploymentHints(mode) {
    const hints = {
        lab: 'Single PC on a test LAN. BWCs and operators use the same local IP.',
        lan: 'On-prem server on customer LAN. Forward public ports only if BWCs connect over the internet.',
        cloud: 'VPS or cloud VM with public IP/DNS. BWCs register to publicHost; put nginx/HTTPS in front of operatorUrl.',
        hybrid: 'Cloud dashboard for operators; BWCs on site LAN reach publicHost via VPN or port-forward to SIP/media ports.',
    };
    return hints[mode] || hints.lan;
}

/**
 * Live firewall / port-forward checklist from saved settings + runtime ports (.env).
 */
function firewallChecklist(settings, runtime) {
    const s = settings || normalize(null);
    const r = runtime || {};
    const host = s.publicHost;
    const transport = s.sip.mediaTransport === 'tcp' ? 'tcp' : 'udp';
    const rows = [
        {
            service: 'Dashboard (HTTP)',
            port: String(r.httpPort || 3888),
            protocol: 'tcp',
            direction: 'inbound',
            audience: 'Operators',
            note: `Browser: ${s.deployment.operatorUrl || `http://${host}:${r.httpPort || 3888}`}`,
            required: true,
        },
        {
            service: 'Live video (WebSocket)',
            port: String(r.videoWsPort || (parseInt(r.httpPort, 10) || 3888) + 1),
            protocol: 'tcp',
            direction: 'inbound',
            audience: 'Operators',
            note: 'JSMpeg stream from server to browser',
            required: true,
        },
        {
            service: 'Live audio (WebSocket)',
            port: String(r.audioWsPort || (parseInt(r.httpPort, 10) || 3888) + 2),
            protocol: 'tcp',
            direction: 'inbound',
            audience: 'Operators',
            note: 'PCM audio to browser (Gold Baseline AV)',
            required: true,
        },
        {
            service: 'BWC SIP',
            port: String(s.sip.sipPort),
            protocol: 'tcp+udp',
            direction: 'inbound',
            audience: 'BWCs',
            note: `Register to ${host}:${s.sip.sipPort}`,
            required: true,
        },
        {
            service: 'Message Center (WebSocket)',
            port: String(s.sip.msgWsPort),
            protocol: 'tcp',
            direction: 'inbound',
            audience: 'BWCs',
            note: `ws://${host}:${s.sip.msgWsPort}`,
            required: true,
        },
        {
            service: 'RTP media (video PS)',
            port: '40130–40133',
            protocol: transport,
            direction: 'inbound',
            audience: 'BWCs',
            note: transport === 'udp'
                ? 'UDP 40130–40133 — open range on firewall/NAT for each concurrent stream'
                : 'TCP 40131 when FM_MEDIA_TRANSPORT=tcp',
            required: true,
        },
    ];
    if (r.pttEnabled) {
        rows.push({
            service: 'PTT intercom',
            port: String(r.pttPort || 29201),
            protocol: 'tcp',
            direction: 'inbound',
            audience: 'BWCs',
            note: 'Push-to-talk cluster (FM_PTT_ENABLED=1)',
            required: false,
        });
    }
    if (r.ftpEnabled) {
        rows.push({
            service: 'FTP uploads',
            port: String(r.ftpPort || 21),
            protocol: 'tcp',
            direction: 'inbound',
            audience: 'BWCs',
            note: 'Control channel',
            required: false,
        });
        rows.push({
            service: 'FTP passive data',
            port: `${r.ftpPasvMin || 20000}–${r.ftpPasvMax || 20100}`,
            protocol: 'tcp',
            direction: 'inbound',
            audience: 'BWCs',
            note: 'Passive mode range — required for uploads',
            required: false,
        });
    }
    rows.push({
        service: 'Socket.IO (realtime UI)',
        port: String(r.httpPort || 3888),
        protocol: 'tcp',
        direction: 'inbound',
        audience: 'Operators',
        note: 'Same HTTP port as dashboard (WebSocket upgrade)',
        required: true,
    });
    return rows;
}

function scalingNotes(deviceTarget) {
    const n = parseInt(deviceTarget, 10) || 5000;
    return [
        `Target ${n.toLocaleString()} BWCs: register all device IDs in All BWCs; only online units consume SIP/media resources.`,
        'One Mobility Axiom node handles lab and mid-size Mobility; at very large scale use a dedicated Linux VPS (8+ GB RAM), nginx reverse proxy for operatorUrl, and monitor CPU during peak concurrent live streams.',
        'UDP media does not NAT well — cloud/hybrid installs need port-forward or VPN so each BWC can reach publicHost on SIP + RTP ports.',
        'Create operator accounts for dispatchers; keep super admin for server config and user management only.',
    ];
}

module.exports = {
    load,
    save,
    normalize,
    normalizeVoiceAlerts,
    voiceAlertsDefaults,
    runtimeFlat,
    bwcChecklist,
    envDefaults,
    deploymentHints,
    firewallChecklist,
    scalingNotes,
    ftpDefaultsFromEnv,
    normalizeFtp,
    resolveFtpRuntime,
    ftpPublicView,
    publicView,
};
