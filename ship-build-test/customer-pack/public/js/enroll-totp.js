(function () {
    var enrollToken = '';
    var errEl = document.getElementById('enroll-error');
    var stepStart = document.getElementById('step-start');
    var stepScan = document.getElementById('step-scan');
    var stepBackup = document.getElementById('step-backup');

    function tr(key) {
        return (window.I18n && I18n.t) ? I18n.t(key) : key;
    }

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

    document.getElementById('enroll-logout').addEventListener('click', function () {
        fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).finally(function () {
            window.location.replace('/login.html');
        });
    });

    document.getElementById('enroll-start-form').addEventListener('submit', function (e) {
        e.preventDefault();
        hideError();
        fetch('/api/auth/totp/enroll/start', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: document.getElementById('enroll-password').value }),
        }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
            .then(function (res) {
                if (!res.ok || !res.data.ok) throw new Error((res.data && res.data.error) || tr('totpEnroll.error'));
                enrollToken = res.data.enrollToken;
                document.getElementById('enroll-qr').src = res.data.qrDataUrl;
                document.getElementById('enroll-secret').textContent = res.data.manualSecret || '';
                showStep(stepScan);
            })
            .catch(function (err) {
                showError(err.message || tr('totpEnroll.error'));
            });
    });

    document.getElementById('enroll-confirm-form').addEventListener('submit', function (e) {
        e.preventDefault();
        hideError();
        fetch('/api/auth/totp/enroll/confirm', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                enrollToken: enrollToken,
                code: document.getElementById('enroll-code').value.trim(),
            }),
        }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
            .then(function (res) {
                if (!res.ok || !res.data.ok) throw new Error((res.data && res.data.error) || tr('totpEnroll.error'));
                var list = document.getElementById('enroll-backup-list');
                list.innerHTML = '';
                (res.data.backupCodes || []).forEach(function (code) {
                    var row = document.createElement('div');
                    row.textContent = code;
                    list.appendChild(row);
                });
                showStep(stepBackup);
            })
            .catch(function (err) {
                showError(err.message || tr('totpEnroll.error'));
            });
    });

    document.getElementById('enroll-finish').addEventListener('click', function () {
        window.location.replace('/');
    });
})();
