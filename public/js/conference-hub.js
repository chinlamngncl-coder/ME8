/**
 * Video Conference hub \u2014 LiveKit WebRTC, 3\u00D78 rooms, BWC ingress, recordings.
 * Isolated from Operations map / SOS live wall.
 */
(function (global) {
    const perms = {
        view: false,
        join: false,
        host: false,
        record: false,
        bwcShare: false,
        crossGroup: false,
    };

    let status = null;
    let lobby = null;
    let selectedRoomId = 'room-1';
    let currentPanel = 'live';
    let lkRoom = null;
    const panelLoadedAt = Object.create(null);

    function staleMs() {
        return (global.TabLifecycle && TabLifecycle.STALE_MS) || 60000;
    }

    function panelWarm(name, force) {
        if (force) return false;
        const t = panelLoadedAt[name];
        return !!(t && (Date.now() - t < staleMs()));
    }

    function markPanelLoaded(name) {
        panelLoadedAt[name] = Date.now();
        if (global.TabLifecycle) TabLifecycle.markLoaded('conference');
    }
    let localTracks = [];
    let floorState = null;
    let localIdentity = null;
    let userRole = null;
    let canManageFloorFlag = false;
    let localMicEnabled = true;

    function tr(key, params) {
        if (global.I18n && I18n.t) return I18n.t(key, params);
        return key;
    }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/"/g, '&quot;');
    }

    function layout() {
        return global.ConferenceLayout;
    }

    function api(path, opts) {
        opts = opts || {};
        return fetch(path, {
            method: opts.method || 'GET',
            credentials: 'same-origin',
            headers: Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {}),
            body: opts.body ? JSON.stringify(opts.body) : undefined,
        }).then(function (r) {
            return r.text().then(function (text) {
                var data = null;
                var trimmed = (text || '').trim();
                if (trimmed && (trimmed.charAt(0) === '{' || trimmed.charAt(0) === '[')) {
                    try { data = JSON.parse(trimmed); } catch (_) { /* plain-text fallback below */ }
                }
                if (!data) {
                    if (trimmed.indexOf('<!DOCTYPE') >= 0 || trimmed.indexOf('<html') >= 0 || r.status === 404) {
                        throw new Error(tr('conference.serverNotReady'));
                    }
                    throw new Error(trimmed ? trimmed.slice(0, 160) : tr('conference.requestFailed'));
                }
                return { ok: r.ok, data: data };
            });
        });
    }

    function applyPermissions(p, role) {
        p = p || {};
        if (role) userRole = role;
        perms.view = !!(p.conferenceView || p.conferenceJoin);
        perms.join = !!p.conferenceJoin;
        perms.host = !!p.conferenceHost;
        perms.record = !!p.conferenceRecord;
        perms.bwcShare = !!p.conferenceBwcShare;
        perms.crossGroup = !!p.conferenceCrossGroup;
        const banner = document.getElementById('vc-perm-banner');
        if (banner) banner.hidden = perms.view;
        if (document.getElementById('app-view-conference') && !document.getElementById('app-view-conference').hidden) {
            refreshPanel();
        }
    }

    function showPanel(name, opts) {
        opts = opts || {};
        /* VC-LIVE-LOBBY-COMBINE-V1 \u2014 Lobby tab removed; old links land on Live */
        if (name === 'lobby') name = 'live';
        currentPanel = name;
        document.querySelectorAll('.vc-hub-panel').forEach(function (p) {
            p.hidden = p.id !== 'vc-panel-' + name;
        });
        document.querySelectorAll('.vc-hub-nav-btn').forEach(function (btn) {
            btn.classList.toggle('active', btn.dataset.panel === name);
        });
        if (opts.skipRefresh) return;
        refreshPanel(!!opts.force);
    }

    async function loadStatus() {
        const res = await api('/api/conference/status');
        if (!res.ok || !res.data.ok) throw new Error((res.data && res.data.error) || 'Status failed');
        status = res.data;
        return status;
    }

    async function loadLobby() {
        const res = await api('/api/conference/lobby');
        if (!res.ok || !res.data.ok) throw new Error((res.data && res.data.error) || 'Lobby failed');
        lobby = res.data.lobby;
        return lobby;
    }

    function renderSetupNotice() {
        const el = document.getElementById('vc-setup-notice');
        if (!el) return;
        if (lkRoom || currentPanel !== 'live') {
            el.hidden = true;
            return;
        }
        const lk = status && status.livekit;
        if (lk && lk.enabled && lk.clientWsUrl && !/\/\/(127\.0\.0\.1|localhost)(:|\/|$)/i.test(String(lk.clientWsUrl))) {
            el.hidden = true;
            el.className = '';
            el.innerHTML = '';
            return;
        }
        el.hidden = false;
        el.className = 'vc-setup-banner';
        let message = '';
        if (lk && lk.enabled) {
            message = tr('conference.setupPublicUrl');
        } else {
            message = tr('conference.setupRequired');
        }
        el.innerHTML = '<span>' + esc(message) + '</span>'
            + ' <button type="button" class="vc-setup-link" id="vc-setup-open-settings">' + esc(tr('conference.setupOpenSettings')) + '</button>';
        const btn = document.getElementById('vc-setup-open-settings');
        if (btn && !btn._vcBound) {
            btn._vcBound = true;
            btn.addEventListener('click', function () { showPanel('settings'); });
        }
    }

    function roomById(id) {
        if (!status || !status.rooms) return null;
        return status.rooms.find(function (r) { return r.id === id; }) || null;
    }

    function renderRoomPicker() {
        const el = document.getElementById('vc-room-picker');
        if (!el || !status) return;
        el.innerHTML = status.rooms.map(function (r) {
            const active = !!r.active;
            const badge = active ? tr('conference.roomActive') : tr('conference.roomIdle');
            const selected = selectedRoomId === r.id;
            return '<button type="button" class="vc-room-card' + (selected ? ' active' : '') + '" data-room-id="'
                + esc(r.id) + '" role="option" aria-selected="' + (selected ? 'true' : 'false') + '">'
                + '<span class="vc-room-card-name">' + esc(tr(r.labelKey)) + '</span>'
                + '<span class="vc-room-badge ' + (active ? 'is-active' : 'is-idle') + '">' + esc(badge) + '</span>'
                + '</button>';
        }).join('');
        el.querySelectorAll('[data-room-id]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                selectedRoomId = btn.getAttribute('data-room-id');
                renderRoomPicker();
                renderLiveControls();
                renderLobby();
            });
        });
    }

    function syncLiveIdle() {
        const idle = document.getElementById('vc-live-idle');
        const stage = document.getElementById('vc-stage');
        const roster = document.getElementById('vc-live-roster');
        const panel = document.getElementById('vc-panel-live');
        const inRoom = !!lkRoom;
        const room = roomById(selectedRoomId);
        const roomOpen = room && room.active;
        if (panel) panel.classList.toggle('vc-in-meeting', inRoom);
        const hub = document.getElementById('conference-panel');
        if (hub) hub.classList.toggle('vc-in-meeting', inRoom);
        renderSetupNotice();
        if (idle) idle.hidden = true;
        if (roster) roster.hidden = inRoom || !(roomOpen && !inRoom);
        if (stage) {
            if (inRoom) {
                stage.hidden = false;
                const lay = layout();
                if (lay) lay.show();
            } else {
                const lay = layout();
                if (lay) lay.hide();
            }
        }
        renderLiveRoster();
    }

    function seatUsernames(room) {
        const names = [];
        (room && room.seats || []).forEach(function (s) {
            if (s.username) names.push(String(s.username).toLowerCase());
        });
        return names;
    }

    function renderLiveRoster() {
        const el = document.getElementById('vc-live-roster');
        if (!el) return;
        const room = roomById(selectedRoomId);
        const roomOpen = room && room.active;
        if (!roomOpen && !lkRoom) {
            el.hidden = true;
            return;
        }
        el.hidden = false;
        const inRoomNames = seatUsernames(room);
        const items = [];
        (lobby && lobby.groups || []).forEach(function (g) {
            (g.members || []).forEach(function (m) {
                if (!m.name) return;
                items.push({
                    name: m.name,
                    online: !!m.online,
                    inRoom: inRoomNames.indexOf(String(m.name).toLowerCase()) >= 0,
                });
            });
        });
        if (!items.length) {
            el.innerHTML = '<h4>' + esc(tr('conference.rosterTitle')) + '</h4><p class="hint">' + esc(tr('conference.rosterEmpty')) + '</p>';
            return;
        }
        el.innerHTML = '<h4>' + esc(tr('conference.rosterTitle')) + '</h4><ul>'
            + items.map(function (m) {
                const cls = m.inRoom ? 'in-room' : (m.online ? 'online' : '');
                const suffix = m.inRoom ? ' \u00B7 ' + tr('conference.rosterInRoom') : (m.online ? ' \u00B7 ' + tr('conference.online') : ' \u00B7 ' + tr('conference.offline'));
                return '<li class="' + cls + '">' + esc(m.name) + esc(suffix) + '</li>';
            }).join('')
            + '</ul><p class="hint">' + esc(tr('conference.rosterHint')) + '</p>';
    }

    function canManageFloor() {
        return canManageFloorFlag || perms.host || userRole === 'super_admin';
    }

    function decodeDataPayload(payload) {
        if (!payload) return null;
        var text;
        if (typeof payload === 'string') text = payload;
        else if (payload instanceof ArrayBuffer) text = new TextDecoder().decode(payload);
        else if (payload.buffer) text = new TextDecoder().decode(payload);
        else text = String(payload);
        try { return JSON.parse(text); } catch (_) { return null; }
    }

    function isHostLivekitIdentity(identity) {
        if (!identity) return false;
        var room = roomById(selectedRoomId);
        if (!room || !room.hostUserId) return false;
        var base = 'user-' + room.hostUserId;
        return identity === base || identity === base + '-web' || identity === base + '-mobile';
    }

    function isAlwaysAllowedIdentity(identity) {
        if (!identity) return false;
        if (identity === localIdentity && userRole === 'super_admin') return true;
        if (isHostLivekitIdentity(identity)) return true;
        if (lkRoom) {
            var p = lkRoom.getParticipantByIdentity(identity);
            if (p && p.metadata) {
                try {
                    if (JSON.parse(p.metadata).role === 'super_admin') return true;
                } catch (_) { /* ignore */ }
            }
        }
        var confRoom = roomById(selectedRoomId);
        var seats = (confRoom && confRoom.seats) || [];
        for (var i = 0; i < seats.length; i++) {
            if (seats[i].identity === identity && seats[i].role === 'super_admin') return true;
        }
        return false;
    }

    function localMicAllowed() {
        if (!floorState || !floorState.mutedAll) return true;
        if (canManageFloor()) return true;
        if (userRole === 'super_admin') return true;
        if (localIdentity && isAlwaysAllowedIdentity(localIdentity)) return true;
        return (floorState.allowedSpeakers || []).indexOf(localIdentity) >= 0;
    }

    function isParticipantAudioMuted(participant) {
        if (!participant || !participant.audioTrackPublications) return true;
        var muted = true;
        participant.audioTrackPublications.forEach(function (pub) {
            if (pub && pub.track && !pub.isMuted) muted = false;
        });
        return muted;
    }

    function applyFloorState(floor) {
        floorState = floor || { mutedAll: false, allowedSpeakers: [], speakRequests: [] };
        var room = roomById(selectedRoomId);
        if (room) room.floor = floorState;
        enforceLocalMic();
        syncFloorToTiles();
        if (lkRoom) renderLiveControls();
    }

    function syncFloorToTiles() {
        var lay = layout();
        if (!lay || !lkRoom) return;
        var allowed = new Set(floorState && floorState.allowedSpeakers || []);
        function patchParticipant(p) {
            if (!p || !p.identity) return;
            var id = p.identity;
            var floorAllowed = !floorState || !floorState.mutedAll
                || allowed.has(id)
                || isAlwaysAllowedIdentity(id);
            lay.updateParticipantState(id, {
                floorAllowed: floorAllowed,
                muted: isParticipantAudioMuted(p),
            });
        }
        patchParticipant(lkRoom.localParticipant);
        lkRoom.remoteParticipants.forEach(patchParticipant);
    }

    function enforceLocalMic() {
        if (!lkRoom || !lkRoom.localParticipant) return;
        if (!localMicAllowed()) {
            localMicEnabled = false;
            lkRoom.localParticipant.setMicrophoneEnabled(false).catch(function () { /* ignore */ });
        }
    }

    function participantsForFloor() {
        var list = [];
        if (!lkRoom) return list;
        var lp = lkRoom.localParticipant;
        if (lp) list.push({ identity: lp.identity, name: tr('conference.you'), isLocal: true });
        lkRoom.remoteParticipants.forEach(function (p) {
            list.push({ identity: p.identity, name: participantLabel(p), isLocal: false });
        });
        return list;
    }

    function buildFloorHtml() {
        var f = floorState || {};
        var html = '';
        if (!f.mutedAll) return html;
        html += '<div class="vc-floor-bar">';
        html += '<span class="vc-floor-pill">' + esc(tr('conference.floorMutedAll')) + '</span>';
        if (canManageFloor()) {
            (f.speakRequests || []).forEach(function (req) {
                html += '<span class="vc-floor-req">' + esc(req.username || req.identity)
                    + ' <button type="button" class="btn btn-ghost btn-sm vc-floor-allow" data-id="' + esc(req.identity) + '">'
                    + tr('conference.allowSpeak') + '</button>'
                    + ' <button type="button" class="btn btn-ghost btn-sm vc-floor-deny" data-id="' + esc(req.identity) + '">'
                    + tr('conference.denySpeak') + '</button></span>';
            });
            participantsForFloor().forEach(function (p) {
                if (!p.identity || p.identity.indexOf('bwc-') === 0 || p.identity.indexOf('fixed-') === 0) return;
                var allowed = (f.allowedSpeakers || []).indexOf(p.identity) >= 0 || isAlwaysAllowedIdentity(p.identity);
                html += '<span class="vc-floor-user">' + esc(p.name);
                if (allowed) {
                    if (!isAlwaysAllowedIdentity(p.identity)) {
                        html += ' <button type="button" class="btn btn-ghost btn-sm vc-floor-revoke" data-id="' + esc(p.identity) + '">'
                            + tr('conference.revokeSpeak') + '</button>';
                    } else {
                        html += ' <span class="vc-floor-tag">' + esc(tr('conference.floorAlwaysSpeak')) + '</span>';
                    }
                } else {
                    html += ' <button type="button" class="btn btn-ghost btn-sm vc-floor-allow" data-id="' + esc(p.identity) + '">'
                        + tr('conference.allowSpeak') + '</button>';
                }
                html += '</span>';
            });
        } else if (!localMicAllowed()) {
            var pending = (f.speakRequests || []).some(function (r) { return r.identity === localIdentity; });
            if (pending) {
                html += '<span class="hint">' + esc(tr('conference.speakRequested')) + '</span>';
            } else {
                html += '<button type="button" class="btn btn-ghost btn-sm" id="vc-request-speak">' + tr('conference.requestSpeak') + '</button>';
            }
        }
        html += '</div>';
        return html;
    }

    async function allowSpeakIdentity(identity) {
        var res = await api('/api/conference/room/' + encodeURIComponent(selectedRoomId) + '/floor/allow', {
            method: 'POST',
            body: { identity: identity },
        });
        if (!res.ok || !res.data.ok) throw new Error((res.data && res.data.error) || tr('conference.floorActionFailed'));
        applyFloorState(res.data.floor);
    }

    async function revokeSpeakIdentity(identity) {
        var res = await api('/api/conference/room/' + encodeURIComponent(selectedRoomId) + '/floor/revoke', {
            method: 'POST',
            body: { identity: identity },
        });
        if (!res.ok || !res.data.ok) throw new Error((res.data && res.data.error) || tr('conference.floorActionFailed'));
        applyFloorState(res.data.floor);
    }

    async function requestSpeak() {
        var res = await api('/api/conference/room/' + encodeURIComponent(selectedRoomId) + '/floor/request-speak', {
            method: 'POST',
            body: { identity: localIdentity, clientKind: 'web' },
        });
        if (!res.ok || !res.data.ok) throw new Error((res.data && res.data.error) || tr('conference.floorActionFailed'));
        applyFloorState(res.data.floor);
    }

    async function denySpeakIdentity(identity) {
        var res = await api('/api/conference/room/' + encodeURIComponent(selectedRoomId) + '/floor/deny', {
            method: 'POST',
            body: { identity: identity },
        });
        if (!res.ok || !res.data.ok) throw new Error((res.data && res.data.error) || tr('conference.floorActionFailed'));
        applyFloorState(res.data.floor);
    }

    async function toggleLocalMic() {
        if (!lkRoom || !lkRoom.localParticipant) return;
        if (!localMicAllowed()) {
            throw new Error(tr('conference.speakNotAllowed'));
        }
        localMicEnabled = !localMicEnabled;
        await lkRoom.localParticipant.setMicrophoneEnabled(localMicEnabled);
        syncFloorToTiles();
        renderLiveControls();
    }

    function handleVcMuteAll() {
        applyFloorState(Object.assign({}, floorState || defaultFloorClient(), { mutedAll: true }));
    }

    function defaultFloorClient() {
        return { mutedAll: false, allowedSpeakers: [], speakRequests: [] };
    }

    function countOnlineBwcs() {
        let n = 0;
        (lobby && lobby.groups || []).forEach(function (g) {
            (g.members || []).forEach(function (m) {
                if (m.online && m.camId) n++;
            });
        });
        return n;
    }

    function bwcIngressListFor(room) {
        if (!room) return [];
        if (Array.isArray(room.bwcIngressList)) return room.bwcIngressList;
        if (room.bwcIngress) return [room.bwcIngress];
        return [];
    }

    function fixedCameraIngressListFor(room) {
        return room && Array.isArray(room.fixedCameraIngressList) ? room.fixedCameraIngressList : [];
    }

    function cameraIngressCountFor(room) {
        return bwcIngressListFor(room).length + fixedCameraIngressListFor(room).length;
    }

    function maxBwcIngress() {
        return (status && status.maxBwcIngress) || 4;
    }

    function buildBwcShareHtml(compact) {
        const room = roomById(selectedRoomId);
        const list = bwcIngressListFor(room);
        const fixedList = fixedCameraIngressListFor(room);
        const maxBwc = maxBwcIngress();
        const cameraCount = cameraIngressCountFor(room);
        let html = '';
        if (list.length) {
            const wrapClass = compact ? 'vc-bwc-share' : 'vc-bwc-inline';
            html += '<' + (compact ? 'div' : 'span') + ' class="' + wrapClass + '">';
            if (compact) html += '<span>' + esc(tr('conference.bwcShare')) + ':</span> ';
            list.forEach(function (b) {
                html += '<span class="vc-bwc-chip">' + esc(b.displayName || b.camId);
                if (perms.bwcShare || perms.host) {
                    html += ' <button type="button" class="btn btn-ghost btn-sm vc-bwc-remove-one" data-cam="' + esc(b.camId) + '">'
                        + tr('conference.bwcRemove') + '</button>';
                }
                html += '</span> ';
            });
            html += '</' + (compact ? 'div' : 'span') + '>';
        }
        if (fixedList.length) {
            const fixedWrapClass = compact ? 'vc-bwc-share' : 'vc-bwc-inline';
            html += '<' + (compact ? 'div' : 'span') + ' class="' + fixedWrapClass + '">';
            fixedList.forEach(function (camera) {
                html += '<span class="vc-bwc-chip">Fixed \u00B7 ' + esc(camera.displayName || camera.cameraId);
                if (perms.bwcShare || perms.host) {
                    html += ' <button type="button" class="btn btn-ghost btn-sm vc-fixed-remove-one" data-camera="'
                        + esc(camera.cameraId) + '">' + tr('conference.bwcRemove') + '</button>';
                }
                html += '</span> ';
            });
            html += '</' + (compact ? 'div' : 'span') + '>';
        }
        if ((perms.bwcShare || perms.host) && cameraCount < maxBwc) {
            if (compact) {
                const onlineBwc = countOnlineBwcs();
                html += '<div class="vc-bwc-compact">';
                html += '<span class="vc-bwc-compact-label">' + esc(tr('conference.bwcHead')) + '</span>';
                html += '<span class="vc-bwc-compact-status ' + (onlineBwc ? 'online' : '') + '">'
                    + esc(tr(onlineBwc ? 'conference.bwcOnlineOne' : 'conference.bwcNoOnline', { count: onlineBwc })) + '</span>';
                html += '<select id="vc-bwc-select"><option value="">\u2014</option></select>';
                html += '<button type="button" class="btn btn-ghost btn-sm" id="vc-bwc-add-btn">' + tr('conference.bwcAddBtn') + '</button>';
                html += '<select id="vc-fixed-camera-select"><option value="">\u2014 Fixed camera \u2014</option></select>';
                html += '<button type="button" class="btn btn-ghost btn-sm" id="vc-fixed-camera-add-btn">Add fixed camera</button>';
                html += '</div>';
            } else {
                html += '<select id="vc-bwc-select" class="vc-bwc-inline-select"><option value="">\u2014 BWC \u2014</option></select>';
                html += '<button type="button" class="btn btn-ghost btn-sm" id="vc-bwc-add-btn">' + tr('conference.bwcAddBtn') + '</button>';
                html += '<select id="vc-fixed-camera-select" class="vc-bwc-inline-select"><option value="">\u2014 Fixed camera \u2014</option></select>';
                html += '<button type="button" class="btn btn-ghost btn-sm" id="vc-fixed-camera-add-btn">Add fixed camera</button>';
            }
        } else if (cameraCount >= maxBwc) {
            html += '<span class="hint vc-bwc-max">' + esc(tr('conference.bwcMaxReached', { max: maxBwc })) + '</span>';
        }
        return html;
    }

    function syncStageToolbar() {
        const stage = document.getElementById('vc-stage');
        if (stage) stage.classList.toggle('vc-in-room', !!lkRoom);
        let btn = document.getElementById('vc-stage-mute-all');
        const showMuteAll = !!lkRoom && canManageFloor();
        if (!showMuteAll) {
            if (btn) btn.hidden = true;
            return;
        }
        const leave = document.getElementById('vc-stage-leave');
        if (!leave || !leave.parentNode) return;
        if (!btn) {
            btn = document.createElement('button');
            btn.type = 'button';
            btn.id = 'vc-stage-mute-all';
            btn.className = 'btn btn-ghost btn-sm vc-stage-mute-all';
            btn.addEventListener('click', function () {
                muteAllParticipants().catch(function (e) { alert(e.message); });
            });
            leave.parentNode.insertBefore(btn, leave);
        }
        btn.textContent = tr('conference.muteAll');
        btn.hidden = false;
    }

    function renderLiveControls() {
        const el = document.getElementById('vc-live-controls');
        const room = roomById(selectedRoomId);
        if (!el) return;
        if (!status || !status.livekit || !status.livekit.enabled) {
            el.innerHTML = '';
            syncLiveIdle();
            return;
        }
        const rec = room && room.recording;
        const roomOpen = room && room.active;
        const inRoom = !!lkRoom;
        let html = '';

        if (inRoom) {
            html += '<div class="vc-host-inline">';
            if (canManageFloor()) {
                html += '<button type="button" class="btn btn-ghost btn-sm" id="vc-end-room"' + (!roomOpen ? ' disabled' : '') + '>' + tr('conference.endRoom') + '</button>';
                html += '<button type="button" class="btn btn-ghost btn-sm" id="vc-mute-all">' + tr('conference.muteAll') + '</button>';
            }
            if (perms.join) {
                html += '<button type="button" class="btn btn-ghost btn-sm" id="vc-mic-toggle" title="' + esc(tr('conference.toggleMic')) + '">'
                    + (localMicEnabled ? '🎤' : '🔇') + '</button>';
            }
            if (perms.record) {
                if (rec) {
                    html += '<button type="button" class="btn btn-action btn-sm vc-rec-btn-stop" id="vc-rec-stop">⏹ ' + tr('conference.recordStop') + '</button>';
                } else {
                    html += '<button type="button" class="btn btn-ghost btn-sm" id="vc-rec-start">⏺ ' + tr('conference.recordStart') + '</button>';
                }
            }
            html += buildBwcShareHtml(false);
            html += '</div>';
            html += buildFloorHtml();
            if (rec) {
                html += '<p class="hint vc-rec-on vc-rec-inline">⏺ ' + esc(tr('conference.recordingOn')) + '</p>';
            }
        } else {
            if (perms.join) {
                html += '<button type="button" class="btn btn-action btn-sm btn-lg" id="vc-enter-room">' + tr('conference.enterRoom') + '</button>';
            }
            if (perms.host || perms.record || perms.bwcShare) {
                /* VC-HOST-TOOLS-ALWAYS-OPEN-V1 \u2014 no <details> accordion */
                html += '<div class="vc-host-tools-panel enterprise-card" role="region" aria-label="' + esc(tr('conference.hostTools')) + '">';
                html += '<div class="vc-host-tools-title">' + esc(tr('conference.hostTools')) + '</div>';
                html += '<div class="vc-secondary-row">';
                if (perms.host) {
                    html += '<button type="button" class="btn btn-ghost btn-sm" id="vc-end-room"' + (!roomOpen ? ' disabled' : '') + '>' + tr('conference.endRoom') + '</button>';
                }
                html += '</div>';
                html += buildBwcShareHtml(true);
                html += '</div>';
            }
        }

        el.innerHTML = html;
        bindLiveControlHandlers();
        populateBwcSelect();
        populateFixedCameraSelect();
        syncLiveIdle();
        syncStageToolbar();
    }

    function populateBwcSelect() {
        const sel = document.getElementById('vc-bwc-select');
        if (!sel || !lobby) return;
        const room = roomById(selectedRoomId);
        const active = new Set(bwcIngressListFor(room).map(function (b) { return b.camId; }));
        let html = '<option value="">\u2014</option>';
        (lobby.groups || []).forEach(function (g) {
            (g.members || []).forEach(function (m) {
                if (!m.online || !m.camId || active.has(m.camId)) return;
                html += '<option value="' + esc(m.camId) + '">' + esc(m.name) + ' \u00B7 ' + esc(m.camId) + '</option>';
            });
        });
        sel.innerHTML = html;
    }

    function populateFixedCameraSelect() {
        const sel = document.getElementById('vc-fixed-camera-select');
        if (!sel || !lobby) return;
        const room = roomById(selectedRoomId);
        const active = new Set(fixedCameraIngressListFor(room).map(function (camera) {
            return camera.cameraId;
        }));
        let html = '<option value="">\u2014 Fixed camera \u2014</option>';
        (lobby.fixedCameras || []).forEach(function (camera) {
            if (!camera.playable || active.has(camera.cameraId)) return;
            const suffix = camera.zone ? (' \u00B7 ' + camera.zone) : '';
            html += '<option value="' + esc(camera.cameraId) + '">'
                + esc(camera.name || camera.cameraId) + esc(suffix) + '</option>';
        });
        sel.innerHTML = html;
    }

    function bindLiveControlHandlers() {
        const map = {
            'vc-enter-room': enterRoom,
            'vc-end-room': endRoom,
            'vc-rec-start': startRecording,
            'vc-rec-stop': stopRecording,
            'vc-mute-all': muteAllParticipants,
            'vc-bwc-add-btn': addBwcIngress,
            'vc-fixed-camera-add-btn': addFixedCameraIngress,
            'vc-mic-toggle': toggleLocalMic,
            'vc-request-speak': requestSpeak,
        };
        Object.keys(map).forEach(function (id) {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', function () { map[id]().catch(function (e) { alert(e.message); }); });
        });
        document.querySelectorAll('.vc-bwc-remove-one').forEach(function (btn) {
            btn.addEventListener('click', function () {
                removeBwcIngress(btn.getAttribute('data-cam')).catch(function (e) { alert(e.message); });
            });
        });
        document.querySelectorAll('.vc-fixed-remove-one').forEach(function (btn) {
            btn.addEventListener('click', function () {
                removeFixedCameraIngress(btn.getAttribute('data-camera')).catch(function (e) { alert(e.message); });
            });
        });
        document.querySelectorAll('.vc-floor-allow').forEach(function (btn) {
            btn.addEventListener('click', function () {
                allowSpeakIdentity(btn.getAttribute('data-id')).catch(function (e) { alert(e.message); });
            });
        });
        document.querySelectorAll('.vc-floor-revoke').forEach(function (btn) {
            btn.addEventListener('click', function () {
                revokeSpeakIdentity(btn.getAttribute('data-id')).catch(function (e) { alert(e.message); });
            });
        });
        document.querySelectorAll('.vc-floor-deny').forEach(function (btn) {
            btn.addEventListener('click', function () {
                denySpeakIdentity(btn.getAttribute('data-id')).catch(function (e) { alert(e.message); });
            });
        });
    }

    function participantLabel(participant) {
        if (!participant) return '';
        if (participant.identity && String(participant.identity).indexOf('bwc-') === 0) {
            return participant.name || String(participant.identity).replace(/^bwc-/, 'BWC ');
        }
        if (participant.identity && String(participant.identity).indexOf('fixed-') === 0) {
            return participant.name || String(participant.identity).replace(/^fixed-/, 'Fixed camera ');
        }
        return participant.name || participant.identity || '';
    }

    function onTrackAdded(track, publication, participant) {
        const lay = layout();
        if (!lay || !track || track.kind !== 'video') return;
        const label = participant && participant.isLocal ? tr('conference.you') : participantLabel(participant);
        lay.addTrack(track, publication, participant, label);
    }

    function wireRoomEvents(room) {
        const LK = global.LivekitClient;
        room.on(LK.RoomEvent.TrackSubscribed, function (track, publication, participant) {
            onTrackAdded(track, publication, participant);
            if (track && track.kind === 'audio' && participant && !participant.isLocal) {
                try { track.attach(); } catch (_) { /* ignore */ }
            }
            if (publication && publication.kind === 'audio') {
                updateParticipantAudioState(participant);
            }
        });
        room.on(LK.RoomEvent.ParticipantConnected, function (participant) {
            participant.trackPublications.forEach(function (publication) {
                if (publication.track) {
                    onTrackAdded(publication.track, publication, participant);
                }
            });
            updateParticipantAudioState(participant);
            const lay = layout();
            if (lay) lay.autoLayout();
            if (lkRoom) renderLiveControls();
        });
        room.on(LK.RoomEvent.TrackUnsubscribed, function (track) {
            const lay = layout();
            if (lay) lay.removeTrack(track);
        });
        room.on(LK.RoomEvent.LocalTrackPublished, function (publication, participant) {
            if (publication && publication.track) {
                onTrackAdded(publication.track, publication, participant);
            }
            if (publication && publication.kind === 'audio') {
                updateParticipantAudioState(participant);
            }
        });
        room.on(LK.RoomEvent.LocalTrackUnpublished, function (publication) {
            if (publication && publication.track) {
                const lay = layout();
                if (lay) lay.removeTrack(publication.track);
            }
        });
        room.on(LK.RoomEvent.TrackMuted, function (publication, participant) {
            if (publication && publication.kind === 'audio') {
                updateParticipantAudioState(participant);
            }
        });
        room.on(LK.RoomEvent.TrackUnmuted, function (publication, participant) {
            if (publication && publication.kind === 'audio') {
                if (!localMicAllowed() && participant && participant.isLocal) {
                    enforceLocalMic();
                    return;
                }
                updateParticipantAudioState(participant);
            }
        });
        room.on(LK.RoomEvent.ActiveSpeakersChanged, function (speakers) {
            const lay = layout();
            if (!lay || !lay.setActiveSpeakers) return;
            const ids = (speakers || []).map(function (p) { return p.identity; });
            lay.setActiveSpeakers(ids);
        });
        room.on(LK.RoomEvent.DataReceived, function (payload) {
            const msg = decodeDataPayload(payload);
            if (!msg || !msg.type) return;
            if (msg.type === 'vc-floor-state') applyFloorState(msg.floor);
            if (msg.type === 'vc-mute-all') handleVcMuteAll();
            if (msg.type === 'vc-room-ended') handleRoomDisconnected();
        });
        room.on(LK.RoomEvent.Disconnected, function () {
            handleRoomDisconnected();
        });
    }

    function handleRoomDisconnected() {
        if (!lkRoom) return;
        lkRoom = null;
        localTracks.forEach(function (t) { try { t.stop(); } catch (_) { /* ignore */ } });
        localTracks = [];
        floorState = null;
        localIdentity = null;
        canManageFloorFlag = false;
        localMicEnabled = true;
        const lay = layout();
        if (lay) {
            lay.setConnecting(null);
            lay.setRoom(null);
            lay.clear();
            lay.hide();
        }
        syncLiveIdle();
        syncStageToolbar();
        loadStatus().then(function () {
            renderLiveControls();
        }).catch(function () { /* ignore */ });
    }

    function updateParticipantAudioState(participant) {
        if (!participant || !participant.identity) return;
        const lay = layout();
        if (lay) {
            lay.updateParticipantState(participant.identity, { muted: isParticipantAudioMuted(participant) });
        }
    }

    async function toggleBwcIngressAudioMute(camId, muted) {
        const res = await api('/api/conference/room/' + encodeURIComponent(selectedRoomId) + '/bwc-audio-mute', {
            method: 'POST',
            body: { camId: camId, muted: !!muted },
        });
        if (!res.ok || !res.data.ok) {
            throw new Error((res.data && res.data.error) || 'BWC audio mute failed');
        }
        const lay = layout();
        if (lay) {
            lay.updateParticipantState('bwc-' + String(camId).trim(), { muted: !!muted });
        }
    }

    let bwcTileMuteBound = false;

    function bindBwcTileMuteClicks() {
        if (bwcTileMuteBound) return;
        const stage = document.getElementById('vc-stage');
        if (!stage) return;
        bwcTileMuteBound = true;
        stage.addEventListener('click', function (e) {
            const badge = e.target.closest('.vc-tile-bwc .vc-tile-mute-badge');
            if (!badge) return;
            if (!canManageFloor()) return;
            e.preventDefault();
            e.stopPropagation();
            const tile = badge.closest('.vc-tile');
            const camId = tile && tile.dataset.bwcCamId;
            if (!camId || !selectedRoomId) return;
            const wantMuted = !tile.classList.contains('vc-tile-muted');
            toggleBwcIngressAudioMute(camId, wantMuted).catch(function (err) {
                alert(err && err.message ? err.message : String(err));
            });
        });
    }

    function subscribeExistingParticipants(room) {
        room.remoteParticipants.forEach(function (participant) {
            participant.trackPublications.forEach(function (publication) {
                if (publication.track) {
                    if (publication.track.kind === 'audio' && !participant.isLocal) {
                        try { publication.track.attach(); } catch (_) { /* ignore */ }
                    }
                    onTrackAdded(publication.track, publication, participant);
                }
            });
        });
    }

    async function startRoom() {
        const res = await api('/api/conference/room/' + encodeURIComponent(selectedRoomId) + '/start', {
            method: 'POST',
            body: {},
        });
        if (!res.ok || !res.data.ok) throw new Error((res.data && res.data.error) || 'Start failed');
        await refreshPanel();
    }

    async function endRoom() {
        await leaveRoom();
        const res = await api('/api/conference/room/' + encodeURIComponent(selectedRoomId) + '/end', { method: 'POST' });
        if (!res.ok || !res.data.ok) throw new Error((res.data && res.data.error) || 'End failed');
        await refreshPanel();
    }

    async function enterRoom() {
        const room = roomById(selectedRoomId);
        if (!room || !room.active) {
            if (perms.host) {
                await startRoom();
            } else {
                throw new Error(tr('conference.roomNotOpen'));
            }
        }
        await joinRoom();
    }

    async function joinRoom() {
        if (!global.LivekitClient) throw new Error(tr('conference.clientNotLoaded'));
        const lay = layout();
        if (!lay) throw new Error('Conference layout not loaded');
        await leaveRoom({ keepBwc: true });
        lay.init('vc-stage');
        lay.show();
        lay.setConnecting(tr('conference.connecting'));
        const res = await api('/api/conference/room/' + encodeURIComponent(selectedRoomId) + '/join-token', {
            method: 'POST',
            body: { clientKind: 'web' },
        });
        if (!res.ok || !res.data.ok) {
            lay.hide();
            throw new Error((res.data && res.data.error) || 'Join denied');
        }
        const join = res.data.join;
        localIdentity = join.identity || null;
        userRole = join.role || null;
        canManageFloorFlag = !!join.canManageFloor;
        applyFloorState(join.floor || defaultFloorClient());
        const room = new LivekitClient.Room({ adaptiveStream: true, dynacast: true });
        lkRoom = room;
        lay.setRoom(room);
        wireRoomEvents(room);
        try {
            await room.connect(join.livekitUrl, join.token);
        } catch (err) {
            await leaveRoom();
            throw err;
        }
        if (perms.join) {
            localMicEnabled = localMicAllowed();
            localTracks = await LivekitClient.createLocalTracks({ audio: true, video: true });
            for (let i = 0; i < localTracks.length; i++) {
                if (localTracks[i].kind === 'audio' && !localMicEnabled) {
                    localTracks[i].mute();
                }
                await room.localParticipant.publishTrack(localTracks[i]);
                // LocalTrackPublished event (wired in wireRoomEvents) handles adding the tile.
                // Do not add it explicitly here \u2014 that causes a duplicate blank tile when
                // track.sid is not yet assigned at publish time.
            }
            if (!localMicEnabled) {
                await room.localParticipant.setMicrophoneEnabled(false);
            }
        }
        syncFloorToTiles();
        subscribeExistingParticipants(room);
        lay.autoLayout();
        lay.setConnecting(null);
        await loadStatus();
        renderLiveControls();
        renderLiveRoster();
    }

    async function leaveRoom(options) {
        const opts = options || {};
        const lay = layout();
        const roomId = selectedRoomId;
        const room = roomById(roomId);
        const wasInRoom = !!lkRoom;
        if (wasInRoom && roomId) {
            try {
                await api('/api/conference/room/' + encodeURIComponent(roomId) + '/leave-notify', {
                    method: 'POST',
                    body: { clientKind: 'web' },
                });
            } catch (_) { /* best-effort \u2014 still leave */ }
        }
        if (wasInRoom && !opts.keepBwc && bwcIngressListFor(room).length && (perms.host || perms.bwcShare)) {
            const bwcList = bwcIngressListFor(room);
            for (let i = 0; i < bwcList.length; i++) {
                try {
                    await api('/api/conference/room/' + encodeURIComponent(roomId) + '/bwc-ingress?camId='
                        + encodeURIComponent(bwcList[i].camId), { method: 'DELETE' });
                } catch (_) { /* best-effort \u2014 still leave the room */ }
            }
        }
        if (wasInRoom && !opts.keepBwc && fixedCameraIngressListFor(room).length && (perms.host || perms.bwcShare)) {
            const fixedList = fixedCameraIngressListFor(room);
            for (let i = 0; i < fixedList.length; i++) {
                try {
                    await api('/api/conference/room/' + encodeURIComponent(roomId)
                        + '/fixed-camera-ingress?cameraId=' + encodeURIComponent(fixedList[i].cameraId), {
                        method: 'DELETE',
                    });
                } catch (_) { /* best-effort \u2014 still leave the room */ }
            }
        }
        if (lkRoom) {
            const room = lkRoom;
            lkRoom = null;
            try { await room.disconnect(); } catch (_) { /* ignore */ }
        }
        localTracks.forEach(function (t) { try { t.stop(); } catch (_) { /* ignore */ } });
        localTracks = [];
        floorState = null;
        localIdentity = null;
        canManageFloorFlag = false;
        localMicEnabled = true;
        if (lay) {
            lay.setConnecting(null);
            lay.setRoom(null);
            lay.clear();
            lay.hide();
        }
        syncLiveIdle();
        syncStageToolbar();
        try {
            await loadStatus();
            renderLiveControls();
        } catch (_) { /* ignore */ }
    }

    async function startRecording() {
        const res = await api('/api/conference/room/' + encodeURIComponent(selectedRoomId) + '/record/start', { method: 'POST' });
        if (!res.ok || !res.data.ok) throw new Error((res.data && res.data.error) || 'Record start failed');
        await refreshPanel();
    }

    async function stopRecording() {
        const res = await api('/api/conference/room/' + encodeURIComponent(selectedRoomId) + '/record/stop', { method: 'POST' });
        if (!res.ok || !res.data.ok) throw new Error((res.data && res.data.error) || 'Record stop failed');
        await refreshPanel();
    }

    async function muteAllParticipants() {
        const res = await api('/api/conference/room/' + encodeURIComponent(selectedRoomId) + '/mute-all', { method: 'POST', body: {} });
        if (!res.ok || !res.data.ok) throw new Error((res.data && res.data.error) || tr('conference.muteAllFailed'));
        if (res.data.floor) applyFloorState(res.data.floor);
        else handleVcMuteAll();
    }

    async function addBwcIngress() {
        const sel = document.getElementById('vc-bwc-select');
        const camId = sel && sel.value;
        if (!camId) throw new Error(tr('conference.pickBwc'));
        const res = await api('/api/conference/room/' + encodeURIComponent(selectedRoomId) + '/bwc-ingress', {
            method: 'POST',
            body: { camId: camId, displayName: sel.options[sel.selectedIndex].text },
        });
        if (!res.ok || !res.data.ok) throw new Error((res.data && res.data.error) || 'BWC ingress failed');
        await refreshPanel(true);
        const lay = layout();
        if (lay && lkRoom) {
            lay.setShareExpected(true);
            lay.autoLayout();
        }
    }

    async function removeBwcIngress(camId) {
        let url = '/api/conference/room/' + encodeURIComponent(selectedRoomId) + '/bwc-ingress';
        if (camId) url += '?camId=' + encodeURIComponent(camId);
        const res = await api(url, { method: 'DELETE' });
        if (!res.ok || !res.data.ok) throw new Error((res.data && res.data.error) || 'Remove failed');
        await refreshPanel(true);
        const lay = layout();
        if (lay && lkRoom) {
            const remaining = cameraIngressCountFor(roomById(selectedRoomId));
            if (remaining) {
                lay.setShareExpected(true);
                lay.autoLayout();
            } else if (lay.resetShareToGrid) {
                lay.resetShareToGrid();
            }
        }
    }

    async function addFixedCameraIngress() {
        const sel = document.getElementById('vc-fixed-camera-select');
        const cameraId = sel && sel.value;
        if (!cameraId) throw new Error('Select a registered fixed camera');
        const res = await api('/api/conference/room/' + encodeURIComponent(selectedRoomId)
            + '/fixed-camera-ingress', {
            method: 'POST',
            body: { cameraId: cameraId },
        });
        if (!res.ok || !res.data.ok) {
            throw new Error((res.data && res.data.error) || 'Fixed camera ingress failed');
        }
        await refreshPanel(true);
        const lay = layout();
        if (lay && lkRoom) {
            lay.setShareExpected(true);
            lay.autoLayout();
        }
    }

    async function removeFixedCameraIngress(cameraId) {
        let url = '/api/conference/room/' + encodeURIComponent(selectedRoomId) + '/fixed-camera-ingress';
        if (cameraId) url += '?cameraId=' + encodeURIComponent(cameraId);
        const res = await api(url, { method: 'DELETE' });
        if (!res.ok || !res.data.ok) throw new Error((res.data && res.data.error) || 'Remove failed');
        await refreshPanel(true);
        const lay = layout();
        if (lay && lkRoom) {
            const remaining = cameraIngressCountFor(roomById(selectedRoomId));
            if (remaining) {
                lay.setShareExpected(true);
                lay.autoLayout();
            } else if (lay.resetShareToGrid) {
                lay.resetShareToGrid();
            }
        }
    }

    function truncateId(id) {
        const s = String(id || '').trim();
        if (s.length <= 10) return s;
        return s.slice(0, 4) + '\u2026' + s.slice(-4);
    }

    function openGroupIdsFromDom() {
        const open = {};
        document.querySelectorAll('#vc-lobby-body .vc-personnel-group[open]').forEach(function (d) {
            const id = d.getAttribute('data-group-id');
            if (id) open[id] = true;
        });
        return open;
    }

    async function inviteGuestUser(userId) {
        if (!userId || !selectedRoomId) return;
        const room = roomById(selectedRoomId);
        if (!room || !room.active) throw new Error(tr('conference.roomNotOpen'));
        const res = await api('/api/conference/room/' + encodeURIComponent(selectedRoomId) + '/guest', {
            method: 'POST',
            body: { userId: userId },
        });
        if (!res.ok || !res.data.ok) {
            throw new Error((res.data && res.data.error) || tr('conference.inviteFailed'));
        }
        await refreshPanel(true);
    }

    function renderLobby() {
        const el = document.getElementById('vc-lobby-body');
        if (!el) return;
        if (!lobby) {
            el.innerHTML = '<p class="hint">' + esc(tr('conference.loading')) + '</p>';
            return;
        }
        const wasOpen = openGroupIdsFromDom();
        const room = roomById(selectedRoomId);
        const roomOpen = !!(room && room.active);
        const showInvite = !!(perms.host || perms.crossGroup);
        let html = '';
        const groups = lobby.groups || [];
        groups.forEach(function (g, idx) {
            const gid = String(g.groupId || g.name || idx);
            const members = g.members || [];
            const onlineN = members.filter(function (m) { return m.online; }).length;
            const openAttr = (wasOpen[gid] || (!Object.keys(wasOpen).length && idx === 0)) ? ' open' : '';
            html += '<details class="vc-personnel-group"' + openAttr + ' data-group-id="' + esc(gid) + '">'
                + '<summary><span class="vc-pin" style="background:' + esc(g.pinColor || '#64748b') + '"></span> '
                + esc(g.name)
                + ' <span class="vc-personnel-count">' + onlineN + '/' + members.length + '</span></summary>'
                + '<ul class="vc-personnel-list">';
            if (!members.length) {
                html += '<li class="vc-personnel-item"><span class="hint">\u2014</span></li>';
            } else {
                members.forEach(function (m) {
                    const online = !!m.online;
                    html += '<li class="vc-personnel-item' + (online ? ' is-online' : '') + '">'
                        + '<div class="vc-personnel-left">'
                        + '<span class="vc-dot' + (online ? ' is-online' : '') + '" aria-hidden="true"></span>'
                        + '<span class="vc-personnel-name" title="' + esc(m.name) + '">' + esc(m.name) + '</span>'
                        + '<code class="vc-personnel-id" title="' + esc(m.camId) + '">' + esc(truncateId(m.camId)) + '</code>'
                        + '</div></li>';
                });
            }
            html += '</ul></details>';
        });

        const operators = lobby.operators || [];
        if (operators.length) {
            const ogid = 'operators';
            const openAttr = wasOpen[ogid] ? ' open' : '';
            html += '<details class="vc-personnel-group"' + openAttr + ' data-group-id="' + ogid + '">'
                + '<summary>' + esc(tr('conference.whoCanJoin'))
                + ' <span class="vc-personnel-count">' + operators.length + '</span></summary>'
                + '<ul class="vc-personnel-list">';
            operators.forEach(function (op) {
                html += '<li class="vc-personnel-item is-online">'
                    + '<div class="vc-personnel-left">'
                    + '<span class="vc-dot is-online" aria-hidden="true"></span>'
                    + '<span class="vc-personnel-name" title="' + esc(op.username) + '">' + esc(op.username) + '</span>'
                    + '<code class="vc-personnel-id" title="' + esc(op.role || '') + '">' + esc(op.role || '') + '</code>'
                    + '</div>';
                if (showInvite) {
                    html += '<button type="button" class="btn btn-ghost btn-sm vc-personnel-invite" data-invite-user="'
                        + esc(op.userId) + '"' + (!roomOpen ? ' disabled title="' + esc(tr('conference.roomNotOpen')) + '"' : '')
                        + '>' + esc(tr('conference.invite')) + '</button>';
                }
                html += '</li>';
            });
            html += '</ul></details>';
        }

        el.innerHTML = html || '<p class="hint">\u2014</p>';
        el.querySelectorAll('[data-invite-user]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                inviteGuestUser(btn.getAttribute('data-invite-user')).catch(function (e) { alert(e.message); });
            });
        });
    }

    async function deleteRecording(recordingId) {
        if (!recordingId) return;
        if (!window.confirm(tr('conference.recDeleteConfirm'))) return;
        const res = await api('/api/conference/recordings/' + encodeURIComponent(recordingId), { method: 'DELETE' });
        if (!res.ok || !res.data.ok) throw new Error((res.data && res.data.error) || 'Delete failed');
        await renderRecordings();
    }

    async function renderRecordings() {
        const el = document.getElementById('vc-recordings-body');
        if (!el) return;
        const res = await api('/api/conference/recordings');
        if (!res.ok || !res.data.ok) {
            el.innerHTML = '<p class="hint">' + esc((res.data && res.data.error) || 'Failed') + '</p>';
            return;
        }
        const list = res.data.recordings || [];
        const canDelete = perms.host || perms.record;
        let html = '<p class="hint">' + esc(tr('conference.recordingsPathHint')) + '</p>';
        if (!list.length) {
            html += '<p class="hint">' + esc(tr('conference.recordingsEmpty')) + '</p>';
            el.innerHTML = html;
            return;
        }
        html += '<table class="evidence-table"><thead><tr><th>' + tr('conference.recRoom') + '</th><th>'
            + tr('conference.recStarted') + '</th><th>' + tr('conference.recBy') + '</th><th></th></tr></thead><tbody>'
            + list.map(function (r) {
                let actions = '';
                if (r.status === 'ready') {
                    actions += '<a class="btn btn-ghost btn-sm" href="/api/conference/recordings/' + encodeURIComponent(r.id) + '/stream" target="_blank" rel="noopener">' + tr('conference.play') + '</a> ';
                } else {
                    actions += esc(r.status) + ' ';
                }
                if (canDelete && r.status !== 'recording') {
                    actions += '<button type="button" class="btn btn-ghost btn-sm vc-rec-delete" data-rec-id="' + esc(r.id) + '">' + tr('conference.recDelete') + '</button>';
                }
                return '<tr><td>' + esc(r.roomId) + '</td><td>' + esc(r.startedAt) + '</td><td>' + esc(r.startedBy || '\u2014') + '</td><td>' + actions + '</td></tr>';
            }).join('') + '</tbody></table>';
        el.innerHTML = html;
        el.querySelectorAll('.vc-rec-delete').forEach(function (btn) {
            btn.addEventListener('click', function () {
                deleteRecording(btn.getAttribute('data-rec-id')).catch(function (e) { alert(e.message); });
            });
        });
    }

    function settingsField(id, label, value, opts) {
        opts = opts || {};
        const ro = opts.readonly ? ' readonly' : '';
        const type = opts.type || 'text';
        const hint = opts.hint ? ('<p class="hint vc-settings-hint">' + esc(opts.hint) + '</p>') : '';
        const span = opts.span2 ? ' vc-settings-span-2' : '';
        return '<label class="vc-settings-field' + span + '"><span>' + esc(label) + '</span>'
            + '<input type="' + type + '" id="' + id + '" class="vc-settings-input" value="' + esc(value || '') + '"' + ro + '>'
            + hint + '</label>';
    }

    function settingsSelect(id, label, value, options, disabled, opts) {
        opts = opts || {};
        const optsHtml = options.map(function (o) {
            return '<option value="' + esc(o.value) + '"' + (o.value === value ? ' selected' : '') + '>' + esc(o.label) + '</option>';
        }).join('');
        const span = opts.span2 ? ' vc-settings-span-2' : '';
        return '<label class="vc-settings-field' + span + '"><span>' + esc(label) + '</span>'
            + '<select id="' + id + '" class="vc-settings-input"' + (disabled ? ' disabled' : '') + '>' + optsHtml + '</select></label>';
    }

    function settingsCheckbox(id, label, checked, disabled, opts) {
        opts = opts || {};
        const hint = opts.hint ? ('<p class="hint vc-settings-hint">' + esc(opts.hint) + '</p>') : '';
        const span = opts.span2 ? ' vc-settings-span-2' : '';
        return '<label class="vc-settings-field vc-settings-check' + span + '">'
            + '<input type="checkbox" id="' + id + '"' + (checked ? ' checked' : '') + (disabled ? ' disabled' : '') + '>'
            + '<span>' + esc(label) + '</span>'
            + hint + '</label>';
    }

    function credentialsHiddenForMode(mode) {
        return mode === 'lan-docker';
    }

    function syncCredentialsVisibility() {
        const modeEl = document.getElementById('vc-set-deploy-mode');
        const block = document.getElementById('vc-set-credentials');
        const note = document.getElementById('vc-set-credentials-note');
        const intro = document.getElementById('vc-set-form-intro');
        if (!modeEl) return;
        const hidden = credentialsHiddenForMode(modeEl.value);
        if (block) block.style.display = hidden ? 'none' : 'contents';
        if (note) note.style.display = hidden ? '' : 'none';
        if (intro) intro.textContent = tr(hidden ? 'conference.settingsFormIntroLan' : 'conference.settingsFormIntro');
    }

    function collectSettingsForm() {
        function val(id) {
            const el = document.getElementById(id);
            return el ? String(el.value || '').trim() : '';
        }
        function chk(id) {
            const el = document.getElementById(id);
            return !!(el && el.checked);
        }
        const out = {
            deployMode: val('vc-set-deploy-mode'),
            siteHost: val('vc-set-site-host'),
            publicWsUrl: val('vc-set-public-ws'),
            iceNodeIp: val('vc-set-ice-ip'),
            turnUrl: val('vc-set-turn-url'),
            edgeUrl: val('vc-set-edge-url'),
            proxyNote: val('vc-set-proxy-note'),
            publicHttpPort: val('vc-set-public-port') || '7880',
            muteAllOnStart: chk('vc-set-mute-all-on-start'),
        };
        if (!credentialsHiddenForMode(out.deployMode) && document.getElementById('vc-set-api-url')) {
            out.apiUrl = val('vc-set-api-url');
            out.apiKey = val('vc-set-api-key');
            out.apiSecret = val('vc-set-api-secret');
        }
        return out;
    }

    function buildReadinessHtml(ready) {
        if (!ready || !ready.items || !ready.items.length) return '';
        let out = '<div class="vc-settings-ready">'
            + '<h4 class="vc-settings-ready-title">' + esc(tr('conference.settingsReadyTitle')) + '</h4>'
            + '<ul class="vc-settings-ready-list">';
        ready.items.forEach(function (item) {
            const cls = item.ok ? 'ok' : (item.level === 'required' ? 'bad' : 'warn');
            out += '<li class="vc-settings-ready-item ' + cls + '">'
                + (item.ok ? '✓ ' : '○ ')
                + esc(tr('conference.settingsReady.' + item.id)) + '</li>';
        });
        out += '</ul>';
        out += '<p class="vc-settings-ready-summary' + (ready.lanOk ? ' ok' : '') + '">'
            + esc(ready.lanOk ? tr('conference.settingsReadyLanOk') : tr('conference.settingsReadyLanNo')) + '</p>';
        out += '<p class="vc-settings-ready-summary' + (ready.internetOk ? ' ok' : ' warn') + '">'
            + esc(ready.internetOk ? tr('conference.settingsReadyInternetOk') : tr('conference.settingsReadyInternetNo')) + '</p>';
        out += '</div>';
        return out;
    }

    function bindSettingsForm(canEdit) {
        const detectBtn = document.getElementById('vc-set-detect-host');
        if (detectBtn && !detectBtn._vcBound) {
            detectBtn._vcBound = true;
            detectBtn.addEventListener('click', function () {
                const host = window.location.hostname || '';
                if (!host || host === 'localhost' || host === '127.0.0.1') {
                    alert(tr('conference.settingsDetectFail'));
                    return;
                }
                const siteEl = document.getElementById('vc-set-site-host');
                const wsEl = document.getElementById('vc-set-public-ws');
                const iceEl = document.getElementById('vc-set-ice-ip');
                if (siteEl) siteEl.value = host;
                if (wsEl) wsEl.value = 'ws://' + host + ':7880';
                if (iceEl && !iceEl.value) iceEl.value = host;
            });
        }
        const testBtn = document.getElementById('vc-set-test');
        if (testBtn && !testBtn._vcBound) {
            testBtn._vcBound = true;
            testBtn.addEventListener('click', function () {
                if (!canEdit) return;
                const statusEl = document.getElementById('vc-set-status');
                testBtn.disabled = true;
                if (statusEl) statusEl.textContent = tr('conference.loading');
                api('/api/conference/settings/test', { method: 'POST', body: collectSettingsForm() })
                    .then(function (res) {
                        if (!res.ok || !res.data.ok) throw new Error((res.data && res.data.error) || tr('conference.settingsTestFail'));
                        const r = res.data.result || {};
                        if (statusEl) {
                            statusEl.textContent = r.ok
                                ? tr('conference.settingsTestOk')
                                : tr('conference.settingsTestFail') + ': ' + (r.tokenError || (r.signaling && r.signaling.error) || '\u2014');
                            statusEl.className = r.ok ? 'vc-set-status ok' : 'vc-set-status err';
                        }
                        if (r.remoteReadiness) {
                            const readyEl = document.querySelector('.vc-settings-ready');
                            if (readyEl && readyEl.parentNode) {
                                readyEl.outerHTML = buildReadinessHtml(r.remoteReadiness);
                            }
                        }
                    })
                    .catch(function (err) {
                        if (statusEl) {
                            statusEl.textContent = err.message;
                            statusEl.className = 'vc-set-status err';
                        }
                    })
                    .finally(function () { testBtn.disabled = false; });
            });
        }
        const saveBtn = document.getElementById('vc-set-save');
        if (saveBtn && !saveBtn._vcBound) {
            saveBtn._vcBound = true;
            saveBtn.addEventListener('click', function () {
                if (!canEdit) return;
                saveBtn.disabled = true;
                api('/api/conference/settings', { method: 'POST', body: collectSettingsForm() })
                    .then(function (res) {
                        if (!res.ok || !res.data.ok) throw new Error((res.data && res.data.error) || tr('conference.requestFailed'));
                        alert(tr('conference.settingsSaved'));
                        return loadStatus().then(function () { return renderSettings(); });
                    })
                    .catch(function (err) { alert(err.message); })
                    .finally(function () { saveBtn.disabled = false; });
            });
        }
        const modeEl = document.getElementById('vc-set-deploy-mode');
        const hintEl = document.getElementById('vc-set-deploy-hint');
        if (modeEl && hintEl && !modeEl._vcBound) {
            modeEl._vcBound = true;
            const hints = {
                'lan-docker': tr('conference.settingsModeLanHint'),
                'remote-mcu': tr('conference.settingsModeRemoteHint'),
                'livekit-cloud': tr('conference.settingsModeCloudHint'),
            };
            modeEl.addEventListener('change', function () {
                hintEl.textContent = hints[modeEl.value] || hints['lan-docker'];
                syncCredentialsVisibility();
            });
        }
        syncCredentialsVisibility();
    }

    async function renderSettings() {
        const el = document.getElementById('vc-settings-body');
        if (!el) return;
        el.innerHTML = '<p class="hint">' + esc(tr('conference.loading')) + '</p>';
        const res = await api('/api/conference/settings');
        if (!res.ok || !res.data.ok) {
            el.innerHTML = '<p class="hint">' + esc((res.data && res.data.error) || tr('conference.requestFailed')) + '</p>';
            return;
        }
        const data = res.data;
        const cfg = data.settings || {};
        const lk = data.livekit || (status && status.livekit) || {};
        const feat = (status && status.features) || {};
        const canEdit = !!data.canEdit;
        const deployMode = cfg.deployMode || 'lan-docker';
        const secretPlaceholder = cfg.hasApiSecret ? '********' : '';
        const hideCredentials = !!cfg.hideServerCredentials || credentialsHiddenForMode(deployMode);
        const deployHintKeys = {
            'lan-docker': 'conference.settingsModeLanHint',
            'remote-mcu': 'conference.settingsModeRemoteHint',
            'livekit-cloud': 'conference.settingsModeCloudHint',
        };
        const fw = data.firewall || [];
        const readiness = data.remoteReadiness || null;

        /* VC-SETTINGS-FORM-TOP-FW-BORDER-V1 \u2014 Conference service first; status + firewall below */
        let html = '<div class="vc-settings-wrap">';
        if (!canEdit) {
            html += '<p class="setup-hint vc-settings-intro">' + esc(tr('conference.settingsReadonly')) + '</p>';
        } else {
            html += '<p id="vc-set-form-intro" class="setup-hint vc-settings-intro">' + esc(tr(hideCredentials ? 'conference.settingsFormIntroLan' : 'conference.settingsFormIntro')) + '</p>';
        }

        html += '<section class="vc-settings-section vc-settings-card vc-settings-form">';
        html += '<h3>' + esc(tr('conference.settingsTitle')) + '</h3>';
        html += '<div class="vc-settings-form-grid">';
        html += '<p id="vc-set-deploy-hint" class="hint vc-settings-deploy-hint vc-settings-span-2">' + esc(tr(deployHintKeys[deployMode] || deployHintKeys['lan-docker'])) + '</p>';
        html += settingsSelect('vc-set-deploy-mode', tr('conference.settingsDeployMode'), deployMode, [
            { value: 'lan-docker', label: tr('conference.settingsModeLanDocker') },
            { value: 'remote-mcu', label: tr('conference.settingsModeRemote') },
            { value: 'livekit-cloud', label: tr('conference.settingsModeCloud') },
        ], !canEdit);
        html += settingsField('vc-set-site-host', tr('conference.settingsSiteHost'), cfg.siteHost, {
            hint: tr('conference.settingsSiteHostHint'),
            readonly: !canEdit,
        });
        html += '<p id="vc-set-credentials-note" class="hint vc-settings-credentials-note vc-settings-span-2"'
            + (hideCredentials ? '' : ' style="display:none"') + '>'
            + esc(tr('conference.settingsCredentialsServerNote')) + '</p>';
        html += '<div id="vc-set-credentials" class="vc-settings-credentials vc-settings-span-2"'
            + (hideCredentials ? ' style="display:none"' : ' style="display:contents"') + '>';
        html += settingsField('vc-set-api-url', tr('conference.settingsApiUrl'), cfg.apiUrl || '', { readonly: !canEdit, span2: true });
        html += settingsField('vc-set-api-key', tr('conference.settingsApiKey'), cfg.apiKey || '', { readonly: !canEdit });
        html += settingsField('vc-set-api-secret', tr('conference.settingsApiSecret'), secretPlaceholder, {
            type: 'password',
            readonly: !canEdit,
        });
        html += '</div>';
        html += settingsField('vc-set-public-ws', tr('conference.settingsPublicWs'), cfg.publicWsUrl, {
            hint: tr('conference.settingsPublicWsHint'),
            readonly: !canEdit,
            span2: true,
        });
        html += settingsField('vc-set-public-port', tr('conference.settingsPublicPort'), cfg.publicHttpPort || '7880', { readonly: !canEdit });
        html += settingsField('vc-set-ice-ip', tr('conference.settingsIceIp'), cfg.iceNodeIp, { readonly: !canEdit });
        html += settingsField('vc-set-turn-url', tr('conference.settingsTurn'), cfg.turnUrl || '', { readonly: !canEdit });
        html += settingsField('vc-set-edge-url', tr('conference.settingsEdge'), cfg.edgeUrl || '', { readonly: !canEdit });
        html += settingsField('vc-set-proxy-note', tr('conference.settingsProxyNote'), cfg.proxyNote || '', { readonly: !canEdit, span2: true });
        html += settingsCheckbox('vc-set-mute-all-on-start', tr('conference.settingsMuteAllOnStart'), !!cfg.muteAllOnStart, !canEdit, {
            hint: tr('conference.settingsMuteAllOnStartHint'),
            span2: true,
        });

        if (canEdit) {
            html += '<div class="vc-settings-actions vc-settings-span-2">'
                + '<button type="button" class="btn btn-ghost btn-sm" id="vc-set-detect-host">' + tr('conference.settingsDetectHost') + '</button>'
                + '<button type="button" class="btn btn-ghost btn-sm" id="vc-set-test">' + tr('conference.settingsTest') + '</button>'
                + '<button type="button" class="btn btn-action btn-sm" id="vc-set-save">' + tr('conference.settingsSave') + '</button>'
                + '</div>'
                + '<p id="vc-set-status" class="vc-set-status vc-settings-span-2"></p>'
                + '<p class="hint vc-settings-span-2">' + esc(tr('conference.settingsRestartNote')) + '</p>';
        }
        html += '</div></section>';

        html += '<div class="vc-settings-top-row">';
        html += '<section class="vc-settings-section vc-settings-card vc-settings-status">'
            + '<h3>' + esc(tr('conference.settingsStatus')) + '</h3>'
            + '<dl class="vc-settings-status-dl">'
            + '<div class="vc-settings-kv"><dt>' + esc(tr('conference.settingsMcuLabel')) + '</dt><dd>' + esc((status && status.openSourceNotice && status.openSourceNotice.mcu) || tr('conference.settingsMcuName')) + '</dd></div>'
            + '<div class="vc-settings-kv"><dt>' + tr('conference.mcuStatus') + '</dt><dd>' + (lk.enabled ? tr('conference.mcuReady') : tr('conference.mcuOff')) + '</dd></div>'
            + '<div class="vc-settings-kv"><dt>' + tr('conference.settingsClientUrl') + '</dt><dd><code>' + esc(lk.clientWsUrl || lk.wsUrl || '\u2014') + '</code></dd></div>'
            + '<div class="vc-settings-kv"><dt>' + tr('conference.featureRecording') + '</dt><dd>' + (feat.recording ? tr('common.yes') : tr('common.no')) + '</dd></div>'
            + '<div class="vc-settings-kv"><dt>' + tr('conference.featureBwcIngress') + '</dt><dd>' + (feat.bwcIngress ? tr('common.yes') : tr('common.no')) + '</dd></div>'
            + '<div class="vc-settings-kv"><dt>' + tr('conference.settingsMuteAllOnStart') + '</dt><dd>' + ((status && status.muteAllOnStart) ? tr('common.yes') : tr('common.no')) + '</dd></div>'
            + '<div class="vc-settings-kv vc-settings-span-2"><dt>' + tr('conference.featureTurn') + '</dt><dd>' + (feat.turn ? esc(lk.turnUrl) : tr('conference.notConfigured')) + '</dd></div>'
            + '</dl>'
            + buildReadinessHtml(readiness)
            + '</section>';

        if (fw.length) {
            html += '<section class="vc-settings-section vc-settings-card vc-settings-firewall">'
                + '<h3>' + esc(tr('conference.settingsFirewall')) + '</h3>'
                + '<table class="evidence-table vc-settings-fw"><thead><tr><th>' + tr('cloud.firewall.service') + '</th><th>'
                + tr('cloud.firewall.port') + '</th><th>' + tr('cloud.firewall.note') + '</th></tr></thead><tbody>'
                + fw.map(function (r) {
                    return '<tr><td>' + esc(r.service) + '</td><td>' + esc(r.port) + '</td><td>' + esc(r.note) + '</td></tr>';
                }).join('')
                + '</tbody></table></section>';
        }
        html += '</div></div>';
        el.innerHTML = html;
        bindSettingsForm(canEdit);
    }

    async function refreshPanel(force) {
        if (!perms.view) return;
        if (panelWarm(currentPanel, force)) return;
        try {
            await loadStatus();
            renderSetupNotice();
            if (currentPanel === 'live') {
                await loadLobby();
                renderRoomPicker();
                renderLiveControls();
                renderLobby();
                syncLiveIdle();
            } else if (currentPanel === 'recordings') {
                await renderRecordings();
            } else if (currentPanel === 'settings') {
                await renderSettings();
            }
            markPanelLoaded(currentPanel);
        } catch (err) {
            const notice = document.getElementById('vc-setup-notice');
            if (notice) {
                notice.hidden = false;
                notice.innerHTML = '<p class="hint">' + esc(err.message) + '</p>';
            }
        }
    }

    function bindUi() {
        if (global._vcHubUiBound) return;
        global._vcHubUiBound = true;
        const lay = layout();
        if (lay) lay.init('vc-stage');
        bindBwcTileMuteClicks();
        const stageLeave = document.getElementById('vc-stage-leave');
        if (stageLeave && !stageLeave._vcBound) {
            stageLeave._vcBound = true;
            stageLeave.addEventListener('click', function () {
                leaveRoom().catch(function (e) { alert(e.message); });
            });
        }
        document.querySelectorAll('.vc-hub-nav-btn').forEach(function (btn) {
            btn.addEventListener('click', function () { showPanel(btn.dataset.panel); });
        });
        if (!global._vcHubI18nBound) {
            global._vcHubI18nBound = true;
            global.addEventListener('fm-i18n-changed', function () { refreshPanel(true); });
        }
        if (global.socket && !global._vcHubSocketBound) {
            global._vcHubSocketBound = true;
            global.socket.on('conference-bwc-ingress-stopped', function (payload) {
                loadStatus().then(function () {
                    renderLiveControls();
                    renderRoomPicker();
                    if (lkRoom && payload && payload.roomId === selectedRoomId) {
                        const lay = layout();
                        const remaining = cameraIngressCountFor(roomById(selectedRoomId));
                        if (lay) {
                            if (remaining) {
                                lay.setShareExpected(true);
                                lay.autoLayout();
                            } else if (lay.resetShareToGrid) lay.resetShareToGrid();
                            else lay.autoLayout();
                        }
                    }
                }).catch(function () { /* ignore */ });
            });
            global.socket.on('conference-bwc-ingress-failed', function (payload) {
                loadStatus().then(function () {
                    renderLiveControls();
                    renderRoomPicker();
                    if (lkRoom && payload && payload.roomId === selectedRoomId) {
                        const lay = layout();
                        if (lay && lay.resetShareToGrid) lay.resetShareToGrid();
                        if (typeof tr === 'function') {
                            console.warn(tr('conference.layoutBwcFailed'));
                        }
                    }
                }).catch(function () { /* ignore */ });
            });
            global.socket.on('conference-fixed-camera-ingress-stopped', function (payload) {
                loadStatus().then(function () {
                    renderLiveControls();
                    renderRoomPicker();
                    if (lkRoom && payload && payload.roomId === selectedRoomId) {
                        const lay = layout();
                        const remaining = cameraIngressCountFor(roomById(selectedRoomId));
                        if (lay) {
                            if (remaining) {
                                lay.setShareExpected(true);
                                lay.autoLayout();
                            } else if (lay.resetShareToGrid) lay.resetShareToGrid();
                            else lay.autoLayout();
                        }
                    }
                }).catch(function () { /* ignore */ });
            });
        }
    }

    function onShow(opts) {
        opts = opts || {};
        showPanel(currentPanel || 'live', opts.force ? { force: true } : { skipRefresh: true });
    }

    global.ConferenceHub = {
        applyPermissions: applyPermissions,
        onShow: onShow,
        bindUi: bindUi,
        leaveRoom: leaveRoom,
    };
}(window));
