/**
 * Browser voice alerts (TTS) — SOS / fall / geofence / optional SD record edges.
 * Listens in parallel to existing dashboard handlers; does not modify SOS or video logic.
 */
(function (global) {
    'use strict';

    var SESSION_MUTE_KEY = 'mobility_voice_session_mute';
    var SOS_DEDUPE_MS = 60000;
    var GEOFENCE_DEDUPE_MS = 60000;

    var policy = defaultPolicy();
    var socketRef = null;
    var sessionMuted = false;
    var speechUnlocked = false;
    var lastAlert = { text: '', key: '', at: 0 };
    var recByCam = Object.create(null);
    var sosSpokeAt = Object.create(null);
    var geofenceSpokeAt = Object.create(null);
    var frSpokeAt = Object.create(null);

    function defaultPolicy() {
        return {
            enabled: true,
            autoSpeak: true,
            speakSos: true,
            speakFall: true,
            speakGeofence: true,
            speakFrMatch: true,
            speakRecStart: false,
            speakRecStop: false,
            rate: 1.0,
            pitch: 1.0,
            volume: 1.0,
            voiceLang: '',
        };
    }

    function tr(key, params) {
        if (global.I18n && I18n.t) return I18n.t(key, params);
        return key;
    }

    function clampNum(v, min, max, fallback) {
        var n = parseFloat(v);
        if (!Number.isFinite(n)) return fallback;
        return Math.min(max, Math.max(min, n));
    }

    function normalizePolicy(inP) {
        var b = defaultPolicy();
        var p = inP || {};
        return {
            enabled: p.enabled != null ? !!p.enabled : b.enabled,
            autoSpeak: p.autoSpeak != null ? !!p.autoSpeak : b.autoSpeak,
            speakSos: p.speakSos != null ? !!p.speakSos : b.speakSos,
            speakFall: p.speakFall != null ? !!p.speakFall : b.speakFall,
            speakGeofence: p.speakGeofence != null ? !!p.speakGeofence : b.speakGeofence,
            speakFrMatch: p.speakFrMatch != null ? !!p.speakFrMatch : b.speakFrMatch,
            speakRecStart: p.speakRecStart != null ? !!p.speakRecStart : b.speakRecStart,
            speakRecStop: p.speakRecStop != null ? !!p.speakRecStop : b.speakRecStop,
            rate: clampNum(p.rate, 0.5, 2, b.rate),
            pitch: clampNum(p.pitch, 0.5, 2, b.pitch),
            volume: clampNum(p.volume, 0, 1, b.volume),
            voiceLang: String(p.voiceLang || '').trim(),
        };
    }

    function deviceName(camId) {
        if (global.FleetDisplay && FleetDisplay.friendlyDeviceName) {
            return FleetDisplay.friendlyDeviceName(camId);
        }
        return 'BWC #' + String(camId || '').slice(-4);
    }

    function sosSpeakLabel(camId) {
        var name = String(deviceName(camId) || '').trim();
        // Speak the friendly name directly when it is a natural name (letters and spaces only).
        // Handles short names like "KK" and longer names like "Chin" or "John".
        // Names containing digits or punctuation (e.g. "UB-6A5G") are treated as device IDs.
        if (name.length > 0 && /^[a-z\s]+$/i.test(name)) return name;
        var id = String(camId || '').trim();
        if (id.length >= 4) return 'unit ' + id.slice(-4);
        return name || 'BWC';
    }

    function isBlocked() {
        return !policy.enabled || sessionMuted;
    }

    /**
     * Preferred voice priority list — applied when no explicit language is set.
     * All SOS/fall alerts use this same voice regardless of which device triggered them.
     * First match wins. Add or reorder names here to change the unified alert voice.
     */
    var PREFERRED_VOICE_NAMES = [
        'microsoft aria',       // Windows 10/11 — natural neural female
        'microsoft jenny',      // Windows 11 neural female
        'microsoft zira',       // Windows 10 female (good quality)
        'google us english',    // Chrome built-in
        'samantha',             // macOS female
        'karen',                // macOS Australian female
        'victoria',             // macOS female
        'daniel',               // macOS male (fallback)
        'microsoft david',      // Windows 10 male (fallback)
    ];

    function pickVoice(langPref) {
        if (!global.speechSynthesis) return null;
        var voices = speechSynthesis.getVoices() || [];
        if (!voices.length) return null;

        // Honour an explicit language/voice preference from settings first.
        var pref = String(langPref || policy.voiceLang || '').trim().toLowerCase();
        if (pref) {
            var exact = voices.filter(function (v) {
                return String(v.lang || '').toLowerCase() === pref;
            });
            if (exact.length) return exact[0];
            var partial = voices.filter(function (v) {
                return String(v.lang || '').toLowerCase().indexOf(pref) === 0;
            });
            if (partial.length) return partial[0];
        }

        // No preference — try preferred voices in priority order so every alert
        // uses the same natural-sounding voice regardless of device name length.
        for (var pi = 0; pi < PREFERRED_VOICE_NAMES.length; pi++) {
            var target = PREFERRED_VOICE_NAMES[pi];
            for (var vi = 0; vi < voices.length; vi++) {
                if (String(voices[vi].name || '').toLowerCase().indexOf(target) !== -1) {
                    return voices[vi];
                }
            }
        }

        // Fall back: first English voice, then whatever the browser gives us.
        var enVoice = voices.filter(function (v) {
            return String(v.lang || '').toLowerCase().indexOf('en') === 0;
        });
        return enVoice.length ? enVoice[0] : voices[0];
    }

    function rememberAlert(text, key) {
        lastAlert = { text: text, key: key || text, at: Date.now() };
    }

    function speak(text, opts) {
        var line = String(text || '').trim();
        if (!line || isBlocked()) return false;
        if (!('speechSynthesis' in global)) return false;
        opts = opts || {};
        try {
            speechSynthesis.cancel();
            var u = new SpeechSynthesisUtterance(line);
            u.rate = opts.rate != null ? opts.rate : policy.rate;
            u.pitch = opts.pitch != null ? opts.pitch : policy.pitch;
            u.volume = opts.volume != null ? opts.volume : policy.volume;
            var voice = pickVoice(opts.lang || policy.voiceLang);
            if (voice) u.voice = voice;
            speechSynthesis.speak(u);
            if (opts.remember !== false) rememberAlert(line, opts.key);
            return true;
        } catch (_) {
            return false;
        }
    }

    function maybeUnlockSpeech() {
        speechUnlocked = true;
    }

    function shouldAutoSpeak() {
        return policy.enabled && policy.autoSpeak && speechUnlocked && !sessionMuted;
    }

    function onSosAlarm(data) {
        if (!data || !data.cameraId) return;
        if (data.replay) return;
        if (data.refresh && !data.fromLiveBye && !data.alreadyLive) return;
        var camId = String(data.cameraId).trim();
        var kind = data.alarmKind === 'fall' ? 'fall' : 'sos';
        if (kind === 'fall' && !policy.speakFall) return;
        if (kind === 'sos' && !policy.speakSos) return;
        var duringLive = !!(data.alreadyLive || data.fromLiveBye);
        var name = sosSpeakLabel(camId);
        var text = kind === 'fall'
            ? tr('voiceAlerts.phrase.fall', { name: name })
            : tr('voiceAlerts.phrase.sos', { name: name });

        function fireSpeak() {
            var t = Date.now();
            if (!duringLive && sosSpokeAt[camId] && t - sosSpokeAt[camId] < SOS_DEDUPE_MS) return;
            if (!shouldAutoSpeak()) return;
            if (speak(text, { key: kind + ':' + camId })) {
                sosSpokeAt[camId] = t;
            }
        }

        if (duringLive) setTimeout(fireSpeak, 450);
        else fireSpeak();
    }

    function onGeofenceBreach(data) {
        if (!data || !data.cameraId) return;
        if (!policy.speakGeofence) return;
        var camId = String(data.cameraId).trim();
        var t = Date.now();
        if (geofenceSpokeAt[camId] && t - geofenceSpokeAt[camId] < GEOFENCE_DEDUPE_MS) return;
        if (!shouldAutoSpeak()) return;
        var name = String(data.operatorName || '').trim() || deviceName(camId);
        var text = tr('voiceAlerts.phrase.geofence', { name: name });
        if (speak(text, { key: 'geofence:' + camId })) {
            geofenceSpokeAt[camId] = t;
        }
    }

    function onFrBlacklistHit(data) {
        if (!data || !data.displayName) return;
        if (policy.speakFrMatch === false) return;
        if (!shouldAutoSpeak()) return;
        var t = Date.now();
        var key = String(data.camId || '') + ':' + String(data.blacklistId || data.hitId || '');
        if (frSpokeAt[key] && t - frSpokeAt[key] < 40000) return;
        var text = tr('voiceAlerts.phrase.frMatch', {
            name: String(data.displayName || ''),
            score: String(Math.round(Number(data.scorePct) || 0)),
        });
        if (!text || text === 'voiceAlerts.phrase.frMatch') {
            text = 'Face match ' + String(data.displayName || '') + ', '
                + String(Math.round(Number(data.scorePct) || 0)) + ' percent';
        }
        if (speak(text, { key: 'fr:' + key })) {
            frSpokeAt[key] = t;
        }
    }

    function speakFrMatch(data) {
        onFrBlacklistHit(data || {});
    }

    function onDeviceStatus(data) {
        if (!data || !data.cameraId || data.recording == null) return;
        var camId = String(data.cameraId).trim();
        var next = data.recording === '1' || data.recording === 1 ? '1' : '0';
        var prev = recByCam[camId];
        recByCam[camId] = next;
        if (prev == null || prev === next) return;
        if (!shouldAutoSpeak()) return;
        var name = deviceName(camId);
        if (next === '1' && policy.speakRecStart) {
            speak(tr('voiceAlerts.phrase.recStart', { name: name }), { key: 'rec-start:' + camId });
        } else if (next === '0' && policy.speakRecStop) {
            speak(tr('voiceAlerts.phrase.recStop', { name: name }), { key: 'rec-stop:' + camId });
        }
    }

    function updateMuteButton() {
        var btn = document.getElementById('header-voice-mute');
        if (!btn) return;
        var muted = sessionMuted || !policy.enabled;
        btn.setAttribute('aria-pressed', muted ? 'true' : 'false');
        btn.title = muted
            ? tr('voiceAlerts.header.unmuteTitle')
            : tr('voiceAlerts.header.muteTitle');
        btn.textContent = muted ? '\uD83D\uDD07' : '\uD83D\uDD0A';
    }

    function setSessionMuted(muted) {
        sessionMuted = !!muted;
        try {
            sessionStorage.setItem(SESSION_MUTE_KEY, sessionMuted ? '1' : '0');
        } catch (_) { /* ignore */ }
        if (sessionMuted && global.speechSynthesis) {
            try { speechSynthesis.cancel(); } catch (_) { /* ignore */ }
        }
        updateMuteButton();
    }

    function repeatLast() {
        maybeUnlockSpeech();
        if (!lastAlert.text) return;
        speak(lastAlert.text, { key: lastAlert.key, remember: false });
    }

    function readServerForm() {
        var p = policy;
        return {
            enabled: !!(document.getElementById('ss-voice-enabled') && document.getElementById('ss-voice-enabled').checked),
            autoSpeak: !!(document.getElementById('ss-voice-auto') && document.getElementById('ss-voice-auto').checked),
            speakSos: !!(document.getElementById('ss-voice-sos') && document.getElementById('ss-voice-sos').checked),
            speakFall: !!(document.getElementById('ss-voice-fall') && document.getElementById('ss-voice-fall').checked),
            speakGeofence: !!(document.getElementById('ss-voice-geofence') && document.getElementById('ss-voice-geofence').checked),
            speakRecStart: !!(document.getElementById('ss-voice-rec-start') && document.getElementById('ss-voice-rec-start').checked),
            speakRecStop: !!(document.getElementById('ss-voice-rec-stop') && document.getElementById('ss-voice-rec-stop').checked),
            rate: p.rate,
            pitch: p.pitch,
            volume: p.volume,
            voiceLang: p.voiceLang,
        };
    }

    function applyServerForm(p) {
        policy = normalizePolicy(p);
        var map = [
            ['ss-voice-enabled', policy.enabled],
            ['ss-voice-auto', policy.autoSpeak],
            ['ss-voice-sos', policy.speakSos],
            ['ss-voice-fall', policy.speakFall],
            ['ss-voice-geofence', policy.speakGeofence],
            ['ss-voice-rec-start', policy.speakRecStart],
            ['ss-voice-rec-stop', policy.speakRecStop],
        ];
        map.forEach(function (pair) {
            var el = document.getElementById(pair[0]);
            if (el) el.checked = !!pair[1];
        });
        updateMuteButton();
        var readOnly = !(global.ServerSetup && ServerSetup.canManageServer && ServerSetup.canManageServer());
        [
            'ss-voice-enabled', 'ss-voice-auto', 'ss-voice-sos', 'ss-voice-fall', 'ss-voice-geofence',
            'ss-voice-rec-start', 'ss-voice-rec-stop', 'ss-save-voice-settings', 'ss-voice-test',
        ].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.disabled = readOnly;
        });
    }

    async function loadPolicy() {
        try {
            var res = await fetch('/api/voice-alerts-settings');
            var data = await res.json();
            if (res.ok && data.ok && data.voiceAlerts) {
                applyServerForm(data.voiceAlerts);
                return policy;
            }
        } catch (_) { /* ignore */ }
        applyServerForm(defaultPolicy());
        return policy;
    }

    async function savePolicyFromForm() {
        if (!(global.ServerSetup && ServerSetup.canManageServer && ServerSetup.canManageServer())) {
            alert(tr('voiceAlerts.config.adminRequired'));
            return;
        }
        var body = readServerForm();
        var res = await fetch('/api/voice-alerts-settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ voiceAlerts: body }),
        });
        var data = await res.json();
        if (!res.ok || !data.ok) throw new Error((data && data.error) || 'Save failed');
        applyServerForm(data.voiceAlerts || body);
        alert(tr('voiceAlerts.config.saved'));
    }

    function bindHeader() {
        var muteBtn = document.getElementById('header-voice-mute');
        var repeatBtn = document.getElementById('header-voice-repeat');
        if (muteBtn) {
            muteBtn.addEventListener('click', function () {
                maybeUnlockSpeech();
                setSessionMuted(!sessionMuted);
            });
        }
        if (repeatBtn) {
            repeatBtn.addEventListener('click', function () {
                repeatLast();
            });
        }
        try {
            setSessionMuted(sessionStorage.getItem(SESSION_MUTE_KEY) === '1');
        } catch (_) {
            updateMuteButton();
        }
    }

    function bindServerTab() {
        var saveBtn = document.getElementById('ss-save-voice-settings');
        var testBtn = document.getElementById('ss-voice-test');
        if (saveBtn) {
            saveBtn.addEventListener('click', function () {
                savePolicyFromForm().catch(function (err) {
                    alert(err.message || String(err));
                });
            });
        }
        if (testBtn) {
            testBtn.addEventListener('click', function () {
                maybeUnlockSpeech();
                var prev = policy;
                policy = normalizePolicy(readServerForm());
                speak(tr('voiceAlerts.phrase.test'), { key: 'test', remember: false });
                policy = prev;
            });
        }
        document.addEventListener('click', function () {
            maybeUnlockSpeech();
        }, { capture: true, passive: true });
    }

    function init(opts) {
        socketRef = (opts && opts.socket) || null;
        bindHeader();
        bindServerTab();
        loadPolicy().then(function () {
            updateMuteButton();
        });
        if (socketRef) {
            socketRef.on('sos-alarm', onSosAlarm);
            socketRef.on('geofence-breach', onGeofenceBreach);
            socketRef.on('fr-blacklist-hit', onFrBlacklistHit);
            socketRef.on('device-status', onDeviceStatus);
            socketRef.on('connect', function () {
                loadPolicy();
            });
        }
    }

    global.VoiceAlerts = {
        init: init,
        loadPolicy: loadPolicy,
        speak: speak,
        speakFrMatch: speakFrMatch,
        repeatLast: repeatLast,
        getPolicy: function () { return policy; },
    };
})(window);
