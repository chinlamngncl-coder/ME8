/**
 * Video conference orchestration — LiveKit rooms, lobby, recording, BWC ingress.
 * Does not modify SOS / dashboard live video paths.
 */
const path = require('path');
const fs = require('fs');
const conferenceStore = require('./conferenceStore');
const conferenceLivekit = require('./conferenceLivekit');
const conferenceBwcIngress = require('./conferenceBwcIngress');
const conferenceConfig = require('./conferenceConfig');
const log = require('./fleetLog');

let dispatchGroups = null;
let getOnlineCamIds = null;
let listDashboardUsers = null;
let storageDir = null;
let isVoiceActiveForCam = null;
let broadcastConferenceUpdate = null;
let liveStreamPool = null;
let liveViewers = null;
let getSip = null;
let poolInviteCfg = null;

function shareImagesDir() {
    return path.join(storageDir || path.join(__dirname, '..', 'storage'), 'conference-shares');
}

function init(opts) {
    storageDir = opts && opts.storageDir;
    isVoiceActiveForCam = opts && opts.isVoiceActiveForCam;
    broadcastConferenceUpdate = opts && opts.broadcastConferenceUpdate;
    liveStreamPool = opts && opts.liveStreamPool;
    liveViewers = opts && opts.liveViewers;
    getSip = opts && opts.getSip;
    conferenceStore.init(storageDir);
    const bwcOpts = Object.assign({}, opts && opts.bwcIngress);
    bwcOpts.onRemoteStop = function (camId, meta) {
        handleBwcIngressRemoteStop(camId, meta).catch(function () { /* ignore */ });
    };
    conferenceBwcIngress.init(bwcOpts);
    poolInviteCfg = opts && opts.bwcIngress ? {
        realm: opts.bwcIngress.realm,
        serverId: opts.bwcIngress.serverId,
        host: opts.bwcIngress.host,
        sipPort: opts.bwcIngress.sipPort,
        baseDir: opts.bwcIngress.baseDir,
        getContactUriForCam: opts.bwcIngress.getContactUriForCam,
    } : null;
    dispatchGroups = opts && opts.dispatchGroups;
    getOnlineCamIds = opts && opts.getOnlineCamIds;
    listDashboardUsers = opts && opts.listDashboardUsers;
}

function statusPayload() {
  const lk = conferenceLivekit.publicStatus();
  return {
    ok: true,
    livekit: lk,
    rooms: conferenceStore.listRooms(),
    maxSeats: conferenceStore.MAX_SEATS,
    maxBwcIngress: conferenceStore.MAX_BWC_INGRESS,
    openSourceNotice: {
      mcu: 'WebRTC video service (Apache-2.0)',
      client: 'WebRTC browser client (Apache-2.0)',
      mobile: 'WebRTC mobile SDK (Apache-2.0)',
    },
    features: {
      offlineEdge: !!lk.edgeUrl,
      turn: !!lk.turnUrl,
      recording: lk.enabled,
      bwcIngress: lk.enabled,
      crossGroupGuests: true,
    },
    muteAllOnStart: !!conferenceConfig.getRuntime().muteAllOnStart,
  };
}

function assertLivekit() {
    if (!conferenceLivekit.isEnabled()) {
        throw new Error('Video conference MCU is not configured. Set FM_LIVEKIT_URL, FM_LIVEKIT_API_KEY, FM_LIVEKIT_API_SECRET and start LiveKit (see docs/VIDEO-CONFERENCE-SETUP.md).');
    }
}

function userIdentity(user) {
    return 'user-' + (user.userId || user.id || user.username);
}

function resolveJoinIdentity(user, opts) {
    const base = userIdentity(user);
    const kind = opts && opts.clientKind ? String(opts.clientKind).trim().toLowerCase() : '';
    if (kind === 'mobile') return base + '-mobile';
    if (kind === 'web') return base + '-web';
    return base;
}

function canHost(user, perms) {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    return !!(perms && perms.conferenceHost);
}

function canManageFloor(user, perms) {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    return canHost(user, perms);
}

function defaultFloor() {
    return { mutedAll: false, allowedSpeakers: [], speakRequests: [] };
}

function getFloor(room) {
    if (!room || !room.floor) return defaultFloor();
    return {
        mutedAll: !!room.floor.mutedAll,
        allowedSpeakers: (room.floor.allowedSpeakers || []).slice(),
        speakRequests: (room.floor.speakRequests || []).slice(),
    };
}

