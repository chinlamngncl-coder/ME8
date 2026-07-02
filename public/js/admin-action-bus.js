/**
 * Single in-flight lock for Settings → Server Config / lifecycle admin opens.
 * Shows Opening… / Loading… — does not touch server auth or API load paths.
 */
(function (global) {
    'use strict';

    var busy = false;
    var lifecycleLabels = new WeakMap();
    var toastTimer = null;

    function tr(key, params) {
        if (global.I18n && I18n.t) return I18n.t(key, params);
        return key;
    }

    function toast(message, ms) {
        var el = document.getElementById('admin-action-toast');
        if (!el || !message) return;
        el.textContent = message;
        el.hidden = false;
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(function () {
            el.hidden = true;
        }, ms != null ? ms : 4200);
    }

    function setLifecycleBusy(on, sourceBtn) {
        document.querySelectorAll('.settings-lifecycle-open').forEach(function (btn) {
            if (on) {
                if (!lifecycleLabels.has(btn)) lifecycleLabels.set(btn, btn.textContent);
                btn.disabled = true;
                if (sourceBtn && btn === sourceBtn) {
                    btn.textContent = tr('adminAction.opening');
                }
            } else {
                btn.disabled = false;
                if (lifecycleLabels.has(btn)) btn.textContent = lifecycleLabels.get(btn);
            }
        });
        var setupBtn = document.getElementById('server-setup-open');
        if (setupBtn) {
            if (on) {
                if (!lifecycleLabels.has(setupBtn)) lifecycleLabels.set(setupBtn, setupBtn.textContent);
                setupBtn.disabled = true;
                if (sourceBtn && setupBtn === sourceBtn) {
                    setupBtn.textContent = tr('adminAction.opening');
                }
            } else {
                setupBtn.disabled = false;
                if (lifecycleLabels.has(setupBtn)) setupBtn.textContent = lifecycleLabels.get(setupBtn);
            }
        }
    }

    function setConfigLoading(on) {
        var bar = document.getElementById('ss-config-loading');
        if (!bar) return;
        bar.hidden = !on;
        if (on) bar.textContent = tr('adminAction.loadingConfig');
    }

    function isBusy() {
        return busy;
    }

    function begin(opts) {
        opts = opts || {};
        if (busy) {
            if (opts.toastOnBusy !== false) toast(tr('adminAction.wait'));
            focusOpenGate();
            return false;
        }
        busy = true;
        setLifecycleBusy(true, opts.sourceBtn || null);
        return true;
    }

    function end() {
        if (!busy) return;
        busy = false;
        setLifecycleBusy(false);
        setConfigLoading(false);
    }

    function focusOpenGate() {
        if (global.AuthReverify && AuthReverify.isPromptOpen && AuthReverify.isPromptOpen()) {
            var passEl = document.getElementById('ss-gate-password');
            if (passEl) passEl.focus();
            return;
        }
        var techPin = document.getElementById('ss-tech-gate-pin');
        var techBd = document.getElementById('ss-tech-gate-backdrop');
        if (techBd && !techBd.hidden && techPin) techPin.focus();
    }

    function waitForServerSetup(maxMs) {
        return new Promise(function (resolve) {
            if (global.ServerSetup && ServerSetup.openConfigTab) return resolve(true);
            var deadline = Date.now() + (maxMs || 12000);
            (function poll() {
                if (global.ServerSetup && ServerSetup.openConfigTab) return resolve(true);
                if (Date.now() >= deadline) return resolve(false);
                setTimeout(poll, 40);
            })();
        });
    }

    global.AdminActionBus = {
        begin: begin,
        end: end,
        isBusy: isBusy,
        toast: toast,
        setConfigLoading: setConfigLoading,
        waitForServerSetup: waitForServerSetup,
        focusOpenGate: focusOpenGate,
    };
}(window));
