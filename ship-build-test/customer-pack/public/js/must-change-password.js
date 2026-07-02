(function () {
    var form = document.getElementById('must-change-form');
    var errEl = document.getElementById('pwd-error');
    var submitBtn = document.getElementById('pwd-submit');
    var logoutBtn = document.getElementById('pwd-logout');

    function tr(key) {
        return (window.I18n && I18n.t) ? I18n.t(key) : key;
    }

    function showError(msg) {
        errEl.textContent = msg;
        errEl.style.display = 'block';
    }

    if (window.I18n && I18n.init) {
        I18n.init().then(function () {
            document.title = tr('mustChangePassword.documentTitle');
        });
    }

    fetch('/api/auth/session', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (data) {
        if (!data || !data.ok) {
            window.location.replace('/login.html');
            return;
        }
        if (!data.mustChangePassword) {
            window.location.replace('/');
            return;
        }
        if (global.PasswordPolicyUi) {
            PasswordPolicyUi.loadPolicyHint('pwd-policy-hint', data.role).then(function (policy) {
                if (policy) {
                    PasswordPolicyUi.applyMinLength(['#pwd-new', '#pwd-confirm'], policy.minLength);
                }
            });
        }
    }).catch(function () {
        window.location.replace('/login.html');
    });

    if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
            fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).finally(function () {
                window.location.replace('/login.html');
            });
        });
    }

    if (!form) return;

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        errEl.style.display = 'none';
        submitBtn.disabled = true;
        submitBtn.textContent = tr('mustChangePassword.saving');

        fetch('/api/auth/change-password', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                currentPassword: document.getElementById('pwd-current').value,
                newPassword: document.getElementById('pwd-new').value,
                confirmPassword: document.getElementById('pwd-confirm').value,
            }),
        }).then(function (r) {
            return r.json().then(function (d) { return { ok: r.ok, data: d }; });
        }).then(function (res) {
            if (res.ok && res.data.ok) {
                fetch('/api/auth/session', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (session) {
                    if (session && session.ok && session.mustEnrollTotp) {
                        window.location.replace('/enroll-totp.html');
                    } else {
                        window.location.replace('/');
                    }
                }).catch(function () {
                    window.location.replace('/');
                });
                return;
            }
            showError((res.data && res.data.error) ? res.data.error : tr('mustChangePassword.error'));
            submitBtn.disabled = false;
            submitBtn.textContent = tr('mustChangePassword.submit');
        }).catch(function () {
            showError(tr('mustChangePassword.errorServer'));
            submitBtn.disabled = false;
            submitBtn.textContent = tr('mustChangePassword.submit');
        });
    });
})();
