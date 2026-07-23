/**
 * Operator mic for PTT \u2014 8 kHz mono G.711 A-law (PCMA), 20 ms frames (160 bytes).
 * Matches HDA SDK PDF 27 (dwCMD 130).
 */
(function (global) {
    const FRAME_SAMPLES = 160;
    const FRAME_MS = 20;

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
                'Microphone blocked on HTTP at a LAN IP. Use http://localhost on this PC, HTTPS on the server, or Call (phone) while live.'
            );
        }
        if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
            return new Error('Microphone API not available in this browser');
        }
        return null;
    }

    function create(onFrame) {
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
                    echoCancellation: false,
                    noiseSuppression: false,
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

    global.PttMic = { create: create, FRAME_SAMPLES: FRAME_SAMPLES };
})(window);
