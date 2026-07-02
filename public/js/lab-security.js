/**
 * Enterprise LAB tab — IdP/OIDC, monitoring readiness (engineer PIN only).
 */
(function (global) {
    let loaded = false;

    function tr(key) {
        if (global.I18n && I18n.t) return I18n.t(key);
        return key;
    }

    function esc(s) {
        const d = document.createElement('div');
        d.textContent = s == null ? '' : String(s);
        return d.innerHTML;
    }

    function collectForm() {
        return {
            oidcEnabled: !!document.getElementById('lab-oidc-enabled').checked,
            oidcIssuer: document.getElementById('lab-oidc-issuer').value.trim(),
            oidcClientId: document.getElementById('lab-oidc-client-id').value.trim(),
            oidcClientSecret: document.getElementById('lab-oidc-client-secret').value,
            oidcScopes: document.getElementById('lab-oidc-scopes').value.trim(),
            oidcAdminGroups: document.getElementById('lab-oidc-admin-groups').value.trim(),
            oidcOperatorGroups: document.getElementById('lab-oidc-operator-groups').value.trim(),
            oidcAutoProvision: !!document.getElementById('lab-oidc-auto-provision').checked,
            localLoginEnabled: !!document.getElementById('lab-local-login').checked,
            trustProxy: !!document.getElementById('lab-trust-proxy').checked,
            metricsEnabled: !!document.getElementById('lab-metrics-enabled').checked,
            metricsToken: document.getElementById('lab-metrics-token').value.trim(),
            auditExportToken: document.getElementById('lab-audit-token').value.trim(),
            notes: document.getElementById('lab-notes').value.trim(),
        };
    }

    function fillForm(pub) {
        pub = pub || {};
        document.getElementById('lab-oidc-enabled').checked = !!pub.oidcEnabled;
        document.getElementById('lab-oidc-issuer').value = pub.oidcIssuer || '';
        document.getElementById('lab-oidc-client-id').value = pub.oidcClientId || 'mobility-dashboard';
        const secEl = document.getElementById('lab-oidc-client-secret');
        secEl.value = '';
        secEl.placeholder = pub.oidcClientSecretSet ? '(saved — leave blank to keep)' : 'Client secret';
        document.getElementById('lab-oidc-scopes').value = pub.oidcScopes || 'openid profile email groups';
        document.getElementById('lab-oidc-admin-groups').value = pub.oidcAdminGroups || '';
        document.getElementById('lab-oidc-operator-groups').value = pub.oidcOperatorGroups || '';
        document.getElementById('lab-oidc-auto-provision').checked = pub.oidcAutoProvision !== false;
        document.getElementById('lab-local-login').checked = pub.localLoginEnabled !== false;
        document.getElementById('lab-trust-proxy').checked = !!pub.trustProxy;
        document.getElementById('lab-metrics-enabled').checked = pub.metricsEnabled !== false;
        const mt = document.getElementById('lab-metrics-token');
        mt.value = '';
        mt.placeholder = pub.metricsTokenSet ? '(saved — leave blank to keep)' : 'Bearer token for /api/metrics';
        const at = document.getElementById('lab-audit-token');
        at.value = '';
        at.placeholder = pub.auditExportTokenSet ? '(saved — leave blank to keep)' : 'Optional SIEM export token';
        document.getElementById('lab-notes').value = pub.notes || '';
    }

    function tr(key, params) {
        if (global.I18n && I18n.t) return I18n.t(key, params);
        return key;
    }

    function renderReadiness(readiness, redirectUri) {
        const el = document.getElementById('lab-readiness');
        if (!el || !readiness) return;
        const pct = readiness.readyPct || 0;
        let rows = '';
        (readiness.items || []).forEach(function (item) {
            rows +=
                '<div class="lab-readiness-row' + (item.ok ? ' ok' : '') + '">' +
                '<span class="lab-readiness-dot" aria-hidden="true"></span>' +
                '<div><strong>' + esc(item.label) + '</strong>' +
                '<p class="setup-hint" style="margin:2px 0 0">' + esc(item.detail) + '</p></div></div>';
        });
        el.innerHTML =
            '<div class="lab-readiness-score"><strong>' + pct + '%</strong> ' +
            esc(tr('cloud.readiness.title')) + ' (' +
            esc(readiness.score) + '/' + esc(readiness.total) + ')</div>' +
            '<div class="lab-readiness-bar"><span style="width:' + pct + '%"></span></div>' +
            rows +
            (redirectUri
                ? '<p class="setup-hint" style="margin-top:10px"><strong>OIDC redirect URI</strong> (register in IdP): <code>' +
                  esc(redirectUri) + '</code></p>'
                : '');
    }

    async function loadSettings() {
        const status = document.getElementById('lab-status');
        if (status) status.textContent = 'Loading…';
        try {
            const res = await fetch('/api/lab-security/settings', { credentials: 'same-origin' });
            const data = await res.json();
            if (!res.ok || !data.ok) throw new Error((data && data.error) || 'Load failed');
            fillForm(data.public);
            renderReadiness(data.readiness, data.redirectUriHint);
            loaded = true;
            if (status) status.textContent = '';
        } catch (err) {
            if (status) status.textContent = err.message;
        }
    }

    async function saveSettings() {
        const status = document.getElementById('lab-status');
        if (status) status.textContent = 'Saving…';
        try {
            const res = await fetch('/api/lab-security/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ settings: collectForm() }),
            });
            const data = await res.json();
            if (!res.ok || !data.ok) throw new Error((data && data.error) || 'Save failed');
            fillForm(data.public);
            renderReadiness(data.readiness, data.redirectUriHint);
            if (status) status.textContent = tr('lab.savedRestart');
            setTimeout(function () {
                if (status && status.textContent.indexOf('Saved') === 0) status.textContent = '';
            }, 4000);
        } catch (err) {
            if (status) status.textContent = err.message;
        }
    }

    async function testOidc() {
        const out = document.getElementById('lab-oidc-test-result');
        if (out) out.textContent = 'Testing discovery…';
        try {
            const res = await fetch('/api/lab-security/test-oidc', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ settings: collectForm() }),
            });
            const data = await res.json();
            if (!res.ok || !data.ok) throw new Error((data && data.error) || 'Discovery failed');
            if (out) {
                out.innerHTML =
                    '<span class="lab-ok">Discovery OK</span><pre class="ss-tech-pre">' +
                    esc(JSON.stringify(data.discovery, null, 2)) +
                    '</pre><p class="setup-hint">Redirect URI: <code>' + esc(data.redirectUri) + '</code></p>';
            }
        } catch (err) {
            if (out) out.innerHTML = '<span class="lab-err">' + esc(err.message) + '</span>';
        }
    }

    function onTabShown() {
        loadSettings();
    }

    function bindUi() {
        const saveBtn = document.getElementById('lab-save');
        if (saveBtn) saveBtn.addEventListener('click', saveSettings);
        const testBtn = document.getElementById('lab-test-oidc');
        if (testBtn) testBtn.addEventListener('click', testOidc);
        const healthBtn = document.getElementById('lab-probe-health');
        if (healthBtn) {
            healthBtn.addEventListener('click', async function () {
                const el = document.getElementById('lab-probe-result');
                if (el) el.textContent = '…';
                try {
                    const res = await fetch('/api/health');
                    const data = await res.json();
                    if (el) el.textContent = JSON.stringify(data, null, 2);
                } catch (err) {
                    if (el) el.textContent = err.message;
                }
            });
        }
        const tab = document.getElementById('ss-main-tab-lab');
        if (tab) {
            tab.addEventListener('click', function () {
                const open = function () {
                    if (global.ServerSetup && ServerSetup.setMainTab) ServerSetup.setMainTab('lab');
                };
                if (global.ServerSetup && ServerSetup.runWithTechAccess) {
                    ServerSetup.runWithTechAccess(open);
                } else if (global.TechDiagnostics && TechDiagnostics.requireTech) {
                    TechDiagnostics.requireTech(open);
                } else {
                    open();
                }
            });
        }
    }

    global.LabSecurity = {
        bindUi: bindUi,
        onTabShown: onTabShown,
        loadSettings: loadSettings,
    };
})(window);
