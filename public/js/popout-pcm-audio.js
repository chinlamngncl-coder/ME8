/**
 * PCM live audio (WS port HTTP+2) for pop-out viewers \u2014 mirrors video-wall.js path.
 */
(function (global) {
    'use strict';

    var VOL_KEY = 'fm_live_audio_volume';
    var state = null;
    var muted = true;

    function audioWsUrl(httpPort) {
        var p = parseInt(httpPort, 10) || 3888;
        return 'ws://' + global.location.hostname + ':' + (p + 2);
    }

    function getVolume() {
        try {
            var v = parseInt(localStorage.getItem(VOL_KEY), 10);
            if (!isNaN(v) && v >= 0 && v <= 100) return v;
        } catch (_) { /* ignore */ }
        return 100;
    }

    function applyGain() {
        if (!state || !state.gain) return;
        state.gain.gain.value = muted ? 0 : (getVolume() / 100);
    }

    function stop() {
        if (!state) return;
        state.stopped = true;
        try { state.ws.close(); } catch (_) { /* ignore */ }
        try { state.ctx.close(); } catch (_) { /* ignore */ }
        state = null;
    }

    function start(httpPort) {
        if (state) {
            applyGain();
            return;
        }
        var AudioCtx = global.AudioContext || global.webkitAudioContext;
        if (!AudioCtx) return;
        var ctx = new AudioCtx({ sampleRate: 8000 });
        var gain = ctx.createGain();
        gain.connect(ctx.destination);
        var ws = new WebSocket(audioWsUrl(httpPort));
        ws.binaryType = 'arraybuffer';
        var s = { ctx: ctx, ws: ws, gain: gain, stopped: false, nextTime: 0, started: false };
        state = s;
        applyGain();
        ws.onopen = function () {
            if (ctx.state === 'suspended') ctx.resume();
            applyGain();
        };
        ws.onmessage = function (ev) {
            if (s.stopped || !ev.data) return;
            var int16 = new Int16Array(ev.data);
            if (!int16.length) return;
            var float32 = new Float32Array(int16.length);
            for (var i = 0; i < int16.length; i++) {
                float32[i] = int16[i] / (int16[i] < 0 ? 32768 : 32767);
            }
            var buf = ctx.createBuffer(1, float32.length, 8000);
            buf.getChannelData(0).set(float32);
            var src = ctx.createBufferSource();
            src.buffer = buf;
            src.connect(gain);
            if (!s.started) {
                s.nextTime = ctx.currentTime + 0.05;
                s.started = true;
            }
            var t = Math.max(ctx.currentTime, s.nextTime);
            src.start(t);
            s.nextTime = t + buf.duration;
        };
        ws.onclose = function () {
            if (!s.stopped) state = null;
        };
    }

    function toggleMute(httpPort) {
        muted = !muted;
        if (!muted) start(httpPort);
        applyGain();
        return muted;
    }

    function setMuted(isMuted, httpPort) {
        muted = !!isMuted;
        if (!muted) start(httpPort);
        applyGain();
        return muted;
    }

    function isMuted() {
        return muted;
    }

    global.PopoutPcmAudio = {
        start: start,
        stop: stop,
        toggleMute: toggleMute,
        setMuted: setMuted,
        isMuted: isMuted,
        applyGain: applyGain,
    };
})(window);