function getFloorPayload(room) {
    return getFloor(room);
}

async function collectAlwaysAllowedIdentities(room, lkName, actorUser) {
    const allowed = new Set();
    if (room && room.hostUserId) {
        allowed.add(userIdentity({ userId: room.hostUserId, username: room.hostUsername }));
    }
    if (actorUser) allowed.add(userIdentity(actorUser));
    (room && room.seats || []).forEach(function (s) {
        if (s.role === 'super_admin' && s.identity) allowed.add(s.identity);
    });
    const res = await conferenceLivekit.listParticipants(lkName);
    const list = Array.isArray(res) ? res : ((res && res.participants) ? res.participants : []);
    list.forEach(function (p) {
        try {
            const meta = p.metadata ? JSON.parse(p.metadata) : {};
            if (meta.role === 'super_admin') allowed.add(p.identity);
        } catch (_) { /* ignore bad metadata */ }
    });
    return allowed;
}

async function broadcastFloorState(roomId) {
    const room = conferenceStore.getRoom(roomId);
    const lkName = conferenceStore.livekitRoomName(roomId);
    await conferenceLivekit.sendRoomData(lkName, {
        type: 'vc-floor-state',
        floor: getFloorPayload(room),
    });
}

function resolveMuteAllOnStart(body) {
    if (body && typeof body.muteAllOnStart === 'boolean') return body.muteAllOnStart;
    return !!conferenceConfig.getRuntime().muteAllOnStart;
}

async function enforceParticipantMicMuted(lkName, identity, muted) {
    for (let attempt = 0; attempt < 10; attempt++) {
        try {
            await conferenceLivekit.setParticipantMicMuted(lkName, identity, muted);
            return;
        } catch (_) {
            await new Promise(function (resolve) { setTimeout(resolve, 400); });
        }
    }
}

async function applyMuteAllFloor(roomId, user) {
    const room = conferenceStore.getRoom(roomId);
    if (!room || !room.active) throw new Error('Room is not active');
    const lkName = conferenceStore.livekitRoomName(roomId);
    const allowed = await collectAlwaysAllowedIdentities(room, lkName, user);
    const allowedArr = Array.from(allowed);
    const out = await conferenceLivekit.muteAllRemoteAudio(lkName, allowedArr);
    conferenceStore.upsertRoom(roomId, {
        floor: {
            mutedAll: true,
            allowedSpeakers: allowedArr,
            speakRequests: [],
        },
    });
    await broadcastFloorState(roomId);
    return { muted: out.muted || 0, floor: getFloorPayload(conferenceStore.getRoom(roomId)) };
}

async function startRoom(roomId, user, perms, body) {
    assertLivekit();
    if (!canHost(user, perms)) throw new Error('Conference host permission required');
    const room = conferenceStore.getRoom(roomId);
    if (!room) throw new Error('Unknown room');
    const lkName = conferenceStore.livekitRoomName(roomId);
    await conferenceLivekit.ensureRoom(lkName);
    const updated = conferenceStore.upsertRoom(roomId, {
        active: true,
        hostUserId: user.userId || user.id,
        hostUsername: user.username,
        dispatchGroupId: body && body.dispatchGroupId ? body.dispatchGroupId : null,
        startedAt: room.startedAt || new Date().toISOString(),
        seats: room.seats || [],
        guests: room.guests || [],
        recording: null,
        bwcIngressList: [],
        floor: defaultFloor(),
    });
    if (resolveMuteAllOnStart(body)) {
        await applyMuteAllFloor(roomId, user);
    }
    return { room: conferenceStore.getRoom(roomId) || updated, livekitRoom: lkName };
}

async function stopRoomBwcIngressList(room) {
    const list = conferenceStore.bwcIngressList(room);
    for (let i = 0; i < list.length; i++) {
        const item = list[i];
        if (!item || !item.camId) continue;
        conferenceBwcIngress.stop(item.camId);
        if (item.ingressId) {
            try { await conferenceLivekit.deleteIngress(item.ingressId); } catch (_) { /* ignore */ }
        }
        if (liveViewers && liveViewers.removeConferenceRef) {
            liveViewers.removeConferenceRef(item.camId);
        }
    }
    for (let j = 0; j < list.length; j++) {
        const camId = list[j] && list[j].camId;
        if (camId) {
            releasePoolStreamWhenUnwatched(camId).catch(function () { /* ignore */ });
        }
    }
}

