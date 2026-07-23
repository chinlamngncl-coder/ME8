/**
 * All BWCs (unlimited) \u2014 operator name, map group, credentials.
 * Video wall (Ch 1\u20136) only picks which device ID plays on each panel.
 */
(function (global) {
    function tr(key, params) {
        if (typeof I18n !== 'undefined' && I18n.t) return I18n.t(key, params);
        return key;
    }

    const CSV_HEADER = ['Device ID', 'Nickname', 'Unit code', 'Map group', 'User name', 'Password', 'Protocol'];
    let devices = [];
    let open = false;

    function esc(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    }

    function findByDeviceId(deviceId) {
        if (!deviceId) return null;
        const id = String(deviceId).trim();
        return devices.find((d) => d.deviceId === id) || null;
    }

    function deviceCount() {
        return devices.filter((d) => d.deviceId).length;
    }

    function listDevices() {
        return devices.slice();
    }

    async function load() {
        try {
            const res = await fetch('/api/bwc-devices');
            const data = await res.json();
            devices = Array.isArray(data.devices) ? data.devices.slice() : [];
        } catch (_) {
            devices = [];
        }
        if (global.VideoConfig && VideoConfig.applyLabelsToWall) VideoConfig.applyLabelsToWall();
        if (global.refreshAllDeviceMarkerStyles) global.refreshAllDeviceMarkerStyles();
        if (global.syncGeofenceLayers) global.syncGeofenceLayers();
        buildEmbeddedTable();
        return devices;
    }

    async function saveDevices(next) {
        const res = await fetch('/api/bwc-devices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ devices: next }),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || 'Save failed');
        devices = Array.isArray(data.devices) ? data.devices.slice() : next;
        if (global.VideoConfig && VideoConfig.applyLabelsToWall) VideoConfig.applyLabelsToWall();
        if (global.refreshAllDeviceMarkerStyles) global.refreshAllDeviceMarkerStyles();
        if (global.syncAllDeviceMarkers) global.syncAllDeviceMarkers();
        if (global.syncGeofenceLayers) global.syncGeofenceLayers();
        if (global.ServerSetup && global.ServerSetup.refreshDeviceSummary) {
            global.ServerSetup.refreshDeviceSummary();
        }
        buildEmbeddedTable();
        return data;
    }

    function escapeCsvCell(val) {
        const s = val == null ? '' : String(val);
        if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
        return s;
    }

    function devicesToCsv(rows) {
        const lines = [CSV_HEADER.join(',')];
        rows.forEach((d) => {
            lines.push([
                d.deviceId || '',
                d.operatorName || '',
                d.unitCode || '',
                d.mapGroup || '',
                d.userName || '',
                d.password || '',
                d.protocol === 'onvif' ? 'onvif' : 'sip',
            ].map(escapeCsvCell).join(','));
        });
        return '\uFEFF' + lines.join('\r\n') + '\r\n';
    }

    function parseCsvLine(line) {
        const out = [];
        let cur = '';
        let inQ = false;
        for (let i = 0; i < line.length; i += 1) {
            const c = line[i];
            if (inQ) {
                if (c === '"' && line[i + 1] === '"') { cur += '"'; i += 1; }
                else if (c === '"') inQ = false;
                else cur += c;
            } else if (c === '"') inQ = true;
            else if (c === ',') { out.push(cur); cur = ''; }
            else cur += c;
        }
        out.push(cur);
        return out;
    }

    function parseCsvText(text) {
        const lines = String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
        if (!lines.length) return [];
        const header = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
        const idx = {
            deviceId: header.findIndex((h) => h.indexOf('device') >= 0),
            operator: header.findIndex(function (h) { return h.indexOf('operator') >= 0 || h === 'nickname'; }),
            unitCode: header.findIndex(function (h) { return h.indexOf('unit') >= 0 || h.indexOf('badge') >= 0; }),
            mapGroup: header.findIndex((h) => h.indexOf('map') >= 0 && h.indexOf('group') >= 0),
            userName: header.findIndex((h) => h.indexOf('user') >= 0),
            password: header.indexOf('password'),
            protocol: header.indexOf('protocol'),
        };
        if (idx.deviceId < 0) throw new Error(tr('bwc.error.csvNoDeviceId'));
        const out = [];
        const seen = new Set();
        for (let li = 1; li < lines.length; li += 1) {
            const cols = parseCsvLine(lines[li]);
            const deviceId = String(cols[idx.deviceId] || '').trim();
            if (!deviceId || seen.has(deviceId)) continue;
            if (!/^3402\d{16,}$/.test(deviceId)) continue;
            seen.add(deviceId);
            out.push({
                deviceId,
                operatorName: idx.operator >= 0 ? String(cols[idx.operator] || '').trim() : '',
                unitCode: idx.unitCode >= 0 ? String(cols[idx.unitCode] || '').trim() : '',
                mapGroup: idx.mapGroup >= 0 ? String(cols[idx.mapGroup] || '').trim() : '',
                userName: idx.userName >= 0 ? String(cols[idx.userName] || '').trim() : '',
                password: idx.password >= 0 ? String(cols[idx.password] || '') : '',
                protocol: idx.protocol >= 0 && String(cols[idx.protocol] || '').toLowerCase() === 'onvif' ? 'onvif' : 'sip',
            });
        }
        return out;
    }

    function downloadCsv(filename, content) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    function downloadCsvTemplate() {
        downloadCsv('mobility-c2-bwc-list-template.csv', devicesToCsv([
            {
                deviceId: '34020000001329000008',
                operatorName: 'Officer Lee',
                unitCode: 'UB-6A5G',
                mapGroup: 'North patrol',
                userName: 'admin',
                password: '',
                protocol: 'sip',
            },
        ]));
    }

    function exportCsv() {
        downloadCsv('mobility-c2-bwc-list.csv', devicesToCsv(devices));
    }

    async function importCsvFile(file) {
        if (!file) return 0;
        const text = await file.text();
        const parsed = parseCsvText(text);
        if (!parsed.length) throw new Error(tr('bwc.error.csvEmpty'));
        await saveDevices(parsed);
        const rows = document.getElementById('bwc-devices-rows');
        if (rows && open) buildRows(rows);
        buildEmbeddedTable();
        return parsed.length;
    }

    function deviceOnline(deviceId) {
        if (!deviceId || !global.FleetUi || !FleetUi.getDeviceState) return false;
        return !!FleetUi.getDeviceState(deviceId).online;
    }

    function readEmbeddedTableFromDom() {
        const next = [];
        document.querySelectorAll('#ss-bwc-table-body tr').forEach((row) => {
            const deviceId = (row.querySelector('[data-field="deviceId"]') || {}).value || '';
            if (!String(deviceId).trim()) return;
            next.push({
                deviceId: String(deviceId).trim(),
                operatorName: String((row.querySelector('[data-field="operatorName"]') || {}).value || '').trim(),
                unitCode: String((row.querySelector('[data-field="unitCode"]') || {}).value || '').trim(),
                mapGroup: String((row.querySelector('[data-field="mapGroup"]') || {}).value || '').trim(),
                userName: String((row.querySelector('[data-field="userName"]') || {}).value || '').trim(),
                password: String((row.querySelector('[data-field="password"]') || {}).value || ''),
                pttDownlinkMode: String((row.querySelector('[data-field="pttDownlinkMode"]') || {}).value || 'auto').trim() || 'auto',
                pttAudioCmdMode: String((row.querySelector('[data-field="pttAudioCmdMode"]') || {}).value || 'auto').trim() || 'auto',
                protocol: (row.querySelector('[data-field="protocol"]') || {}).value === 'onvif' ? 'onvif' : 'sip',
            });
        });
        return next;
    }

    function deviceStatusLabel(d) {
        const st = (d && d.status) || 'active';
        if (st === 'retired') return tr('bwc.status.retired');
        if (st === 'inactive') return tr('bwc.status.inactive');
        return tr('bwc.status.active');
    }

    function lifecycleActionHtml(d) {
        if (!d || !d.deviceId) return '';
        if (d.status === 'retired') {
            return '<button type="button" class="ss-bwc-lifecycle ss-bwc-restore" data-device-id="' + esc(d.deviceId) + '">' + esc(tr('bwc.action.restore')) + '</button>';
        }
        return '<button type="button" class="ss-bwc-lifecycle ss-bwc-retire" data-device-id="' + esc(d.deviceId) + '">' + esc(tr('bwc.action.retire')) + '</button>';
    }

    async function retireDevice(deviceId) {
        const res = await fetch('/api/bwc-devices/' + encodeURIComponent(deviceId) + '/retire', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: 'admin' }),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || 'Retire failed');
        await load();
        if (global.syncAllDeviceMarkers) global.syncAllDeviceMarkers();
        return data;
    }

    async function restoreDevice(deviceId) {
        const res = await fetch('/api/bwc-devices/' + encodeURIComponent(deviceId) + '/restore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || 'Restore failed');
        await load();
        if (global.syncAllDeviceMarkers) global.syncAllDeviceMarkers();
        return data;
    }

    function buildEmbeddedTable() {
        const tbody = document.getElementById('ss-bwc-table-body');
        if (!tbody) return;
        const list = devices.length
            ? devices.slice()
            : [{ deviceId: '', operatorName: '', unitCode: '', mapGroup: '', userName: '', password: '', protocol: 'sip', status: 'active' }];
        tbody.innerHTML = list.map(function (d) {
            const on = deviceOnline(d.deviceId);
            const st = (d.status || 'active');
            const pttMode = d.pttDownlinkMode || 'auto';
            const audioCmdMode = d.pttAudioCmdMode || 'auto';
            return '<tr>' +
                '<td><span class="ss-bwc-dot' + (on ? ' on' : '') + '" title="' + (on ? 'Online' : 'Offline') + '"></span></td>' +
                '<td><input type="text" data-field="operatorName" value="' + esc(d.operatorName) + '" placeholder="' + esc(tr('bwc.placeholder.nickname')) + '"></td>' +
                '<td><input type="text" data-field="unitCode" value="' + esc(d.unitCode || '') + '" placeholder="' + esc(tr('bwc.placeholder.unitCode')) + '"></td>' +
                '<td><input type="text" class="ss-bwc-id" data-field="deviceId" value="' + esc(d.deviceId) + '" placeholder="' + esc(tr('bwc.placeholder.deviceId')) + '" title="' + esc(tr('bwc.hint.deviceId')) + '"></td>' +
                '<td><input type="text" data-field="mapGroup" value="' + esc(d.mapGroup) + '" placeholder="' + esc(tr('bwc.placeholder.mapGroup')) + '"></td>' +
                '<td><input type="text" data-field="userName" value="' + esc(d.userName) + '"></td>' +
                '<td><select data-field="pttDownlinkMode" title="' + esc(tr('bwc.col.pttDownlink')) + '">' +
                '<option value="auto"' + (pttMode === 'auto' ? ' selected' : '') + '>' + esc(tr('ptt.downlink.auto')) + '</option>' +
                '<option value="ptt"' + (pttMode === 'ptt' ? ' selected' : '') + '>' + esc(tr('ptt.downlink.ptt')) + '</option>' +
                '<option value="voice"' + (pttMode === 'voice' ? ' selected' : '') + '>' + esc(tr('ptt.downlink.voice')) + '</option>' +
                '</select></td>' +
                '<td><select data-field="pttAudioCmdMode" title="' + esc(tr('bwc.col.pttAudioCmd')) + '">' +
                '<option value="auto"' + (audioCmdMode === 'auto' ? ' selected' : '') + '>' + esc(tr('ptt.audioCmd.auto')) + '</option>' +
                '<option value="legacy"' + (audioCmdMode === 'legacy' ? ' selected' : '') + '>' + esc(tr('ptt.audioCmd.legacy')) + '</option>' +
                '<option value="modern"' + (audioCmdMode === 'modern' ? ' selected' : '') + '>' + esc(tr('ptt.audioCmd.modern')) + '</option>' +
                '</select></td>' +
                '<td><select data-field="protocol">' +
                '<option value="sip"' + (d.protocol !== 'onvif' ? ' selected' : '') + '>SIP</option>' +
                '<option value="onvif"' + (d.protocol === 'onvif' ? ' selected' : '') + '>ONVIF</option>' +
                '</select></td>' +
                '<td><span class="ss-bwc-status ' + esc(st) + '">' + esc(deviceStatusLabel(d)) + '</span></td>' +
                '<td>' + lifecycleActionHtml(d) + '</td>' +
                '<td><button type="button" class="ss-bwc-del" data-action="del" aria-label="Remove">\u00D7</button></td>' +
                '</tr>';
        }).join('');
    }

    function refreshEmbeddedOnlineDots() {
        document.querySelectorAll('#ss-bwc-table-body tr').forEach(function (row) {
            const idEl = row.querySelector('[data-field="deviceId"]');
            const dot = row.querySelector('.ss-bwc-dot');
            if (!idEl || !dot) return;
            const on = deviceOnline(idEl.value.trim());
            dot.classList.toggle('on', on);
        });
    }

    function addEmbeddedRow() {
        devices = readEmbeddedTableFromDom();
        devices.push({ deviceId: '', operatorName: '', unitCode: '', mapGroup: '', userName: '', password: '', protocol: 'sip' });
        buildEmbeddedTable();
    }

    function bindEmbeddedTable() {
        const tbody = document.getElementById('ss-bwc-table-body');
        if (!tbody || tbody.dataset.bound === '1') return;
        tbody.dataset.bound = '1';
        tbody.addEventListener('click', function (e) {
            if (e.target.matches('.ss-bwc-retire')) {
                const deviceId = e.target.getAttribute('data-device-id');
                if (!deviceId || !window.confirm(tr('bwc.confirm.retire'))) return;
                retireDevice(deviceId).catch(function (err) { alert(err.message || 'Retire failed'); });
                return;
            }
            if (e.target.matches('.ss-bwc-restore')) {
                const deviceId = e.target.getAttribute('data-device-id');
                if (!deviceId) return;
                restoreDevice(deviceId).catch(function (err) { alert(err.message || 'Restore failed'); });
                return;
            }
            if (!e.target.matches('[data-action="del"]')) return;
            const row = e.target.closest('tr');
            if (!row) return;
            devices = readEmbeddedTableFromDom();
            const id = ((row.querySelector('[data-field="deviceId"]') || {}).value || '').trim();
            devices = devices.filter(function (d) { return d.deviceId !== id; });
            if (!devices.length) {
                devices = [{ deviceId: '', operatorName: '', unitCode: '', mapGroup: '', userName: '', password: '', protocol: 'sip' }];
            }
            buildEmbeddedTable();
        });
    }

    async function saveEmbeddedList() {
        const next = readEmbeddedTableFromDom();
        if (!next.length) throw new Error(tr('bwc.error.needDeviceId'));
        await saveDevices(next);
        buildEmbeddedTable();
        return next.length;
    }

    function readFormFromDom() {
        const next = [];
        document.querySelectorAll('#bwc-devices-rows .bwc-device-row').forEach((row) => {
            const deviceId = (row.querySelector('[data-field="deviceId"]') || {}).value || '';
            if (!String(deviceId).trim()) return;
            next.push({
                deviceId: String(deviceId).trim(),
                operatorName: String((row.querySelector('[data-field="operatorName"]') || {}).value || '').trim(),
                unitCode: String((row.querySelector('[data-field="unitCode"]') || {}).value || '').trim(),
                mapGroup: String((row.querySelector('[data-field="mapGroup"]') || {}).value || '').trim(),
                userName: String((row.querySelector('[data-field="userName"]') || {}).value || '').trim(),
                password: String((row.querySelector('[data-field="password"]') || {}).value || ''),
                protocol: (row.querySelector('[data-field="protocol"]') || {}).value === 'onvif' ? 'onvif' : 'sip',
            });
        });
        return next;
    }

    function buildRows(container) {
        container.innerHTML = '';
        const list = devices.length ? devices : [{ deviceId: '', operatorName: '', unitCode: '', mapGroup: '', userName: '', password: '', protocol: 'sip' }];
        list.forEach((d, i) => {
            const row = document.createElement('div');
            row.className = 'bwc-device-row video-config-row';
            row.innerHTML =
                '<div class="video-config-row-title">' + tr('bwc.rowTitle', { n: i + 1 }) + '</div>' +
                '<label>' + tr('bwc.field.nickname') + '<input type="text" data-field="operatorName" value="' + esc(d.operatorName) + '" placeholder="' + esc(tr('bwc.placeholder.nickname')) + '"></label>' +
                '<label>' + tr('bwc.field.unitCode') + '<input type="text" data-field="unitCode" value="' + esc(d.unitCode || '') + '" placeholder="' + esc(tr('bwc.placeholder.unitCode')) + '"></label>' +
                '<label>' + tr('bwc.field.deviceId') + '<input type="text" data-field="deviceId" value="' + esc(d.deviceId) + '" placeholder="' + esc(tr('bwc.placeholder.deviceId')) + '" title="' + esc(tr('bwc.hint.deviceId')) + '"></label>' +
                '<label>' + tr('bwc.field.mapGroup') + '<input type="text" data-field="mapGroup" value="' + esc(d.mapGroup) + '" placeholder="' + esc(tr('bwc.placeholder.mapGroup')) + '"></label>' +
                '<label>' + tr('bwc.field.userName') + '<input type="text" data-field="userName" value="' + esc(d.userName) + '"></label>' +
                '<label>' + tr('bwc.field.password') + '<input type="password" data-field="password" value="' + esc(d.password) + '"></label>' +
                '<label>' + tr('bwc.field.protocol') + '<select data-field="protocol">' +
                '<option value="sip"' + (d.protocol !== 'onvif' ? ' selected' : '') + '>SIP</option>' +
                '<option value="onvif"' + (d.protocol === 'onvif' ? ' selected' : '') + '>ONVIF</option>' +
                '</select></label>';
            container.appendChild(row);
        });
    }

    function setPanelVisible(show) {
        const backdrop = document.getElementById('bwc-devices-backdrop');
        if (!backdrop) return;
        backdrop.hidden = !show;
        open = show;
    }

    function openPanel() {
        const rows = document.getElementById('bwc-devices-rows');
        if (rows) buildRows(rows);
        setPanelVisible(true);
    }

    function bindUi() {
        const openBtn = document.getElementById('bwc-devices-open');
        const saveBtn = document.getElementById('bwc-devices-save');
        const cancelBtn = document.getElementById('bwc-devices-cancel');
        const addBtn = document.getElementById('bwc-devices-add');
        const backdrop = document.getElementById('bwc-devices-backdrop');
        const rows = document.getElementById('bwc-devices-rows');
        const fileInput = document.getElementById('bwc-devices-file');

        if (openBtn) {
            openBtn.addEventListener('click', () => openPanel());
        }
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => setPanelVisible(false));
        }
        if (backdrop) {
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) setPanelVisible(false);
            });
        }
        if (addBtn && rows) {
            addBtn.addEventListener('click', () => {
                devices = readFormFromDom();
                devices.push({ deviceId: '', operatorName: '', unitCode: '', mapGroup: '', userName: '', password: '', protocol: 'sip' });
                buildRows(rows);
            });
        }
        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                try {
                    const next = readFormFromDom();
                    if (!next.length) throw new Error(tr('bwc.error.needDeviceId'));
                    await saveDevices(next);
                    setPanelVisible(false);
                } catch (err) {
                    alert(tr('bwc.error.saveFailed', { msg: err.message }));
                }
            });
        }
        const tplBtn = document.getElementById('bwc-devices-template');
        const impBtn = document.getElementById('bwc-devices-import');
        const expBtn = document.getElementById('bwc-devices-export');
        if (tplBtn) tplBtn.addEventListener('click', downloadCsvTemplate);
        if (expBtn) expBtn.addEventListener('click', exportCsv);
        if (impBtn && fileInput) {
            impBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', async () => {
                const file = fileInput.files && fileInput.files[0];
                fileInput.value = '';
                if (!file) return;
                try {
                    const n = await importCsvFile(file);
                    alert(tr('bwc.alert.imported', { n: n }));
                } catch (err) {
                    alert(tr('bwc.alert.importFailed', { msg: err.message }));
                }
            });
        }
        window.addEventListener('fm-i18n-changed', () => {
            const rows = document.getElementById('bwc-devices-rows');
            if (rows && open) buildRows(rows);
        });
    }

    function init() {
        bindUi();
        bindEmbeddedTable();
        return load();
    }

    global.BwcDevices = {
        init,
        load,
        saveDevices,
        saveEmbeddedList,
        findByDeviceId,
        listDevices,
        deviceCount,
        openPanel,
        buildEmbeddedTable,
        refreshEmbeddedOnlineDots,
        addEmbeddedRow,
        downloadCsvTemplate,
        exportCsv,
        importCsvFile,
    };
})(window);
