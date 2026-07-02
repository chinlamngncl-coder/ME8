(function (global) {
    'use strict';

    var TOKEN_KEY = 'me8_reverify_token';
    var EXPIRES_KEY = 'me8_reverify_expires';
    var UNLOCK_KEY = 'ss_config_unlocked_at';
    var BUFFER_MS = 5000;
    var promptActive = false;

    function tr(key) {
        return (global.I18n && I18n.t) ? I18n.t(key) : key;
    }

    function isValid() {
        try {
            var exp = parseInt(sessionStorage.getItem(EXPIRES_KEY) || '0', 10);
            var tok = sessionStorage.getItem(TOKEN_KEY);
            return !!(tok && exp > (Date.now() + BUFFER_MS));
        } catch (_) {
            return false;
        }
    }

    function applyResponse(data) {
        if (data && data.reverifyToken && data.expiresAt) {
            sessionStorage.setItem(TOKEN_KEY, data.reverifyToken);
            sessionStorage.setItem(EXPIRES_KEY, String(data.expiresAt));
        }
        try {
            sessionStorage.setItem(UNLOCK_KEY, String(Date.now()));
        } catch (_) { /* ignore */ }
    }

    function clear() {
        try {
            sessionStorage.removeItem(TOKEN_KEY);
            sessionStorage.removeItem(EXPIRES_KEY);
            sessionStorage.removeItem(UNLOCK_KEY);
        } catch (_) { /* ignore */ }
    }

    function attachBody(body) {
        var next = Object.assign({}, body || {});
        if (isValid()) next.reverifyToken = sessionStorage.getItem(TOKEN_KEY);
        return next;
    }

    function setModalA11y(show, busy) {
        var backdrop = document.getElementById('ss-gate-backdrop');
        if (!backdrop) return;
        if ('inert' in backdrop) backdrop.inert = !show;
        backdrop.setAttribute('aria-hidden', show ? 'false' : 'true');
        backdrop.querySelectorAll('input[type="password"]').forEach(function (inp) {
            inp.tabIndex = show ? 0 : -1;
            inp.disabled = !show || !!busy;
        });
    }

    function isPromptOpen() {
        var backdrop = document.getElementById('ss-gate-backdrop');
        return !!(backdrop && !backdrop.hidden);
    }

    function dismissGate() {
        var backdrop = document.getElementById('ss-gate-backdrop');
        var passEl = document.getElementById('ss-gate-password');
        promptActive = false;
        if (passEl) passEl.onkeydown = null;
        if (backdrop) backdrop.hidden = true;
        setModalA11y(false);
        var dashHint = document.getElementById('ss-gate-diagnostics-hint');
        var techHint = document.getElementById('ss-tech-gate-step-hint');
        if (dashHint) dashHint.hidden = true;
        if (techHint) techHint.hidden = true;
        if (global.AdminActionBus && AdminActionBus.isBusy()) AdminActionBus.end();
    }

    function promptModal() {
        if (isValid()) return Promise.resolve(attachBody({}));
        if (promptActive && isPromptOpen()) {
            var passEl = document.getElementById('ss-gate-password');
            if (passEl) passEl.focus();
            return Promise.reject(new Error('cancelled'));
        }
        if (promptActive) {
            dismissGate();
        }
        return new Promise(function (resolve, reject) {
            var backdrop = document.getElementById('ss-gate-backdrop');
            var passEl = document.getElementById('ss-gate-password');
            var errEl = document.getElementById('ss-gate-error');
            var submitBtn = document.getElementById('ss-gate-submit');
            var cancelBtn = document.getElementById('ss-gate-cancel');
            if (!backdrop || !passEl) {
                reject(new Error(tr('server.gate.required')));
                return;
            }
            promptActive = true;
            var submitting = false;
            var submitLabelDefault = submitBtn ? submitBtn.textContent : '';
            passEl.value = '';
            if (errEl) { errEl.hidden = true; errEl.textContent = ''; }
            backdrop.hidden = false;
            setModalA11y(true, false);

            function setGateBusy(busy) {
                submitting = !!busy;
                passEl.disabled = submitting;
                if (submitBtn) {
                    submitBtn.disabled = submitting;
                    submitBtn.textContent = submitting ? tr('server.gate.verifying') : submitLabelDefault;
                }
                if (cancelBtn) cancelBtn.disabled = submitting;
                setModalA11y(true, submitting);
            }

            function cleanup() {
                promptActive = false;
                submitting = false;
                passEl.onkeydown = null;
                passEl.disabled = false;
                if (submitBtn) {
                    submitBtn.onclick = null;
                    submitBtn.disabled = false;
                    submitBtn.textContent = submitLabelDefault;
                }
                if (cancelBtn) {
                    cancelBtn.onclick = null;
                    cancelBtn.disabled = false;
                }
                setModalA11y(false, false);
            }

            function cancel() {
                if (submitting) return;
                cleanup();
                backdrop.hidden = true;
                reject(new Error('cancelled'));
            }

            async function submit() {
                if (submitting) return;
                var password = passEl.value;
                if (!password) {
                    if (errEl) {
                        errEl.textContent = tr('server.gate.required');
                        errEl.hidden = false;
                    }
                    return;
                }
                setGateBusy(true);
                try {
                    var res = await fetch('/api/auth/reverify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'same-origin',
                        body: JSON.stringify({ password: password }),
                    });
                    var raw = await res.text();
                    var data = raw ? JSON.parse(raw) : {};
                    if (!res.ok || !data.ok) {
                        throw (global.OperatorErrorVoice
                            ? OperatorErrorVoice.attach(new Error('op'), data)
                            : new Error(tr('server.gate.failed')));
                    }
                    applyResponse(data);
                    cleanup();
                    backdrop.hidden = true;
                    resolve(attachBody({}));
                } catch (err) {
                    setGateBusy(false);
                    if (errEl) {
                        errEl.textContent = (global.OperatorUI)
                            ? OperatorUI.opMessage(err, null, 'server.gate.failed')
                            : tr('server.gate.failed');
                        errEl.hidden = false;
                    }
                    passEl.focus();
                }
            }

            passEl.onkeydown = function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    submit();
                }
            };
            if (submitBtn) submitBtn.onclick = submit;
            if (cancelBtn) cancelBtn.onclick = cancel;
            setTimeout(function () { passEl.focus(); }, 50);
        });
    }

    async function withReverify(body) {
        if (isValid()) return attachBody(body);
        var creds = await promptModal();
        return Object.assign({}, body || {}, creds);
    }

    global.AuthReverify = {
        isValid: isValid,
        applyResponse: applyResponse,
        attachBody: attachBody,
        withReverify: withReverify,
        promptModal: promptModal,
        dismissGate: dismissGate,
        isPromptOpen: isPromptOpen,
        clear: clear,
    };
})(window);