async function endRoom(roomId, user, perms) {
    const room = conferenceStore.getRoom(roomId);
    if (!room) throw new Error('Unknown room');
    if (room.active && !canHost(user, perms) && (room.hostUserId !== (user.userId || user.id))) {
        throw new Error('Only the host or conference admin can end this room');
    }
    if (room.recording && room.recording.egressId) {
        await conferenceLivekit.stopEgress(room.recording.egressId);
        conferenceStore.updateRecording(room.recording.recordingId, {
            endedAt: new Date().toISOString(),
            status: 'processing',
        });
    }
    const lkName = conferenceStore.livekitRoomName(roomId);
    if (conferenceLivekit.isEnabled()) {
        try {
            await conferenceLivekit.shutdownRoom(lkName, { roomId: roomId });
        } catch (err) {
            log.web.warn('conference room shutdown failed', { roomId: roomId, error: err.message });
        }
    }
    await stopRoomBwcIngressList(room);
    const updated = conferenceStore.upsertRoom(roomId, {
        active: false,
        hostUserId: null,
        hostUsername: null,
        seats: [],
        guests: [],
        recording: null,
        bwcIngressList: [],
        startedAt: null,
        floor: defaultFloor(),
    });
    if (broadcastConferenceUpdate) {
        broadcastConferenceUpdate('conference-room-ended', { roomId: roomId });
    }
    return { room: updated };
}

async function joinToken(roomId, user, perms, opts) {
    assertLivekit();
    const view = perms && (perms.conferenceView || perms.conferenceJoin);
    if (!view && user.role !== 'super_admin') throw new Error('Conference access not authorized');
    const room = conferenceStore.getRoom(roomId);
    if (!room || !room.active) throw new Error('Room is not active');
    const lkName = conferenceStore.livekitRoomName(roomId);
    const identity = resolveJoinIdentity(user, opts);
    const meta = {
        username: user.username,
        role: user.role,
        guest: !!(opts && opts.guest),
        dispatchGroupId: opts && opts.dispatchGroupId,
        clientKind: opts && opts.clientKind ? String(opts.clientKind) : undefined,
    };
    const token = await conferenceLivekit.buildToken({
        roomName: lkName,
        identity,
        name: user.username || identity,
        metadata: meta,
        canPublish: !!(perms.conferenceJoin || perms.conferenceHost || user.role === 'super_admin'),
        canSubscribe: true,
    });
    const seats = (room.seats || []).filter(function (s) { return s.identity !== identity; });
    if (perms.conferenceJoin || perms.conferenceHost || user.role === 'super_admin') {
        if (seats.length >= conferenceStore.MAX_SEATS && !seats.find(function (s) { return s.identity === identity; })) {
            throw new Error('Room is full (max ' + conferenceStore.MAX_SEATS + ' participants)');
        }
        seats.push({
            identity,
            username: user.username,
            role: user.role,
            joinedAt: new Date().toISOString(),
            guest: !!(opts && opts.guest),
        });
        conferenceStore.upsertRoom(roomId, { seats: seats.slice(0, conferenceStore.MAX_SEATS) });
    }
    const finalRoom = conferenceStore.getRoom(roomId);
    const floorPayload = getFloorPayload(finalRoom);
    if (floorPayload.mutedAll) {
        const allowed = new Set(floorPayload.allowedSpeakers || []);
        collectAlwaysAllowedIdentities(finalRoom, lkName, user).then(function (always) {
            always.forEach(function (id) { allowed.add(id); });
            if (!allowed.has(identity)) {
                enforceParticipantMicMuted(lkName, identity, true).catch(function () { /* ignore */ });
            }
        }).catch(function () { /* ignore */ });
    }
    return {
        token,
        livekitUrl: (opts && opts.clientWsUrl) || conferenceLivekit.readConfig().clientWsUrl || conferenceLivekit.readConfig().wsUrl,
        roomName: lkName,
        roomId,
        identity,
        role: user.role,
        canManageFloor: canManageFloor(user, perms),
        floor: floorPayload,
    };
}

async function mobileJoinToken(user, perms, body) {
    const roomId = body && body.roomId;
    if (!roomId) throw new Error('roomId required');
    if (!canJoinConference(user, perms)) {
        throw new Error('Video conference join is not enabled for your account. Ask a super admin to enable VC join in Server → Operators.');
    }
    return joinToken(roomId, user, perms, body);
}

