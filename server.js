const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');

const sip = require('sip');

const xml2js = require('xml2js');

const http = require('http');

const { Server } = require('socket.io');

const fs = require('fs');
const { spawn } = require('child_process');

const WebSocket = require('ws');

const hdaMsg = require('./lib/hdaMessageProtocol');

const mediaSession = require('./lib/mediaSession');
const liveStreamPool = require('./lib/liveStreamPool');
const { createLiveVoiceHint } = require('./lib/liveVoiceHint');
const liveViewers = require('./lib/liveViewers');
const DASHBOARD_MAX_LIVE = parseInt(process.env.FM_MAX_CONCURRENT_LIVE || '6', 10) || 6;
const deviceControl = require('./lib/deviceControl');
const { amplifyAlaw } = require('./lib/psG711Audio');
const pttServer = require('./lib/pttServer');
const fleetRoster = require('./lib/fleetRoster');
const fleetRegistry = require('./lib/fleetRegistry');
const bwcDevices = require('./lib/bwcDevices');
const facePlateIngest = require('./lib/facePlateIngest');
const ftpIngest = require('./lib/ftpIngest');
const log = require('./lib/fleetLog');

process.on('uncaughtException', (err) => {
    try {
        log.web.err('uncaughtException — process kept alive', {
            message: err && err.message,
            stack: err && err.stack ? String(err.stack).split('\n').slice(0, 6).join(' | ') : null,
        });
    } catch (_) {
        console.error('uncaughtException', err);
    }
});

process.on('unhandledRejection', (reason) => {
    try {
        log.web.err('unhandledRejection — process kept alive', {
            message: reason && reason.message ? reason.message : String(reason),
        });
    } catch (_) {
        console.error('unhandledRejection', reason);
    }
});
const serverSettings = require('./lib/serverSettings');
const serverSecrets = require('./lib/serverSecrets');
const siteTime = require('./lib/siteTime');
const telemetryFromXml = require('./lib/telemetryFromXml');
const alarmFromXml = require('./lib/alarmFromXml');
const alarmFromMessage = require('./lib/alarmFromMessage');
const deviceAlarm = require('./lib/deviceAlarm');
const sosInviteQueue = require('./lib/sosInviteQueue');
const sosInviteLock = require('./lib/sosInviteLock');
const geofence = require('./lib/geofence');
const sosIncidents = require('./lib/sosIncidents');
const commandCentreReport = require('./lib/commandCentreReport');
const centreLlm = require('./lib/centreLlm');
const dashboardAuth = require('./lib/dashboardAuth');
const dashboardTotp = require('./lib/dashboardTotp');
const authReverify = require('./lib/authReverify');
const dispatchGroups = require('./lib/dispatchGroups');
const dispatchScope = require('./lib/dispatchScope');
const firmwareOta = require('./lib/firmwareOta');
const ffmpegRuntime = require('./lib/ffmpegRuntime');
const zlmRuntime = require('./lib/zlmRuntime');
const zlmIngest = require('./lib/zlmIngest');
const platformLimits = require('./lib/platformLimits');
const scalePrep = require('./lib/scalePrep');
const staticCache = require('./lib/staticCache');
const scalePrepCfg = scalePrep.loadScalePrepEnv();
const platformLicense = require('./lib/platformLicense');
const tenantProfile = require('./lib/tenantProfile');
const bwcNetwork = require('./lib/bwcNetwork');
const siteDb = require('./lib/siteDb');
const gpsTrack = require('./lib/gpsTrack');
const smartGpsTrack = require('./lib/smartGpsTrack');
const auditLog = require('./lib/auditLog');
const auditTrail = require('./lib/auditTrail');
const killSwitchFourEyes = require('./lib/killSwitchFourEyes');
const usbMaintenance = require('./lib/usbMaintenance');
const evidenceRegistry = require('./lib/evidenceRegistry');
const evidenceSecureExport = require('./lib/evidenceSecureExport');
const evidenceWorkflow = require('./lib/evidenceWorkflow');
const dockRegistry = require('./lib/dockRegistry');
const conferenceModule = require('./lib/conferenceModule');
const conferenceConfig = require('./lib/conferenceConfig');
const conferenceLivekit = require('./lib/conferenceLivekit');
const conferenceBwcIngress = require('./lib/conferenceBwcIngress');
const storagePaths = require('./lib/storagePaths');
const storageStatus = require('./lib/storageStatus');
const evidenceOverview = require('./lib/evidenceOverview');
const caseFiles = require('./lib/caseFiles');
const operatorErrorVoice = require('./lib/operatorErrorVoice');

function opErr(err, extra) {
    return Object.assign({}, operatorErrorVoice.jsonErr(err), extra || {});
}

function reverifyForbidden(req, res, body) {
    const session = req.dashboardUser || dashboardAuth.sessionFromRequest(req);
    if (!session) {
        res.status(401).json(opErr('Unauthorized'));
        return true;
    }
    const check = authReverify.assertReverified(session, body || {});
    if (!check.ok) {
        res.status(403).json({
            ok: false,
            error: check.error,
            errorKey: check.errorKey || 'errors.passwordConfirmRequired',
        });
        return true;
    }
    return false;
}
const liveCapture = require('./lib/liveCapture');
const licenseHeartbeat = require('./lib/licenseHeartbeat');
const sosResponseTeam = require('./lib/sosResponseTeam');
const techAccess = require('./lib/techAccess');
const platformHealth = require('./lib/platformHealth');
const runbooks = require('./lib/runbooks');
const labSecurity = require('./lib/labSecurity');
const oidcAuth = require('./lib/oidcAuth');
const cloudDeployment = require('./lib/cloudDeployment');
const platformTenancy = require('./lib/platformTenancy');
const operationOverlay = require('./lib/operationOverlay');
const pttDownlinkPolicy = require('./lib/pttDownlinkPolicy');
const pttAudioCmdPolicy = require('./lib/pttAudioCmdPolicy');
const bwcVoiceProfile = require('./lib/bwcVoiceProfile');
const voiceIntercomProfile = require('./lib/voiceIntercomProfile');
const voiceIntercomTelemetryMod = require('./lib/voiceIntercomTelemetry');
const gisOffline = require('./lib/gisOffline');

const BASE_DIR = __dirname;
const FACE_PLATE_DIR = path.join(BASE_DIR, 'storage', 'face-plate');
const STORAGE_DIR = path.join(BASE_DIR, 'storage');

try {
    const vaultAcl = serverSecrets.ensureVaultAtRest(STORAGE_DIR);
    if (vaultAcl && vaultAcl.ok === false && vaultAcl.reason !== 'not-windows') {
        log.web.warn('secrets vault ACL not applied', { reason: vaultAcl.reason });
    }
} catch (err) {
    log.web.err('secrets vault init failed', {
        message: err && err.message ? err.message : String(err),
    });
}

function currentFtpRoot() {
    return storagePaths.resolveFtpRoot(BASE_DIR, serverSettings.load(STORAGE_DIR));
}

function refreshEvidenceStorage() {
    FTP_ROOT = currentFtpRoot();
    storagePaths.ensureDir(FTP_ROOT);
    const lcRoot = storagePaths.resolveLiveCaptureRoot(BASE_DIR, serverSettings.load(STORAGE_DIR));
    storagePaths.ensureDir(lcRoot);
    evidenceRegistry.init(STORAGE_DIR, { ftpRoot: FTP_ROOT, liveCaptureRoot: lcRoot });
    evidenceWorkflow.init(STORAGE_DIR);
    evidenceSecureExport.init(STORAGE_DIR);
    return { ftpRoot: FTP_ROOT, liveCaptureRoot: lcRoot };
}

let FTP_ROOT = currentFtpRoot();
refreshEvidenceStorage();
liveCapture.init({ baseDir: BASE_DIR, storageDir: STORAGE_DIR });
licenseHeartbeat.init({ storageDir: STORAGE_DIR });
techAccess.init(STORAGE_DIR);
function applyLabSecurityRuntime() {
    const lab = labSecurity.load(STORAGE_DIR);
    if (lab.trustProxy) {
        app.set('trust proxy', 1);
    } else {
        app.set('trust proxy', false);
    }
    return lab;
}
platformLicense.init(STORAGE_DIR);
sosIncidents.init(STORAGE_DIR);
liveCapture.wireSosIncidents(sosIncidents);
centreLlm.init(STORAGE_DIR);
if (process.env.FM_LLM_WARMUP === '1') {
    centreLlm.warmup().catch(function (err) {
        log.sip.warn('centre llm warmup skipped', { message: err.message });
    });
}
dashboardAuth.init(STORAGE_DIR);
dockRegistry.init(STORAGE_DIR);
dispatchGroups.init(STORAGE_DIR);
firmwareOta.init({
    vendorRoot: path.join(__dirname, 'vendor', 'firmware-ota'),
    storageDir: STORAGE_DIR,
});
tenantProfile.save(STORAGE_DIR, serverSettings.load(STORAGE_DIR));

function applySiteTimezoneFromSettings() {
    const s = serverSettings.load(STORAGE_DIR);
    if (s.site && s.site.timezone) siteTime.configure(s.site.timezone);
}
applySiteTimezoneFromSettings();

const cfg = serverSettings.runtimeFlat(serverSettings.load(STORAGE_DIR));
const HOST = cfg.publicHost;
const BIND_HOST = cfg.bindHost;
const SIP_PORT = cfg.sipPort;
const MSG_WS_PORT = cfg.msgWsPort;
const SERVER_ID = cfg.platformId;
const HQ_CAM_ID = '10A01000822E82BFC00';
const REALM = cfg.realm;

function isBwcCameraId(camId) {
    const id = String(camId || '').trim();
    if (!id || id === SERVER_ID || id === HQ_CAM_ID) return false;
    return true;
}
const MSG_WS_URL = `ws://${HOST}:${MSG_WS_PORT}`;
const HTTP_PORT = parseInt(process.env.FM_HTTP_PORT || process.env.PORT || '3888', 10);
/** Optional PIN to open SOS log detail (full notes). Empty = no lock. Set FM_SOS_LEDGER_PIN in .env */
const SOS_LEDGER_PIN = (process.env.FM_SOS_LEDGER_PIN || '').trim();
const VIDEO_WS_PORT = parseInt(process.env.FM_VIDEO_WS_PORT || String(HTTP_PORT + 1), 10);
const AUDIO_WS_PORT = parseInt(process.env.FM_AUDIO_WS_PORT || String(HTTP_PORT + 2), 10);
const PTT_ENABLED = process.env.FM_PTT_ENABLED === '1';
const PTT_PORT = parseInt(process.env.FM_PTT_PORT || '29201', 10);
const PTT_GTID = process.env.FM_PTT_GTID || '49';
const PTT_GROUP_STATUS = process.env.FM_PTT_GROUP_STATUS || '1';
/** Fleet ☎ SIP TX — same gain for every BWC (not per camId). */
const VOICE_CALL_TX_GAIN = (() => {
    const n = parseFloat(process.env.FM_VOICE_CALL_TX_GAIN || '0.7', 10);
    return Number.isFinite(n) && n > 0 && n <= 1 ? n : 0.7;
})();
let FTP_ENABLED = false;
let FTP_PORT = 21;
let FTP_USER = '';
let FTP_PASS = '';
let FTP_PASV_MIN = 20000;
let FTP_PASV_MAX = 20100;
let ftpServerInstance = null;
let ftpServerListening = false;

function loadFtpRuntimeFromSettings() {
    const ftp = serverSettings.resolveFtpRuntime(serverSettings.load(STORAGE_DIR));
    FTP_ENABLED = ftp.enabled;
    FTP_PORT = ftp.port;
    FTP_USER = ftp.user;
    FTP_PASS = ftp.password;
    FTP_PASV_MIN = ftp.pasvMin;
    FTP_PASV_MAX = ftp.pasvMax;
}
loadFtpRuntimeFromSettings();

const MEDIA_TRANSPORT = cfg.mediaTransport;

function runtimePortSnapshot() {
    return {
        httpPort: HTTP_PORT,
        videoWsPort: VIDEO_WS_PORT,
        audioWsPort: AUDIO_WS_PORT,
        pttEnabled: PTT_ENABLED,
        pttPort: PTT_PORT,
        ftpEnabled: FTP_ENABLED,
        ftpListening: ftpServerListening,
        ftpPort: FTP_PORT,
        ftpPasvMin: FTP_PASV_MIN,
        ftpPasvMax: FTP_PASV_MAX,
        ftpUser: FTP_USER || '',
        mediaTransport: MEDIA_TRANSPORT,
    };
}

function handleFtpFileUploaded(info) {
    const filePath = info.fullPath || info.fileName || '';
    const snapCam = camIdFromFtpUploadPath(filePath, null)
        || sosIncidents.getSnapshotCameraId()
        || connectedCameraId;
    if (info.fileName && global.usedFtpFiles && global.usedFtpFiles.has(info.fileName)) {
        return;
    }
    if (info.fileName && global.usedFtpFiles) {
        global.usedFtpFiles.add(info.fileName);
    }
    const opName = snapCam ? resolveOperatorNameForCam(snapCam) : null;
    const evidenceId = evidenceRegistry.registerFromUpload({
        fullPath: info.fullPath,
        fileName: info.fileName,
        peer: info.peer,
        rootDir: FTP_ROOT,
        deviceId: snapCam || null,
        operatorName: opName,
    });
    const snap = sosIncidents.attachSnapshotFromFtp(
        info.fullPath,
        info.fileName,
        snapCam,
    );
    io.emit('ftp-upload', {
        file: info.fileName,
        path: info.fullPath,
        peer: info.peer,
        cameraId: snapCam,
        evidenceId: evidenceId || null,
        snapshotUrl: snap ? snap.snapshotUrl : null,
        linkedAlarmId: snap ? snap.linkedAlarmId : null,
    });
    if (snap && snap.snapshotUrl) {
        emitToDashboardSockets('sos-snapshot', { cameraId: snapCam, snapshotUrl: snap.snapshotUrl }, snapCam);
    }
}

async function stopFtpServerRuntime() {
    ftpServerListening = false;
    if (!ftpServerInstance) return;
    const inst = ftpServerInstance;
    ftpServerInstance = null;
    try {
        await ftpIngest.stopFtpServer(inst);
    } catch (err) {
        log.ftp.warn('stop failed', { message: err.message });
    }
}

function startFtpServerRuntime() {
    if (!FTP_ENABLED) {
        ftpServerListening = false;
        return { ok: false, reason: 'disabled' };
    }
    if (!FTP_PASS || !FTP_USER) {
        ftpServerListening = false;
        log.ftp.err('not running — set FTP username and password in Evidence → Storage, then save');
        return { ok: false, reason: 'credentials_missing' };
    }
    ftpServerInstance = ftpIngest.startFtpServer({
        host: HOST,
        port: FTP_PORT,
        user: FTP_USER,
        pass: FTP_PASS,
        rootDir: FTP_ROOT,
        pasvMin: FTP_PASV_MIN,
        pasvMax: FTP_PASV_MAX,
        log,
        onListening: () => {
            ftpServerListening = true;
        },
        onFileUploaded: handleFtpFileUploaded,
    });
    if (!ftpServerInstance) {
        ftpServerListening = false;
        return { ok: false, reason: 'start_failed' };
    }
    return { ok: true };
}

async function restartFtpServerRuntime() {
    await stopFtpServerRuntime();
    return startFtpServerRuntime();
}

function getStorageFolders() {
    const ftpRoot = currentFtpRoot();
    return {
        ftp: ftpRoot,
        'face-plate': FACE_PLATE_DIR,
        storage: STORAGE_DIR,
        'sos-incidents': sosIncidents.getBaseDir(),
    };
}



const app = express();
applyLabSecurityRuntime();

const server = http.createServer(app);

const io = new Server(server, {
    cookie: true,
});

sosInviteQueue.setIo(io);

io.use((socket, next) => {
    const cookies = dashboardAuth.parseCookies(socket.request.headers.cookie);
    if (dashboardAuth.isValidSession(cookies.fm_session)) return next();
    next(new Error('Unauthorized'));
});

const wss = new WebSocket.Server({ host: '0.0.0.0', port: VIDEO_WS_PORT });
wss.on('connection', (ws, req) => {
    const rawUrl = (req && req.url) || '';
    const q = rawUrl.indexOf('?');
    let camId = null;
    if (q >= 0) {
        rawUrl.slice(q + 1).split('&').forEach(function (part) {
            const kv = part.split('=');
            if (kv[0] === 'camId' && kv[1]) camId = decodeURIComponent(kv[1]);
        });
    }
    if (camId) {
        liveStreamPool.attachStreamClient(ws, camId);
    } else {
        liveStreamPool.attachLegacyStreamClient(ws);
    }
});
const audioWss = new WebSocket.Server({ host: '0.0.0.0', port: AUDIO_WS_PORT });
audioWss.on('error', (err) => log.media.err('audio ws listener error', err.message));
audioWss.on('connection', () => {
    mediaSession.attachAudioFfmpegToWs();
});
mediaSession.setAudioWss(audioWss);
liveStreamPool.setAudioWss(audioWss);
liveStreamPool.setOnVideoDecode((camId) => {
    if (camId) {
        const sosPull = sosInviteQueue.wasSosPending(camId);
        sosInviteLock.release(camId, 'streaming');
        sosInviteQueue.onStreamStarted(camId);
        if (sosPull) {
            try {
                const ev = (serverSettings.load(STORAGE_DIR).evidence) || {};
                if (ev.liveCaptureEnabled && ev.liveCaptureAutoOnSos && !liveCapture.status(camId).recording) {
                    liveCapture.startForSos(camId);
                    log.web.info('live capture auto-started on SOS', { camId });
                }
            } catch (err) {
                log.web.warn('live capture auto SOS skipped', { camId, message: err.message });
            }
        }
        schedulePttGroupRefreshForCam(camId, 'stream-decode');
    }
    liveViewers.notifyStreamReady(io, camId);
});

const liveVoiceHint = createLiveVoiceHint((camId) => {
    if (!camId || !liveStreamPool.isStreamingForCam(camId)) return;
    io.emit('live-voice-hint', { camId: String(camId).trim() });
    log.media.info('live voice hint', { camId: String(camId).trim() });
});

liveStreamPool.setOnVoicePcm((camId, pcm) => {
    liveVoiceHint.feedPcm(camId, pcm);
});

liveStreamPool.setOnStreamStop((camId) => {
    liveVoiceHint.clearCam(camId);
    liveCapture.onStreamStopped(camId);
});

zlmIngest.wire(liveStreamPool, { host: HOST, videoWsPort: VIDEO_WS_PORT });



const msgWss = new WebSocket.Server({
    host: '0.0.0.0',
    port: MSG_WS_PORT,
    perMessageDeflate: false,
    maxPayload: 110 * 1024,
});
msgWss.on('error', (err) => log.messaging.err('listener error', err.message));

/// Dynamic socket collection tracker to fix multi-camera support
const activeCameraSockets = new Map();

function isValidCamId(s) {
    return typeof s === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(s);
}

function isKnownMsgWssDevice(camId) {
    if (!isValidCamId(camId)) return false;
    const data = loadBwcDevices();
    if (bwcDevices.findById(data, camId)) return true;
    return fleetRegistry.getDashboardFleet().some((d) => d && d.id === camId);
}

function sendMsgLoginSuccess(ws) {

    ws.send(hdaMsg.buildLoginSuccess());

    log.messaging.info('login response sent', { loginRet: 0 });

}



