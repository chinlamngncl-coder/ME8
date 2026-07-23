/**
 * Platform SMTP settings \u2014 Dashboard Auth tab (super admin only).
 */
(function (global) {
    function tr(key, params) {
        if (global.I18n && I18n.t) return I18n.t(key, params);
        return key;
    }

    function catalogMsg(data, err, fallbackKey) {
        if (global.OperatorUI) return OperatorUI.opMsg(data, err, fallbackKey);
        if (global.OperatorErrorVoice) return OperatorErrorVoice.fromCatch(err, data, fallbackKey);
        return tr(fallbackKey || 'errors.generic');
    }

    function throwCatalogErr(data) {
        throw global.OperatorErrorVoice
            ? OperatorErrorVoice.attach(new Error('op'), data)
            : new Error(catalogMsg(data));
    }

    function $(id) {
        return document.getElementById(id);
    }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function canManage() {
        return global.ServerSetup && ServerSetup.canManageServer && ServerSetup.canManageServer();
    }

    function readForm() {
        return {
            host: ($('ss-smtp-host') || {}).value ? $('ss-smtp-host').value.trim() : '',
            port: parseInt(($('ss-smtp-port') || {}).value, 10) || 587,
            secure: ($('ss-smtp-secure') || {}).value || 'starttls',
            fromName: ($('ss-smtp-from-name') || {}).value ? $('ss-smtp-from-name').value.trim() : '',
            fromEmail: ($('ss-smtp-from-email') || {}).value ? $('ss-smtp-from-email').value.trim() : '',
            user: ($('ss-smtp-user') || {}).value ? $('ss-smtp-user').value.trim() : '',
            password: ($('ss-smtp-pass') || {}).value ? $('ss-smtp-pass').value : '',
        };
    }

    function renderPasswordBadge(smtp) {
        const passEl = $('ss-smtp-pass-status');
        if (!passEl) return;
        const configured = smtp && smtp.passwordConfigured;
        passEl.innerHTML = configured
            ? '<span class="ev-st-badge ev-st-ok">' + esc(tr('smtp.passwordSet')) + '</span>'
            : '<span class="ev-st-badge ev-st-bad">' + esc(tr('smtp.passwordMissing')) + '</span>';
    }

    function formatTestTime(iso) {
        if (!iso) return '';
        try {
            const d = new Date(iso);
            if (Number.isNaN(d.getTime())) return String(iso);
            return d.toLocaleString();
        } catch (_) {
            return String(iso);
        }
    }

    function renderTestBadge(smtp) {
        const testEl = $('ss-smtp-test-status');
        if (!testEl) return;
        const s = smtp || {};
        if (!s.lastTestAt) {
            testEl.innerHTML = '<span class="ev-st-badge ev-st-muted">' + esc(tr('smtp.lastTestNever')) + '</span>';
            return;
        }
        if (s.lastTestOk) {
            testEl.innerHTML = '<span class="ev-st-badge ev-st-ok">' + esc(tr('smtp.lastTestOk', { time: formatTestTime(s.lastTestAt) })) + '</span>';
            return;
        }
        const errHint = s.lastTestError ? ' \u2014 ' + s.lastTestError : '';
        testEl.innerHTML = '<span class="ev-st-badge ev-st-bad" title="' + esc(s.lastTestError || '') + '">'
            + esc(tr('smtp.lastTestFail', { time: formatTestTime(s.lastTestAt) })) + esc(errHint) + '</span>';
    }

    function fillForm(smtp) {
        const s = smtp || {};
        if ($('ss-smtp-host')) $('ss-smtp-host').value = s.host || '';
        if ($('ss-smtp-port')) $('ss-smtp-port').value = s.port != null ? String(s.port) : '587';
        if ($('ss-smtp-secure')) $('ss-smtp-secure').value = s.secure || 'starttls';
        if ($('ss-smtp-from-name')) $('ss-smtp-from-name').value = s.fromName || '';
        if ($('ss-smtp-from-email')) $('ss-smtp-from-email').value = s.fromEmail || '';
        if ($('ss-smtp-user')) $('ss-smtp-user').value = s.user || '';
        if ($('ss-smtp-pass')) $('ss-smtp-pass').value = '';
        renderPasswordBadge(s);
        renderTestBadge(s);
    }

    async function load() {
        if (!canManage()) return;
        const res = await fetch('/api/platform/smtp', { credentials: 'same-origin' });
        const data = await res.json();
        if (!res.ok || !data.ok) return;
        fillForm(data.smtp);
    }

    async function saveSettings() {
        if (!canManage()) {
            alert(tr('smtp.adminRequired'));
            return;
        }
        const msg = $('ss-smtp-msg');
        if (msg) msg.textContent = tr('evidenceHub.loading');
        const form = readForm();
        const smtpPayload = Object.assign({}, form);
        if (!smtpPayload.password) delete smtpPayload.password;
        try {
            const payload = global.AuthReverify && AuthReverify.withReverify
                ? await AuthReverify.withReverify({ smtp: smtpPayload })
                : { smtp: smtpPayload };
            const res = await fetch('/api/platform/smtp', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok || !data.ok) throwCatalogErr(data);
            if ($('ss-smtp-pass')) $('ss-smtp-pass').value = '';
            fillForm(data.smtp);
            if (msg) msg.textContent = tr('smtp.saved');
        } catch (err) {
            const text = catalogMsg(err.opPayload || err.catalogPayload, err, 'smtp.saveFailed');
            if (msg) msg.textContent = text;
            alert(text);
        }
    }

    async function sendTest() {
        if (!canManage()) {
            alert(tr('smtp.adminRequired'));
            return;
        }
        const msg = $('ss-smtp-msg');
        const testTo = ($('ss-smtp-test-to') || {}).value ? $('ss-smtp-test-to').value.trim() : '';
        if (!testTo) {
            const text = tr('smtp.testToRequired');
            if (msg) msg.textContent = text;
            alert(text);
            if ($('ss-smtp-test-to')) $('ss-smtp-test-to').focus();
            return;
        }
        if (msg) msg.textContent = tr('smtp.sendingTest');
        const form = readForm();
        const smtpPayload = Object.assign({}, form);
        if (!smtpPayload.password) delete smtpPayload.password;
        try {
            const payload = global.AuthReverify && AuthReverify.withReverify
                ? await AuthReverify.withReverify({ smtp: smtpPayload, testTo: testTo })
                : { smtp: smtpPayload, testTo: testTo };
            const res = await fetch('/api/platform/smtp/test', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok || !data.ok) throwCatalogErr(data);
            if ($('ss-smtp-pass')) $('ss-smtp-pass').value = '';
            fillForm(data.smtp);
            if (msg) msg.textContent = tr('smtp.testSent', { to: testTo });
        } catch (err) {
            const text = catalogMsg(err.opPayload || err.catalogPayload, err, 'smtp.testFailed');
            if (msg) msg.textContent = text;
            try {
                await load();
            } catch (_) { /* ignore */ }
            alert(text);
        }
    }

    function bindUi() {
        const saveBtn = $('ss-smtp-save');
        const testBtn = $('ss-smtp-test');
        if (saveBtn) saveBtn.addEventListener('click', function () { saveSettings(); });
        if (testBtn) testBtn.addEventListener('click', function () { sendTest(); });
    }

    bindUi();

    global.PlatformSmtp = {
        load: load,
        fillForm: fillForm,
        saveSettings: saveSettings,
        sendTest: sendTest,
    };
}(window));
