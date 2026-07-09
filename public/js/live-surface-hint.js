/**
 * Soft hint when the same dashboard window goes live on Operations and video wall.
 * Advisory only — does not block start-video or pool sessions.
 */
(function (global) {
    'use strict';

    var boundIds = Object.create(null);

    function tr(key, params) {
        if (global.I18n && I18n.t) return I18n.t(key, params);
        return key;
    }

    function showToast(message) {
        if (!message) return;
        if (typeof global.showMapPinToast === 'function') {
            global.showMapPinToast(message);
            return;
        }
        var el = document.getElementById('live-surface-hint-toast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'live-surface-hint-toast';
            el.className = 'map-pin-toast';
            el.setAttribute('role', 'status');
            el.setAttribute('aria-live', 'polite');
            document.body.appendChild(el);
        }
        el.textContent = message;
        el.classList.add('visible');
        if (showToast._timer) clearTimeout(showToast._timer);
        showToast._timer = setTimeout(function () { el.classList.remove('visible'); }, 5200);
    }

    function onHint(data) {
        var camId = data && data.camId ? String(data.camId) : '';
        showToast(tr('live.duplicateSurfaceWarn', { camId: camId }));
    }

    function bind(socket) {
        if (!socket || !socket.id || boundIds[socket.id]) return;
        boundIds[socket.id] = true;
        socket.on('live-duplicate-surface-hint', onHint);
    }

    global.LiveSurfaceHint = { bind: bind };
})(typeof window !== 'undefined' ? window : this);
