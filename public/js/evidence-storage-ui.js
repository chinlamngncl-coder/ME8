/**
 * Evidence storage settings — industry-style layout (local vs IP SAN/NAS, test, apply, scan).
 */
(function (global) {
    let lastPayload = null;
    let canManage = false;
    let pathPickerTargetId = null;
    let pathPickerStart = null;
    let pathPickerCwd = null;
    let pathPickerParent = null;
    let pathPickerParentIsRoots = false;
    let pathPickerValue = '';

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

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/"/g, '&quot;');
    }

    function $(id) { return document.getElementById(id); }

    function readFtpForm() {
        return {
            enabled: !!($('ss-ftp-enabled') && $('ss-ftp-enabled').checked),
            port: ($('ss-ftp-port') || {}).value ? parseInt($('ss-ftp-port').value, 10) : 21,
            user: ($('ss-ftp-user') || {}).value ? $('ss-ftp-user').value.trim() : '',
            password: ($('ss-ftp-pass') || {}).value ? $('ss-ftp-pass').value : '',
            pasvMin: ($('ss-ftp-pasv-min') || {}).value ? parseInt($('ss-ftp-pasv-min').value, 10) : 20000,
            pasvMax: ($('ss-ftp-pasv-max') || {}).value ? parseInt($('ss-ftp-pasv-max').value, 10) : 20100,
        };
    }

    function renderFtpServiceState(ftp, runtime) {
        const svcEl = $('ss-ftp-service-state');
        const passEl = $('ss-ftp-pass-status');
        const rt = runtime || {};
        const f = ftp || {};
        if (svcEl) {
            let badge = '<span class="ev-st-badge ev-st-muted">—</span>';
            if (!f.enabled) {
                badge = '<span class="ev-st-badge ev-st-muted">' + esc(tr('server.dock.stopped')) + '</span>';
            } else if (rt.ftpListening) {
                badge = '<span class="ev-st-badge ev-st-ok">' + esc(tr('server.dock.running')) + '</span>';
            } else if (f.passwordConfigured) {
                badge = '<span class="ev-st-badge ev-st-warn">' + esc(tr('evidence.ftpServiceStarting')) + '</span>';
            } else {
                badge = '<span class="ev-st-badge ev-st-bad">' + esc(tr('evidence.ftpServiceNeedsPassword')) + '</span>';
            }
            svcEl.innerHTML = badge;
        }
        if (passEl) {
            const passBadge = f.passwordConfigured
                ? '<span class="ev-st-badge ev-st-ok">' + esc(tr('server.secrets.configured')) + '</span>'
                : '<span class="ev-st-badge ev-st-bad">' + esc(tr('server.secrets.notSet')) + '</span>';
            passEl.innerHTML = passBadge;
        }
    }

    function refreshFtpSecretFieldUi(configured) {
        if (global.ServerSetup && ServerSetup.updateSecretFieldUi) {
            ServerSetup.updateSecretFieldUi('ss-ftp-pass', 'ss-ftp-pass-field-status', !!configured);
            return;
        }
        const input = $('ss-ftp-pass');
        const badge = $('ss-ftp-pass-field-status');
        if (!input || !badge) return;
        const pending = !!input.value;
        input.dataset.configured = configured ? '1' : '0';
        if (pending) {
            badge.textContent = tr('server.secrets.pendingSave');
            badge.className = 'ss-secret-status ev-st-badge ev-st-warn';
            input.placeholder = tr('evidence.ftpPasswordPlaceholder');
        } else if (configured) {
            badge.textContent = tr('server.secrets.configured');
            badge.className = 'ss-secret-status ev-st-badge ev-st-ok';
            input.placeholder = tr('server.secrets.passwordPlaceholderConfigured');
        } else {
            badge.textContent = tr('server.secrets.notSet');
            badge.className = 'ss-secret-status ev-st-badge ev-st-bad';
            input.placeholder = tr('evidence.ftpPasswordPlaceholder');
        }
    }

    function fillFtpForm(ftp, runtime) {
        const f = ftp || {};
        if ($('ss-ftp-enabled')) $('ss-ftp-enabled').checked = !!f.enabled;
        if ($('ss-ftp-host')) $('ss-ftp-host').value = f.host || '';
        if ($('ss-ftp-port')) $('ss-ftp-port').value = f.port != null ? String(f.port) : '21';
        if ($('ss-ftp-user')) $('ss-ftp-user').value = f.user || '';
        if ($('ss-ftp-pasv-min')) $('ss-ftp-pasv-min').value = f.pasvMin != null ? String(f.pasvMin) : '20000';
        if ($('ss-ftp-pasv-max')) $('ss-ftp-pasv-max').value = f.pasvMax != null ? String(f.pasvMax) : '20100';
        if ($('ss-ftp-pass')) $('ss-ftp-pass').value = '';
        renderFtpServiceState(f, runtime);
        refreshFtpSecretFieldUi(!!f.passwordConfigured);
    }

    async function saveFtpSettings() {
        if (!canManage) {
            alert(tr('evidence.storageAdminRequired'));
            return;
        }
        const msg = $('ev-ftp-msg');
        if (msg) msg.textContent = tr('evidenceHub.loading');
        const form = readFtpForm();
        try {
            const payload = global.AuthReverify && AuthReverify.withReverify
                ? await AuthReverify.withReverify({ ftp: form })
                : { ftp: form };
            const res = await fetch('/api/ftp-settings', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok || !data.ok) throwCatalogErr(data);
            if ($('ss-ftp-pass')) $('ss-ftp-pass').value = '';
            fillFtpForm(data.ftp, data.runtime);
            if (global.ServerSetup && global.ServerSetup.refreshDockPanel) {
                await global.ServerSetup.refreshDockPanel();
            }
            if (msg) {
                msg.textContent = data.ftpRestarted
                    ? tr('evidence.ftpSavedRestarted')
                    : tr('evidence.ftpSaved');
            }
            await loadContextRail();
        } catch (err) {
            const text = catalogMsg(err.opPayload || err.catalogPayload, err);
            if (msg) msg.textContent = text;
            alert(text);
        }
    }

    function readForm() {
        const primaryEl = $('ss-evidence-archive-primary');
        const tier = primaryEl ? primaryEl.value : 'local';
        return {
            archivePrimary: tier,
            nasMountPath: ($('ss-evidence-nas-path') || {}).value ? $('ss-evidence-nas-path').value.trim() : '',
            liveCaptureEnabled: !!($('ss-evidence-live-enabled') && $('ss-evidence-live-enabled').checked),
            liveCaptureAutoOnSos: !!($('ss-evidence-live-auto-sos') && $('ss-evidence-live-auto-sos').checked),
            liveCapturePath: ($('ss-evidence-live-path') || {}).value ? $('ss-evidence-live-path').value.trim() : '',
            ftpUploadPath: ($('ss-ftp-upload-path') || {}).value ? $('ss-ftp-upload-path').value.trim() : '',
            dockFtpTargetNote: ($('ss-evidence-dock-note') || {}).value ? $('ss-evidence-dock-note').value.trim() : '',
        };
    }

    async function loadContextRail() {
        if (!global.EvContextRail || !EvContextRail.refresh) return;
        await EvContextRail.refresh('settings', {
            ftpSvc: ($('ss-ftp-service-state') || {}).textContent || '—',
        });
    }

    function statusBadge(ok, writable, label) {
        if (ok === null || ok === undefined) return '<span class="ev-st-badge ev-st-muted">—</span>';
        if (ok && writable) {
            return '<span class="ev-st-badge ev-st-ok">✓ ' + esc(label || tr('evidence.storageStatusOk')) + '</span>';
        }
        if (ok) {
            return '<span class="ev-st-badge ev-st-warn">⚠ ' + esc(tr('evidence.storageStatusReadOnly')) + '</span>';
        }
        return '<span class="ev-st-badge ev-st-bad">✗ ' + esc(tr('evidence.storageStatusMissing')) + '</span>';
    }

    function renderPathStatuses(data) {
        const v = (data && data.pathValidation) || {};
        const ftpEl = $('ev-path-status-ftp');
        const liveEl = $('ev-path-status-live');
        const mountEl = $('ev-path-status-mount');
        if (ftpEl) {
            ftpEl.innerHTML = statusBadge(v.ftp, v.ftpDetail && v.ftpDetail.writable, tr('evidence.storageStatusOk'));
        }
        if (liveEl) {
            liveEl.innerHTML = statusBadge(v.liveCapture, v.liveCaptureDetail && v.liveCaptureDetail.writable, tr('evidence.storageStatusOk'));
        }
        if (mountEl) {
            mountEl.innerHTML = statusBadge(v.nas, v.nasDetail && v.nasDetail.writable, tr('evidence.storageStatusMounted'));
        }
        const recEl = $('ev-storage-recommended');
        const net = data && data.networkStorage;
        if (recEl && net && net.recommended) {
            recEl.innerHTML =
                '<dt>' + tr('evidence.storageRecFtp') + '</dt><dd><code>' + esc(net.recommended.ftp) + '</code></dd>'
                + '<dt>' + tr('evidence.storageRecLive') + '</dt><dd><code>' + esc(net.recommended.liveCapture) + '</code></dd>';
            recEl.hidden = !net.enabled;
        } else if (recEl) {
            recEl.hidden = true;
        }
    }

    function toggleNetworkPanel() {
        const primaryEl = $('ss-evidence-archive-primary');
        const panel = $('ev-network-panel');
        const isNet = primaryEl && primaryEl.value === 'network';
        if (panel) panel.hidden = !isNet;
        const noteEl = $('ss-evidence-installer-note');
        if (noteEl && isNet) noteEl.hidden = false;
        const localRadio = $('ss-evidence-archive-local');
        const netRadio = $('ss-evidence-archive-network');
        if (localRadio) localRadio.checked = !isNet;
        if (netRadio) netRadio.checked = !!isNet;
    }

    function syncTierFromRadios() {
        const netRadio = $('ss-evidence-archive-network');
        const primaryEl = $('ss-evidence-archive-primary');
        if (primaryEl && netRadio) {
            primaryEl.value = netRadio.checked ? 'network' : 'local';
        }
        toggleNetworkPanel();
    }

    function setManageState() {
        canManage = !!(global.ServerSetup && ServerSetup.canManageServer && ServerSetup.canManageServer());
        const ids = [
            'ss-evidence-archive-primary', 'ss-evidence-nas-path', 'ss-evidence-live-enabled',
            'ss-evidence-live-auto-sos', 'ss-evidence-live-path', 'ss-ftp-upload-path',
            'ss-ftp-enabled', 'ss-ftp-port', 'ss-ftp-user', 'ss-ftp-pass',
            'ss-ftp-pasv-min', 'ss-ftp-pasv-max', 'ev-ftp-save',
            'ev-storage-save', 'ev-storage-test', 'ev-storage-apply', 'ev-storage-scan',
        ];
        ids.forEach(function (id) {
            const el = $(id);
            if (el) el.disabled = !canManage && el.tagName !== 'DIV';
        });
        document.querySelectorAll('.ev-path-browse, .ev-path-default').forEach(function (btn) {
            btn.disabled = !canManage;
        });
    }

    async function fetchSettings() {
        const res = await fetch('/api/evidence-settings', { credentials: 'same-origin' });
        const data = await res.json();
        if (!res.ok || !data.ok) throwCatalogErr(data);
        lastPayload = data;
        return data;
    }

    function syncLiveAutoSosToggle() {
        const enabledEl = $('ss-evidence-live-enabled');
        const autoEl = $('ss-evidence-live-auto-sos');
        if (autoEl && enabledEl) {
            autoEl.disabled = !enabledEl.checked;
            if (!enabledEl.checked) autoEl.checked = false;
        }
    }

    async function refresh() {
        setManageState();
        if (global.ServerSetup && ServerSetup.refreshDockPanel) {
            await global.ServerSetup.refreshDockPanel();
        }
        try {
            const data = await fetchSettings();
            const ev = data.evidence || {};
            const primaryEl = $('ss-evidence-archive-primary');
            const ap = ev.archivePrimary === 'network' || ev.archivePrimary === 'nas' || ev.archivePrimary === 'san'
                ? 'network' : 'local';
            if (primaryEl) primaryEl.value = ap;
            const localRadio = $('ss-evidence-archive-local');
            const netRadio = $('ss-evidence-archive-network');
            if (localRadio) localRadio.checked = ap === 'local';
            if (netRadio) netRadio.checked = ap === 'network';
            if ($('ss-evidence-live-enabled')) $('ss-evidence-live-enabled').checked = !!ev.liveCaptureEnabled;
            if ($('ss-evidence-live-auto-sos')) {
                $('ss-evidence-live-auto-sos').checked = ev.liveCaptureAutoOnSos != null
                    ? !!ev.liveCaptureAutoOnSos
                    : !!ev.liveCaptureEnabled;
            }
            syncLiveAutoSosToggle();
            if ($('ss-evidence-live-path')) $('ss-evidence-live-path').value = ev.liveCapturePath || '';
            if ($('ss-evidence-nas-path')) $('ss-evidence-nas-path').value = ev.nasMountPath || '';
            if ($('ss-ftp-upload-path')) {
                $('ss-ftp-upload-path').value = (data.docking && data.docking.ftpUploadPath) || '';
            }
            if ($('ss-evidence-live-folder')) $('ss-evidence-live-folder').textContent = data.liveCaptureLabel || '—';
            if ($('ss-dock-folder')) $('ss-dock-folder').textContent = data.ftpLabel || '—';
            fillFtpForm(data.ftp, data.runtime);
            toggleNetworkPanel();
            renderPathStatuses(data);
        } catch (err) {
            const el = $('ev-storage-msg');
            if (el) el.textContent = catalogMsg(err.opPayload || err.catalogPayload, err);
        }
        await loadContextRail();
    }

    async function testPaths() {
        const msg = $('ev-storage-msg');
        if (msg) msg.textContent = tr('evidenceHub.loading');
        try {
            const form = readForm();
            const res = await fetch('/api/evidence-settings/test-paths', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ evidence: form }),
            });
            const data = await res.json();
            if (!res.ok || !data.ok) throwCatalogErr(data);
            lastPayload = data;
            renderPathStatuses(data);
            if (msg) msg.textContent = tr('evidence.storageTestDone');
            await loadContextRail();
        } catch (err) {
            if (msg) msg.textContent = catalogMsg(err.opPayload || err.catalogPayload, err);
        }
    }

    async function saveStorage(applyRecommended) {
        if (!canManage) {
            alert(tr('evidence.storageAdminRequired'));
            return;
        }
        const msg = $('ev-storage-msg');
        if (msg) msg.textContent = tr('evidenceHub.loading');
        const form = readForm();
        try {
            const payload = global.AuthReverify && AuthReverify.withReverify
                ? await AuthReverify.withReverify({
                    applyRecommended: !!applyRecommended,
                    evidence: Object.assign({}, form, { applyRecommended: !!applyRecommended }),
                })
                : {
                    applyRecommended: !!applyRecommended,
                    evidence: Object.assign({}, form, { applyRecommended: !!applyRecommended }),
                };
            const res = await fetch('/api/evidence-settings', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok || !data.ok) throwCatalogErr(data);
            lastPayload = data;
            if ($('ss-evidence-live-folder')) $('ss-evidence-live-folder').textContent = data.liveCaptureLabel || '—';
            if ($('ss-dock-folder')) $('ss-dock-folder').textContent = data.ftpLabel || '—';
            if (applyRecommended && data.networkStorage && data.networkStorage.recommended) {
                if ($('ss-ftp-upload-path')) $('ss-ftp-upload-path').value = data.networkStorage.recommended.ftp;
                if ($('ss-evidence-live-path')) $('ss-evidence-live-path').value = data.networkStorage.recommended.liveCapture;
            }
            renderPathStatuses(data);
            if (typeof global.loadStoragePaths === 'function') global.loadStoragePaths();
            if (msg) msg.textContent = tr('evidence.storageSaved');
            await loadContextRail();
        } catch (err) {
            if (msg) msg.textContent = catalogMsg(err.opPayload || err.catalogPayload, err);
            alert(catalogMsg(err.opPayload || err.catalogPayload, err));
        }
    }

    async function scanCatalog() {
        if (!canManage) return;
        const msg = $('ev-storage-msg');
        if (msg) msg.textContent = tr('evidenceHub.loading');
        try {
            const res = await fetch('/api/evidence/scan-catalog', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: '{}',
            });
            const data = await res.json();
            if (!res.ok || !data.ok) throwCatalogErr(data);
            if (msg) msg.textContent = tr('evidence.storageScanDone', { n: data.indexed || 0 });
            if (global.EvidenceHub && EvidenceHub.refreshCurrentPanel) EvidenceHub.refreshCurrentPanel();
            else await loadContextRail();
        } catch (err) {
            if (msg) msg.textContent = catalogMsg(err.opPayload || err.catalogPayload, err);
        }
    }

    async function backupCatalog() {
        if (!canManage) return;
        const msg = $('ev-storage-msg');
        try {
            const res = await fetch('/api/storage/backup', { method: 'POST', credentials: 'same-origin' });
            const data = await res.json();
            if (!res.ok || !data.ok) throwCatalogErr(data);
            if (msg) msg.textContent = tr('evidenceHub.storageBackupDone');
        } catch (err) {
            if (msg) msg.textContent = catalogMsg(err.opPayload || err.catalogPayload, err);
        }
    }

    function closePathPicker() {
        const backdrop = $('ev-path-picker');
        if (backdrop) backdrop.hidden = true;
        pathPickerTargetId = null;
        pathPickerStart = null;
        pathPickerCwd = null;
        pathPickerParent = null;
        pathPickerParentIsRoots = false;
        pathPickerValue = '';
    }

    function renderPathPickerList(data) {
        const listEl = $('ev-path-picker-list');
        const cwdEl = $('ev-path-picker-cwd');
        const upBtn = $('ev-path-picker-up');
        const selectBtn = $('ev-path-picker-select');
        if (!listEl) return;

        pathPickerCwd = data.cwd || null;
        pathPickerParent = data.parent;
        pathPickerParentIsRoots = !!data.parentIsRoots;
        pathPickerValue = data.valueForSettings || '';

        if (cwdEl) {
            cwdEl.textContent = data.mode === 'roots'
                ? tr('evidence.storageBrowseRoots')
                : (data.cwdLabel || data.cwd || '—');
        }
        if (upBtn) upBtn.disabled = data.mode === 'roots';
        if (selectBtn) selectBtn.disabled = data.mode === 'roots';

        if (data.readError) {
            listEl.innerHTML = '<p class="hint" style="padding:10px">' + esc(data.readError) + '</p>';
            return;
        }

        const entries = data.entries || [];
        if (!entries.length) {
            listEl.innerHTML = '<p class="hint" style="padding:10px">—</p>';
            return;
        }

        listEl.innerHTML = entries.map(function (entry) {
            const hint = entry.hint ? '<span class="ev-path-picker-hint">' + esc(entry.hint) + '</span>' : '';
            return '<button type="button" class="ev-path-picker-item" data-path="' + encodeURIComponent(entry.path) + '">'
                + esc(entry.name) + hint + '</button>';
        }).join('');

        listEl.querySelectorAll('.ev-path-picker-item').forEach(function (btn) {
            btn.addEventListener('click', function () {
                loadPathPicker(decodeURIComponent(btn.getAttribute('data-path') || ''));
            });
        });
    }

    async function loadPathPicker(pathParam) {
        const listEl = $('ev-path-picker-list');
        if (listEl) listEl.innerHTML = '<p class="hint" style="padding:10px">' + esc(tr('evidenceHub.loading')) + '</p>';
        try {
            const qs = new URLSearchParams();
            if (pathParam) qs.set('path', pathParam);
            else if (pathPickerStart) qs.set('start', pathPickerStart);
            const res = await fetch('/api/evidence-settings/browse-paths?' + qs.toString(), { credentials: 'same-origin' });
            const data = await res.json();
            if (!res.ok || !data.ok) throwCatalogErr(data);
            renderPathPickerList(data);
        } catch (err) {
            if (listEl) listEl.innerHTML = '<p class="hint" style="padding:10px">' + esc(catalogMsg(err.opPayload || err.catalogPayload, err)) + '</p>';
        }
    }

    function openPathPicker(targetId, startKind) {
        if (!canManage) {
            alert(tr('evidence.storageAdminRequired'));
            return;
        }
        pathPickerTargetId = targetId;
        pathPickerStart = startKind || null;
        const backdrop = $('ev-path-picker');
        if (backdrop) backdrop.hidden = false;
        const targetEl = $(targetId);
        const initial = targetEl && targetEl.value ? targetEl.value.trim() : '';
        loadPathPicker(initial || null);
    }

    function selectPathPickerFolder() {
        const targetEl = pathPickerTargetId ? $(pathPickerTargetId) : null;
        if (targetEl && pathPickerValue) targetEl.value = pathPickerValue;
        closePathPicker();
    }

    function pathPickerGoUp() {
        if (pathPickerParentIsRoots) loadPathPicker(null);
        else if (pathPickerParent) loadPathPicker(pathPickerParent);
        else loadPathPicker(null);
    }

    function bindPathPickerUi() {
        document.querySelectorAll('.ev-path-browse').forEach(function (btn) {
            btn.addEventListener('click', function () {
                openPathPicker(btn.getAttribute('data-target'), btn.getAttribute('data-start'));
            });
        });
        document.querySelectorAll('.ev-path-default').forEach(function (btn) {
            btn.addEventListener('click', function () {
                const targetEl = $(btn.getAttribute('data-target'));
                if (targetEl) targetEl.value = '';
            });
        });
        const upBtn = $('ev-path-picker-up');
        const selectBtn = $('ev-path-picker-select');
        const cancelBtn = $('ev-path-picker-cancel');
        const backdrop = $('ev-path-picker');
        if (upBtn) upBtn.addEventListener('click', pathPickerGoUp);
        if (selectBtn) selectBtn.addEventListener('click', selectPathPickerFolder);
        if (cancelBtn) cancelBtn.addEventListener('click', closePathPicker);
        if (backdrop) {
            backdrop.addEventListener('click', function (ev) {
                if (ev.target === backdrop) closePathPicker();
            });
        }
    }

    function bindUi() {
        const localRadio = $('ss-evidence-archive-local');
        const netRadio = $('ss-evidence-archive-network');
        if (localRadio) localRadio.addEventListener('change', syncTierFromRadios);
        if (netRadio) netRadio.addEventListener('change', syncTierFromRadios);
        const primaryEl = $('ss-evidence-archive-primary');
        if (primaryEl) primaryEl.addEventListener('change', toggleNetworkPanel);
        const testBtn = $('ev-storage-test');
        const saveBtn = $('ev-storage-save');
        const applyBtn = $('ev-storage-apply');
        const scanBtn = $('ev-storage-scan');
        const openFtpBtn = $('ev-storage-open-ftp');
        if (testBtn) testBtn.addEventListener('click', function () { testPaths(); });
        if (saveBtn) saveBtn.addEventListener('click', function () { saveStorage(false); });
        if (applyBtn) applyBtn.addEventListener('click', function () { saveStorage(true); });
        if (scanBtn) scanBtn.addEventListener('click', function () { scanCatalog(); });
        if (openFtpBtn) {
            openFtpBtn.addEventListener('click', function () {
                if (typeof global.openStorageFolder === 'function') global.openStorageFolder('ftp');
            });
        }
        const liveEnabledEl = $('ss-evidence-live-enabled');
        if (liveEnabledEl) liveEnabledEl.addEventListener('change', syncLiveAutoSosToggle);
        const ftpSaveBtn = $('ev-ftp-save');
        if (ftpSaveBtn) ftpSaveBtn.addEventListener('click', function () { saveFtpSettings(); });
        const ftpPassEl = $('ss-ftp-pass');
        if (ftpPassEl) {
            ftpPassEl.addEventListener('input', function () {
                refreshFtpSecretFieldUi(ftpPassEl.dataset.configured === '1');
            });
        }
        bindPathPickerUi();
    }

    global.EvidenceStorageUi = {
        bindUi: bindUi,
        refresh: refresh,
        loadEvidencePaths: refresh,
        fillFtpForm: fillFtpForm,
        renderFtpServiceState: renderFtpServiceState,
    };
}(window));
