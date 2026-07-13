(function (global) {
    'use strict';

    var DEFAULT_EXAMPLE = 'Ab12cd34!@#$';

    var AUTH_PASSWORD_SELECTORS = [
        '#login-pass',
        '#ss-gate-password',
        '#enroll-password',
        '#pwd-current',
        '#pwd-new',
        '#pwd-confirm',
        '#ss-dash-pass-current',
        '#ss-dash-pass-new',
        '#ss-dash-pass-confirm',
        '#ss-new-pass',
        '#ss-reset-new-pass',
    ];

    function tr(key, params) {
        if (global.I18n && I18n.t) return I18n.t(key, params);
        return key;
    }

    function bindNoPaste(root) {
        var scope = root && root.querySelectorAll ? root : document;
        AUTH_PASSWORD_SELECTORS.forEach(function (sel) {
            scope.querySelectorAll(sel).forEach(function (el) {
                if (el._fmNoPasteBound) return;
                el._fmNoPasteBound = true;
                el.addEventListener('paste', function (e) { e.preventDefault(); });
                el.addEventListener('drop', function (e) { e.preventDefault(); });
            });
        });
    }

    function policyHintText(policy) {
        if (!policy) return '';
        return tr('auth.passwordPolicy.hint', {
            min: policy.minLength || 12,
            example: policy.example || DEFAULT_EXAMPLE,
            special: policy.specialChars || '',
        });
    }

    function applyMinLength(selectors, minLength) {
        if (!minLength) return;
        selectors.forEach(function (sel) {
            document.querySelectorAll(sel).forEach(function (el) {
                el.minLength = minLength;
            });
        });
    }

    async function loadPolicyHint(targetId, role) {
        var el = typeof targetId === 'string' ? document.getElementById(targetId) : targetId;
        if (!el) return null;
        var fallback = tr('mustChangePassword.exampleHint');
        if (!fallback || fallback === 'mustChangePassword.exampleHint') {
            fallback = 'Rules: at least 12 characters, with upper case, lower case, a number, and a symbol. Example you can type: ' + DEFAULT_EXAMPLE;
        }
        try {
            var res = await fetch('/api/auth/password-policy', { credentials: 'same-origin' });
            var data = await res.json();
            if (!res.ok || !data.ok || !data.policy) {
                el.textContent = fallback;
                return null;
            }
            var policy = Object.assign({}, data.policy, {
                minLength: data.policy.minLength || data.policy.minLengthOperator || 12,
                example: data.policy.example || DEFAULT_EXAMPLE,
            });
            // role kept for callers; min length is unified for all dashboard roles
            if (role) { /* no-op: both roles share minLength */ }
            var text = policyHintText(policy);
            el.textContent = (text && text.indexOf('{') < 0) ? text : fallback;
            return policy;
        } catch (_) {
            el.textContent = fallback;
            return null;
        }
    }

    global.PasswordPolicyUi = {
        bindNoPaste: bindNoPaste,
        loadPolicyHint: loadPolicyHint,
        applyMinLength: applyMinLength,
        policyHintText: policyHintText,
        DEFAULT_EXAMPLE: DEFAULT_EXAMPLE,
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { bindNoPaste(document); });
    } else {
        bindNoPaste(document);
    }
})(window);