async function notifyPeerLeave(roomId, user, clientKind) {
    const room = conferenceStore.getRoom(roomId);
    if (!room) return { ok: true };
    const kind = clientKind ? String(clientKind).trim().toLowerCase() : 'web';
    const identity = resolveJoinIdentity(user, { clientKind: kind });
    const seats = (room.seats || []).filter(function (s) { return s.identity !== identity; });
    if (seats.length !== (room.seats || []).length) {
        conferenceStore.upsertRoom(roomId, { seats });
    }
    if (conferenceLivekit.isEnabled()) {
        try {
            const lkName = conferenceStore.livekitRoomName(roomId);
            await conferenceLivekit.sendRoomData(lkName, {
                type: 'vc-peer-left',
                base: userIdentity(user),
                from: kind,
            });
        } catch (_) { /* room may already be closed */ }
    }
    return { ok: true };
}

function canJoinConference(user, perms) {
    if (user && user.role === 'super_admin') return true;
    return !!(perms && perms.conferenceJoin);
}

async function startRecording(roomId, user, perms) {
    assertLivekit();
    if (!canHost(user, perms) && !(perms && perms.conferenceRecord)) {
        throw new Error('Conference record permission required');
    }
    const room = conferenceStore.getRoom(roomId);
    if (!room || !room.active) throw new Error('Room is not active');
    if (room.recording && room.recording.egressId) throw new Error('Recording already active');
    const recordingId = conferenceStore.newRecordingId();
    const lkName = conferenceStore.livekitRoomName(roomId);
    await conferenceLivekit.ensureRoom(lkName);
    const out = await conferenceLivekit.startRoomCompositeEgress(
        lkName,
        recordingId,
        conferenceStore.recordingsRoot()
    );
    const rec = {
        id: recordingId,
        roomId,
        egressId: out.egressId,
        filePath: out.filePath,
        fileName: path.basename(out.filePath),
        startedAt: new Date().toISOString(),
        endedAt: null,
        startedBy: user.username,
        status: 'recording',
    };
    conferenceStore.addRecording(rec);
    conferenceStore.upsertRoom(roomId, {
        recording: { recordingId, egressId: out.egressId, startedAt: rec.startedAt },
    });
    return { recording: rec };
}

async function stopRecording(roomId, user, perms) {
    const room = conferenceStore.getRoom(roomId);
    if (!room || !room.recording) throw new Error('No active recording');
    if (!canHost(user, perms) && !(perms && perms.conferenceRecord)) {
        throw new Error('Conference record permission required');
    }
    await conferenceLivekit.stopEgress(room.recording.egressId);
    const endedAt = new Date().toISOString();
    conferenceStore.updateRecording(room.recording.recordingId, {
        endedAt,
        status: 'ready',
    });
    conferenceStore.upsertRoom(roomId, { recording: null });
    return { recordingId: room.recording.recordingId, endedAt };
}

async function restoreWallStreamIfWatching(camId) {
    if (!liveStreamPool || !liveViewers || !getSip) return;
    if (liveStreamPool.isStreamingForCam(camId)) return;
    if (conferenceBwcIngress.isActive(camId)) return;
    const viewers = liveViewers.countForCam(camId);
    if (!viewers) return;
    const sip = getSip();
    if (!sip) return;
    try {
        const inviteOpts = buildPoolInviteOpts(camId);
        liveStreamPool.setAudioFocusCamId(camId);
        liveStreamPool.sendInviteWithFallback(sip, inviteOpts);
        log.media.info('conference bwc released — wall stream re-invited', { camId, viewers: viewers });
    } catch (e) {
        log.media.warn('conference wall restore failed', { camId, message: e.message });
    }
}

function buildPoolInviteOpts(camId) {
    const id = String(camId || '').trim();
    if (!id) throw new Error('camId required');
    if (!poolInviteCfg || !poolInviteCfg.getContactUriForCam) {
        throw new Error('Pool invite configuration not available');
    }
    const contact = poolInviteCfg.getContactUriForCam(id);
    if (!contact) throw new Error('BWC not online or unknown camId');
    return {
        cameraContactUri: contact,
        camId: id,
        realm: poolInviteCfg.realm,
        serverId: poolInviteCfg.serverId,
        host: poolInviteCfg.host,
        sipPort: poolInviteCfg.sipPort,
        mode: 'video',
        transport: 'udp',
        baseDir: poolInviteCfg.baseDir,
        fallbackTransport: 'tcp',
    };
}

