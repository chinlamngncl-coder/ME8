(function () {
    var form = document.getElementById('must-change-form');
    var errEl = document.getElementById('pwd-error');
    var submitBtn = document.getElementById('pwd-submit');
    var logoutBtn = document.getElementById('pwd-logout');
    var curEl = document.getElementById('pwd-current');
    var newEl = document.getElementById('pwd-new');
    var confirmEl = document.getElementById('pwd-confirm');

    function tr(key) {
        return (window.I18n && I18n.t) ? I18n.t(key) : key;
    }

    var formBusy = (window.AuthFormBusy && AuthFormBusy.create) ? AuthFormBusy.create({
        fields: [curEl, newEl, confirmEl].filter(Boolean),
        submitBtn: submitBtn,
        cancelBtns: [logoutBtn].filter(Boolean),
        busyLabel: tr('common.saving'),
    }) : null;

    function showError(msg) {
        errEl.textContent = msg;
        errEl.style.display = 'block';
    }

    function readyLocales() {
        if (window.I18n && I18n.init) return I18n.init();
        return Promise.resolve();
    }

    readyLocales().then(function () {
        document.title = tr('mustChangePassword.documentTitle');
        if (formBusy) formBusy.refreshDefaultLabel();
        // Always show a typed example even if the policy API is slow or fails
        var hintEl = document.getElementById('pwd-policy-hint');
        if (hintEl && (!hintEl.textContent || hintEl.textContent.indexOf('{') >= 0)) {
            hintEl.textContent = tr('mustChangePassword.exampleHint');
        }
    });

    fetch('/api/auth/session', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (data) {
        if (!data || !data.ok) {
            window.location.replace('/login.html');
            return;
        }
        if (!data.mustChangePassword) {
            window.location.replace('/');
            return;
        }
        readyLocales().then(function () {
            if (!window.PasswordPolicyUi) return;
            return PasswordPolicyUi.loadPolicyHint('pwd-policy-hint', data.role).then(function (policy) {
                if (policy) {
                    PasswordPolicyUi.applyMinLength(['#pwd-new', '#pwd-confirm'], policy.minLength);
                } else {
                    var hintEl = document.getElementById('pwd-policy-hint');
                    if (hintEl) hintEl.textContent = tr('mustChangePassword.exampleHint');
                }
            });
        });
    }).catch(function () {
        window.location.replace('/login.html');
    });

    if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
            if (formBusy && formBusy.isBusy()) return;
            fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).finally(function () {
                window.location.replace('/login.html');
            });
        });
    }

    if (!form) return;

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (formBusy && formBusy.isBusy()) return;
        errEl.style.display = 'none';
        if (formBusy) formBusy.setBusy(true);

        fetch('/api/auth/change-password', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                currentPassword: curEl ? curEl.value : '',
                newPassword: newEl ? newEl.value : '',
                confirmPassword: confirmEl ? confirmEl.value : '',
            }),
        }).then(function (r) {
            return r.json().then(function (d) { return { ok: r.ok, data: d }; });
        }).then(function (res) {
            if (res.ok && res.data.ok) {
                fetch('/api/auth/session', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (session) {
                    if (session && session.ok && session.mustEnrollTotp) {
                        window.location.replace('/enroll-totp.html');
                    } else if (session && session.ok && session.mustVerifyRecoveryEmail) {
                        window.location.replace('/recovery-email.html');
                    } else {
                        window.location.replace('/');
                    }
                }).catch(function () {
                    window.location.replace('/');
                });
                return;
            }
            showError((window.OperatorUI)
                ? OperatorUI.opMessage(null, res.data, 'mustChangePassword.error')
                : tr('mustChangePassword.error'));
            if (formBusy) formBusy.setBusy(false);
            if (curEl) curEl.focus();
        }).catch(function () {
            showError(tr('mustChangePassword.errorServer'));
            if (formBusy) formBusy.setBusy(false);
            if (curEl) curEl.focus();
        });
    });
})();
