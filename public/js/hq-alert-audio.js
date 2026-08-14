/**
 * HQ-ALERT-AUDIO + PRESETS-HOLD + CUSTOM-TONE-FILES-V1
 * Desk alert tones (FR / ANPR / Weapon / SOS). Prefs localStorage + site custom files.
 */
(function (global) {
    'use strict';

    var PREFS_KEY = 'hq-alert-audio-prefs-v1';
    var SESSION_MUTE_KEY = 'mobility_voice_session_mute';
    var DEDUPE_MS = 900;
    var PRESETS = ['urgent', 'classic', 'pulse', 'soft'];
    var HOLD_ALLOWED = [5, 8, 10];
    var prefs = defaultPrefs();
    var ctx = null;
    var unlocked = false;
    var lastPlay = Object.create(null);
    var bound = false;
    var holdToken = 0;
    var holdInterval = null;
    var holdStopTimer = null;
    var holdAudio = null;
    var serverTones = {
        sosMode: 'default',
        analyticsMode: 'default',
        sosHasFile: false,
        analyticsHasFile: false,
        sosOriginalName: '',
        analyticsOriginalName: '',
    };
    var pendingFiles = { sos: null, analytics: null };
    var pendingClear = { sos: false, analytics: false };
    var pendingObjectUrl = { sos: null, analytics: null };
    var uiModes = { sos: 'default', analytics: 'default' };

    function defaultPrefs() {
        return {
            enabled: true,
            fr: true,
            anpr: true,
            weapon: true,
            sos: true,
            volume: 0.7,
            sosPreset: 'urgent',
            analyticsPreset: 'classic',
            holdSec: 8,
            sosMode: 'default',
            analyticsMode: 'default',
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

    function normPreset(id, fallback) {
        var s = String(id || '').toLowerCase();
        return PRESETS.indexOf(s) >= 0 ? s : fallback;
    }

    function clampHoldSec(v) {
        var n = parseInt(v, 10);
        if (HOLD_ALLOWED.indexOf(n) >= 0) return n;
        return 8;
    }

    function normMode(m) {
        return String(m || '').toLowerCase() === 'custom' ? 'custom' : 'default';
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
            sosPreset: normPreset(p.sosPreset, b.sosPreset),
            analyticsPreset: normPreset(p.analyticsPreset, b.analyticsPreset),
            holdSec: clampHoldSec(p.holdSec != null ? p.holdSec : b.holdSec),
            sosMode: normMode(p.sosMode != null ? p.sosMode : b.sosMode),
            analyticsMode: normMode(p.analyticsMode != null ? p.analyticsMode : b.analyticsMode),
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

    function familyForKind(kind) {
        var k = String(kind || '').toLowerCase();
        if (k === 'sos' || k === 'fall') return 'sos';
        return 'analytics';
    }

    function presetForKind(kind) {
        var fam = familyForKind(kind);
        if (fam === 'sos') return prefs.sosPreset || 'urgent';
        return prefs.analyticsPreset || 'classic';
    }

    function modeForFamily(fam, form) {
        var p = form || prefs;
        if (fam === 'sos') return normMode(uiModes.sos || p.sosMode);
        return normMode(uiModes.analytics || p.analyticsMode);
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

    function playPresetBurst(presetId, mode) {
        var id = normPreset(presetId, 'classic');
        var pulse = String(mode || '') === 'pulse';
        if (id === 'urgent') {
            if (pulse) {
                tone(990, 0.12, 0.2);
                setTimeout(function () { tone(660, 0.14, 0.16); }, 140);
                return;
            }
            tone(660, 0.16, 0.24);
            setTimeout(function () { tone(990, 0.18, 0.22); }, 140);
            setTimeout(function () { tone(660, 0.16, 0.2); }, 480);
            setTimeout(function () { tone(1100, 0.22, 0.2); }, 680);
            setTimeout(function () { tone(740, 0.28, 0.16); }, 1100);
            return;
        }
        if (id === 'pulse') {
            if (pulse) {
                tone(700, 0.1, 0.16);
                setTimeout(function () { tone(700, 0.1, 0.14); }, 180);
                return;
            }
            tone(700, 0.1, 0.18);
            setTimeout(function () { tone(700, 0.1, 0.16); }, 160);
            setTimeout(function () { tone(700, 0.1, 0.16); }, 320);
            setTimeout(function () { tone(700, 0.14, 0.14); }, 520);
            setTimeout(function () { tone(920, 0.2, 0.14); }, 900);
            return;
        }
        if (id === 'soft') {
            if (pulse) {
                tone(620, 0.14, 0.08);
                return;
            }
            tone(620, 0.18, 0.1);
            setTimeout(function () { tone(540, 0.22, 0.08); }, 220);
            return;
        }
        if (pulse) {
            tone(880, 0.12, 0.16);
            setTimeout(function () { tone(660, 0.16, 0.12); }, 160);
            return;
        }
        tone(660, 0.18, 0.2);
        setTimeout(function () { tone(990, 0.2, 0.18); }, 160);
        setTimeout(function () { tone(660, 0.18, 0.16); }, 520);
        setTimeout(function () { tone(990, 0.22, 0.18); }, 700);
        setTimeout(function () { tone(740, 0.28, 0.14); }, 1150);
    }

    function revokePendingUrl(slot) {
        if (pendingObjectUrl[slot]) {
            try { URL.revokeObjectURL(pendingObjectUrl[slot]); } catch (_) { /* ignore */ }
            pendingObjectUrl[slot] = null;
        }
    }

    function customSrcForFamily(fam, allowPending) {
        if (allowPending && pendingFiles[fam]) {
            revokePendingUrl(fam);
            pendingObjectUrl[fam] = URL.createObjectURL(pendingFiles[fam]);
            return pendingObjectUrl[fam];
        }
        if (pendingClear[fam]) return null;
        var has = fam === 'sos' ? serverTones.sosHasFile : serverTones.analyticsHasFile;
        if (!has) return null;
        return '/api/hq-alert-tones/file/' + fam + '?t=' + encodeURIComponent(String(serverTones.updatedAt || Date.now()));
    }

    function useCustomForKind(kind, form) {
        var fam = familyForKind(kind);
        if (modeForFamily(fam, form) !== 'custom') return false;
        return !!(customSrcForFamily(fam, true) || customSrcForFamily(fam, false));
    }

    function playCustomOnce(src) {
        return new Promise(function (resolve) {
            try {
                var a = new Audio(src);
                a.volume = Math.min(1, Math.max(0.05, prefs.volume));
                a.onended = function () { resolve(true); };
                a.onerror = function () { resolve(false); };
                var p = a.play();
                if (p && typeof p.then === 'function') {
                    p.catch(function () { resolve(false); });
                }
            } catch (_) {
                resolve(false);
            }
        });
    }

    function stopHoldAudio() {
        if (holdAudio) {
            try { holdAudio.pause(); } catch (_) { /* ignore */ }
            try { holdAudio.src = ''; } catch (_) { /* ignore */ }
            holdAudio = null;
        }
    }

    function stopHold() {
        holdToken += 1;
        if (holdInterval) {
            try { clearInterval(holdInterval); } catch (_) { /* ignore */ }
            holdInterval = null;
        }
        if (holdStopTimer) {
            try { clearTimeout(holdStopTimer); } catch (_) { /* ignore */ }
            holdStopTimer = null;
        }
        stopHoldAudio();
    }

    function startHold(kind) {
        loadPrefs();
        if (sessionMuted()) return false;
        if (!kindEnabled(kind)) return false;
        stopHold();
        var my = holdToken;
        var form = prefs;
        var fam = familyForKind(kind);
        var ms = clampHoldSec(prefs.holdSec) * 1000;
        var custom = useCustomForKind(kind, form);
        var src = custom ? customSrcForFamily(fam, true) : null;

        if (custom && src) {
            try {
                holdAudio = new Audio(src);
                holdAudio.loop = true;
                holdAudio.volume = Math.min(1, Math.max(0.05, prefs.volume));
                holdAudio.play().catch(function () { /* ignore */ });
            } catch (_) { /* ignore */ }
            holdStopTimer = setTimeout(function () {
                if (my === holdToken) stopHold();
            }, ms);
            return true;
        }

        var preset = presetForKind(kind);
        var tickMs = preset === 'soft' ? 1100 : 850;
        function tick() {
            if (my !== holdToken) return;
            if (sessionMuted() || !prefs.enabled) {
                stopHold();
                return;
            }
            try { playPresetBurst(preset, 'pulse'); } catch (_) { /* ignore */ }
        }
        tick();
        holdInterval = setInterval(tick, tickMs);
        holdStopTimer = setTimeout(function () {
            if (my === holdToken) stopHold();
        }, ms);
        return true;
    }

    function playAttention(kind, form) {
        var fam = familyForKind(kind);
        if (useCustomForKind(kind, form)) {
            var src = customSrcForFamily(fam, true);
            if (src) {
                playCustomOnce(src);
                return true;
            }
        }
        playPresetBurst(presetForKind(kind), 'attn');
        return true;
    }

    function play(kind, opts) {
        opts = opts || {};
        loadPrefs();
        if (sessionMuted()) return false;
        if (!kindEnabled(kind)) return false;
        var tier = String(opts.tier || 'strong').toLowerCase();
        if (tier === 'silent' || tier === 'low') return false;
        var key = String(kind) + ':' + String(opts.key || tier);
        var now = Date.now();
        if (lastPlay[key] && now - lastPlay[key] < DEDUPE_MS) return false;
        lastPlay[key] = now;
        try {
            if (tier === 'hold' || opts.hold || tier === 'tail') {
                return startHold(kind);
            }
            if (tier === 'soft' || tier === 'medium') {
                if (useCustomForKind(kind, prefs)) {
                    playAttention(kind, prefs);
                } else {
                    playPresetBurst('soft', 'attn');
                }
                return true;
            }
            playAttention(kind, prefs);
            if (!opts.noHold) {
                var k = String(kind || '').toLowerCase();
                if (k !== 'sos' && k !== 'fall') {
                    setTimeout(function () { startHold(kind); }, 1200);
                }
            }
            return true;
        } catch (_) {
            return false;
        }
    }

    function previewFamily(which) {
        unlock();
        loadPrefs();
        var form = readForm();
        prefs = form;
        var kind = which === 'sos' ? 'sos' : 'weapon';
        playAttention(kind, form);
        setTimeout(function () { startHold(kind); }, 400);
    }

    function setModeUi(slot, mode) {
        uiModes[slot] = normMode(mode);
        document.querySelectorAll('.ss-hq-tone-mode[data-slot="' + slot + '"]').forEach(function (btn) {
            var on = btn.getAttribute('data-mode') === uiModes[slot];
            btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        var wrap = document.getElementById(slot === 'sos' ? 'ss-hq-tone-sos-file-wrap' : 'ss-hq-tone-analytics-file-wrap');
        if (wrap) wrap.hidden = uiModes[slot] !== 'custom';
        updateFileNameLabel(slot);
    }

    function updateFileNameLabel(slot) {
        var el = document.getElementById(slot === 'sos' ? 'ss-hq-tone-sos-file-name' : 'ss-hq-tone-analytics-file-name');
        if (!el) return;
        if (pendingFiles[slot]) {
            el.textContent = pendingFiles[slot].name + ' (' + tr('hqAlertAudio.pendingSave', 'pending save') + ')';
            return;
        }
        if (pendingClear[slot]) {
            el.textContent = tr('hqAlertAudio.willClear', 'Will clear on save');
            return;
        }
        var name = slot === 'sos' ? serverTones.sosOriginalName : serverTones.analyticsOriginalName;
        var has = slot === 'sos' ? serverTones.sosHasFile : serverTones.analyticsHasFile;
        el.textContent = has && name ? name : (has ? tr('hqAlertAudio.customOnServer', 'Custom file on server') : '');
    }

    function readForm() {
        var sosEl = document.getElementById('ss-hq-tone-sos-preset');
        var anEl = document.getElementById('ss-hq-tone-analytics-preset');
        var holdEl = document.getElementById('ss-hq-tone-hold-sec');
        return normalizePrefs({
            enabled: !!(document.getElementById('ss-hq-tone-enabled') && document.getElementById('ss-hq-tone-enabled').checked),
            fr: !!(document.getElementById('ss-hq-tone-fr') && document.getElementById('ss-hq-tone-fr').checked),
            anpr: !!(document.getElementById('ss-hq-tone-anpr') && document.getElementById('ss-hq-tone-anpr').checked),
            weapon: !!(document.getElementById('ss-hq-tone-weapon') && document.getElementById('ss-hq-tone-weapon').checked),
            sos: !!(document.getElementById('ss-hq-tone-sos') && document.getElementById('ss-hq-tone-sos').checked),
            volume: prefs.volume,
            sosPreset: sosEl ? sosEl.value : prefs.sosPreset,
            analyticsPreset: anEl ? anEl.value : prefs.analyticsPreset,
            holdSec: holdEl ? holdEl.value : prefs.holdSec,
            sosMode: uiModes.sos,
            analyticsMode: uiModes.analytics,
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
        var sosEl = document.getElementById('ss-hq-tone-sos-preset');
        var anEl = document.getElementById('ss-hq-tone-analytics-preset');
        var holdEl = document.getElementById('ss-hq-tone-hold-sec');
        if (sosEl) sosEl.value = p.sosPreset;
        if (anEl) anEl.value = p.analyticsPreset;
        if (holdEl) holdEl.value = String(p.holdSec);
        setModeUi('sos', p.sosMode);
        setModeUi('analytics', p.analyticsMode);
    }

    function applyServerTones(t) {
        serverTones = {
            sosMode: normMode(t && t.sosMode),
            analyticsMode: normMode(t && t.analyticsMode),
            sosHasFile: !!(t && t.sosHasFile),
            analyticsHasFile: !!(t && t.analyticsHasFile),
            sosOriginalName: (t && t.sosOriginalName) || '',
            analyticsOriginalName: (t && t.analyticsOriginalName) || '',
            updatedAt: (t && t.updatedAt) || null,
        };
        if (!pendingFiles.sos && !pendingClear.sos) uiModes.sos = serverTones.sosMode;
        if (!pendingFiles.analytics && !pendingClear.analytics) uiModes.analytics = serverTones.analyticsMode;
        setModeUi('sos', uiModes.sos);
        setModeUi('analytics', uiModes.analytics);
    }

    async function fetchServerTones() {
        try {
            var res = await fetch('/api/hq-alert-tones', { credentials: 'same-origin' });
            var data = await res.json();
            if (res.ok && data.ok && data.tones) applyServerTones(data.tones);
        } catch (_) { /* ignore */ }
    }

    async function uploadSlot(slot, file) {
        var fd = new FormData();
        fd.append('file', file);
        var res = await fetch('/api/hq-alert-tones/upload/' + slot, {
            method: 'POST',
            credentials: 'same-origin',
            body: fd,
        });
        var data = await res.json().catch(function () { return {}; });
        if (!res.ok || !data.ok) throw new Error((data && data.error) || 'Upload failed');
        return data.tones;
    }

    async function saveAll() {
        unlock();
        stopHold();
        var form = readForm();
        var slots = ['sos', 'analytics'];
        for (var i = 0; i < slots.length; i++) {
            var slot = slots[i];
            if (pendingClear[slot]) {
                var del = await fetch('/api/hq-alert-tones/' + slot, {
                    method: 'DELETE',
                    credentials: 'same-origin',
                });
                var delData = await del.json().catch(function () { return {}; });
                if (!del.ok || !delData.ok) throw new Error((delData && delData.error) || 'Clear failed');
                pendingClear[slot] = false;
                revokePendingUrl(slot);
                pendingFiles[slot] = null;
                if (delData.tones) applyServerTones(delData.tones);
            }
            if (pendingFiles[slot]) {
                var tones = await uploadSlot(slot, pendingFiles[slot]);
                revokePendingUrl(slot);
                pendingFiles[slot] = null;
                var inp = document.getElementById(slot === 'sos' ? 'ss-hq-tone-sos-file' : 'ss-hq-tone-analytics-file');
                if (inp) inp.value = '';
                if (tones) applyServerTones(tones);
            }
        }
        var modeRes = await fetch('/api/hq-alert-tones/modes', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sosMode: form.sosMode, analyticsMode: form.analyticsMode }),
        });
        var modeData = await modeRes.json().catch(function () { return {}; });
        if (!modeRes.ok || !modeData.ok) throw new Error((modeData && modeData.error) || 'Save modes failed');
        if (modeData.tones) applyServerTones(modeData.tones);
        form.sosMode = serverTones.sosMode;
        form.analyticsMode = serverTones.analyticsMode;
        savePrefs(form);
        applyForm(prefs);
        try {
            if (global.OperatorUi && OperatorUi.flash) {
                OperatorUi.flash(tr('hqAlertAudio.saved', 'Alert tones saved'));
            }
        } catch (_) { /* ignore */ }
    }

    function bindUi() {
        if (bound) return;
        bound = true;
        loadPrefs();
        applyForm(prefs);
        fetchServerTones().then(function () {
            prefs.sosMode = serverTones.sosMode;
            prefs.analyticsMode = serverTones.analyticsMode;
            applyForm(prefs);
        });

        document.querySelectorAll('.ss-hq-tone-mode').forEach(function (btn) {
            btn.addEventListener('click', function () {
                setModeUi(btn.getAttribute('data-slot'), btn.getAttribute('data-mode'));
            });
        });

        ['sos', 'analytics'].forEach(function (slot) {
            var input = document.getElementById(slot === 'sos' ? 'ss-hq-tone-sos-file' : 'ss-hq-tone-analytics-file');
            var clearBtn = document.getElementById(slot === 'sos' ? 'ss-hq-tone-sos-clear' : 'ss-hq-tone-analytics-clear');
            if (input) {
                input.addEventListener('change', function () {
                    var f = input.files && input.files[0];
                    if (!f) return;
                    if (f.size > 500 * 1024) {
                        alert(tr('hqAlertAudio.fileTooLarge', 'Tone file too large (max 500 KB)'));
                        input.value = '';
                        return;
                    }
                    pendingFiles[slot] = f;
                    pendingClear[slot] = false;
                    setModeUi(slot, 'custom');
                    updateFileNameLabel(slot);
                });
            }
            if (clearBtn) {
                clearBtn.addEventListener('click', function () {
                    pendingFiles[slot] = null;
                    revokePendingUrl(slot);
                    pendingClear[slot] = true;
                    var inp = document.getElementById(slot === 'sos' ? 'ss-hq-tone-sos-file' : 'ss-hq-tone-analytics-file');
                    if (inp) inp.value = '';
                    updateFileNameLabel(slot);
                });
            }
        });

        var saveBtn = document.getElementById('ss-hq-tone-save');
        var testBtn = document.getElementById('ss-hq-tone-test');
        var prevSos = document.getElementById('ss-hq-tone-preview-sos');
        var prevAn = document.getElementById('ss-hq-tone-preview-analytics');
        if (saveBtn) {
            saveBtn.addEventListener('click', function () {
                saveAll().catch(function (err) {
                    alert(err.message || String(err));
                });
            });
        }
        if (testBtn) {
            testBtn.addEventListener('click', function () {
                unlock();
                var prev = prefs;
                prefs = readForm();
                play('weapon', { tier: 'strong', key: 'test-' + Date.now(), noHold: true });
                setTimeout(function () { startHold('weapon'); }, 400);
                prefs = prev;
            });
        }
        if (prevSos) prevSos.addEventListener('click', function () { previewFamily('sos'); });
        if (prevAn) prevAn.addEventListener('click', function () { previewFamily('analytics'); });
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
        startHold: startHold,
        stopHold: stopHold,
        loadPrefs: loadPrefs,
        savePrefs: savePrefs,
        getPrefs: function () { return normalizePrefs(prefs); },
        unlock: unlock,
        bindUi: bindUi,
        presets: PRESETS.slice(),
        refreshServerTones: fetchServerTones,
    };
})(typeof window !== 'undefined' ? window : global);
