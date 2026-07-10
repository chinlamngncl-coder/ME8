/**
 * Operator mic for live Call / Fleet ☎ — PCMA to BWC via call-audio.
 * Hold-to-talk only (mob-call-mic-hold): frees PTT TCP for BWC → HQ when not holding.
 */
(function (global) {
    const FRAME_SAMPLES = 160;
    const FRAME_MS = 20;

    let mic = null;
    let activeCamId = null;
    let socketRef = null;
    let talking = false;
    let holdUi = null;
    let keysBound = false;

    function tr(key, fallback) {
        if (typeof I18n !== 'undefined' && I18n.t) {
            const v = I18n.t(key);
            if (v && v !== key) return v;
        }
        return fallback || key;
    }

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

    function syncHoldUi() {
        if (!holdUi) return;
        const btn = holdUi.querySelector('.call-mic-hold-btn');
        const hint = holdUi.querySelector('.call-mic-hold-hint');
        if (btn) {
            btn.classList.toggle('is-talking', talking);
            btn.setAttribute('aria-pressed', talking ? 'true' : 'false');
            btn.textContent = talking
                ? tr('call.holdTalking', 'Talking… release to listen')
                : tr('call.holdToTalk', 'Hold to talk');
        }
        if (hint) {
            hint.textContent = talking
                ? tr('call.holdChannelBusy', 'Channel open to BWC — release for field PTT')
                : tr('call.holdChannelFree', 'Mic off — field can PTT to HQ · Space or hold button');
        }
    }

    function setTalking(on) {
        if (!activeCamId) return;
        talking = !!on;
        syncHoldUi();
    }

    function ensureHoldUi() {
        if (holdUi) return holdUi;
        if (!document.getElementById('call-mic-hold-style')) {
            const style = document.createElement('style');
            style.id = 'call-mic-hold-style';
            style.textContent =
                '#call-mic-hold{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);' +
                'z-index:12000;display:flex;flex-direction:column;align-items:center;gap:8px;' +
                'pointer-events:none;font-family:Segoe UI,system-ui,sans-serif}' +
                '#call-mic-hold .call-mic-hold-btn{pointer-events:auto;min-width:220px;padding:14px 22px;' +
                'border:0;border-radius:10px;background:#1a5f9e;color:#fff;font-size:15px;font-weight:600;' +
                'cursor:pointer;box-shadow:0 4px 18px rgba(0,0,0,.35);user-select:none;-webkit-user-select:none;' +
                'touch-action:none}' +
                '#call-mic-hold .call-mic-hold-btn.is-talking{background:#c0392b}' +
                '#call-mic-hold .call-mic-hold-hint{pointer-events:none;color:#dce8f5;font-size:12px;' +
                'text-shadow:0 1px 3px rgba(0,0,0,.8);max-width:360px;text-align:center}';
            document.head.appendChild(style);
        }
        holdUi = document.createElement('div');
        holdUi.id = 'call-mic-hold';
        holdUi.hidden = true;
        holdUi.innerHTML =
            '<button type="button" class="call-mic-hold-btn" aria-pressed="false"></button>' +
            '<div class="call-mic-hold-hint"></div>';
        document.body.appendChild(holdUi);
        const btn = holdUi.querySelector('.call-mic-hold-btn');
        function down(ev) {
            if (ev) {
                ev.preventDefault();
                ev.stopPropagation();
            }
            setTalking(true);
        }
        function up(ev) {
            if (ev) {
                ev.preventDefault();
                ev.stopPropagation();
            }
            setTalking(false);
        }
        btn.addEventListener('pointerdown', down);
        btn.addEventListener('pointerup', up);
        btn.addEventListener('pointercancel', up);
        btn.addEventListener('pointerleave', function () {
            if (talking) setTalking(false);
        });
        btn.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });
        return holdUi;
    }

    function showHoldUi() {
        const el = ensureHoldUi();
        el.hidden = false;
        syncHoldUi();
    }

    function hideHoldUi() {
        talking = false;
        if (holdUi) holdUi.hidden = true;
    }

    function onKeyDown(ev) {
        if (!activeCamId) return;
        if (ev.code !== 'Space' && ev.key !== ' ') return;
        const t = ev.target;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
        if (ev.repeat) return;
        ev.preventDefault();
        setTalking(true);
    }

    function onKeyUp(ev) {
        if (!activeCamId) return;
        if (ev.code !== 'Space' && ev.key !== ' ') return;
        ev.preventDefault();
        setTalking(false);
    }

    function bindKeys() {
        if (keysBound) return;
        keysBound = true;
        window.addEventListener('keydown', onKeyDown, true);
        window.addEventListener('keyup', onKeyUp, true);
        window.addEventListener('blur', function () { setTalking(false); });
    }

    function ensureMic() {
        if (!mic) {
            mic = createCallMic(function (alawFrame) {
                if (!socketRef || !activeCamId || !talking) return;
                socketRef.emit('call-audio', { camId: activeCamId }, alawFrame.buffer);
            });
        }
        return mic;
    }

    function bindSocket(socket) {
        socketRef = socket;
    }

    function start(camId) {
        if (!camId || !socketRef) return;
        activeCamId = camId;
        talking = false;
        bindKeys();
        showHoldUi();
        const m = ensureMic();
        if (m) {
            m.start().catch(function () {
                activeCamId = null;
                hideHoldUi();
            });
        }
    }

    function stop() {
        activeCamId = null;
        talking = false;
        hideHoldUi();
        if (mic) mic.stop();
    }

    global.CallMic = {
        bindSocket: bindSocket,
        start: start,
        stop: stop,
        isActive: function () { return !!activeCamId; },
        isTalking: function () { return !!talking; },
    };
})(window);
