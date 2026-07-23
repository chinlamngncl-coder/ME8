/**
 * Cloud Deployment \u2014 site profile, entitlements, public access, central verification.
 * Super-admin only. Does not touch live video, SOS, or PTT paths.
 */
(function (global) {
    function esc(s) {
        const d = document.createElement('div');
        d.textContent = s == null ? '' : String(s);
        return d.innerHTML;
    }

    function tr(key, params) {
        if (global.I18n && I18n.t) return I18n.t(key, params);
        return key;
    }

    function pctBar(pct) {
        return '<div class="lab-readiness-bar"><span style="width:' + esc(pct) + '%"></span></div>';
    }

    function renderReadiness(readiness) {
        const el = document.getElementById('cd-readiness');
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
            tr('cloud.readiness.title') + ' (' + esc(readiness.score) + '/' + esc(readiness.total) + ')</div>' +
            pctBar(pct) + rows;
    }

    function renderEntitlements(data) {
        const el = document.getElementById('cd-entitlements');
        if (!el || !data) return;
        const lic = data.license || {};
        const usage = data.usage || {};
        const limits = data.limits || {};
        const bwcPct = limits.maxBwcDevices
            ? Math.min(100, Math.round(((usage.bwcDevices || 0) / limits.maxBwcDevices) * 100))
            : 0;
        const userPct = limits.maxDashboardUsers
            ? Math.min(100, Math.round(((usage.dashboardUsers || 0) / limits.maxDashboardUsers) * 100))
            : 0;
        const statusClass = lic.valid ? 'cd-status-ok' : 'cd-status-warn';
        const statusText = lic.valid
            ? tr('cloud.entitlement.active')
            : (lic.required ? tr('cloud.entitlement.required') : tr('cloud.entitlement.optional'));
        el.innerHTML =
            '<div class="cd-entitlement-card ' + statusClass + '">' +
            '<div class="cd-entitlement-head"><strong>' + esc(lic.customerName || tr('cloud.entitlement.none')) + '</strong>' +
            '<span class="cd-entitlement-badge">' + esc(statusText) + '</span></div>' +
            '<p class="setup-hint" style="margin:6px 0">' +
            (lic.licenseId ? (tr('cloud.entitlement.reference') + ': <code>' + esc(lic.licenseId) + '</code>') : tr('cloud.entitlement.installNote')) +
            (lic.expiresAt ? (' \u00B7 ' + tr('cloud.entitlement.validUntil') + ' ' + esc(String(lic.expiresAt).slice(0, 10))) : '') +
            '</p>' +
            '<div class="cd-meter"><span>' + tr('cloud.entitlement.cameras') + '</span>' +
            '<div class="cd-meter-bar"><span style="width:' + bwcPct + '%"></span></div>' +
            '<span class="cd-meter-val">' + esc(usage.bwcDevices || 0) + ' / ' + esc(limits.maxBwcDevices || '\u2014') + '</span></div>' +
            '<div class="cd-meter"><span>' + tr('cloud.entitlement.operators') + '</span>' +
            '<div class="cd-meter-bar"><span style="width:' + userPct + '%"></span></div>' +
            '<span class="cd-meter-val">' + esc(usage.dashboardUsers || 0) + ' / ' + esc(limits.maxDashboardUsers || '\u2014') + '</span></div>' +
            '</div>';
    }

    function renderProgram(program) {
        const el = document.getElementById('cd-program');
        if (!el || !program) return;
        let rows = '';
        (program.phases || []).forEach(function (p) {
            const titleKey = 'cloud.program.p' + p.id + 'title';
            const title = tr(titleKey);
            rows +=
                '<div class="cd-program-phase ' + esc(p.status) + '">' +
                '<span class="cd-program-badge">' + esc(tr('cloud.program.phase') + ' ' + p.id + ' \u00B7 ' + p.label) + '</span>' +
                '<div><strong>' + esc(title !== titleKey ? title : ('Phase ' + p.id)) + '</strong>' +
                '<p class="setup-hint" style="margin:2px 0 0">' + esc(p.detail) + '</p></div></div>';
        });
        el.innerHTML =
            '<h5 style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8">' +
            tr('cloud.program.title') + '</h5>' +
            rows +
            (program.tenderLanguage
                ? ('<div class="cd-program-tender"><strong>' + tr('cloud.program.proposalLanguage') + '</strong> ' + esc(program.tenderLanguage) + '</div>')
                : '');
    }

    function renderOpsGuide(guide) {
        const el = document.getElementById('cd-ops-guide');
        if (!el || !guide) return;
        el.innerHTML =
            '<dt>' + tr('cloud.ops.portal') + '</dt><dd><code>MobilityC2-VENDOR-IMPORTANT\\OperationsPortal</code></dd>' +
            '<dt>' + tr('cloud.ops.registry') + '</dt><dd><code>customers.template.csv</code></dd>' +
            '<dt>' + tr('cloud.ops.noc') + '</dt><dd><code>node tools/noc-poll-sites.js --config tools/noc-sites.example.json</code></dd>' +
            '<dt>' + tr('cloud.ops.checkin') + '</dt><dd><code>POST /api/v1/site-checkin</code> ' + tr('cloud.ops.checkinHint') + '</dd>';
    }

    function renderArchitecture(arch, program) {
        const el = document.getElementById('cd-architecture');
        if (!el || !arch) return;
        const rows = [
            { label: tr('cloud.arch.dedicatedSite'), ok: arch.dedicatedSiteDeployment, note: tr('cloud.arch.dedicatedSiteNote') },
            { label: tr('cloud.arch.verification'), ok: arch.onlineEntitlementVerification, note: tr('cloud.arch.verificationNote') },
            { label: tr('cloud.arch.sharedPlatform'), ok: arch.sharedMultiOrganizationPlatform, note: tr('cloud.arch.sharedPlatformNote') },
            { label: tr('cloud.arch.centralConsole'), ok: arch.centralOperationsConsole, note: tr('cloud.arch.centralConsoleNote') },
            { label: tr('cloud.arch.storageQuotas'), ok: arch.perOrganizationStorageQuotas, note: tr('cloud.arch.storageQuotasNote') },
            { label: tr('cloud.arch.featureTiers'), ok: arch.featureTierEnforcement, note: tr('cloud.arch.featureTiersNote') },
        ];
        el.innerHTML = rows.map(function (r) {
            return '<div class="cd-arch-row">' +
                '<span class="cd-arch-state ' + (r.ok ? 'on' : 'planned') + '">' + (r.ok ? tr('cloud.arch.available') : tr('cloud.arch.planned')) + '</span>' +
                '<div><strong>' + esc(r.label) + '</strong><p class="setup-hint" style="margin:2px 0 0">' + esc(r.note) + '</p></div></div>';
        }).join('');
    }

    function renderVerificationStatus(data) {
        const el = document.getElementById('cd-verification-status');
        if (!el) return;
        const hb = (data && data.heartbeat) || {};
        if (!hb.configured) {
            el.innerHTML = '<p class="setup-hint">' + tr('cloud.verification.notConfigured') + '</p>';
            return;
        }
        const ok = hb.ok === true;
        el.innerHTML =
            '<div class="cd-verify-row"><span>' + tr('cloud.verification.endpoint') + '</span><code>' + esc(hb.url || '\u2014') + '</code></div>' +
            '<div class="cd-verify-row"><span>' + tr('cloud.verification.lastCheck') + '</span><span>' +
            esc(hb.lastAttemptAt ? String(hb.lastAttemptAt).slice(0, 19).replace('T', ' ') : '\u2014') + '</span></div>' +
            '<div class="cd-verify-row"><span>' + tr('cloud.verification.lastSuccess') + '</span><span class="' + (ok ? 'lab-ok' : 'lab-err') + '">' +
            esc(hb.lastSuccessAt ? String(hb.lastSuccessAt).slice(0, 19).replace('T', ' ') : tr('cloud.verification.never')) +
            (hb.revoked ? (' \u00B7 ' + tr('cloud.verification.revoked')) : '') +
            '</span></div>' +
            (hb.message ? ('<p class="setup-hint">' + esc(hb.message) + '</p>') : '');
    }

    function renderFirewall(rows) {
        const el = document.getElementById('cd-firewall');
        if (!el) return;
        if (!rows || !rows.length) {
            el.innerHTML = '<p class="setup-hint">\u2014</p>';
            return;
        }
        el.innerHTML = '<table class="cd-firewall-table"><thead><tr><th>' + tr('cloud.firewall.service') +
            '</th><th>' + tr('cloud.firewall.port') + '</th><th>' + tr('cloud.firewall.note') + '</th></tr></thead><tbody>' +
            rows.map(function (r) {
                return '<tr><td>' + esc(r.service || r.label) + '</td><td><code>' + esc(r.port) +
                    (r.protocol ? (' ' + esc(r.protocol)) : '') + '</code></td><td>' + esc(r.note || '') + '</td></tr>';
            }).join('') + '</tbody></table>';
    }

    function fillForm(data) {
        const pub = data.public || {};
        const dep = data.deployment || {};
        const net = data.network || {};
        const set = function (id, val) {
            const el = document.getElementById(id);
            if (el) el.value = val == null ? '' : val;
        };
        const setCheck = function (id, val) {
            const el = document.getElementById(id);
            if (el) el.checked = !!val;
        };
        set('cd-site-reference', pub.siteReferenceId);
        set('cd-region', pub.regionLabel);
        set('cd-org-name', pub.organizationLegalName || dep.tenantName);
        set('cd-ops-email', pub.operationsContactEmail);
        set('cd-deployment-mode', dep.mode || 'cloud');
        set('cd-operator-url', dep.operatorUrl);
        set('cd-wan-public-ip', net.wanPublicIp);
        set('cd-wan-ddns', net.ddnsHostname);
        set('cd-bwc-register-ip', net.publicHost);
        setCheck('cd-enable-verification', pub.enableEntitlementVerification);
        set('cd-verification-url', pub.entitlementCheckUrl);
        set('cd-verification-interval', pub.entitlementCheckIntervalHours || 24);
        const tok = document.getElementById('cd-verification-token');
        if (tok) {
            tok.value = '';
            tok.placeholder = pub.entitlementCheckTokenSet
                ? tr('cloud.verification.tokenSaved')
                : tr('cloud.verification.tokenPlaceholder');
        }
        set('cd-notes', pub.notes);
    }

    function collectForm() {
        const tokEl = document.getElementById('cd-verification-token');
        return {
            cloud: {
                siteReferenceId: document.getElementById('cd-site-reference').value.trim(),
                regionLabel: document.getElementById('cd-region').value.trim(),
                organizationLegalName: document.getElementById('cd-org-name').value.trim(),
                operationsContactEmail: document.getElementById('cd-ops-email').value.trim(),
                enableEntitlementVerification: !!document.getElementById('cd-enable-verification').checked,
                entitlementCheckUrl: document.getElementById('cd-verification-url').value.trim(),
                entitlementCheckToken: tokEl ? tokEl.value : '',
                entitlementCheckIntervalHours: parseInt(document.getElementById('cd-verification-interval').value, 10) || 24,
                notes: document.getElementById('cd-notes').value.trim(),
            },
            deployment: {
                mode: document.getElementById('cd-deployment-mode').value,
                operatorUrl: document.getElementById('cd-operator-url').value.trim(),
                tenantName: document.getElementById('cd-org-name').value.trim(),
            },
            publicHost: document.getElementById('cd-bwc-register-ip').value.trim(),
            network: {
                wan: {
                    publicIp: document.getElementById('cd-wan-public-ip').value.trim(),
                    ddnsHostname: document.getElementById('cd-wan-ddns').value.trim(),
                },
            },
        };
    }

    function applyOverview(data) {
        if (!data) return;
        fillForm(data);
        renderReadiness(data.readiness);
        renderProgram(data.program);
        renderEntitlements(data);
        renderArchitecture(data.architecture, data.program);
        renderVerificationStatus(data);
        renderFirewall(data.firewallRows);
        renderOpsGuide(data.operationsGuide);
    }

    async function loadOverview() {
        const status = document.getElementById('cd-status');
        if (status) status.textContent = tr('common.loading');
        try {
            const res = await fetch('/api/cloud-deployment/overview', { credentials: 'same-origin' });
            const data = await res.json();
            if (!res.ok || !data.ok) throw new Error((data && data.error) || tr('cloud.loadFailed'));
            applyOverview(data);
            if (status) status.textContent = '';
        } catch (err) {
            if (status) status.textContent = err.message;
        }
    }

    async function saveSettings() {
        const status = document.getElementById('cd-status');
        if (status) status.textContent = tr('cloud.saving');
        try {
            const formBody = collectForm();
            const payload = global.AuthReverify && AuthReverify.withReverify
                ? await AuthReverify.withReverify(formBody)
                : formBody;
            const res = await fetch('/api/cloud-deployment/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok || !data.ok) throw new Error((data && data.error) || tr('cloud.saveFailed'));
            applyOverview(data);
            if (status) status.textContent = tr('cloud.saved');
            if (global.ServerSetup && ServerSetup.reloadSettings) {
                ServerSetup.reloadSettings().catch(function () { /* ignore */ });
            }
            setTimeout(function () {
                if (status && status.textContent === tr('cloud.saved')) status.textContent = '';
            }, 4000);
        } catch (err) {
            if (status) status.textContent = err.message;
        }
    }

    async function verifyEntitlements() {
        const status = document.getElementById('cd-status');
        if (status) status.textContent = tr('cloud.verification.running');
        try {
            const res = await fetch('/api/cloud-deployment/verify-entitlements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({}),
            });
            const data = await res.json();
            if (!res.ok || !data.ok) throw new Error((data && data.error) || tr('cloud.verification.failed'));
            applyOverview(data);
            if (status) status.textContent = tr('cloud.verification.complete');
            setTimeout(function () {
                if (status && status.textContent === tr('cloud.verification.complete')) status.textContent = '';
            }, 3000);
        } catch (err) {
            if (status) status.textContent = err.message;
        }
    }

    function onTabShown() {
        loadOverview();
    }

    function bindUi() {
        const saveBtn = document.getElementById('cd-save');
        if (saveBtn) saveBtn.addEventListener('click', saveSettings);
        const verifyBtn = document.getElementById('cd-verify-now');
        if (verifyBtn) verifyBtn.addEventListener('click', verifyEntitlements);
        const tab = document.getElementById('ss-main-tab-cloud');
        if (tab) tab.addEventListener('click', function () {
            if (global.ServerSetup && ServerSetup.setMainTab) ServerSetup.setMainTab('cloud');
        });
    }

    global.CloudDeployment = {
        bindUi: bindUi,
        onTabShown: onTabShown,
        loadOverview: loadOverview,
    };
})(window);
