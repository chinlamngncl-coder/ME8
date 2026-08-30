/**
 * Settings → Device Management → NVR Devices (NVR-SETTINGS-UI-V1)
 */
'use strict';

(function (global) {
    const pick = document.getElementById('nvr-device-pick');
    const form = document.getElementById('nvr-device-form');
    const tbody = document.getElementById('nvr-channels-tbody');
    const statusEl = document.getElementById('nvr-status');
    if (!form || !tbody) return;

    let devices = [];
    let fixedCams = [];
    let channelsDraft = [];
    let bound = false;
    let treeData = [];
    const expandedNvrIds = {};
    let selectedNvrId = '';

    function tr(key, fallback) {
        try {
            if (global.I18n && typeof global.I18n.t === 'function') {
                const v = global.I18n.t(key);
                if (v && v !== key) return v;
            }
        } catch (_) { /* ignore */ }
        return fallback != null ? fallback : key;
    }

    function opMsg(payload, err) {
        if (global.OperatorErrorVoice && typeof global.OperatorErrorVoice.message === 'function') {
            return global.OperatorErrorVoice.message(payload || err);
        }
        if (payload && payload.error) return String(payload.error);
        if (err && err.message) return String(err.message);
        return tr('errors.generic', 'Something went wrong. Try again or contact your IT administrator.');
    }

    function setStatus(text, ok) {
        if (!statusEl) return;
        statusEl.textContent = text || '';
        statusEl.style.color = ok === false ? 'var(--danger, #f87171)' : '';
    }

    async function api(method, url, body) {
        const opts = { method: method, credentials: 'same-origin', headers: {} };
        if (body != null) {
            opts.headers['Content-Type'] = 'application/json';
            opts.body = JSON.stringify(body);
        }
        const r = await fetch(url, opts);
        let data = null;
        try { data = await r.json(); } catch (_) { data = null; }
        if (global.LicenseEntitlementsUi && typeof global.LicenseEntitlementsUi.tryHandleLimitResponse === 'function') {
            if (global.LicenseEntitlementsUi.tryHandleLimitResponse(r, data)) {
                const limErr = new Error('limit_reached');
                limErr.limitHandled = true;
                limErr.opPayload = data;
                throw limErr;
            }
        }
        if (!r.ok || (data && data.ok === false)) {
            const err = new Error((data && data.error) || ('HTTP ' + r.status));
            err.opPayload = data;
            throw err;
        }
        return data;
    }

    let discoverJobId = null;
    let discoverPollTimer = null;

    async function refreshCapacityHint() {
        const el = document.getElementById('nvr-capacity-hint');
        if (!el) return;
        try {
            const data = await api('GET', '/api/nvr-devices/capacity/summary');
            const c = data && data.capacity;
            if (!c) { el.textContent = ''; return; }
            if (c.unlimited) {
                el.textContent = 'Fixed pool: ' + c.used + ' in use (lab unlimited).';
                return;
            }
            el.textContent = 'Fixed pool: ' + c.used + ' / ' + (c.max != null ? c.max : '—') +
                ' channels · ' + (c.remaining != null ? c.remaining : '0') + ' remaining.';
        } catch (_) {
            el.textContent = '';
        }
    }

    function renderDiscoverRows(rows) {
        const tbody = document.getElementById('nvr-discover-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        if (!rows || !rows.length) {
            tbody.innerHTML = '<tr><td colspan="4" class="setup-hint">No ONVIF devices found on this subnet.</td></tr>';
            return;
        }
        rows.forEach(function (row) {
            const trEl = document.createElement('tr');
            const host = row.ip || row.host || row.hostname || '';
            const port = row.port || row.httpPort || 80;
            const status = row.status || row.state || 'Found';
            trEl.innerHTML =
                '<td>' + esc(host) + '</td>' +
                '<td>' + esc(String(port)) + '</td>' +
                '<td>' + esc(String(status)) + '</td>' +
                '<td><button type="button" class="btn btn-ghost btn-sm nvr-use-host">Use Host</button></td>';
            trEl.querySelector('.nvr-use-host').addEventListener('click', function () {
                const hostEl = document.getElementById('nvr-f-host');
                const httpEl = document.getElementById('nvr-f-http-port');
                if (hostEl) hostEl.value = host;
                if (httpEl && port) httpEl.value = String(port);
                setStatus('Host loaded — run Discover Channels.', true);
            });
            tbody.appendChild(trEl);
        });
    }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function currentNvrId() {
        return String((document.getElementById('nvr-f-id') || {}).value || '').trim();
    }

    function channelsForTreeNode(nvrId) {
        if (nvrId && nvrId === currentNvrId()) return channelsDraft.slice();
        const node = treeData.find(function (d) { return d.id === nvrId; });
        return node && node.children ? node.children.slice() : [];
    }

    async function loadTreeData() {
        try {
            const data = await api('GET', '/api/nvr-devices/tree');
            treeData = Array.isArray(data.tree) ? data.tree : [];
        } catch (_) {
            treeData = [];
        }
        renderTree();
    }

    function renderTree() {
        const root = document.getElementById('nvr-device-tree');
        if (!root) return;
        root.innerHTML = '';
        const ul = document.createElement('ul');
        ul.className = 'nvr-tree-root';
        if (!treeData.length && !currentNvrId()) {
            const empty = document.createElement('p');
            empty.className = 'setup-hint';
            empty.textContent = tr('settings.nvr.tree.empty', 'No NVR devices yet. Click Add Device to onboard one.');
            root.appendChild(empty);
            return;
        }
        treeData.forEach(function (nvr) {
            ul.appendChild(buildNvrTreeNode(nvr));
        });
        root.appendChild(ul);
    }

    function buildNvrTreeNode(nvr) {
        const li = document.createElement('li');
        li.className = 'nvr-tree-node';
        li.setAttribute('role', 'treeitem');
        const row = document.createElement('div');
        row.className = 'nvr-tree-row' + (selectedNvrId === nvr.id ? ' is-selected' : '');
        const channels = channelsForTreeNode(nvr.id);
        const expanded = expandedNvrIds[nvr.id] !== false;
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'nvr-tree-toggle';
        toggle.setAttribute('aria-label', expanded ? 'Collapse' : 'Expand');
        toggle.textContent = channels.length ? (expanded ? '▼' : '▶') : '·';
        toggle.addEventListener('click', function (e) {
            e.stopPropagation();
            if (!channels.length) return;
            expandedNvrIds[nvr.id] = !expanded;
            renderTree();
        });
        const label = document.createElement('button');
        label.type = 'button';
        label.className = 'nvr-tree-label-btn';
        label.textContent = (nvr.name || nvr.host || nvr.id) +
            ' (' + channels.length + ' ' + tr('settings.nvr.tree.channels', 'channels') + ')';
        label.addEventListener('click', function () {
            selectedNvrId = nvr.id;
            expandedNvrIds[nvr.id] = true;
            if (pick) pick.value = nvr.id;
            loadSelected(nvr.id).catch(function (err) {
                setStatus(opMsg(err.opPayload, err), false);
            });
            renderTree();
        });
        row.appendChild(toggle);
        row.appendChild(label);
        li.appendChild(row);
        if (channels.length && expanded) {
            const childUl = document.createElement('ul');
            childUl.className = 'nvr-tree-children';
            childUl.setAttribute('role', 'group');
            channels.forEach(function (ch) {
                childUl.appendChild(buildChannelTreeNode(nvr.id, ch));
            });
            li.appendChild(childUl);
        }
        return li;
    }

    function buildChannelTreeNode(nvrId, ch) {
        const li = document.createElement('li');
        li.className = 'nvr-tree-node';
        li.setAttribute('role', 'treeitem');
        const row = document.createElement('div');
        row.className = 'nvr-tree-row';
        const idx = Number(ch.channelIndex);
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'enterprise-form-control nvr-tree-channel-input';
        input.value = ch.name || ('Channel ' + (idx + 1));
        input.maxLength = 120;
        input.addEventListener('change', function () {
            renameChannelLocal(nvrId, idx, input.value);
        });
        input.addEventListener('blur', function () {
            renameChannelPersist(nvrId, idx, input.value);
        });
        const meta = document.createElement('span');
        meta.className = 'nvr-tree-meta';
        meta.textContent = 'CH ' + String(idx);
        if (ch.enabled === false) meta.textContent += ' · disabled';
        row.appendChild(input);
        row.appendChild(meta);
        li.appendChild(row);
        return li;
    }

    function renameChannelLocal(nvrId, channelIndex, name) {
        const label = String(name || '').trim();
        if (nvrId === currentNvrId()) {
            channelsDraft.forEach(function (ch) {
                if (Number(ch.channelIndex) === Number(channelIndex)) ch.name = label;
            });
            renderChannels();
        }
    }

    async function renameChannelPersist(nvrId, channelIndex, name) {
        const label = String(name || '').trim();
        if (!label || !nvrId) return;
        renameChannelLocal(nvrId, channelIndex, label);
        try {
            await api('PATCH', '/api/nvr-devices/' + encodeURIComponent(nvrId) +
                '/channels/' + encodeURIComponent(channelIndex), { name: label });
            if (nvrId === currentNvrId()) {
                const idx = channelsDraft.findIndex(function (ch) {
                    return Number(ch.channelIndex) === Number(channelIndex);
                });
                if (idx >= 0) channelsDraft[idx].name = label;
            }
            await loadFixedCams();
            await loadTreeData();
        } catch (err) {
            if (err && err.limitHandled) return;
            setStatus(opMsg(err.opPayload, err), false);
        }
    }

    function onAddDevice() {
        selectedNvrId = '';
        if (pick) pick.value = '';
        clearForm();
        expandedNvrIds.__new = true;
        renderTree();
        setStatus(tr('settings.nvr.btn.addDevice', 'Add Device') + ' — enter NVR details below.', true);
    }

    function setDiscoverStatus(text, ok) {
        const el = document.getElementById('nvr-discover-status');
        if (!el) return;
        el.textContent = text || '';
        el.style.color = ok === false ? 'var(--danger, #f87171)' : '';
    }

    async function pollDiscoverJob(jobId) {
        const data = await api('GET', '/api/fixed-cams/discover/job/' + encodeURIComponent(jobId));
        const job = data && data.job;
        if (!job) throw new Error('Scan job not found.');
        if (job.status === 'running' || job.status === 'queued' || job.status === 'scanning') {
            setDiscoverStatus('Scanning… ' + (job.progress || ''), true);
            return false;
        }
        const rows = (job.results || job.devices || job.found || []).slice();
        renderDiscoverRows(rows);
        setDiscoverStatus('Scan complete — ' + rows.length + ' device(s).', true);
        return true;
    }

    async function onScanNetwork() {
        const cidrEl = document.getElementById('nvr-discover-cidr');
        const cidr = cidrEl ? String(cidrEl.value || '').trim() : '';
        if (!cidr) {
            setDiscoverStatus('Enter a subnet CIDR first.', false);
            return;
        }
        if (discoverPollTimer) {
            clearInterval(discoverPollTimer);
            discoverPollTimer = null;
        }
        setDiscoverStatus('Starting scan…', true);
        try {
            const start = await api('POST', '/api/fixed-cams/discover/start', { cidr: cidr });
            discoverJobId = start && start.job && start.job.id;
            if (!discoverJobId) throw new Error('Scan could not start.');
            discoverPollTimer = setInterval(function () {
                pollDiscoverJob(discoverJobId).then(function (done) {
                    if (done && discoverPollTimer) {
                        clearInterval(discoverPollTimer);
                        discoverPollTimer = null;
                    }
                }).catch(function (err) {
                    if (discoverPollTimer) clearInterval(discoverPollTimer);
                    discoverPollTimer = null;
                    setDiscoverStatus(opMsg(err.opPayload, err), false);
                });
            }, 1500);
            await pollDiscoverJob(discoverJobId);
        } catch (err) {
            setDiscoverStatus(opMsg(err.opPayload, err), false);
        }
    }

    function applyI18n(root) {
        if (global.I18n && typeof global.I18n.applyTo === 'function') {
            global.I18n.applyTo(root || document.getElementById('ss-panel-nvr'));
        } else if (global.I18n && typeof global.I18n.apply === 'function') {
            global.I18n.apply(root || document.getElementById('ss-panel-nvr'));
        }
    }

    function formPayload() {
        const password = String((document.getElementById('nvr-f-password') || {}).value || '');
        const body = {
            name: String((document.getElementById('nvr-f-name') || {}).value || '').trim(),
            host: String((document.getElementById('nvr-f-host') || {}).value || '').trim(),
            httpPort: parseInt((document.getElementById('nvr-f-http-port') || {}).value, 10) || 80,
            rtspPort: parseInt((document.getElementById('nvr-f-rtsp-port') || {}).value, 10) || 554,
            username: String((document.getElementById('nvr-f-username') || {}).value || '').trim(),
            protocol: String((document.getElementById('nvr-f-protocol') || {}).value || 'onvif'),
            onvifDevicePath: String((document.getElementById('nvr-f-device-path') || {}).value || '/onvif/device_service').trim(),
            rtspTransport: String((document.getElementById('nvr-f-transport') || {}).value || 'tcp'),
            rtspUrlTemplate: String((document.getElementById('nvr-f-template') || {}).value || '').trim(),
            notes: String((document.getElementById('nvr-f-notes') || {}).value || '').trim(),
            enabled: true,
        };
        if (password) body.password = password;
        return body;
    }

    function clearForm() {
        const idEl = document.getElementById('nvr-f-id');
        if (idEl) idEl.value = '';
        ['nvr-f-name', 'nvr-f-host', 'nvr-f-username', 'nvr-f-password', 'nvr-f-template', 'nvr-f-notes'].forEach(function (id) {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        const http = document.getElementById('nvr-f-http-port');
        if (http) http.value = '80';
        const rtsp = document.getElementById('nvr-f-rtsp-port');
        if (rtsp) rtsp.value = '554';
        const proto = document.getElementById('nvr-f-protocol');
        if (proto) proto.value = 'onvif';
        const transport = document.getElementById('nvr-f-transport');
        if (transport) transport.value = 'tcp';
        const path = document.getElementById('nvr-f-device-path');
        if (path) path.value = '/onvif/device_service';
        channelsDraft = [];
        renderChannels();
        setStatus('');
    }

    function fillForm(device) {
        if (!device) {
            clearForm();
            return;
        }
        selectedNvrId = device.id || '';
        document.getElementById('nvr-f-id').value = device.id || '';
        document.getElementById('nvr-f-name').value = device.name || '';
        document.getElementById('nvr-f-host').value = device.host || '';
        document.getElementById('nvr-f-http-port').value = String(device.httpPort || 80);
        document.getElementById('nvr-f-rtsp-port').value = String(device.rtspPort || 554);
        document.getElementById('nvr-f-username').value = device.username || '';
        document.getElementById('nvr-f-password').value = '';
        document.getElementById('nvr-f-protocol').value = device.protocol === 'rtsp_template' ? 'rtsp_template' : 'onvif';
        document.getElementById('nvr-f-transport').value = device.rtspTransport === 'udp' ? 'udp' : 'tcp';
        document.getElementById('nvr-f-device-path').value = device.onvifDevicePath || '/onvif/device_service';
        document.getElementById('nvr-f-template').value = device.rtspUrlTemplate || '';
        document.getElementById('nvr-f-notes').value = device.notes || '';
        channelsDraft = Array.isArray(device.channels) ? device.channels.map(function (c) {
            return {
                channelIndex: c.channelIndex,
                name: c.name || '',
                fixedCameraId: c.fixedCameraId || null,
                onvifProfileToken: c.onvifProfileToken || '',
                enabled: c.enabled !== false,
            };
        }) : [];
        renderChannels();
        renderTree();
        setStatus(device.passwordStored ? '' : '');
    }

    function refreshPick(selectedId) {
        if (!pick) return;
        const sel = selectedId != null ? String(selectedId) : '';
        pick.innerHTML = '';
        const blank = document.createElement('option');
        blank.value = '';
        blank.textContent = '';
        pick.appendChild(blank);
        devices.forEach(function (d) {
            const opt = document.createElement('option');
            opt.value = d.id;
            opt.textContent = d.name || d.host || d.id;
            pick.appendChild(opt);
        });
        pick.value = sel;
    }

    function fixedCamLabel(id) {
        if (!id) return '';
        const cam = fixedCams.find(function (c) { return String(c.id) === String(id); });
        return cam ? (cam.name || cam.id) : String(id);
    }

    function renderChannels() {
        tbody.innerHTML = '';
        channelsDraft.forEach(function (ch, rowIdx) {
            const trEl = document.createElement('tr');
            trEl.setAttribute('data-row', String(rowIdx));

            const tdCh = document.createElement('td');
            tdCh.textContent = String(ch.channelIndex);
            trEl.appendChild(tdCh);

            const tdName = document.createElement('td');
            const nameIn = document.createElement('input');
            nameIn.type = 'text';
            nameIn.className = 'enterprise-form-control';
            nameIn.style.maxWidth = '220px';
            nameIn.value = ch.name || '';
            nameIn.addEventListener('change', function () {
                channelsDraft[rowIdx].name = nameIn.value;
            });
            tdName.appendChild(nameIn);
            trEl.appendChild(tdName);

            const tdLink = document.createElement('td');
            const linkSel = document.createElement('select');
            linkSel.className = 'enterprise-form-control';
            linkSel.style.maxWidth = '220px';
            const opt0 = document.createElement('option');
            opt0.value = '';
            opt0.textContent = '';
            linkSel.appendChild(opt0);
            fixedCams.forEach(function (cam) {
                const o = document.createElement('option');
                o.value = cam.id;
                o.textContent = cam.name || cam.id;
                linkSel.appendChild(o);
            });
            linkSel.value = ch.fixedCameraId || '';
            linkSel.addEventListener('change', function () {
                channelsDraft[rowIdx].fixedCameraId = linkSel.value || null;
            });
            tdLink.appendChild(linkSel);
            trEl.appendChild(tdLink);

            const tdEn = document.createElement('td');
            const en = document.createElement('input');
            en.type = 'checkbox';
            en.title = tr('settings.nvr.table.provisionSlotHint', 'Provision this channel into the Universal Fixed Slot pool. Uncheck empty channels.');
            en.setAttribute('aria-label', tr('settings.nvr.table.provisionSlot', 'Provision Slot'));
            en.checked = ch.enabled !== false;
            en.addEventListener('change', function () {
                channelsDraft[rowIdx].enabled = !!en.checked;
            });
            tdEn.appendChild(en);
            trEl.appendChild(tdEn);

            const tdLive = document.createElement('td');
            const liveBtn = document.createElement('button');
            liveBtn.type = 'button';
            liveBtn.className = 'btn btn-ghost btn-sm';
            liveBtn.setAttribute('data-i18n', 'settings.nvr.table.openLive');
            liveBtn.textContent = tr('settings.nvr.table.openLive', 'Open Live');
            liveBtn.disabled = !ch.fixedCameraId;
            liveBtn.addEventListener('click', function () {
                openLive(ch.fixedCameraId);
            });
            tdLive.appendChild(liveBtn);
            trEl.appendChild(tdLive);

            const tdPin = document.createElement('td');
            const pinBtn = document.createElement('button');
            pinBtn.type = 'button';
            pinBtn.className = 'btn btn-ghost btn-sm';
            pinBtn.setAttribute('data-i18n', 'settings.nvr.table.mapPin');
            pinBtn.textContent = tr('settings.nvr.table.mapPin', 'Map PIN');
            pinBtn.disabled = !ch.fixedCameraId;
            pinBtn.addEventListener('click', function () {
                openMapPin(ch.fixedCameraId);
            });
            tdPin.appendChild(pinBtn);
            trEl.appendChild(tdPin);

            tbody.appendChild(trEl);
        });
        applyI18n(tbody);
        renderTree();
    }

    async function openLive(fixedCameraId) {
        if (!fixedCameraId) return;
        try {
            await api('POST', '/api/fixed-cams/' + encodeURIComponent(fixedCameraId) + '/zlm/start', {});
            setStatus(fixedCamLabel(fixedCameraId), true);
        } catch (err) {
            setStatus(opMsg(err.opPayload, err), false);
        }
    }

    function openMapPin(fixedCameraId) {
        if (!fixedCameraId) return;
        const cam = fixedCams.find(function (c) { return String(c.id) === String(fixedCameraId); });
        if (!cam) {
            setStatus(tr('errors.deviceNotFound', 'Device not found.'), false);
            return;
        }
        try {
            const mapBtn = document.querySelector('[data-panel="map"], #nav-map, button[data-view="map"]');
            if (mapBtn && typeof mapBtn.click === 'function') mapBtn.click();
            const lat = Number(cam.lat);
            const lng = Number(cam.lng);
            if (global.map && Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
                if (typeof global.map.setView === 'function') global.map.setView([lat, lng], 18);
                else if (typeof global.map.flyTo === 'function') global.map.flyTo([lat, lng], 18);
            }
            setStatus(fixedCamLabel(fixedCameraId), true);
        } catch (err) {
            setStatus(opMsg(null, err), false);
        }
    }

    async function loadFixedCams() {
        try {
            const data = await api('GET', '/api/fixed-cams');
            fixedCams = (data && data.cams) || [];
        } catch (_) {
            fixedCams = [];
        }
    }

    async function loadDevices() {
        const data = await api('GET', '/api/nvr-devices');
        devices = (data && data.devices) || [];
        refreshPick(document.getElementById('nvr-f-id').value || '');
        await loadTreeData();
    }

    async function loadSelected(id) {
        if (!id) {
            clearForm();
            return;
        }
        const data = await api('GET', '/api/nvr-devices/' + encodeURIComponent(id));
        fillForm(data.device);
        refreshPick(id);
    }

    async function onSave() {
        const id = String((document.getElementById('nvr-f-id') || {}).value || '').trim();
        const body = formPayload();
        const channelsPayload = channelsDraft.slice();
        try {
            let device;
            if (id) {
                const r = await api('PUT', '/api/nvr-devices/' + encodeURIComponent(id), body);
                device = r.device;
                if (device && device.id && channelsPayload.length) {
                    await api('PUT', '/api/nvr-devices/' + encodeURIComponent(device.id) + '/channels', {
                        channels: channelsPayload,
                    });
                }
            } else {
                const r = await api('POST', '/api/nvr-devices', Object.assign({}, body, {
                    channels: channelsPayload,
                }));
                device = r.device;
            }
            await loadDevices();
            await loadFixedCams();
            await loadSelected(device.id);
            await refreshCapacityHint();
            selectedNvrId = device.id;
            expandedNvrIds[device.id] = true;
            setStatus((device.name || device.id) + ' · ' + channelsPayload.length + ' channel(s) registered', true);
        } catch (err) {
            if (err && err.limitHandled) return;
            setStatus(opMsg(err.opPayload, err), false);
        }
    }

    async function onRemove() {
        const id = String((document.getElementById('nvr-f-id') || {}).value || '').trim();
        if (!id) return;
        try {
            await api('DELETE', '/api/nvr-devices/' + encodeURIComponent(id));
            await loadDevices();
            await loadFixedCams();
            clearForm();
            selectedNvrId = '';
            if (pick) pick.value = '';
        } catch (err) {
            setStatus(opMsg(err.opPayload, err), false);
        }
    }

    async function onTest() {
        const body = formPayload();
        const id = String((document.getElementById('nvr-f-id') || {}).value || '').trim();
        if (id) body.id = id;
        try {
            const r = await api('POST', '/api/nvr-devices/test-onvif', body);
            const host = (r && r.hostname) || body.host;
            setStatus(host + (r && r.profileCount != null ? (' · ' + r.profileCount) : ''), true);
        } catch (err) {
            setStatus(opMsg(err.opPayload, err), false);
        }
    }

    async function onDiscover() {
        const body = formPayload();
        const id = String((document.getElementById('nvr-f-id') || {}).value || '').trim();
        if (id) body.id = id;
        try {
            const r = await api('POST', '/api/nvr-devices/discover-channels', body);
            const list = (r && r.channels) || [];
            const byIdx = {};
            channelsDraft.forEach(function (c) { byIdx[c.channelIndex] = c; });
            channelsDraft = list.map(function (c) {
                const prev = byIdx[c.channelIndex];
                return {
                    channelIndex: c.channelIndex,
                    name: c.name || (prev && prev.name) || '',
                    fixedCameraId: (prev && prev.fixedCameraId) || c.fixedCameraId || null,
                    onvifProfileToken: c.onvifProfileToken || '',
                    enabled: c.enabled !== false,
                };
            });
            renderChannels();
            renderTree();
            setStatus(String(channelsDraft.length) + ' channel(s) discovered.', true);
        } catch (err) {
            setStatus(opMsg(err.opPayload, err), false);
        }
    }

    function bind() {
        if (bound) return;
        bound = true;
        if (pick) {
            pick.addEventListener('change', function () {
                const id = pick.value;
                if (!id) clearForm();
                else loadSelected(id).catch(function (err) {
                    setStatus(opMsg(err.opPayload, err), false);
                });
            });
        }
        const saveBtn = document.getElementById('nvr-btn-save');
        const removeBtn = document.getElementById('nvr-btn-remove');
        const testBtn = document.getElementById('nvr-btn-test');
        const discBtn = document.getElementById('nvr-btn-discover');
        const scanBtn = document.getElementById('nvr-btn-scan');
        const addBtn = document.getElementById('nvr-btn-add-device');
        if (saveBtn) saveBtn.addEventListener('click', function () { onSave(); });
        if (removeBtn) removeBtn.addEventListener('click', function () { onRemove(); });
        if (testBtn) testBtn.addEventListener('click', function () { onTest(); });
        if (discBtn) discBtn.addEventListener('click', function () { onDiscover(); });
        if (scanBtn) scanBtn.addEventListener('click', function () { onScanNetwork(); });
        if (addBtn) addBtn.addEventListener('click', function () { onAddDevice(); });
    }

    async function showInPanel() {
        bind();
        applyI18n(document.getElementById('ss-panel-nvr'));
        try {
            await loadFixedCams();
            await loadDevices();
            await refreshCapacityHint();
            const cur = String((document.getElementById('nvr-f-id') || {}).value || '');
            if (cur) await loadSelected(cur);
            else {
                renderChannels();
                renderTree();
            }
        } catch (err) {
            setStatus(opMsg(err.opPayload, err), false);
        }
    }

    function hideInPanel() {
        setStatus('');
    }

    global.SettingsNvr = {
        showInPanel: showInPanel,
        hideInPanel: hideInPanel,
    };
})(typeof window !== 'undefined' ? window : global);