async function releasePoolStreamWhenUnwatched(camId) {
    if (!liveViewers || liveViewers.countForCam(camId) > 0) return;
    if (!liveStreamPool || !getSip) return;
    if (conferenceBwcIngress.isActive(camId)) return;
    const sip = getSip();
    if (!sip) return;
    if (!liveStreamPool.isStreamingForCam(camId) && !liveStreamPool.isInviteInFlight(camId)) return;
    try {
        await liveStreamPool.stopStreamForCam(sip, camId);
        log.media.info('conference bwc released — pool stream stopped', { camId });
    } catch (e) {
        log.media.warn('conference pool release failed', { camId, message: e.message });
    }
}

function waitPoolStreaming(camId, timeoutMs) {
    const deadline = Date.now() + (timeoutMs || 18000);
    return new Promise(function (resolve, reject) {
        (function poll() {
            if (liveStreamPool.isStreamingForCam(camId)) return resolve(true);
            if (Date.now() >= deadline) {
                return reject(new Error('Live stream did not start for BWC — check BWC is online'));
            }
            setTimeout(poll, 250);
        })();
    });
}

async function ensurePoolStreamForConference(camId) {
    if (!liveStreamPool || !getSip) throw new Error('Live stream pool not available');
    const sip = getSip();
    if (!sip) throw new Error('SIP not available');
    if (!liveStreamPool.isStreamingForCam(camId)) {
        if (!liveStreamPool.isInviteInFlight(camId)) {
            const inviteOpts = buildPoolInviteOpts(camId);
            liveStreamPool.setAudioFocusCamId(camId);
            liveStreamPool.sendInviteWithFallback(sip, inviteOpts);
            log.media.info('conference bwc pool invite', { camId });
        }
        await waitPoolStreaming(camId);
    }
}

async function handleBwcIngressRemoteStop(camId, meta) {
    const rooms = conferenceStore.listRooms();
    const room = rooms.find(function (r) {
        return conferenceStore.bwcIngressList(r).some(function (b) { return b.camId === camId; });
    });
    if (!room) return;
    const roomId = room.id;
    const list = conferenceStore.bwcIngressList(room).filter(function (b) { return b.camId !== camId; });
    const stopped = conferenceStore.bwcIngressList(room).find(function (b) { return b.camId === camId; });
    if (stopped && stopped.ingressId) {
        try { await conferenceLivekit.deleteIngress(stopped.ingressId); } catch (_) { /* ignore */ }
    }
    conferenceStore.upsertRoom(roomId, { bwcIngressList: list });
    if (liveViewers && liveViewers.removeConferenceRef) {
        liveViewers.removeConferenceRef(camId);
    }
    if (broadcastConferenceUpdate) {
        broadcastConferenceUpdate('conference-bwc-ingress-stopped', {
            roomId,
            camId,
            reason: (meta && meta.reason) || 'remote_bye',
        });
    }
    restoreWallStreamIfWatching(camId).catch(function () { /* ignore */ });
    releasePoolStreamWhenUnwatched(camId).catch(function () { /* ignore */ });
}

async function addBwcIngress(roomId, user, perms, camId, displayName) {
    assertLivekit();
    if (!canHost(user, perms) && !(perms && perms.conferenceBwcShare)) {
        throw new Error('BWC share permission required');
    }
    if (conferenceBwcIngress.isActive(camId)) {
        throw new Error('BWC is already sharing to a conference');
    }
    if (isVoiceActiveForCam && isVoiceActiveForCam(camId)) {
        throw new Error('End fleet call on this BWC before conference share');
    }
    const room = conferenceStore.getRoom(roomId);
    if (!room || !room.active) throw new Error('Room is not active');
    const list = conferenceStore.bwcIngressList(room);
    if (list.length >= conferenceStore.MAX_BWC_INGRESS) {
        throw new Error('Maximum ' + conferenceStore.MAX_BWC_INGRESS + ' BWC shares per room');
    }
    if (list.some(function (b) { return b.camId === camId; })) {
        throw new Error('This BWC is already in the room');
    }
    const lkName = conferenceStore.livekitRoomName(roomId);
    const ingress = await conferenceLivekit.createBwcIngress(lkName, camId, displayName);
    if (!ingress.rtmpUrl) throw new Error('LiveKit ingress did not return RTMP URL');
    if (!liveStreamPool || !liveStreamPool.registerRtpMirror) {
        throw new Error('Live stream pool not available for BWC conference share');
    }
    if (liveViewers && liveViewers.addConferenceRef) {
        liveViewers.addConferenceRef(camId);
    }
    try {
        await ensurePoolStreamForConference(camId);
        await conferenceBwcIngress.startFromPoolMirror(camId, ingress.rtmpUrl, liveStreamPool.registerRtpMirror);
    } catch (err) {
        if (liveViewers && liveViewers.removeConferenceRef) {
            liveViewers.removeConferenceRef(camId);
        }
        releasePoolStreamWhenUnwatched(camId).catch(function () { /* ignore */ });
        try { await conferenceLivekit.deleteIngress(ingress.ingressId); } catch (_) { /* ignore */ }
        throw err;
    }
    const bwcIngress = {
        camId,
        ingressId: ingress.ingressId,
        displayName: displayName || camId,
        startedAt: new Date().toISOString(),
        startedBy: user.username,
    };
    const nextList = list.concat([bwcIngress]);
    conferenceStore.upsertRoom(roomId, { bwcIngressList: nextList });
    return { bwcIngress, bwcIngressList: nextList, ingress };
}

