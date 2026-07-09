/**
 * Field-engineer diagnostics — health, trace log, runbooks.
 * Separate administrator PIN (not the dashboard password).
 */
(function (global) {
    let techAuthenticated = false;

    function tr(key, params) {
        if (global.I18n && I18n.t) return I18n.t(key, params);
        return key;
    }

    function techUserMessage(data, status, fallbackKey) {
        const raw = data && data.error ? String(data.error) : '';
        const lower = raw.toLowerCase();
        if (/fm_|\.env|restart\s+fleet/.test(lower)) return tr(fallbackKey || 'errors.generic');
        if (status === 429 || lower.indexOf('too many') >= 0) return tr('tech.lockedOut');
        if (lower.indexOf('not available') >= 0 || lower.indexOf('not configured') >= 0) {
            return tr('tech.notConfigured');
        }
        if (lower.indexOf('invalid') >= 0 && lower.indexOf('pin') >= 0) return tr('tech.invalidPin');
        if (lower.indexOf('pin required') >= 0 || (lower.indexOf('required') >= 0 && lower.indexOf('pin') >= 0)) {
            return tr('tech.pinRequired');
        }
        if (status === 401 || lower.indexOf('authentication') >= 0) return tr('tech.authFailed');
        const key = data && data.errorKey;
        if (key) return tr(key);
        return tr(fallbackKey || 'errors.generic');
    }

    function esc(s) {
        const d = document.createElement('div');
        d.textContent = s == null ? '' : String(s);
        return d.innerHTML;
    }

    async function checkSession() {
        try {
            const res = await fetch('/api/tech/session', { credentials: 'same-origin' });
            const data = await res.json();
            techAuthenticated = !!(data.ok && data.authenticated);
            const link = document.getElementById('ss-tech-unlock');
            if (link) link.hidden = !data.configured;
            if (!data.configured) hideUnlockLink();
        } catch (_) {
            techAuthenticated = false;
        }
        updateTabVisibility();
        return techAuthenticated;
    }

    function hideUnlockLink() {
        const link = document.getElementById('ss-tech-unlock');
        if (link) link.hidden = true;
    }

    function updateTabVisibility() {
        const tab = document.getElementById('ss-main-tab-diagnostics');
        if (tab) tab.hidden = !techAuthenticated;
        const labTab = document.getElementById('ss-main-tab-lab');
        if (labTab) labTab.hidden = !techAuthenticated;
        if (global.ServerSetup && ServerSetup.syncAdvancedNav) ServerSetup.syncAdvancedNav();
    }

    let techEscHandler = null;

    function setTechGateA11y(show) {
        const backdrop = document.getElementById('ss-tech-gate-backdrop');
        if (!backdrop) return;
        if ('inert' in backdrop) backdrop.inert = !show;
        backdrop.setAttribute('aria-hidden', show ? 'false' : 'true');
        const pinEl = document.getElementById('ss-tech-gate-pin');
        if (pinEl) {
            pinEl.tabIndex = show ? 0 : -1;
            pinEl.disabled = !show;
        }
    }

    function dismissTechGate(opts) {
        opts = opts || {};
        const backdrop = document.getElementById('ss-tech-gate-backdrop');
        const pinEl = document.getElementById('ss-tech-gate-pin');
        if (backdrop) backdrop.hidden = true;
        setTechGateA11y(false);
        if (pinEl) pinEl.onkeydown = null;
        if (techEscHandler) {
            document.removeEventListener('keydown', techEscHandler);
            techEscHandler = null;
        }
        if (backdrop) {
            backdrop._techGateSubmit = null;
            backdrop._techGateCancel = null;
        }
        if (opts.onCancel) opts.onCancel();
    }

    function requireTech(onSuccess, opts) {
        if (techAuthenticated) {
            if (onSuccess) onSuccess();
            return Promise.resolve(true);
        }
        showTechGate(onSuccess, opts);
        return Promise.resolve(false);
    }

    function showTechGate(onSuccess, opts) {
        opts = opts || {};
        const backdrop = document.getElementById('ss-tech-gate-backdrop');
        const pinEl = document.getElementById('ss-tech-gate-pin');
        const errEl = document.getElementById('ss-tech-gate-error');
        if (!backdrop || !pinEl) {
            if (onSuccess) onSuccess();
            return;
        }
        if (!backdrop.hidden) {
            pinEl.focus();
            return;
        }
        pinEl.value = '';
        if (errEl) { errEl.hidden = true; errEl.textContent = ''; }
        backdrop.hidden = false;
        setTechGateA11y(true);

        const cancel = function () {
            if (backdrop._techGateBusy && backdrop._techGateBusy.isBusy()) return;
            dismissTechGate({ onCancel: opts.onCancel });
        };
        backdrop._techGateCancel = cancel;

        const gateSubmitBtn = document.getElementById('ss-tech-gate-submit');
        const gateCancelBtn = document.getElementById('ss-tech-gate-cancel');
        const busyCtrl = global.AuthFormBusy ? AuthFormBusy.create({
            fields: [pinEl],
            submitBtn: gateSubmitBtn,
            cancelBtns: [gateCancelBtn],
            busyLabel: tr('tech.verifying'),
        }) : null;
        backdrop._techGateBusy = busyCtrl;

        const submit = async function () {
            if (busyCtrl && busyCtrl.isBusy()) return;
            const pin = pinEl.value;
            if (!pin) {
                if (errEl) { errEl.textContent = tr('tech.pinRequired'); errEl.hidden = false; }
                return;
            }
            if (busyCtrl) busyCtrl.setBusy(true);
            try {
                const res = await fetch('/api/tech/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ pin: pin }),
                });
                const data = await res.json();
                if (!res.ok || !data.ok) {
                    if (errEl) {
                        errEl.textContent = techUserMessage(data, res.status, 'tech.authFailed');
                        errEl.hidden = false;
                    }
                    if (busyCtrl) busyCtrl.setBusy(false);
                    pinEl.focus();
                    return;
                }
                techAuthenticated = true;
                if (busyCtrl) busyCtrl.setBusy(false);
                dismissTechGate({});
                updateTabVisibility();
                if (onSuccess) onSuccess();
            } catch (_) {
                if (errEl) {
                    errEl.textContent = tr('errors.generic');
                    errEl.hidden = false;
                }
                if (busyCtrl) busyCtrl.setBusy(false);
                pinEl.focus();
            }
        };
        backdrop._techGateSubmit = submit;
        pinEl.onkeydown = function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                submit();
            }
        };
        techEscHandler = function (e) {
            if (e.key === 'Escape') {
                if (backdrop._techGateBusy && backdrop._techGateBusy.isBusy()) return;
                e.preventDefault();
                cancel();
            }
        };
        document.addEventListener('keydown', techEscHandler);
        setTimeout(function () { pinEl.focus(); }, 50);
    }

    function healthStatusLabel(ok) {
        return ok ? tr('tech.health.ok') : tr('tech.health.down');
    }

    function licenseStatusLabel(valid) {
        return valid ? tr('tech.health.licenseValid') : tr('tech.health.licenseMissing');
    }

    async function loadHealth() {
        const el = document.getElementById('ss-tech-health');
        if (!el) return;
        el.textContent = tr('common.loading');
        try {
            const res = await fetch('/api/tech/health', { credentials: 'same-origin' });
            const data = await res.json();
            if (!res.ok || !data.ok) throw new Error(techUserMessage(data, res.status, 'tech.loadFailed'));
            const h = data.health;
            const svc = h.services || {};
            const fl = h.fleet || {};
            const mem = h.memory || {};
            const lic = h.license || {};
            const uptimeMin = Math.max(1, Math.floor((h.uptimeSec || 0) / 60));
            el.innerHTML =
                '<div class="ss-tech-grid">' +
                '<div class="ss-tech-card"><strong>' + esc(tr('tech.health.uptime')) + '</strong><span>' +
                esc(tr('tech.health.uptimeValue', { min: uptimeMin })) + '</span></div>' +
                '<div class="ss-tech-card"><strong>' + esc(tr('tech.health.sip')) + '</strong><span>' +
                healthStatusLabel(!!svc.sipPortStatus) + '</span></div>' +
                '<div class="ss-tech-card"><strong>' + esc(tr('tech.health.ptt')) + '</strong><span>' +
                healthStatusLabel(!!svc.pttPortStatus) + '</span></div>' +
                '<div class="ss-tech-card"><strong>' + esc(tr('tech.health.devices')) + '</strong><span>' +
                esc(tr('tech.health.devicesValue', { online: fl.online || 0, total: fl.configured || 0 })) + '</span></div>' +
                '<div class="ss-tech-card"><strong>' + esc(tr('tech.health.live')) + '</strong><span>' +
                esc(String((h.media && h.media.activeStreams) || 0)) + '</span></div>' +
                '<div class="ss-tech-card"><strong>' + esc(tr('tech.health.memory')) + '</strong><span>' +
                esc(tr('tech.health.memoryValue', { mb: mem.heapUsedMb || 0 })) + '</span></div>' +
                '<div class="ss-tech-card"><strong>' + esc(tr('tech.health.license')) + '</strong><span>' +
                licenseStatusLabel(!!lic.valid) + '</span></div>' +
                '</div>';
            updateTraceStatus(h.trace);
        } catch (err) {
            el.textContent = err.message || tr('tech.loadFailed');
        }
    }

    function updateTraceStatus(trace) {
        const toggle = document.getElementById('ss-tech-trace-toggle');
        const note = document.getElementById('ss-tech-activity-note');
        const enabled = !!(trace && trace.enabled);
        if (toggle) {
            toggle.textContent = enabled ? tr('tech.activity.traceOn') : tr('tech.activity.traceOff');
            toggle.disabled = !!(trace && trace.envLocked);
        }
        if (note) note.textContent = tr('tech.activity.note');
    }

    async function toggleTrace() {
        try {
            const res = await fetch('/api/tech/trace', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({}),
            });
            const data = await res.json();
            if (!res.ok || !data.ok) throw new Error(techUserMessage(data, res.status, 'tech.loadFailed'));
            updateTraceStatus({ enabled: data.traceEnabled, envLocked: data.traceEnvLocked });
        } catch (err) {
            alert(err.message || tr('tech.loadFailed'));
        }
    }

    async function loadRunbooks() {
        const listEl = document.getElementById('ss-tech-runbook-list');
        const detailEl = document.getElementById('ss-tech-runbook-detail');
        if (!listEl) return;
        listEl.innerHTML = tr('common.loading');
        if (detailEl) detailEl.innerHTML = '';
        try {
            const res = await fetch('/api/tech/runbooks', { credentials: 'same-origin' });
            const data = await res.json();
            if (!res.ok || !data.ok) throw new Error(techUserMessage(data, res.status, 'tech.loadFailed'));
            listEl.innerHTML = '';
            (data.runbooks || []).forEach(function (rb) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'ss-tech-runbook-btn';
                btn.textContent = rb.title || rb.id;
                btn.addEventListener('click', function () { openRunbook(rb.id); });
                listEl.appendChild(btn);
            });
        } catch (err) {
            listEl.textContent = err.message || tr('tech.loadFailed');
        }
    }

    async function openRunbook(id) {
        const detailEl = document.getElementById('ss-tech-runbook-detail');
        if (!detailEl) return;
        detailEl.innerHTML = tr('common.loading');
        try {
            const res = await fetch('/api/tech/runbooks/' + encodeURIComponent(id), { credentials: 'same-origin' });
            const data = await res.json();
            if (!res.ok || !data.ok) throw new Error(techUserMessage(data, res.status, 'tech.loadFailed'));
            const rb = data.runbook;
            let steps = '';
            (rb.steps || []).forEach(function (s) {
                steps += '<li><strong>' + esc(tr('tech.runbook.step', { n: s.order })) + ':</strong> ' + esc(s.action);
                if (s.check) steps += ' <em>' + esc(tr('tech.runbook.check')) + ':</em> ' + esc(s.check);
                steps += '</li>';
            });
            detailEl.innerHTML =
                '<h5>' + esc(rb.title) + '</h5>' +
                '<p class="setup-hint">' + esc(tr('tech.runbook.severity', { level: rb.severity || '—' })) + '</p>' +
                '<p><strong>' + esc(tr('tech.runbook.symptoms')) + '</strong></p><ul>' +
                (rb.symptoms || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' +
                '<p><strong>' + esc(tr('tech.runbook.steps')) + '</strong></p><ol>' + steps + '</ol>';
        } catch (err) {
            detailEl.textContent = err.message || tr('tech.loadFailed');
        }
    }

    function refreshAll() {
        loadHealth();
        loadLiveViewers();
        loadRunbooks();
    }

    function loadLiveViewers() {
        const el = document.getElementById('ss-tech-live-viewers');
        if (!el || !global.LiveViewerTelemetry) return;
        LiveViewerTelemetry.loadInto(el, { useTechApi: true });
    }

    function onTabShown() {
        loadHealth();
        loadLiveViewers();
    }

    function isAuthenticated() {
        return techAuthenticated;
    }

    function bindUi() {
        checkSession();
        const unlock = document.getElementById('ss-tech-unlock');
        if (unlock) {
            unlock.addEventListener('click', function () {
                if (techAuthenticated) {
                    if (global.ServerSetup && ServerSetup.setMainTab) ServerSetup.setMainTab('diagnostics');
                    return;
                }
                const openDiag = function () {
                    if (global.ServerSetup && ServerSetup.setMainTab) ServerSetup.setMainTab('diagnostics');
                    refreshAll();
                };
                if (global.ServerSetup && ServerSetup.runWithTechAccess) {
                    ServerSetup.runWithTechAccess(openDiag);
                    return;
                }
                showTechGate(openDiag);
            });
        }
        const gateCancel = document.getElementById('ss-tech-gate-cancel');
        const gateSubmit = document.getElementById('ss-tech-gate-submit');
        const gateBackdrop = document.getElementById('ss-tech-gate-backdrop');
        if (gateCancel && gateBackdrop) {
            gateCancel.addEventListener('click', function () {
                if (typeof gateBackdrop._techGateCancel === 'function') {
                    gateBackdrop._techGateCancel();
                } else {
                    gateBackdrop.hidden = true;
                    setTechGateA11y(false);
                }
            });
        }
        if (gateSubmit && gateBackdrop) {
            gateSubmit.addEventListener('click', function () {
                if (typeof gateBackdrop._techGateSubmit === 'function') gateBackdrop._techGateSubmit();
            });
        }
        const traceToggle = document.getElementById('ss-tech-trace-toggle');
        if (traceToggle) traceToggle.addEventListener('click', toggleTrace);
        const healthRefresh = document.getElementById('ss-tech-health-refresh');
        if (healthRefresh) healthRefresh.addEventListener('click', loadHealth);
        const lvRefresh = document.getElementById('ss-tech-live-viewers-refresh');
        if (lvRefresh) lvRefresh.addEventListener('click', loadLiveViewers);
        const diagTab = document.getElementById('ss-main-tab-diagnostics');
        if (diagTab) {
            diagTab.addEventListener('click', function () {
                const openDiag = function () {
                    if (global.ServerSetup && ServerSetup.setMainTab) ServerSetup.setMainTab('diagnostics');
                    return refreshAll();
                };
                if (global.ServerSetup && ServerSetup.runWithTechAccess) {
                    ServerSetup.runWithTechAccess(openDiag);
                    return;
                }
                requireTech(openDiag);
            });
        }
    }

    global.TechDiagnostics = {
        checkSession: checkSession,
        bindUi: bindUi,
        onTabShown: onTabShown,
        refreshAll: refreshAll,
        requireTech: requireTech,
        dismissTechGate: dismissTechGate,
        isAuthenticated: isAuthenticated,
    };
})(window);
