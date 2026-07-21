/**
 * Operator mic for SIP voice intercom (Fleet ☎) — PCMA to BWC via call-audio.
 * Phone path: echo cancellation on (PTT hold-to-talk stays in ptt-mic.js).
 */
(function (global) {
    const FRAME_SAMPLES = 160;
    const FRAME_MS = 20;

    let mic = null;
    let activeCamId = null;
    let socketRef = null;
    const GROUP_CALL_ID = '__sos_group__';
    let playbackCtx = null;
    let playbackTime = 0;

    function linearToAlaw(pcm) {
        const MASK = 0xD5;
        let sign = 0;
        if (pcm < 0) {
            sign = 0x80;
            pcm = -pcm;
        }
        if (pcm > 32635) pcm = 32635;
        let exp = 7;
        for (let mask = 0x4000; (pcm & mask) === 0 && exp > 0; exp--, mask >>= 1) { /* */ }
        const mantissa = (pcm >> ((exp === 0) ? 4 : (exp + 3))) & 0x0F;
        return (sign | (exp << 4) | mantissa) ^ MASK;
    }

    function floatToAlaw(samples) {
        const out = new Uint8Array(samples.length);
        for (let i = 0; i < samples.length; i++) {
            let s = samples[i];
            if (s > 1) s = 1;
            if (s < -1) s = -1;
            const pcm = s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7fff);
            out[i] = linearToAlaw(pcm);
        }
        return out;
    }

    function micApiError() {
        if (typeof window !== 'undefined' && window.isSecureContext === false) {
            return new Error(
                'Microphone blocked on HTTP at a LAN IP. Use http://localhost on this PC or HTTPS on the server.'
            );
        }
        if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
            return new Error('Microphone API not available in this browser');
        }
        return null;
    }

    function createCallMic(onFrame) {
        let audioCtx = null;
        let processor = null;
        let stream = null;
        let sampleBuffer = [];
        let resamplePos = 0;
        let frameTimer = null;
        let running = false;

        function pumpFrames() {
            if (!running) return;
            while (sampleBuffer.length >= FRAME_SAMPLES) {
                const frame = sampleBuffer.splice(0, FRAME_SAMPLES);
                const alaw = floatToAlaw(frame);
                if (typeof onFrame === 'function') onFrame(alaw);
            }
        }

        async function start() {
            if (running) return;
            const apiErr = micApiError();
            if (apiErr) throw apiErr;
            stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: false,
                },
            });
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const src = audioCtx.createMediaStreamSource(stream);
            processor = audioCtx.createScriptProcessor(1024, 1, 1);
            const silent = audioCtx.createGain();
            silent.gain.value = 0;
            const inRate = audioCtx.sampleRate;
            const step = inRate / 8000;

            processor.onaudioprocess = function (e) {
                if (!running) return;
                const input = e.inputBuffer.getChannelData(0);
                let pos = resamplePos;
                while (pos + 1 < input.length) {
                    const i0 = Math.floor(pos);
                    const frac = pos - i0;
                    sampleBuffer.push(input[i0] * (1 - frac) + input[i0 + 1] * frac);
                    pos += step;
                }
                resamplePos = pos - input.length;
            };

            src.connect(processor);
            processor.connect(silent);
            silent.connect(audioCtx.destination);
            if (audioCtx.state === 'suspended') await audioCtx.resume();
            running = true;
            frameTimer = setInterval(pumpFrames, FRAME_MS);
        }

        function stop() {
            running = false;
            sampleBuffer = [];
            resamplePos = 0;
            if (frameTimer) {
                clearInterval(frameTimer);
                frameTimer = null;
            }
            if (processor) {
                try { processor.disconnect(); } catch (_) { /* ignore */ }
                processor = null;
            }
            if (stream) {
                stream.getTracks().forEach(function (t) { t.stop(); });
                stream = null;
            }
            if (audioCtx) {
                audioCtx.close().catch(function () { /* ignore */ });
                audioCtx = null;
            }
        }

        return { start: start, stop: stop, isRunning: function () { return running; } };
    }

    function ensureMic() {
        if (!mic) {
            mic = createCallMic(function (alawFrame) {
                if (!socketRef || !activeCamId) return;
                if (activeCamId === GROUP_CALL_ID) {
                    socketRef.emit('sos-group-call-audio', { group: true }, alawFrame.buffer);
                } else {
                    socketRef.emit('call-audio', { camId: activeCamId }, alawFrame.buffer);
                }
            });
        }
        return mic;
    }

    function binaryBytes(value) {
        if (!value) return null;
        if (value instanceof ArrayBuffer) return new Uint8Array(value);
        if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
        if (value.type === 'Buffer' && Array.isArray(value.data)) return new Uint8Array(value.data);
        return null;
    }

    function ensurePlaybackContext() {
        if (!playbackCtx) playbackCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (playbackCtx.state === 'suspended') playbackCtx.resume().catch(function () { /* ignore */ });
        return playbackCtx;
    }

    function playGroupPcm(pcmValue) {
        const bytes = binaryBytes(pcmValue);
        if (!bytes || bytes.length < 2) return;
        const sampleCount = Math.floor(bytes.length / 2);
        ensurePlaybackContext();
        const audio = playbackCtx.createBuffer(1, sampleCount, 8000);
        const channel = audio.getChannelData(0);
        for (let i = 0; i < sampleCount; i += 1) {
            let sample = bytes[i * 2] | (bytes[(i * 2) + 1] << 8);
            if (sample & 0x8000) sample -= 0x10000;
            channel[i] = sample / 32768;
        }
        const now = playbackCtx.currentTime;
        if (playbackTime < now || playbackTime > now + 0.35) playbackTime = now + 0.025;
        const source = playbackCtx.createBufferSource();
        source.buffer = audio;
        source.connect(playbackCtx.destination);
        source.start(playbackTime);
        playbackTime += audio.duration;
    }

    function bindSocket(socket) {
        socketRef = socket;
        if (socket && !socket.__sosGroupCallAudioBound) {
            socket.__sosGroupCallAudioBound = true;
            socket.on('sos-group-call-audio', function (_meta, pcm) {
                if (activeCamId !== GROUP_CALL_ID) return;
                playGroupPcm(pcm);
            });
        }
    }

    function start(camId) {
        if (!camId || !socketRef) return;
        activeCamId = camId;
        const m = ensureMic();
        if (m) m.start().catch(function () { activeCamId = null; });
    }

    function startGroup() {
        if (!socketRef) return;
        activeCamId = GROUP_CALL_ID;
        ensurePlaybackContext();
        const m = ensureMic();
        if (m) m.start().catch(function () { activeCamId = null; });
    }

    function stopGroup() {
        if (activeCamId !== GROUP_CALL_ID) return;
        stop();
    }

    function stop() {
        activeCamId = null;
        if (mic) mic.stop();
    }

    global.CallMic = {
        bindSocket: bindSocket,
        start: start,
        startGroup: startGroup,
        stop: stop,
        stopGroup: stopGroup,
        isActive: function () { return !!activeCamId; },
        isGroupActive: function () { return activeCamId === GROUP_CALL_ID; },
    };
})(window);
