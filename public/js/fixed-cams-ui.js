// TRANSLATION PENDING — all user-facing strings in this file need locale keys
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
    const csvWrap    = document.getElementById('fc-csv');
    const csvPaste   = document.getElementById('fc-csv-paste');
    const csvImport  = document.getElementById('fc-csv-import-btn');
    const csvCancel  = document.getElementById('fc-csv-cancel');
    const toast      = document.getElementById('fc-toast');

    // source-dependent field groups
    const onvifRows = ['fc-onvif-lbl','fc-onvif-host-row','fc-onvif-port-row',
                       'fc-onvif-user-row','fc-onvif-pass-row','fc-onvif-path-row','fc-onvif-tp-row'];
    const rtspRow   = document.getElementById('fc-rtsp-row');

    if (!dlg || !openBtn) return; // guard — page may not have the dialog

    // ── State ─────────────────────────────────────────────────────────────────
    let editingId = null;

    // ── Helpers ───────────────────────────────────────────────────────────────
    function esc(s) {
        return String(s || '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function showToast(msg, type) { // i18n: inline messages — mark for translation
        toast.textContent = msg;
        toast.className   = 'show ' + (type || 'ok');
        clearTimeout(toast._t);
        toast._t = setTimeout(() => { toast.className = ''; }, 3200);
    }

    async function api(method, path, body) {
        const opts = { method, headers: { 'Content-Type': 'application/json' } };
        if (body !== undefined) opts.body = JSON.stringify(body);
        const r = await fetch(path, opts);
        return r.json();
    }

    function badge(text, cls) {
        return '<span class="fc-badge fc-badge-' + cls + '">' + esc(text) + '</span>';
    }

    function sourceBadge(s) {
        if (s === 'onvif') return badge('ONVIF', 'onvif');
        if (s === 'rtsp')  return badge('RTSP',  'rtsp');
        return badge('None', 'none');                       // i18n: fixedCam.source.none
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
            tbody.innerHTML = '<tr><td colspan="7" class="fc-empty">No fixed cameras yet. Click "+ Add camera" or use Batch CSV import.</td></tr>'; // i18n: fixedCam.empty
            return;
        }
        tbody.innerHTML = cams.map(c => `
            <tr>
              <td><strong>${esc(c.name)}</strong>${c.notes ? '<br><span style="font-size:10px;color:#64748b">' + esc(c.notes) + '</span>' : ''}</td>
              <td>${esc(c.zone) || '—'}</td>
              <td class="fc-mono">${Number(c.lat).toFixed(6)},&thinsp;${Number(c.lng).toFixed(6)}</td>
              <td>${sourceBadge(c.streamSource)}</td>
              <td>${c.ptzEnabled ? badge('PTZ ✓', 'onvif') : '—'}</td>  <!-- i18n: fixedCam.ptz.yes -->
              <td>${c.enabled ? badge('Enabled', 'on') : badge('Disabled', 'off')}</td>  <!-- i18n: fixedCam.status.enabled / disabled -->
              <td>
                <button class="fc-act-btn" onclick="fcEdit('${esc(c.id)}')">Edit</button>  <!-- i18n: common.edit -->
                <button class="fc-act-btn del" onclick="fcDel('${esc(c.id)}','${esc(c.name)}')">Delete</button>  <!-- i18n: common.delete -->
              </td>
            </tr>`).join('');
    }

    // ── Form helpers ──────────────────────────────────────────────────────────
    function onSourceChange() {
        const src = document.getElementById('fc-f-source').value;
        onvifRows.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.hidden = (src !== 'onvif');
        });
        // ONVIF registration still needs the resolved RTSP media URI for wall playback.
        rtspRow.hidden = (src === 'none');
    }

    function clearForm() {
        ['fc-f-name','fc-f-lat','fc-f-lng','fc-f-zone','fc-f-ohost',
         'fc-f-ouser','fc-f-opass','fc-f-rtsp','fc-f-notes'].forEach(id => {
            const el = document.getElementById(id); if (el) el.value = '';
        });
        const port = document.getElementById('fc-f-oport'); if (port) port.value = '80';
        const path = document.getElementById('fc-f-opath'); if (path) path.value = '/onvif/device_service';
        const tp   = document.getElementById('fc-f-otp');   if (tp)   tp.value   = 'tcp';
        document.getElementById('fc-f-source').value  = 'none';
        document.getElementById('fc-f-ptz').value     = 'false';
        document.getElementById('fc-f-enabled').value = 'true';
        onSourceChange();
    }

    function readForm() {
        return {
            name:         document.getElementById('fc-f-name').value.trim(),
            lat:          parseFloat(document.getElementById('fc-f-lat').value),
            lng:          parseFloat(document.getElementById('fc-f-lng').value),
            zone:         document.getElementById('fc-f-zone').value.trim(),
            streamSource: document.getElementById('fc-f-source').value,
            onvif: {
                host:         document.getElementById('fc-f-ohost').value.trim(),
                port:         parseInt(document.getElementById('fc-f-oport').value, 10) || 80,
                user:         document.getElementById('fc-f-ouser').value.trim(),
                password:     document.getElementById('fc-f-opass').value,
                devicePath:   document.getElementById('fc-f-opath').value.trim(),
                rtspTransport: document.getElementById('fc-f-otp').value,
            },
            rtspUrl:    document.getElementById('fc-f-rtsp').value.trim(),
            ptzEnabled: document.getElementById('fc-f-ptz').value === 'true',
            enabled:    document.getElementById('fc-f-enabled').value === 'true',
            notes:      document.getElementById('fc-f-notes').value.trim(),
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
        document.getElementById('fc-f-name').value    = cam.name;
        document.getElementById('fc-f-lat').value     = cam.lat;
        document.getElementById('fc-f-lng').value     = cam.lng;
        document.getElementById('fc-f-zone').value    = cam.zone;
        document.getElementById('fc-f-source').value  = cam.streamSource;
        document.getElementById('fc-f-ohost').value   = cam.onvif.host;
        document.getElementById('fc-f-oport').value   = cam.onvif.port;
        document.getElementById('fc-f-ouser').value   = cam.onvif.user;
        document.getElementById('fc-f-opass').value   = ''; // never pre-fill password
        document.getElementById('fc-f-opath').value   = cam.onvif.devicePath;
        document.getElementById('fc-f-otp').value     = cam.onvif.rtspTransport;
        document.getElementById('fc-f-rtsp').value    = cam.rtspUrl;
        document.getElementById('fc-f-ptz').value     = String(cam.ptzEnabled);
        document.getElementById('fc-f-enabled').value = String(cam.enabled);
        document.getElementById('fc-f-notes').value   = cam.notes;
        onSourceChange();
        showForm('Edit camera — ' + cam.name); // i18n: fixedCam.form.editTitle
    };

    window.fcDel = async function (id, name) {
        if (!confirm('Delete "' + name + '"? This cannot be undone.')) return; // i18n: fixedCam.confirm.delete
        const r = await api('DELETE', '/api/fixed-cams/' + id);
        if (!r.ok) { showToast(r.error || 'Delete failed.', 'err'); return; } // i18n: fixedCam.err.delete
        showToast('Camera deleted.'); // i18n: fixedCam.toast.deleted
        loadTable();
    };

    // ── CSV template download ─────────────────────────────────────────────────
    function downloadTemplate() {
        const header = 'Name,Lat,Lng,Zone,StreamSource,OnvifHost,OnvifPort,OnvifUser,OnvifPassword,StreamUrl,PtzEnabled,Enabled,Notes';
        const example1 = 'Jalan Ampang Cam 1,3.1575,101.7115,KL Central,onvif,192.168.1.50,80,admin,cam123,,true,true,';
        const example2 = 'Building 3 Entrance,3.1465,101.7100,Bukit Bintang,rtsp,,,,,rtsp://192.168.1.51/stream1,false,true,';
        const csv  = [header, example1, example2].join('\r\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url  = URL.createObjectURL(blob);
        const a    = Object.assign(document.createElement('a'), { href: url, download: 'fixed-cams-template.csv' });
        document.body.appendChild(a); a.click();
        setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 500);
    }

    // ── Event wiring ─────────────────────────────────────────────────────────
    openBtn.addEventListener('click', () => {
        clearForm(); hideForm();
        csvWrap.hidden = true;
        dlg.showModal();
        loadTable();
    });

    closeBtn.addEventListener('click', () => dlg.close());

    dlg.addEventListener('click', e => {
        // close on backdrop click
        if (e.target === dlg) dlg.close();
    });

    addBtn.addEventListener('click', () => {
        editingId = null;
        clearForm();
        csvWrap.hidden = true;
        showForm('Add camera'); // i18n: fixedCam.form.addTitle
    });

    formCancel.addEventListener('click', hideForm);

    formSave.addEventListener('click', async () => {
        const payload = readForm();
        if (!payload.name)                      { showToast('Camera name is required.', 'err'); return; } // i18n: fixedCam.err.nameRequired
        if (isNaN(payload.lat) || isNaN(payload.lng)) { showToast('Latitude and longitude are required.', 'err'); return; } // i18n: fixedCam.err.gpsRequired

        const r = editingId
            ? await api('PUT', '/api/fixed-cams/' + editingId, payload)
            : await api('POST', '/api/fixed-cams', payload);

        if (!r.ok) { showToast(r.error || 'Save failed.', 'err'); return; } // i18n: fixedCam.err.save
        showToast(editingId ? 'Camera updated.' : 'Camera added.'); // i18n: fixedCam.toast.updated / added
        hideForm();
        loadTable();
    });

    csvBtn.addEventListener('click', () => {
        hideForm();
        csvWrap.hidden = !csvWrap.hidden;
        if (!csvWrap.hidden) csvWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    tplBtn.addEventListener('click', downloadTemplate);

    csvImport.addEventListener('click', async () => {
        const csv = csvPaste.value.trim();
        if (!csv) { showToast('Paste CSV rows first.', 'err'); return; } // i18n: fixedCam.err.csvEmpty
        const r = await api('POST', '/api/fixed-cams/import-csv', { csv });
        if (!r.ok) { showToast(r.error || 'Import failed.', 'err'); return; } // i18n: fixedCam.err.csvImport
        showToast('Imported ' + r.imported + ' camera' + (r.imported === 1 ? '' : 's') + '.'); // i18n: fixedCam.toast.imported
        csvPaste.value = '';
        csvWrap.hidden = true;
        loadTable();
    });

    csvCancel.addEventListener('click', () => { csvWrap.hidden = true; });

    document.getElementById('fc-f-source').addEventListener('change', onSourceChange);

}());