async function removeBwcIngress(roomId, user, perms, camId) {
    const room = conferenceStore.getRoom(roomId);
    const list = conferenceStore.bwcIngressList(room);
    if (!list.length) throw new Error('No BWC share active');
    if (!canHost(user, perms) && !(perms && perms.conferenceBwcShare)) {
        throw new Error('BWC share permission required');
    }
    const targetCam = camId ? String(camId).trim() : null;
    const toRemove = targetCam
        ? list.filter(function (b) { return b.camId === targetCam; })
        : list.slice();
    if (!toRemove.length) throw new Error('BWC share not found');
    for (let i = 0; i < toRemove.length; i++) {
        const item = toRemove[i];
        conferenceBwcIngress.stop(item.camId);
        if (item.ingressId) {
            try { await conferenceLivekit.deleteIngress(item.ingressId); } catch (_) { /* ignore */ }
        }
        restoreWallStreamIfWatching(item.camId).catch(function () { /* ignore */ });
    }
    const remaining = targetCam
        ? list.filter(function (b) { return b.camId !== targetCam; })
        : [];
    conferenceStore.upsertRoom(roomId, { bwcIngressList: remaining });
    if (liveViewers && liveViewers.removeConferenceRef) {
        toRemove.forEach(function (item) {
            if (item && item.camId) liveViewers.removeConferenceRef(item.camId);
        });
    }
    for (let j = 0; j < toRemove.length; j++) {
        releasePoolStreamWhenUnwatched(toRemove[j].camId).catch(function () { /* ignore */ });
    }
    return { ok: true, bwcIngressList: remaining };
}

async function muteAllParticipants(roomId, user, perms) {
    assertLivekit();
    if (!canManageFloor(user, perms)) throw new Error('Conference host permission required');
    const out = await applyMuteAllFloor(roomId, user);
    return { ok: true, muted: out.muted, floor: out.floor };
}

async function allowSpeak(roomId, user, perms, targetIdentity) {
    assertLivekit();
    if (!canManageFloor(user, perms)) throw new Error('Floor control permission required');
    const room = conferenceStore.getRoom(roomId);
    if (!room || !room.active) throw new Error('Room is not active');
    const identity = String(targetIdentity || '').trim();
    if (!identity) throw new Error('identity required');
    const floor = getFloor(room);
    if (!floor.mutedAll) throw new Error('Mute-all is not active');
    const allowed = floor.allowedSpeakers.slice();
    if (allowed.indexOf(identity) < 0) allowed.push(identity);
    const requests = (floor.speakRequests || []).filter(function (r) { return r.identity !== identity; });
    conferenceStore.upsertRoom(roomId, {
        floor: { mutedAll: true, allowedSpeakers: allowed, speakRequests: requests },
    });
    const lkName = conferenceStore.livekitRoomName(roomId);
    await conferenceLivekit.setParticipantMicMuted(lkName, identity, false);
    await broadcastFloorState(roomId);
    return { floor: getFloorPayload(conferenceStore.getRoom(roomId)) };
}