msgWss.on('connection', (ws, req) => {
    const peer = req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : 'unknown';
    const rawUrl = req.url || '';
    log.messaging.info('device connected', { peer, url: rawUrl });

    let urlCamId = null;
    const userMatch = rawUrl.match(/[?&]user=([^,&'\s]+)/);
    if (userMatch) urlCamId = userMatch[1].trim();

    if (!urlCamId) {
        log.messaging.warn('msgWss reject: missing user param', { peer });
        ws.close(4000, 'missing user');
        return;
    }
    if (!isKnownMsgWssDevice(urlCamId)) {
        log.messaging.warn('msgWss reject: unknown camId', { peer, urlCamId });
        ws.close(4002, 'unknown device');
        return;
    }

    const existing = activeCameraSockets.get(urlCamId);
    if (existing && existing !== ws && existing.readyState === WebSocket.OPEN) {
        log.messaging.warn('msgWss reject: camId already held', { peer, urlCamId });
        ws.close(4001, 'camId in use');
        return;
    }
    if (existing && existing.readyState !== WebSocket.OPEN) {
        activeCameraSockets.delete(urlCamId);
    }

    ws._peer = peer;
    ws.registeredCamId = urlCamId;
    ws._reassembler = new hdaMsg.MessageReassembler();
    ws._rateBytes = 0;
    ws._rateWindowStart = Date.now();
    activeCameraSockets.set(urlCamId, ws);
    log.messaging.info('msgWss bound', { camId: urlCamId, peer });

    sendMsgLoginSuccess(ws);
    ws._outMsgQueue = new hdaMsg.OutboundMessageQueue(ws, log);

    ws.on('message', (raw) => {
        const now = Date.now();
        if (now - ws._rateWindowStart > 1000) {
            ws._rateBytes = 0;
            ws._rateWindowStart = now;
        }
        const rawLen = Buffer.isBuffer(raw) ? raw.length : Buffer.byteLength(raw);
        ws._rateBytes += rawLen;
        if (ws._rateBytes > 256 * 1024) {
            log.messaging.warn('msgWss rate limit', { camId: ws.registeredCamId, peer: ws._peer });
            ws.close(4008, 'rate limit');
            return;
        }

        const packet = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
        const header = hdaMsg.readHeader(packet);
        if (!header) {
            log.messaging.warn('frame rejected', { bytes: packet.length, reason: 'bad_header' });
            return;
        }

        if (hdaMsg.isAckFrame(header)) {
            ws._outMsgQueue.onAck(header);
            return;
        }

        if (header.dwCMD === hdaMsg.CMD_MSG_DATA) {
            const parsed = hdaMsg.parseIncomingMsgData(header.lpData);
            if (!parsed) {
                log.messaging.warn('cmd 76 parse failed', { bytes: packet.length });
                return;
            }

            const ackNums = parsed.format === 'send' ? parsed.toNum : 1;
            ws.send(hdaMsg.buildMsgDataRetAck(ackNums, new Array(ackNums).fill(hdaMsg.RET_OK), header.dwIndex));

            const complete = ws._reassembler.ingest(header, parsed);
            if (!complete) {
                log.messaging.info('cmd 76 chunk', {
                    index: header.dwIndex,
                    len: parsed.len,
                    total: parsed.totalLen,
                    format: parsed.format,
                });
                return;
            }

            const claimedFrom = complete.from ? String(complete.from).trim() : null;
            if (claimedFrom && ws.registeredCamId && claimedFrom !== ws.registeredCamId) {
                log.messaging.warn('msgWss from-mismatch', {
                    registered: ws.registeredCamId,
                    claimed: claimedFrom,
                    peer: ws._peer,
                });
                return;
            }
            const actualCamId = ws.registeredCamId;
            if (!actualCamId) return;

            const displayText = complete.text
                || (complete.binary ? `[type ${complete.type}] ${complete.binary.length} bytes` : '');

            const payload = {
                cameraId: actualCamId,
                text: displayText,
                time: complete.time,
                level: complete.level,
                type: complete.type,
                name: complete.name,
                from: complete.from,
                direction: 'in',
            };

            log.messaging.info('message received', {
                chars: displayText.length,
                from: actualCamId,
                type: complete.type,
                level: complete.level,
            });

            facePlateIngest.ingestFromMessage({
                complete,
                cameraId: actualCamId,
                baseDir: BASE_DIR,
                log,
                emit: (ev, data) => io.emit(ev, data),
            });

            io.emit('camera-message', payload);
            persistCameraMessage(payload);

            if (actualCamId) {
                const msgBattery = telemetryFromXml.parseBatteryFromText(displayText)
                    || (complete.binary ? telemetryFromXml.parseBatteryFromText(complete.binary.toString('utf8')) : null);
                if (msgBattery) mergeBatteryTelemetry(actualCamId, msgBattery, 'message');
            }

            const msgAlarmKind = alarmFromMessage.classifyMessage(displayText, complete.type, complete.level);
            if (msgAlarmKind && actualCamId) {
                log.messaging.info('alarm from message', { camId: actualCamId, alarmKind: msgAlarmKind, type: complete.type });
                deviceAlarm.raiseDeviceAlarm({
                    cameraId: actualCamId,
                    alarmKind: msgAlarmKind,
                    lat: lastGpsByCam[actualCamId] ? lastGpsByCam[actualCamId].lat : null,
                    lon: lastGpsByCam[actualCamId] ? lastGpsByCam[actualCamId].lon : null,
                    source: 'message',
                });
            }
            return;
        }

        log.messaging.info('frame', { cmd: header.dwCMD, index: header.dwIndex, len: header.nLength });
    });

    ws.on('close', () => {
        if (ws._outMsgQueue) ws._outMsgQueue.reset();
        if (ws._reassembler) ws._reassembler.clear();
        if (ws.registeredCamId) {
            const current = activeCameraSockets.get(ws.registeredCamId);
            if (current === ws) activeCameraSockets.delete(ws.registeredCamId);
        }
        log.messaging.info('device disconnected', { camId: ws.registeredCamId || null, peer: ws._peer || null });
    });

    ws.on('error', (err) => log.messaging.err('socket error', err.message));
});
app.use(express.json({ limit: '2mb' }));

function labSettingsLive() {
    return labSecurity.load(STORAGE_DIR);
}

app.get('/api/health', (req, res) => {
    res.json({
        ok: true,
        service: 'mobility-axiom',
        at: siteTime.formatEvidence(new Date()),
        uptimeSec: Math.floor(process.uptime()),
    });
});

/** ZLM test bench — backend status (does not touch dashboard UI). */
app.get('/api/zlm/status', async (req, res) => {
    try {
        await zlmRuntime.healthCheck();
        res.json({
            ok: true,
            zlm: zlmRuntime.getStatus(),
            ingests: zlmIngest.listIngests(),
            ffmpegPath: (ffmpegRuntime.getCachedCheck() || {}).ok ? 'ok' : 'missing',
        });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/** Playback info for public/test-zlm.html — ZLM FLV or FFmpeg WS fallback. */
app.get('/api/zlm/playback', async (req, res) => {
    const camId = req.query && req.query.camId ? String(req.query.camId).trim() : '';
    if (!camId) return res.status(400).json({ ok: false, error: 'camId required' });
    try {
        await zlmRuntime.healthCheck();
        res.json(zlmIngest.getPlaybackForCam(camId, req));
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

function evidencePathValidation(settings) {
    const ftpRoot = storagePaths.resolveFtpRoot(BASE_DIR, settings);
    const lcRoot = storagePaths.resolveLiveCaptureRoot(BASE_DIR, settings);
    const nasRaw = settings.evidence && settings.evidence.nasMountPath
        ? String(settings.evidence.nasMountPath).trim()
        : '';
    const nasPath = storagePaths.resolveNasPath(BASE_DIR, nasRaw);
    const network = storagePaths.isNetworkArchive(settings);
    return {
        ftp: storagePaths.pathExistsOnDisk(ftpRoot),
        ftpDetail: storagePaths.testPathAccess(ftpRoot),
        liveCapture: storagePaths.pathExistsOnDisk(lcRoot),
        liveCaptureDetail: storagePaths.testPathAccess(lcRoot),
        nas: nasRaw ? storagePaths.pathExistsOnDisk(nasPath) : null,
        nasDetail: nasRaw ? storagePaths.testPathAccess(nasPath) : null,
        networkArchive: network,
    };
}

function evidenceSettingsPayload(settings) {
    const lcRoot = storagePaths.resolveLiveCaptureRoot(BASE_DIR, settings);
    const ftpRoot = storagePaths.resolveFtpRoot(BASE_DIR, settings);
    const validation = evidencePathValidation(settings);
    const mountRaw = storagePaths.resolveNasMountPath(settings);
    const mountFull = storagePaths.resolveNasPath(BASE_DIR, mountRaw);
    const recommended = mountFull ? storagePaths.recommendedNetworkPaths(mountFull) : null;
    const network = storagePaths.isNetworkArchive(settings);
    return {
        ok: true,
        evidence: settings.evidence || {},
        docking: {
            ftpUploadPath: (settings.docking && settings.docking.ftpUploadPath) || '',
        },
        ftp: serverSettings.ftpPublicView(settings),
        runtime: runtimePortSnapshot(),
        liveCaptureLabel: storagePaths.displayPath(lcRoot, BASE_DIR),
        ftpLabel: storagePaths.displayPath(ftpRoot, BASE_DIR),
        ftpRoot: ftpRoot,
        liveCaptureRoot: lcRoot,
        pathValidation: validation,
        networkStorage: {
            enabled: network,
            mountPath: mountRaw,
            mountFull: mountFull,
            mountOk: validation.nas,
            mountWritable: validation.nasDetail && validation.nasDetail.writable,
            recommended: recommended,
            protocolHint: 'iSCSI, Fibre Channel, NFS, or SMB — mount on this server first (Windows drive letter or Linux mount point).',
        },
        installerNote: network
            ? 'Mount IP SAN / NAS on this host, set mount path, then use Apply recommended paths or point FTP at the same volume.'
            : null,
    };
}

app.get('/api/site-resilience', async (req, res) => {
    try {
        const session = req.dashboardUser || dashboardAuth.sessionFromRequest(req);
        if (!session) return res.status(401).json(opErr("Unauthorized"));
        const node = siteDb.isReady() ? siteDb.getSetting('siteNode', {}) : {};
        const peerUrl = String((node && node.peerUrl) || '').trim().replace(/\/$/, '');
        let peerReachable = null;
        if (peerUrl) {
            try {
                const ctrl = new AbortController();
                const timer = setTimeout(function () { ctrl.abort(); }, 3500);
                const r = await fetch(peerUrl + '/api/health', { signal: ctrl.signal });
                clearTimeout(timer);
                const body = await r.json();
                peerReachable = !!(body && body.ok);
            } catch (_) {
                peerReachable = false;
            }
        }
        res.json({
            ok: true,
            nodeId: String((node && node.nodeId) || process.env.FM_SITE_NODE_ID || 'site-a').trim(),
            peerUrl: peerUrl,
            peerReachable: peerReachable,
            uptimeSec: Math.floor(process.uptime()),
            healthPath: '/api/health',
        });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.post('/api/site-resilience', dashboardAuth.requireSuperAdmin, (req, res) => {
    try {
        const body = req.body || {};
        const current = siteDb.isReady() ? siteDb.getSetting('siteNode', {}) : {};
        const next = {
            nodeId: String(body.nodeId != null ? body.nodeId : (current.nodeId || 'site-a')).trim() || 'site-a',
            peerUrl: String(body.peerUrl != null ? body.peerUrl : (current.peerUrl || '')).trim().replace(/\/$/, ''),
            maxBwcDevices: current.maxBwcDevices,
            maxConcurrentLive: current.maxConcurrentLive,
        };
        if (siteDb.isReady()) siteDb.setSetting('siteNode', next);
        auditLog.recordFromRequest(req, 'site.resilience.save', {
            detail: { nodeId: next.nodeId, peerUrl: next.peerUrl || null },
        });
        res.json({ ok: true, siteNode: next });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.get('/api/metrics', (req, res) => {
    try {
        const lab = labSettingsLive();
        if (!lab.metricsEnabled) {
            return res.status(404).send('# metrics disabled\n');
        }
        if (lab.metricsToken) {
            const auth = req.headers.authorization || '';
            const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
            if (token !== lab.metricsToken) {
                return res.status(401).send('# unauthorized\n');
            }
        }
        const fleet = fleetRegistry.getDashboardFleet ? fleetRegistry.getDashboardFleet() : [];
        const online = fleet.filter(function (d) { return d.online; }).length;
        const streaming = liveStreamPool.listCamIds ? liveStreamPool.listCamIds().length : 0;
        const mem = process.memoryUsage();
        const lines = [
            '# HELP mobility_up Mobility C2 process up.',
            '# TYPE mobility_up gauge',
            'mobility_up 1',
            '# HELP mobility_uptime_seconds Process uptime.',
            '# TYPE mobility_uptime_seconds gauge',
            'mobility_uptime_seconds ' + Math.floor(process.uptime()),
            '# HELP mobility_fleet_online Online BWC count.',
            '# TYPE mobility_fleet_online gauge',
            'mobility_fleet_online ' + online,
            '# HELP mobility_fleet_configured Configured BWC count.',
            '# TYPE mobility_fleet_configured gauge',
            'mobility_fleet_configured ' + fleet.length,
            '# HELP mobility_live_streams Active live transcodes.',
            '# TYPE mobility_live_streams gauge',
            'mobility_live_streams ' + streaming,
            '# HELP mobility_memory_rss_bytes RSS memory.',
            '# TYPE mobility_memory_rss_bytes gauge',
            'mobility_memory_rss_bytes ' + mem.rss,
            '# HELP mobility_sip_listener_ready SIP listener ready.',
            '# TYPE mobility_sip_listener_ready gauge',
            'mobility_sip_listener_ready ' + (sipListenerReady ? 1 : 0),
        ];
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.send(lines.join('\n') + '\n');
    } catch (err) {
        res.status(500).send('# error ' + err.message + '\n');
    }
});

app.get('/api/auth/oidc/config', (req, res) => {
    try {
        res.json({ ok: true, oidc: oidcAuth.getPublicConfig(labSettingsLive()) });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.get('/api/auth/oidc/start', (req, res) => {
    return oidcAuth.startLogin(req, res, labSettingsLive());
});

app.get('/api/auth/oidc/callback', (req, res) => {
    return oidcAuth.handleCallback(req, res, labSettingsLive(), dashboardAuth);
});

app.post('/api/auth/login', (req, res) => {
    try {
        const lab = labSettingsLive();
        if (lab.oidcEnabled && !lab.localLoginEnabled) {
            return res.status(403).json(opErr("Local sign-in disabled — use organization account"));
        }
        const body = req.body || {};
        const username = String(body.username || '').trim();
        const password = String(body.password || '');
        const signInBlock = dashboardAuth.getSignInBlockReasonForCredentials(username, password);
        if (signInBlock === 'expired') {
            return res.status(403).json(opErr("Account expired — contact your administrator"));
        }
        if (signInBlock === 'not_yet') {
            return res.status(403).json(opErr("Account not active yet — check Sign-in from date"));
        }
        const user = dashboardAuth.verifyLoginUser(username, password);
        if (!user) {
            return res.status(401).json(opErr("Invalid user or password"));
        }
        const fullUser = dashboardAuth.findUserByUsername(username);
        if (user.mustChangePassword) {
            const token = dashboardAuth.createSession(user);
            dashboardAuth.setSessionCookie(res, token, req);
            const session = dashboardAuth.getSession(token);
            log.web.info('dashboard login', { username: user.username, role: user.role, mustChangePassword: true });
            auditLog.recordFromRequest(req, 'auth.login', { target: user.username, detail: { role: user.role } });
            return res.json({
                ok: true,
                username: user.username,
                role: user.role,
                mustChangePassword: true,
                canManageServer: dashboardAuth.roleCanManageServer(user.role),
                canManageUsers: dashboardAuth.roleCanManageUsers(user.role),
                permissions: dashboardAuth.getPermissionsForSession(session),
                dispatchScope: dispatchScopePayloadForSession(session),
            });
        }
        if (fullUser && dashboardTotp.userRequiresTotpAtLogin(fullUser)) {
            const challenge = dashboardTotp.createLoginChallenge(fullUser);
            return res.json({
                ok: true,
                totpRequired: true,
                challenge,
                username: user.username,
            });
        }
        const token = dashboardAuth.createSession(user);
        dashboardAuth.setSessionCookie(res, token, req);
        const session = dashboardAuth.getSession(token);
        log.web.info('dashboard login', { username: user.username, role: user.role });
        auditLog.recordFromRequest(req, 'auth.login', { target: user.username, detail: { role: user.role } });
        res.json({
            ok: true,
            username: user.username,
            role: user.role,
            mustChangePassword: false,
            mustEnrollTotp: !!(fullUser && dashboardTotp.userMustEnrollTotp(fullUser)),
            totpEnabled: !!(fullUser && dashboardTotp.userTotpEnabled(fullUser)),
            canManageServer: dashboardAuth.roleCanManageServer(user.role),
            canManageUsers: dashboardAuth.roleCanManageUsers(user.role),
            permissions: dashboardAuth.getPermissionsForSession(session),
            dispatchScope: dispatchScopePayloadForSession(session),
        });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.post('/api/auth/login/totp', (req, res) => {
    try {
        const body = req.body || {};
        const challenge = String(body.challenge || '').trim();
        const code = String(body.code || '').trim();
        if (!challenge || !code) {
            return res.status(400).json(opErr('Authenticator code is required'));
        }
        const row = dashboardTotp.consumeLoginChallenge(challenge);
        if (!row) {
            return res.status(401).json(opErr('Sign-in expired. Enter username and password again.'));
        }
        const fullUser = dashboardAuth.findUserById(row.userId);
        if (!fullUser || fullUser.active === false) {
            return res.status(401).json(opErr('Invalid user or password'));
        }
        const verify = dashboardTotp.verifyUserTotpCode(fullUser, code);
        if (!verify.ok) {
            return res.status(401).json(opErr('Invalid authenticator code'));
        }
        if (verify.usedBackup) {
            dashboardAuth.markTotpBackupUsed(fullUser.id, verify.backupIndex);
        }
        const token = dashboardAuth.createSession({
            id: fullUser.id,
            username: fullUser.username,
            role: fullUser.role,
        });
        dashboardAuth.setSessionCookie(res, token, req);
        const session = dashboardAuth.getSession(token);
        log.web.info('dashboard login totp', { username: fullUser.username, backup: !!verify.usedBackup });
        auditLog.recordFromRequest(req, 'auth.login.totp', {
            target: fullUser.username,
            detail: { backupCode: !!verify.usedBackup },
        });
        res.json({
            ok: true,
            username: fullUser.username,
            role: fullUser.role,
            mustChangePassword: false,
            mustEnrollTotp: false,
            totpEnabled: true,
            canManageServer: dashboardAuth.roleCanManageServer(fullUser.role),
            canManageUsers: dashboardAuth.roleCanManageUsers(fullUser.role),
            permissions: dashboardAuth.getPermissionsForSession(session),
            dispatchScope: dispatchScopePayloadForSession(session),
        });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.post('/api/auth/totp/enroll/start', (req, res) => {
    try {
        const session = req.dashboardUser || dashboardAuth.sessionFromRequest(req);
        if (!session) return res.status(401).json(opErr('Unauthorized'));
        const body = req.body || {};
        const password = String(body.password || '');
        if (!password) return res.status(400).json(opErr('Password is required'));
        if (!dashboardAuth.verifySessionPassword(session, password)) {
            return res.status(403).json(opErr('Incorrect password'));
        }
        const user = dashboardAuth.findUserById(session.userId);
        if (!user || user.active === false) return res.status(401).json(opErr('Unauthorized'));
        if (dashboardTotp.userTotpEnabled(user)) {
            return res.status(400).json(opErr('Authenticator is already enabled on this account'));
        }
        const secret = dashboardTotp.totpAuth.generateSecret();
        const enrollToken = dashboardTotp.startEnrollment(user.id, secret);
        const payload = dashboardTotp.buildEnrollmentPayload(user, secret);
        dashboardTotp.buildEnrollmentQr(payload).then((qrDataUrl) => {
            res.json({
                ok: true,
                enrollToken,
                qrDataUrl,
                manualSecret: secret,
                otpauthUri: payload.otpauthUri,
                issuer: payload.issuer,
                accountName: payload.accountName,
            });
        }).catch((err) => {
            res.status(500).json(opErr(err));
        });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.post('/api/auth/totp/enroll/confirm', (req, res) => {
    try {
        const session = req.dashboardUser || dashboardAuth.sessionFromRequest(req);
        if (!session) return res.status(401).json(opErr('Unauthorized'));
        const body = req.body || {};
        const enrollToken = String(body.enrollToken || '').trim();
        const code = String(body.code || '').trim();
        if (!enrollToken || !code) {
            return res.status(400).json(opErr('Authenticator code is required'));
        }
        const pending = dashboardTotp.consumeEnrollment(enrollToken);
        if (!pending || pending.userId !== session.userId) {
            return res.status(400).json(opErr('Setup expired. Start again.'));
        }
        if (!dashboardTotp.totpAuth.verifyTotp(pending.secret, code)) {
            return res.status(400).json(opErr('Invalid authenticator code'));
        }
        const backupCodes = dashboardTotp.totpAuth.generateBackupCodes();
        dashboardAuth.enableUserTotp(session.userId, pending.secret, backupCodes);
        auditLog.recordFromRequest(req, 'auth.totp.enroll', { target: session.username });
        res.json({
            ok: true,
            totpEnabled: true,
            backupCodes,
            backupCount: backupCodes.length,
        });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.get('/api/auth/password-policy', (req, res) => {
    const session = dashboardAuth.sessionFromRequest(req);
    const role = session && session.role ? session.role : 'super_admin';
    res.json({
        ok: true,
        policy: dashboardAuth.getPasswordPolicyPublic(role),
    });
});

app.post('/api/auth/logout', (req, res) => {
    dashboardAuth.destroySession(dashboardAuth.sessionTokenFromRequest(req));
    dashboardAuth.clearSessionCookie(res, req);
    res.json({ ok: true });
});

app.get('/api/auth/session', (req, res) => {
    const session = dashboardAuth.sessionFromRequest(req);
    if (!session) {
        return res.json({ ok: false });
    }
    const user = dashboardAuth.findUserById(session.userId);
    res.json({
        ok: true,
        username: session.username,
        role: session.role,
        mustChangePassword: dashboardAuth.userMustChangePassword(user),
        mustEnrollTotp: dashboardAuth.sessionMustEnrollTotp(session),
        totpEnabled: dashboardTotp.userTotpEnabled(user),
        displayName: (() => {
            return user && user.displayName ? String(user.displayName).trim() : null;
        })(),
        canManageServer: dashboardAuth.roleCanManageServer(session.role),
        canManageUsers: dashboardAuth.roleCanManageUsers(session.role),
        permissions: dashboardAuth.getPermissionsForSession(session),
        dispatchScope: dispatchScopePayloadForSession(session),
    });
});

function techHealthDeps() {
    return {
        uptimeSec: process.uptime(),
        adminServiceStatusSnapshot,
        activeCameraSockets,
        fleetRegistry,
        liveStreamPool,
        platformLicense,
        logFile: log.logFile,
        runtimePorts: runtimePortSnapshot(),
        sipListenerReady,
        traceEnabled: log.isTraceEnabled(),
    };
}

app.post('/api/tech/login', techAccess.loginHandler(log));
app.post('/api/tech/logout', techAccess.logoutHandler);
app.get('/api/tech/session', techAccess.sessionHandler);

app.get('/api/tech/health', techAccess.requireTechAuth, (req, res) => {
    try {
        res.json({ ok: true, health: platformHealth.collectHealth(techHealthDeps()) });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.get('/api/tech/trace', techAccess.requireTechAuth, (req, res) => {
    try {
        const opts = {
            lines: req.query.lines,
            channel: req.query.channel,
            contains: req.query.contains,
        };
        const source = req.query.source === 'file' ? 'file' : 'ring';
        const lines = source === 'file' ? log.tailFile(opts) : log.tailRing(opts);
        res.json({
            ok: true,
            traceEnabled: log.isTraceEnabled(),
            traceEnvLocked: process.env.FM_TRACE === '1',
            source,
            count: lines.length,
            lines,
        });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.post('/api/tech/trace', techAccess.requireTechAuth, (req, res) => {
    try {
        if (process.env.FM_TRACE === '1') {
            return res.json({
                ok: true,
                traceEnabled: true,
                traceEnvLocked: true,
                message: 'Detailed activity recording is locked on by your installer profile.',
            });
        }
        const body = req.body || {};
        const enabled = body.enabled != null ? !!body.enabled : !log.isTraceEnabled();
        log.setTraceEnabled(enabled);
        log.web.info('tech trace toggled', { enabled: log.isTraceEnabled() });
        res.json({ ok: true, traceEnabled: log.isTraceEnabled(), traceEnvLocked: false });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.get('/api/tech/runbooks', techAccess.requireTechAuth, (req, res) => {
    try {
        res.json({ ok: true, runbooks: runbooks.listRunbooks() });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.get('/api/tech/runbooks/:id', techAccess.requireTechAuth, (req, res) => {
    try {
        const rb = runbooks.getRunbook(req.params.id);
        if (!rb) return res.status(404).json(opErr("Runbook not found"));
        res.json({ ok: true, runbook: rb });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.get('/api/lab-security/settings', techAccess.requireTechAuth, (req, res) => {
    try {
        const settings = labSecurity.load(STORAGE_DIR);
        const server = serverSettings.load(STORAGE_DIR);
        res.json({
            ok: true,
            settings: settings,
            public: labSecurity.publicView(settings),
            readiness: labSecurity.readinessChecklist(settings, {
                operatorUrl: server.deployment && server.deployment.operatorUrl,
                techPinConfigured: techAccess.isConfigured(),
            }),
            redirectUriHint: oidcAuth.redirectUri(req, settings),
        });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.post('/api/lab-security/settings', techAccess.requireTechAuth, (req, res) => {
    try {
        const body = req.body && req.body.settings ? req.body.settings : req.body;
        const next = labSecurity.save(STORAGE_DIR, body || {});
        applyLabSecurityRuntime();
        auditLog.record('lab_security.save', {
            actor: 'tech',
            detail: { oidcEnabled: next.oidcEnabled, trustProxy: next.trustProxy },
        });
        const server = serverSettings.load(STORAGE_DIR);
        res.json({
            ok: true,
            public: labSecurity.publicView(next),
            readiness: labSecurity.readinessChecklist(next, {
                operatorUrl: server.deployment && server.deployment.operatorUrl,
                techPinConfigured: techAccess.isConfigured(),
            }),
        });
    } catch (err) {
        res.status(400).json(opErr(err));
    }
});

app.post('/api/lab-security/test-oidc', techAccess.requireTechAuth, async (req, res) => {
    try {
        const settings = labSecurity.normalize(
            req.body && req.body.settings ? req.body.settings : labSecurity.load(STORAGE_DIR)
        );
        const discovery = await oidcAuth.testDiscovery(settings);
        res.json({ ok: true, discovery: discovery, redirectUri: oidcAuth.redirectUri(req, settings) });
    } catch (err) {
        res.status(400).json(opErr(err));
    }
});

gisOffline.registerGisOfflineRoutes(app);

app.use(dashboardAuth.requireDashboardAuth);

function buildCloudDeploymentOverview() {
    const settings = serverSettings.load(STORAGE_DIR);
    const cloud = cloudDeployment.load(STORAGE_DIR);
    const limits = platformLimits.loadLimits();
    const bwcData = loadBwcDevices();
    const users = dashboardAuth.listUsersPublic();
    const license = platformLicense.getStatusPublic();
    const heartbeat = licenseHeartbeat.getStatusPublic();
    const dep = settings.deployment || {};
    const wan = (settings.network && settings.network.wan) || {};
    return {
        public: cloudDeployment.publicView(cloud),
        architecture: cloudDeployment.architectureStatus(),
        deployment: {
            mode: dep.mode,
            networkAccess: dep.networkAccess,
            operatorUrl: dep.operatorUrl,
            tenantName: dep.tenantName,
        },
        network: {
            publicHost: settings.publicHost,
            wanPublicIp: wan.publicIp || '',
            ddnsHostname: wan.ddnsHostname || '',
            vpnEndpoint: wan.vpnEndpoint || '',
        },
        license: license,
        heartbeat: heartbeat,
        limits: {
            maxBwcDevices: limits.maxBwcDevices,
            maxDashboardUsers: limits.maxDashboardUsers,
            limitsSource: limits.limitsSource,
        },
        usage: {
            bwcDevices: bwcData.devices.length,
            dashboardUsers: users.length,
        },
        readiness: cloudDeployment.readinessChecklist({
            cloud: cloud,
            license: license,
            usage: { bwcDevices: bwcData.devices.length, dashboardUsers: users.length },
            limits: limits,
            deployment: dep,
            heartbeat: heartbeat,
            wanPublicIp: wan.publicIp || '',
            bwcRegisterIp: settings.publicHost,
        }),
        program: platformTenancy.assessProgram({
            tenancy: platformTenancy.load(STORAGE_DIR),
            license: license,
            heartbeat: heartbeat,
            cloud: cloud,
        }),
        firewallRows: serverSettings.firewallChecklist(settings, serverSettings.runtimeFlat(settings)),
        operationsGuide: {
            vendorPortalPath: 'MobilityC2-VENDOR-IMPORTANT/OperationsPortal',
            nocPollScript: 'tools/noc-poll-sites.js',
            customerRegistryTemplate: 'MobilityC2-VENDOR-IMPORTANT/OperationsPortal/customers.template.csv',
        },
    };
}

app.get('/api/cloud-deployment/overview', dashboardAuth.requireSuperAdmin, (req, res) => {
    try {
        res.json(Object.assign({ ok: true }, buildCloudDeploymentOverview()));
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.post('/api/cloud-deployment/settings', dashboardAuth.requireSuperAdmin, (req, res) => {
    try {
        const body = req.body || {};
        if (reverifyForbidden(req, res, body)) return;
        const cloudBody = body.cloud || body;
        const nextCloud = cloudDeployment.save(STORAGE_DIR, cloudBody);

        if (body.deployment || body.network || body.publicHost) {
            const current = serverSettings.load(STORAGE_DIR);
            const merged = Object.assign({}, current);
            if (body.publicHost) merged.publicHost = String(body.publicHost).trim();
            if (body.deployment) {
                merged.deployment = Object.assign({}, current.deployment || {}, body.deployment);
            }
            if (body.network && body.network.wan) {
                merged.network = Object.assign({}, current.network || {}, {
                    wan: Object.assign({}, (current.network && current.network.wan) || {}, body.network.wan),
                });
            }
            const saved = serverSettings.save(STORAGE_DIR, merged);
            tenantProfile.save(STORAGE_DIR, saved);
        }

        licenseHeartbeat.invalidateCache();
        licenseHeartbeat.reschedule();
        platformLicense.invalidateCache();
        auditLog.recordFromRequest(req, 'cloud_deployment.save', {
            actor: req.dashboardUser && req.dashboardUser.username,
            detail: { siteReferenceId: nextCloud.siteReferenceId },
        });

        res.json(Object.assign({ ok: true, public: cloudDeployment.publicView(nextCloud) }, buildCloudDeploymentOverview()));
    } catch (err) {
        res.status(400).json(opErr(err));
    }
});

app.post('/api/cloud-deployment/verify-entitlements', dashboardAuth.requireSuperAdmin, async (req, res) => {
    try {
        const result = await licenseHeartbeat.runCheck();
        if (!result) {
            return res.status(400).json({
                ok: false,
                error: 'Entitlement verification is not configured. Enable it and set the operations portal endpoint.',
            });
        }
        res.json(Object.assign({ ok: true, verification: result }, buildCloudDeploymentOverview()));
    } catch (err) {
        res.status(400).json(opErr(err));
    }
});

app.get('/api/storage', (req, res) => {
    const settings = serverSettings.load(STORAGE_DIR);
    const ftpRoot = currentFtpRoot();
    const lcRoot = storagePaths.resolveLiveCaptureRoot(BASE_DIR, settings);
    res.json({
        ftp: ftpRoot,
        ftpLabel: storagePaths.displayPath(ftpRoot, BASE_DIR),
        ftpConfigured: !!(settings.docking || {}).ftpUploadPath
            || !!(process.env.FM_FTP_ROOT || '').trim(),
        liveCapture: lcRoot,
        liveCaptureLabel: storagePaths.displayPath(lcRoot, BASE_DIR),
        nasMountPath: storagePaths.resolveNasMountPath(settings),
        facePlate: FACE_PLATE_DIR,
        fleetLog: log.logFile,
        storage: STORAGE_DIR,
        sosIncidents: sosIncidents.getBaseDir(),
    });
});

app.get('/api/sos-incidents', (req, res) => {
    try {
        const limit = req.query && req.query.limit;
        const days = req.query && req.query.days;
        res.json(sosIncidents.getDashboard(limit, days));
    } catch (err) {
        res.status(500).json(opErr(err, { entries: [], chart: [] }));
    }
});

app.get('/api/sos-incidents/export', (req, res) => {
    try {
        const days = req.query && req.query.days;
        const csv = sosIncidents.exportCsv(days);
        const span = Math.max(1, parseInt(days || sosIncidents.DEFAULT_DASHBOARD_DAYS, 10) || sosIncidents.DEFAULT_DASHBOARD_DAYS);
        const stamp = siteTime.formatEvidenceDate(new Date());
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="sos-incidents-' + span + 'd-' + stamp + '.csv"');
        res.send('\uFEFF' + csv);
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.post('/api/sos-incidents/clear', (req, res) => {
    try {
        sosIncidents.clearDashboardList();
        log.web.info('sos dashboard list cleared');
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.post('/api/sos-incidents/open', (req, res) => {
    try {
        const incidentId = req.body && req.body.incidentId;
        const folderPath = sosIncidents.getIncidentFolderPath(incidentId);
        if (!folderPath || !fs.existsSync(folderPath)) {
            return res.status(404).json(opErr("Incident folder not found"));
        }
        if (process.platform === 'win32') {
            spawn('explorer.exe', [folderPath], { detached: true, stdio: 'ignore' }).unref();
            const reportPath = sosIncidents.getIncidentReportPath(incidentId);
            if (reportPath) {
                spawn('cmd.exe', ['/c', 'start', '', reportPath], { detached: true, stdio: 'ignore' }).unref();
            }
            log.web.info('opened sos incident folder', { incidentId, path: folderPath });
            return res.json({ ok: true, path: folderPath, report: reportPath });
        }
        res.json({ ok: false, path: folderPath, hint: 'Open this path on the server PC' });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.get('/api/sos-ledger-gate', (req, res) => {
    res.json({ pinRequired: SOS_LEDGER_PIN.length > 0 });
});

app.post('/api/sos-ledger-unlock', (req, res) => {
    if (!SOS_LEDGER_PIN) return res.json({ ok: true });
    const pin = String((req.body && req.body.pin) || '');
    if (pin === SOS_LEDGER_PIN) return res.json({ ok: true });
    res.status(401).json(opErr("Incorrect PIN"));
});

const VIDEO_CHANNELS_PATH = path.join(STORAGE_DIR, 'video-channels.json');
const BWC_DEVICES_PATH = path.join(STORAGE_DIR, 'bwc-devices.json');

function bootstrapSiteDatabase() {
    siteDb.init(STORAGE_DIR);
    operationOverlay.init({
        storageDir: STORAGE_DIR,
        getDispatchGroupColor: function (id) {
            const g = dispatchGroups.getGroup(id);
            return g && g.color ? g.color : null;
        },
    });
    const mig = siteDb.migrateFromJson(BWC_DEVICES_PATH);
    if (mig.imported) {
        log.web.info('site db migrated from json', mig);
        siteDb.exportToJson(BWC_DEVICES_PATH);
    }
    siteDb.setSetting('archive', {
        primary: (process.env.FM_ARCHIVE_PRIMARY || 'local').trim().toLowerCase(),
        localPath: STORAGE_DIR,
        nasPath: (process.env.FM_ARCHIVE_NAS_PATH || '').trim(),
        cloudEndpoint: (process.env.FM_ARCHIVE_CLOUD_ENDPOINT || '').trim(),
        cloudBucket: (process.env.FM_ARCHIVE_CLOUD_BUCKET || '').trim(),
    });
    const lim = platformLimits.loadLimits();
    siteDb.setSetting('siteNode', {
        nodeId: (process.env.FM_SITE_NODE_ID || 'site-a').trim(),
        peerUrl: (process.env.FM_SITE_PEER_URL || '').trim(),
        maxBwcDevices: lim.maxBwcDevices,
        maxConcurrentLive: lim.maxConcurrentLive,
    });
    try {
        const purged = siteDb.purgeBwcMessagesOlderThanDays(
            parseInt(process.env.FM_MESSAGES_RETAIN_DAYS, 10) || 30
        );
        if (purged > 0) log.messaging.info('purged old bwc messages', { count: purged });
    } catch (err) {
        log.messaging.warn('message purge skipped', { message: err.message });
    }
    evidenceRegistry.init(STORAGE_DIR, {
        ftpRoot: FTP_ROOT,
        liveCaptureRoot: storagePaths.resolveLiveCaptureRoot(BASE_DIR, serverSettings.load(STORAGE_DIR)),
    });
    try {
        const scanned = evidenceRegistry.scanFtpRoot(400);
        if (scanned > 0) log.web.info('evidence catalog scan', { indexed: scanned });
    } catch (err) {
        log.web.warn('evidence catalog scan failed', { message: err.message });
    }
    gpsTrack.configure({ siteDb: siteDb, log: log });
    try {
        gpsTrack.runRetention();
    } catch (err) {
        log.web.warn('gps track retention skipped', { message: err.message });
    }
}

bootstrapSiteDatabase();

setInterval(function () {
    try {
        gpsTrack.runRetention();
    } catch (_) { /* ignore */ }
}, 6 * 3600000);

let bwcDevicesCache = null;

function loadBwcDevices() {
    if (!bwcDevicesCache) {
        const channels = readVideoChannels().channels || [];
        bwcDevicesCache = bwcDevices.migrateFromChannels(BWC_DEVICES_PATH, channels);
    }
    return bwcDevicesCache;
}

function invalidateBwcDevicesCache() {
    bwcDevicesCache = null;
}

function syncFleetDeviceMeta() {
    const data = loadBwcDevices();
    fleetRegistry.refreshDeviceMeta(data, VIDEO_CHANNELS_PATH);
    return data;
}

/** Add a SIP-registered BWC to bwc-devices.json when missing (never overwrites nicknames). */
function ensureBwcEntryForDevice(deviceId) {
    const id = String(deviceId || '').trim();
    if (!id) return null;
    const data = loadBwcDevices();
    if (bwcDevices.findById(data, id)) return data;
    try {
        platformLimits.assertBwcCount((data.devices || []).length + 1);
    } catch (err) {
        log.web.warn('bwc auto-add blocked — device limit', { deviceId: id, error: err.message });
        return data;
    }
    const fleetRow = fleetRegistry.getDashboardFleet().find((d) => d && d.id === id);
    const seen = fleetRow || lastGpsByCam[id] || id === connectedCameraId;
    if (!seen) return null;
    const opName = resolveOperatorNameForCam(id);
    const fleetName = fleetRow && fleetRow.name ? String(fleetRow.name).trim() : '';
    const nickname = opName || (fleetName && !/^BWC #/i.test(fleetName) ? fleetName : '');
    const row = bwcDevices.normalizeDevice({
        deviceId: id,
        operatorName: nickname,
        mapGroup: fleetRegistry.getMapGroup(id) || '',
        userName: '',
        password: '',
        protocol: 'sip',
    });
    bwcDevicesCache = bwcDevices.write(BWC_DEVICES_PATH, { devices: data.devices.concat([row]) });
    syncFleetDeviceMeta();
    emitFleetRoster();
    log.web.info('bwc auto-added', { deviceId: id, reason: 'registered' });
    return bwcDevicesCache;
}

function bootstrapBwcDeviceList() {
    invalidateBwcDevicesCache();
    const data = loadBwcDevices();
    if ((data.devices || []).length) {
        syncFleetDeviceMeta();
        return data;
    }
    const seedId = String(process.env.FM_SEED_BWC_ID || '34020000001329000008').trim();
    const seedName = String(process.env.FM_SEED_BWC_NICKNAME || 'Chin').trim();
    if (!seedId) return data;
    bwcDevicesCache = bwcDevices.write(BWC_DEVICES_PATH, {
        devices: [bwcDevices.normalizeDevice({
            deviceId: seedId,
            operatorName: seedName,
            mapGroup: '',
            userName: '',
            password: '',
            protocol: 'sip',
        })],
    });
    syncFleetDeviceMeta();
    log.web.info('bwc registry seeded', { deviceId: seedId, operatorName: seedName });
    return bwcDevicesCache;
}

function ensureBwcEntriesForWallChannels(channels) {
    const data = loadBwcDevices();
    const byId = {};
    data.devices.forEach((d) => { if (d.deviceId) byId[d.deviceId] = d; });
    let changed = false;
    (channels || []).forEach((ch) => {
        const id = ch && ch.deviceId ? String(ch.deviceId).trim() : '';
        if (!id || byId[id]) return;
        byId[id] = {
            deviceId: id,
            operatorName: String(ch.operatorName || '').trim(),
            mapGroup: '',
            userName: String(ch.userName || '').trim(),
            password: String(ch.password || ''),
            protocol: ch.protocol === 'onvif' ? 'onvif' : 'sip',
        };
        changed = true;
    });
    if (!changed) return data;
    const merged = { devices: Object.keys(byId).map((id) => byId[id]) };
    try {
        platformLimits.assertBwcCount(merged.devices.length);
    } catch (err) {
        log.web.warn('video wall bwc merge blocked — device limit', { error: err.message });
        return data;
    }
    bwcDevicesCache = bwcDevices.write(BWC_DEVICES_PATH, merged);
    return bwcDevicesCache;
}

function defaultVideoChannels() {
    return {
        channels: Array.from({ length: 6 }, (_, slot) => ({
            slot,
            sourceMode: slot >= 4 ? 'overflow' : 'none',
            operatorName: '',
            deviceId: '',
            mapGroup: '',
            deviceIds: [],
            rotateSec: 30,
            userName: '',
            password: '',
            protocol: 'sip',
        })),
    };
}

function readVideoChannels() {
    try {
        if (fs.existsSync(VIDEO_CHANNELS_PATH)) {
            const data = JSON.parse(fs.readFileSync(VIDEO_CHANNELS_PATH, 'utf8'));
            if (data && Array.isArray(data.channels)) return data;
        }
    } catch (err) {
        log.web.warn('video channels read failed', { message: err.message });
    }
    return defaultVideoChannels();
}

function resolveOperatorNameForCam(camId) {
    if (!camId) return '';
    const id = String(camId).trim();
    const rec = bwcDevices.findById(loadBwcDevices(), id);
    if (rec && rec.operatorName) return String(rec.operatorName).trim();
    const channels = readVideoChannels().channels || [];
    const ch = channels.find((c) => c && String(c.deviceId).trim() === id);
    return ch && ch.operatorName ? String(ch.operatorName).trim() : '';
}

app.get('/api/video-channels', (req, res) => {
    res.json(readVideoChannels());
});

app.get('/api/fleet', (req, res) => {
    syncFleetDeviceMeta();
    const session = req.dashboardUser || dashboardAuth.sessionFromRequest(req);
    res.json({ fleet: fleetForSession(session) });
});

app.get('/api/bwc-devices', (req, res) => {
    const session = req.dashboardUser || dashboardAuth.sessionFromRequest(req);
    res.json(filterBwcDevicesForSession(session, enrichBwcDevicesForApi(loadBwcDevices())));
});

app.post('/api/bwc-devices', (req, res) => {
    const body = req.body || {};
    const incoming = Array.isArray(body.devices) ? body.devices : [];
    try {
        platformLimits.assertBwcCount(incoming.length);
        invalidateBwcDevicesCache();
        const saved = bwcDevices.write(BWC_DEVICES_PATH, { devices: incoming });
        bwcDevicesCache = saved;
        const settings = serverSettings.load(STORAGE_DIR);
        let mergedSettings = pttDownlinkPolicy.syncDownlinkFromDevices(incoming, settings);
        mergedSettings = pttAudioCmdPolicy.syncFromDevices(incoming, mergedSettings);
        serverSettings.save(STORAGE_DIR, mergedSettings);
        syncFleetDeviceMeta();
        log.web.info('bwc devices saved', { count: saved.devices.length });
        auditLog.recordFromRequest(req, 'bwc.registry.save', {
            target: 'bwc-devices',
            detail: { count: saved.devices.length },
        });
        emitFleetRoster();
        (saved.devices || []).forEach((d) => {
            if (d && d.deviceId) {
            emitToDashboardSockets('geofence-update', {
                cameraId: d.deviceId,
                geofence: d.geofence || null,
                geofenceOutside: isGeofenceOutside(d.deviceId),
            }, d.deviceId);
            }
        });
        io.emit('ptt-downlink-policy', buildPttDownlinkPolicyForClient());
        res.json({ ok: true, devices: enrichBwcDevicesForApi(saved).devices });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.post('/api/auth/verify', (req, res) => {
    const body = req.body || {};
    const username = String(body.username || '').trim();
    const password = String(body.password || '');
    if (body.checkGeofence) {
        const op = dashboardAuth.verifyGeofenceOperator(username, password);
        if (!op) {
            if (dashboardAuth.verifyLogin(username, password)) {
                return res.status(403).json(opErr("geofence_not_permitted"));
            }
            return res.status(401).json(opErr("invalid_credentials"));
        }
        return res.json({ ok: true, username: op.username });
    }
    if (!dashboardAuth.verifyLoginUser(username, password)) {
        return res.status(401).json(opErr("invalid_credentials"));
    }
    res.json({ ok: true, username });
});

const HQ_GEOFENCE_SKIP = '10A01000822E82BFC00';

/** Registered BWCs (+ online fleet entries) for geofence pickers. Offline devices included. */
function buildGeofenceDeviceOptions(opts) {
    opts = opts || {};
    syncFleetDeviceMeta();
    const fleet = fleetRegistry.getDashboardFleet();
    const onlineById = new Map();
    const fleetNameById = new Map();
    fleet.forEach((d) => {
        if (!d || !d.id || d.id === HQ_GEOFENCE_SKIP) return;
        onlineById.set(d.id, !!d.online);
        fleetNameById.set(d.id, d.name || '');
    });
    const bwcData = loadBwcDevices();
    const byId = new Map();
    (bwcData.devices || []).forEach((d) => {
        if (!d || !d.deviceId) return;
        const gf = d.geofence ? geofence.normalize(d.geofence) : null;
        byId.set(d.deviceId, {
            deviceId: d.deviceId,
            operatorName: d.operatorName || fleetNameById.get(d.deviceId) || '',
            mapGroup: d.mapGroup || '',
            online: onlineById.has(d.deviceId) ? onlineById.get(d.deviceId) : false,
            hasGeofence: !!gf,
            geofence: gf || null,
        });
    });
    fleet.filter((d) => d && d.online && d.id && d.id !== HQ_GEOFENCE_SKIP).forEach((f) => {
        if (byId.has(f.id)) return;
        byId.set(f.id, {
            deviceId: f.id,
            operatorName: f.name || '',
            mapGroup: f.mapGroup || '',
            online: true,
            hasGeofence: false,
            geofence: null,
        });
    });
    let rows = Array.from(byId.values());
    if (opts.requireGeofence) rows = rows.filter((r) => r.hasGeofence);
    rows.sort((a, b) => {
        const na = String(a.operatorName || a.deviceId).toLowerCase();
        const nb = String(b.operatorName || b.deviceId).toLowerCase();
        return na.localeCompare(nb);
    });
    return rows;
}

app.get('/api/geofence/set-options', (req, res) => {
    try {
        const session = req.dashboardUser || dashboardAuth.sessionFromRequest(req);
        const rows = buildGeofenceDeviceOptions({ requireGeofence: false })
            .filter((r) => sessionCanSeeCam(session, r.deviceId));
        res.json({ ok: true, devices: rows });
    } catch (err) {
        res.status(500).json(opErr(err, { devices: [] }));
    }
});

app.post('/api/geofence/set', (req, res) => {
    const body = req.body || {};
    const deviceId = String(body.deviceId || '').trim();
    const username = String(body.username || '').trim();
    const password = String(body.password || '');
    if (!deviceId) return res.status(400).json(opErr("device_id_required"));
    const gfOp = dashboardAuth.verifyGeofenceOperator(username, password);
    if (!gfOp) {
        if (dashboardAuth.verifyLogin(username, password)) {
            return res.status(403).json(opErr("geofence_not_permitted"));
        }
        return res.status(401).json(opErr("invalid_credentials"));
    }
    const gf = geofence.normalize(body.geofence);
    if (!gf) return res.status(400).json(opErr("invalid_geofence"));
    try {
        invalidateBwcDevicesCache();
        let current = loadBwcDevices();
        let idx = (current.devices || []).findIndex((d) => d.deviceId === deviceId);
        if (idx < 0) {
            current = ensureBwcEntryForDevice(deviceId);
            if (!current) {
                return res.status(404).json(opErr("device_not_found"));
            }
            idx = (current.devices || []).findIndex((d) => d.deviceId === deviceId);
        }
        if (idx < 0) return res.status(404).json(opErr("device_not_found"));
        const nextDevices = current.devices.slice();
        const row = Object.assign({}, nextDevices[idx], { geofence: gf });
        nextDevices[idx] = row;
        const saved = bwcDevices.write(BWC_DEVICES_PATH, { devices: nextDevices });
        bwcDevicesCache = saved;
        delete geofenceInsideByCam[deviceId];
        const g = lastGpsByCam[deviceId];
        if (g) {
            geofenceInsideByCam[deviceId] = {
                inside: geofence.containsPoint(g.lat, g.lon, gf),
                lat: g.lat,
                lon: g.lon,
                at: Date.now(),
            };
        }
        emitToDashboardSockets('geofence-update', {
            cameraId: deviceId,
            geofence: gf,
            geofenceOutside: isGeofenceOutside(deviceId),
        }, deviceId);
        log.web.info('geofence set', { deviceId, by: gfOp.username, radiusM: gf.radiusM });
        auditLog.record('geofence.set', {
            actor: gfOp.username,
            role: dashboardAuth.normalizeRole(gfOp.role),
            target: deviceId,
            detail: geofenceAuditDetail(gf),
            clientIp: auditLog.clientIp(req),
        });
        res.json({ ok: true, deviceId, geofence: gf, operatorName: row.operatorName || '' });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.get('/api/geofence/clear-options', (req, res) => {
    try {
        const session = req.dashboardUser || dashboardAuth.sessionFromRequest(req);
        const rows = buildGeofenceDeviceOptions({ requireGeofence: false })
            .filter((r) => sessionCanSeeCam(session, r.deviceId));
        res.json({ ok: true, devices: rows });
    } catch (err) {
        res.status(500).json(opErr(err, { devices: [] }));
    }
});

app.post('/api/geofence/clear', (req, res) => {
    const body = req.body || {};
    const deviceId = String(body.deviceId || '').trim();
    const username = String(body.username || '').trim();
    const password = String(body.password || '');
    if (!deviceId) return res.status(400).json(opErr("device_id_required"));
    const gfOp = dashboardAuth.verifyGeofenceOperator(username, password);
    if (!gfOp) {
        if (dashboardAuth.verifyLogin(username, password)) {
            return res.status(403).json(opErr("geofence_not_permitted"));
        }
        return res.status(401).json(opErr("invalid_credentials"));
    }
    try {
        invalidateBwcDevicesCache();
        let current = loadBwcDevices();
        let idx = (current.devices || []).findIndex((d) => d.deviceId === deviceId);
        if (idx < 0) {
            return res.status(404).json(opErr("device_not_found"));
        }
        const row = Object.assign({}, current.devices[idx]);
        if (!row.geofence) {
            return res.status(400).json(opErr("no_geofence"));
        }
        row.geofence = null;
        const nextDevices = current.devices.slice();
        nextDevices[idx] = row;
        const saved = bwcDevices.write(BWC_DEVICES_PATH, { devices: nextDevices });
        bwcDevicesCache = saved;
        delete geofenceInsideByCam[deviceId];
        emitToDashboardSockets('geofence-update', {
            cameraId: deviceId,
            geofence: null,
            geofenceOutside: false,
        }, deviceId);
        log.web.info('geofence cleared', { deviceId, by: gfOp.username });
        auditLog.record('geofence.clear', {
            actor: gfOp.username,
            role: dashboardAuth.normalizeRole(gfOp.role),
            target: deviceId,
            detail: { outcome: 'cleared' },
            clientIp: auditLog.clientIp(req),
        });
        res.json({ ok: true, deviceId, operatorName: row.operatorName || '' });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.post('/api/bwc-devices/:deviceId/geofence', (req, res) => {
    const deviceId = String(req.params.deviceId || '').trim();
    if (!deviceId) return res.status(400).json(opErr("device_id_required"));
    const body = req.body || {};
    try {
        invalidateBwcDevicesCache();
        let current = loadBwcDevices();
        let idx = (current.devices || []).findIndex((d) => d.deviceId === deviceId);
        if (idx < 0) {
            current = ensureBwcEntryForDevice(deviceId);
            if (!current) {
                return res.status(404).json({
                    ok: false,
                    error: 'device_not_found',
                    hint: 'BWC must be online on this server before setting a geofence.',
                });
            }
            idx = (current.devices || []).findIndex((d) => d.deviceId === deviceId);
        }
        if (idx < 0) return res.status(404).json(opErr("device_not_found"));
        const nextDevices = current.devices.slice();
        const row = Object.assign({}, nextDevices[idx]);
        if (body.clear === true) {
            return res.status(400).json({
                ok: false,
                error: 'use_geofence_clear_api',
                hint: 'Use Clr geo on the map — sign-in and pick the BWC.',
            });
        } else if (Object.prototype.hasOwnProperty.call(body, 'geofence')) {
            row.geofence = geofence.normalize(body.geofence);
        } else {
            return res.status(400).json(opErr("geofence_or_clear_required"));
        }
        nextDevices[idx] = row;
        const saved = bwcDevices.write(BWC_DEVICES_PATH, { devices: nextDevices });
        bwcDevicesCache = saved;
        delete geofenceInsideByCam[deviceId];
        const g = lastGpsByCam[deviceId];
        if (g && row.geofence) {
            geofenceInsideByCam[deviceId] = {
                inside: geofence.containsPoint(g.lat, g.lon, row.geofence),
                lat: g.lat,
                lon: g.lon,
                at: Date.now(),
            };
        }
        emitToDashboardSockets('geofence-update', {
            cameraId: deviceId,
            geofence: row.geofence || null,
            geofenceOutside: isGeofenceOutside(deviceId),
        }, deviceId);
        log.web.info('geofence saved', { deviceId, hasGeofence: !!row.geofence });
        res.json({ ok: true, deviceId, geofence: row.geofence || null });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.get('/api/last-gps', (req, res) => {
    const camId = (req.query && req.query.camId) || connectedCameraId;
    const online = !!(camId && deviceOnline && connectedCameraId === camId);
    const g = camId && lastGpsByCam[camId];
    if (!g) return res.json({ cameraId: camId || null, online: false });
    res.json({ cameraId: camId, lat: g.lat, lon: g.lon, online });
});

app.get('/api/map-positions', (req, res) => {
    try {
        const session = req.dashboardUser || dashboardAuth.sessionFromRequest(req);
        res.json(buildMapPositionsPayload(session));
    } catch (err) {
        res.status(500).json(opErr(err, { devices: [], pendingGps: [] }));
    }
});

app.get('/api/sos-open-alarms', (req, res) => {
    try {
        const session = req.dashboardUser || dashboardAuth.sessionFromRequest(req);
        const alarms = sosIncidents.getOpenAlarms()
            .filter((e) => e && e.cameraId && sessionCanSeeCam(session, e.cameraId))
            .map((e) => {
            const g = lastGpsByCam[e.cameraId];
            return {
                id: e.id,
                cameraId: e.cameraId,
                alarmTime: e.alarmTime || null,
                at: e.at,
                lat: e.lat != null ? e.lat : (g ? g.lat : null),
                lon: e.lon != null ? e.lon : (g ? g.lon : null),
                alarmKind: e.alarmKind || 'sos',
                operatorName: e.operatorName || resolveOperatorNameForCam(e.cameraId),
            };
        });
        res.json({
            ok: true,
            alarms,
            queue: filterSosQueueForSession(session, sosInviteQueue.getSnapshot()),
        });
    } catch (err) {
        res.status(500).json(opErr(err, { alarms: [], queue: null }));
    }
});

app.post('/api/sos-acknowledge', async (req, res) => {
    try {
        const session = req.dashboardUser || dashboardAuth.sessionFromRequest(req);
        const body = req.body || {};
        const note = String(body.note || '').trim();
        const alarmCamId = String(body.cameraId || connectedCameraId || '').trim();
        if (alarmCamId) assertSessionCanAccessCam(session, alarmCamId);
        const helperCamIds = Array.isArray(body.helperCamIds)
            ? body.helperCamIds.map(String).filter(Boolean)
            : [];
        let entry = sosIncidents.recordAcknowledgement({
            cameraId: alarmCamId || null,
            alarmTime: body.alarmTime || null,
            note,
            incidentId: body.incidentId || null,
        });
        const snapRaw = body.snapshotBase64 ? String(body.snapshotBase64) : '';
        if (snapRaw && entry && entry.id) {
            const b64 = snapRaw.replace(/^data:image\/\w+;base64,/, '');
            const buf = Buffer.from(b64, 'base64');
            if (buf.length > 100) {
                sosIncidents.saveDashboardSnapshot(entry.id, buf);
            }
        }
        if (entry && alarmCamId) {
            try {
                entry = await liveCapture.finalizeForSosAck(entry);
            } catch (capErr) {
                log.web.warn('live capture finalize on SOS ack skipped', {
                    camId: alarmCamId,
                    message: capErr.message,
                });
            }
        }

        let pttTeam = null;
        if (PTT_ENABLED && alarmCamId && helperCamIds.length) {
            helperCamIds.forEach((id) => assertSessionCanAccessCam(session, id));
            const team = sosResponseTeam.uniqueCamIds([alarmCamId, ...helperCamIds]);
            syncFleetDeviceMeta();
            const devices = sosResponseTeam.buildTeamPttDevices(team, resolveOperatorNameForCam);
            const pushResult = sosResponseTeam.pushPttGroupToTeam({
                sip,
                pttServer,
                camIds: team,
                getContactUriForCam,
                PTT_ENABLED,
                REALM,
                SERVER_ID,
                HOST,
                PTT_GTID,
                PTT_PORT,
                PTT_GROUP_STATUS,
                snid: '77',
                devices,
                log,
            });
            pttTeam = {
                team,
                pushed: pushResult.pushed,
                skipped: pushResult.skipped,
                pttOnline: team.map((id) => ({
                    camId: id,
                    pttOnline: pttServer.isDevicePttOnline(id),
                })),
            };
            log.ptt.info('sos response ptt team', {
                alarmCamId,
                teamSize: team.length,
                pushed: pushResult.pushed,
            });
        }

        log.sip.info('sos acknowledged', {
            camId: alarmCamId,
            note,
            hasSnapshot: snapRaw.length > 0,
            helperCount: helperCamIds.length,
            pttTeamSize: pttTeam ? pttTeam.team.length : 0,
            serverRecording: entry && entry.serverRecordingEvidenceId ? entry.serverRecordingEvidenceId : null,
        });
        auditLog.recordFromRequest(req, 'sos.acknowledge', {
            target: alarmCamId,
            detail: {
                alarmId: entry && entry.id,
                note: note || null,
                helperCamIds: helperCamIds.length ? helperCamIds : null,
                pttTeam: pttTeam ? pttTeam.team : null,
            },
        });
        clearSosCapture();
        if (alarmCamId) {
            sosInviteQueue.clearForCam(alarmCamId);
            // Keep live video on the wall until the operator hits Stop — ack only closes the alarm UI.
        }
        if (!sosIncidents.getOpenAlarms().length) {
            smartGpsTrack.stopAllSosTracking();
            emitSmartGpsState();
        }
        if (alarmCamId) {
            emitToDashboardSockets('sos-acknowledged', { cameraId: alarmCamId }, alarmCamId);
        }
        res.json({
            ok: true,
            entry: entry && entry.id ? (sosIncidents.getPublicEntry(entry.id) || entry) : entry,
            pttTeam,
        });
    } catch (err) {
        res.status(err.status || 500).json(opErr(err));
    }
});

app.post('/api/ptt-restore-always-on', (req, res) => {
    try {
        if (!PTT_ENABLED) {
            return res.status(503).json(opErr("PTT not enabled on server"));
        }
        const result = restoreAlwaysOnPttGroups();
        if (req.body && req.body.source === 'dispatch') {
            auditLog.recordFromRequest(req, 'ptt.dispatch_ungroup', {
                detail: { restored: result.restored, camIds: result.camIds },
            });
        }
        res.json({ ok: true, ...result });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.post('/api/dispatch-ptt-group', (req, res) => {
    try {
        const session = req.dashboardUser || dashboardAuth.sessionFromRequest(req);
        const body = req.body || {};
        const groupId = String(body.groupId || '').trim();
        const adhocCamIds = Array.isArray(body.camIds)
            ? body.camIds.map(String).map((id) => id.trim()).filter(Boolean)
            : [];
        if (!groupId && adhocCamIds.length < 2) {
            return res.status(400).json({
                ok: false,
                error: 'Select a map group or tick at least 2 online units',
            });
        }
        if (!PTT_ENABLED) {
            return res.status(503).json(opErr("PTT not enabled on server"));
        }

        let camIds = [];
        let groupName = '';
        let auditTarget = '';
        let adhoc = false;
        let resolvedGroupId = groupId || null;

        if (groupId) {
            assertSessionCanAccessGroup(session, groupId);
            const group = dispatchGroups.getGroup(groupId);
            if (!group) {
                return res.status(404).json(opErr("Group not found"));
            }
            const roster = dispatchGroups.memberDeviceIds(groupId);
            if (!roster.length) {
                return res.status(400).json(opErr("Group has no devices with IDs"));
            }
            if (adhocCamIds.length >= 2) {
                const rosterSet = new Set(roster);
                camIds = adhocCamIds.filter((id) => rosterSet.has(id));
                if (camIds.length < 2) {
                    return res.status(400).json({
                        ok: false,
                        error: 'Need at least 2 members from the selected group',
                    });
                }
            } else {
                camIds = roster;
            }
            groupName = group.name + (camIds.length < roster.length ? ' (' + camIds.length + ')' : '');
            auditTarget = group.name;
        } else if (adhocCamIds.length >= 2) {
            adhoc = true;
            camIds = adhocCamIds;
            resolvedGroupId = null;
            const teamPreview = sosResponseTeam.uniqueCamIds(camIds);
            const names = teamPreview.map((id) => resolveOperatorNameForCam(id)).filter(Boolean);
            if (names.length) {
                groupName = names[0] + (teamPreview.length > 1 ? ' +' + (teamPreview.length - 1) : '');
            } else {
                groupName = 'Quick PTT (' + teamPreview.length + ')';
            }
            auditTarget = groupName;
        } else {
            return res.status(400).json({
                ok: false,
                error: 'Select a map group or tick at least 2 online units',
            });
        }

        syncFleetDeviceMeta();
        const team = sosResponseTeam.uniqueCamIds(camIds);
        if (team.length < 2) {
            return res.status(400).json(opErr("Need at least 2 units for group PTT"));
        }
        team.forEach((id) => assertSessionCanAccessCam(session, id));
        const devices = sosResponseTeam.buildTeamPttDevices(team, resolveOperatorNameForCam);
        const pushResult = sosResponseTeam.pushPttGroupToTeam({
            sip,
            pttServer,
            camIds: team,
            getContactUriForCam,
            PTT_ENABLED,
            REALM,
            SERVER_ID,
            HOST,
            PTT_GTID,
            PTT_PORT,
            PTT_GROUP_STATUS,
            snid: '78',
            devices,
            log,
        });
        log.ptt.info('dispatch ptt group', {
            groupId: resolvedGroupId,
            groupName,
            adhoc,
            teamSize: team.length,
            pushed: pushResult.pushed,
        });
        auditLog.recordFromRequest(req, 'ptt.dispatch_group', {
            target: auditTarget,
            detail: { groupId: resolvedGroupId, adhoc, team, pushed: pushResult.pushed },
        });
        res.json({
            ok: true,
            pttTeam: {
                groupId: resolvedGroupId,
                groupName,
                adhoc,
                team,
                pushed: pushResult.pushed,
                skipped: pushResult.skipped,
            },
        });
    } catch (err) {
        res.status(err.status || 500).json(opErr(err));
    }
});

app.post('/api/sos-ptt-team', (req, res) => {
    try {
        const session = req.dashboardUser || dashboardAuth.sessionFromRequest(req);
        const body = req.body || {};
        const alarmCamId = String(body.cameraId || connectedCameraId || '').trim();
        const helperCamIds = Array.isArray(body.helperCamIds)
            ? body.helperCamIds.map(String).filter(Boolean)
            : [];
        if (!alarmCamId) {
            return res.status(400).json(opErr("cameraId required"));
        }
        assertSessionCanAccessCam(session, alarmCamId);
        helperCamIds.forEach((id) => assertSessionCanAccessCam(session, id));
        if (!PTT_ENABLED) {
            return res.status(503).json(opErr("PTT not enabled on server"));
        }
        const team = sosResponseTeam.uniqueCamIds([alarmCamId, ...helperCamIds]);
        syncFleetDeviceMeta();
        const devices = sosResponseTeam.buildTeamPttDevices(team, resolveOperatorNameForCam);
        const pushResult = sosResponseTeam.pushPttGroupToTeam({
            sip,
            pttServer,
            camIds: team,
            getContactUriForCam,
            PTT_ENABLED,
            REALM,
            SERVER_ID,
            HOST,
            PTT_GTID,
            PTT_PORT,
            PTT_GROUP_STATUS,
            snid: '77',
            devices,
            log,
        });
        const pttTeam = {
            team,
            pushed: pushResult.pushed,
            skipped: pushResult.skipped,
            pttOnline: team.map((id) => ({
                camId: id,
                pttOnline: pttServer.isDevicePttOnline(id),
            })),
        };
        log.ptt.info('sos ptt team (banner)', {
            alarmCamId,
            teamSize: team.length,
            pushed: pushResult.pushed,
        });
        auditLog.recordFromRequest(req, 'sos.ptt_team', {
            target: alarmCamId,
            detail: { team: pttTeam.team, pushed: pushResult.pushed },
        });
        res.json({ ok: true, pttTeam });
    } catch (err) {
        res.status(err.status || 500).json(opErr(err));
    }
});

app.post('/api/sos-ptt-team-add', (req, res) => {
    try {
        const session = req.dashboardUser || dashboardAuth.sessionFromRequest(req);
        const body = req.body || {};
        const alarmCamId = String(body.cameraId || connectedCameraId || '').trim();
        const helperCamIds = Array.isArray(body.helperCamIds)
            ? body.helperCamIds.map(String).filter(Boolean)
            : [];
        const existingTeam = Array.isArray(body.existingTeam)
            ? body.existingTeam.map(String).filter(Boolean)
            : [];
        if (!alarmCamId) {
            return res.status(400).json(opErr("cameraId required"));
        }
        if (!helperCamIds.length) {
            return res.status(400).json(opErr("helperCamIds required"));
        }
        assertSessionCanAccessCam(session, alarmCamId);
        helperCamIds.forEach((id) => assertSessionCanAccessCam(session, id));
        if (!PTT_ENABLED) {
            return res.status(503).json(opErr("PTT not enabled on server"));
        }
        const prior = sosResponseTeam.uniqueCamIds(
            existingTeam.length ? existingTeam : [alarmCamId],
        );
        const team = sosResponseTeam.uniqueCamIds([...prior, ...helperCamIds]);
        const priorSet = new Set(prior);
        const newIds = team.filter((id) => !priorSet.has(id));
        if (!newIds.length) {
            return res.status(400).json(opErr("Unit already on PTT team"));
        }
        syncFleetDeviceMeta();
        const devices = sosResponseTeam.buildTeamPttDevices(team, resolveOperatorNameForCam);
        const pushResult = sosResponseTeam.pushPttGroupToTeam({
            sip,
            pttServer,
            camIds: newIds,
            getContactUriForCam,
            PTT_ENABLED,
            REALM,
            SERVER_ID,
            HOST,
            PTT_GTID,
            PTT_PORT,
            PTT_GROUP_STATUS,
            snid: '77',
            devices,
            log,
        });
        const pttTeam = {
            team,
            added: newIds,
            pushed: pushResult.pushed,
            skipped: pushResult.skipped,
            pttOnline: team.map((id) => ({
                camId: id,
                pttOnline: pttServer.isDevicePttOnline(id),
            })),
        };
        log.ptt.info('sos ptt team (add helpers)', {
            alarmCamId,
            teamSize: team.length,
            added: newIds,
            pushed: pushResult.pushed,
        });
        auditLog.recordFromRequest(req, 'sos.ptt_team_add', {
            target: alarmCamId,
            detail: { team: pttTeam.team, added: newIds, pushed: pushResult.pushed },
        });
        res.json({ ok: true, pttTeam });
    } catch (err) {
        res.status(err.status || 500).json(opErr(err));
    }
});

app.get('/api/server-settings', (req, res) => {
    const settings = serverSettings.load(STORAGE_DIR);
    const bwcData = loadBwcDevices();
    const session = req.dashboardUser || dashboardAuth.sessionFromRequest(req);
    const canManage = session && dashboardAuth.roleCanManageServer(session.role);
    const runtime = runtimePortSnapshot();
    res.json({
        settings: serverSettings.publicView(settings),
        bwc: serverSettings.bwcChecklist(settings),
        firewall: serverSettings.firewallChecklist(settings, runtime),
        runtime,
        deploymentHint: serverSettings.deploymentHints(settings.deployment.mode),
        docking: {
            ftpRoot: currentFtpRoot(),
            ftpLabel: storagePaths.displayPath(currentFtpRoot(), BASE_DIR),
        },
        session: session ? {
            username: session.username,
            role: session.role,
            canManageServer: canManage,
            canManageUsers: dashboardAuth.roleCanManageUsers(session.role),
        } : null,
        bwcDevices: {
            count: bwcData.devices.length,
            devices: bwcData.devices.map((d) => ({
                deviceId: d.deviceId,
                operatorName: d.operatorName,
                mapGroup: d.mapGroup,
            })),
        },
        siteTimezones: siteTime.listTimezones(),
        siteTimePreview: siteTime.formatEvidence(new Date()),
        siteTimezone: siteTime.getTimezone(),
    });
});

app.post('/api/server-settings', dashboardAuth.requireSuperAdmin, (req, res) => {
    try {
        const body = req.body || {};
        if (reverifyForbidden(req, res, body)) return;
        bwcNetwork.assertBwcRegisterIp(body.publicHost);
        const current = serverSettings.load(STORAGE_DIR);
        const settings = serverSettings.save(STORAGE_DIR, Object.assign({}, current, body));
        if (settings.site && settings.site.timezone) siteTime.configure(settings.site.timezone);
        tenantProfile.save(STORAGE_DIR, settings);
        refreshEvidenceStorage();
        auditLog.recordFromRequest(req, 'server.settings.save', {
            target: settings.publicHost,
            detail: {
                mode: settings.deployment && settings.deployment.mode,
                ftpUploadPath: settings.docking && settings.docking.ftpUploadPath,
            },
        });
        res.json({
            ok: true,
            settings: serverSettings.publicView(settings),
            bwc: serverSettings.bwcChecklist(settings),
            firewall: serverSettings.firewallChecklist(settings, runtimePortSnapshot()),
            docking: {
                ftpRoot: FTP_ROOT,
                ftpLabel: storagePaths.displayPath(FTP_ROOT, BASE_DIR),
            },
            siteTimePreview: siteTime.formatEvidence(new Date()),
            siteTimezone: siteTime.getTimezone(),
            ftpRestartRequired: true,
        });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.post('/api/docking-settings', dashboardAuth.requireSuperAdmin, (req, res) => {
    try {
        const body = req.body || {};
        if (reverifyForbidden(req, res, body)) return;
        const current = serverSettings.load(STORAGE_DIR);
        const ftpUploadPath = body.ftpUploadPath != null ? String(body.ftpUploadPath).trim() : '';
        const next = serverSettings.save(STORAGE_DIR, Object.assign({}, current, {
            docking: { ftpUploadPath: ftpUploadPath },
        }));
        refreshEvidenceStorage();
        auditLog.recordFromRequest(req, 'docking.settings.save', {
            detail: { ftpUploadPath: next.docking && next.docking.ftpUploadPath },
        });
        res.json({
            ok: true,
            docking: {
                ftpRoot: FTP_ROOT,
                ftpLabel: storagePaths.displayPath(FTP_ROOT, BASE_DIR),
            },
            ftpRestartRequired: true,
        });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.get('/api/evidence-settings', (req, res) => {
    try {
        const settings = serverSettings.load(STORAGE_DIR);
        res.json(evidenceSettingsPayload(settings));
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.get('/api/evidence-settings/browse-paths', dashboardAuth.requireSuperAdmin, (req, res) => {
    try {
        const storageBrowse = require('./lib/storageBrowse');
        const settings = serverSettings.load(STORAGE_DIR);
        let pathParam = req.query && req.query.path != null ? String(req.query.path) : '';
        if (!pathParam && req.query && req.query.start) {
            const startPath = storageBrowse.resolveStartPath(BASE_DIR, settings, String(req.query.start));
            if (startPath) pathParam = startPath;
        }
        const result = storageBrowse.listDirectory(BASE_DIR, pathParam || '__roots__');
        res.json(Object.assign({ ok: true }, result));
    } catch (err) {
        res.status(400).json(opErr(err));
    }
});

app.post('/api/evidence-settings/test-paths', dashboardAuth.requireSuperAdmin, (req, res) => {
    try {
        const settings = serverSettings.load(STORAGE_DIR);
        const body = req.body || {};
        const ev = body.evidence || body;
        const draft = Object.assign({}, settings, {
            evidence: Object.assign({}, settings.evidence || {}, {
                archivePrimary: storagePaths.normalizeArchivePrimary(
                    ev.archivePrimary != null ? ev.archivePrimary : (settings.evidence && settings.evidence.archivePrimary)
                ),
                nasMountPath: ev.nasMountPath != null
                    ? String(ev.nasMountPath).trim()
                    : ((settings.evidence && settings.evidence.nasMountPath) || ''),
                liveCapturePath: ev.liveCapturePath != null
                    ? String(ev.liveCapturePath).trim()
                    : ((settings.evidence && settings.evidence.liveCapturePath) || ''),
            }),
            docking: Object.assign({}, settings.docking || {}, {
                ftpUploadPath: ev.ftpUploadPath != null
                    ? String(ev.ftpUploadPath).trim()
                    : ((settings.docking && settings.docking.ftpUploadPath) || ''),
            }),
        });
        const payload = evidenceSettingsPayload(draft);
        res.json(Object.assign({ ok: true, tested: true }, payload));
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.post('/api/evidence/scan-catalog', dashboardAuth.requireSuperAdmin, (req, res) => {
    try {
        refreshEvidenceStorage();
        const count = evidenceRegistry.scanFtpRoot(req.body && req.body.limit ? req.body.limit : 400);
        auditLog.recordFromRequest(req, 'evidence.catalog.scan', { detail: { indexed: count } });
        res.json({ ok: true, indexed: count });
    } catch (err) {
        log.web.warn('evidence catalog scan failed', { message: err.message });
        res.status(500).json(opErr(err));
    }
});

app.get('/api/voice-alerts-settings', (req, res) => {
    try {
        const settings = serverSettings.load(STORAGE_DIR);
        res.json({
            ok: true,
            voiceAlerts: settings.voiceAlerts || serverSettings.voiceAlertsDefaults(),
        });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.post('/api/voice-alerts-settings', dashboardAuth.requireSuperAdmin, (req, res) => {
    try {
        const body = req.body || {};
        const current = serverSettings.load(STORAGE_DIR);
        const vaIn = body.voiceAlerts || body;
        const next = serverSettings.save(STORAGE_DIR, Object.assign({}, current, {
            voiceAlerts: serverSettings.normalizeVoiceAlerts(vaIn),
        }));
        auditLog.recordFromRequest(req, 'voice_alerts.settings.save', {
            detail: {
                enabled: next.voiceAlerts.enabled,
                autoSpeak: next.voiceAlerts.autoSpeak,
            },
        });
        res.json({ ok: true, voiceAlerts: next.voiceAlerts });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.post('/api/evidence-settings', dashboardAuth.requireSuperAdmin, (req, res) => {
    try {
        const body = req.body || {};
        if (reverifyForbidden(req, res, body)) return;
        const current = serverSettings.load(STORAGE_DIR);
        const evIn = body.evidence || body;
        const archivePrimary = storagePaths.normalizeArchivePrimary(evIn.archivePrimary);
        const nasMountPath = evIn.nasMountPath != null
            ? String(evIn.nasMountPath).trim()
            : (current.evidence && current.evidence.nasMountPath) || '';
        if (archivePrimary === 'network') {
            if (!nasMountPath) {
                return res.status(400).json(opErr("IP SAN / NAS mount path is required when using network archive."));
            }
            const nasPath = storagePaths.resolveNasPath(BASE_DIR, nasMountPath);
            if (!storagePaths.pathExistsOnDisk(nasPath)) {
                return res.status(400).json({
                    ok: false,
                    error: 'Mount folder not found on this server. Connect iSCSI/NFS/SMB and assign a drive letter or mount point first.',
                });
            }
        }
        const applyRecommended = !!(evIn.applyRecommended || body.applyRecommended);
        let ftpUploadPath = evIn.ftpUploadPath != null
            ? String(evIn.ftpUploadPath).trim()
            : (current.docking && current.docking.ftpUploadPath) || '';
        let liveCapturePath = evIn.liveCapturePath != null
            ? String(evIn.liveCapturePath).trim()
            : (current.evidence && current.evidence.liveCapturePath) || 'evidence/live-capture';
        if (applyRecommended && archivePrimary === 'network') {
            const nasPath = storagePaths.resolveNasPath(BASE_DIR, nasMountPath);
            const rec = storagePaths.recommendedNetworkPaths(nasPath);
            if (rec) {
                ftpUploadPath = rec.ftp;
                liveCapturePath = rec.liveCapture;
                storagePaths.ensureNetworkLayout(BASE_DIR, {
                    evidence: { archivePrimary: 'network', nasMountPath: nasMountPath },
                });
            }
        }
        const next = serverSettings.save(STORAGE_DIR, Object.assign({}, current, {
            docking: Object.assign({}, current.docking || {}, {
                ftpUploadPath: ftpUploadPath,
            }),
            evidence: {
                archivePrimary: archivePrimary,
                liveCaptureEnabled: evIn.liveCaptureEnabled != null ? !!evIn.liveCaptureEnabled : !!(current.evidence && current.evidence.liveCaptureEnabled),
                liveCapturePath: liveCapturePath,
                liveCaptureAutoOnSos: evIn.liveCaptureAutoOnSos != null ? !!evIn.liveCaptureAutoOnSos : !!(current.evidence && current.evidence.liveCaptureAutoOnSos),
                retentionDays: evIn.retentionDays != null ? parseInt(evIn.retentionDays, 10) || 0 : (current.evidence && current.evidence.retentionDays) || 0,
                nasMountPath: nasMountPath,
                dockFtpTargetNote: evIn.dockFtpTargetNote != null ? String(evIn.dockFtpTargetNote).trim() : (current.evidence && current.evidence.dockFtpTargetNote) || '',
                sanInstallerNote: evIn.sanInstallerNote != null ? String(evIn.sanInstallerNote).trim() : (current.evidence && current.evidence.sanInstallerNote) || '',
            },
        }));
        if (siteDb.isReady()) {
            const arch = siteDb.getSetting('archive', {}) || {};
            siteDb.setSetting('archive', Object.assign({}, arch, {
                primary: archivePrimary,
                nasPath: nasMountPath,
                localPath: STORAGE_DIR,
            }));
        }
        const roots = refreshEvidenceStorage();
        auditLog.recordFromRequest(req, 'evidence.settings.save', {
            detail: {
                archivePrimary: next.evidence.archivePrimary,
                liveCaptureEnabled: next.evidence.liveCaptureEnabled,
                liveCapturePath: next.evidence.liveCapturePath,
                nasMountPath: nasMountPath,
            },
        });
        res.json(Object.assign(evidenceSettingsPayload(next), {
            appliedRecommended: applyRecommended,
        }));
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.post('/api/ftp-settings', dashboardAuth.requireSuperAdmin, async (req, res) => {
    try {
        const body = req.body || {};
        if (reverifyForbidden(req, res, body)) return;
        const ftpIn = body.ftp || body;
        const current = serverSettings.load(STORAGE_DIR);
        const currentFtp = serverSettings.resolveFtpRuntime(current);
        let password = currentFtp.password;
        if (ftpIn.password != null && String(ftpIn.password).trim() !== '') {
            password = String(ftpIn.password).trim();
        }
        const nextFtp = serverSettings.normalizeFtp({
            enabled: ftpIn.enabled != null ? !!ftpIn.enabled : currentFtp.enabled,
            port: ftpIn.port != null ? parseInt(ftpIn.port, 10) : currentFtp.port,
            user: ftpIn.user != null ? String(ftpIn.user).trim() : currentFtp.user,
            password,
            pasvMin: ftpIn.pasvMin != null ? parseInt(ftpIn.pasvMin, 10) : currentFtp.pasvMin,
            pasvMax: ftpIn.pasvMax != null ? parseInt(ftpIn.pasvMax, 10) : currentFtp.pasvMax,
        }, serverSettings.ftpDefaultsFromEnv());
        if (nextFtp.enabled) {
            if (!nextFtp.user) {
                return res.status(400).json(opErr('FTP username is required when FTP ingest is enabled.'));
            }
            if (!nextFtp.password) {
                return res.status(400).json(opErr('FTP password is required when FTP ingest is enabled.'));
            }
            if (nextFtp.password.length < 4) {
                return res.status(400).json(opErr('FTP password must be at least 4 characters.'));
            }
        }
        const next = serverSettings.save(STORAGE_DIR, Object.assign({}, current, { ftp: nextFtp }));
        loadFtpRuntimeFromSettings();
        const restart = await restartFtpServerRuntime();
        auditLog.recordFromRequest(req, 'ftp.settings.save', {
            detail: {
                enabled: nextFtp.enabled,
                port: nextFtp.port,
                user: nextFtp.user,
                pasvMin: nextFtp.pasvMin,
                pasvMax: nextFtp.pasvMax,
                listening: ftpServerListening,
            },
        });
        res.json({
            ok: true,
            ftp: serverSettings.ftpPublicView(next),
            runtime: runtimePortSnapshot(),
            ftpRestarted: restart.ok,
            ftpRestartReason: restart.reason || null,
        });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

function requireMapDeviceControl(req, res, next) {
    const session = req.dashboardUser;
    const perms = session && dashboardAuth.getPermissionsForSession(session);
    if (!session || !perms || !perms.mapDeviceControl) {
        return res.status(403).json(opErr("Map remote control permission required"));
    }
    return next();
}

app.post('/api/evidence/live-record/start', requireMapDeviceControl, (req, res) => {
    try {
        const camId = String((req.body && req.body.camId) || '').trim();
        if (!camId) return res.status(400).json(opErr("camId required"));
        const out = liveCapture.start(camId);
        auditLog.recordFromRequest(req, 'evidence.live_record_start', {
            target: camId,
            detail: { fileName: out.fileName },
        });
        res.json({ ok: true, recording: out });
    } catch (err) {
        res.status(400).json(opErr(err));
    }
});

app.post('/api/evidence/live-record/stop', requireMapDeviceControl, async (req, res) => {
    try {
        const camId = String((req.body && req.body.camId) || '').trim();
        if (!camId) return res.status(400).json(opErr("camId required"));
        const out = await liveCapture.stop(camId);
        auditLog.recordFromRequest(req, 'evidence.live_record_stop', {
            target: camId,
            detail: { evidenceId: out.evidenceId, fileName: out.fileName },
        });
        res.json({ ok: true, recording: out });
    } catch (err) {
        res.status(400).json(opErr(err));
    }
});

app.get('/api/evidence/live-record/status', (req, res) => {
    try {
        const camId = req.query && req.query.camId ? String(req.query.camId).trim() : null;
        res.json({ ok: true, status: liveCapture.status(camId) });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.get('/api/audit-log', dashboardAuth.requireSuperAdmin, (req, res) => {
    const limit = parseInt(req.query.limit, 10) || 100;
    const since = req.query.since || null;
    res.json({
        ok: true,
        entries: auditLog.list({ limit, since }),
    });
});

function auditTrailDisplayName(deviceId) {
    const camId = String(deviceId || '').trim();
    if (!camId) return '';
    try {
        const bwcData = loadBwcDevices();
        const row = bwcDevices.findById(bwcData, camId);
        if (row && row.operatorName) return String(row.operatorName).trim();
    } catch (_) { /* ignore */ }
    return fleetRegistry.displayName(camId);
}

function requireAuditView(req, res, next) {
    const session = req.dashboardUser || dashboardAuth.sessionFromRequest(req);
    if (!session || !dashboardAuth.canAuditView(session)) {
        return res.status(403).json(opErr("Audit trail access required"));
    }
    return next();
}

function requireAuditExport(req, res, next) {
    const session = req.dashboardUser || dashboardAuth.sessionFromRequest(req);
    if (!session || !dashboardAuth.canAuditExport(session)) {
        return res.status(403).json(opErr("Audit export permission required"));
    }
    return next();
}

app.get('/api/audit-trail/meta', requireAuditView, (req, res) => {
    try {
        res.json({ ok: true, meta: auditTrail.listMeta() });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.get('/api/audit-trail', requireAuditView, (req, res) => {
    try {
        const q = req.query || {};
        const out = auditTrail.list({
            limit: q.limit,
            offset: q.offset,
            since: q.since,
            until: q.until,
            actor: q.actor,
            action: q.action,
            category: q.category,
            q: q.q,
            preset: q.preset,
        }, auditTrailDisplayName);
        res.json({ ok: true, trail: out });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.get('/api/audit-trail/export.csv', requireAuditExport, (req, res) => {
    try {
        const q = req.query || {};
        const out = auditTrail.exportCsv({
            since: q.since,
            until: q.until,
            actor: q.actor,
            action: q.action,
            category: q.category,
            q: q.q,
            preset: q.preset,
            limit: q.limit,
        }, auditTrailDisplayName);
        auditLog.recordFromRequest(req, 'audit.export', {
            detail: {
                format: 'csv',
                rowCount: out.rowCount,
                totalMatched: out.totalMatched,
                filters: {
                    since: q.since || null,
                    until: q.until || null,
                    category: q.category || null,
                    actor: q.actor || null,
                    action: q.action || null,
                    q: q.q || null,
                },
            },
        });
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="' + out.filename + '"');
        res.send(out.csv);
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

function requireOverlayView(req, res, next) {
    const session = req.dashboardUser || dashboardAuth.sessionFromRequest(req);
    if (!session || !operationOverlay.canView(session)) {
        return res.status(403).json(opErr("Operation overlay access required"));
    }
    req.dashboardUser = session;
    return next();
}

function requireOverlayEdit(req, res, next) {
    const session = req.dashboardUser || dashboardAuth.sessionFromRequest(req);
    if (!session || !operationOverlay.canEdit(session)) {
        return res.status(403).json(opErr("Operation overlay edit permission required"));
    }
    req.dashboardUser = session;
    return next();
}

function requireOverlayClose(req, res, next) {
    const session = req.dashboardUser || dashboardAuth.sessionFromRequest(req);
    if (!session || !operationOverlay.canClose(session)) {
        return res.status(403).json(opErr("Operation overlay close permission required"));
    }
    req.dashboardUser = session;
    return next();
}

app.get('/api/operations/meta', requireOverlayView, (req, res) => {
    try {
        res.json(operationOverlay.metaForUser(req.dashboardUser));
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.get('/api/operations/active/map-overlays', requireOverlayView, (req, res) => {
    try {
        res.json(operationOverlay.listActiveMapOverlays(req.dashboardUser));
    } catch (err) {
        res.status(400).json(opErr(err));
    }
});

app.get('/api/operations', requireOverlayView, (req, res) => {
    try {
        res.json(operationOverlay.listOperations(req.dashboardUser, req.query));
    } catch (err) {
        res.status(400).json(opErr(err));
    }
});

app.post('/api/operations', requireOverlayEdit, express.json(), (req, res) => {
    try {
        const out = operationOverlay.createOperation(req.dashboardUser, req.body);
        auditLog.recordFromRequest(req, 'operation.create', {
            target: out.operation.id,
            detail: { title: out.operation.title, status: out.operation.status },
        });
        res.json(out);
    } catch (err) {
        res.status(400).json(opErr(err));
    }
});

app.get('/api/operations/:id', requireOverlayView, (req, res) => {
    try {
        res.json(operationOverlay.getOperation(req.dashboardUser, req.params.id));
    } catch (err) {
        const code = err.message === 'Operation not found' || err.message === 'Operation not visible' ? 404 : 400;
        res.status(code).json(opErr(err));
    }
});

app.patch('/api/operations/:id', requireOverlayEdit, express.json(), (req, res) => {
    try {
        const out = operationOverlay.updateOperation(req.dashboardUser, req.params.id, req.body);
        auditLog.recordFromRequest(req, 'operation.update', {
            target: req.params.id,
            detail: { title: out.operation.title },
        });
        res.json(out);
    } catch (err) {
        const code = err.message === 'Operation not found' ? 404 : 400;
        res.status(code).json(opErr(err));
    }
});

app.post('/api/operations/:id/activate', requireOverlayEdit, (req, res) => {
    try {
        const out = operationOverlay.activateOperation(req.dashboardUser, req.params.id);
        auditLog.recordFromRequest(req, 'operation.activate', {
            target: req.params.id,
            detail: { title: out.operation.title },
        });
        res.json(out);
    } catch (err) {
        const code = err.message === 'Operation not found' ? 404 : 400;
        res.status(code).json(opErr(err));
    }
});

app.post('/api/operations/:id/close', requireOverlayClose, (req, res) => {
    try {
        const out = operationOverlay.closeOperation(req.dashboardUser, req.params.id);
        auditLog.recordFromRequest(req, 'operation.close', {
            target: req.params.id,
            detail: { title: out.operation.title },
        });
        res.json(out);
    } catch (err) {
        const code = err.message === 'Operation not found' ? 404 : 400;
        res.status(code).json(opErr(err));
    }
});

app.get('/api/operations/:id/overlays', requireOverlayView, (req, res) => {
    try {
        res.json(operationOverlay.listOverlays(req.dashboardUser, req.params.id));
    } catch (err) {
        const code = err.message === 'Operation not found' || err.message === 'Operation not visible' ? 404 : 400;
        res.status(code).json(opErr(err));
    }
});

app.post('/api/operations/:id/overlays', requireOverlayEdit, express.json(), (req, res) => {
    try {
        const out = operationOverlay.createOverlay(req.dashboardUser, req.params.id, req.body);
        auditLog.recordFromRequest(req, 'overlay.create', {
            target: out.pin.id,
            detail: {
                operationId: req.params.id,
                pinType: out.pin.pinType,
                title: out.pin.title,
            },
        });
        res.json(out);
    } catch (err) {
        const code = err.message === 'Operation not found' ? 404 : 400;
        res.status(code).json(opErr(err));
    }
});

app.patch('/api/overlays/:pinId', requireOverlayEdit, express.json(), (req, res) => {
    try {
        const out = operationOverlay.updateOverlay(req.dashboardUser, req.params.pinId, req.body);
        auditLog.recordFromRequest(req, 'overlay.update', {
            target: req.params.pinId,
            detail: { operationId: out.pin.operationId, title: out.pin.title },
        });
        res.json(out);
    } catch (err) {
        const code = err.message === 'Overlay pin not found' ? 404 : 400;
        res.status(code).json(opErr(err));
    }
});

app.delete('/api/overlays/:pinId', requireOverlayEdit, (req, res) => {
    try {
        const out = operationOverlay.deleteOverlay(req.dashboardUser, req.params.pinId);
        auditLog.recordFromRequest(req, 'overlay.delete', { target: req.params.pinId });
        res.json(out);
    } catch (err) {
        const code = err.message === 'Overlay pin not found' ? 404 : 400;
        res.status(code).json(opErr(err));
    }
});

app.get('/api/platform/status', (req, res) => {
    const settings = serverSettings.load(STORAGE_DIR);
    const profile = tenantProfile.load(STORAGE_DIR, settings);
    const limits = platformLimits.loadLimits();
    const ffmpeg = ffmpegRuntime.getCachedCheck() || { ok: false };
    const bwcData = loadBwcDevices();
    const users = dashboardAuth.listUsersPublic();
    const session = req.dashboardUser || dashboardAuth.sessionFromRequest(req);
    res.json({
        ok: true,
        tenant: {
            tenantId: profile.tenantId,
            displayName: profile.displayName,
            bwcRegisterIp: settings.publicHost,
            operatorLoginUrl: profile.operatorLoginUrl || settings.deployment.operatorUrl,
            deploymentMode: profile.deploymentMode,
            networkAccess: settings.deployment.networkAccess,
            plan: profile.plan,
        },
        limits: profile.limits,
        usage: {
            bwcDevices: bwcData.devices.length,
            dashboardUsers: users.length,
        },
        ffmpeg: {
            ok: ffmpeg.ok,
            bundled: ffmpeg.bundled,
            source: ffmpeg.source,
            path: ffmpeg.path,
            version: ffmpeg.versionLine,
        },
        capabilities: tenantProfile.capabilities(),
        rentalMode: limits.rentalMode,
        limitsSource: limits.limitsSource,
        license: platformLicense.getStatusPublic(),
        licenseHeartbeat: licenseHeartbeat.getStatusPublic(),
        siteNode: siteDb.isReady() ? siteDb.getSetting('siteNode', null) : null,
        archive: siteDb.isReady() ? siteDb.getSetting('archive', null) : null,
        registryBackend: siteDb.isReady() ? 'sqlite' : 'json',
        sessionRole: session ? session.role : null,
    });
});

app.get('/api/users/me', (req, res) => {
    const session = req.dashboardUser || dashboardAuth.sessionFromRequest(req);
    if (!session) return res.status(401).json(opErr("Unauthorized"));
    const user = dashboardAuth.listUsersPublic(true).find((u) => u.id === session.userId);
    if (!user) return res.status(404).json(opErr("User not found"));
    return res.json({ ok: true, user });
});

app.get('/api/users', dashboardAuth.requireSuperAdmin, (req, res) => {
    const limits = platformLimits.loadLimits();
    const users = dashboardAuth.listUsersPublic(true);
    const superAdminCount = users.filter((u) => u.role === 'super_admin').length;
    res.json({
        ok: true,
        users,
        superAdminCount,
        maxSuperAdmins: limits.maxSuperAdmins,
        secureEvidenceExport: evidenceSecureExport.secureExportEnabled(),
    });
});

app.post('/api/users', dashboardAuth.requireSuperAdmin, (req, res) => {
    try {
        const body = req.body || {};
        if (reverifyForbidden(req, res, body)) return;
        const role = body.role === 'super_admin' ? 'super_admin' : 'operator';
        const created = dashboardAuth.createUser({
            username: body.username,
            password: body.password,
            role: role,
            assignedGroupIds: body.assignedGroupIds,
            displayName: body.displayName,
            contactNote: body.contactNote,
        });
        log.web.info('dashboard user created', { username: created.username, role: created.role });
        auditLog.recordFromRequest(req, 'user.create', {
            target: created.username,
            detail: { role: created.role },
        });
        res.json({ ok: true, user: created });
    } catch (err) {
        res.status(400).json(opErr(err));
    }
});

app.patch('/api/users/:id', dashboardAuth.requireSuperAdmin, (req, res) => {
    try {
        const body = req.body || {};
        if (reverifyForbidden(req, res, body)) return;
        const patch = Object.assign({}, body);
        delete patch.adminPassword;
        delete patch.reverifyToken;
        const updated = dashboardAuth.updateUser(req.params.id, patch);
        log.web.info('dashboard user updated', { username: updated.username, role: updated.role });
        auditLog.recordFromRequest(req, 'user.update', {
            target: updated.username,
            detail: { role: updated.role, permissions: updated.permissions },
        });
        res.json({ ok: true, user: updated });
    } catch (err) {
        res.status(400).json(opErr(err));
    }
});

app.get('/api/usb-maintenance/status', dashboardAuth.requireSuperAdmin, (req, res) => {
    try {
        res.json({ ok: true, status: usbMaintenance.getStatusPublic() });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.get('/api/usb-maintenance/devices', dashboardAuth.requireSuperAdmin, (req, res) => {
    try {
        if (!usbMaintenance.isSupportedPlatform()) {
            return res.json({
                ok: true,
                supported: false,
                devices: [],
                error: 'USB maintenance requires Windows on the dispatch PC',
            });
        }
        usbMaintenance.listDevices()
            .then((data) => res.json(Object.assign({ ok: true }, data)))
            .catch((err) => res.status(500).json(opErr(err, { devices: [] })));
    } catch (err) {
        res.status(500).json(opErr(err, { devices: [] }));
    }
});

app.post('/api/usb-maintenance/action', dashboardAuth.requireSuperAdmin, async (req, res) => {
    try {
        const body = req.body || {};
        const action = String(body.action || '').trim();
        const serial = body.serial ? String(body.serial).trim() : '';
        if (usbMaintenance.DESTRUCTIVE_ACTIONS.has(action)) {
            if (!dashboardAuth.verifySessionPassword(req.dashboardUser, body.adminPassword)) {
                return res.status(403).json(opErr("Your super admin password is required"));
            }
        }
        const result = await usbMaintenance.runAction(action, serial, body);
        auditLog.recordFromRequest(req, 'usb.maintenance.' + action, {
            target: serial || action,
            detail: { action, serial: serial || null },
        });
        res.json({ ok: true, result });
    } catch (err) {
        const code = err.code === 'CLEAR_NOT_CONFIGURED' || err.code === 'ADB_MISSING' ? 400 : 500;
        res.status(code).json(opErr(err, { code: err.code || null }));
    }
});

app.post('/api/usb-maintenance/launch-tool', dashboardAuth.requireSuperAdmin, async (req, res) => {
    try {
        const body = req.body || {};
        if (!dashboardAuth.verifySessionPassword(req.dashboardUser, body.adminPassword)) {
            return res.status(403).json(opErr("Your super admin password is required"));
        }
        const result = usbMaintenance.launchVendorTool();
        auditLog.recordFromRequest(req, 'usb.maintenance.launch-tool', { target: 'SettingToolEx.exe' });
        res.json({ ok: true, result });
    } catch (err) {
        const code = err.code === 'TOOL_MISSING' ? 400 : 500;
        res.status(code).json(opErr(err, { code: err.code || null }));
    }
});

function persistDispatchGroupsAndSyncBwc(groups) {
    const saved = dispatchGroups.saveGroups(groups);
    invalidateBwcDevicesCache();
    const bwcCurrent = loadBwcDevices();
    const merged = dispatchGroups.syncGroupsToBwcDevices(bwcCurrent, saved);
    const written = bwcDevices.write(BWC_DEVICES_PATH, merged);
    bwcDevicesCache = written;
    fleetRegistry.refreshDeviceMeta(written, VIDEO_CHANNELS_PATH);
    return saved;
}

function listDispatchGroupsForScope() {
    return dispatchGroups.listGroups();
}

function fleetForSession(session) {
    const groups = listDispatchGroupsForScope();
    const user = dispatchScope.userFromSession(session);
    return dispatchScope.filterFleetForUser(fleetRegistry.getDashboardFleet(), user, groups);
}

function sessionCanSeeCam(session, camId) {
    if (!camId) return true;
    const groups = listDispatchGroupsForScope();
    return dispatchScope.sessionCanAccessDevice(session, camId, groups);
}

function dispatchScopePayloadForSession(session) {
    return dispatchScope.publicScopePayload(session, listDispatchGroupsForScope());
}

function filterSosQueueForSession(session, snap) {
    if (!snap) return snap;
    const scope = dispatchScope.scopeForUser(
        dispatchScope.userFromSession(session),
        listDispatchGroupsForScope(),
    );
    if (scope.seeAll) return snap;
    const keep = (arr) => (arr || []).filter((id) => sessionCanSeeCam(session, id));
    const active = keep(snap.active);
    return Object.assign({}, snap, {
        active,
        queued: keep(snap.queued),
        pending: keep(snap.pending),
        slotsUsed: active.length,
        slotsFree: Math.max(0, (snap.maxLive || 6) - active.length),
    });
}

function emitToDashboardSockets(event, payload, camId) {
    const id = camId != null ? camId : (payload && (payload.cameraId || payload.camId));
    io.sockets.sockets.forEach((sock) => {
        if (!id || sessionCanSeeCam(sock.dashboardUser, id)) {
            sock.emit(event, payload);
        }
    });
}

function emitFleetRosterToDashboards() {
    syncFleetDeviceMeta();
    const groups = listDispatchGroupsForScope();
    const full = fleetRegistry.getDashboardFleet();
    io.sockets.sockets.forEach((sock) => {
        const user = dispatchScope.userFromSession(sock.dashboardUser);
        sock.emit('fleet-roster', dispatchScope.filterFleetForUser(full, user, groups));
    });
}

function emitSosQueueToDashboards(snap) {
    const payload = snap || sosInviteQueue.getSnapshot();
    io.sockets.sockets.forEach((sock) => {
        sock.emit('sos-queue-update', filterSosQueueForSession(sock.dashboardUser, payload));
    });
}

function assertSessionCanAccessCam(session, camId) {
    if (!camId) return;
    if (!sessionCanSeeCam(session, camId)) {
        const err = new Error('Device not in your dispatch scope');
        err.status = 403;
        throw err;
    }
}

function assertSessionCanAccessGroup(session, groupId) {
    if (!groupId) return;
    const user = dispatchScope.userFromSession(session);
    const scope = dispatchScope.scopeForUser(user, listDispatchGroupsForScope());
    if (scope.seeAll) return;
    if (!scope.groupIds.includes(String(groupId).trim())) {
        const err = new Error('Dispatch group not in your scope');
        err.status = 403;
        throw err;
    }
}

function filterBwcDevicesForSession(session, data) {
    const user = dispatchScope.userFromSession(session);
    const scope = dispatchScope.scopeForUser(user, listDispatchGroupsForScope());
    if (scope.seeAll) return data;
    const devices = (data.devices || []).filter((row) => {
        const id = row && row.deviceId ? String(row.deviceId).trim() : '';
        return id && scope.deviceIds.has(id);
    });
    return { devices };
}

function buildMapPositionsPayload(session) {
    syncFleetDeviceMeta();
    const fleet = fleetRegistry.getDashboardFleet();
    const devices = [];
    const seen = new Set();
    fleet.forEach((d) => {
        if (!d || !d.id || !isBwcCameraId(d.id)) return;
        const g = lastGpsByCam[d.id];
        if (!g || g.lat == null || g.lon == null) return;
        seen.add(d.id);
        devices.push({
            cameraId: d.id,
            lat: g.lat,
            lon: g.lon,
            online: !!d.online,
            name: d.name || d.id,
            operatorName: d.name || '',
            mapGroup: fleetRegistry.getMapGroup(d.id) || '',
            geofenceOutside: isGeofenceOutside(d.id),
        });
    });
    const bwcData = loadBwcDevices();
    (bwcData.devices || []).forEach((row) => {
        const id = row && row.deviceId ? String(row.deviceId).trim() : '';
        if (!id || !isBwcCameraId(id) || seen.has(id)) return;
        const g = lastGpsByCam[id];
        if (!g || g.lat == null || g.lon == null) return;
        seen.add(id);
        const fleetRec = fleet.find((x) => x && x.id === id);
        devices.push({
            cameraId: id,
            lat: g.lat,
            lon: g.lon,
            online: !!(fleetRec && fleetRec.online),
            name: (fleetRec && fleetRec.name) || row.operatorName || id,
            operatorName: row.operatorName || '',
            mapGroup: row.mapGroup || fleetRegistry.getMapGroup(id) || '',
            geofenceOutside: isGeofenceOutside(id),
        });
    });
    const pendingGps = [];
    fleet.forEach((d) => {
        if (!d || !d.id || !isBwcCameraId(d.id) || !d.online) return;
        const g = lastGpsByCam[d.id];
        if (g && g.lat != null && g.lon != null) return;
        pendingGps.push({
            cameraId: d.id,
            name: d.name || d.id,
            online: true,
        });
    });
    const user = dispatchScope.userFromSession(session);
    const groups = listDispatchGroupsForScope();
    const scopedDevices = dispatchScope.filterMapDevicesForUser(devices, user, groups);
    const scopedPending = pendingGps.filter((p) => sessionCanSeeCam(session, p.cameraId));
    return { devices: scopedDevices, pendingGps: scopedPending };
}

function onlineDeviceIdsForGroups() {
    return fleetRegistry.getDashboardFleet().map((d) => d.id).filter(Boolean);
}

app.get('/api/dispatch-groups', (req, res) => {
    try {
        const allGroups = dispatchGroups.listGroups();
        const user = dispatchScope.userFromSession(req.dashboardUser);
        const visibleGroups = dispatchScope.filterGroupsForUser(allGroups, user);
        const lookup = dispatchGroups.buildLookup(visibleGroups);
        res.json({
            ok: true,
            groups: dispatchGroups.publicGroupsPayload(visibleGroups, onlineDeviceIdsForGroups()),
            lookup,
        });
    } catch (err) {
        res.status(500).json(opErr(err, { groups: [] }));
    }
});

app.get('/api/dispatch-groups/template.csv', dashboardAuth.requireSuperAdmin, (req, res) => {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="dispatch-groups-template.csv"');
    res.send(dispatchGroups.csvTemplate());
});

const SIZING_CALCULATOR_CSV = path.join(__dirname, 'docs', 'sales', 'MOBILITY-SIZING-CALCULATOR.csv');

app.get('/downloads/mobility-sizing-calculator.csv', (req, res) => {
    const session = req.dashboardUser || dashboardAuth.sessionFromRequest(req);
    if (!session) return res.status(401).send('Sign in required');
    if (!fs.existsSync(SIZING_CALCULATOR_CSV)) {
        return res.status(404).json(opErr("Sizing calculator file not found"));
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="Mobility-Sizing-Calculator.csv"');
    res.sendFile(SIZING_CALCULATOR_CSV);
});

app.post('/api/dispatch-groups', dashboardAuth.requireSuperAdmin, (req, res) => {
    try {
        const body = req.body || {};
        if (reverifyForbidden(req, res, body)) return;
        let saved;
        if (Array.isArray(body.groups)) {
            saved = persistDispatchGroupsAndSyncBwc(body.groups);
        } else {
            dispatchGroups.upsertGroup(body.group || body);
            saved = persistDispatchGroupsAndSyncBwc(dispatchGroups.listGroups());
        }
        auditLog.recordFromRequest(req, 'dispatch_groups.save', { detail: { count: saved.length } });
        res.json({
            ok: true,
            groups: dispatchGroups.publicGroupsPayload(saved, onlineDeviceIdsForGroups()),
            lookup: dispatchGroups.buildLookup(saved),
        });
    } catch (err) {
        res.status(400).json(opErr(err));
    }
});

app.delete('/api/dispatch-groups/:id', dashboardAuth.requireSuperAdmin, express.json({ limit: '16kb' }), (req, res) => {
    try {
        if (reverifyForbidden(req, res, req.body || {})) return;
        dispatchGroups.deleteGroup(req.params.id);
        const saved = dispatchGroups.listGroups();
        persistDispatchGroupsAndSyncBwc(saved);
        res.json({
            ok: true,
            groups: dispatchGroups.publicGroupsPayload(saved, onlineDeviceIdsForGroups()),
        });
    } catch (err) {
        res.status(400).json(opErr(err));
    }
});

app.post('/api/dispatch-groups/import', dashboardAuth.requireSuperAdmin, (req, res) => {
    try {
        const body = req.body || {};
        if (reverifyForbidden(req, res, body)) return;
        const csv = String(body.csv || body.text || '').trim();
        if (!csv) return res.status(400).json(opErr("CSV content is required"));
        const rows = dispatchGroups.parseCsv(csv);
        if (!rows.length) return res.status(400).json(opErr("No valid rows in CSV"));
        dispatchGroups.importCsvRows(rows);
        const saved = dispatchGroups.listGroups();
        persistDispatchGroupsAndSyncBwc(saved);
        auditLog.recordFromRequest(req, 'dispatch_groups.import', { detail: { rows: rows.length } });
        res.json({
            ok: true,
            imported: rows.length,
            groups: dispatchGroups.publicGroupsPayload(saved, onlineDeviceIdsForGroups()),
            lookup: dispatchGroups.buildLookup(saved),
        });
    } catch (err) {
        res.status(400).json(opErr(err));
    }
});

app.get('/api/firmware-ota/status', dashboardAuth.requireSuperAdmin, (req, res) => {
    try {
        res.json(firmwareOta.buildStatus(fleetRegistry, loadBwcDevices()));
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

function requireEvidenceDownload(req, res, next) {
    const session = req.dashboardUser || dashboardAuth.sessionFromRequest(req);
    if (!session || !dashboardAuth.canEvidenceDownload(session)) {
        return res.status(403).json(opErr("Evidence download not authorized or grant expired"));
    }
    req.dashboardUser = session;
    return next();
}

function requireEvidenceView(req, res, next) {
    const session = req.dashboardUser || dashboardAuth.sessionFromRequest(req);
    if (!session || !dashboardAuth.canEvidenceView(session)) {
        return res.status(403).json(opErr("Evidence access not authorized"));
    }
    req.dashboardUser = session;
    return next();
}

function requireEvidenceExport(req, res, next) {
    const session = req.dashboardUser || dashboardAuth.sessionFromRequest(req);
    if (!session || !dashboardAuth.canEvidenceExport(session)) {
        return res.status(403).json(opErr("Evidence export permission required"));
    }
    req.dashboardUser = session;
    return next();
}

function requireEvidenceEdit(req, res, next) {
    const session = req.dashboardUser || dashboardAuth.sessionFromRequest(req);
    if (!session || !dashboardAuth.canEvidenceEdit(session)) {
        return res.status(403).json(opErr("Evidence edit permission required"));
    }
    req.dashboardUser = session;
    return next();
}

app.get('/api/storage/status', requireEvidenceView, (req, res) => {
    try {
        const settings = serverSettings.load(STORAGE_DIR);
        const includeDisk = req.query && req.query.disk === '1';
        res.json(storageStatus.buildStatus(BASE_DIR, STORAGE_DIR, settings, {
            includeDiskScan: includeDisk,
        }));
    } catch (err) {
        log.web.warn('storage status failed', { message: err.message });
        res.status(500).json(opErr(err));
    }
});

function evidenceOverviewCtx() {
    return {
        baseDir: BASE_DIR,
        storageDir: STORAGE_DIR,
        serverSettings: serverSettings,
        siteDb: siteDb,
        evidenceRegistry: evidenceRegistry,
        operatorErrorVoice: operatorErrorVoice,
        dockRegistry: dockRegistry,
        evidenceWorkflow: evidenceWorkflow,
        storageStatus: storageStatus,
        storagePaths: storagePaths,
        fleetRegistry: fleetRegistry,
        loadBwcDevices: loadBwcDevices,
        syncFleetDeviceMeta: syncFleetDeviceMeta,
    };
}

app.get('/api/evidence/overview', requireEvidenceView, (req, res) => {
    try {
        res.json(evidenceOverview.build(evidenceOverviewCtx()));
    } catch (err) {
        log.web.warn('evidence overview failed', { message: err.message });
        res.status(500).json(opErr(err));
    }
});

app.post('/api/storage/maintenance', dashboardAuth.requireSuperAdmin, (req, res) => {
    try {
        if (!siteDb.isReady()) {
            return res.status(503).json(opErr('Database not ready'));
        }
        const vacuum = !!(req.body && req.body.vacuum);
        const result = siteDb.runMaintenance({ vacuum: vacuum });
        auditLog.recordFromRequest(req, 'storage.maintenance', { detail: { vacuum: vacuum } });
        res.json(Object.assign({ ok: true }, result, {
            stats: siteDb.getDatabaseStats(),
        }));
    } catch (err) {
        log.web.warn('storage maintenance failed', { message: err.message });
        res.status(500).json(opErr(err));
    }
});

app.post('/api/storage/backup', dashboardAuth.requireSuperAdmin, (req, res) => {
    try {
        if (!siteDb.isReady()) {
            return res.status(503).json(opErr('Database not ready'));
        }
        const backupDir = path.join(STORAGE_DIR, 'backups');
        const result = siteDb.backupDatabase(backupDir);
        if (!result.ok) {
            return res.status(500).json(opErr(result.error || result));
        }
        auditLog.recordFromRequest(req, 'storage.backup', {
            detail: { path: result.path, bytes: result.bytes },
        });
        res.json(result);
    } catch (err) {
        log.web.warn('storage backup failed', { message: err.message });
        res.status(500).json(opErr(err));
    }
});

function requireDockAdmin(req, res, next) {
    const session = req.dashboardUser || dashboardAuth.sessionFromRequest(req);
    if (!session || !dashboardAuth.canDockAdmin(session)) {
        return res.status(403).json(opErr("Dock administration permission required"));
    }
    req.dashboardUser = session;
    return next();
}

function sosIncidentLookup(id) {
    if (!id) return null;
    const dash = sosIncidents.getDashboard(500, 365);
    const entries = (dash && dash.entries) ? dash.entries : (Array.isArray(dash) ? dash : []);
    return entries.find(function (e) { return e.id === id || e.incidentId === id; }) || null;
}

app.get('/api/evidence/catalog', requireEvidenceView, (req, res) => {
    try {
        const limit = req.query && req.query.limit;
        res.json({ ok: true, files: evidenceRegistry.listCatalog(limit) });
    } catch (err) {
        log.web.warn('evidence catalog list failed', { message: err.message });
        res.status(500).json(opErr(err));
    }
});

app.get('/api/gps-track/settings', requireEvidenceView, (req, res) => {
    try {
        res.json({ ok: true, settings: gpsTrack.getSettings() });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.patch('/api/gps-track/settings', dashboardAuth.requireSuperAdmin, express.json(), (req, res) => {
    try {
        const settings = gpsTrack.saveSettings(req.body || {});
        auditLog.recordFromRequest(req, 'gps_track.settings', { detail: settings });
        res.json({ ok: true, settings: settings });
    } catch (err) {
        res.status(400).json(opErr(err));
    }
});

app.get('/api/gps-track/route', requireEvidenceView, (req, res) => {
    try {
        const q = req.query || {};
        const deviceId = String(q.deviceId || '').trim();
        const from = String(q.from || '').trim();
        const to = String(q.to || '').trim();
        if (!deviceId || !from || !to) {
            return res.status(400).json(opErr("deviceId, from, and to are required (ISO8601)."));
        }
        const points = gpsTrack.queryRoute(deviceId, from, to, q.limit);
        const evidence = gpsTrack.evidenceForWindow(deviceId, from, to);
        res.json({ ok: true, deviceId: deviceId, from: from, to: to, points: points, evidence: evidence });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.get('/api/gps-track/evidence-at', requireEvidenceView, (req, res) => {
    try {
        const q = req.query || {};
        const deviceId = String(q.deviceId || '').trim();
        const at = String(q.at || '').trim();
        if (!deviceId || !at) {
            return res.status(400).json(opErr("deviceId and at are required."));
        }
        const match = gpsTrack.evidenceNearPoint(deviceId, at);
        res.json({ ok: true, match: match });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

function emitSmartGpsState() {
    emitToDashboardSockets('smart-gps-state', { active: smartGpsTrack.listActive() });
}

app.get('/api/smart-gps/status', (req, res) => {
    try {
        res.json({ ok: true, active: smartGpsTrack.listActive(), intervalSec: smartGpsTrack.DEFAULT_HIGH_RES_SEC });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.post('/api/smart-gps/track', express.json(), (req, res) => {
    try {
        const session = req.dashboardUser || dashboardAuth.sessionFromRequest(req);
        const body = req.body || {};
        const deviceId = String(body.deviceId || body.cameraId || '').trim();
        const enable = body.active !== false && body.enable !== false;
        if (!deviceId) {
            return res.status(400).json(opErr("deviceId required"));
        }
        assertSessionCanAccessCam(session, deviceId);
        if (enable) smartGpsTrack.start(deviceId, 'manual');
        else smartGpsTrack.stop(deviceId, 'manual');
        auditLog.recordFromRequest(req, enable ? 'smart_gps.track_start' : 'smart_gps.track_stop', {
            target: deviceId,
        });
        emitSmartGpsState();
        res.json({ ok: true, active: smartGpsTrack.listActive() });
    } catch (err) {
        res.status(err.status || 500).json(opErr(err));
    }
});

app.post('/api/smart-gps/sos-team', express.json(), (req, res) => {
    try {
        const session = req.dashboardUser || dashboardAuth.sessionFromRequest(req);
        const body = req.body || {};
        const alarmCamId = String(body.cameraId || body.alarmCamId || '').trim();
        const helperCamIds = Array.isArray(body.helperCamIds)
            ? body.helperCamIds.map(String).filter(Boolean)
            : [];
        if (alarmCamId) assertSessionCanAccessCam(session, alarmCamId);
        helperCamIds.forEach(function (id) { assertSessionCanAccessCam(session, id); });
        const onlineHelpers = helperCamIds.filter(function (id) {
            return id && normalizeCamId(id) !== normalizeCamId(alarmCamId);
        });
        if (onlineHelpers.length) {
            smartGpsTrack.startBatch(onlineHelpers, 'sos-team');
        }
        auditLog.recordFromRequest(req, 'smart_gps.sos_team', {
            target: alarmCamId || null,
            detail: { helpers: onlineHelpers },
        });
        emitSmartGpsState();
        res.json({ ok: true, active: smartGpsTrack.listActive(), helpers: onlineHelpers });
    } catch (err) {
        res.status(err.status || 500).json(opErr(err));
    }
});

app.post('/api/smart-gps/restore-incident', express.json(), (req, res) => {
    try {
        smartGpsTrack.stopAllSosTracking();
        auditLog.recordFromRequest(req, 'smart_gps.restore_incident', {});
        emitSmartGpsState();
        res.json({ ok: true, active: smartGpsTrack.listActive() });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.post('/api/evidence/request-download', requireEvidenceDownload, (req, res) => {
    try {
        if (evidenceSecureExport.secureExportEnabled() && req.dashboardUser.role !== 'super_admin') {
            return res.status(403).json({
                ok: false,
                error: 'Direct download is limited to super admins. Use Request protected export.',
                secureExportRequired: true,
            });
        }
        const body = req.body || {};
        const fileId = body.fileId;
        if (!fileId) return res.status(400).json(opErr("Select an evidence file."));
        const out = evidenceRegistry.createDownloadRequest(req.dashboardUser, fileId, auditLog.clientIp(req));
        auditLog.recordFromRequest(req, 'evidence.download_request', {
            target: out.downloadId,
            detail: { fileId: out.fileId, fileName: out.fileName },
        });
        res.json({ ok: true, download: out });
    } catch (err) {
        res.status(400).json(opErr(err));
    }
});

app.get('/api/evidence/stream/:downloadId', requireEvidenceDownload, (req, res) => {
    try {
        const resolved = evidenceRegistry.resolveStreamDownload(req.params.downloadId, req.dashboardUser);
        if (resolved.error) {
            return res.status(resolved.status || 400).json({ ok: false, error: resolved.error });
        }
        const { dl, file, fullPath } = resolved;
        auditLog.recordFromRequest(req, 'evidence.download_stream', {
            target: dl.downloadId,
            detail: { fileId: file.id, fileName: file.fileName },
        });
        evidenceRegistry.markConsumed(dl.downloadId);
        res.setHeader('X-Evidence-Download-Id', dl.downloadId);
        res.setHeader('Content-Disposition', 'attachment; filename="' + String(file.fileName).replace(/"/g, '') + '"');
        return res.sendFile(fullPath);
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.get('/api/evidence/downloads', dashboardAuth.requireSuperAdmin, (req, res) => {
    try {
        res.json({ ok: true, downloads: evidenceRegistry.listDownloads(req.query && req.query.limit) });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.post('/api/evidence/request-secure-export', requireEvidenceDownload, (req, res) => {
    try {
        const body = req.body || {};
        const fileId = body.fileId;
        if (!fileId) return res.status(400).json(opErr("Select an evidence file."));
        const out = evidenceSecureExport.createRequest(
            req.dashboardUser,
            fileId,
            body.reason,
            auditLog.clientIp(req)
        );
        auditLog.recordFromRequest(req, 'evidence.secure_export_request', {
            target: out.requestId,
            detail: { fileId: out.fileId, fileName: out.fileName },
        });
        res.json({ ok: true, request: out });
    } catch (err) {
        res.status(400).json(opErr(err));
    }
});

app.get('/api/evidence/secure-export/queue', dashboardAuth.requireSuperAdmin, (req, res) => {
    try {
        const status = req.query && req.query.status;
        const requests = evidenceSecureExport.listRequests({
            status: status || null,
            limit: req.query && req.query.limit,
        });
        res.json({ ok: true, requests, secureExportEnabled: evidenceSecureExport.secureExportEnabled() });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.get('/api/evidence/secure-export/mine', requireEvidenceDownload, (req, res) => {
    try {
        const all = evidenceSecureExport.listRequests({ limit: 100 });
        const mine = all.filter((r) => r.requesterUserId === req.dashboardUser.userId);
        res.json({ ok: true, requests: mine });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.post('/api/evidence/secure-export/:requestId/approve', dashboardAuth.requireSuperAdmin, (req, res) => {
    try {
        const body = req.body || {};
        if (!dashboardAuth.verifySessionPassword(req.dashboardUser, body.adminPassword)) {
            return res.status(403).json(opErr("Enter your password to approve this export."));
        }
        const out = evidenceSecureExport.approveRequest(
            req.params.requestId,
            req.dashboardUser,
            auditLog.clientIp(req)
        );
        auditLog.recordFromRequest(req, 'evidence.secure_export_approve', {
            target: out.request.requestId,
            detail: {
                fileId: out.request.evidenceFileId,
                requestedBy: out.request.requestedBy,
            },
        });
        res.json({
            ok: true,
            request: out.request,
            passphrase: out.passphrase,
            downloadUrl: out.downloadUrl,
            downloadExpiresAt: out.downloadExpiresAt,
        });
    } catch (err) {
        res.status(400).json(opErr(err));
    }
});

app.post('/api/evidence/secure-export/:requestId/deny', dashboardAuth.requireSuperAdmin, (req, res) => {
    try {
        const body = req.body || {};
        if (!dashboardAuth.verifySessionPassword(req.dashboardUser, body.adminPassword)) {
            return res.status(403).json(opErr("Enter your password to deny this export."));
        }
        const updated = evidenceSecureExport.denyRequest(
            req.params.requestId,
            req.dashboardUser,
            body.reason
        );
        auditLog.recordFromRequest(req, 'evidence.secure_export_deny', {
            target: updated.requestId,
            detail: { requestedBy: updated.requestedBy, reason: updated.denyReason },
        });
        res.json({ ok: true, request: updated });
    } catch (err) {
        res.status(400).json(opErr(err));
    }
});

app.get('/api/evidence/secure-export/stream/:requestId', requireEvidenceDownload, (req, res) => {
    try {
        const resolved = evidenceSecureExport.resolveStreamDownload(req.params.requestId, req.dashboardUser);
        if (resolved.error) {
            return res.status(resolved.status || 400).json({ ok: false, error: resolved.error });
        }
        const { req: exportReq, fullPath, fileName } = resolved;
        auditLog.recordFromRequest(req, 'evidence.secure_export_download', {
            target: exportReq.requestId,
            detail: { fileId: exportReq.evidenceFileId, fileName: fileName },
        });
        evidenceSecureExport.markConsumed(exportReq.requestId);
        res.setHeader('X-Evidence-Secure-Export-Id', exportReq.requestId);
        res.setHeader('Content-Disposition', 'attachment; filename="' + String(fileName).replace(/"/g, '') + '"');
        res.setHeader('Content-Type', 'application/octet-stream');
        return res.sendFile(fullPath);
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.get('/api/evidence/detail/:fileId', requireEvidenceView, (req, res) => {
    try {
        const detail = evidenceWorkflow.getDetail(req.params.fileId, sosIncidentLookup);
        if (!detail) return res.status(404).json(opErr("Evidence not found"));
        res.json({ ok: true, detail: detail });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.get('/api/evidence/preview/:fileId', requireEvidenceView, (req, res) => {
    try {
        const fullPath = evidenceWorkflow.resolvePreviewPath(req.params.fileId);
        if (!fullPath) return res.status(404).json(opErr("File not found"));
        auditLog.recordFromRequest(req, 'evidence.preview', { target: req.params.fileId });
        res.setHeader('Content-Type', 'video/mp4');
        return res.sendFile(fullPath);
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.patch('/api/evidence/detail/:fileId', requireEvidenceEdit, (req, res) => {
    try {
        const body = req.body || {};
        const meta = evidenceWorkflow.updateMeta(req.params.fileId, body, req.dashboardUser);
        auditLog.recordFromRequest(req, 'evidence.meta_update', { target: req.params.fileId });
        res.json({ ok: true, meta: meta });
    } catch (err) {
        res.status(400).json(opErr(err));
    }
});

app.post('/api/evidence/detail/:fileId/attachment', requireEvidenceEdit, express.json({ limit: '12mb' }), (req, res) => {
    try {
        const body = req.body || {};
        const b64 = body.dataBase64 || body.data;
        if (!b64) return res.status(400).json(opErr("dataBase64 required"));
        const buf = Buffer.from(String(b64), 'base64');
        const att = evidenceWorkflow.saveAttachment(
            req.params.fileId,
            body.fileName || 'photo.jpg',
            buf,
            req.dashboardUser
        );
        auditLog.recordFromRequest(req, 'evidence.attachment_add', {
            target: req.params.fileId,
            detail: { attachmentId: att.id },
        });
        res.json({ ok: true, attachment: att });
    } catch (err) {
        res.status(400).json(opErr(err));
    }
});

app.get('/api/evidence/attachment/:attachmentId', requireEvidenceView, (req, res) => {
    try {
        const resolved = evidenceWorkflow.resolveAttachmentStream(req.params.attachmentId);
        if (!resolved) return res.status(404).json(opErr("Attachment not found"));
        return res.sendFile(resolved.fullPath);
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.post('/api/evidence/detail/:fileId/trim-export', requireEvidenceExport, async (req, res) => {
    try {
        const body = req.body || {};
        const out = await evidenceWorkflow.runTrimExport(req.params.fileId, body, req.dashboardUser);
        auditLog.recordFromRequest(req, 'evidence.trim_export', {
            target: req.params.fileId,
            detail: { exportId: out.exportId, trimStartSec: out.trimStartSec, trimEndSec: out.trimEndSec },
        });
        res.json({ ok: true, export: out });
    } catch (err) {
        res.status(400).json(opErr(err));
    }
});

app.get('/api/evidence/export-stream/:exportId', requireEvidenceExport, (req, res) => {
    try {
        const resolved = evidenceWorkflow.resolveExportStream(req.params.exportId);
        if (!resolved) return res.status(404).json(opErr("Export not found"));
        auditLog.recordFromRequest(req, 'evidence.export_stream', {
            target: resolved.row.exportId,
            detail: { fileId: resolved.row.evidenceFileId },
        });
        res.setHeader('Content-Disposition', 'attachment; filename="' + String(resolved.row.fileName).replace(/"/g, '') + '"');
        return res.sendFile(resolved.fullPath);
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.get('/api/evidence/sos-incidents', requireEvidenceView, (req, res) => {
    try {
        const days = req.query && req.query.days ? parseInt(req.query.days, 10) : 90;
        const limit = req.query && req.query.limit ? parseInt(req.query.limit, 10) : 100;
        res.json({ ok: true, incidents: sosIncidents.getDashboard(limit, days) });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.get('/api/case-files', requireEvidenceView, (req, res) => {
    try {
        const q = req.query || {};
        const limit = q.limit ? parseInt(q.limit, 10) : 200;
        const caseFileList = caseFiles.list({
            limit: limit,
            q: q.q,
            period: q.period,
            status: q.status,
            from: q.from,
            to: q.to,
        });
        res.json({ ok: true, caseFiles: caseFileList });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.get('/api/case-files/:id', requireEvidenceView, (req, res) => {
    try {
        const detail = caseFiles.getDetail(req.params.id);
        if (!detail) return res.status(404).json(opErr('Case file not found'));
        res.json({ ok: true, detail: detail });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.post('/api/case-files', requireEvidenceEdit, express.json({ limit: '256kb' }), (req, res) => {
    try {
        const detail = caseFiles.create(req.body || {}, req.dashboardUser);
        auditLog.recordFromRequest(req, 'case_file.create', {
            target: detail.caseFile.id,
            detail: { title: detail.caseFile.title },
        });
        res.json({ ok: true, detail: detail });
    } catch (err) {
        res.status(400).json(opErr(err));
    }
});

app.post('/api/case-files/from-sos', requireEvidenceEdit, express.json({ limit: '64kb' }), (req, res) => {
    try {
        const incidentId = (req.body && req.body.incidentId) ? String(req.body.incidentId).trim() : '';
        if (!incidentId) return res.status(400).json(opErr('SOS incident ID required'));
        const detail = caseFiles.createFromSos(incidentId, req.dashboardUser, sosIncidents);
        auditLog.recordFromRequest(req, 'case_file.create_from_sos', {
            target: detail.caseFile.id,
            detail: { sosIncidentId: incidentId },
        });
        res.json({ ok: true, detail: detail });
    } catch (err) {
        res.status(400).json(opErr(err));
    }
});

app.patch('/api/case-files/:id', requireEvidenceEdit, express.json({ limit: '512kb' }), (req, res) => {
    try {
        const detail = caseFiles.update(req.params.id, req.body || {}, req.dashboardUser);
        auditLog.recordFromRequest(req, 'case_file.update', { target: req.params.id });
        res.json({ ok: true, detail: detail });
    } catch (err) {
        const status = String(err && err.message || '').toLowerCase().includes('not found') ? 404 : 400;
        res.status(status).json(opErr(err));
    }
});

app.delete('/api/case-files/:id', dashboardAuth.requireSuperAdmin, express.json({ limit: '16kb' }), (req, res) => {
    try {
        const body = req.body || {};
        if (!dashboardAuth.verifySessionPassword(req.dashboardUser, body.adminPassword)) {
            return res.status(403).json({ ok: false, errorKey: 'errors.passwordWrong' });
        }
        const out = caseFiles.remove(req.params.id);
        auditLog.recordFromRequest(req, 'case_file.delete', {
            target: out.removed.id,
            detail: {
                title: out.removed.title,
                officerName: out.removed.officerName,
                evidenceUnlinked: out.evidenceUnlinked.length,
                evidenceFilesOnDiskPreserved: true,
            },
        });
        res.json({ ok: true, removed: out.removed, evidenceUnlinked: out.evidenceUnlinked });
    } catch (err) {
        const status = String(err && err.message || '').toLowerCase().includes('not found') ? 404 : 400;
        res.status(status).json(opErr(err));
    }
});

app.post('/api/case-files/:id/evidence', requireEvidenceEdit, express.json({ limit: '32kb' }), (req, res) => {
    try {
        const evidenceFileId = (req.body && req.body.evidenceFileId) ? String(req.body.evidenceFileId).trim() : '';
        if (!evidenceFileId) return res.status(400).json(opErr('Evidence file ID required'));
        const detail = caseFiles.linkEvidence(req.params.id, evidenceFileId, req.dashboardUser);
        auditLog.recordFromRequest(req, 'case_file.link_evidence', {
            target: req.params.id,
            detail: { evidenceFileId: evidenceFileId },
        });
        res.json({ ok: true, detail: detail });
    } catch (err) {
        const status = String(err && err.message || '').toLowerCase().includes('not found') ? 404 : 400;
        res.status(status).json(opErr(err));
    }
});

app.delete('/api/case-files/:id/evidence/:evidenceFileId', requireEvidenceEdit, (req, res) => {
    try {
        const detail = caseFiles.unlinkEvidence(req.params.id, req.params.evidenceFileId);
        auditLog.recordFromRequest(req, 'case_file.unlink_evidence', {
            target: req.params.id,
            detail: { evidenceFileId: req.params.evidenceFileId },
        });
        res.json({ ok: true, detail: detail });
    } catch (err) {
        const status = String(err && err.message || '').toLowerCase().includes('not found') ? 404 : 400;
        res.status(status).json(opErr(err));
    }
});

app.get('/api/docks', requireEvidenceView, (req, res) => {
    try {
        const docks = dockRegistry.listDocks();
        const catWrap = evidenceOverview.safeCatalogFiles(siteDb, evidenceRegistry, operatorErrorVoice, 500);
        const hints = evidenceWorkflow.ftpHintsForDocks(docks, catWrap.files);
        res.json({
            ok: true,
            docks: docks,
            bayPresets: dockRegistry.BAY_PRESETS,
            sdkReady: false,
            catalogAvailable: catWrap.available,
            ftpHints: hints,
        });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.get('/api/docks/:id/bays', requireEvidenceView, (req, res) => {
    try {
        const dock = dockRegistry.getDock(req.params.id);
        if (!dock) return res.status(404).json(opErr("Dock not found"));
        const catWrap = evidenceOverview.safeCatalogFiles(siteDb, evidenceRegistry, operatorErrorVoice, 500);
        const hints = evidenceWorkflow.ftpHintsForDocks([dock], catWrap.files);
        res.json({
            ok: true,
            layout: dockRegistry.bayStatesForDock(dock, hints),
            catalogAvailable: catWrap.available,
        });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.post('/api/docks', requireDockAdmin, (req, res) => {
    try {
        const dock = dockRegistry.createDock(req.body || {});
        auditLog.recordFromRequest(req, 'dock.create', { target: dock.id, detail: { branchCode: dock.branchCode } });
        res.json({ ok: true, dock: dock });
    } catch (err) {
        res.status(400).json(opErr(err));
    }
});

app.put('/api/docks/:id', requireDockAdmin, (req, res) => {
    try {
        const dock = dockRegistry.updateDock(req.params.id, req.body || {});
        auditLog.recordFromRequest(req, 'dock.update', { target: dock.id });
        res.json({ ok: true, dock: dock });
    } catch (err) {
        res.status(400).json(opErr(err));
    }
});

app.delete('/api/docks/:id', requireDockAdmin, (req, res) => {
    try {
        dockRegistry.deleteDock(req.params.id);
        auditLog.recordFromRequest(req, 'dock.delete', { target: req.params.id });
        res.json({ ok: true });
    } catch (err) {
        res.status(400).json(opErr(err));
    }
});

function requireConferenceView(req, res, next) {
    const session = req.dashboardUser || dashboardAuth.sessionFromRequest(req);
    if (!session || !dashboardAuth.canConferenceView(session)) {
        return res.status(403).json(opErr("Video conference access not authorized"));
    }
    req.dashboardUser = session;
    return next();
}

function requireConferenceHost(req, res, next) {
    const session = req.dashboardUser || dashboardAuth.sessionFromRequest(req);
    if (!session) {
        return res.status(403).json(opErr("Not authorized"));
    }
    const perms = dashboardAuth.getPermissionsForSession(session);
    if (session.role !== 'super_admin' && !(perms && perms.conferenceHost)) {
        return res.status(403).json(opErr("Conference host permission required to change settings"));
    }
    req.dashboardUser = session;
    return next();
}

function conferenceClientWsUrl(req) {
    return conferenceLivekit.clientWsUrlForRequest(req);
}

function conferenceUser(req) {
    const s = req.dashboardUser;
    return {
        userId: s.userId,
        id: s.userId,
        username: s.username,
        role: s.role,
    };
}

function conferencePerms(req) {
    return dashboardAuth.getPermissionsForSession(req.dashboardUser);
}

app.get('/api/conference/status', requireConferenceView, (req, res) => {
    try {
        res.json(conferenceModule.statusPayload());
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.get('/api/conference/settings', requireConferenceView, (req, res) => {
    try {
        const session = req.dashboardUser;
        const perms = conferencePerms(req);
        const canEdit = session.role === 'super_admin' || !!(perms && perms.conferenceHost);
        const cfg = conferenceConfig.publicView();
        const mcuRunning = conferenceLivekit.isEnabled();
        res.json({
            ok: true,
            settings: cfg,
            canEdit,
            deployHint: conferenceConfig.deployHints(cfg.deployMode),
            firewall: conferenceConfig.firewallRows(),
            livekit: conferenceLivekit.publicStatus(),
            remoteReadiness: conferenceConfig.remoteReadiness(cfg, mcuRunning),
        });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.post('/api/conference/settings', requireConferenceHost, express.json(), (req, res) => {
    try {
        const saved = conferenceConfig.save(req.body || {});
        auditLog.recordFromRequest(req, 'conference.settings.save', { target: saved.siteHost });
        res.json({
            ok: true,
            settings: conferenceConfig.publicView(saved),
            deployHint: conferenceConfig.deployHints(saved.deployMode),
            firewall: conferenceConfig.firewallRows(saved),
            livekit: conferenceLivekit.publicStatus(),
            remoteReadiness: conferenceConfig.remoteReadiness(saved, conferenceLivekit.isEnabled()),
            restartRequired: true,
        });
    } catch (err) {
        res.status(400).json(opErr(err));
    }
});

app.post('/api/conference/settings/test', requireConferenceHost, express.json(), async (req, res) => {
    try {
        const body = req.body || {};
        let cfg = conferenceConfig.load();
        if (Object.keys(body).length) {
            cfg = conferenceConfig.normalize(Object.assign({}, cfg, body));
        }
        const result = await conferenceConfig.testConnection(cfg);
        res.json({ ok: true, result });
    } catch (err) {
        res.status(400).json(opErr(err));
    }
});

app.get('/api/conference/lobby', requireConferenceView, (req, res) => {
    try {
        const user = dispatchScope.userFromSession(req.dashboardUser);
        const scope = dispatchScope.scopeForUser(user, dispatchGroups.listGroups());
        const perms = conferencePerms(req);
        const lobbyScope = {
            seeAllDispatchGroups: scope.seeAll || !!perms.seeAllDispatchGroups,
            assignedGroupIds: scope.groupIds || [],
        };
        res.json({
            ok: true,
            lobby: conferenceModule.buildLobby(conferenceUser(req), perms, lobbyScope),
        });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.get('/api/conference/recordings', requireConferenceView, (req, res) => {
    try {
        res.json({ ok: true, recordings: conferenceModule.listRecordings(100) });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.get('/api/conference/recordings/:id/stream', requireConferenceView, (req, res) => {
    try {
        const fp = conferenceModule.streamRecordingFile(req.params.id);
        if (!fp) return res.status(404).json(opErr("Recording not found"));
        res.sendFile(fp);
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.delete('/api/conference/recordings/:id', requireConferenceView, (req, res) => {
    try {
        const out = conferenceModule.deleteRecording(req.params.id, conferenceUser(req), conferencePerms(req));
        auditLog.recordFromRequest(req, 'conference.record.delete', { target: req.params.id });
        res.json({ ok: true, deleted: out.deleted });
    } catch (err) {
        res.status(400).json(opErr(err));
    }
});

app.post('/api/conference/room/:roomId/start', requireConferenceView, express.json(), async (req, res) => {
    try {
        const out = await conferenceModule.startRoom(req.params.roomId, conferenceUser(req), conferencePerms(req), req.body || {});
        auditLog.recordFromRequest(req, 'conference.start', { target: req.params.roomId });
        res.json({ ok: true, room: out.room, livekitRoom: out.livekitRoom });
    } catch (err) {
        res.status(400).json(opErr(err));
    }
});

app.post('/api/conference/room/:roomId/end', requireConferenceView, async (req, res) => {
    try {
        const out = await conferenceModule.endRoom(req.params.roomId, conferenceUser(req), conferencePerms(req));
        auditLog.recordFromRequest(req, 'conference.end', { target: req.params.roomId });
        res.json({ ok: true, room: out.room });
    } catch (err) {
        res.status(400).json(opErr(err));
    }
});

app.post('/api/conference/room/:roomId/join-token', requireConferenceView, express.json(), async (req, res) => {
    try {
        const body = Object.assign({}, req.body || {}, { clientWsUrl: conferenceClientWsUrl(req), clientKind: 'web' });
        const out = await conferenceModule.joinToken(req.params.roomId, conferenceUser(req), conferencePerms(req), body);
        res.json({ ok: true, join: out });
    } catch (err) {
        res.status(400).json(opErr(err));
    }
});

app.post('/api/conference/room/:roomId/leave-notify', requireConferenceView, express.json(), async (req, res) => {
    try {
        const kind = (req.body && req.body.clientKind) || 'web';
        const out = await conferenceModule.notifyPeerLeave(req.params.roomId, conferenceUser(req), kind);
        res.json(out);
    } catch (err) {
        res.status(400).json(opErr(err));
    }
});

app.post('/api/conference/mobile/join-token', requireConferenceView, express.json(), async (req, res) => {
    try {
        const body = Object.assign({}, req.body || {}, { clientWsUrl: conferenceClientWsUrl(req), clientKind: 'mobile' });
        const out = await conferenceModule.mobileJoinToken(conferenceUser(req), conferencePerms(req), body);
        res.json({ ok: true, join: out });
    } catch (err) {
        res.status(400).json(opErr(err));
    }
});

app.post('/api/conference/room/:roomId/record/start', requireConferenceView, async (req, res) => {
    try {
        const out = await conferenceModule.startRecording(req.params.roomId, conferenceUser(req), conferencePerms(req));
        auditLog.recordFromRequest(req, 'conference.record.start', { target: req.params.roomId });
        res.json({ ok: true, recording: out.recording });
    } catch (err) {
        res.status(400).json(opErr(err));
    }
});

app.post('/api/conference/room/:roomId/record/stop', requireConferenceView, async (req, res) => {
    try {
        const out = await conferenceModule.stopRecording(req.params.roomId, conferenceUser(req), conferencePerms(req));
        auditLog.recordFromRequest(req, 'conference.record.stop', { target: req.params.roomId });
        res.json({ ok: true, recording: out });
    } catch (err) {
        res.status(400).json(opErr(err));
    }
});

app.post('/api/conference/room/:roomId/mute-all', requireConferenceView, async (req, res) => {
    try {
        const out = await conferenceModule.muteAllParticipants(req.params.roomId, conferenceUser(req), conferencePerms(req));
        auditLog.recordFromRequest(req, 'conference.mute-all', { target: req.params.roomId });
        res.json({ ok: true, muted: out.muted, floor: out.floor });
    } catch (err) {
        res.status(400).json(opErr(err));
    }
});

app.post('/api/conference/room/:roomId/bwc-audio-mute', requireConferenceView, express.json(), async (req, res) => {
    try {
        const camId = req.body && req.body.camId;
        const muted = !!(req.body && req.body.muted);
        const out = await conferenceModule.setBwcIngressAudioMuted(
            req.params.roomId,
            conferenceUser(req),
            conferencePerms(req),
            camId,
            muted
        );
        auditLog.recordFromRequest(req, 'conference.bwc-audio-mute', {
            target: req.params.roomId,
            detail: { camId: out.camId, muted: out.muted },
        });
        res.json(out);
    } catch (err) {
        res.status(400).json(opErr(err));
    }
});

app.post('/api/conference/room/:roomId/floor/allow', requireConferenceView, express.json(), async (req, res) => {
    try {
        const identity = req.body && req.body.identity;
        const out = await conferenceModule.allowSpeak(req.params.roomId, conferenceUser(req), conferencePerms(req), identity);
        auditLog.recordFromRequest(req, 'conference.floor.allow', { target: req.params.roomId, detail: { identity: identity } });
        res.json({ ok: true, floor: out.floor });
    } catch (err) {
        res.status(400).json(opErr(err));
    }
});

app.post('/api/conference/room/:roomId/floor/revoke', requireConferenceView, express.json(), async (req, res) => {
    try {
        const identity = req.body && req.body.identity;
        const out = await conferenceModule.revokeSpeak(req.params.roomId, conferenceUser(req), conferencePerms(req), identity);
        auditLog.recordFromRequest(req, 'conference.floor.revoke', { target: req.params.roomId, detail: { identity: identity } });
        res.json({ ok: true, floor: out.floor });
    } catch (err) {
        res.status(400).json(opErr(err));
    }
});

app.post('/api/conference/room/:roomId/floor/request-speak', requireConferenceView, async (req, res) => {
    try {
        const out = await conferenceModule.requestSpeak(req.params.roomId, conferenceUser(req), conferencePerms(req));
        res.json({ ok: true, floor: out.floor, alreadyAllowed: !!out.alreadyAllowed });
    } catch (err) {
        res.status(400).json(opErr(err));
    }
});

app.post('/api/conference/room/:roomId/floor/deny', requireConferenceView, express.json(), async (req, res) => {
    try {
        const identity = req.body && req.body.identity;
        const out = await conferenceModule.denySpeakRequest(req.params.roomId, conferenceUser(req), conferencePerms(req), identity);
        res.json({ ok: true, floor: out.floor });
    } catch (err) {
        res.status(400).json(opErr(err));
    }
});

app.post('/api/conference/room/:roomId/bwc-ingress', requireConferenceView, express.json(), async (req, res) => {
    try {
        const camId = req.body && req.body.camId;
        const displayName = req.body && req.body.displayName;
        const out = await conferenceModule.addBwcIngress(req.params.roomId, conferenceUser(req), conferencePerms(req), camId, displayName);
        auditLog.recordFromRequest(req, 'conference.bwc.ingress', { target: camId, detail: { roomId: req.params.roomId } });
        res.json({ ok: true, bwcIngress: out.bwcIngress });
    } catch (err) {
        res.status(400).json(opErr(err));
    }
});

app.delete('/api/conference/room/:roomId/bwc-ingress', requireConferenceView, async (req, res) => {
    try {
        const camId = req.query && req.query.camId;
        const out = await conferenceModule.removeBwcIngress(req.params.roomId, conferenceUser(req), conferencePerms(req), camId);
        auditLog.recordFromRequest(req, 'conference.bwc.ingress.remove', { target: camId || req.params.roomId, detail: { roomId: req.params.roomId } });
        res.json({ ok: true, bwcIngressList: out.bwcIngressList });
    } catch (err) {
        res.status(400).json(opErr(err));
    }
});

app.post('/api/conference/room/:roomId/guest', requireConferenceView, express.json(), (req, res) => {
    try {
        const guestUserId = req.body && req.body.userId;
        const out = conferenceModule.inviteGuest(req.params.roomId, conferenceUser(req), conferencePerms(req), guestUserId);
        res.json({ ok: true, guests: out.guests });
    } catch (err) {
        res.status(400).json(opErr(err));
    }
});

app.get('/api/messages/threads', (req, res) => {
    try {
        const limit = req.query && req.query.limit;
        const sinceHours = req.query && req.query.sinceHours != null
            ? parseInt(req.query.sinceHours, 10)
            : (parseInt(process.env.FM_MESSAGES_UI_HOURS, 10) || 24);
        res.json({ ok: true, threads: siteDb.listBwcMessageThreads(limit, sinceHours) });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.get('/api/messages/:deviceId', (req, res) => {
    try {
        const deviceId = req.params.deviceId;
        if (!deviceId) return res.status(400).json(opErr("deviceId required"));
        const limit = req.query && req.query.limit;
        const sinceHours = req.query && req.query.sinceHours != null
            ? parseInt(req.query.sinceHours, 10)
            : (parseInt(process.env.FM_MESSAGES_UI_HOURS, 10) || 24);
        res.json({ ok: true, messages: siteDb.listBwcMessages(deviceId, limit, sinceHours) });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

function clearMessagesForDeviceHandler(req, res) {
    try {
        const session = req.dashboardUser || dashboardAuth.sessionFromRequest(req);
        if (!session || !dashboardAuth.roleCanManageServer(session.role)) {
            return res.status(403).json(opErr("Super admin required"));
        }
        const deviceId = req.params.deviceId;
        if (!deviceId) return res.status(400).json(opErr("deviceId required"));
        const removed = siteDb.clearBwcMessagesForDevice(deviceId);
        res.json({ ok: true, removed });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
}

app.delete('/api/messages/:deviceId', clearMessagesForDeviceHandler);
app.post('/api/messages/:deviceId/clear', clearMessagesForDeviceHandler);

app.delete('/api/messages', (req, res) => {
    try {
        const session = req.dashboardUser || dashboardAuth.sessionFromRequest(req);
        if (!session || !dashboardAuth.roleCanManageServer(session.role)) {
            return res.status(403).json(opErr("Super admin required"));
        }
        const removed = siteDb.clearAllBwcMessages();
        res.json({ ok: true, removed });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.post('/api/auth/change-password', (req, res) => {
    try {
        const session = req.dashboardUser || dashboardAuth.sessionFromRequest(req);
        if (!session) return res.status(401).json(opErr("Unauthorized"));
        const body = req.body || {};
        const newPassword = body.newPassword != null ? String(body.newPassword) : '';
        const confirmPassword = body.confirmPassword != null ? String(body.confirmPassword) : '';
        if (!body.currentPassword) {
            return res.status(400).json(opErr("Current password is required"));
        }
        if (!newPassword) {
            return res.status(400).json(opErr("New password is required"));
        }
        if (newPassword !== confirmPassword) {
            return res.status(400).json(opErr("New passwords do not match"));
        }
        dashboardAuth.changeOwnPassword(session.username, String(body.currentPassword), newPassword);
        authReverify.revokeTokensForUser(session.userId);
        log.web.info('dashboard password changed', { username: session.username });
        auditLog.recordFromRequest(req, 'auth.password_change', { target: session.username });
        res.json({ ok: true, username: session.username, mustChangePassword: false });
    } catch (err) {
        res.status(400).json(opErr(err));
    }
});

app.post('/api/auth/reverify', (req, res) => {
    try {
        const session = req.dashboardUser || dashboardAuth.sessionFromRequest(req);
        if (!session) return res.status(401).json(opErr("Unauthorized"));
        const body = req.body || {};
        const password = body.password != null ? String(body.password) : '';
        if (!password) {
            return res.status(400).json(opErr("Password is required"));
        }
        if (!dashboardAuth.verifySessionPassword(session, password)) {
            return res.status(403).json(opErr("Incorrect password"));
        }
        const token = authReverify.issueToken(session);
        res.json({ ok: true, reverifyToken: token.reverifyToken, expiresAt: token.expiresAt });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.get('/api/tech/provision/status', (req, res) => {
    try {
        const session = req.dashboardUser || dashboardAuth.sessionFromRequest(req);
        if (!session || !dashboardAuth.roleCanManageServer(session.role)) {
            return res.status(403).json({ ok: false, error: 'Forbidden' });
        }
        res.json({ ok: true, configured: techAccess.isConfigured() });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.post('/api/tech/provision', (req, res) => {
    try {
        const session = req.dashboardUser || dashboardAuth.sessionFromRequest(req);
        if (!session || !dashboardAuth.roleCanManageServer(session.role)) {
            return res.status(403).json({ ok: false, error: 'Forbidden' });
        }
        if (reverifyForbidden(req, res, req.body)) return;
        const body = req.body || {};
        const pin = String(body.pin || '').trim();
        const pinConfirm = String(body.pinConfirm || body.pin_confirm || '').trim();
        if (pin.length < techAccess.MIN_PIN_LEN) {
            return res.status(400).json({
                ok: false,
                error: 'PIN must be at least 12 characters.',
                errorKey: 'tech.provision.pinTooShort',
            });
        }
        if (pin !== pinConfirm) {
            return res.status(400).json({
                ok: false,
                error: 'PIN entries do not match.',
                errorKey: 'tech.provision.pinMismatch',
            });
        }
        techAccess.provisionPin(STORAGE_DIR, pin);
        auditLog.record('tech.pin_provision', {
            actor: session.username || session.userId,
            detail: { via: 'dashboard' },
        });
        res.json({ ok: true, configured: true });
    } catch (err) {
        const payload = { ok: false, error: err.message || 'Provision failed' };
        if (err.errorKey) payload.errorKey = err.errorKey;
        res.status(400).json(payload);
    }
});

app.post('/api/video-channels', (req, res) => {
    const body = req.body || {};
    const incoming = Array.isArray(body.channels) ? body.channels : [];
    const channels = defaultVideoChannels().channels.map((def, i) => {
        const row = incoming.find((c) => Number(c.slot) === i) || incoming[i] || {};
        const protocol = String(row.protocol || 'sip').toLowerCase() === 'onvif' ? 'onvif' : 'sip';
        let sourceMode = String(row.sourceMode || '').toLowerCase();
        if (!sourceMode) sourceMode = row.deviceId ? 'fixed' : 'none';
        if (!['fixed', 'group', 'all', 'list', 'overflow', 'none'].includes(sourceMode)) sourceMode = 'fixed';
        let deviceIds = [];
        if (Array.isArray(row.deviceIds)) deviceIds = row.deviceIds.map(String).filter(Boolean);
        else if (row.deviceIds) {
            deviceIds = String(row.deviceIds).split(/[\r\n,;]+/).map((s) => s.trim()).filter(Boolean);
        }
        return {
            slot: i,
            sourceMode,
            operatorName: String(row.operatorName || '').trim(),
            deviceId: String(row.deviceId || '').trim(),
            mapGroup: String(row.mapGroup || '').trim(),
            deviceIds,
            rotateSec: Math.max(5, parseInt(row.rotateSec, 10) || 30),
            userName: String(row.userName || '').trim(),
            password: String(row.password || ''),
            protocol,
        };
    });
    try {
        fs.mkdirSync(STORAGE_DIR, { recursive: true });
        fs.writeFileSync(VIDEO_CHANNELS_PATH, JSON.stringify({ channels }, null, 2), 'utf8');
        ensureBwcEntriesForWallChannels(channels);
        syncFleetDeviceMeta();
        emitFleetRoster();
        log.web.info('video channels saved');
        res.json({ ok: true, channels });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.post('/api/open-folder', (req, res) => {
    const session = req.dashboardUser || dashboardAuth.sessionFromRequest(req);
    const key = req.body && req.body.folder;
    if (key === 'ftp' && !dashboardAuth.canEvidenceDownload(session)) {
        return res.status(403).json(opErr("Evidence folder access requires download permission from super admin"));
    }
    const dir = getStorageFolders()[key] || currentFtpRoot();
    try {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    } catch (err) {
        return res.status(500).json(Object.assign({ path: dir }, opErr(err)));
    }
    if (process.platform === 'win32') {
        spawn('explorer.exe', [dir], { detached: true, stdio: 'ignore' }).unref();
        log.web.info('opened folder', { folder: key || 'ftp', path: dir });
        return res.json({ ok: true, path: dir });
    }
    res.json({ ok: false, path: dir, hint: 'Open this path on the server machine' });
});

app.use('/sos-media', express.static(path.join(STORAGE_DIR, 'sos-incidents')));

app.get('/', (req, res) => {
    res.setHeader('Cache-Control', staticCache.HTML_CACHE_CONTROL);
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

staticCache.registerDashboardStatic(app, path.join(__dirname, 'public'));

let cameraContactUri = null;
/** Last SIP contact URI per camera (survives brief offline; restored on Alarm after server restart). */
const lastContactUriByCam = {};
/** BWC LAN IP → SIP device id (for PTT login user ≠ camId). */
const camIdByIp = {};
const CONTACT_CACHE_PATH = path.join(STORAGE_DIR, 'last-sip-contact.json');

function ipFromContactUri(uri) {
    if (!uri) return null;
    const m = String(uri).match(/@([0-9.]+)/);
    return m ? m[1] : null;
}

function recordCamIp(camId, contactUri) {
    const ip = ipFromContactUri(contactUri);
    if (camId && ip) camIdByIp[ip] = camId;
}

function resolvePttCamId(peerIp, pttUser) {
    const ip = String(peerIp || '').replace(/^::ffff:/, '');
    if (ip && camIdByIp[ip]) return camIdByIp[ip];
    const user = String(pttUser || '').trim();
    if (/^3402\d{16,}$/.test(user)) return user;
    if (user && fleetRegistry.getDashboardFleet().some((d) => d.id === user)) return user;
    return user || null;
}

function buildPttDownlinkPolicyForClient() {
    return pttDownlinkPolicy.buildClientPayload(serverSettings.load(STORAGE_DIR), {
        getPttLoginUser: (camId) => (PTT_ENABLED ? pttServer.getDeviceLoginUser(camId) : null),
        getBwcUserName: (camId) => {
            const d = bwcDevices.findById(loadBwcDevices(), camId);
            return d && d.userName ? d.userName : null;
        },
        listConfiguredCamIds: () => (loadBwcDevices().devices || []).map((d) => d.deviceId).filter(Boolean),
        listOnlinePttCamIds: () => (PTT_ENABLED ? pttServer.listOnlineDeviceIds() : []),
    });
}

function buildVoiceProfileDeps() {
    return {
        getPttLoginUser: (camId) => (PTT_ENABLED ? pttServer.getDeviceLoginUser(camId) : null),
        getBwcUserName: (camId) => {
            const d = bwcDevices.findById(loadBwcDevices(), camId);
            return d && d.userName ? d.userName : null;
        },
        listConfiguredCamIds: () => (loadBwcDevices().devices || []).map((d) => d.deviceId).filter(Boolean),
        listOnlinePttCamIds: () => (PTT_ENABLED ? pttServer.listOnlineDeviceIds() : []),
        listOnlineCamIds: () => fleetRegistry.getDashboardFleet()
            .filter((d) => d && d.online && d.id)
            .map((d) => d.id),
    };
}

function buildVoiceProfileForClient() {
    return Object.assign(
        bwcVoiceProfile.buildClientPayload(buildVoiceProfileDeps()),
        voiceIntercomProfile.clientPayload(),
    );
}

let voiceIntercomTelemetry;
function getVoiceIntercomTelemetry() {
    if (!voiceIntercomTelemetry) {
        voiceIntercomTelemetry = voiceIntercomTelemetryMod.createVoiceIntercomTelemetry({
            log,
            fleetRegistry,
            queryDeviceStatus,
        });
    }
    return voiceIntercomTelemetry;
}

function onVoiceIntercomEnded(camId, profileId) {
    const id = String(camId || '').trim();
    if (!id) return;
    const profile = profileId || voiceIntercomProfile.resolve().id;
    const tel = getVoiceIntercomTelemetry();
    tel.logPhase(id, 'bye', profile);
    tel.requestStatus(id, 'post-bye', profile);
}

function enrichBwcDevicesForApi(data) {
    const settings = serverSettings.load(STORAGE_DIR);
    const downlinkModes = pttDownlinkPolicy.normalizeSettingsPtt(settings).downlinkByCamId;
    const audioCmdModes = pttAudioCmdPolicy.normalizeSettings(settings).audioCmdByCamId;
    const devices = (data && data.devices ? data.devices : []).map((d) => Object.assign({}, d, {
        pttDownlinkMode: downlinkModes[d.deviceId] || 'auto',
        pttAudioCmdMode: audioCmdModes[d.deviceId] || 'auto',
    }));
    return { devices };
}

function buildPttAudioCmdDeps() {
    const settings = serverSettings.load(STORAGE_DIR);
    const ptt = pttAudioCmdPolicy.normalizeSettings(settings);
    const bwcData = loadBwcDevices();
    const bwcById = new Map();
    (bwcData.devices || []).forEach((d) => {
        if (d && d.deviceId) bwcById.set(d.deviceId, d);
    });
    return {
        audioCmdByCamId: ptt.audioCmdByCamId,
        modelLegacyPrefixes: ptt.modelLegacyPrefixes,
        getPttLoginUser: (camId) => (PTT_ENABLED ? pttServer.getDeviceLoginUser(camId) : null),
        getBwcUserName: (camId) => {
            const d = bwcById.get(camId);
            return d && d.userName ? String(d.userName) : '';
        },
        listConfiguredCamIds: () => (bwcData.devices || []).map((d) => d.deviceId).filter(Boolean),
        listOnlinePttCamIds: () => (PTT_ENABLED ? pttServer.listOnlineDeviceIds() : []),
    };
}

function loadContactCache() {
    try {
        if (fs.existsSync(CONTACT_CACHE_PATH)) {
            const data = JSON.parse(fs.readFileSync(CONTACT_CACHE_PATH, 'utf8'));
            if (data && typeof data === 'object') {
                Object.keys(data).forEach((camId) => {
                    if (data[camId]) {
                        lastContactUriByCam[camId] = data[camId];
                        recordCamIp(camId, data[camId]);
                    }
                });
            }
        }
    } catch (err) {
        log.sip.warn('contact cache read failed', { message: err.message });
    }
}

async function saveContactCacheAsync() {
    try {
        await fs.promises.writeFile(CONTACT_CACHE_PATH, JSON.stringify(lastContactUriByCam, null, 0), 'utf8');
    } catch (err) {
        log.sip.warn('contact cache write failed', { message: err.message });
    }
}

function saveContactCacheSync() {
    try {
        fs.writeFileSync(CONTACT_CACHE_PATH, JSON.stringify(lastContactUriByCam, null, 0), 'utf8');
    } catch (err) {
        log.sip.warn('contact cache write failed', { message: err.message });
    }
}

function restoreCameraContactForCam(camId, request, remote) {
    const contactHdr = request && request.headers && request.headers.contact;
    const contactUri = contactHdr && contactHdr[0] && contactHdr[0].uri;
    if (contactUri && !contactUriPointsAtServer(contactUri)) {
        cameraContactUri = contactUri;
        if (camId) {
            lastContactUriByCam[camId] = contactUri;
            recordCamIp(camId, contactUri);
            saveContactCache();
        }
        log.sip.info('contact restored from request contact', { camId, contact: contactUri });
        return contactUri;
    }
    const remoteUri = contactUriFromSipRemote(camId, remote);
    if (remoteUri) {
        cameraContactUri = remoteUri;
        if (camId) {
            lastContactUriByCam[camId] = remoteUri;
            recordCamIp(camId, remoteUri);
            saveContactCache();
        }
        log.sip.info('contact restored from sip remote', { camId, contact: remoteUri });
        return remoteUri;
    }
    if (camId && lastContactUriByCam[camId]) {
        cameraContactUri = lastContactUriByCam[camId];
        log.sip.info('contact restored from cache', { camId });
        return lastContactUriByCam[camId];
    }
    const fromUri = request && request.headers && request.headers.from && request.headers.from.uri;
    if (fromUri && !contactUriPointsAtServer(fromUri)) {
        cameraContactUri = fromUri;
        if (camId) {
            lastContactUriByCam[camId] = fromUri;
            recordCamIp(camId, fromUri);
            saveContactCache();
        }
        log.sip.info('contact restored from notify from', { camId, contact: fromUri });
        return cameraContactUri;
    }
    return null;
}

function hostLooksLikeServer(host) {
    if (!host) return false;
    const h = String(host).replace(/^::ffff:/, '');
    return h === HOST || h === BIND_HOST || h === '127.0.0.1' || h === 'localhost';
}

function contactUriPointsAtServer(uri) {
    return hostLooksLikeServer(ipFromContactUri(uri));
}

function contactUriFromSipRemote(camId, remote) {
    if (!camId || !remote || !remote.address) return null;
    const ip = String(remote.address).replace(/^::ffff:/, '');
    if (!ip || hostLooksLikeServer(ip)) return null;
    const port = remote.port || 5060;
    return `sip:${camId}@${ip}:${port};transport=udp`;
}

loadContactCache();
if (!cameraContactUri) {
    const cachedIds = Object.keys(lastContactUriByCam);
    if (cachedIds.length === 1 && lastContactUriByCam[cachedIds[0]]) {
        cameraContactUri = lastContactUriByCam[cachedIds[0]];
    }
}

/** Set true when sip.start() completes without throwing (UDP listener init). */
let sipListenerReady = false;

function adminServiceStatusSnapshot() {
    return {
        sipPortStatus: sipListenerReady,
        pttPortStatus: PTT_ENABLED && pttServer.isPttServerActive(),
    };
}

function purgeAdminContactRouteCache() {
    try {
        Object.keys(lastContactUriByCam).forEach((camId) => {
            delete lastContactUriByCam[camId];
        });
    } catch (err) {
        log.sip.warn('admin cache purge memory clear failed', { message: err.message });
    }
    try {
        if (fs.existsSync(CONTACT_CACHE_PATH)) {
            fs.unlinkSync(CONTACT_CACHE_PATH);
        }
    } catch (err) {
        log.sip.warn('admin cache purge file delete failed', { message: err.message });
    }
    log.sip.info('Admin initiated route cache purge executed cleanly');
}

app.get('/api/admin/status', dashboardAuth.requireSuperAdmin, (req, res) => {
    try {
        const ports = adminServiceStatusSnapshot();
        res.json({
            ok: true,
            serverUptime: process.uptime(),
            sipPortStatus: ports.sipPortStatus,
            pttPortStatus: ports.pttPortStatus,
            activeDevicesCount: activeCameraSockets.size,
            registeredDevices: Array.from(activeCameraSockets.keys()),
        });
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.post('/api/admin/clear-cache', dashboardAuth.requireSuperAdmin, (req, res) => {
    try {
        purgeAdminContactRouteCache();
        res.json({
            success: true,
            message: 'Network cache cleared cleanly. Awaiting fresh camera registers.',
        });
    } catch (err) {
        log.sip.warn('admin clear-cache failed', { message: err.message });
        res.status(500).json(Object.assign({ success: false }, opErr(err)));
    }
});

function commandCentreDeps() {
    syncFleetDeviceMeta();
    const ftpRoot = currentFtpRoot();
    const limits = platformLimits.loadLimits();
    const bwcData = loadBwcDevices();
    let auditEntries = [];
    try {
        auditEntries = auditLog.list({ limit: 50 }) || [];
    } catch (_) { /* ignore */ }
    function resolveDeviceName(id) {
        const camId = String(id || '').trim();
        if (!camId) return '';
        const row = bwcDevices.findById(bwcData, camId);
        if (row && row.operatorName) return String(row.operatorName).trim();
        return fleetRegistry.displayName(camId);
    }
    return {
        getFleet: () => fleetRegistry.getDashboardFleet(),
        getOpenAlarms: () => sosIncidents.getOpenAlarms(),
        readSosStore: () => {
            try {
                const ledgerPath = path.join(sosIncidents.getBaseDir(), 'ledger.json');
                if (!fs.existsSync(ledgerPath)) return { entries: [] };
                return JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
            } catch (_) {
                return { entries: [] };
            }
        },
        getAuditEntries: () => auditEntries,
        displayName: resolveDeviceName,
        deviceCapacity: limits.maxBwcDevices,
        storageReportCapGb: parseInt(process.env.FM_STORAGE_REPORT_GB || '500', 10) || 500,
        uptimeSec: process.uptime(),
        storagePaths: {
            storage: STORAGE_DIR,
            ftp: ftpRoot,
            sosIncidents: sosIncidents.getBaseDir(),
            fleetLog: log.logFile,
        },
        serviceStatus: adminServiceStatusSnapshot(),
    };
}

app.get('/api/command-centre/summary', dashboardAuth.requireSuperAdmin, (req, res) => {
    try {
        res.json(commandCentreReport.buildSummary(commandCentreDeps()));
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.get('/api/command-centre/export', dashboardAuth.requireSuperAdmin, (req, res) => {
    try {
        const period = String((req.query && req.query.period) || 'weekly').toLowerCase();
        const format = String((req.query && req.query.format) || 'csv').toLowerCase();
        const allowed = ['daily', 'weekly', 'monthly', 'yearly'];
        const p = allowed.indexOf(period) >= 0 ? period : 'weekly';
        const summary = commandCentreReport.buildSummary(commandCentreDeps());
        const stamp = siteTime.formatEvidenceDate(new Date());
        if (format === 'json') {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename="centre-summary-' + p + '-' + stamp + '.json"');
            res.send(JSON.stringify(summary, null, 2));
            return;
        }
        const month = req.query && req.query.month ? String(req.query.month) : '';
        const csv = commandCentreReport.exportReportCsv(summary, p, { month });
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="centre-summary-' + p + '-' + stamp + '.csv"');
        res.send('\uFEFF' + csv);
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.get('/api/command-centre/llm-status', dashboardAuth.requireSuperAdmin, async (req, res) => {
    try {
        const status = await centreLlm.checkStatus();
        res.json(status);
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});

app.post('/api/command-centre/ask', dashboardAuth.requireSuperAdmin, async (req, res) => {
    try {
        const question = req.body && req.body.question;
        const lang = req.body && req.body.lang;
        const summary = commandCentreReport.buildSummary(commandCentreDeps());
        const result = await centreLlm.ask(question, summary, lang);
        res.json(result);
    } catch (err) {
        res.status(503).json(opErr(err));
    }
});

let dashboardSelectedCamId = null;

function getContactUriForCam(camId) {
    const id = camId || connectedCameraId;
    if (!id) return cameraContactUri || null;
    if (lastContactUriByCam[id]) return lastContactUriByCam[id];
    if (connectedCameraId === id && cameraContactUri) return cameraContactUri;
    return null;
}

conferenceConfig.init({ storageDir: STORAGE_DIR, baseDir: BASE_DIR });
conferenceModule.init({
    storageDir: STORAGE_DIR,
    isVoiceActiveForCam: function (camId) { return mediaSession.isVoiceCallActiveForCam(camId); },
    broadcastConferenceUpdate: function (event, payload) { io.emit(event, payload); },
    liveStreamPool,
    liveViewers,
    getSip: function () { return sip; },
    bwcIngress: {
        sip,
        realm: REALM,
        serverId: SERVER_ID,
        host: HOST,
        sipPort: SIP_PORT,
        baseDir: BASE_DIR,
        getContactUriForCam,
    },
    dispatchGroups,
    getOnlineCamIds: onlineDeviceIdsForGroups,
    listDashboardUsers: function () { return dashboardAuth.listUsersPublic(false); },
});

function getCommandTargetCamId() {
    return dashboardSelectedCamId || connectedCameraId;
}

// FTP snapshot anti-reclaim shield (TTL + cap — Phase A scale prep)
const ftpUsedShield = new scalePrep.FtpUsedShield({
    max: scalePrepCfg.ftpUsedMax,
    ttlMs: scalePrepCfg.ftpUsedTtlMs,
});
global.usedFtpFiles = {
    has: (name) => ftpUsedShield.has(name),
    add: (name) => ftpUsedShield.add(name),
};

function camIdFromFtpUploadPath(filePath, fallback) {
    const idMatch = String(filePath || '').match(/3402000000\d{10}/);
    return idMatch ? idMatch[0] : (fallback || null);
}

function ingestLatestFtpSnapshot(camId) {
    if (!FTP_ENABLED || !fs.existsSync(FTP_ROOT)) return null;
    const fallbackId = camId || connectedCameraId;
    let best = null;
    let bestMtime = 0;
    const now = Date.now();
    try {
        const candidates = [];
        function scanDir(dir) {
            for (const name of fs.readdirSync(dir)) {
                const full = path.join(dir, name);
                let st;
                try { st = fs.statSync(full); } catch (_) { continue; }
                if (st.isDirectory()) {
                    scanDir(full);
                    continue;
                }
                if (!/\.(jpe?g|png|gif|webp|bmp)$/i.test(name)) continue;
                
                // ANTI-THEFT SHIELD: Skip this file immediately if another camera already claimed it
                if (global.usedFtpFiles.has(name)) continue;

                candidates.push({ full, name, mtimeMs: st.mtimeMs });
            }
        }
        scanDir(FTP_ROOT);
        for (const c of candidates) {
            if (now - c.mtimeMs > 120000) continue;
            const fileCamId = camIdFromFtpUploadPath(c.full, null);
            if (fallbackId && fileCamId && fileCamId !== fallbackId) continue;
            if (c.mtimeMs > bestMtime) {
                bestMtime = c.mtimeMs;
                best = c;
            }
        }
    } catch (err) {
        log.ftp.warn('snapshot scan failed', { message: err.message });
        return null;
    }
    if (!best) return null;
    const id = camIdFromFtpUploadPath(best.full, fallbackId);
    if (!id || !sosIncidents.hasOpenAlarm(id)) return null;
    
    // Lock the file name permanently before assigning it
    global.usedFtpFiles.add(best.name);

    const snap = sosIncidents.attachSnapshotFromFtp(best.full, best.name, id);
    if (snap && snap.snapshotUrl) {
        log.ftp.info('snapshot linked', { camId: id, file: best.name, alarmId: snap.linkedAlarmId });
        io.emit('ftp-upload', {
            file: best.name,
            path: best.full,
            cameraId: id,
            snapshotUrl: snap.snapshotUrl,
            linkedAlarmId: snap.linkedAlarmId,
        });
        emitToDashboardSockets('sos-snapshot', { cameraId: id, snapshotUrl: snap.snapshotUrl }, id);
    }
    return snap;
}

function scheduleSnapshotIngest(camId) {
    if (!sosIncidents.hasOpenAlarm(camId)) return;
    [3500, 9000].forEach((ms) => {
        setTimeout(() => ingestLatestFtpSnapshot(camId), ms);
    });
}

let sosCaptureTimerIds = [];

function clearSosCapture() {
    sosCaptureTimerIds.forEach((id) => clearTimeout(id));
    sosCaptureTimerIds = [];
}

function scheduleSosCapture(camId) {
    clearSosCapture();
    // Do not send TakePicture on SOS — it disrupts live video and throws many BWCs into Settings.
}

/** One server INVITE after Alarm @ FM_SOS_COLD_PULL_MS (cold SOS and live-post-BYE SOS). */
/** Dashboard live video — per-camera pool (up to DASHBOARD_MAX_LIVE). Voice/RTSP stay on mediaSession. */
const dashboardVideo = {
    isDashboardWatchingCam: (camId) => liveStreamPool.isDashboardWatchingCam(camId),
    isStreamingForCam: (camId) => liveStreamPool.isStreamingForCam(camId),
    isInviteInFlight: (camId) => liveStreamPool.isInviteInFlight(camId),
    clearReinviteOnSos: (camId) => liveStreamPool.clearReinviteOnSos(camId),
    scheduleSosReinvite: (sip, camId) => liveStreamPool.scheduleSosReinvite(sip, camId),
};

function startVideoForSosAlarm(camId) {
    if (!camId) return;

    let attempts = 0;
    const maxAttempts = 12; // Retries every second for up to 12 seconds total

    function checkAndPullVideo() {
        attempts++;

        // 1. If it's already streaming, clear out and finish
        if (dashboardVideo.isStreamingForCam(camId)) {
            sosInviteLock.release(camId, 'already_streaming');
            sosInviteQueue.onStreamStarted(camId);
            return;
        }

        // 2. Check if the camera's network connection has woken up yet
        const contact = getContactUriForCam(camId);
        if (contact) {
            // Connection found! Request the video stream immediately
            startMediaFromDashboard({ camId, mode: 'video', sosServerPull: true });
            return;
        }

        // 3. If no connection yet, wait 1 second and retry until we run out of attempts
        if (attempts >= maxAttempts) {
            log.sip.warn('sos server pull skipped after retries', { camId, reason: 'no_contact' });
            sosInviteLock.release(camId, 'no_contact');
            sosInviteQueue.onInviteFailed(camId);
            return;
        }

        setTimeout(checkAndPullVideo, 250);
    }

    checkAndPullVideo();
}

sosInviteQueue.configure({
    liveStreamPool,
    dashboardVideo,
    sosInviteLock,
    startVideoForSosAlarm,
    maxLive: DASHBOARD_MAX_LIVE,
    emitQueueUpdate: (snap) => emitSosQueueToDashboards(snap),
});

function requestSosAlarmVideo(camId) {
    sosInviteQueue.requestVideo(camId);
}

function emitSosAlarmToDashboard(payload) {
    if (!payload || !payload.cameraId) {
        log.web.warn('sos-alarm push skipped', { reason: 'no_camera_id' });
        return;
    }
    const out = Object.assign({ action: 'SOS_ALARM_TRIGGERED' }, payload);
    const clients = io.engine && io.engine.clientsCount != null ? io.engine.clientsCount : 0;
    log.web.info('sos-alarm pushed', {
        camId: out.cameraId,
        clients,
        startVideo: !!out.startVideo,
        refresh: !!out.refresh,
        replay: !!out.replay,
    });
    smartGpsTrack.onSosAlarmPushed(out);
    pauseLoginReplayForSos();
    emitSmartGpsState();
    emitToDashboardSockets('sos-alarm', out, out.cameraId);
}

function buildOpenSosDashboardPayload(camId, extra) {
    const open = sosIncidents.getOpenAlarms().find((e) => e.cameraId === camId);
    if (!open) return null;
    const g = lastGpsByCam[camId];
    return buildAlarmDashboardPayload({
        cameraId: camId,
        time: open.alarmTime || new Date().toLocaleTimeString(),
        lat: open.lat != null ? open.lat : (g ? g.lat : null),
        lon: open.lon != null ? open.lon : (g ? g.lon : null),
        incidentId: open.id,
        alreadyLive: dashboardVideo.isStreamingForCam(camId) || dashboardVideo.isDashboardWatchingCam(camId),
        startVideo: !(dashboardVideo.isStreamingForCam(camId) || dashboardVideo.isDashboardWatchingCam(camId)),
    }, open.alarmKind || 'sos', extra || {});
}

function buildAlarmDashboardPayload(base, alarmKind, extra) {
    return Object.assign({ alarmKind: alarmKind || 'sos' }, base, extra || {});
}

deviceAlarm.configure({
    sosIncidents,
    mediaSession: dashboardVideo,
    sip,
    log,
    sosInviteLock,
    startVideoForAlarm: requestSosAlarmVideo,
    emitDashboard: emitSosAlarmToDashboard,
    buildPayload: buildAlarmDashboardPayload,
    scheduleCapture: scheduleSosCapture,
    scheduleSnapshot: scheduleSnapshotIngest,
    resolveOperatorName: resolveOperatorNameForCam,
    touchDeviceOnline,
    restoreCameraContact: (camId, request) => restoreCameraContactForCam(camId, request),
    auditRecord: (action, opts) => auditLog.record(action, opts),
});

function sendTakePictureToCam(camId) {
    const target = camId || getCommandTargetCamId();
    const contact = getContactUriForCam(target);
    if (!target || !contact) {
        log.sip.warn('TakePicture skipped', { camId: target, hasContact: !!contact });
        return;
    }
    deviceControl.sendDeviceControl(sip, {
        cameraContactUri: contact,
        deviceId: target,
        realm: REALM,
        serverId: SERVER_ID,
        recordCmd: 'TakePicture',
        log,
    });
}

let connectedCameraId = null;
let deviceOnline = false;
let lastDeviceSeenAt = 0;
let offlineWatchTimer = null;
const DEVICE_OFFLINE_MS = 90000;

const lastGpsByCam = {};
const geofenceInsideByCam = {};
const GPS_CACHE_PATH = path.join(STORAGE_DIR, 'last-gps.json');

function isGeofenceOutside(camId) {
    if (!camId) return false;
    const dev = bwcDevices.findById(loadBwcDevices(), camId);
    const gf = dev && dev.geofence ? geofence.normalize(dev.geofence) : null;
    if (!gf) return false;
    const st = geofenceInsideByCam[camId];
    if (st && typeof st.inside === 'boolean') return !st.inside;
    const g = lastGpsByCam[camId];
    if (g && g.lat != null && g.lon != null) {
        return !geofence.containsPoint(g.lat, g.lon, gf);
    }
    return false;
}

function loadGpsCache() {
    try {
        if (fs.existsSync(GPS_CACHE_PATH)) {
            const data = JSON.parse(fs.readFileSync(GPS_CACHE_PATH, 'utf8'));
            Object.keys(data).forEach((camId) => {
                if (!isBwcCameraId(camId)) return;
                const la = parseFloat(data[camId].lat);
                const lo = parseFloat(data[camId].lon);
                if (!Number.isNaN(la) && !Number.isNaN(lo)) lastGpsByCam[camId] = { lat: la, lon: lo };
            });
        }
    } catch (err) {
        log.sip.warn('gps cache read failed', { message: err.message });
    }
}

async function saveGpsCacheAsync() {
    try {
        await fs.promises.mkdir(STORAGE_DIR, { recursive: true });
        await fs.promises.writeFile(GPS_CACHE_PATH, JSON.stringify(lastGpsByCam, null, 2), 'utf8');
    } catch (err) {
        log.sip.warn('gps cache write failed', { message: err.message });
    }
}

function saveGpsCacheSync() {
    try {
        fs.mkdirSync(STORAGE_DIR, { recursive: true });
        fs.writeFileSync(GPS_CACHE_PATH, JSON.stringify(lastGpsByCam, null, 2), 'utf8');
    } catch (err) {
        log.sip.warn('gps cache write failed', { message: err.message });
    }
}

const gpsCacheWriter = scalePrep.createDebouncedWriter(saveGpsCacheAsync, scalePrepCfg.gpsCacheDebounceMs);
const contactCacheWriter = scalePrep.createDebouncedWriter(saveContactCacheAsync, scalePrepCfg.contactCacheDebounceMs);
function saveGpsCache() { gpsCacheWriter.schedule(); }
function saveContactCache() { contactCacheWriter.schedule(); }

let batchGpsEmit = null;
function initScalePrepGpsEmit() {
    batchGpsEmit = scalePrep.createGpsEmitBatcher(function (camId, la, lo) {
        emitToDashboardSockets('gps-update', { cameraId: camId, lat: la, lon: lo }, camId);
    }, scalePrepCfg.gpsEmitBatchMs);
}
initScalePrepGpsEmit();

function flushScalePrepCaches() {
    gpsCacheWriter.cancelPending();
    contactCacheWriter.cancelPending();
    saveGpsCacheSync();
    saveContactCacheSync();
}
process.on('SIGINT', flushScalePrepCaches);
process.on('SIGTERM', flushScalePrepCaches);

loadGpsCache();

const GPS_POLL_MS = parseInt(process.env.FM_GPS_POLL_MS || '120000', 10);
const STATUS_QUERY_COOLDOWN_MS = parseInt(process.env.FM_STATUS_QUERY_COOLDOWN_MS || '90000', 10);
const GPS_QUERY_COOLDOWN_MS = parseInt(process.env.FM_GPS_QUERY_COOLDOWN_MS || '120000', 10);
const lastStatusQueryAtByCam = new Map();
const lastGpsQueryAtByCam = new Map();
const LOGIN_REPLAY_STAGGER_BASE_MS = parseInt(process.env.FM_LOGIN_REPLAY_STAGGER_BASE_MS || '400', 10);
const LOGIN_REPLAY_STAGGER_STEP_MS = parseInt(process.env.FM_LOGIN_REPLAY_STAGGER_STEP_MS || '300', 10);
const LOGIN_REPLAY_SOS_PAUSE_MS = parseInt(process.env.FM_LOGIN_REPLAY_SOS_PAUSE_MS || '60000', 10);
let loginReplayDeferUntil = 0;

function pauseLoginReplayForSos() {
    loginReplayDeferUntil = Date.now() + LOGIN_REPLAY_SOS_PAUSE_MS;
}

function loginReplayBlockedBySos() {
    if (Date.now() < loginReplayDeferUntil) return true;
    try {
        return sosIncidents.getOpenAlarms().length > 0;
    } catch (_) {
        return false;
    }
}

function hasCachedDeviceTelemetry(camId) {
    const rec = fleetRegistry.ensure(camId);
    const tel = rec && rec.telemetry;
    if (!tel) return false;
    return (tel.battery && tel.battery !== '—')
        || (tel.signal && tel.signal !== '—')
        || (tel.deviceTime && tel.deviceTime !== '—');
}

function replayCachedTelemetryToSocket(socket, camId) {
    if (!socket || !camId) return false;
    const rec = fleetRegistry.ensure(camId);
    const tel = rec && rec.telemetry;
    if (!tel) return false;
    socket.emit('device-status', Object.assign({ cameraId: camId }, tel));
    return true;
}

function seedGeofenceStateFromCache() {
    const current = loadBwcDevices();
    (current.devices || []).forEach((d) => {
        if (!d || !d.deviceId || !d.geofence) return;
        const g = lastGpsByCam[d.deviceId];
        if (!g) return;
        geofenceInsideByCam[d.deviceId] = {
            inside: geofence.containsPoint(g.lat, g.lon, d.geofence),
            lat: g.lat,
            lon: g.lon,
            at: Date.now(),
        };
    });
}

seedGeofenceStateFromCache();

setInterval(() => {
    fleetRegistry.findStale(DEVICE_OFFLINE_MS).forEach((camId) => {
        markDeviceOffline(camId, 'keepalive_timeout');
    });
}, 20000);

const LAT_KEYS = ['Latitude', 'latitude', 'Lat', 'GPSLatitude', 'GPSLat', 'lat'];
const LON_KEYS = ['Longitude', 'longitude', 'Lon', 'Long', 'GPSLongitude', 'GPSLong', 'lon'];

function deepPickCoord(node, keys) {
    if (node == null) return null;
    if (typeof node === 'string' || typeof node === 'number') {
        const s = String(node).trim();
        return s !== '' ? s : null;
    }
    if (Array.isArray(node)) {
        for (let i = 0; i < node.length; i++) {
            const v = deepPickCoord(node[i], keys);
            if (v != null) return v;
        }
        return null;
    }
    if (typeof node === 'object') {
        for (let i = 0; i < keys.length; i++) {
            if (node[keys[i]] != null) {
                const v = deepPickCoord(node[keys[i]], keys);
                if (v != null) return v;
            }
        }
        const vals = Object.keys(node);
        for (let i = 0; i < vals.length; i++) {
            const v = deepPickCoord(node[vals[i]], keys);
            if (v != null) return v;
        }
    }
    return null;
}

function extractLatLon(notify) {
    if (!notify) return { lat: null, lon: null };
    return {
        lat: deepPickCoord(notify, LAT_KEYS),
        lon: deepPickCoord(notify, LON_KEYS),
    };
}

function coordsFromXmlString(xml) {
    if (!xml || typeof xml !== 'string') return { lat: null, lon: null };
    const latM = xml.match(/<(?:Latitude|latitude|Lat|GPSLatitude|GPSLat)[^>]*>([^<]+)</i);
    const lonM = xml.match(/<(?:Longitude|longitude|Lon|Long|GPSLongitude|GPSLong)[^>]*>([^<]+)</i);
    return {
        lat: latM ? latM[1].trim() : null,
        lon: lonM ? lonM[1].trim() : null,
    };
}

function resolveCoords(camId, notify, rawXml) {
    let coords = extractLatLon(notify);
    if ((coords.lat == null || coords.lon == null) && rawXml) {
        const fromXml = coordsFromXmlString(rawXml);
        if (fromXml.lat != null) coords.lat = fromXml.lat;
        if (fromXml.lon != null) coords.lon = fromXml.lon;
    }
    if (coords.lat != null && coords.lon != null) rememberGps(camId, coords.lat, coords.lon);
    const cached = lastGpsByCam[camId];
    return {
        lat: coords.lat != null ? coords.lat : (cached ? cached.lat : null),
        lon: coords.lon != null ? coords.lon : (cached ? cached.lon : null),
    };
}

function parseGpsCoord(val) {
    if (val == null || val === '') return NaN;
    const s = String(val).trim().replace(/^\+/, '').replace(/^0+(?=\d)/, '');
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : NaN;
}

function rememberGps(camId, lat, lon) {
    if (!isBwcCameraId(camId)) return;
    const la = parseGpsCoord(lat);
    const lo = parseGpsCoord(lon);
    if (!camId || Number.isNaN(la) || Number.isNaN(lo)) return;
    if (la < -90 || la > 90 || lo < -180 || lo > 180) return;
    lastGpsByCam[camId] = { lat: la, lon: lo };
    saveGpsCache();
}

function ingestGpsFromSipContent(camIdHint, rawXml) {
    if (!rawXml || typeof rawXml !== 'string') return;
    const cmdM = rawXml.match(/<CmdType>\s*([^<]+)\s*</i);
    const cmdType = cmdM ? String(cmdM[1]).trim() : '';
    if (cmdType === 'ConfigDownload' || cmdType === 'Catalog' || cmdType === 'DeviceConfig'
        || cmdType === 'DeviceStatus' || cmdType === 'DevStatus') {
        return;
    }
    const idM = rawXml.match(/<DeviceID[^>]*>([^<]+)</i);
    const camId = String(camIdHint || (idM && idM[1]) || '').trim();
    if (!isBwcCameraId(camId)) return;
    const coords = coordsFromXmlString(rawXml);
    if (coords.lat == null || coords.lon == null) return;
    emitGpsIfValid(camId, coords.lat, coords.lon);
}

function emitGpsIfValid(camId, lat, lon) {
    if (!isBwcCameraId(camId)) return;
    const la = parseGpsCoord(lat);
    const lo = parseGpsCoord(lon);
    if (!camId || Number.isNaN(la) || Number.isNaN(lo)) return;
    const prev = lastGpsByCam[camId];
    const maxJumpM = parseInt(process.env.FM_GPS_MAX_JUMP_M || '400', 10);
    if (prev && maxJumpM > 0) {
        const distM = geofence.haversineMeters(prev.lat, prev.lon, la, lo);
        if (distM > maxJumpM) {
            log.sip.warn('gps jump ignored', { camId, distM, maxJumpM, prev, lat: la, lon: lo });
            return;
        }
    }
    rememberGps(camId, la, lo);
    try {
        gpsTrack.recordPoint(camId, la, lo, 'sip');
    } catch (err) {
        log.sip.warn('gps track append failed', { camId, message: err.message });
    }
    if (batchGpsEmit) batchGpsEmit(camId, la, lo);
    else emitToDashboardSockets('gps-update', { cameraId: camId, lat: la, lon: lo }, camId);
    if (!prev) {
        log.sip.info('gps fix acquired', { camId, lat: la, lon: lo });
    }
    checkGeofenceForCam(camId, la, lo);
}

function geofenceAuditDetail(gf, extra) {
    const d = Object.assign({}, extra || {});
    if (gf && typeof gf === 'object') {
        if (gf.mode) d.mode = String(gf.mode);
        if (gf.radiusM != null) d.radiusM = gf.radiusM;
        if (gf.centerLat != null) d.centerLat = gf.centerLat;
        if (gf.centerLng != null) d.centerLng = gf.centerLng;
        if (Array.isArray(gf.ring)) d.vertexCount = gf.ring.length;
    }
    return d;
}

function checkGeofenceForCam(camId, lat, lon) {
    if (!camId) return;
    const dev = bwcDevices.findById(loadBwcDevices(), camId);
    const gf = dev && dev.geofence ? geofence.normalize(dev.geofence) : null;
    if (!gf) {
        delete geofenceInsideByCam[camId];
        return;
    }
    const inside = geofence.containsPoint(lat, lon, gf);
    const prev = geofenceInsideByCam[camId];
    geofenceInsideByCam[camId] = { inside, lat, lon, at: Date.now() };
    if (prev && prev.inside && !inside) {
        log.sip.info('geofence breach', { camId, lat, lon });
        auditLog.record('geofence.breach', {
            target: camId,
            detail: geofenceAuditDetail(gf, {
                source: 'gps',
                lat,
                lon,
                operatorName: resolveOperatorNameForCam(camId),
            }),
        });
        emitToDashboardSockets('geofence-breach', {
            cameraId: camId,
            lat,
            lon,
            geofence: gf,
            geofenceOutside: true,
            operatorName: resolveOperatorNameForCam(camId),
        }, camId);
    } else if (prev && !prev.inside && inside) {
        auditLog.record('geofence.enter', {
            target: camId,
            detail: geofenceAuditDetail(gf, {
                source: 'gps',
                lat,
                lon,
                operatorName: resolveOperatorNameForCam(camId),
            }),
        });
        emitToDashboardSockets('geofence-enter', {
            cameraId: camId,
            lat,
            lon,
            geofence: gf,
            geofenceOutside: false,
            operatorName: resolveOperatorNameForCam(camId),
        }, camId);
    } else if (!prev && !inside) {
        emitToDashboardSockets('geofence-status', {
            cameraId: camId,
            lat,
            lon,
            geofenceOutside: true,
            operatorName: resolveOperatorNameForCam(camId),
        }, camId);
    }
}

/** Outbound messages: no UI recipient field — use active registered device SIP id (PDF toPersons). */
function resolveMessageRecipients(data) {
    if (data && data.toPersons && data.toPersons.length) {
        return data.toPersons.map(String);
    }
    const target = (data && data.cameraId) || dashboardSelectedCamId || connectedCameraId;
    if (target) return [String(target)];
    return [];
}

function persistCameraMessage(payload) {
    const deviceId = payload && payload.cameraId;
    if (!deviceId || !siteDb.isReady()) return;
    try {
        siteDb.appendBwcMessage({
            deviceId,
            direction: payload.direction === 'out' ? 'out' : 'in',
            text: payload.text || '',
            msgTime: payload.time || null,
            msgType: payload.type,
            msgLevel: payload.level,
            senderName: payload.name || payload.from || null,
        });
    } catch (err) {
        log.messaging.warn('message save failed', { err: err.message });
    }
}

function parseStartMediaPayload(payload) {

    if (typeof payload === 'string') {

        return { camId: payload, mode: 'video' };

    }

    return {

        camId: payload && payload.camId,

        mode: (payload && payload.mode) || 'video',

        transport: payload && payload.transport,

        surface: payload && payload.surface,

    };

}



function startMediaFromDashboard(payload, requestSocket) {

    const parsed = parseStartMediaPayload(payload);
    const camId = parsed.camId || connectedCameraId;
    const mode = parsed.mode || 'video';
    const settings = serverSettings.load(STORAGE_DIR);
    const rtspUrl = (settings.onvif && settings.onvif.rtspUrl) ? settings.onvif.rtspUrl.trim() : '';
    const useOnvifRtsp = settings.activeProtocol === 'onvif' && rtspUrl && mode === 'video';

    if (useOnvifRtsp) {
        if (!camId) {
            log.media.warn('rtsp skipped', { reason: 'no_cam_id' });
            return;
        }
        log.media.info('onvif rtsp play', { camId, transport: settings.onvif.rtspTransport });
        mediaSession.setDashboardStreamActive(true, { transport: 'rtsp', mode, rtspUrl });
        mediaSession.startRtspStream(rtspUrl, wss, BASE_DIR, {
            rtspTransport: settings.onvif.rtspTransport,
        });
        return;
    }

    if (!camId) {

        log.media.warn('invite skipped', { reason: 'no_cam_id' });

        return;

    }

    const contact = getContactUriForCam(camId);
    if (!contact) {

        log.media.warn('invite skipped', { reason: 'no_camera_contact', camId });

        return;

    }

    const transport = 'udp';
    const inviteMode = mode;
    const sosServerPull = !!(payload && payload.sosServerPull);

    if (inviteMode === 'video' && conferenceModule.isBwcIngressActive(camId)) {
        log.media.info('invite skipped', { reason: 'vc_bwc_ingress_active', camId });
        const surface = liveViewers.normalizeSurface(parsed.surface || (payload && payload.surface));
        if (liveStreamPool.isStreamingForCam(camId)) {
            if (requestSocket && requestSocket.connected) {
                requestSocket.emit('video-stream-ready', { camId, surface });
            } else {
                liveViewers.notifyStreamReady(io, camId);
            }
            return;
        }
        if (requestSocket && requestSocket.connected) {
            requestSocket.emit('video-stream-error', {
                camId,
                error: 'BWC is sharing to video conference — wall cannot take over this stream',
            });
        }
        return;
    }

    if (inviteMode === 'video' && dashboardVideo.isStreamingForCam(camId)) {
        log.media.info('invite skipped', { reason: 'already_streaming', camId });
        const surface = liveViewers.normalizeSurface(parsed.surface || (payload && payload.surface));
        if (requestSocket && requestSocket.connected) {
            requestSocket.emit('video-stream-ready', { camId, surface });
        } else {
            liveViewers.notifyStreamReady(io, camId);
        }
        return;
    }

    if (inviteMode === 'video' && dashboardVideo.isInviteInFlight(camId)) {
        log.media.info('invite skipped', { reason: 'invite_in_flight', camId });
        return;
    }

    if (inviteMode === 'video' && liveStreamPool.countActive() >= DASHBOARD_MAX_LIVE
        && !dashboardVideo.isDashboardWatchingCam(camId)) {

        if (sosServerPull) {
            log.media.info('sos invite queued at live cap', { camId, max: DASHBOARD_MAX_LIVE });
            sosInviteQueue.onInviteFailed(camId);
            sosInviteQueue.requestVideo(camId);
            return;
        }

        log.media.warn('invite skipped', { reason: 'max_live', camId, max: DASHBOARD_MAX_LIVE });

        return;

    }

    if (inviteMode === 'video' && sosInviteLock.isConnecting(camId) && !sosServerPull) {

        log.media.info('invite skipped', { reason: 'sos_connect_lock', camId });

        return;

    }



    log.media.info('invite requested', { camId, mode: inviteMode, transport });

    if (PTT_ENABLED && inviteMode === 'video') {
        schedulePttGroupRefreshForCam(camId, 'invite');
    }

    const inviteOpts = {
        cameraContactUri: contact,
        camId,
        realm: REALM,
        serverId: SERVER_ID,
        host: HOST,
        sipPort: SIP_PORT,
        mode: inviteMode,
        transport,
        wss,
        baseDir: BASE_DIR,
        fallbackTransport: 'tcp',
        onAnswer: (response, negotiated) => {
            if (response.status === 200 && negotiated) {
                log.sip.info('invite accepted', {
                    status: 200,
                    mode: negotiated.mode,
                    transport: negotiated.transport,
                });
                const session = liveStreamPool.getSession(camId);
                if (negotiated.transport === 'udp' && session) {
                    log.media.info('awaiting rtp', {
                        camId,
                        videoPort: session.videoPort,
                        audioPort: session.audioPort,
                        mode: negotiated.mode,
                    });
                } else if (negotiated.transport === 'tcp' && session) {
                    log.media.info('awaiting tcp feed', {
                        camId,
                        port: session.videoPort,
                        mode: negotiated.mode,
                    });
                }
            } else if (response.status >= 300) {
                log.sip.err('invite failed', { status: response.status });
                sosInviteLock.release(camId, 'invite_failed');
            }
        },
    };

    liveStreamPool.setAudioFocusCamId(camId);
    liveStreamPool.sendInviteWithFallback(sip, inviteOpts);

}

const voiceCallActiveByCam = new Map();

function emitBwcCallState(camId, active, error, extra) {
    const id = camId ? String(camId).trim() : '';
    const wasActive = !!(id && voiceCallActiveByCam.get(id));
    if (id) {
        if (active) voiceCallActiveByCam.set(id, true);
        else voiceCallActiveByCam.delete(id);
    }
    io.emit('bwc-call-state', Object.assign({
        camId: camId || null,
        active: !!active,
        error: error || null,
    }, extra || {}));
    if (id && wasActive && !active) {
        queryDeviceStatus(id, { force: true });
    }
}

function emitPttDeviceState(camId, online) {
    io.emit('ptt-device-state', { camId: camId || null, online: !!online });
    if (online && camId) {
        io.emit('ptt-downlink-policy', buildPttDownlinkPolicyForClient());
    }
}

function emitPttTalkState(socket, camId, active, error) {
    if (socket) {
        socket.emit('ptt-talk-state', { camId: camId || null, active: !!active, error: error || null });
    }
}

function emitPttRxState(camId, active) {
    io.emit('ptt-rx-state', { camId: camId || null, active: !!active });
}

function emitPttRxAudio(camId, pcmBuf) {
    if (!camId || !pcmBuf || !pcmBuf.length) return;
    io.emit('ptt-rx-audio', { camId }, pcmBuf);
}

function auditVoiceCallActor(socket) {
    const user = socket && socket.dashboardUser;
    return user ? { actor: user.username, role: user.role } : {};
}

function camIdFromInboundInvite(request) {
    const from = request.headers.from && request.headers.from.uri;
    if (!from || typeof from !== 'string') return null;
    const m = from.match(/sip:([^@;>]+)/i);
    return m ? m[1].trim() : null;
}

function camIdFromSipMessage(request) {
    const fromId = camIdFromInboundInvite(request);
    return isBwcCameraId(fromId) ? fromId : null;
}

function resolveMessageCamId(request, xmlDeviceId) {
    const xmlId = String(xmlDeviceId || '').trim();
    if (isBwcCameraId(xmlId)) return xmlId;
    const fromId = camIdFromSipMessage(request);
    if (fromId) return fromId;
    return connectedCameraId;
}

/** After broadcast: device may BYE stale session before new INVITE — retry once. */
let voiceBroadcastPending = null;
let voiceInviteWatchTimer = null;
/** Accept inbound audio INVITE for this long after broadcast (device may be slow). */
const recentVoiceBroadcastUntil = new Map();
const VOICE_BROADCAST_INVITE_GRACE_MS = 60000;

function markRecentVoiceBroadcast(camId) {
    if (camId) recentVoiceBroadcastUntil.set(camId, Date.now() + VOICE_BROADCAST_INVITE_GRACE_MS);
}

function isRecentVoiceBroadcast(camId) {
    const until = recentVoiceBroadcastUntil.get(camId);
    if (!until) return false;
    if (Date.now() > until) {
        recentVoiceBroadcastUntil.delete(camId);
        return false;
    }
    return true;
}

function clearRecentVoiceBroadcast(camId) {
    if (camId) recentVoiceBroadcastUntil.delete(camId);
}

function isInboundAudioOnlyInvite(request) {
    const sdp = (request && request.content) || '';
    return /^m=audio/im.test(sdp) && !/^m=video/im.test(sdp);
}

function clearVoiceInviteWatch() {
    if (voiceInviteWatchTimer) {
        clearTimeout(voiceInviteWatchTimer);
        voiceInviteWatchTimer = null;
    }
}

function scheduleVoiceBroadcastInviteWatch(camId, waitMs) {
    clearVoiceInviteWatch();
    const delay = waitMs != null ? waitMs : 6000;
    voiceInviteWatchTimer = setTimeout(() => {
        voiceInviteWatchTimer = null;
        if (pttVoiceCallCamId !== camId) return;
        if (mediaSession.isVoiceCallActiveForCam(camId)) return;
        if (!voiceBroadcastPending || voiceBroadcastPending.camId !== camId) return;
        log.media.warn('voice broadcast compatibility', {
            camId,
            waitedMs: Date.now() - voiceBroadcastPending.at,
            afterByeRetry: !!voiceBroadcastPending.byeRetried,
            alert: 'firmware_no_inbound_invite',
        });
        pttVoiceCallCamId = null;
        voiceBroadcastPending = null;
        emitBwcCallState(camId, false, 'BWC firmware incompatible — Broadcast accepted but no voice callback within 8s. Reboot BWC or assign outbound Talk profile.');
    }, delay);
}

function relaunchVoiceBroadcastAfterDeviceBye(camId) {
    if (!pttVoiceCallCamId || pttVoiceCallCamId !== camId) return;
    if (!voiceBroadcastPending || voiceBroadcastPending.camId !== camId) return;
    if (voiceBroadcastPending.byeRetried) return;
    voiceBroadcastPending.byeRetried = true;
    clearVoiceInviteWatch();
    log.sip.info('voice broadcast retry after device bye', { camId });
    mediaSession.teardownVoiceCallForCam(sip, camId, () => {
        setTimeout(() => {
            if (pttVoiceCallCamId !== camId) return;
            sendVoiceBroadcastForCam(camId);
            markRecentVoiceBroadcast(camId);
            voiceBroadcastPending = {
                camId,
                at: Date.now(),
                byeRetried: true,
            };
            scheduleVoiceBroadcastInviteWatch(camId, 8000);
        }, 1500);
    });
}

function sendVoiceBroadcastForCam(camId) {
    const contact = getContactUriForCam(camId);
    if (!contact) return false;
    deviceControl.sendVoiceBroadcastNotify(sip, {
        cameraContactUri: contact,
        deviceId: camId,
        realm: REALM,
        serverId: SERVER_ID,
        log,
    });
    return true;
}

function releaseLiveBeforeVoicePhone(camId, done) {
    const finish = typeof done === 'function' ? done : function () {};
    if (!camId) return finish();
    if (liveStreamPool.isDashboardWatchingCam(camId)) {
        return finish();
    }
    releaseCamStreamWhenUnwatched(camId, { force: true }).finally(finish);
}

function launchOutboundTalkCall(camId, socket) {
    const contact = getContactUriForCam(camId);
    if (!contact) {
        emitBwcCallState(camId, false, 'BWC not registered');
        return;
    }
    const profile = voiceIntercomProfile.resolve();
    const tel = getVoiceIntercomTelemetry();
    pttVoiceCallCamId = camId;
    log.media.info('voice call outbound-intercom', {
        camId,
        profile: profile.id,
        label: profile.label,
        fallback: !!profile.fallback,
    });
    tel.logPhase(camId, 'pre-invite', profile.id);
    tel.requestStatus(camId, 'pre-invite', profile.id);
    releaseLiveBeforeVoicePhone(camId, function () {
        mediaSession.startOutboundTalkCall(sip, {
            camId,
            cameraContactUri: contact,
            realm: REALM,
            serverId: SERVER_ID,
            host: HOST,
            sipPort: SIP_PORT,
            intercomProfile: profile.id,
            intercomInvite: profile.invite,
            onConnected: (id) => {
                tel.logPhase(id, 'invite-200', profile.id);
                tel.requestStatus(id, 'post-200', profile.id);
                if (profile.stopRecordOnConnect) {
                    deviceControl.sendDeviceControl(sip, {
                        cameraContactUri: contact,
                        deviceId: id,
                        realm: REALM,
                        serverId: SERVER_ID,
                        recordCmd: 'StopRecord',
                        log,
                    });
                }
                emitBwcCallState(id, true, null, { via: 'outbound-intercom', profile: profile.id });
                auditLog.record('voice.call', Object.assign(
                    { target: id, mode: 'outbound-intercom', profile: profile.id },
                    auditVoiceCallActor(socket),
                ));
            },
            onFailed: (msg) => {
                pttVoiceCallCamId = null;
                tel.logPhase(camId, 'invite-failed', profile.id, { message: msg || null });
                emitBwcCallState(camId, false, msg || 'Outbound intercom call failed');
            },
        });
    });
}

function launchFleetVoiceBroadcast(camId, socket) {
    log.media.info('voice call broadcast-notify', { camId, noSip: true });
    if (!sendVoiceBroadcastForCam(camId)) {
        emitBwcCallState(camId, false, 'Voice broadcast failed');
        return;
    }
    pttVoiceCallCamId = camId;
    markRecentVoiceBroadcast(camId);
    voiceBroadcastPending = { camId, at: Date.now(), byeRetried: false };
    scheduleVoiceBroadcastInviteWatch(camId, 8000);
    auditLog.record('voice.call', Object.assign(
        { target: camId, mode: 'broadcast-notify' },
        auditVoiceCallActor(socket),
    ));
}

function startBwcVoiceCall(payload, socket) {
    const parsed = parseStartMediaPayload(payload);
    const camId = parsed.camId || connectedCameraId;
    const audioOnly = !!(payload && payload.audioOnly);
    log.media.info('start-bwc-call', { camId, audioOnly });
    if (!camId) {
        emitBwcCallState(null, false, 'No device selected');
        return;
    }
    if (conferenceModule.isBwcIngressActive(camId)) {
        emitBwcCallState(camId, false, 'BWC is sharing to video conference');
        return;
    }
    if (pttVoiceCallCamId === camId) {
        pttVoiceCallCamId = null;
        voiceBroadcastPending = null;
        clearVoiceInviteWatch();
        if (mediaSession.isVoiceCallActiveForCam(camId)) {
            mediaSession.endVoiceCallOnly(sip, () => {
                onVoiceIntercomEnded(camId);
                auditLog.record('voice.call.end', Object.assign({ target: camId }, auditVoiceCallActor(socket)));
                emitBwcCallState(camId, false, null, { via: 'broadcast' });
            });
            return;
        }
        auditLog.record('voice.call.end', Object.assign({ target: camId }, auditVoiceCallActor(socket)));
        emitBwcCallState(camId, false, null, { via: 'broadcast' });
        return;
    }
    if (mediaSession.isVoiceCallActiveForCam(camId)) {
        mediaSession.endVoiceCallOnly(sip, () => {
            onVoiceIntercomEnded(camId);
            auditLog.record('voice.call.end', Object.assign({ target: camId }, auditVoiceCallActor(socket)));
            emitBwcCallState(camId, false, null);
        });
        return;
    }
    if (audioOnly) {
        const contact = getContactUriForCam(camId);
        if (!contact) {
            emitBwcCallState(camId, false, 'BWC not registered');
            return;
        }
        if (pttVoiceCallCamId && pttVoiceCallCamId !== camId) {
            const prev = pttVoiceCallCamId;
            pttVoiceCallCamId = null;
            voiceBroadcastPending = null;
            clearVoiceInviteWatch();
            emitBwcCallState(prev, false, null);
        }
        const voicePath = bwcVoiceProfile.resolveFleetVoicePath(camId, buildVoiceProfileDeps());
        log.media.info('voice call path', { camId, voicePath });
        const launchVoice = () => {
            if (voicePath === 'outbound-intercom') {
                launchOutboundTalkCall(camId, socket);
            } else {
                launchFleetVoiceBroadcast(camId, socket);
            }
        };
        if (mediaSession.isVoiceCallActiveForCam(camId)) {
            mediaSession.endVoiceCallOnly(sip, launchVoice);
            return;
        }
        launchVoice();
        return;
    }
    if (!dashboardVideo.isStreamingForCam(camId)) {
        emitBwcCallState(camId, false, 'Start live video before calling');
        return;
    }
    if (!PTT_ENABLED) {
        emitBwcCallState(camId, false, 'PTT not enabled on server');
        return;
    }
    if (!pttServer.isDevicePttOnline(camId)) {
        emitBwcCallState(camId, false, 'BWC not on PTT channel — wait after live start');
        return;
    }
    if (pttVoiceCallCamId && pttVoiceCallCamId !== camId) {
        const prev = pttVoiceCallCamId;
        pttVoiceCallCamId = null;
        emitBwcCallState(prev, false, null);
    }
    log.media.info('voice call via ptt', { camId, preserveVideo: true });
    pttVoiceCallCamId = camId;
    auditLog.record('voice.call', Object.assign({ target: camId }, auditVoiceCallActor(socket)));
    emitBwcCallState(camId, true, null);
}



/** socket.id → camIds[] for group PTT fan-out after SOS ack */
const pttTalkTargetsBySocket = new Map();
/** Active operator→BWC call mic (PTT TX only — no second SIP INVITE). */
let pttVoiceCallCamId = null;

function seedFleetOnlineFromPersistedState() {
    syncFleetDeviceMeta();
    const marked = new Set();
    if (siteDb.isReady()) {
        siteDb.listRecentOnline(DEVICE_OFFLINE_MS).forEach((row) => {
            const camId = row && row.device_id ? String(row.device_id).trim() : '';
            if (!camId || !isBwcCameraId(camId) || marked.has(camId)) return;
            fleetRegistry.markOnline(camId);
            marked.add(camId);
        });
    }
    Object.keys(lastContactUriByCam).forEach((camId) => {
        if (!isBwcCameraId(camId) || marked.has(camId)) return;
        if (!lastContactUriByCam[camId]) return;
        fleetRegistry.markOnline(camId);
        marked.add(camId);
    });
    if (marked.size) {
        // INDUSTRY STANDARD FIX: Force the registry to clear the fake online status on boot
        fleetRegistry.getDashboardFleet().forEach((d) => { d.online = false; });

        deviceOnline = fleetRegistry.hasOnline();
        if (!connectedCameraId || !fleetRegistry.getDashboardFleet().find((d) => d.id === connectedCameraId && d.online)) {
            connectedCameraId = fleetRegistry.firstOnlineId();
        }
        if (connectedCameraId && lastContactUriByCam[connectedCameraId]) {
            cameraContactUri = lastContactUriByCam[connectedCameraId];
        }
        log.sip.info('fleet online seeding cleared honestly | awaiting real connections', { count: marked.size });
    }
}

function replayOnlineDeviceStateToSocket(socket) {
    const onlineFleet = fleetForSession(socket.dashboardUser).filter((d) => d && d.online);
    onlineFleet.forEach((d) => {
        socket.emit('heartbeat', { cameraId: d.id });
        const g = lastGpsByCam[d.id];
        if (g) {
            socket.emit('gps-update', { cameraId: d.id, lat: g.lat, lon: g.lon });
        }
        replayCachedTelemetryToSocket(socket, d.id);
    });
    onlineFleet.forEach((d, i) => {
        setTimeout(() => {
            if (loginReplayBlockedBySos()) {
                log.sip.info('login replay deferred', { camId: d.id, reason: 'sos_incident' });
                return;
            }
            if (!lastGpsByCam[d.id]) maybeQueryGpsForDevice(d.id, { force: true });
            queryDeviceStatus(d.id, { force: true });
        }, LOGIN_REPLAY_STAGGER_BASE_MS + i * LOGIN_REPLAY_STAGGER_STEP_MS);
    });
    if (!onlineFleet.length) {
        socket.emit('device-offline', {
            cameraId: connectedCameraId || null,
            reason: 'not_connected',
        });
    }
}

/** Coalesce rapid stop-video for the same cam (command wall + ops wall fighting). */
const stopVideoInProgress = new Set();

/** Stop BWC/SIP stream only when no dashboard socket still holds a viewer ref (VMS pattern). */
/** Stop BWC/SIP stream only when no dashboard socket still holds a viewer ref (VMS pattern). */
function releaseCamStreamWhenUnwatched(camId, opts) {
    if (!camId || liveViewers.countForCam(camId) > 0) return Promise.resolve(false);
    if (stopVideoInProgress.has(camId)) return Promise.resolve(false);

    const force = !!(opts && opts.force);
    // --- PROTECT AGAINST UI GLITCHES (INVITE DEFERRAL) ---
    if (!force && dashboardVideo.isInviteInFlight(camId) && !dashboardVideo.isStreamingForCam(camId)) {
        log.media.info('pool stop deferred', { camId, reason: 'invite_in_flight' });
        return new Promise((resolve) => {
            const deadline = Date.now() + 12000;
            (function poll() {
                if (liveViewers.countForCam(camId) > 0) return resolve(false);
                if (!dashboardVideo.isInviteInFlight(camId)) {
                    return releaseCamStreamWhenUnwatched(camId).then(resolve);
                }
                if (Date.now() >= deadline) {
                    return releaseCamStreamWhenUnwatched(camId, { force: true }).then(resolve);
                }
                setTimeout(poll, 250);
            })();
        });
    }
    if (force && dashboardVideo.isInviteInFlight(camId) && !dashboardVideo.isStreamingForCam(camId)) {
        log.media.info('pool stop forced', { camId, reason: 'invite_stuck' });
    }
    // -----------------------------------------------------

    stopVideoInProgress.add(camId);
    log.media.info('pool stop — no dashboard viewers', { camId });
    if (pttVoiceCallCamId === camId) {
        pttVoiceCallCamId = null;
        emitBwcCallState(camId, false, null);
    }
    if (mediaSession.isVoiceCallActiveForCam(camId)) {
        mediaSession.endVoiceCallOnly(sip, () => emitBwcCallState(camId, false, null));
    }
    return liveStreamPool.stopStreamForCam(sip, camId).then(() => {
        sosInviteQueue.onStreamStopped(camId);
        io.emit('video-stream-stopped', { camId, reason: 'operator_stop' });
        return true;
    }).finally(() => {
        stopVideoInProgress.delete(camId);
    });
}

io.on('connection', (socket) => {

    const sessionToken = dashboardAuth.sessionTokenFromRequest(socket.request);
    const session = dashboardAuth.getSession(sessionToken);
    socket.dashboardUser = session || null;

    log.web.info('dashboard connected', { user: session ? session.username : null });

    sosIncidents.getOpenAlarms().forEach((open) => {
        if (!open || !open.cameraId) return;
        if (!sessionCanSeeCam(session, open.cameraId)) return;
        const replay = buildOpenSosDashboardPayload(open.cameraId, { refresh: true, replay: true });
        if (replay) socket.emit('sos-alarm', replay);
    });
    socket.emit('sos-queue-update', filterSosQueueForSession(session, sosInviteQueue.getSnapshot()));

    socket.emit('server-capabilities', {
        pttEnabled: PTT_ENABLED,
        pttOnlineDevices: PTT_ENABLED ? pttServer.listOnlineDeviceIds() : [],
        pttDownlinkPolicy: buildPttDownlinkPolicyForClient(),
        voiceCallPolicy: buildVoiceProfileForClient(),
        permissions: dashboardAuth.getPermissionsForSession(session),
        role: session ? session.role : null,
        username: session ? session.username : null,
        dispatchScope: dispatchScopePayloadForSession(session),
        siteTime: {
            timezone: siteTime.getTimezone(),
            now: siteTime.formatEvidence(new Date()),
        },
    });
    socket.emit('smart-gps-state', { active: smartGpsTrack.listActive() });

    if (session && dashboardAuth.canDeviceKillSwitch(session)) {
        socket.emit('kill-switch-pending-list', { requests: killSwitchFourEyes.listPublic() });
    }

    syncFleetDeviceMeta();
    socket.emit('fleet-roster', fleetForSession(session));

    replayOnlineDeviceStateToSocket(socket);



    socket.on('pin-open', (data) => {
        const camId = data && data.cameraId ? String(data.cameraId).trim() : null;
        if (!camId) return;
        queryDeviceStatus(camId, { force: true });
        maybeQueryGpsForDevice(camId, { force: true });
    });

    socket.on('select-device', (data) => {
        dashboardSelectedCamId = data && data.cameraId ? String(data.cameraId) : null;
        log.web.info('dashboard selected device', { camId: dashboardSelectedCamId });
        if (dashboardSelectedCamId) {
            queryDeviceStatus(dashboardSelectedCamId, { force: true });
            const g = lastGpsByCam[dashboardSelectedCamId];
            if (g) {
                socket.emit('gps-update', {
                    cameraId: dashboardSelectedCamId,
                    lat: g.lat,
                    lon: g.lon,
                });
            }
        }
    });

    socket.on('remote-control', (payload) => {
        const session = socket.dashboardUser;
        const parsed = dashboardAuth.parseRemoteControlPayload(payload);
        const cmd = parsed.command;
        const camId = getCommandTargetCamId();
        const sockIp = auditLog.clientIp(socket.request);
        if (!cmd) return;
        if (dashboardAuth.isKillSwitchCommand(cmd)) {
            socket.emit('remote-control-denied', {
                error: 'Reboot and shut down require approval from a second operator.',
            });
            return;
        }
        if (!dashboardAuth.canRemoteControlCommand(session, cmd)) {
            log.web.warn('remote-control denied', {
                user: session ? session.username : null,
                command: cmd,
            });
            if (dashboardAuth.isKillSwitchCommand(cmd)) {
                auditLog.record('device.kill_switch_denied', {
                    actor: session ? session.username : null,
                    role: session ? session.role : null,
                    target: camId,
                    detail: { recordCmd: cmd, outcome: 'denied' },
                    clientIp: sockIp,
                });
            }
            socket.emit('remote-control-denied', {
                error: dashboardAuth.isKillSwitchCommand(cmd)
                    ? 'Shut down and reboot require the device kill switch permission.'
                    : 'Remote control permission not granted for your account.',
            });
            return;
        }
        const reasonCheck = dashboardAuth.validateRemoteControlReason(cmd, parsed.reason);
        if (!reasonCheck.ok) {
            log.web.warn('remote-control reason required', {
                user: session ? session.username : null,
                command: cmd,
            });
            const deniedDetail = { recordCmd: cmd, outcome: 'reason_required' };
            if (parsed.incidentId) deniedDetail.incidentId = parsed.incidentId;
            if (dashboardAuth.isKillSwitchCommand(cmd)) {
                auditLog.record('device.kill_switch_denied', {
                    actor: session ? session.username : null,
                    role: session ? session.role : null,
                    target: camId,
                    detail: deniedDetail,
                    clientIp: sockIp,
                });
            }
            socket.emit('remote-control-denied', { error: reasonCheck.error });
            return;
        }
        const contact = getContactUriForCam(camId);
        if (!camId || !contact) {
            log.sip.warn('remote-control blocked', { camId, hasContact: !!contact });
            return;
        }
        deviceControl.sendDeviceControl(sip, {
            cameraContactUri: contact,
            deviceId: camId,
            realm: REALM,
            serverId: SERVER_ID,
            recordCmd: cmd,
            log,
        });
        const auditDetail = { recordCmd: cmd };
        if (reasonCheck.reason) auditDetail.reason = reasonCheck.reason;
        if (parsed.incidentId) auditDetail.incidentId = parsed.incidentId;
        auditLog.record(dashboardAuth.isKillSwitchCommand(cmd) ? 'device.kill_switch' : 'device.remote_control', {
            actor: session ? session.username : null,
            role: session ? session.role : null,
            target: camId,
            detail: auditDetail,
            clientIp: sockIp,
        });
    });

    socket.on('kill-switch-request', (payload) => {
        const session = socket.dashboardUser;
        const parsed = dashboardAuth.parseRemoteControlPayload(payload);
        const cmd = parsed.command;
        const sockIp = auditLog.clientIp(socket.request);
        const camId = (payload && payload.camId != null ? String(payload.camId).trim() : '') || getCommandTargetCamId();
        if (!session || !session.userId) {
            socket.emit('kill-switch-denied', { error: 'Sign in required.' });
            return;
        }
        if (!dashboardAuth.isKillSwitchCommand(cmd)) {
            socket.emit('kill-switch-denied', { error: 'Invalid kill switch command.' });
            return;
        }
        if (!dashboardAuth.canDeviceKillSwitch(session)) {
            socket.emit('kill-switch-denied', { error: 'Shut down and reboot require the device kill switch permission.' });
            return;
        }
        const reasonCheck = dashboardAuth.validateRemoteControlReason(cmd, parsed.reason);
        if (!reasonCheck.ok) {
            socket.emit('kill-switch-denied', { error: reasonCheck.error });
            return;
        }
        if (!camId) {
            socket.emit('kill-switch-denied', { error: 'Select a BWC first.' });
            return;
        }
        const entry = killSwitchFourEyes.createRequest({
            recordCmd: cmd,
            camId,
            reason: reasonCheck.reason,
            incidentId: parsed.incidentId,
            requesterUserId: session.userId,
            requesterUsername: session.username,
            requesterRole: session.role,
        });
        auditLog.record('device.kill_switch_request', {
            actor: session.username,
            role: session.role,
            target: camId,
            detail: {
                recordCmd: cmd,
                reason: reasonCheck.reason,
                incidentId: parsed.incidentId || undefined,
                requestId: entry.id,
            },
            clientIp: sockIp,
        });
        socket.emit('kill-switch-request-ok', { request: killSwitchFourEyes.publicView(entry) });
        io.emit('kill-switch-pending-list', { requests: killSwitchFourEyes.listPublic() });
    });

    socket.on('kill-switch-approve', (payload) => {
        const session = socket.dashboardUser;
        const requestId = payload && payload.requestId != null ? String(payload.requestId).trim() : '';
        const sockIp = auditLog.clientIp(socket.request);
        if (!session || !session.userId) {
            socket.emit('kill-switch-denied', { error: 'Sign in required.' });
            return;
        }
        if (!dashboardAuth.canDeviceKillSwitch(session)) {
            socket.emit('kill-switch-denied', { error: 'Shut down and reboot require the device kill switch permission.' });
            return;
        }
        const req = killSwitchFourEyes.getRequest(requestId);
        if (!req) {
            socket.emit('kill-switch-denied', { error: 'Request expired or not found.' });
            return;
        }
        if (req.requesterUserId === session.userId) {
            auditLog.record('device.kill_switch_denied', {
                actor: session.username,
                role: session.role,
                target: req.camId,
                detail: { recordCmd: req.recordCmd, outcome: 'self_approve_blocked', requestId: req.id },
                clientIp: sockIp,
            });
            socket.emit('kill-switch-denied', { error: 'A different operator must approve this request.' });
            return;
        }
        const contact = getContactUriForCam(req.camId);
        if (!contact) {
            socket.emit('kill-switch-denied', { error: 'BWC is not reachable for remote control.' });
            return;
        }
        deviceControl.sendDeviceControl(sip, {
            cameraContactUri: contact,
            deviceId: req.camId,
            realm: REALM,
            serverId: SERVER_ID,
            recordCmd: req.recordCmd,
            log,
        });
        const auditDetail = {
            recordCmd: req.recordCmd,
            reason: req.reason,
            requester: req.requesterUsername,
            approver: session.username,
            requestedAt: req.requestedAt,
            approvedAt: new Date().toISOString(),
            requestId: req.id,
        };
        if (req.incidentId) auditDetail.incidentId = req.incidentId;
        auditLog.record('device.kill_switch', {
            actor: session.username,
            role: session.role,
            target: req.camId,
            detail: auditDetail,
            clientIp: sockIp,
        });
        killSwitchFourEyes.removeRequest(requestId);
        io.emit('kill-switch-resolved', { requestId: requestId, outcome: 'approved' });
        io.emit('kill-switch-pending-list', { requests: killSwitchFourEyes.listPublic() });
        socket.emit('kill-switch-approve-ok', { requestId: requestId });
    });

    socket.on('kill-switch-cancel', (payload) => {
        const session = socket.dashboardUser;
        const requestId = payload && payload.requestId != null ? String(payload.requestId).trim() : '';
        const sockIp = auditLog.clientIp(socket.request);
        if (!session || !session.userId) return;
        const req = killSwitchFourEyes.getRequest(requestId);
        if (!req) {
            socket.emit('kill-switch-denied', { error: 'Request expired or not found.' });
            return;
        }
        if (req.requesterUserId !== session.userId) {
            socket.emit('kill-switch-denied', { error: 'Only the requester can cancel this request.' });
            return;
        }
        killSwitchFourEyes.removeRequest(requestId);
        auditLog.record('device.kill_switch_request_cancelled', {
            actor: session.username,
            role: session.role,
            target: req.camId,
            detail: { recordCmd: req.recordCmd, requestId: req.id },
            clientIp: sockIp,
        });
        io.emit('kill-switch-resolved', { requestId: requestId, outcome: 'cancelled' });
        io.emit('kill-switch-pending-list', { requests: killSwitchFourEyes.listPublic() });
        socket.emit('kill-switch-cancel-ok', { requestId: requestId });
    });



    socket.on('send-message', (data) => {
        const text = data && data.text != null ? String(data.text) : '';
        const toPersons = resolveMessageRecipients(data);
        if (!toPersons.length) {
            log.messaging.warn('send blocked', { reason: 'no_recipient' });
            return;
        }
        const targetCamId = toPersons[0];

        // Find the camera's wireless message channel session
        const targetSocket = typeof activeCameraSockets !== 'undefined' ? activeCameraSockets.get(targetCamId) : null;

        // AUTO-WAKE FIX: If the connection is down, send a SIP configuration profile hint to force it awake
        if (!targetSocket || targetSocket.readyState !== WebSocket.OPEN) {
            log.messaging.warn('Text channel asleep, pushing profile hint over air link...', { device: targetCamId });
            if (typeof pushMsgServerHints === 'function') {
                pushMsgServerHints(targetCamId);
            }
            return;
        }

        const chunks = hdaMsg.buildOutboundChunks({
            text,
            toPersons,
            level: data && data.level != null ? data.level : hdaMsg.MSG_LEVEL.DEFAULT,
            type: data && data.type != null ? data.type : hdaMsg.MSG_TYPE.TXT,
            name: (data && data.name) || 'FleetBackend',
        });

        if (!targetSocket._outMsgQueue) {
            targetSocket._outMsgQueue = new hdaMsg.OutboundMessageQueue(targetSocket, log);
        }
        targetSocket._outMsgQueue.reset();
        targetSocket._outMsgQueue.enqueue(chunks);

        log.messaging.info('message queued', { packets: chunks.length, chars: text.length, to: toPersons });

        const outPayload = {
            cameraId: targetCamId,
            text,
            time: siteTime.formatEvidenceShort(new Date()),
            level: data && data.level != null ? data.level : 0,
            type: data && data.type != null ? data.type : 0,
            name: (data && data.name) || 'FleetBackend',
            toPersons,
            direction: 'out',
        };
        io.emit('camera-message', outPayload);
        persistCameraMessage(outPayload);
    });



    socket.on('start-video', (payload) => {
        const parsed = parseStartMediaPayload(payload || {});
        const camId = parsed.camId;
        const mode = parsed.mode || 'video';
        const surface = liveViewers.normalizeSurface(parsed.surface || (payload && payload.surface));
        if (camId && mode === 'video') {
            const viewers = liveViewers.addView(socket.id, camId, surface);
            log.media.trace('start-video viewer ref', { camId, socketId: socket.id, surface, viewers });
        }
        startMediaFromDashboard(payload, socket);
    });

    socket.on('audio-focus', (payload) => {
        const camId = payload && payload.camId ? String(payload.camId).trim() : null;
        if (!camId) return;
        if (dashboardVideo.isStreamingForCam(camId)) {
            liveStreamPool.setAudioFocusCamId(camId);
        }
    });

    socket.on('stop-video', (payload) => {
        const parsed = parseStartMediaPayload(payload || {});
        const camId = parsed.camId;

        // --- DEFENSIVE SHIELD: Ignore UI ghost commands ---
        if (!camId && payload && Object.prototype.hasOwnProperty.call(payload, 'camId')) {
            log.media.warn('ignored empty stop-video command from glitchy UI');
            return; 
        }
        // --------------------------------------------------

        if (camId) {
            const surface = liveViewers.normalizeSurface(parsed.surface || (payload && payload.surface));
            const remaining = liveViewers.removeView(socket.id, camId, surface);
            const refs = liveViewers.refBreakdownForCam(camId);
            log.media.info('stop-video from dashboard', {
                camId,
                surface,
                socketId: socket.id,
                remainingViewers: remaining,
                remainingOps: refs.ops,
                remainingCommandWall: refs.commandWall,
                remainingConference: refs.conferenceRefs,
                countForCam: refs.countForCam,
                socketsWithRefs: refs.socketsWithRefs,
            });
            releaseCamStreamWhenUnwatched(camId);
            return;
        }
        
        log.media.info('stop-video all from dashboard', { socketId: socket.id });
        const toStop = liveViewers.releaseSocket(socket.id);
        const callCam = mediaSession.getVoiceCallCamId() || pttVoiceCallCamId;
        if (toStop.length) {
            Promise.all(toStop.map((id) => releaseCamStreamWhenUnwatched(id))).finally(() => {
                sosInviteQueue.tryStartNext();
            });
        } else {
            sosInviteQueue.tryStartNext();
        }
        if (callCam && !liveViewers.countForCam(callCam)) {
            pttVoiceCallCamId = null;
            mediaSession.stopMediaSession(sip).finally(() => {
                emitBwcCallState(callCam, false, null);
            });
        }
    });



    socket.on('start-bwc-call', (payload) => startBwcVoiceCall(payload, socket));

    socket.on('end-bwc-call', (payload) => {
        const parsed = parseStartMediaPayload(payload);
        const camId = parsed.camId || pttVoiceCallCamId || mediaSession.getVoiceCallCamId();
        if (camId && pttVoiceCallCamId === camId) {
            const wasBroadcast = !!(voiceBroadcastPending && voiceBroadcastPending.camId === camId);
            pttVoiceCallCamId = null;
            voiceBroadcastPending = null;
            clearVoiceInviteWatch();
            if (mediaSession.isVoiceCallActiveForCam(camId)) {
                mediaSession.endVoiceCallOnly(sip, () => {
                    onVoiceIntercomEnded(camId);
                    auditLog.record('voice.call.end', Object.assign({ target: camId }, auditVoiceCallActor(socket)));
                    emitBwcCallState(camId, false, null, { via: wasBroadcast ? 'broadcast' : 'ptt' });
                });
                return;
            }
            auditLog.record('voice.call.end', Object.assign({ target: camId }, auditVoiceCallActor(socket)));
            emitBwcCallState(camId, false, null, { via: wasBroadcast ? 'broadcast' : 'ptt' });
            return;
        }
        if (camId && mediaSession.isVoiceCallActiveForCam(camId)) {
            mediaSession.endVoiceCallOnly(sip, () => {
                onVoiceIntercomEnded(camId);
                auditLog.record('voice.call.end', Object.assign({ target: camId }, auditVoiceCallActor(socket)));
                emitBwcCallState(camId, false, null);
            });
            return;
        }
        if (camId) {
            emitBwcCallState(camId, false, null);
        }
    });

    socket.on('call-audio', (meta, chunk) => {
        if (!meta || !chunk) return;
        const camId = meta.camId || pttVoiceCallCamId || mediaSession.getVoiceCallCamId();
        if (!camId) return;
        const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        if (!buf.length) return;
        if (mediaSession.isVoiceCallActiveForCam(camId)) {
            const tx = VOICE_CALL_TX_GAIN === 1 ? buf : amplifyAlaw(buf, VOICE_CALL_TX_GAIN);
            if (!mediaSession.sendVoiceCallAudio(tx)) {
                log.media.warn('call audio tx dropped', { camId, bytes: tx.length });
            }
            return;
        }
        if (pttVoiceCallCamId === camId && PTT_ENABLED) {
            const loud = amplifyAlaw(buf, 1.5);
            if (!pttServer.sendPttAudioToDevice(camId, loud)) {
                log.media.warn('call audio tx dropped', { camId, bytes: buf.length });
            }
        }
    });

    socket.on('ptt-start', (payload) => {
        if (!PTT_ENABLED) {
            emitPttTalkState(socket, null, false, 'PTT disabled on server');
            return;
        }
        const parsed = parseStartMediaPayload(payload);
        let camIds = [];
        if (payload && Array.isArray(payload.camIds) && payload.camIds.length) {
            camIds = payload.camIds.map(String).filter(Boolean);
        } else {
            const one = parsed.camId || connectedCameraId;
            if (one) camIds = [String(one)];
        }
        if (!camIds.length) {
            emitPttTalkState(socket, null, false, 'No device selected');
            return;
        }
        const vcBlocked = camIds.filter(function (id) { return conferenceModule.isBwcIngressActive(id); });
        if (vcBlocked.length) {
            emitPttTalkState(socket, vcBlocked[0], false, 'BWC is sharing to video conference');
            return;
        }
        const online = camIds.filter((id) => pttServer.isDevicePttOnline(id));
        if (!online.length) {
            log.ptt.warn('talk blocked', { camIds, reason: 'none_on_ptt' });
            emitPttTalkState(socket, null, false, 'No selected BWC on PTT channel — check TCP 29201 after register');
            return;
        }
        pttTalkTargetsBySocket.set(socket.id, online);
        log.ptt.info('operator talk start', { camIds: online, group: online.length > 1 });
        online.forEach((id) => queryDeviceStatus(id, { force: false }));
        emitPttTalkState(socket, online[0], true, null);
    });

    socket.on('ptt-audio', (meta, chunk) => {
        if (!PTT_ENABLED || !meta || !chunk) return;
        const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        if (!buf.length) return;
        const targets = pttTalkTargetsBySocket.get(socket.id);
        const camIds = targets && targets.length
            ? targets
            : [meta.camId || connectedCameraId].filter(Boolean);
        camIds.forEach((camId) => {
            const loud = amplifyAlaw(buf, 1.5);
            if (!pttServer.sendPttAudioToDevice(camId, loud)) {
                log.ptt.warn('talk frame dropped', { camId, bytes: loud.length });
            }
        });
    });

    socket.on('ptt-stop', (payload) => {
        const parsed = parseStartMediaPayload(payload);
        const targets = pttTalkTargetsBySocket.get(socket.id) || [];
        pttTalkTargetsBySocket.delete(socket.id);
        const camId = parsed.camId || (targets[0] || connectedCameraId);
        if (camId) log.ptt.info('operator talk stop', { camId, groupSize: targets.length });
        emitPttTalkState(socket, camId || null, false, null);
    });

    socket.on('ptt-wake-device', (payload) => {
        if (!PTT_ENABLED) return;
        const camId = payload && payload.camId ? String(payload.camId).trim() : null;
        if (!camId || !sessionCanSeeCam(session, camId)) return;
        const dev = fleetRegistry.getDashboardFleet().find((d) => d && d.id === camId);
        if (!dev || !dev.online) {
            log.ptt.warn('fleet ptt wake skipped', { camId, reason: 'device_offline' });
            return;
        }
        if (!getContactUriForCam(camId)) {
            log.ptt.warn('fleet ptt wake skipped', { camId, reason: 'no_contact' });
            return;
        }
        pushPttGroupForCamera(camId, '66');
        queryDeviceStatus(camId, { force: true });
        log.ptt.info('operator fleet ptt wake', {
            camId,
            user: session && session.username ? session.username : null,
        });
    });

    socket.on('ptt-restore-always-on', () => {
        if (!PTT_ENABLED) return;
        restoreAlwaysOnPttGroups();
    });

    socket.on('disconnect', () => {
        pttTalkTargetsBySocket.delete(socket.id);
        const toStop = liveViewers.releaseSocket(socket.id);
        if (!toStop.length) return;
        log.media.info('dashboard disconnect — release live refs', { socketId: socket.id, cams: toStop });
        toStop.forEach((id) => { releaseCamStreamWhenUnwatched(id); });
    });



    socket.on('start-intercom', (payload) => {

        const p = parseStartMediaPayload(payload);
        const mode = p.mode || 'audio';
        const camId = p.camId || connectedCameraId;

        if (mode === 'audio' && camId) {
            if (conferenceModule.isBwcIngressActive(camId)) {
                emitBwcCallState(camId, false, 'BWC is sharing to video conference');
                return;
            }
            launchOutboundTalkCall(camId, socket);
            return;
        }

        startMediaFromDashboard({ camId: p.camId, mode, transport: p.transport });

    });

});



function scheduleOfflineWatch() {
    if (offlineWatchTimer) clearTimeout(offlineWatchTimer);
    if (!deviceOnline || !connectedCameraId) return;
    const wait = Math.max(5000, DEVICE_OFFLINE_MS - (Date.now() - lastDeviceSeenAt));
    offlineWatchTimer = setTimeout(() => {
        offlineWatchTimer = null;
        if (!deviceOnline || !connectedCameraId) return;
        if (Date.now() - lastDeviceSeenAt < DEVICE_OFFLINE_MS) {
            scheduleOfflineWatch();
            return;
        }
        markDeviceOffline(connectedCameraId, 'keepalive_timeout');
    }, wait);
}

function touchDeviceOnline(camId) {
    lastDeviceSeenAt = Date.now();
    deviceOnline = true;
    connectedCameraId = camId;
    if (lastContactUriByCam[camId]) {
        cameraContactUri = lastContactUriByCam[camId];
    }
    fleetRegistry.markOnline(camId);
    fleetRegistry.touch(camId);
    ensureBwcEntryForDevice(camId);
    if (siteDb.isReady()) {
        siteDb.touchRuntime(camId, { online: true, lastSeen: Date.now() });
    }
    scheduleOfflineWatch();
}

/** mob-me8-online-notify — DevStatus push counts as live even when SIP REGISTER lags. */
function touchDevicePresenceFromTelemetry(camId, source) {
    if (!camId || (source !== 'notify' && source !== 'keepalive')) return;
    const rec = fleetRegistry.ensure(camId);
    if (!rec) return;
    if (!rec.online) {
        fleetRegistry.markOnline(camId);
        deviceOnline = fleetRegistry.hasOnline();
        if (!connectedCameraId || !(fleetRegistry.ensure(connectedCameraId) || {}).online) {
            connectedCameraId = camId;
            if (lastContactUriByCam[camId]) cameraContactUri = lastContactUriByCam[camId];
        }
        ensureBwcEntryForDevice(camId);
        if (siteDb.isReady()) {
            siteDb.touchRuntime(camId, { online: true, lastSeen: Date.now() });
        }
        log.sip.info('device online from telemetry', { camId, source });
        emitFleetRoster({ force: true });
        pushFleetRoster(camId, '66', true);
    } else {
        fleetRegistry.touch(camId);
    }
    if (connectedCameraId === camId) {
        lastDeviceSeenAt = Date.now();
        scheduleOfflineWatch();
    }
}

function markDeviceOffline(camId, reason) {
    if (!camId) return;
    log.sip.info('device offline', { camId, reason });
    lastStatusQueryAtByCam.delete(String(camId));
    lastGpsQueryAtByCam.delete(String(camId));
    fleetRegistry.markOffline(camId);
    if (siteDb.isReady()) {
        siteDb.touchRuntime(camId, { online: false, lastSeen: Date.now() });
    }
    if (offlineWatchTimer) {
        clearTimeout(offlineWatchTimer);
        offlineWatchTimer = null;
    }
    if (connectedCameraId === camId) {
        connectedCameraId = null;
        if (dashboardSelectedCamId !== camId) cameraContactUri = null;
    }
    deviceOnline = fleetRegistry.hasOnline();
    if (deviceOnline && !connectedCameraId) {
        const next = fleetRegistry.firstOnlineId();
        if (next) {
            connectedCameraId = next;
            cameraContactUri = getContactUriForCam(next);
        }
    }
    if (!deviceOnline) cameraContactUri = null;
    const lastGps = lastGpsByCam[camId];
    emitToDashboardSockets('device-offline', {
        cameraId: camId,
        reason: reason || 'disconnected',
        lat: lastGps && lastGps.lat != null ? lastGps.lat : null,
        lon: lastGps && lastGps.lon != null ? lastGps.lon : null,
    }, camId);
    emitFleetRoster({ force: true });
    pushFleetRoster(camId, '66', false);
}

let lastFleetRosterEmitAt = 0;
const FLEET_ROSTER_THROTTLE_MS = parseInt(process.env.FM_FLEET_ROSTER_THROTTLE_MS || '5000', 10);

function emitFleetRoster(opts) {
    const force = !!(opts && opts.force);
    const now = Date.now();
    if (!force && now - lastFleetRosterEmitAt < FLEET_ROSTER_THROTTLE_MS) return;
    lastFleetRosterEmitAt = now;
    emitFleetRosterToDashboards();
}

function parseRegisterExpires(request) {
    const raw = request.headers && request.headers.expires;
    if (raw == null) return null;
    const v = parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
    return Number.isNaN(v) ? null : v;
}

function pushFleetRoster(camId, sn, online, opts) {
    if (opts && opts.forceRoster) emitFleetRoster({ force: true });
    else emitFleetRoster();
    const isOnline = online !== undefined ? !!online : deviceOnline;
    syncFleetDeviceMeta();
    const fleet = fleetRoster.getFleetRoster(camId, isOnline);
    const contact = getContactUriForCam(camId);

    if (!isOnline || !contact) return;



    let deviceListXml = '';

    fleet.forEach((dev) => {

        deviceListXml += `\n<device>\n<name>${dev.name}</name>\n<id>${dev.id}</id>\n<pnumber>${dev.pnumber}</pnumber>\n<status>${dev.status}</status>\n<ertId>${dev.ertId}</ertId>\n</device>`;

    });



    const onlineStatusXml = `<?xml version="1.0" encoding="utf-8"?>\n<Notify>\n<CmdType>OnlineStatus</CmdType>\n<SN>${SERVER_ID}</SN>\n<DeviceList Num="${fleet.length}">${deviceListXml}\n</DeviceList>\n<Status>OK</Status>\n<SumNum>${fleet.length}</SumNum>\n<SNID>${sn}</SNID>\n<MsgServerIP>${HOST}</MsgServerIP>\n<MsgServerPort>${MSG_WS_PORT}</MsgServerPort>\n<MsgServerUri>${MSG_WS_URL}</MsgServerUri>\n</Notify>`;



    sip.send({

        method: 'MESSAGE',

        uri: contact,

        headers: {

            to: { uri: `sip:${camId}@${REALM}` },

            from: { uri: `sip:${SERVER_ID}@${REALM}`, params: { tag: Math.floor(Math.random() * 10000).toString() } },

            'call-id': Math.random().toString(36).substring(7),

            cseq: { method: 'MESSAGE', seq: 2 },

            'content-type': 'Application/MANSCDP+xml',

            'content-length': onlineStatusXml.length,

        },

        content: onlineStatusXml,

    }, () => {});

}

function mergeBatteryTelemetry(camId, batteryRaw, source) {
    if (!camId || batteryRaw == null || batteryRaw === '') return false;
    const battery = telemetryFromXml.formatBattery(batteryRaw) || String(batteryRaw).trim();
    if (!battery || battery === '—') return false;
    const rec = fleetRegistry.ensure(camId);
    const prev = (rec && rec.telemetry) || {};
    const payload = {
        cameraId: camId,
        battery,
        signal: prev.signal || '—',
        recording: prev.recording != null ? prev.recording : '0',
        audio: prev.audio != null ? prev.audio : '0',
        callstate: prev.callstate != null ? prev.callstate : '0',
        volume: prev.volume || '—',
        antishake: prev.antishake != null ? prev.antishake : '0',
        appversion: prev.appversion || '—',
        deviceTime: prev.deviceTime || '—',
    };
    log.sip.info('telemetry battery update', { camId, battery, source });
    fleetRegistry.updateTelemetry(camId, payload);
    emitToDashboardSockets('device-status', payload, camId);
    return true;
}

function emitDeviceStatus(camId, notify, rawXml, source) {
    if (!camId) return false;
    if (source === 'notify' || source === 'keepalive') {
        touchDevicePresenceFromTelemetry(camId, source);
    }
    let parsed = telemetryFromXml.parseDeviceStatus(notify, rawXml);
    if (!parsed.hasData && rawXml) {
        parsed = telemetryFromXml.parseDeviceStatusRawFallback(rawXml);
    }
    if (!parsed.hasData && rawXml && rawXml.includes('<CmdType>DevStatus</CmdType>')) {
        const battery = telemetryFromXml.extractBatteryFromXml(rawXml, notify);
        const signalRaw = (rawXml.match(/<Signal>([^<]+)<\/Signal>/i) || [])[1];
        const recordOn = /<(?:Record|VideoRecord)>[^<]*(?:ON|1)/i.test(rawXml);
        const deviceTime = telemetryFromXml.extractDeviceTimeFromXml(rawXml, notify);
        if (battery || signalRaw || deviceTime) {
            parsed = {
                hasData: true,
                battery: battery || null,
                signal: signalRaw ? String(signalRaw).trim() : null,
                recording: recordOn ? '1' : null,
                encode: null,
                audio: null,
                callstate: null,
                volume: null,
                antishake: null,
                appversion: null,
                deviceTime: deviceTime || null,
                online: null,
            };
        }
    }
    if (!parsed.deviceTime && rawXml) {
        const dt = telemetryFromXml.extractDeviceTimeFromXml(rawXml, notify);
        if (dt) {
            parsed.deviceTime = dt;
            parsed.hasData = true;
        }
    }
    const serverStamp = siteTime.formatEvidence(new Date());
    if (!parsed.hasData) {
        if (source === 'keepalive' || source === 'response' || source === 'notify') {
            const preview = (rawXml || '').replace(/\s+/g, ' ').trim().slice(0, 280);
            log.sip.trace('telemetry no fields', { source, camId, preview });
        }
        const clockPayload = Object.assign(
            telemetryFromXml.toDashboardPayload(camId, { battery: null, signal: null, recording: null }),
            {
                serverTime: serverStamp,
                siteTimezone: siteTime.getTimezone(),
                deviceTime: serverStamp,
                deviceTimeSource: 'server',
            }
        );
        fleetRegistry.updateTelemetry(camId, clockPayload);
        emitToDashboardSockets('device-status', clockPayload, camId);
        return false;
    }
    if (!parsed.battery && rawXml) {
        parsed.battery = telemetryFromXml.extractBatteryFromXml(rawXml, notify);
    }
    const payload = telemetryFromXml.toDashboardPayload(camId, parsed);
    payload.serverTime = serverStamp;
    payload.siteTimezone = siteTime.getTimezone();
    if (payload.deviceTime && payload.deviceTime !== '—') {
        payload.deviceTimeSource = 'device';
    } else {
        payload.deviceTime = serverStamp;
        payload.deviceTimeSource = 'server';
    }
    const prevTel = (fleetRegistry.ensure(camId) || {}).telemetry;
    if (payload.battery === '—' && prevTel && prevTel.battery && prevTel.battery !== '—') {
        payload.battery = prevTel.battery;
    }
    const hasDeviceFields = payload.deviceTimeSource === 'device'
        || payload.battery !== '—'
        || payload.signal !== '—'
        || payload.recording != null;
    if (hasDeviceFields) {
        log.sip.info('telemetry update', {
            source,
            camId,
            battery: payload.battery,
            signal: payload.signal,
            video: payload.recording,
            deviceTime: payload.deviceTime,
            deviceTimeSource: payload.deviceTimeSource,
        });
    } else {
        log.sip.trace('telemetry clock only', { source, camId, deviceTime: payload.deviceTime });
    }
    if (payload.battery === '—' && source === 'response' && rawXml) {
        log.sip.info('telemetry battery missing', {
            camId,
            xmlLen: rawXml.length,
            xml: rawXml.replace(/\s+/g, ' ').trim().slice(0, 1200),
        });
    }
    fleetRegistry.updateTelemetry(camId, payload);
    getVoiceIntercomTelemetry().onDeviceStatus(camId, payload, source);
    emitToDashboardSockets('device-status', payload, camId);
    return true;
}

function sendStatusQuery(camId, cmdType, style) {
    const contact = getContactUriForCam(camId);
    if (!contact || !camId) {
        log.sip.warn('device status query skipped', { camId, hasContact: !!contact });
        return;
    }
    const sn = String(Math.floor(Math.random() * 100000));
    const queryStyle = style === 'target' ? 'target' : 'direct';
    const xml = queryStyle === 'target'
        ? `<?xml version="1.0"?>\n<Query>\n<CmdType>${cmdType}</CmdType>\n<SN>${sn}</SN>\n<DeviceID>${SERVER_ID}</DeviceID>\n<TargetDeviceID>${camId}</TargetDeviceID>\n</Query>`
        : `<?xml version="1.0"?>\n<Query>\n<CmdType>${cmdType}</CmdType>\n<SN>${sn}</SN>\n<DeviceID>${camId}</DeviceID>\n</Query>`;
    log.sip.info('device status query sending', { camId, cmdType, style: queryStyle });
    sip.send({
        method: 'MESSAGE',
        uri: contact,
        headers: {
            to: { uri: `sip:${camId}@${REALM}` },
            from: { uri: `sip:${SERVER_ID}@${REALM}`, params: { tag: Math.floor(Math.random() * 10000).toString() } },
            'call-id': Math.random().toString(36).substring(7),
            cseq: { method: 'MESSAGE', seq: 4 },
            'content-type': 'Application/MANSCDP+xml',
            'content-length': xml.length,
        },
        content: xml,
    }, () => {
        log.sip.info('device status query sent', { camId, cmdType, style: queryStyle });
    });
}

function sendMobilePositionQuery(camId, intervalSec) {
    const contact = getContactUriForCam(camId);
    if (!contact || !camId) {
        log.sip.warn('mobile position query skipped', { camId, hasContact: !!contact });
        return;
    }
    const sn = String(Math.floor(Math.random() * 100000));
    const interval = parseInt(intervalSec, 10);
    const intervalXml = (!Number.isNaN(interval) && interval > 0)
        ? `\n<Interval>${interval}</Interval>`
        : '';
    const xml = `<?xml version="1.0"?>\n<Query>\n<CmdType>MobilePosition</CmdType>\n<SN>${sn}</SN>\n<DeviceID>${camId}</DeviceID>${intervalXml}\n</Query>`;
    log.sip.info('mobile position query sending', { camId, interval: interval || null });
    sip.send({
        method: 'MESSAGE',
        uri: contact,
        headers: {
            to: { uri: `sip:${camId}@${REALM}` },
            from: { uri: `sip:${SERVER_ID}@${REALM}`, params: { tag: Math.floor(Math.random() * 10000).toString() } },
            'call-id': Math.random().toString(36).substring(7),
            cseq: { method: 'MESSAGE', seq: 5 },
            'content-type': 'Application/MANSCDP+xml',
            'content-length': xml.length,
        },
        content: xml,
    }, () => {
        log.sip.info('mobile position query sent', { camId, interval: interval || null });
    });
}

smartGpsTrack.configure({
    log: log,
    sendMobilePositionQuery: sendMobilePositionQuery,
    syncHighResDevices: function (camIds) { gpsTrack.setHighResDevices(camIds); },
    emitState: function () { emitSmartGpsState(); },
});

function queryMobilePosition(camId) {
    sendMobilePositionQuery(camId, null);
}

function deviceNeedsGpsPoll(camId) {
    const g = lastGpsByCam[camId];
    return !g || g.lat == null || g.lon == null;
}

function queryCooldownOk(map, camId, cooldownMs) {
    const id = String(camId || '').trim();
    if (!id) return false;
    const last = map.get(id) || 0;
    if (Date.now() - last < cooldownMs) return false;
    map.set(id, Date.now());
    return true;
}

function queryDeviceStatus(camId, opts) {
    if (!getContactUriForCam(camId) || !camId) {
        log.sip.warn('device status query skipped', { camId, hasContact: !!getContactUriForCam(camId) });
        return false;
    }
    const force = !!(opts && opts.force);
    if (!force && !queryCooldownOk(lastStatusQueryAtByCam, camId, STATUS_QUERY_COOLDOWN_MS)) {
        log.sip.info('device status query throttled', { camId, cooldownSec: STATUS_QUERY_COOLDOWN_MS / 1000 });
        return false;
    }
    sendStatusQuery(camId, 'DeviceStatus');
    setTimeout(() => sendStatusQuery(camId, 'DeviceStatus', 'target'), 600);
    setTimeout(() => sendStatusQuery(camId, 'DevStatus'), 1200);
    setTimeout(() => sendStatusQuery(camId, 'DevStatus', 'target'), 1800);
    setTimeout(() => sendStatusQuery(camId, 'DeviceInfo'), 2400);
    return true;
}

function maybeQueryGpsForDevice(camId, opts) {
    if (!getContactUriForCam(camId) || !camId || !deviceNeedsGpsPoll(camId)) return false;
    const force = !!(opts && opts.force);
    if (!force && !queryCooldownOk(lastGpsQueryAtByCam, camId, GPS_QUERY_COOLDOWN_MS)) {
        return false;
    }
    queryMobilePosition(camId);
    return true;
}

function pollGpsForOnlineDevices(opts) {
    const force = !!(opts && opts.force);
    const withStatus = !!(opts && opts.withStatus);
    const staggerMs = opts && opts.staggerMs != null ? Math.max(0, parseInt(opts.staggerMs, 10) || 0) : 0;
    const online = fleetRegistry.getDashboardFleet().filter((d) => d && d.online);
    online.forEach((d, i) => {
        const run = () => {
            maybeQueryGpsForDevice(d.id, { force });
            if (withStatus) queryDeviceStatus(d.id, { force });
        };
        if (staggerMs > 0) setTimeout(run, i * staggerMs);
        else run();
    });
    return online.length;
}

/** After restart: restore every known-online BWC onto the map (any fleet size). */
function bootstrapOnlineFleetForMap() {
    const n = pollGpsForOnlineDevices({ force: true, withStatus: true, staggerMs: 250 });
    if (n > 0) {
        emitFleetRoster({ force: true });
        log.sip.info('online fleet map bootstrap', { count: n });
    }
}

function pushMsgServerHints(camId) {
    const contact = getContactUriForCam(camId);
    if (!contact || !camId) return;
    const sn = String(Math.floor(Math.random() * 100000));
    const xml = `<?xml version="1.0" encoding="utf-8"?>\n<Notify>\n<CmdType>DeviceConfig</CmdType>\n<SN>${sn}</SN>\n<DeviceID>${SERVER_ID}</DeviceID>\n<TargetDeviceID>${camId}</TargetDeviceID>\n<MsgServerIP>${HOST}</MsgServerIP>\n<MsgServerPort>${MSG_WS_PORT}</MsgServerPort>\n<MsgServerUri>${MSG_WS_URL}</MsgServerUri>\n</Notify>`;
    sip.send({
        method: 'MESSAGE',
        uri: contact,
        headers: {
            to: { uri: `sip:${camId}@${REALM}` },
            from: { uri: `sip:${SERVER_ID}@${REALM}`, params: { tag: Math.floor(Math.random() * 10000).toString() } },
            'call-id': Math.random().toString(36).substring(7),
            cseq: { method: 'MESSAGE', seq: 3 },
            'content-type': 'Application/MANSCDP+xml',
            'content-length': xml.length,
        },
        content: xml,
    }, () => {
        log.messaging.info('msg server hint sent', { camId, uri: MSG_WS_URL });
    });
}

let msgLinkTimer = null;
function pushPttGroupForCamera(camId, snid) {
    const contact = getContactUriForCam(camId);
    if (!PTT_ENABLED || !contact || !camId) return;
    syncFleetDeviceMeta();
    const fleet = fleetRoster.getFleetRoster(camId);
    pttServer.pushPttGroupToDevice(sip, {
        cameraContactUri: contact,
        camId,
        realm: REALM,
        serverId: SERVER_ID,
        host: HOST,
        gtid: PTT_GTID,
        port: PTT_PORT,
        status: PTT_GROUP_STATUS,
        snid: snid || '66',
        devices: fleetRoster.fleetToPttDevices(fleet),
        log,
    });
}

/** BWC often drops PTT TCP when live video INVITE starts — re-push group so 29201 reconnects. */
function schedulePttGroupRefreshForCam(camId, reason) {
    if (!PTT_ENABLED || !camId) return;
    const id = String(camId).trim();
    [2000, 8000].forEach((delayMs) => {
        setTimeout(() => {
            if (!getContactUriForCam(id)) return;
            pushPttGroupForCamera(id, '66');
            log.ptt.info('group refresh scheduled', { camId: id, delayMs, reason: reason || 'live' });
        }, delayMs);
    });
}

function restoreAlwaysOnPttGroups() {
    if (!PTT_ENABLED) return { restored: 0, camIds: [] };
    syncFleetDeviceMeta();
    const pushed = new Set();
    fleetRegistry.getDashboardFleet().forEach((d) => {
        const camId = d && d.id ? String(d.id).trim() : '';
        if (!camId || !d.online || pushed.has(camId) || !isBwcCameraId(camId)) return;
        if (!getContactUriForCam(camId)) return;
        pushPttGroupForCamera(camId, '66');
        pushed.add(camId);
    });
    const camIds = [...pushed];
    if (camIds.length) {
        log.ptt.info('always-on group restored', { count: camIds.length, camIds });
    }
    return { restored: camIds.length, camIds };
}

function scheduleMsgLinkCheck(camId) {
    if (msgLinkTimer) clearTimeout(msgLinkTimer);
    msgLinkTimer = setTimeout(() => {
        if (!connectedCameraId || connectedCameraId !== camId) return;
        const msgSocket = activeCameraSockets.get(camId);
        if (msgSocket && msgSocket.readyState === WebSocket.OPEN) return;
        log.messaging.warn('msg link missing after register', {
            device: camId,
            expect: MSG_WS_URL,
            action: 'check_bwc_message_server_menu',
        });
        pushMsgServerHints(camId);
    }, 12000);
}

sipListenerReady = false;
try {
sip.start({ address: BIND_HOST, port: SIP_PORT }, (request, remote) => {

    if (request.method === 'REGISTER') {

        const camIdMatch = request.headers.from.uri.match(/sip:(.*)@/);

        const camId = camIdMatch ? camIdMatch[1] : null;
        const expires = parseRegisterExpires(request);

        if (camId && expires === 0) {
            markDeviceOffline(camId, 'register_expired');
            sip.send(sip.makeResponse(request, 200, 'OK'));
            return;
        }

        if (camId && request.headers.contact) {

            touchDeviceOnline(camId);

            cameraContactUri = request.headers.contact[0].uri;
            lastContactUriByCam[camId] = cameraContactUri;
            recordCamIp(camId, cameraContactUri);
            saveContactCache();

            emitToDashboardSockets('heartbeat', { cameraId: camId }, camId);

            const lastGps = lastGpsByCam[camId];
            if (lastGps) {
                emitToDashboardSockets('gps-update', { cameraId: camId, lat: lastGps.lat, lon: lastGps.lon }, camId);
            } else {
                maybeQueryGpsForDevice(camId);
            }

            pushFleetRoster(camId, '66', true, { forceRoster: true });
            pushMsgServerHints(camId);
            pushPttGroupForCamera(camId);
            scheduleMsgLinkCheck(camId);
            queryDeviceStatus(camId);
            log.sip.info('register ok', {
                camId,
                contact: cameraContactUri,
                telemetry: 'v2',
                msgWs: !!((activeCameraSockets.get(camId) || {}).readyState === WebSocket.OPEN),
            });

        } else {

            log.sip.warn('register incomplete', { camId });

        }

        sip.send(sip.makeResponse(request, 200, 'OK'));

        return;

    }



    if (request.method === 'BYE') {
        sip.send(sip.makeResponse(request, 200, 'OK'));
        const callId = request.headers['call-id'];
        const voiceCam = mediaSession.onRemoteBye(sip, callId);
        if (voiceCam) {
            voiceBroadcastPending = null;
            clearVoiceInviteWatch();
            onVoiceIntercomEnded(voiceCam);
            emitBwcCallState(voiceCam, false, null);
            log.sip.info('bye from device', { voiceCall: voiceCam });
            return;
        }
        const confCam = conferenceBwcIngress.onRemoteBye(callId);
        if (confCam) {
            log.sip.info('bye from device', { conferenceBwc: confCam });
            return;
        }
        if (voiceBroadcastPending && pttVoiceCallCamId) {
            const byeCam = camIdFromInboundInvite(request);
            if (byeCam === pttVoiceCallCamId
                && voiceBroadcastPending.camId === byeCam
                && !voiceBroadcastPending.byeRetried
                && Date.now() - voiceBroadcastPending.at < 8000) {
                relaunchVoiceBroadcastAfterDeviceBye(byeCam);
            }
        }
        const poolCam = liveStreamPool.onRemoteBye(callId);
        if (poolCam) {
            io.emit('video-stream-stopped', { camId: poolCam, reason: 'device_bye' });
        }
        log.sip.info('bye from device', { poolCam: poolCam || null });
        return;
    }

    if (request.method === 'INVITE') {

        sip.send(sip.makeResponse(request, 100, 'Trying'));

        const inboundCamId = camIdFromInboundInvite(request);
        const audioOnlyInvite = isInboundAudioOnlyInvite(request);
        const voiceBroadcastCam = (pttVoiceCallCamId && inboundCamId === pttVoiceCallCamId)
            || (audioOnlyInvite && inboundCamId && isRecentVoiceBroadcast(inboundCamId));
        log.sip.info('sip invite inbound', {
            camId: inboundCamId,
            pendingVoice: pttVoiceCallCamId,
            audioOnlyInvite,
            recentBroadcast: !!(inboundCamId && isRecentVoiceBroadcast(inboundCamId)),
        });
        if (voiceBroadcastCam && inboundCamId) {
            if (!pttVoiceCallCamId) {
                log.media.info('voice call late inbound invite', { camId: inboundCamId });
                pttVoiceCallCamId = inboundCamId;
            }
            voiceBroadcastPending = null;
            clearVoiceInviteWatch();
            clearRecentVoiceBroadcast(inboundCamId);
            const parsed = mediaSession.replyToInboundVoiceCall(sip, request, HOST, SERVER_ID, inboundCamId);
            log.sip.info('inbound voice call answered', { camId: inboundCamId, mode: parsed.mode });
            auditLog.record('voice.call.rx', { target: inboundCamId, mode: 'broadcast-inbound' });
            emitBwcCallState(inboundCamId, true, null, { via: 'broadcast' });
            io.emit('bwc-call-rx', { camId: inboundCamId, active: true });
            return;
        }

        const parsed = mediaSession.replyToInboundInvite(sip, request, HOST, SERVER_ID, wss, BASE_DIR);

        log.sip.info('inbound invite answered', parsed);

        return;

    }



    if (request.method === 'MESSAGE') {
        // Google SOS rule 1: 200 OK immediately (before XML / DB / INVITE) so BWC stops Alarm retries.
        sip.send(sip.makeResponse(request, 200, 'OK'));

        if (!request.content) return;

        ingestGpsFromSipContent(null, request.content);

        xml2js.parseString(request.content, (err, result) => {
            if (err) {
                log.sip.warn('xml parse failed', err.message);
                return;
            }
            if (!result) return;

            if (result.Response) {
                const cmdType = result.Response.CmdType ? result.Response.CmdType[0] : '';
                const camId = resolveMessageCamId(request, result.Response.DeviceID ? result.Response.DeviceID[0] : null);
                const respPreview = (request.content || '').replace(/\s+/g, ' ').trim().slice(0, 280);
                if (cmdType) {
                    log.sip.info('sip response received', { cmdType, camId, preview: respPreview });
                }
                if (cmdType === 'DeviceControl') {
                    const ack = result.Response.Result ? result.Response.Result[0] : 'UNKNOWN';
                    log.sip.info('device control result', { camId, result: ack });
                    io.emit('device-control-ack', { cameraId: camId, result: ack });
                    if (ack === 'OK' && camId && sosIncidents.hasOpenAlarm(camId)) {
                        ingestLatestFtpSnapshot(camId);
                    }
                } else if (cmdType === 'Broadcast') {
                    const ack = result.Response.Result ? result.Response.Result[0] : 'UNKNOWN';
                    log.sip.info('voice broadcast ack', { camId, result: ack });
                } else if (cmdType === 'DeviceStatus' || cmdType === 'DevStatus' || cmdType === 'MobilePosition') {
                    if (cmdType === 'DeviceStatus' || cmdType === 'DevStatus') {
                        try {
                            emitDeviceStatus(camId, result.Response, request.content, 'response');
                        } catch (telErr) {
                            log.sip.err('telemetry emit failed', { camId, cmdType, message: telErr.message });
                        }
                    }
                    const rCoords = resolveCoords(camId, result.Response, request.content);
                    emitGpsIfValid(camId, rCoords.lat, rCoords.lon);
                    if (cmdType === 'MobilePosition') {
                        log.sip.info('mobile position response', {
                            camId,
                            lat: rCoords.lat,
                            lon: rCoords.lon,
                        });
                    }
                } else if (cmdType === 'DeviceInfo' || cmdType === 'ConfigDownload') {
                    if (cmdType === 'DeviceInfo') {
                        try {
                            emitDeviceStatus(camId, result.Response, request.content, 'response');
                        } catch (telErr) {
                            log.sip.err('telemetry emit failed', { camId, cmdType, message: telErr.message });
                        }
                    }
                    const battery = telemetryFromXml.extractBatteryFromXml(request.content, result.Response);
                    if (battery) mergeBatteryTelemetry(camId, battery, cmdType.toLowerCase());
                    else if (cmdType === 'ConfigDownload') {
                        const cfgCoords = coordsFromXmlString(request.content);
                        const cfgLa = parseGpsCoord(cfgCoords.lat);
                        const cfgLo = parseGpsCoord(cfgCoords.lon);
                        if (isBwcCameraId(camId) && !Number.isNaN(cfgLa) && !Number.isNaN(cfgLo)
                            && (cfgLa !== 0 || cfgLo !== 0)) {
                            emitGpsIfValid(camId, cfgCoords.lat, cfgCoords.lon);
                        }
                        log.sip.info('config download response', {
                            camId,
                            lat: cfgCoords.lat,
                            lon: cfgCoords.lon,
                            xml: (request.content || '').replace(/\s+/g, ' ').trim().slice(0, 1200),
                        });
                    }
                } else if (cmdType) {
                    const preview = (request.content || '').replace(/\s+/g, ' ').trim().slice(0, 280);
                    log.sip.info('sip response other', { cmdType, camId, preview });
                }
                return;
            }

            if (!result.Notify) return;

            const cmdType = result.Notify.CmdType[0];
            const camId = result.Notify.DeviceID ? result.Notify.DeviceID[0] : connectedCameraId;
            const sn = result.Notify.SN ? result.Notify.SN[0] : '66';

            if (cmdType === 'ReqOnlineList') pushFleetRoster(camId, sn);
            if (cmdType === 'ReqGroupTalkList') {
                log.ptt.info('group list requested', { camId, sn });
                pushPttGroupForCamera(camId, sn);
            }
            if (cmdType === 'Keepalive') {
                if (camId) touchDeviceOnline(camId);
                restoreCameraContactForCam(camId, request, remote);
                emitToDashboardSockets('heartbeat', { cameraId: camId }, camId);
                pushFleetRoster(camId, sn, true);
                const kCoords = resolveCoords(camId, result.Notify, request.content);
                emitGpsIfValid(camId, kCoords.lat, kCoords.lon);
                emitDeviceStatus(camId, result.Notify, request.content, 'keepalive');
            }
            if (cmdType === 'LocationInfo' || cmdType === 'MobilePosition') {
                const coords = resolveCoords(camId, result.Notify, request.content);
                emitGpsIfValid(camId, coords.lat, coords.lon);
                if (cmdType === 'MobilePosition') {
                    log.sip.info('mobile position notify', { camId, lat: coords.lat, lon: coords.lon });
                }
            }
            if (cmdType === 'Alarm') {
                if (camId) {
                    log.sip.info('sip alarm notify received', {
                        camId,
                        sn,
                        preview: (request.content || '').replace(/\s+/g, ' ').trim().slice(0, 200),
                    });
                    const alarmMeta = alarmFromXml.classifyAlarmNotify(result.Notify, request.content);
                    const alarmKind = alarmMeta.alarmKind || 'sos';
                    let alarmTime = siteTime.formatEvidenceShort(new Date());
                    if (result.Notify.AlarmTime) alarmTime = result.Notify.AlarmTime[0].replace('T', ' ');
                    const coords = resolveCoords(camId, result.Notify, request.content);
                    deviceAlarm.raiseDeviceAlarm({
                        cameraId: camId,
                        alarmKind,
                        alarmTime,
                        lat: coords.lat,
                        lon: coords.lon,
                        alarmMethod: alarmMeta.alarmMethod,
                        alarmType: alarmMeta.alarmType,
                        source: 'sip_alarm',
                        sipRequest: request,
                    });
                }
            }
            if (cmdType === 'DevStatus' || cmdType === 'DeviceStatus') {
                const dCoords = resolveCoords(camId, result.Notify, request.content);
                emitGpsIfValid(camId, dCoords.lat, dCoords.lon);
                emitDeviceStatus(camId, result.Notify, request.content, 'notify');
            } else if (cmdType && cmdType !== 'Keepalive' && cmdType !== 'ReqOnlineList' && cmdType !== 'ReqGroupTalkList'
                && cmdType !== 'LocationInfo' && cmdType !== 'Alarm') {
                log.sip.info('sip notify other', { cmdType, camId });
            }
        });

        return;

    }



    log.sip.info('sip request', { method: request.method });

});
sipListenerReady = true;
} catch (err) {
    log.sip.err('sip listener init failed', { message: err.message });
}



const ports = mediaSession.getPorts();

(async function startServer() {
    try {
        platformLicense.assertReadyForStartup();
        await ffmpegRuntime.assertReady(log);
    } catch (err) {
        const isLicense = /license/i.test(err.message);
        if (isLicense) log.web.err('startup blocked — license', { error: err.message });
        else log.media.err('startup blocked — ffmpeg', { error: err.message });
        console.error('\nMobility C2 cannot start: ' + err.message);
        if (isLicense) {
            console.error('See docs/LICENSE-OPERATIONS.md (vendor / technical ops)\n');
        } else {
            console.error('Fix: cd to FleetBackend and run  npm install\n');
        }
        process.exit(1);
    }

    server.listen(HTTP_PORT, '0.0.0.0', () => {
    bootstrapBwcDeviceList();
    syncFleetDeviceMeta();
    seedFleetOnlineFromPersistedState();
    bootstrapOnlineFleetForMap();

    zlmRuntime.warmup(log).catch((err) => {
        log.media.warn('zlm warmup', { message: err.message });
    });

    mediaSession.startTcpMediaServer(HOST, wss, BASE_DIR);
    if (PTT_ENABLED) {
        pttServer.startPttServer({
            host: HOST,
            port: PTT_PORT,
            gtid: PTT_GTID,
            log,
            resolveCamId: resolvePttCamId,
            onDeviceState: emitPttDeviceState,
            onPttRxState: emitPttRxState,
            onPttRxAudio: emitPttRxAudio,
            policyDeps: buildPttAudioCmdDeps,
            learnedCmdsPath: path.join(STORAGE_DIR, 'ptt-learned-cmds.json'),
        });
    }
    if (FTP_ENABLED) {
        startFtpServerRuntime();
    }

    log.web.info('dashboard listening', { url: `http://${HOST}:${HTTP_PORT}`, folder: __dirname });
    log.sip.info('telemetry enabled', {
        build: 'v2',
        queryOnRegister: true,
        gpsPollMs: GPS_POLL_MS,
        statusQueryCooldownMs: STATUS_QUERY_COOLDOWN_MS,
        logFile: log.logFile,
    });
    setInterval(pollGpsForOnlineDevices, GPS_POLL_MS);

    log.sip.info('sip listening', { publicHost: HOST, bind: BIND_HOST, port: SIP_PORT });

    log.messaging.info('websocket listening', { bind: '0.0.0.0', port: MSG_WS_PORT, deviceUrl: MSG_WS_URL });

    log.media.info('bridge listening', {

        ws: VIDEO_WS_PORT,

        audioWs: AUDIO_WS_PORT,

        udpVideo: ports.VIDEO_UDP_PORT,

        udpAudio: ports.AUDIO_UDP_PORT,

        tcp: ports.MEDIA_TCP_PORT,

        ffmpeg: require('./lib/resolveFfmpeg').resolveFfmpegPath(),

        ffmpegSource: require('./lib/resolveFfmpeg').resolveFfmpegSource(),

        ffmpegVersion: ffmpegRuntime.getVersionLine(),

        mediaTransport: MEDIA_TRANSPORT,

        logFile: log.logFile,

    });

    if (PTT_ENABLED) {
        log.ptt.info('enabled', { host: HOST, port: PTT_PORT, gtid: PTT_GTID });
    }
    if (FTP_ENABLED) {
        if (!FTP_PASS || !FTP_USER) {
            log.ftp.err('not running — set FTP credentials in Evidence → Storage, then save');
        } else {
            log.ftp.info('configured', {
                host: HOST,
                port: FTP_PORT,
                user: FTP_USER,
                root: FTP_ROOT,
                pasv: `${FTP_PASV_MIN}-${FTP_PASV_MAX}`,
                hint: 'BWC FTP CHECK needs firewall TCP ' + FTP_PORT + ' and ' + FTP_PASV_MIN + '-' + FTP_PASV_MAX,
            });
        }
    }

    });
})();
