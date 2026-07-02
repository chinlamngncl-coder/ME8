(function (global) {
    'use strict';

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
            min: policy.minLength,
            special: policy.specialChars,
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
        try {
            var res = await fetch('/api/auth/password-policy', { credentials: 'same-origin' });
            var data = await res.json();
            if (!res.ok || !data.ok || !data.policy) return null;
            var policy = data.policy;
            if (role === 'super_admin' || role === 'operator') {
                policy = Object.assign({}, policy, {
                    minLength: role === 'super_admin' ? policy.minLengthSuperAdmin : policy.minLengthOperator,
                });
            }
            el.textContent = policyHintText(policy);
            return policy;
        } catch (_) {
            return null;
        }
    }

    global.PasswordPolicyUi = {
        bindNoPaste: bindNoPaste,
        loadPolicyHint: loadPolicyHint,
        applyMinLength: applyMinLength,
        policyHintText: policyHintText,
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { bindNoPaste(document); });
    } else {
        bindNoPaste(document);
    }
})(typeof window !== 'undefined' ? window : this);
