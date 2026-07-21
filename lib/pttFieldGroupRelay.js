'use strict';

const DEFAULT_MAX_WRITABLE_BYTES = 8 * 1024;
const DEFAULT_FLOOR_STALE_MS = 1200;
const COLLISION_LOG_INTERVAL_MS = 2000;

function normalizeCamIds(camIds) {
    const seen = new Set();
    const out = [];
    (camIds || []).forEach((value) => {
        const id = String(value || '').trim();
        if (!id || seen.has(id)) return;
        seen.add(id);
        out.push(id);
    });
    return out;
}

function create(options) {
    const opts = options || {};
    const pttServer = opts.pttServer;
    const log = opts.log;
    const now = typeof opts.now === 'function' ? opts.now : Date.now;
    const maxWritableBytes = Number(opts.maxWritableBytes) > 0
        ? Number(opts.maxWritableBytes) : DEFAULT_MAX_WRITABLE_BYTES;
    const floorStaleMs = Number(opts.floorStaleMs) > 0
        ? Number(opts.floorStaleMs) : DEFAULT_FLOOR_STALE_MS;

    if (!pttServer
        || typeof pttServer.isDevicePttOnline !== 'function'
        || typeof pttServer.sendPttAudioToDevice !== 'function') {
        throw new Error('PTT field relay requires pttServer online/send functions');
    }

    const sosTeams = new Map();
    let dispatchTeam = null;
    const floors = new Map();
    const hqFloors = new Map();
    const collisionLoggedAt = new Map();
    const counters = {
        inboundFrames: 0,
        relayedFrames: 0,
        targetWrites: 0,
        offlineTargets: 0,
        sendDrops: 0,
        floorCollisions: 0,
        hqPreemptions: 0,
        noActiveTeam: 0,
    };

    function pttLog(level, message, detail) {
        if (!log || !log.ptt || typeof log.ptt[level] !== 'function') return;
        log.ptt[level](message, detail);
    }

    function teamRecord(kind, id, camIds, meta) {
        const members = normalizeCamIds(camIds);
        if (members.length < 2) return null;
        return {
            key: kind + ':' + String(id || 'active'),
            kind,
            id: String(id || 'active'),
            members,
            memberSet: new Set(members),
            updatedAt: now(),
            meta: meta || {},
        };
    }

    function releaseFloorByKey(key, reason) {
        const floor = floors.get(key);
        if (!floor) return;
        floors.delete(key);
        pttLog('info', 'field group floor released', {
            team: key,
            sourceCamId: floor.sourceCamId,
            reason: reason || 'released',
        });
    }

    function setSosTeam(alarmCamId, camIds, meta) {
        const alarmId = String(alarmCamId || '').trim();
        if (!alarmId) return false;
        const team = teamRecord('sos', alarmId, camIds, meta);
        const key = 'sos:' + alarmId;
        if (!team) {
            sosTeams.delete(alarmId);
            releaseFloorByKey(key, 'team_cleared');
            return false;
        }
        sosTeams.set(alarmId, team);
        const floor = floors.get(key);
        if (floor && !team.memberSet.has(floor.sourceCamId)) releaseFloorByKey(key, 'membership_changed');
        pttLog('info', 'field relay SOS team active', {
            alarmCamId: alarmId,
            teamSize: team.members.length,
        });
        return true;
    }

    function clearSosTeam(alarmCamId) {
        const alarmId = String(alarmCamId || '').trim();
        if (!alarmId) return false;
        const removed = sosTeams.delete(alarmId);
        const key = 'sos:' + alarmId;
        releaseFloorByKey(key, 'team_ended');
        collisionLoggedAt.delete(key);
        return removed;
    }

    function clearAllSosTeams() {
        [...sosTeams.keys()].forEach((alarmId) => clearSosTeam(alarmId));
    }

    function setDispatchTeam(teamId, camIds, meta) {
        const team = teamRecord('dispatch', teamId || 'active', camIds, meta);
        if (dispatchTeam) {
            releaseFloorByKey(dispatchTeam.key, 'team_replaced');
            collisionLoggedAt.delete(dispatchTeam.key);
        }
        dispatchTeam = team;
        if (!team) return false;
        pttLog('info', 'field relay dispatch team active', {
            teamId: team.id,
            teamSize: team.members.length,
        });
        return true;
    }

    function clearDispatchTeam() {
        if (!dispatchTeam) return false;
        const key = dispatchTeam.key;
        releaseFloorByKey(key, 'team_ended');
        collisionLoggedAt.delete(key);
        dispatchTeam = null;
        return true;
    }

    function activeTeamForSource(camId) {
        const id = String(camId || '').trim();
        if (!id) return null;
        let selectedSos = null;
        sosTeams.forEach((team) => {
            if (!team.memberSet.has(id)) return;
            if (!selectedSos || team.updatedAt > selectedSos.updatedAt) selectedSos = team;
        });
        if (selectedSos) return selectedSos;
        if (dispatchTeam && dispatchTeam.memberSet.has(id)) return dispatchTeam;
        return null;
    }

    function beginHqFloor(socketId, camIds) {
        const id = String(socketId || '').trim();
        if (!id) return false;
        hqFloors.set(id, {
            camIds: normalizeCamIds(camIds),
            startedAt: now(),
        });
        return true;
    }

    function endHqFloor(socketId) {
        return hqFloors.delete(String(socketId || '').trim());
    }

    function releaseSourceFloors(camId, reason) {
        const id = String(camId || '').trim();
        floors.forEach((floor, key) => {
            if (floor.sourceCamId === id) releaseFloorByKey(key, reason || 'source_idle');
        });
    }

    function onPttRxState(camId, active) {
        if (!active) releaseSourceFloors(camId, 'source_idle');
    }

    function noteCollision(team, sourceCamId, ownerCamId, reason) {
        const at = now();
        const previous = collisionLoggedAt.get(team.key) || 0;
        if (at - previous >= COLLISION_LOG_INTERVAL_MS) {
            collisionLoggedAt.set(team.key, at);
            pttLog('warn', 'field group floor collision', {
                team: team.key,
                sourceCamId,
                ownerCamId: ownerCamId || null,
                reason,
            });
        }
    }

    function onPttRxAlaw(camId, alawFrame) {
        const sourceCamId = String(camId || '').trim();
        if (!sourceCamId || !alawFrame || !alawFrame.length) return { relayed: false, reason: 'invalid' };
        counters.inboundFrames += 1;

        const team = activeTeamForSource(sourceCamId);
        if (!team) {
            counters.noActiveTeam += 1;
            return { relayed: false, reason: 'no_active_team' };
        }
        if (hqFloors.size > 0) {
            counters.hqPreemptions += 1;
            noteCollision(team, sourceCamId, 'HQ', 'hq_floor');
            return { relayed: false, reason: 'hq_floor' };
        }

        const at = now();
        let floor = floors.get(team.key);
        if (floor && at - floor.lastFrameAt > floorStaleMs) {
            releaseFloorByKey(team.key, 'stale');
            floor = null;
        }
        if (!floor) {
            floor = { sourceCamId, startedAt: at, lastFrameAt: at };
            floors.set(team.key, floor);
            pttLog('info', 'field group floor acquired', {
                team: team.key,
                sourceCamId,
                teamSize: team.members.length,
            });
        } else if (floor.sourceCamId !== sourceCamId) {
            counters.floorCollisions += 1;
            noteCollision(team, sourceCamId, floor.sourceCamId, 'field_floor');
            return { relayed: false, reason: 'field_floor', ownerCamId: floor.sourceCamId };
        }
        floor.lastFrameAt = at;

        const targets = [];
        team.members.forEach((targetCamId) => {
            if (targetCamId === sourceCamId) return;
            if (!pttServer.isDevicePttOnline(targetCamId)) {
                counters.offlineTargets += 1;
                return;
            }
            let ok = false;
            try {
                ok = pttServer.sendPttAudioToDevice(targetCamId, alawFrame, {
                    maxWritableBytes,
                });
            } catch (_) {
                ok = false;
            }
            if (!ok) {
                counters.sendDrops += 1;
                return;
            }
            counters.targetWrites += 1;
            targets.push(targetCamId);
        });
        if (targets.length) counters.relayedFrames += 1;
        return {
            relayed: targets.length > 0,
            reason: targets.length ? 'relayed' : 'no_online_peers',
            team: team.key,
            targets,
        };
    }

    function snapshot() {
        return {
            sosTeams: [...sosTeams.values()].map((team) => ({
                id: team.id,
                members: team.members.slice(),
            })),
            dispatchTeam: dispatchTeam ? {
                id: dispatchTeam.id,
                members: dispatchTeam.members.slice(),
            } : null,
            floors: [...floors.entries()].map(([key, floor]) => ({
                team: key,
                sourceCamId: floor.sourceCamId,
            })),
            hqFloorCount: hqFloors.size,
            counters: { ...counters },
        };
    }

    return {
        setSosTeam,
        clearSosTeam,
        clearAllSosTeams,
        setDispatchTeam,
        clearDispatchTeam,
        beginHqFloor,
        endHqFloor,
        onPttRxState,
        onPttRxAlaw,
        activeTeamForSource,
        snapshot,
    };
}

module.exports = {
    create,
    normalizeCamIds,
};
