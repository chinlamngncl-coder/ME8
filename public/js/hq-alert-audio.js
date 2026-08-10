/**
 * HQ-ALERT-AUDIO-V1 — shared desk alert tones (FR / ANPR / Weapon / SOS).
 * Respects header session mute (same key as voice). Prefs in localStorage.
 */
(function (global) {
    'use strict';

    var PREFS_KEY = 'hq-alert-audio-prefs-v1';
    var SESSION_MUTE_KEY = 'mobility_voice_session_mute';
    var DEDUPE_MS = 900;
    var prefs = defaultPrefs();
    var ctx = null;
    var unlocked = false;
    var lastPlay = Object.create(null);
    var bound = false;

    function defaultPrefs() {
        return {
            enabled: true,
            fr: true,
            anpr: true,
            weapon: true,
            sos: true,
            volume: 0.7,
        };
    }

    function tr(key, fallback) {
        try {
            if (global.I18n && typeof I18n.t === 'function') {
                var v = I18n.t(key);
                if (v && v !== key) return v;
            }
        } catch (_) { /* ignore */ }
        return fallback != null ? fallback : key;
    }

    function clampVol(v) {
        var n = parseFloat(v);
        if (!Number.isFinite(n)) return 0.7;
        return Math.min(1, Math.max(0, n));
    }

    function normalizePrefs(inP) {
        var b = defaultPrefs();
        var p = inP || {};
        return {
            enabled: p.enabled != null ? !!p.enabled : b.enabled,
            fr: p.fr != null ? !!p.fr : b.fr,
            anpr: p.anpr != null ? !!p.anpr : b.anpr,
            weapon: p.weapon != null ? !!p.weapon : b.weapon,
            sos: p.sos != null ? !!p.sos : b.sos,
            volume: clampVol(p.volume != null ? p.volume : b.volume),
        };
    }

    function loadPrefs() {
        try {
            var raw = global.localStorage && localStorage.getItem(PREFS_KEY);
            if (raw) prefs = normalizePrefs(JSON.parse(raw));
            else prefs = defaultPrefs();
        } catch (_) {
            prefs = defaultPrefs();
        }
        return prefs;
    }

    function savePrefs(next) {
        prefs = normalizePrefs(next || prefs);
        try {
            if (global.localStorage) localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
        } catch (_) { /* ignore */ }
        return prefs;
    }

    function sessionMuted() {
        try {
            if (global.VoiceAlerts && typeof VoiceAlerts.isSessionMuted === 'function') {
                return !!VoiceAlerts.isSessionMuted();
            }
        } catch (_) { /* ignore */ }
        try {
            return !!(global.sessionStorage && sessionStorage.getItem(SESSION_MUTE_KEY) === '1');
        } catch (_) {
            return false;
        }
    }

    function kindEnabled(kind) {
        var k = String(kind || '').toLowerCase();
        if (k === 'fall') k = 'sos';
        if (!prefs.enabled) return false;
        if (k === 'fr') return !!prefs.fr;
        if (k === 'anpr') return !!prefs.anpr;
        if (k === 'weapon') return !!prefs.weapon;
        if (k === 'sos') return !!prefs.sos;
        return false;
    }

    function ensureCtx() {
        var Ctx = global.AudioContext || global.webkitAudioContext;
        if (!Ctx) return null;
        if (!ctx) ctx = new Ctx();
        if (ctx.state === 'suspended' && unlocked) {
            try { ctx.resume(); } catch (_) { /* ignore */ }
        }
        return ctx;
    }

    function unlock() {
        unlocked = true;
        var c = ensureCtx();
        if (c && c.state === 'suspended') {
            try { c.resume(); } catch (_) { /* ignore */ }
        }
    }

    function tone(freq, dur, gainPeak) {
        var c = ensureCtx();
        if (!c) return;
        var o = c.createOscillator();
        var g = c.createGain();
        o.type = 'sine';
        o.frequency.value = freq;
        g.gain.value = 0.0001;
        o.connect(g);
        g.connect(c.destination);
        var t = c.currentTime;
        var peak = Math.max(0.0001, (gainPeak || 0.16) * prefs.volume);
        g.gain.exponentialRampToValueAtTime(peak, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.start(t);
        o.stop(t + dur + 0.02);
    }

    function playPattern(kind, tier) {
        var k = String(kind || '').toLowerCase();
        var t = String(tier || '').toLowerCase();
        /* SOS-ALERT-AUDIO-RELIABLE-V1 — longer attention; short tail after speech */
        if (k === 'sos' || k === 'fall') {
            if (t === 'tail') {
                tone(880, 0.2, 0.14);
                setTimeout(function () { tone(660, 0.28, 0.12); }, 200);
                return;
            }
            tone(660, 0.18, 0.22);
            setTimeout(function () { tone(990, 0.2, 0.2); }, 160);
            setTimeout(function () { tone(660, 0.18, 0.18); }, 520);
            setTimeout(function () { tone(990, 0.22, 0.2); }, 700);
            setTimeout(function () { tone(740, 0.3, 0.16); }, 1150);
            return;
        }
        if (k === 'weapon') {
            tone(740, 0.14, 0.18);
            setTimeout(function () { tone(520, 0.2, 0.16); }, 120);
            return;
        }
        if (t === 'soft' || t === 'medium') {
            tone(620, 0.16, 0.08);
            return;
        }
        /* fr / anpr strong */
        tone(880, 0.28, 0.18);
    }

    /**
     * @param {string} kind fr|anpr|weapon|sos|fall
     * @param {{ tier?: string, key?: string }} [opts]
     */
    function play(kind, opts) {
        opts = opts || {};
        loadPrefs();
        if (sessionMuted()) return false;
        if (!kindEnabled(kind)) return false;
        var tier = opts.tier || 'strong';
        if (tier === 'silent' || tier === 'low') return false;
        var key = String(kind) + ':' + String(opts.key || tier);
        var now = Date.now();
        if (lastPlay[key] && now - lastPlay[key] < DEDUPE_MS) return false;
        lastPlay[key] = now;
        try {
            playPattern(kind, tier);
            return true;
        } catch (_) {
            return false;
        }
    }

    function readForm() {
        return normalizePrefs({
            enabled: !!(document.getElementById('ss-hq-tone-enabled') && document.getElementById('ss-hq-tone-enabled').checked),
            fr: !!(document.getElementById('ss-hq-tone-fr') && document.getElementById('ss-hq-tone-fr').checked),
            anpr: !!(document.getElementById('ss-hq-tone-anpr') && document.getElementById('ss-hq-tone-anpr').checked),
            weapon: !!(document.getElementById('ss-hq-tone-weapon') && document.getElementById('ss-hq-tone-weapon').checked),
            sos: !!(document.getElementById('ss-hq-tone-sos') && document.getElementById('ss-hq-tone-sos').checked),
            volume: prefs.volume,
        });
    }

    function applyForm(p) {
        p = normalizePrefs(p);
        var map = [
            ['ss-hq-tone-enabled', p.enabled],
            ['ss-hq-tone-fr', p.fr],
            ['ss-hq-tone-anpr', p.anpr],
            ['ss-hq-tone-weapon', p.weapon],
            ['ss-hq-tone-sos', p.sos],
        ];
        for (var i = 0; i < map.length; i++) {
            var el = document.getElementById(map[i][0]);
            if (el) el.checked = !!map[i][1];
        }
    }

    function bindUi() {
        if (bound) return;
        bound = true;
        loadPrefs();
        applyForm(prefs);
        var saveBtn = document.getElementById('ss-hq-tone-save');
        var testBtn = document.getElementById('ss-hq-tone-test');
        if (saveBtn) {
            saveBtn.addEventListener('click', function () {
                unlock();
                savePrefs(readForm());
                applyForm(prefs);
                try {
                    if (global.OperatorUi && OperatorUi.flash) {
                        OperatorUi.flash(tr('hqAlertAudio.saved', 'Alert tones saved'));
                    }
                } catch (_) { /* ignore */ }
            });
        }
        if (testBtn) {
            testBtn.addEventListener('click', function () {
                unlock();
                var prev = prefs;
                prefs = readForm();
                play('weapon', { tier: 'strong', key: 'test-' + Date.now() });
                prefs = prev;
            });
        }
        document.addEventListener('click', unlock, { capture: true, passive: true });
    }

    function boot() {
        loadPrefs();
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', bindUi);
        } else {
            bindUi();
        }
    }

    boot();

    global.HqAlertAudio = {
        play: play,
        loadPrefs: loadPrefs,
        savePrefs: savePrefs,
        getPrefs: function () { return normalizePrefs(prefs); },
        unlock: unlock,
        bindUi: bindUi,
    };
})(typeof window !== 'undefined' ? window : global);
