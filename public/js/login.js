(function () {
    var form = document.getElementById('login-form');
    var totpStep = document.getElementById('login-totp-step');
    var totpForm = document.getElementById('login-totp-form');
    var errEl = document.getElementById('login-error');
    var submitBtn = document.getElementById('login-submit');
    var totpSubmitBtn = document.getElementById('login-totp-submit');
    var totpBackBtn = document.getElementById('login-totp-back');
    var passInput = document.getElementById('login-pass');
    var userInput = document.getElementById('login-user');
    var passToggle = document.getElementById('login-pass-toggle');
    var oidcBtn = document.getElementById('login-oidc');
    var divider = document.getElementById('login-divider');
    var oidcConfig = { enabled: false, localLoginEnabled: true };
    var passVisible = false;
    var totpChallenge = '';

    function tr(key) {
        return (window.I18n && I18n.t) ? I18n.t(key) : key;
    }

    function makeBusy(opts) {
        if (!window.AuthFormBusy) return null;
        return AuthFormBusy.create(opts);
    }

    var loginBusy = makeBusy({
        fields: [userInput, passInput].filter(Boolean),
        submitBtn: submitBtn,
        extraBtns: [passToggle, oidcBtn].filter(Boolean),
        busyLabel: tr('login.signingIn'),
    });

    var totpInput = document.getElementById('login-totp');
    var totpBusy = makeBusy({
        fields: totpInput ? [totpInput] : [],
        submitBtn: totpSubmitBtn,
        cancelBtns: [totpBackBtn].filter(Boolean),
        busyLabel: tr('login.totpVerifying'),
    });

    function unlockPassInput() {
        if (!passInput) return;
        passInput.removeAttribute('readonly');
    }

    function syncPassToggle() {
        if (!passToggle || !passInput) return;
        passInput.type = passVisible ? 'text' : 'password';
        passToggle.textContent = tr(passVisible ? 'login.hidePassword' : 'login.showPassword');
        passToggle.setAttribute('aria-pressed', passVisible ? 'true' : 'false');
    }

    function bindPassToggle() {
        if (!passToggle || !passInput) return;
        passInput.setAttribute('readonly', 'readonly');
        passInput.addEventListener('focus', unlockPassInput);
        passInput.addEventListener('mousedown', unlockPassInput);
        passToggle.addEventListener('click', function () {
            if (loginBusy && loginBusy.isBusy()) return;
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

    /** Same-origin path only \u2014 blocks open redirects (Display Room pop-out return). */
    function safeReturnUrl() {
        try {
            var raw = new URLSearchParams(window.location.search).get('return');
            if (!raw) return null;
            var path = String(raw).trim();
            if (!path || path.charAt(0) !== '/' || path.indexOf('//') === 0) return null;
            if (path.indexOf('\\') >= 0) return null;
            if (/[\r\n]/.test(path)) return null;
            return path;
        } catch (_) {
            return null;
        }
    }

    function homeOrReturn() {
        return safeReturnUrl() || '/';
    }

    function redirectAfterLogin(data) {
        if (data && data.mustChangePassword) {
            window.location.replace('/must-change-password.html');
        } else if (data && data.mustEnrollTotp) {
            window.location.replace('/enroll-totp.html');
        } else if (data && data.mustVerifyRecoveryEmail) {
            window.location.replace('/recovery-email.html');
        } else {
            window.location.replace(homeOrReturn());
        }
    }

    function showTotpStep(challenge) {
        totpChallenge = challenge || '';
        if (form) form.hidden = true;
        if (oidcBtn) oidcBtn.hidden = true;
        if (divider) divider.hidden = true;
        if (totpStep) totpStep.hidden = false;
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
            if (loginBusy) loginBusy.refreshDefaultLabel();
            if (totpBusy) totpBusy.refreshDefaultLabel();
        });
    }

    window.addEventListener('fm-i18n-changed', function () {
        bindLoginLang();
        document.title = tr('login.documentTitle');
        if (loginBusy && !loginBusy.isBusy()) loginBusy.refreshDefaultLabel();
        if (totpBusy && !totpBusy.isBusy()) totpBusy.refreshDefaultLabel();
        syncPassToggle();
    });

    showOidcError();

    // Factory password hint: hidden by default; show only when install account still mustChange.
    (function loadFactoryPasswordHint() {
        var hintEl = document.getElementById('login-password-hint');
        if (!hintEl) return;
        hintEl.hidden = true;
        fetch('/api/auth/login-ui', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data && data.ok && data.showFactoryPasswordHint === true) {
                    hintEl.hidden = false;
                }
            })
            .catch(function () { /* stay hidden */ });
    })();

    fetch('/api/auth/oidc/config').then(function (r) { return r.json(); }).then(function (data) {
        if (data && data.ok && data.oidc) {
            oidcConfig = data.oidc;
            applyOidcUi();
        }
    }).catch(function () { /* ignore */ });

    if (oidcBtn) {
        oidcBtn.addEventListener('click', function () {
            if (loginBusy && loginBusy.isBusy()) return;
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
        if (data && data.ok) window.location.replace(homeOrReturn());
    }).catch(function () { /* ignore */ });

    if (totpBackBtn) {
        totpBackBtn.addEventListener('click', function () {
            if (totpBusy && totpBusy.isBusy()) return;
            errEl.style.display = 'none';
            hideTotpStep();
            if (loginBusy) loginBusy.setBusy(false);
        });
    }

    if (totpForm) {
        totpForm.addEventListener('submit', function (e) {
            e.preventDefault();
            if (totpBusy && totpBusy.isBusy()) return;
            errEl.style.display = 'none';
            if (!totpChallenge) {
                hideTotpStep();
                return;
            }
            if (totpBusy) totpBusy.setBusy(true);

            fetch('/api/auth/login/totp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    challenge: totpChallenge,
                    code: totpInput ? totpInput.value.trim() : '',
                }),
            }).then(function (r) {
                return r.json().then(function (d) { return { ok: r.ok, data: d }; });
            }).then(function (res) {
                if (res.ok && res.data.ok) {
                    redirectAfterLogin(res.data);
                    return;
                }
                errEl.textContent = (window.OperatorUI)
                    ? OperatorUI.opMessage(null, res.data, 'login.totpError')
                    : tr('login.totpError');
                errEl.style.display = 'block';
                if (totpBusy) totpBusy.setBusy(false);
                if (totpInput) totpInput.focus();
            }).catch(function () {
                errEl.textContent = tr('login.errorServer');
                errEl.style.display = 'block';
                if (totpBusy) totpBusy.setBusy(false);
                if (totpInput) totpInput.focus();
            });
        });
    }

    if (!form) return;

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (loginBusy && loginBusy.isBusy()) return;
        unlockPassInput();
        errEl.style.display = 'none';
        if (loginBusy) loginBusy.setBusy(true);

        fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: userInput ? userInput.value.trim() : '',
                password: passInput ? passInput.value : '',
            }),
        }).then(function (r) {
            return r.json().then(function (d) { return { ok: r.ok, data: d, status: r.status }; });
        }).then(function (res) {
            if (res.ok && res.data.ok) {
                if (res.data.totpRequired && res.data.challenge) {
                    if (loginBusy) loginBusy.setBusy(false);
                    showTotpStep(res.data.challenge);
                    return;
                }
                redirectAfterLogin(res.data);
                return;
            }
            errEl.textContent = (window.OperatorUI)
                ? OperatorUI.opMessage(null, res.data, 'login.errorInvalid')
                : tr('login.errorInvalid');
            errEl.style.display = 'block';
            if (loginBusy) loginBusy.setBusy(false);
            if (passInput) passInput.focus();
        }).catch(function () {
            errEl.textContent = tr('login.errorServer');
            errEl.style.display = 'block';
            if (loginBusy) loginBusy.setBusy(false);
            if (passInput) passInput.focus();
        });
    });
})();
