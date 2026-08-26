/**
 * Field-engineer diagnostics \u2014 health, trace log, runbooks.
 * Separate administrator PIN (not the dashboard password).
 */
(function (global) {
    let techAuthenticated = false;
    const TIER3_IDLE_MS = 15 * 60 * 1000;
    let tier3IdleTimer = null;
    let bootRelockStarted = false;
    let _tier3PatchFile = null;

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
        } catch (_) {
            techAuthenticated = false;
        }
        updateTabVisibility();
        return techAuthenticated;
    }

    function updateTabVisibility() {
        if (global.ServerSetup && ServerSetup.syncAdvancedNav) ServerSetup.syncAdvancedNav();
        const authBtn = document.getElementById('btn-telemetry-auth');
        const tier3Panel = document.getElementById('tier3-panel');
        if (authBtn) {
            authBtn.hidden = techAuthenticated;
            authBtn.style.display = techAuthenticated ? 'none' : '';
        }
        if (tier3Panel) {
            tier3Panel.hidden = !techAuthenticated;
            tier3Panel.style.display = techAuthenticated ? '' : 'none';
        }
    }

    let _telemetryOnSuccess = null;

    function clearTier3Data() {
        ['ss-tech-health', 'ss-tech-live-viewers', 'ss-tech-runbook-list', 'ss-tech-runbook-detail'].forEach(function (id) {
            const el = document.getElementById(id);
            if (el) el.innerHTML = '';
        });
    }

    function scheduleTier3IdleLock() {
        if (tier3IdleTimer) clearTimeout(tier3IdleTimer);
        tier3IdleTimer = null;
        if (!techAuthenticated) return;
        tier3IdleTimer = setTimeout(function () {
            lockTier3Access();
        }, TIER3_IDLE_MS);
    }

    async function lockTier3Access() {
        techAuthenticated = false;
        _tier3PatchFile = null;
        if (tier3IdleTimer) clearTimeout(tier3IdleTimer);
        tier3IdleTimer = null;
        closeTelemetryModal();
        clearTier3Data();
        const nameEl = document.getElementById('tier3-patch-name');
        if (nameEl) nameEl.textContent = '';
        setPatchResult(false, '');
        updateTabVisibility();
        try {
            await fetch('/api/tech/logout', {
                method: 'POST',
                credentials: 'same-origin',
            });
        } catch (_) { /* local UI remains locked */ }
    }

    function closeTelemetryModal() {
        const modal = document.getElementById('telemetry-auth-modal');
        if (!modal) return;
        if (typeof modal.close === 'function' && modal.open) modal.close();
        else modal.removeAttribute('open');
    }

    function dismissTechGate(opts) {
        opts = opts || {};
        closeTelemetryModal();
        const backdrop = document.getElementById('ss-tech-gate-backdrop');
        if (backdrop) backdrop.hidden = true;
        if (opts.onCancel) opts.onCancel();
    }

    async function fetchDiagnosticsChallenge() {
        const nonceEl = document.getElementById('telemetry-auth-nonce');
        const errEl = document.getElementById('telemetry-auth-error');
        try {
            const res = await fetch('/api/diagnostics/challenge', {
                method: 'GET',
                credentials: 'same-origin',
                headers: { 'Accept': 'application/json' },
            });
            const data = await res.json().catch(function () { return {}; });
            const nonce = (data && (data.nonce || (data.challenge && data.challenge.nonce))) || '';
            if (!res.ok || !nonce) {
                if (errEl) {
                    errEl.textContent = techUserMessage(data, res.status, 'errors.generic');
                    errEl.hidden = false;
                }
                if (nonceEl) nonceEl.value = '';
                return null;
            }
            if (nonceEl) nonceEl.value = nonce;
            if (errEl) { errEl.hidden = true; errEl.textContent = ''; }
            return data.challenge || { nonce: nonce };
        } catch (_) {
            if (errEl) {
                errEl.textContent = tr('errors.generic');
                errEl.hidden = false;
            }
            if (nonceEl) nonceEl.value = '';
            return null;
        }
    }

    async function openTelemetryAuthModal(onSuccess) {
        const modal = document.getElementById('telemetry-auth-modal');
        const tokenEl = document.getElementById('telemetry-auth-token');
        const errEl = document.getElementById('telemetry-auth-error');
        const nonceEl = document.getElementById('telemetry-auth-nonce');
        if (!modal) return;
        _telemetryOnSuccess = onSuccess || null;
        if (tokenEl) tokenEl.value = '';
        if (nonceEl) nonceEl.value = '';
        const uploadBtn = document.getElementById('telemetry-auth-upload');
        if (uploadBtn) uploadBtn.textContent = 'Choose File';
        if (errEl) { errEl.hidden = true; errEl.textContent = ''; }
        if (typeof modal.showModal === 'function') modal.showModal();
        else modal.setAttribute('open', '');
        await fetchDiagnosticsChallenge();
        if (tokenEl) setTimeout(function () { tokenEl.focus(); }, 40);
    }

    function requireTech(onSuccess, opts) {
        if (techAuthenticated) {
            if (onSuccess) onSuccess();
            return Promise.resolve(true);
        }
        openTelemetryAuthModal(onSuccess);
        return Promise.resolve(false);
    }

    function showTechGate(onSuccess) {
        openTelemetryAuthModal(onSuccess);
    }

    async function loadTelemetryTokenFile(file) {
        const tokenEl = document.getElementById('telemetry-auth-token');
        const errEl = document.getElementById('telemetry-auth-error');
        if (!file || !tokenEl) return;
        if (file.size > 64 * 1024) {
            if (errEl) {
                errEl.textContent = 'Unlock Token file is too large.';
                errEl.hidden = false;
            }
            return;
        }
        try {
            const text = String(await file.text()).trim();
            const envelope = JSON.parse(text);
            if (!envelope || !envelope.payload || !envelope.signature) {
                throw new Error('Invalid token envelope');
            }
            tokenEl.value = text;
            if (errEl) { errEl.textContent = ''; errEl.hidden = true; }
            const uploadBtn = document.getElementById('telemetry-auth-upload');
            if (uploadBtn) uploadBtn.textContent = 'File Loaded';
        } catch (_) {
            tokenEl.value = '';
            if (errEl) {
                errEl.textContent = 'Select the signed Ubitron Unlock Token file.';
                errEl.hidden = false;
            }
        }
    }

    async function submitTelemetryUnlock() {
        const tokenEl = document.getElementById('telemetry-auth-token');
        const errEl = document.getElementById('telemetry-auth-error');
        const submitBtn = document.getElementById('telemetry-auth-submit');
        const grant = tokenEl ? String(tokenEl.value || '').trim() : '';
        if (!grant) {
            if (errEl) {
                errEl.textContent = 'Paste the Ubitron Unlock Token from License CRM.';
                errEl.hidden = false;
            }
            return;
        }
        if (submitBtn) submitBtn.disabled = true;
        try {
            const res = await fetch('/api/diagnostics/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ grant: grant }),
            });
            const data = await res.json();
            if (!res.ok || !data.ok) {
                if (errEl) {
                    errEl.textContent = techUserMessage(data, res.status, 'tech.authFailed');
                    errEl.hidden = false;
                }
                if (submitBtn) submitBtn.disabled = false;
                return;
            }
            techAuthenticated = true;
            closeTelemetryModal();
            updateTabVisibility();
            scheduleTier3IdleLock();
            const cb = _telemetryOnSuccess;
            _telemetryOnSuccess = null;
            if (cb) cb();
            else {
                if (global.ServerSetup && ServerSetup.setMainTab) ServerSetup.setMainTab('diagnostics');
                refreshAll();
            }
        } catch (_) {
            if (errEl) {
                errEl.textContent = tr('errors.generic');
                errEl.hidden = false;
            }
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    }

    async function exportTelemetryBundle() {
        const btn = document.getElementById('btn-export-telemetry');
        const statusEl = document.getElementById('tier3-export-status');
        if (btn) btn.disabled = true;
        if (statusEl) { statusEl.hidden = true; statusEl.textContent = ''; }
        try {
            const res = await fetch('/api/diagnostics/export', {
                method: 'GET',
                credentials: 'same-origin',
                headers: { 'Accept': 'application/json' },
            });
            if (!res.ok) {
                if (res.status === 401) {
                    techAuthenticated = false;
                    updateTabVisibility();
                }
                throw new Error('Export failed');
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'ubitron-telemetry-bundle.json';
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
            if (statusEl) {
                statusEl.textContent = 'Diagnostic bundle downloaded.';
                statusEl.hidden = false;
            }
        } catch (_) {
            if (statusEl) {
                statusEl.textContent = 'Could not export the diagnostic bundle.';
                statusEl.hidden = false;
            }
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    function setPatchResult(pass, text) {
        const el = document.getElementById('tier3-patch-result');
        if (!el) return;
        el.hidden = !text;
        el.textContent = text || '';
        el.classList.toggle('is-pass', !!pass);
        el.classList.toggle('is-fail', !pass && !!text);
    }

    async function checkTier3PatchPackage() {
        const checkBtn = document.getElementById('btn-tier3-patch-check');
        if (!_tier3PatchFile) {
            setPatchResult(false, 'Choose a patch ZIP first.');
            return;
        }
        if (checkBtn) checkBtn.disabled = true;
        setPatchResult(false, 'Checking…');
        try {
            const body = new FormData();
            body.append('package', _tier3PatchFile, _tier3PatchFile.name || 'patch.zip');
            const res = await fetch('/api/diagnostics/verify-patch', {
                method: 'POST',
                credentials: 'same-origin',
                body: body,
            });
            const data = await res.json().catch(function () { return {}; });
            if (res.status === 401) {
                techAuthenticated = false;
                updateTabVisibility();
                setPatchResult(false, 'Tier-3 session expired. Unlock again.');
                return;
            }
            if (!res.ok || !data.ok) {
                const errs = (data.errors && data.errors.length)
                    ? data.errors.join(' · ')
                    : (data.error ? String(data.error) : 'Check failed (server rejected upload).');
                setPatchResult(false, 'FAIL — ' + errs);
                return;
            }
            if (data.pass) {
                const tip = data.ticketId ? ('Ticket ' + data.ticketId + '. ') : '';
                const warn = (data.warnings && data.warnings.length)
                    ? (' · ' + data.warnings.join(' · '))
                    : '';
                setPatchResult(true, 'PASS — ' + tip + 'Safe to overwrite listed files manually, then restart.' + warn);
            } else {
                setPatchResult(false, 'FAIL — ' + ((data.errors && data.errors.join(' · ')) || 'Package rejected'));
            }
        } catch (_) {
            setPatchResult(false, 'FAIL — Could not reach patch check.');
        } finally {
            if (checkBtn) checkBtn.disabled = false;
        }
    }

    function healthStatusLabel(ok) {
        return ok ? tr('tech.health.ok') : tr('tech.health.down');
    }

    function licenseStatusLabel(valid) {
        return valid ? tr('tech.health.licenseValid') : tr('tech.health.licenseMissing');
    }

    function frEngineStatusLabel(fr) {
        if (!fr || fr.featureEnabled === false || fr.status === 'off') {
            return tr('tech.health.frOff');
        }
        if (fr.ok || fr.status === 'ok') return tr('tech.health.frOk');
        return tr('tech.health.frDown');
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
            const fr = h.fr || {};
            const uptimeMin = Math.max(1, Math.floor((h.uptimeSec || 0) / 60));
            const frTitle = (fr.engine && (fr.ok || fr.status === 'ok'))
                ? (' title="' + esc(String(fr.engine)) + '"')
                : '';
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
                '<div class="ss-tech-card"' + frTitle + '><strong>' + esc(tr('tech.health.frEngine')) + '</strong><span>' +
                esc(frEngineStatusLabel(fr)) + '</span></div>' +
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
                '<p class="setup-hint">' + esc(tr('tech.runbook.severity', { level: rb.severity || '\u2014' })) + '</p>' +
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
        if (!techAuthenticated) return;
        loadHealth();
        loadLiveViewers();
    }

    function isAuthenticated() {
        return techAuthenticated;
    }

    function bindUi() {
        if (!bootRelockStarted) {
            bootRelockStarted = true;
            lockTier3Access();
        }
        const diagnosticsPanel = document.getElementById('ss-panel-diagnostics');
        if (diagnosticsPanel && !diagnosticsPanel._tier3RelockObserver) {
            diagnosticsPanel._tier3RelockObserver = new MutationObserver(function () {
                if (techAuthenticated && !diagnosticsPanel.classList.contains('active')) {
                    lockTier3Access();
                }
            });
            diagnosticsPanel._tier3RelockObserver.observe(diagnosticsPanel, {
                attributes: true,
                attributeFilter: ['class'],
            });
        }
        const traceToggle = document.getElementById('ss-tech-trace-toggle');
        if (traceToggle && !traceToggle._tdBound) {
            traceToggle._tdBound = true;
            traceToggle.addEventListener('click', toggleTrace);
        }
        const healthRefresh = document.getElementById('ss-tech-health-refresh');
        if (healthRefresh && !healthRefresh._tdBound) {
            healthRefresh._tdBound = true;
            healthRefresh.addEventListener('click', loadHealth);
        }
        const lvRefresh = document.getElementById('ss-tech-live-viewers-refresh');
        if (lvRefresh && !lvRefresh._tdBound) {
            lvRefresh._tdBound = true;
            lvRefresh.addEventListener('click', loadLiveViewers);
        }
    }

    // Document-level wiring — always works even if bindUi runs late / panel was hidden
    if (!global.__telemetryAuthDelegated) {
        global.__telemetryAuthDelegated = true;
        document.addEventListener('click', function (e) {
            const t = e.target;
            if (!t || !t.closest) return;
            if (t.closest('#btn-telemetry-auth')) {
                e.preventDefault();
                if (techAuthenticated) {
                    if (global.ServerSetup && ServerSetup.setMainTab) ServerSetup.setMainTab('diagnostics');
                    refreshAll();
                    return;
                }
                openTelemetryAuthModal(function () {
                    if (global.ServerSetup && ServerSetup.setMainTab) ServerSetup.setMainTab('diagnostics');
                    refreshAll();
                });
                return;
            }
            if (t.closest('#telemetry-auth-cancel')) {
                e.preventDefault();
                closeTelemetryModal();
                return;
            }
            if (t.closest('#telemetry-auth-submit')) {
                e.preventDefault();
                submitTelemetryUnlock();
                return;
            }
            if (t.closest('#telemetry-auth-upload')) {
                e.preventDefault();
                const input = document.getElementById('telemetry-auth-file');
                if (input) input.click();
                return;
            }
            if (t.closest('#telemetry-auth-copy')) {
                e.preventDefault();
                const nonceEl = document.getElementById('telemetry-auth-nonce');
                const copyBtn = document.getElementById('telemetry-auth-copy');
                const val = nonceEl ? String(nonceEl.value || '').trim() : '';
                if (!val) return;
                const done = function () {
                    if (!copyBtn) return;
                    const prev = copyBtn.textContent;
                    copyBtn.textContent = 'Copied!';
                    setTimeout(function () { copyBtn.textContent = prev || 'Copy Nonce'; }, 1200);
                };
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(val).then(done).catch(function () {
                        try {
                            nonceEl.select();
                            document.execCommand('copy');
                            done();
                        } catch (_) { /* ignore */ }
                    });
                } else {
                    try {
                        nonceEl.select();
                        document.execCommand('copy');
                        done();
                    } catch (_) { /* ignore */ }
                }
                return;
            }
            if (t.closest('#telemetry-auth-refresh')) {
                e.preventDefault();
                fetchDiagnosticsChallenge();
                return;
            }
            if (t.closest('#btn-export-telemetry')) {
                e.preventDefault();
                exportTelemetryBundle();
                return;
            }
            if (t.closest('#btn-lock-tier3')) {
                e.preventDefault();
                lockTier3Access();
                return;
            }
            if (t.closest('#btn-tier3-patch-choose')) {
                e.preventDefault();
                const input = document.getElementById('tier3-patch-file');
                if (input) input.click();
                return;
            }
            if (t.closest('#btn-tier3-patch-check')) {
                e.preventDefault();
                checkTier3PatchPackage();
            }
        });
        ['pointerdown', 'keydown'].forEach(function (eventName) {
            document.addEventListener(eventName, function () {
                if (techAuthenticated) scheduleTier3IdleLock();
            });
        });
        document.addEventListener('change', function (e) {
            if (!e.target) return;
            if (e.target.id === 'telemetry-auth-file') {
                loadTelemetryTokenFile(e.target.files && e.target.files[0]);
                e.target.value = '';
                return;
            }
            if (e.target.id === 'tier3-patch-file') {
                _tier3PatchFile = (e.target.files && e.target.files[0]) || null;
                const nameEl = document.getElementById('tier3-patch-name');
                if (nameEl) nameEl.textContent = _tier3PatchFile ? _tier3PatchFile.name : '';
                setPatchResult(false, '');
                e.target.value = '';
            }
        });
        document.addEventListener('dragover', function (e) {
            const drop = e.target && e.target.closest ? e.target.closest('#telemetry-auth-drop') : null;
            if (!drop) return;
            e.preventDefault();
            drop.classList.add('is-dragging');
        });
        document.addEventListener('dragleave', function (e) {
            const drop = e.target && e.target.closest ? e.target.closest('#telemetry-auth-drop') : null;
            if (drop) drop.classList.remove('is-dragging');
        });
        document.addEventListener('drop', function (e) {
            const drop = e.target && e.target.closest ? e.target.closest('#telemetry-auth-drop') : null;
            if (!drop) return;
            e.preventDefault();
            drop.classList.remove('is-dragging');
            loadTelemetryTokenFile(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]);
        });
        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape') return;
            const modal = document.getElementById('telemetry-auth-modal');
            if (modal && (modal.open || modal.hasAttribute('open'))) closeTelemetryModal();
        });
    }

    global.TechDiagnostics = {
        checkSession: checkSession,
        bindUi: bindUi,
        onTabShown: onTabShown,
        refreshAll: refreshAll,
        requireTech: requireTech,
        dismissTechGate: dismissTechGate,
        isAuthenticated: isAuthenticated,
        openTelemetryAuthModal: openTelemetryAuthModal,
        lockTier3Access: lockTier3Access,
    };
})(window);