async function revokeSpeak(roomId, user, perms, targetIdentity) {
    assertLivekit();
    if (!canManageFloor(user, perms)) throw new Error('Floor control permission required');
    const room = conferenceStore.getRoom(roomId);
    if (!room || !room.active) throw new Error('Room is not active');
    const identity = String(targetIdentity || '').trim();
    if (!identity) throw new Error('identity required');
    const floor = getFloor(room);
    if (!floor.mutedAll) throw new Error('Mute-all is not active');
    const lkName = conferenceStore.livekitRoomName(roomId);
    const alwaysAllowed = await collectAlwaysAllowedIdentities(room, lkName, user);
    if (alwaysAllowed.has(identity)) throw new Error('Cannot revoke speak from host or super admin');
    const allowed = floor.allowedSpeakers.filter(function (id) { return id !== identity; });
    conferenceStore.upsertRoom(roomId, {
        floor: { mutedAll: true, allowedSpeakers: allowed, speakRequests: floor.speakRequests || [] },
    });
    await conferenceLivekit.setParticipantMicMuted(lkName, identity, true);
    await broadcastFloorState(roomId);
    return { floor: getFloorPayload(conferenceStore.getRoom(roomId)) };
}

async function requestSpeak(roomId, user, perms) {
    const room = conferenceStore.getRoom(roomId);
    if (!room || !room.active) throw new Error('Room is not active');
    const floor = getFloor(room);
    if (!floor.mutedAll) throw new Error('Open floor — you can unmute yourself');
    const identity = userIdentity(user);
    if ((floor.allowedSpeakers || []).indexOf(identity) >= 0) {
        return { floor: getFloorPayload(room), alreadyAllowed: true };
    }
    const requests = (floor.speakRequests || []).slice();
    if (!requests.find(function (r) { return r.identity === identity; })) {
        requests.push({
            identity: identity,
            username: user.username,
            at: new Date().toISOString(),
        });
    }
    conferenceStore.upsertRoom(roomId, {
        floor: { mutedAll: true, allowedSpeakers: floor.allowedSpeakers || [], speakRequests: requests },
    });
    await broadcastFloorState(roomId);
    return { floor: getFloorPayload(conferenceStore.getRoom(roomId)) };
}

async function denySpeakRequest(roomId, user, perms, targetIdentity) {
    if (!canManageFloor(user, perms)) throw new Error('Floor control permission required');
    const room = conferenceStore.getRoom(roomId);
    if (!room || !room.active) throw new Error('Room is not active');
    const identity = String(targetIdentity || '').trim();
    if (!identity) throw new Error('identity required');
    const floor = getFloor(room);
    const requests = (floor.speakRequests || []).filter(function (r) { return r.identity !== identity; });
    conferenceStore.upsertRoom(roomId, {
        floor: {
            mutedAll: !!floor.mutedAll,
            allowedSpeakers: floor.allowedSpeakers || [],
            speakRequests: requests,
        },
    });
    await broadcastFloorState(roomId);
    return { floor: getFloorPayload(conferenceStore.getRoom(roomId)) };
}

function buildLobby(user, perms, scope) {
    const groups = dispatchGroups ? dispatchGroups.listGroups() : [];
    const online = new Set(getOnlineCamIds ? getOnlineCamIds() : []);
    const rooms = conferenceStore.listRooms();
    const seeAll = !!(scope && scope.seeAllDispatchGroups) || user.role === 'super_admin';
    const allowedGroupIds = seeAll ? null : new Set((scope && scope.assignedGroupIds) || []);

    const lobbyGroups = groups.filter(function (g) {
        if (!g || !g.id) return false;
        if (allowedGroupIds && !allowedGroupIds.has(g.id)) return false;
        return true;
    }).map(function (g) {
        const members = (g.members || []).map(function (m) {
            const camId = m.deviceId || m.camId || '';
            return {
                camId,
                name: m.nickname || m.name || camId,
                online: online.has(camId),
                pinColor: g.pinColor || g.color,
            };
        });
        const room = rooms.find(function (r) { return r.dispatchGroupId === g.id; });
        return {
            groupId: g.id,
            name: g.name,
            pinColor: g.pinColor || g.color,
            members,
            roomId: room ? room.id : null,
            roomActive: !!(room && room.active),
        };
    });

    const dashboardUsers = listDashboardUsers ? listDashboardUsers() : [];

    return {
        groups: lobbyGroups,
        rooms,
        operators: dashboardUsers.map(function (u) {
            return {
                userId: u.id,
                username: u.username,
                role: u.role,
            };
        }),
        maxSeats: conferenceStore.MAX_SEATS,
    };
}

