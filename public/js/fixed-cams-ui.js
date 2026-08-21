// TRANSLATION PENDING \u2014 all user-facing strings in this file need locale keys
// added to public/locales/*.json after the fixed cam feature is fully complete
// (map pins + SOS wall + PTZ UI). Do not translate until mob-fixed-cam-map-icons
// checkpoint passes. Strings marked // i18n: <key-suggestion>

(function () {
    'use strict';

    // ── DOM refs ──────────────────────────────────────────────────────────────
    const dlg        = document.getElementById('fixed-cams-dlg');
    const openBtn    = document.getElementById('fc-open-btn');
    const closeBtn   = document.getElementById('fc-close-btn');
    const addBtn     = document.getElementById('fc-add-btn');
    const csvBtn     = document.getElementById('fc-csv-btn');
    const tplBtn     = document.getElementById('fc-tpl-btn');
    const tbody      = document.getElementById('fc-tbody');
    const camCount   = document.getElementById('fc-cam-count');
    const formWrap   = document.getElementById('fc-form');
    const formTitle  = document.getElementById('fc-form-title');
    const formSave   = document.getElementById('fc-form-save');
    const formCancel = document.getElementById('fc-form-cancel');
    const mapPickBtn = document.getElementById('fc-map-pick-btn');
    const csvWrap    = document.getElementById('fc-csv');
    const csvPaste   = document.getElementById('fc-csv-paste');
    const csvImport  = document.getElementById('fc-csv-import-btn');
    const csvCancel  = document.getElementById('fc-csv-cancel');
    const toast      = document.getElementById('fc-toast');
    let formStreamProfiles = [];

    function profilePix(p) {
        return (p && p.resolution && p.resolution.width * p.resolution.height) || 0;
    }

    function isMjpegProfile(p) {
        const e = String((p && p.encoding) || '').toUpperCase();
        return e === 'MJPEG' || e === 'JPEG';
    }

    function rankProfiles(profiles) {
        const list = (profiles || []).slice().filter(function (p) { return p && p.token; });
        list.sort(function (a, b) { return profilePix(b) - profilePix(a); });
        const n = list.length;
        return list.map(function (p, i) {
            let rank = 'Stream ' + (i + 1);
            if (n === 1) rank = 'Main Stream';
            else if (i === 0) rank = 'Main Stream';
            else if (i === n - 1) rank = 'Sub Stream';
            else rank = 'Stream ' + (i + 1);
            return { profile: p, rank: rank };
        });
    }

    function profileLabel(ranked) {
        const p = ranked.profile || ranked;
        const rank = ranked.rank || '';
        const w = p.resolution && p.resolution.width;
        const h = p.resolution && p.resolution.height;
        const res = (w && h) ? (w + '\u00d7' + h) : '';
        const enc = p.encoding ? String(p.encoding) : '';
        const bits = [rank, res, enc].filter(Boolean);
        if (p.name && String(p.name) !== String(p.token)) bits.splice(1, 0, p.name);
        return bits.join(' \u00b7 ');
    }

    function updateCodecHint() {
        const hint = document.getElementById('fc-stream-codec-hint');
        if (!hint) return;
        const liveTok = (document.getElementById('fc-f-role-live') || {}).value || '';
        const remTok = (document.getElementById('fc-f-role-remote') || {}).value || '';
        const recTok = (document.getElementById('fc-f-role-record') || {}).value || '';
        let msg = '';
        formStreamProfiles.forEach(function (p) {
            if (!isMjpegProfile(p) || msg) return;
            if (p.token === liveTok) {
                msg = 'MJPEG selected for Live view. Wall / ZLM need H.264 or H.265 — live may fail. Prefer Sub Stream H.264.';
            } else if (p.token === remTok) {
                msg = 'MJPEG selected for Low bandwidth. Prefer an H.264/H.265 Sub Stream when the camera has one.';
            } else if (p.token === recTok) {
                msg = 'MJPEG selected for Recording. Archive still works on some paths, but H.264/H.265 Main Stream is preferred.';
            }
        });
        if (msg) {
            hint.hidden = false;
            hint.textContent = msg;
            hint.style.color = '#fbbf24';
        } else {
            hint.hidden = true;
            hint.textContent = '';
            hint.style.color = '';
        }
    }

    function fillRoleSelects(profiles, roles) {
        formStreamProfiles = Array.isArray(profiles) ? profiles : [];
        const roleMap = roles || {};
        const ranked = rankProfiles(formStreamProfiles);
        ['live', 'record', 'remote'].forEach(function (role) {
            const sel = document.getElementById('fc-f-role-' + role);
            if (!sel) return;
            const keep = String(roleMap[role] || '');
            sel.innerHTML = '';
            const empty = document.createElement('option');
            empty.value = '';
            empty.textContent = '—';
            sel.appendChild(empty);
            ranked.forEach(function (row) {
                const p = row.profile;
                const opt = document.createElement('option');
                opt.value = p.token;
                opt.textContent = profileLabel(row);
                if (isMjpegProfile(p)) opt.setAttribute('data-codec', 'mjpeg');
                sel.appendChild(opt);
            });
            sel.value = keep;
            if (keep && sel.value !== keep) {
                const orphan = document.createElement('option');
                orphan.value = keep;
                orphan.textContent = keep + ' (saved)';
                sel.appendChild(orphan);
                sel.value = keep;
            }
        });
        const st = document.getElementById('fc-profiles-status');
        if (st) {
            st.textContent = formStreamProfiles.length
                ? (formStreamProfiles.length + ' stream(s) — Main / Sub auto-mapped')
                : 'No streams yet — click Discover Profiles';
        }
        updateCodecHint();
    }

    function syncAdvancedUi() {
        const adv = document.getElementById('fc-f-advanced-override');
        const wrap = document.getElementById('fc-advanced-roles');
        if (wrap) wrap.hidden = !(adv && adv.checked);
    }

    // source-dependent field groups
    const onvifRows = ['fc-onvif-host-row','fc-onvif-port-row',
                       'fc-onvif-user-row','fc-onvif-pass-row','fc-onvif-path-row'];
    const rtspRow   = document.getElementById('fc-rtsp-row');
    const transportRow = document.getElementById('fc-transport-row');

    if (!dlg || !openBtn) return; // guard \u2014 page may not have the dialog

    // ── State ─────────────────────────────────────────────────────────────────
    let editingId = null;

    function setToggleActive(btnIds, activeId) {
        btnIds.forEach(function (id) {
            const el = document.getElementById(id);
            if (!el) return;
            el.classList.toggle('btn-action', id === activeId);
            el.classList.toggle('btn-ghost', id !== activeId);
        });
    }

    function onPlacementChange(mode) {
        const m = mode === 'indoor' ? 'indoor' : 'outdoor';
        const hid = document.getElementById('fc-f-placement');
        if (hid) hid.value = m;
        setToggleActive(['fc-place-outdoor', 'fc-place-indoor'], m === 'indoor' ? 'fc-place-indoor' : 'fc-place-outdoor');
        const out = document.getElementById('fc-outdoor-fields');
        const inn = document.getElementById('fc-indoor-fields');
        if (out) out.hidden = (m === 'indoor');
        if (inn) {
            inn.hidden = (m !== 'indoor');
            if (!inn.hidden) inn.style.display = 'grid';
            else inn.style.display = '';
        }
    }

    function onPathChange(src) {
        const sourceEl = document.getElementById('fc-f-source');
        if (sourceEl) sourceEl.value = src;
        setToggleActive(['fc-path-onvif', 'fc-path-rtsp', 'fc-path-none'],
            src === 'rtsp' ? 'fc-path-rtsp' : (src === 'none' ? 'fc-path-none' : 'fc-path-onvif'));
        onvifRows.forEach(function (id) {
            const el = document.getElementById(id);
            if (el) el.hidden = (src === 'none');
        });
        const hostPort = document.getElementById('fc-host-port-row');
        if (hostPort) hostPort.hidden = (src === 'none');
        const authRow = document.getElementById('fc-auth-row');
        if (authRow) authRow.hidden = (src === 'none');
        const pathRow = document.getElementById('fc-onvif-path-row');
        if (pathRow) pathRow.hidden = (src !== 'onvif');
        if (rtspRow) rtspRow.hidden = (src === 'none');
        if (transportRow) transportRow.hidden = (src === 'none');
        const rolesWrap = document.getElementById('fc-stream-roles-wrap');
        if (rolesWrap) rolesWrap.hidden = (src !== 'onvif');
        const rolesHead = rolesWrap && rolesWrap.previousElementSibling;
        if (rolesHead && rolesHead.classList && rolesHead.classList.contains('section-head')) {
            rolesHead.hidden = (src !== 'onvif');
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    function esc(s) {
        return String(s || '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function showToast(msg, type) { // i18n: inline messages \u2014 mark for translation
        toast.textContent = msg;
        toast.className   = 'show ' + (type || 'ok');
        clearTimeout(toast._t);
        toast._t = setTimeout(() => { toast.className = ''; }, 3200);
    }

    async function api(method, path, body) {
        const opts = { method, headers: { 'Content-Type': 'application/json' } };
        if (body !== undefined) opts.body = JSON.stringify(body);
        const r = await fetch(path, opts);
        const data = await r.json();
        if (global.LicenseEntitlementsUi && typeof LicenseEntitlementsUi.tryHandleLimitResponse === 'function') {
            if (LicenseEntitlementsUi.tryHandleLimitResponse(r, data)) return data;
        }
        return data;
    }

    function badge(text, cls) {
        return '<span class="fc-badge fc-badge-' + cls + '">' + esc(text) + '</span>';
    }

    function sourceBadge(s) {
        if (s === 'onvif') return badge('ONVIF', 'onvif');
        if (s === 'rtsp')  return badge('RTSP',  'rtsp');
        return badge('None', 'none');                       // i18n: fixedCam.source.none
    }

    function mapIconLabel(value) {
        const icons = {
            fixed: '\u25A3 Fixed',
            dome: '\u25D2 Dome',
            ptz: '\u2725 PTZ',
            traffic: '\u25C6 Traffic',
            building: '\u25A6 Building',
        };
        return icons[value] || icons.fixed;
    }

    // ── Table render ──────────────────────────────────────────────────────────
    async function loadTable() {
        const data = await api('GET', '/api/fixed-cams');
        if (!data.ok) { showToast(data.error || 'Load failed.', 'err'); return; } // i18n: fixedCam.err.load
        const cams = data.cams || [];
        camCount.textContent = cams.length
            ? cams.length + ' camera' + (cams.length === 1 ? '' : 's') // i18n: fixedCam.count
            : '';
        if (!cams.length) {
            tbody.innerHTML = '<tr><td colspan="8" class="fc-empty">No fixed cameras yet. Click "+ Add camera" or use Batch CSV import.</td></tr>'; // i18n: fixedCam.empty
            return;
        }
        tbody.innerHTML = cams.map(c => `
            <tr>
              <td><strong>${esc(c.name)}</strong>${c.notes ? '<br><span style="font-size:10px;color:#64748b">' + esc(c.notes) + '</span>' : ''}</td>
              <td>${esc(mapIconLabel(c.mapIcon))}</td>
              <td>${esc(c.zone) || '\u2014'}</td>
              <td class="fc-mono">${(c.lat != null && c.lng != null && !isNaN(Number(c.lat)) && !isNaN(Number(c.lng))) ? (Number(c.lat).toFixed(6) + ',&thinsp;' + Number(c.lng).toFixed(6)) : (c.placementMode === 'indoor' ? 'Indoor' : '\u2014')}</td>
              <td>${sourceBadge(c.streamSource)}</td>
              <td>${c.ptzEnabled ? badge('PTZ ✓', 'onvif') : '\u2014'}</td>  <!-- i18n: fixedCam.ptz.yes -->
              <td>${c.enabled ? badge('Enabled', 'on') : badge('Disabled', 'off')}</td>  <!-- i18n: fixedCam.status.enabled / disabled -->
              <td>
                <button class="fc-act-btn" onclick="fcEdit('${esc(c.id)}')">Edit</button>  <!-- i18n: common.edit -->
                <button class="fc-act-btn del" onclick="fcDel('${esc(c.id)}','${esc(c.name)}')">Delete</button>  <!-- i18n: common.delete -->
              </td>
            </tr>`).join('');
    }

    // ── Form helpers ──────────────────────────────────────────────────────────
    function onSourceChange() {
        onPathChange(document.getElementById('fc-f-source').value);
    }

    function clearForm() {
        ['fc-f-name','fc-f-lat','fc-f-lng','fc-f-zone','fc-f-ohost',
         'fc-f-ouser','fc-f-opass','fc-f-rtsp','fc-f-notes',
         'fc-f-zone-id','fc-f-map-x','fc-f-map-y'].forEach(id => {
            const el = document.getElementById(id); if (el) el.value = '';
        });
        const port = document.getElementById('fc-f-oport'); if (port) port.value = '80';
        const path = document.getElementById('fc-f-opath'); if (path) path.value = '/onvif/device_service';
        const tp   = document.getElementById('fc-f-otp');   if (tp)   tp.value   = 'tcp';
        const prof = document.getElementById('fc-f-oprofile'); if (prof) prof.value = 'S';
        const anr  = document.getElementById('fc-f-anr'); if (anr) anr.value = 'false';
        document.getElementById('fc-f-source').value  = 'onvif';
        document.getElementById('fc-f-map-icon').value = 'fixed';
        document.getElementById('fc-f-ptz').value     = 'false';
        document.getElementById('fc-f-enabled').value = 'true';
        onPlacementChange('outdoor');
        onPathChange('onvif');
        fillRoleSelects([], {});
        const livePref = document.getElementById('fc-f-live-pref');
        const recPref = document.getElementById('fc-f-record-pref');
        if (livePref) livePref.value = 'auto';
        if (recPref) recPref.value = 'auto';
        const adv = document.getElementById('fc-f-advanced-override');
        if (adv) adv.checked = false;
        syncAdvancedUi();
        const diag = document.getElementById('fc-diag-result');
        if (diag) diag.textContent = '';
    }

    function readForm() {
        const transport = document.getElementById('fc-f-otp').value === 'udp' ? 'udp' : 'tcp';
        const placementMode = (document.getElementById('fc-f-placement') || {}).value === 'indoor' ? 'indoor' : 'outdoor';
        const latEl = document.getElementById('fc-f-lat');
        const lngEl = document.getElementById('fc-f-lng');
        const latVal = latEl && latEl.value.trim() !== '' ? parseFloat(latEl.value) : null;
        const lngVal = lngEl && lngEl.value.trim() !== '' ? parseFloat(lngEl.value) : null;
        const mapXEl = document.getElementById('fc-f-map-x');
        const mapYEl = document.getElementById('fc-f-map-y');
        const zoneIdEl = document.getElementById('fc-f-zone-id');
        return {
            name:         document.getElementById('fc-f-name').value.trim(),
            placementMode,
            lat:          latVal,
            lng:          lngVal,
            zone:         document.getElementById('fc-f-zone').value.trim(),
            zone_id:      zoneIdEl ? zoneIdEl.value.trim() : '',
            map_x:        mapXEl && mapXEl.value !== '' ? parseFloat(mapXEl.value) : null,
            map_y:        mapYEl && mapYEl.value !== '' ? parseFloat(mapYEl.value) : null,
            mapIcon:      document.getElementById('fc-f-map-icon').value,
            streamSource: document.getElementById('fc-f-source').value,
            streamTransport: transport,
            onvifProfile: (document.getElementById('fc-f-oprofile') || {}).value || 'S',
            anrEnabled:   (document.getElementById('fc-f-anr') || {}).value === 'true',
            onvif: {
                host:         document.getElementById('fc-f-ohost').value.trim(),
                port:         parseInt(document.getElementById('fc-f-oport').value, 10) || 80,
                user:         document.getElementById('fc-f-ouser').value.trim(),
                password:     document.getElementById('fc-f-opass').value,
                devicePath:   document.getElementById('fc-f-opath').value.trim(),
                rtspTransport: transport,
            },
            rtspUrl:    document.getElementById('fc-f-rtsp').value.trim(),
            ptzEnabled: document.getElementById('fc-f-ptz').value === 'true',
            enabled:    document.getElementById('fc-f-enabled').value === 'true',
            notes:      document.getElementById('fc-f-notes').value.trim(),
            streamProfiles: formStreamProfiles.slice(),
            streamRolePref: {
                live:   (document.getElementById('fc-f-live-pref') || {}).value || 'auto',
                record: (document.getElementById('fc-f-record-pref') || {}).value || 'auto',
                remote: 'auto',
            },
            streamAdvancedOverride: !!(document.getElementById('fc-f-advanced-override') || {}).checked,
            streamRoles: {
                live:   (document.getElementById('fc-f-role-live') || {}).value || '',
                record: (document.getElementById('fc-f-role-record') || {}).value || '',
                remote: (document.getElementById('fc-f-role-remote') || {}).value || '',
            },
        };
    }

    function showForm(title) {
        formTitle.textContent = title;
        formWrap.hidden = false;
        csvWrap.hidden  = true;
        formWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function hideForm() {
        formWrap.hidden = true;
        editingId = null;
    }

    // ── Global callbacks (called from inline onclick) ─────────────────────────
    window.fcEdit = async function (id) {
        const data = await api('GET', '/api/fixed-cams');
        const cam  = (data.cams || []).find(c => c.id === id);
        if (!cam) { showToast('Camera not found.', 'err'); return; } // i18n: fixedCam.err.notFound
        editingId = id;
        document.getElementById('fc-f-name').value    = cam.name || '';
        document.getElementById('fc-f-lat').value     = cam.lat != null ? cam.lat : '';
        document.getElementById('fc-f-lng').value     = cam.lng != null ? cam.lng : '';
        document.getElementById('fc-f-zone').value    = cam.zone || '';
        document.getElementById('fc-f-map-icon').value = cam.mapIcon || 'fixed';
        document.getElementById('fc-f-source').value  = cam.streamSource || 'onvif';
        document.getElementById('fc-f-ohost').value   = (cam.onvif && cam.onvif.host) || '';
        document.getElementById('fc-f-oport').value   = (cam.onvif && cam.onvif.port) || 80;
        document.getElementById('fc-f-ouser').value   = (cam.onvif && cam.onvif.user) || '';
        document.getElementById('fc-f-opass').value   = '';
        document.getElementById('fc-f-opath').value   = (cam.onvif && cam.onvif.devicePath) || '/onvif/device_service';
        document.getElementById('fc-f-otp').value     = cam.streamTransport || (cam.onvif && cam.onvif.rtspTransport) || 'tcp';
        document.getElementById('fc-f-rtsp').value    = cam.rtspUrl || '';
        document.getElementById('fc-f-ptz').value     = String(!!cam.ptzEnabled);
        document.getElementById('fc-f-enabled').value = String(cam.enabled !== false);
        document.getElementById('fc-f-notes').value   = cam.notes || '';
        const zoneId = document.getElementById('fc-f-zone-id');
        if (zoneId) zoneId.value = cam.zone_id || '';
        const mx = document.getElementById('fc-f-map-x');
        if (mx) mx.value = cam.map_x != null ? cam.map_x : '';
        const my = document.getElementById('fc-f-map-y');
        if (my) my.value = cam.map_y != null ? cam.map_y : '';
        const prof = document.getElementById('fc-f-oprofile');
        if (prof) prof.value = cam.onvifProfile || (cam.onvif && cam.onvif.profile) || 'S';
        const anr = document.getElementById('fc-f-anr');
        if (anr) anr.value = String(!!cam.anrEnabled);
        fillRoleSelects(cam.streamProfiles || [], cam.streamRoles || {});
        const livePref = document.getElementById('fc-f-live-pref');
        const recPref = document.getElementById('fc-f-record-pref');
        const pref = cam.streamRolePref || {};
        if (livePref) livePref.value = pref.live === 'main' || pref.live === 'sub' ? pref.live : 'auto';
        if (recPref) recPref.value = pref.record === 'main' || pref.record === 'sub' ? pref.record : 'auto';
        const adv = document.getElementById('fc-f-advanced-override');
        if (adv) adv.checked = !!cam.streamAdvancedOverride;
        syncAdvancedUi();
        onPlacementChange(cam.placementMode || ((cam.map_x != null || cam.zone_id) ? 'indoor' : 'outdoor'));
        onPathChange(cam.streamSource || 'onvif');
        showForm('Edit Camera — ' + cam.name);
    };

    window.fcDel = async function (id, name) {
        if (!confirm('Delete "' + name + '"? This cannot be undone.')) return; // i18n: fixedCam.confirm.delete
        const r = await api('DELETE', '/api/fixed-cams/' + id);
        if (!r.ok) { showToast(r.error || 'Delete failed.', 'err'); return; } // i18n: fixedCam.err.delete
        showToast('Camera deleted.'); // i18n: fixedCam.toast.deleted
        loadTable();
        if (window.reloadFixedCameraMapPins) window.reloadFixedCameraMapPins();
    };

    // ── CSV template download ─────────────────────────────────────────────────
    function downloadTemplate() {
        const header = 'Import_Action,Name,IP_Address,Port,Username,Password,Placement,Lat,Lng,Zone_Name,Map_X,Map_Y,LiveStream,RecordStream,StreamTransport,PtzCapable';
        const example1 = 'Create,Front Gate,192.168.1.50,80,admin,cam123,Outdoor,3.1575,101.7115,,,auto,auto,tcp,true';
        const example2 = 'Create,Lobby Cam,192.168.1.51,80,admin,cam123,Indoor,,,North Lobby,0.42,0.55,sub,main,tcp,false';
        const csv  = [header, example1, example2].join('\r\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url  = URL.createObjectURL(blob);
        const a    = Object.assign(document.createElement('a'), { href: url, download: 'fixed-cams-enroll-template.csv' });
        document.body.appendChild(a); a.click();
        setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 500);
    }

    let lastReceiptCsv = '';

    function downloadReceipt() {
        if (!lastReceiptCsv) return;
        const blob = new Blob([lastReceiptCsv], { type: 'text/csv' });
        const url  = URL.createObjectURL(blob);
        const a    = Object.assign(document.createElement('a'), { href: url, download: 'fixed-cams-import-receipt.csv' });
        document.body.appendChild(a); a.click();
        setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 500);
    }

    // ── Event wiring ─────────────────────────────────────────────────────────
    openBtn.addEventListener('click', () => {
        clearForm(); hideForm();
        csvWrap.hidden = true;
        dlg.showModal();
        loadTable();
        loadSiteStreamPolicy();
    });

    closeBtn.addEventListener('click', () => dlg.close());

    dlg.addEventListener('click', e => {
        if (dlg.closest && dlg.closest('#ss-panel-fixed')) return;
        if (e.target === dlg) dlg.close();
    });

    addBtn.addEventListener('click', () => {
        editingId = null;
        clearForm();
        csvWrap.hidden = true;
        showForm('Add camera'); // i18n: fixedCam.form.addTitle
    });

    formCancel.addEventListener('click', hideForm);

    if (mapPickBtn) {
        mapPickBtn.addEventListener('click', async () => {
            if (typeof window.beginFixedCameraMapPick !== 'function') {
                showToast('Map location picker is unavailable.', 'err');
                return;
            }
            const activeNav = Array.from(document.querySelectorAll('nav button')).find(button => button.classList.contains('active'));
            const opsBtn = document.getElementById('nav-tab-ops');
            dlg.close();
            if (opsBtn) opsBtn.click();
            const position = await window.beginFixedCameraMapPick();
            if (activeNav && activeNav !== opsBtn) activeNav.click();
            dlg.showModal();
            if (!position) return;
            document.getElementById('fc-f-lat').value = Number(position.lat).toFixed(7);
            document.getElementById('fc-f-lng').value = Number(position.lng).toFixed(7);
            showToast('Camera location selected on map.');
        });
    }

    formSave.addEventListener('click', async () => {
        const payload = readForm();
        if (!payload.name) { showToast('Camera name is required.', 'err'); return; }
        /* GPS optional — required only when outdoor AND user typed one of lat/lng incomplete */
        if (payload.placementMode === 'outdoor') {
            const hasLat = payload.lat != null && !isNaN(payload.lat);
            const hasLng = payload.lng != null && !isNaN(payload.lng);
            if ((hasLat && !hasLng) || (!hasLat && hasLng)) {
                showToast('Provide both latitude and longitude, or leave both blank.', 'err');
                return;
            }
        }
        if (payload.placementMode === 'indoor' && !payload.zone_id) {
            showToast('Floor / Zone ID is required for indoor placement.', 'err');
            return;
        }

        const r = editingId
            ? await api('PUT', '/api/fixed-cams/' + editingId, payload)
            : await api('POST', '/api/fixed-cams', payload);

        if (!r.ok) {
            if (r.error === 'limit_reached') return;
            showToast(r.error || 'Save failed.', 'err'); return;
        }
        showToast(editingId ? 'Camera updated.' : 'Camera added.');
        hideForm();
        loadTable();
        if (window.reloadFixedCameraMapPins) window.reloadFixedCameraMapPins();
    });

    csvBtn.addEventListener('click', () => {
        hideForm();
        csvWrap.hidden = !csvWrap.hidden;
        if (!csvWrap.hidden) csvWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    tplBtn.addEventListener('click', downloadTemplate);

    const receiptBtn = document.getElementById('fc-csv-receipt-btn');
    if (receiptBtn) receiptBtn.addEventListener('click', downloadReceipt);

    csvImport.addEventListener('click', async () => {
        const csv = csvPaste.value.trim();
        if (!csv) { showToast('Paste CSV rows first.', 'err'); return; }
        const resultEl = document.getElementById('fc-csv-result');
        if (resultEl) {
            resultEl.hidden = false;
            resultEl.textContent = 'Importing and discovering profiles (queued)\u2026';
        }
        csvImport.disabled = true;
        try {
            const r = await api('POST', '/api/cameras/import-csv', { csv });
            if (!r.ok) {
                showToast(r.error || 'Import failed.', 'err');
                if (resultEl) resultEl.textContent = r.error || 'Import failed.';
                return;
            }
            lastReceiptCsv = r.receiptCsv || '';
            if (receiptBtn) receiptBtn.hidden = !lastReceiptCsv;
            const msg = 'Created ' + (r.created || 0)
                + ', updated ' + (r.updated || 0)
                + ', failed ' + (r.failed || 0)
                + '. Download receipt for Status / Discover columns.';
            showToast(msg);
            if (resultEl) resultEl.textContent = msg;
            loadTable();
            if (window.reloadFixedCameraMapPins) window.reloadFixedCameraMapPins();
        } finally {
            csvImport.disabled = false;
        }
    });

    csvCancel.addEventListener('click', () => { csvWrap.hidden = true; });

    const srcEl = document.getElementById('fc-f-source');
    if (srcEl) srcEl.addEventListener('change', onSourceChange);

    [['fc-place-outdoor', 'outdoor'], ['fc-place-indoor', 'indoor']].forEach(function (pair) {
        const el = document.getElementById(pair[0]);
        if (el) el.addEventListener('click', function () { onPlacementChange(pair[1]); });
    });
    [['fc-path-onvif', 'onvif'], ['fc-path-rtsp', 'rtsp'], ['fc-path-none', 'none']].forEach(function (pair) {
        const el = document.getElementById(pair[0]);
        if (el) el.addEventListener('click', function () { onPathChange(pair[1]); });
    });

    ['fc-f-role-live', 'fc-f-role-record', 'fc-f-role-remote'].forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', updateCodecHint);
    });

    const advCb = document.getElementById('fc-f-advanced-override');
    if (advCb) advCb.addEventListener('change', syncAdvancedUi);

    async function loadSiteStreamPolicy() {
        const r = await api('GET', '/api/vms/stream-policy');
        if (!r.ok || !r.policy) return;
        const live = document.getElementById('fc-policy-live');
        const rec = document.getElementById('fc-policy-record');
        if (live) live.value = r.policy.live || 'auto';
        if (rec) rec.value = r.policy.record || 'main';
    }

    const policySave = document.getElementById('fc-policy-save');
    if (policySave) {
        policySave.addEventListener('click', async function () {
            const live = (document.getElementById('fc-policy-live') || {}).value || 'auto';
            const record = (document.getElementById('fc-policy-record') || {}).value || 'main';
            const st = document.getElementById('fc-policy-status');
            if (st) st.textContent = 'Saving\u2026';
            const r = await api('PUT', '/api/vms/stream-policy', { live: live, record: record });
            if (!r.ok) {
                showToast(r.error || 'Stream policy save failed.', 'err');
                if (st) st.textContent = '';
                return;
            }
            if (st) st.textContent = 'Saved.';
            showToast('Site stream policy saved.');
        });
    }

    const diagBtn = document.getElementById('fc-diag-btn');
    if (diagBtn) {
        diagBtn.addEventListener('click', async function () {
            const payload = readForm();
            const out = document.getElementById('fc-diag-result');
            if (out) out.textContent = 'Running diagnostics…';
            diagBtn.disabled = true;
            try {
                const r = await api('POST', '/api/fixed-cams/diagnose', payload);
                if (!r.checks) {
                    if (out) out.textContent = r.error || 'Diagnostics failed.';
                    return;
                }
                const c = r.checks;
                const line = function (label, obj) {
                    return label + ': ' + (obj && obj.ok ? 'OK' : 'FAIL') + ' — ' + ((obj && obj.detail) || '');
                };
                if (out) {
                    out.textContent = [line('Ping', c.ping), line('NTP', c.ntp), line('Auth', c.auth)].join(' | ');
                    out.style.color = r.ok ? '#86efac' : '#fca5a5';
                }
            } catch (e) {
                if (out) out.textContent = 'Diagnostics error.';
            } finally {
                diagBtn.disabled = false;
            }
        });
    }

    const discoverBtn = document.getElementById('fc-discover-profiles');
    if (discoverBtn) {
        discoverBtn.addEventListener('click', async function () {
            const st = document.getElementById('fc-profiles-status');
            const payload = readForm();
            if (payload.streamSource !== 'onvif') {
                showToast('Switch to ONVIF Auto to discover media profiles.', 'err');
                return;
            }
            if (!payload.onvif || !payload.onvif.host) {
                showToast('Camera IP / Host is required.', 'err');
                return;
            }
            if (st) st.textContent = 'Discovering…';
            discoverBtn.disabled = true;
            try {
                const body = editingId
                    ? { id: editingId, onvif: payload.onvif, rtspUrl: payload.rtspUrl }
                    : { onvif: payload.onvif, rtspUrl: payload.rtspUrl };
                if (editingId && !payload.onvif.password) {
                    /* keep server password — omit blank so probe uses stored cam when id set */
                    delete body.onvif.password;
                }
                const r = await api('POST', '/api/fixed-cams/onvif/discover-profiles', body);
                if (!r.ok) {
                    if (st) st.textContent = '';
                    showToast(r.error || 'Discover failed.', 'err');
                    return;
                }
                const roles = {
                    live:   (document.getElementById('fc-f-role-live') || {}).value || '',
                    record: (document.getElementById('fc-f-role-record') || {}).value || '',
                    remote: (document.getElementById('fc-f-role-remote') || {}).value || '',
                };
                fillRoleSelects(r.streamProfiles || [], roles);
                showToast((r.count || 0) + ' profile(s) discovered.');
            } catch (e) {
                if (st) st.textContent = '';
                showToast('Discover failed.', 'err');
            } finally {
                discoverBtn.disabled = false;
            }
        });
    }

    function parkDialog() {
        const host = document.getElementById('ss-panel-fixed');
        if (dlg && host && dlg.parentNode !== host) host.appendChild(dlg);
    }

    global.FixedCamsUi = {
        showInPanel: function () {
            parkDialog();
            clearForm();
            hideForm();
            csvWrap.hidden = true;
            if (dlg.open) dlg.close();
            dlg.show();
            loadTable();
        },
        hideInPanel: function () {
            hideForm();
            if (dlg.open) dlg.close();
        },
    };

}());
