(function () {
    var msgEl = document.getElementById('verify-msg');
    var loginLink = document.getElementById('verify-login-link');

    function tr(key) {
        return (window.I18n && I18n.t) ? I18n.t(key) : key;
    }

    function setMsg(text, ok) {
        if (!msgEl) return;
        msgEl.textContent = text;
        msgEl.className = ok ? 'ok' : 'err';
    }

    if (window.I18n && I18n.init) {
        I18n.init().then(function () {
            document.title = tr('recoveryEmail.verifyDocumentTitle');
        });
    }

    var params = new URLSearchParams(window.location.search || '');
    var token = params.get('token') || '';
    if (!token) {
        setMsg(tr('recoveryEmail.verifyInvalid'), false);
        if (loginLink) loginLink.hidden = false;
        return;
    }

    fetch('/api/auth/recovery-email/confirm?token=' + encodeURIComponent(token), { credentials: 'same-origin' })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
        .then(function (res) {
            if (!res.ok || !res.data.ok) {
                setMsg((res.data && res.data.error) || tr('recoveryEmail.verifyInvalid'), false);
                if (loginLink) loginLink.hidden = false;
                return;
            }
            setMsg(tr('recoveryEmail.verifySuccess', { email: res.data.recoveryEmail || '' }), true);
            if (loginLink) {
                loginLink.hidden = false;
                loginLink.textContent = tr('recoveryEmail.continueSignIn');
            }
        })
        .catch(function () {
            setMsg(tr('recoveryEmail.verifyServerError'), false);
            if (loginLink) loginLink.hidden = false;
        });
}());
