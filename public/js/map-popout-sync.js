/**
 * Wall Map popout — Phase 3 display-only mirror.
 * Main dashboard owns all control; TV popout follows via BroadcastChannel (same PC/browser).
 */
(function (global) {
    var CHANNEL_NAME = 'mobility-axiom-map-mirror';
    var channel = null;
    var isPopout = false;
    var getStateFn = null;
    var applyStateFn = null;
    var publishTimer = null;
    var PUBLISH_DEBOUNCE_MS = 120;

    function publishNow() {
        if (isPopout || !channel || !getStateFn || global.mapPopoutMirrorApplying) return;
        var state = getStateFn();
        if (!state) return;
        try {
            channel.postMessage(state);
        } catch (_) { /* ignore */ }
    }

    function publishDebounced() {
        if (isPopout) return;
        if (publishTimer) clearTimeout(publishTimer);
        publishTimer = setTimeout(function () {
            publishTimer = null;
            publishNow();
        }, PUBLISH_DEBOUNCE_MS);
    }

    function onChannelMessage(ev) {
        var data = ev && ev.data;
        if (!data || typeof data !== 'object') return;
        if (data.type === 'hello' && !isPopout) {
            publishNow();
            return;
        }
        if (data.type === 'mirror' && isPopout && applyStateFn) {
            applyStateFn(data);
        }
    }

    function initPopoutMapInteraction(map) {
        if (!map || !isPopout) return;
        global.mapPopoutMirrorActive = true;
        document.documentElement.classList.add('map-popout-mirror');
        try {
            if (map.dragging) map.dragging.disable();
            if (map.touchZoom) map.touchZoom.disable();
            if (map.doubleClickZoom) map.doubleClickZoom.disable();
            if (map.scrollWheelZoom) map.scrollWheelZoom.disable();
            if (map.boxZoom) map.boxZoom.disable();
            if (map.keyboard) map.keyboard.disable();
        } catch (_) { /* ignore */ }
    }

    function init(opts) {
        opts = opts || {};
        isPopout = !!opts.isPopout;
        getStateFn = opts.getState || null;
        applyStateFn = opts.applyState || null;

        if (typeof BroadcastChannel !== 'function') {
            if (isPopout) {
                global.mapPopoutMirrorActive = true;
                document.documentElement.classList.add('map-popout-mirror');
                initPopoutMapInteraction(opts.map);
            }
            return;
        }

        try {
            channel = new BroadcastChannel(CHANNEL_NAME);
            channel.onmessage = onChannelMessage;
        } catch (_) {
            return;
        }

        if (isPopout) {
            initPopoutMapInteraction(opts.map);
            setTimeout(function () {
                try {
                    channel.postMessage({ type: 'hello', at: Date.now() });
                } catch (_) { /* ignore */ }
            }, 400);
            setInterval(function () {
                try {
                    channel.postMessage({ type: 'hello', at: Date.now() });
                } catch (_) { /* ignore */ }
            }, 8000);
        } else if (opts.map) {
            opts.map.on('moveend', publishDebounced);
            opts.map.on('zoomend', publishDebounced);
        }
    }

    global.MapPopoutSync = {
        init: init,
        publish: publishNow,
        publishDebounced: publishDebounced,
        isPopout: function () { return isPopout; },
        isMirrorActive: function () { return !!global.mapPopoutMirrorActive; },
    };
})(window);
