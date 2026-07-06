(function () {
    var enrollToken = '';
    var errEl = document.getElementById('enroll-error');
    var stepStart = document.getElementById('step-start');
    var stepScan = document.getElementById('step-scan');
    var stepBackup = document.getElementById('step-backup');
    var startForm = document.getElementById('enroll-start-form');
    var confirmForm = document.getElementById('enroll-confirm-form');
    var passEl = document.getElementById('enroll-password');
    var codeEl = document.getElementById('enroll-code');
    var startSubmit = startForm ? startForm.querySelector('button[type="submit"]') : null;
    var confirmSubmit = confirmForm ? confirmForm.querySelector('button[type="submit"]') : null;
    var logoutBtn = document.getElementById('enroll-logout');

    function tr(key) {
        return (window.I18n && I18n.t) ? I18n.t(key) : key;
    }

    var startBusy = (window.AuthFormBusy && AuthFormBusy.create) ? AuthFormBusy.create({
        fields: [passEl].filter(Boolean),
        submitBtn: startSubmit,
        cancelBtns: [logoutBtn].filter(Boolean),
        busyLabel: tr('common.verifying'),
    }) : null;

    var confirmBusy = (window.AuthFormBusy && AuthFormBusy.create) ? AuthFormBusy.create({
        fields: [codeEl].filter(Boolean),
        submitBtn: confirmSubmit,
        cancelBtns: [logoutBtn].filter(Boolean),
        busyLabel: tr('common.verifying'),
    }) : null;

    function showError(msg) {
        errEl.textContent = msg;
        errEl.style.display = 'block';
    }

    function hideError() {
        errEl.style.display = 'none';
    }

    function showStep(step) {
        [stepStart, stepScan, stepBackup].forEach(function (el) {
            if (el) el.hidden = el !== step;
        });
        hideError();
    }

    if (window.I18n && I18n.init) {
        I18n.init().then(function () {
            document.title = tr('totpEnroll.documentTitle');
            if (startBusy) startBusy.refreshDefaultLabel();
            if (confirmBusy) confirmBusy.refreshDefaultLabel();
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
        if (!data.mustEnrollTotp && data.totpEnabled) {
            window.location.replace('/');
        }
    }).catch(function () {
        window.location.replace('/login.html');
    });

    if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
            if ((startBusy && startBusy.isBusy()) || (confirmBusy && confirmBusy.isBusy())) return;
            fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).finally(function () {
                window.location.replace('/login.html');
            });
        });
    }

    if (startForm) {
        startForm.addEventListener('submit', function (e) {
            e.preventDefault();
            if (startBusy && startBusy.isBusy()) return;
            hideError();
            if (startBusy) startBusy.setBusy(true);
            fetch('/api/auth/totp/enroll/start', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: passEl ? passEl.value : '' }),
            }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
                .then(function (res) {
                    if (!res.ok || !res.data.ok) {
                        throw (window.OperatorErrorVoice
                            ? OperatorErrorVoice.attach(new Error('op'), res.data)
                            : new Error(tr('totpEnroll.error')));
                    }
                    enrollToken = res.data.enrollToken;
                    document.getElementById('enroll-qr').src = res.data.qrDataUrl;
                    document.getElementById('enroll-secret').textContent = res.data.manualSecret || '';
                    if (startBusy) startBusy.setBusy(false);
                    showStep(stepScan);
                    if (codeEl) codeEl.focus();
                })
                .catch(function (err) {
                    showError((window.OperatorUI)
                        ? OperatorUI.opMessage(err, null, 'totpEnroll.error')
                        : tr('totpEnroll.error'));
                    if (startBusy) startBusy.setBusy(false);
                    if (passEl) passEl.focus();
                });
        });
    }

    if (confirmForm) {
        confirmForm.addEventListener('submit', function (e) {
            e.preventDefault();
            if (confirmBusy && confirmBusy.isBusy()) return;
            hideError();
            if (confirmBusy) confirmBusy.setBusy(true);
            fetch('/api/auth/totp/enroll/confirm', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    enrollToken: enrollToken,
                    code: codeEl ? codeEl.value.trim() : '',
                }),
            }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
                .then(function (res) {
                    if (!res.ok || !res.data.ok) {
                        throw (window.OperatorErrorVoice
                            ? OperatorErrorVoice.attach(new Error('op'), res.data)
                            : new Error(tr('totpEnroll.error')));
                    }
                    var list = document.getElementById('enroll-backup-list');
                    list.innerHTML = '';
                    (res.data.backupCodes || []).forEach(function (code) {
                        var row = document.createElement('div');
                        row.textContent = code;
                        list.appendChild(row);
                    });
                    if (confirmBusy) confirmBusy.setBusy(false);
                    showStep(stepBackup);
                })
                .catch(function (err) {
                    showError((window.OperatorUI)
                        ? OperatorUI.opMessage(err, null, 'totpEnroll.error')
                        : tr('totpEnroll.error'));
                    if (confirmBusy) confirmBusy.setBusy(false);
                    if (codeEl) codeEl.focus();
                });
        });
    }

    document.getElementById('enroll-finish').addEventListener('click', function () {
        fetch('/api/auth/session', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (session) {
            if (session && session.ok && session.mustVerifyRecoveryEmail) {
                window.location.replace('/recovery-email.html');
            } else {
                window.location.replace('/');
            }
        }).catch(function () {
            window.location.replace('/');
        });
    });
})();
