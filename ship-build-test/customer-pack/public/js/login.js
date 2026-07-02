(function () {
    var form = document.getElementById('login-form');
    var totpStep = document.getElementById('login-totp-step');
    var totpForm = document.getElementById('login-totp-form');
    var errEl = document.getElementById('login-error');
    var submitBtn = document.getElementById('login-submit');
    var totpSubmitBtn = document.getElementById('login-totp-submit');
    var totpBackBtn = document.getElementById('login-totp-back');
    var passInput = document.getElementById('login-pass');
    var passToggle = document.getElementById('login-pass-toggle');
    var oidcBtn = document.getElementById('login-oidc');
    var divider = document.getElementById('login-divider');
    var oidcConfig = { enabled: false, localLoginEnabled: true };
    var passVisible = false;
    var totpChallenge = '';

    function tr(key) {
        return (window.I18n && I18n.t) ? I18n.t(key) : key;
    }

    function unlockPassInput() {
        if (!passInput) return;
        passInput.removeAttribute('readonly');
    }

    function syncPassToggle() {
        if (!passToggle || !passInput) return;
        passInput.classList.toggle('login-pass-masked', !passVisible);
        passToggle.textContent = tr(passVisible ? 'login.hidePassword' : 'login.showPassword');
        passToggle.setAttribute('aria-pressed', passVisible ? 'true' : 'false');
    }

    function bindPassToggle() {
        if (!passToggle || !passInput) return;
        passInput.setAttribute('readonly', 'readonly');
        passInput.addEventListener('focus', unlockPassInput);
        passInput.addEventListener('mousedown', unlockPassInput);
        passToggle.addEventListener('click', function () {
            unlockPassInput();
            passVisible = !passVisible;
            syncPassToggle();
            passInput.focus();
            var len = passInput.value.length;
            if (passInput.setSelectionRange) {
                passInput.setSelectionRange(len, len);
            }
        });
        syncPassToggle();
    }

    function showOidcError() {
        var params = new URLSearchParams(window.location.search);
        var err = params.get('oidc_error');
        if (!err) return;
        errEl.textContent = decodeURIComponent(err);
        errEl.style.display = 'block';
    }

    function redirectAfterLogin(data) {
        if (data && data.mustChangePassword) {
            window.location.replace('/must-change-password.html');
        } else if (data && data.mustEnrollTotp) {
            window.location.replace('/enroll-totp.html');
        } else {
            window.location.replace('/');
        }
    }

    function showTotpStep(challenge) {
        totpChallenge = challenge || '';
        if (form) form.hidden = true;
        if (oidcBtn) oidcBtn.hidden = true;
        if (divider) divider.hidden = true;
        if (totpStep) totpStep.hidden = false;
        var totpInput = document.getElementById('login-totp');
        if (totpInput) {
            totpInput.value = '';
            totpInput.focus();
        }
    }

    function hideTotpStep() {
        totpChallenge = '';
        if (totpStep) totpStep.hidden = true;
        if (form) form.hidden = !oidcConfig.localLoginEnabled;
        if (oidcBtn) oidcBtn.hidden = !oidcConfig.enabled;
        if (divider) divider.hidden = !(oidcConfig.enabled && oidcConfig.localLoginEnabled);
    }

    function applyOidcUi() {
        if (!oidcBtn) return;
        if (oidcConfig.enabled) {
            oidcBtn.hidden = false;
            oidcBtn.textContent = oidcConfig.label || 'Sign in with organization account';
            if (divider) divider.hidden = !oidcConfig.localLoginEnabled;
            if (form) form.hidden = !oidcConfig.localLoginEnabled;
        } else {
            oidcBtn.hidden = true;
            if (divider) divider.hidden = true;
            if (form) form.hidden = false;
        }
    }

    function bindLoginLang() {
        var sel = document.getElementById('login-lang');
        if (!sel) return;
        var fallback = { en: 'English', fil: 'Filipino', id: 'Indonesian', th: 'Thai', ko: '한국어' };
        var codes = (window.I18n && I18n.supportedLanguages)
            ? I18n.supportedLanguages()
            : ['en', 'fil', 'id', 'th', 'ko'];
        if (!sel._i18nBound) {
            sel._i18nBound = true;
            sel.addEventListener('change', function () {
                if (I18n.setLocale) I18n.setLocale(sel.value);
            });
        }
        sel.innerHTML = '';
        codes.forEach(function (code) {
            var opt = document.createElement('option');
            opt.value = code;
            var label = tr('lang.' + code);
            opt.textContent = (label && label !== ('lang.' + code)) ? label : (fallback[code] || code);
            sel.appendChild(opt);
        });
        sel.value = (window.I18n && I18n.getLocale) ? I18n.getLocale() : 'en';
    }

    bindLoginLang();
    bindPassToggle();
    if (window.I18n && I18n.init) {
        I18n.init().then(function () {
            bindLoginLang();
            document.title = tr('login.documentTitle');
            syncPassToggle();
        });
    }

    window.addEventListener('fm-i18n-changed', function () {
        bindLoginLang();
        document.title = tr('login.documentTitle');
        if (submitBtn && !submitBtn.disabled) submitBtn.textContent = tr('login.submit');
        syncPassToggle();
    });

    showOidcError();

    fetch('/api/auth/oidc/config').then(function (r) { return r.json(); }).then(function (data) {
        if (data && data.ok && data.oidc) {
            oidcConfig = data.oidc;
            applyOidcUi();
        }
    }).catch(function () { /* ignore */ });

    if (oidcBtn) {
        oidcBtn.addEventListener('click', function () {
            window.location.href = '/api/auth/oidc/start';
        });
    }

    fetch('/api/auth/session').then(function (r) { return r.json(); }).then(function (data) {
        if (data && data.ok && data.mustChangePassword) {
            window.location.replace('/must-change-password.html');
            return;
        }
        if (data && data.ok && data.mustEnrollTotp) {
            window.location.replace('/enroll-totp.html');
            return;
        }
        if (data && data.ok) window.location.replace('/');
    }).catch(function () { /* ignore */ });

    if (totpBackBtn) {
        totpBackBtn.addEventListener('click', function () {
            errEl.style.display = 'none';
            hideTotpStep();
            submitBtn.disabled = false;
            submitBtn.textContent = tr('login.submit');
        });
    }

    if (totpForm) {
        totpForm.addEventListener('submit', function (e) {
            e.preventDefault();
            errEl.style.display = 'none';
            if (!totpChallenge) {
                hideTotpStep();
                return;
            }
            totpSubmitBtn.disabled = true;
            totpSubmitBtn.textContent = tr('login.totpVerifying');

            fetch('/api/auth/login/totp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    challenge: totpChallenge,
                    code: document.getElementById('login-totp').value.trim(),
                }),
            }).then(function (r) {
                return r.json().then(function (d) { return { ok: r.ok, data: d }; });
            }).then(function (res) {
                if (res.ok && res.data.ok) {
                    redirectAfterLogin(res.data);
                    return;
                }
                errEl.textContent = (res.data && res.data.error) ? res.data.error : tr('login.totpError');
                errEl.style.display = 'block';
                totpSubmitBtn.disabled = false;
                totpSubmitBtn.textContent = tr('login.totpSubmit');
            }).catch(function () {
                errEl.textContent = tr('login.errorServer');
                errEl.style.display = 'block';
                totpSubmitBtn.disabled = false;
                totpSubmitBtn.textContent = tr('login.totpSubmit');
            });
        });
    }

    if (!form) return;

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        unlockPassInput();
        errEl.style.display = 'none';
        submitBtn.disabled = true;
        submitBtn.textContent = tr('login.signingIn');

        fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: document.getElementById('login-user').value.trim(),
                password: passInput ? passInput.value : '',
            }),
        }).then(function (r) {
            return r.json().then(function (d) { return { ok: r.ok, data: d, status: r.status }; });
        }).then(function (res) {
            if (res.ok && res.data.ok) {
                if (res.data.totpRequired && res.data.challenge) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = tr('login.submit');
                    showTotpStep(res.data.challenge);
                    return;
                }
                redirectAfterLogin(res.data);
                return;
            }
            errEl.textContent = (res.data && res.data.error) ? res.data.error : tr('login.errorInvalid');
            errEl.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = tr('login.submit');
            if (passInput) passInput.focus();
        }).catch(function () {
            errEl.textContent = tr('login.errorServer');
            errEl.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = tr('login.submit');
        });
    });
})();