function inviteGuest(roomId, user, perms, guestUserId) {
    if (!canHost(user, perms) && !(perms && perms.conferenceCrossGroup)) {
        throw new Error('Cross-group invite permission required');
    }
    const room = conferenceStore.getRoom(roomId);
    if (!room || !room.active) throw new Error('Room is not active');
    const guests = (room.guests || []).filter(function (g) { return g.userId !== guestUserId; });
    guests.push({ userId: guestUserId, invitedBy: user.username, at: new Date().toISOString() });
    conferenceStore.upsertRoom(roomId, { guests });
    return { guests };
}

function streamRecordingFile(recordingId) {
    const rec = conferenceStore.getRecording(recordingId);
    if (!rec || rec.status !== 'ready') return null;
    if (!rec.filePath || !fs.existsSync(rec.filePath)) return null;
    return rec.filePath;
}

function deleteRecording(recordingId, user, perms) {
    if (!canHost(user, perms) && !(perms && perms.conferenceRecord)) {
        throw new Error('Conference host or record permission required');
    }
    const rec = conferenceStore.getRecording(recordingId);
    if (!rec) throw new Error('Recording not found');
    if (rec.status === 'recording') throw new Error('Stop the recording before deleting it');
    if (rec.filePath && fs.existsSync(rec.filePath)) {
        try { fs.unlinkSync(rec.filePath); } catch (err) {
            throw new Error('Could not delete recording file: ' + (err.message || err));
        }
    }
    conferenceStore.deleteRecording(recordingId);
    return { deleted: recordingId };
}

function saveRoomShareImage(roomId, body) {
    const room = conferenceStore.getRoom(roomId);
    if (!room || !room.active) throw new Error('Room is not active');
    const raw = String(body && body.imageBase64 || '').replace(/^data:image\/\w+;base64,/, '');
    if (!raw) throw new Error('imageBase64 required');
    const buf = Buffer.from(raw, 'base64');
    if (!buf.length) throw new Error('Invalid image data');
    if (buf.length > 6 * 1024 * 1024) throw new Error('Image too large (max 6 MB)');
    const mime = String(body && body.mime || 'image/jpeg');
    const ext = mime.indexOf('png') >= 0 ? '.png' : '.jpg';
    const id = 'share-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + ext;
    const dir = path.join(shareImagesDir(), roomId);
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, id);
    fs.writeFileSync(filePath, buf);
    return {
        shareId: id,
        url: '/api/conference/share-file/' + encodeURIComponent(roomId) + '/' + encodeURIComponent(id),
        name: String(body && body.name || 'shared' + ext),
    };
}

function getRoomShareImagePath(roomId, fileName) {
    const safeRoom = String(roomId || '').replace(/[^a-zA-Z0-9_-]/g, '');
    const safeFile = path.basename(String(fileName || ''));
    if (!safeRoom || !safeFile || safeFile.includes('..')) return null;
    const filePath = path.join(shareImagesDir(), safeRoom, safeFile);
    if (!fs.existsSync(filePath)) return null;
    return filePath;
}

function listRoomShareImages(roomId) {
    const room = conferenceStore.getRoom(roomId);
    if (!room || !room.active) return [];
    const safeRoom = String(roomId || '').replace(/[^a-zA-Z0-9_-]/g, '');
    if (!safeRoom) return [];
    const dir = path.join(shareImagesDir(), safeRoom);
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
        .filter(function (f) { return f && !f.startsWith('.'); })
        .map(function (f) {
            return {
                sid: f,
                url: '/api/conference/share-file/' + encodeURIComponent(safeRoom) + '/' + encodeURIComponent(f),
                name: f,
            };
        });
}

module.exports = {
    init,
    statusPayload,
    startRoom,
    endRoom,
    joinToken,
    mobileJoinToken,
    notifyPeerLeave,
    resolveJoinIdentity,
    userIdentity,
    startRecording,
    stopRecording,
    addBwcIngress,
    removeBwcIngress,
    muteAllParticipants,
    allowSpeak,
    revokeSpeak,
    requestSpeak,
    denySpeakRequest,
    buildLobby,
    inviteGuest,
    listRecordings: conferenceStore.listRecordings,
    streamRecordingFile,
    deleteRecording,
    recordingsRoot: conferenceStore.recordingsRoot,
    saveRoomShareImage,
    getRoomShareImagePath,
    listRoomShareImages,
    canHost,
    canManageFloor,
    canJoinConference,
    isBwcIngressActive: conferenceBwcIngress.isActive,
    handleBwcIngressRemoteStop,
};
