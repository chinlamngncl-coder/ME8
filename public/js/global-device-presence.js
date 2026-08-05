/**
 * GlobalDevicePresence — software-wide BWC Online/Offline/GPS single source of truth.
 *
 * STRICTLY ADDITIVE:
 * - Binds to the existing root dashboard Socket.IO (`__mobilityDashboardSocket`).
 * - Does NOT create a competing io() connection (SOS / PTT / video stay on the primary socket).
 * - Appends listeners only; never replaces or removes other handlers.
 * - Does not touch license, LAN/WAN routing, or video start/stop APIs.
 */
(function (global) {
    'use strict';

    var POLL_MS = 3000;
    var byId = Object.create(null);
    var listeners = [];
    var socketRef = null;
    var socketBound = false;
    var pollTimer = null;
    var started = false;
    var seq = 0;

    function normalizeId(id) {
        return String(id == null ? '' : id).trim();
    }

    function nowIso() {
        return new Date().toISOString();
    }

    function ensureRow(id) {
        id = normalizeId(id);
        if (!id) return null;
        if (!byId[id]) {
            byId[id] = {
                id: id,
                name: id,
                online: false,
                status: '0',
                group: '',
                lat: null,
                lon: null,
                gpsAt: null,
                lastSeenAt: null,
                source: 'unknown',
            };
        }
        return byId[id];
    }

    function snapshotList() {
        return Object.keys(byId).map(function (k) {
            var d = byId[k];
            return {
                id: d.id,
                name: d.name,
                online: !!d.online,
                status: d.online ? '1' : '0',
                group: d.group || '',
                mapGroup: d.group || '',
                lat: d.lat,
                lon: d.lon,
                gpsAt: d.gpsAt,
                lastSeenAt: d.lastSeenAt,
                source: d.source,
            };
        }).sort(function (a, b) {
            return String(a.name || a.id).localeCompare(String(b.name || b.id));
        });
    }

    function notify(reason) {
        seq += 1;
        var list = snapshotList();
        for (var i = 0; i < listeners.length; i++) {
            try { listeners[i](list, reason, seq); } catch (_) { /* ignore */ }
        }
        try {
            global.dispatchEvent(new CustomEvent('me8-global-device-presence', {
                detail: { list: list, reason: reason || '', seq: seq },
            }));
        } catch (_) { /* ignore */ }
        bridgeFleetUi(list, reason);
        bridgeCommandWall(list, reason);
    }

    /** Push online flags into Ops FleetUi without wiping telemetry. */
    function bridgeFleetUi(list, reason) {
        if (!global.FleetUi) return;
        if (typeof global.FleetUi.patchPresenceBatch === 'function') {
            try {
                global.FleetUi.patchPresenceBatch(list, reason);
            } catch (_) { /* ignore */ }
            return;
        }
        /* Fallback: only full roster ingest when we have a complete poll/roster snapshot */
        if ((reason === 'fleet-roster' || reason === 'poll') && typeof global.FleetUi.ingestFleet === 'function') {
            try {
                var rows = list.map(function (d) {
                    var prev = (typeof global.FleetUi.getDeviceState === 'function')
                        ? global.FleetUi.getDeviceState(d.id)
                        : null;
                    var row = {
                        id: d.id,
                        name: d.name,
                        status: d.online ? '1' : '0',
                        mapGroup: d.group || '',
                    };
                    if (prev && prev.telemetry) row.telemetryStored = prev.telemetry;
                    return row;
                });
                global.FleetUi.ingestFleet(rows);
            } catch (_) { /* ignore */ }
        }
    }

    function bridgeCommandWall(list, reason) {
        if (!global.CommandWall || typeof global.CommandWall.ingestPresenceList !== 'function') return;
        try { global.CommandWall.ingestPresenceList(list, reason); } catch (_) { /* ignore */ }
    }

    function setOnline(id, online, source) {
        var row = ensureRow(id);
        if (!row) return false;
        var next = !!online;
        var changed = row.online !== next;
        row.online = next;
        row.status = next ? '1' : '0';
        row.lastSeenAt = nowIso();
        if (source) row.source = source;
        return changed;
    }

    function setGps(id, lat, lon, source) {
        var row = ensureRow(id);
        if (!row) return false;
        var la = Number(lat);
        var lo = Number(lon);
        if (!isFinite(la) || !isFinite(lo)) return false;
        var changed = row.lat !== la || row.lon !== lo;
        row.lat = la;
        row.lon = lo;
        row.gpsAt = nowIso();
        row.lastSeenAt = row.gpsAt;
        if (source) row.source = source;
        /* GPS implies recently alive — do not force online=true (cloud may send last GPS offline) */
        return changed;
    }

    function upsertFromFleetRow(d, source) {
        if (!d) return false;
        var id = normalizeId(d.id || d.deviceId || d.cameraId);
        if (!id) return false;
        var row = ensureRow(id);
        var online = d.online === true || d.status === '1' || d.status === 1 || d.status === 'online';
        var name = d.name || d.operatorName || d.nickname || row.name || id;
        var group = d.mapGroup || d.group || row.group || '';
        var changed = false;
        if (row.name !== name) { row.name = name; changed = true; }
        if (row.group !== group) { row.group = group; changed = true; }
        if (setOnline(id, online, source || 'fleet')) changed = true;
        if (d.lat != null && d.lon != null) {
            if (setGps(id, d.lat, d.lon, source || 'fleet')) changed = true;
        }
        return changed;
    }

    function ingestFleetRoster(payload) {
        var list = Array.isArray(payload) ? payload
            : (payload && Array.isArray(payload.fleet) ? payload.fleet : null);
        if (!list) return;
        var changed = false;
        for (var i = 0; i < list.length; i++) {
            if (upsertFromFleetRow(list[i], 'fleet-roster')) changed = true;
        }
        /* Do not force-offline devices absent from a scoped roster (dispatch filter). */
        if (changed) notify('fleet-roster');
    }

    function onDeviceOffline(data) {
        if (!data) return;
        var id = normalizeId(data.cameraId || data.camId || data.id);
        if (!id) return;
        var changed = setOnline(id, false, 'device-offline');
        if (data.lat != null && data.lon != null) {
            if (setGps(id, data.lat, data.lon, 'device-offline')) changed = true;
        }
        if (changed) notify('device-offline');
    }

    function onHeartbeat(data) {
        if (!data) return;
        var id = normalizeId(data.cameraId || data.camId || data.id);
        if (!id) return;
        var changed = setOnline(id, true, 'heartbeat');
        if (changed) notify('heartbeat');
    }

    function onGpsUpdate(data) {
        if (!data || data.lat == null || data.lon == null) return;
        var id = normalizeId(data.cameraId || data.camId || data.id);
        if (!id) return;
        var changed = setGps(id, data.lat, data.lon, 'gps-update');
        /* Optional soft-online: only if server marks online */
        if (data.online === true || data.status === '1') {
            if (setOnline(id, true, 'gps-update')) changed = true;
        }
        if (changed) notify('gps-update');
    }

    function onDeviceStatus(data) {
        if (!data) return;
        var id = normalizeId(data.cameraId || data.camId || data.id);
        if (!id) return;
        var changed = false;
        if (data.online === true || data.status === '1' || data.status === 'online') {
            if (setOnline(id, true, 'device-status')) changed = true;
        } else if (data.online === false || data.status === '0' || data.status === 'offline') {
            if (setOnline(id, false, 'device-status')) changed = true;
        }
        if (data.lat != null && data.lon != null) {
            if (setGps(id, data.lat, data.lon, 'device-status')) changed = true;
        }
        var row = ensureRow(id);
        if (data.name && row && row.name !== data.name) {
            row.name = String(data.name);
            changed = true;
        }
        if (changed) notify('device-status');
    }

    function pollOnce() {
        Promise.all([
            fetch('/api/fleet', { credentials: 'same-origin' })
                .then(function (r) { return r.json(); })
                .catch(function () { return null; }),
            fetch('/api/bwc-devices', { credentials: 'same-origin' })
                .then(function (r) { return r.json(); })
                .catch(function () { return null; }),
        ]).then(function (pair) {
            var data = pair[0];
            var bwc = pair[1];
            var list = Array.isArray(data) ? data
                : (data && Array.isArray(data.fleet) ? data.fleet : []);
            var changed = false;
            for (var i = 0; i < list.length; i++) {
                if (upsertFromFleetRow(list[i], 'poll')) changed = true;
            }
            var rows = (bwc && Array.isArray(bwc.devices)) ? bwc.devices
                : (Array.isArray(bwc) ? bwc : []);
            for (var j = 0; j < rows.length; j++) {
                var d = rows[j];
                if (!d || !d.deviceId) continue;
                var id = normalizeId(d.deviceId);
                var row = ensureRow(id);
                var name = d.operatorName || d.nickname || row.name || id;
                var group = d.mapGroup || row.group || '';
                if (row.name !== name) { row.name = name; changed = true; }
                if (row.group !== group) { row.group = group; changed = true; }
                /* Registered but not in fleet poll → keep prior online; do not force offline */
            }
            if (changed) notify('poll');
        });
    }

    function startPolling() {
        if (pollTimer) return;
        pollOnce();
        pollTimer = setInterval(pollOnce, POLL_MS);
    }

    function stopPolling() {
        if (!pollTimer) return;
        clearInterval(pollTimer);
        pollTimer = null;
    }

    /**
     * Non-destructive bind to the root dashboard socket.
     * Safe to call multiple times; handlers attach once.
     */
    function bind(socket) {
        if (!socket || typeof socket.on !== 'function') return false;
        socketRef = socket;
        if (!socketBound) {
            socketBound = true;
            socket.on('fleet-roster', ingestFleetRoster);
            socket.on('device-offline', onDeviceOffline);
            socket.on('heartbeat', onHeartbeat);
            socket.on('gps-update', onGpsUpdate);
            socket.on('device-status', onDeviceStatus);
            socket.on('connect', function () {
                pollOnce();
            });
            /* Auto-recover: if transport drops, Socket.IO reconnects; we re-poll on connect.
               Polling also runs continuously so LAN/Cloud presence never requires F5. */
        }
        startPolling();
        started = true;
        return true;
    }

    function start() {
        if (started) {
            startPolling();
            return;
        }
        var sock = global.__mobilityDashboardSocket
            || global.dashboardSocket
            || global.socket
            || null;
        if (sock) bind(sock);
        else {
            /* Socket not ready yet — poll only; bind later when boot sets socket */
            startPolling();
            started = true;
            var n = 0;
            var iv = setInterval(function () {
                var s = global.__mobilityDashboardSocket || global.dashboardSocket || global.socket;
                if (s && bind(s)) {
                    clearInterval(iv);
                    return;
                }
                if (++n > 100) clearInterval(iv);
            }, 200);
        }
    }

    function subscribe(fn) {
        if (typeof fn !== 'function') return function () {};
        listeners.push(fn);
        try { fn(snapshotList(), 'subscribe', seq); } catch (_) { /* ignore */ }
        return function unsubscribe() {
            listeners = listeners.filter(function (f) { return f !== fn; });
        };
    }

    function getList() {
        return snapshotList();
    }

    function getById(id) {
        id = normalizeId(id);
        var d = byId[id];
        if (!d) return null;
        return {
            id: d.id,
            name: d.name,
            online: !!d.online,
            status: d.online ? '1' : '0',
            group: d.group || '',
            lat: d.lat,
            lon: d.lon,
            gpsAt: d.gpsAt,
            lastSeenAt: d.lastSeenAt,
        };
    }

    function isOnline(id) {
        var d = getById(id);
        return !!(d && d.online);
    }

    function getGps(id) {
        var d = getById(id);
        if (!d || d.lat == null || d.lon == null) return null;
        return { lat: d.lat, lon: d.lon, at: d.gpsAt };
    }

    global.GlobalDevicePresence = {
        bind: bind,
        start: start,
        subscribe: subscribe,
        getList: getList,
        getById: getById,
        isOnline: isOnline,
        getGps: getGps,
        ingestFleetRoster: ingestFleetRoster,
        pollOnce: pollOnce,
        /** Alias used by consumers expecting GlobalDeviceList name */
        GlobalDeviceList: function () { return snapshotList(); },
    };
    global.GlobalDeviceList = global.GlobalDevicePresence;

    /* Auto-start after DOM scripts; does not open a new socket */
    if (global.document && global.document.readyState === 'loading') {
        global.document.addEventListener('DOMContentLoaded', function () { start(); });
    } else {
        setTimeout(start, 0);
    }
})(typeof window !== 'undefined' ? window : this);
