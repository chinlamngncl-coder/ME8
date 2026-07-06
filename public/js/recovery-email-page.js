(function () {
    var errEl = document.getElementById('recovery-error');
    var okEl = document.getElementById('recovery-ok');
    var form = document.getElementById('recovery-email-form');
    var emailInput = document.getElementById('recovery-email-input');
    var sendBtn = document.getElementById('recovery-send-btn');
    var resendBtn = document.getElementById('recovery-resend-btn');
    var continueBtn = document.getElementById('recovery-continue-btn');
    var statusLine = document.getElementById('recovery-status-line');
    var logoutBtn = document.getElementById('recovery-logout');
    var busy = false;

    function tr(key, params) {
        return (window.I18n && I18n.t) ? I18n.t(key, params) : key;
    }

    function showError(msg) {
        okEl.style.display = 'none';
        errEl.textContent = msg;
        errEl.style.display = 'block';
    }

    function showOk(msg) {
        errEl.style.display = 'none';
        okEl.textContent = msg;
        okEl.style.display = 'block';
    }

    function setBusy(on) {
        busy = !!on;
        if (sendBtn) sendBtn.disabled = on;
        if (resendBtn) resendBtn.disabled = on;
        if (emailInput) emailInput.disabled = on;
    }

    function redirectAfterAuth(session) {
        if (!session || !session.ok) {
            window.location.replace('/login.html');
            return;
        }
        if (session.mustChangePassword) {
            window.location.replace('/must-change-password.html');
            return;
        }
        if (session.mustEnrollTotp) {
            window.location.replace('/enroll-totp.html');
            return;
        }
        if (session.mustVerifyRecoveryEmail) return;
        window.location.replace('/');
    }

    function applyStatus(data) {
        if (!data || !data.ok) return;
        if (data.verified) {
            if (emailInput && data.email) emailInput.value = data.email;
            if (statusLine) {
                statusLine.hidden = false;
                statusLine.innerHTML = '<span class="badge ok">' + tr('recoveryEmail.verifiedBadge') + '</span> '
                    + tr('recoveryEmail.verifiedAt', { email: data.email || '' });
            }
            if (form) form.hidden = true;
            if (resendBtn) resendBtn.hidden = true;
            if (continueBtn) continueBtn.hidden = false;
            return;
        }
        if (data.pending && data.email) {
            if (emailInput) emailInput.value = data.email;
            if (resendBtn) resendBtn.hidden = false;
            showOk(tr('recoveryEmail.pendingHint', { email: data.email }));
        }
        if (!data.smtpConfigured) {
            showError(tr('recoveryEmail.smtpRequired'));
        }
    }

    function refreshStatus() {
        return fetch('/api/auth/recovery-email/status', { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                applyStatus(data);
                return data;
            });
    }

    if (window.I18n && I18n.init) {
        I18n.init().then(function () {
            document.title = tr('recoveryEmail.documentTitle');
        });
    }

    fetch('/api/auth/session', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (data) {
        if (!data || !data.ok) {
            window.location.replace('/login.html');
            return;
        }
        if (data.mustChangePassword) {
            window.location.replace('/must-change-password.html');
            return;
        }
        if (data.mustEnrollTotp) {
            window.location.replace('/enroll-totp.html');
            return;
        }
        if (!data.mustVerifyRecoveryEmail && data.recoveryEmailVerified) {
            window.location.replace('/');
            return;
        }
        return refreshStatus();
    }).catch(function () {
        window.location.replace('/login.html');
    });

    if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
            if (busy) return;
            fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).finally(function () {
                window.location.replace('/login.html');
            });
        });
    }

    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            if (busy) return;
            setBusy(true);
            hideError();
            fetch('/api/auth/recovery-email/request', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailInput ? emailInput.value.trim() : '' }),
            }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
                .then(function (res) {
                    if (!res.ok || !res.data.ok) {
                        throw (window.OperatorErrorVoice
                            ? OperatorErrorVoice.attach(new Error('op'), res.data)
                            : new Error(tr('recoveryEmail.sendFailed')));
                    }
                    showOk(tr('recoveryEmail.sent', { email: res.data.recoveryEmail || '' }));
                    if (resendBtn) resendBtn.hidden = false;
                    setBusy(false);
                })
                .catch(function (err) {
                    showError((window.OperatorUI)
                        ? OperatorUI.opMessage(err, null, 'recoveryEmail.sendFailed')
                        : tr('recoveryEmail.sendFailed'));
                    setBusy(false);
                });
        });
    }

    function hideError() {
        errEl.style.display = 'none';
    }

    if (resendBtn) {
        resendBtn.addEventListener('click', function () {
            if (busy) return;
            setBusy(true);
            hideError();
            fetch('/api/auth/recovery-email/resend', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: '{}',
            }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
                .then(function (res) {
                    if (!res.ok || !res.data.ok) {
                        throw (window.OperatorErrorVoice
                            ? OperatorErrorVoice.attach(new Error('op'), res.data)
                            : new Error(tr('recoveryEmail.sendFailed')));
                    }
                    showOk(tr('recoveryEmail.resent', { email: res.data.recoveryEmail || '' }));
                    setBusy(false);
                })
                .catch(function (err) {
                    showError((window.OperatorUI)
                        ? OperatorUI.opMessage(err, null, 'recoveryEmail.sendFailed')
                        : tr('recoveryEmail.sendFailed'));
                    setBusy(false);
                });
        });
    }

    if (continueBtn) {
        continueBtn.addEventListener('click', function () {
            fetch('/api/auth/session', { credentials: 'same-origin' })
                .then(function (r) { return r.json(); })
                .then(redirectAfterAuth);
        });
    }

    setInterval(function () {
        refreshStatus().then(function (data) {
            if (data && data.verified) applyStatus(data);
        }).catch(function () { /* ignore */ });
    }, 8000);
}());
