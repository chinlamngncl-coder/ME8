/**
 * OPS-CASE-UI-DESK-V1 — Evidence → Cases desk (ops case store API).
 * OPS-CASE-UI-COPY-PLAIN-V1 — operator-facing strings stay plain English.
 */
(function (global) {
    'use strict';

    var state = {
        family: '',
        type: '',
        audit: '',
        archive: 'active',
        days: 14,
        q: '',
        rows: [],
        current: null,
        loading: false,
        playingEvidenceId: null,
        selected: Object.create(null),
        deskMap: null,
        deskMarker: null,
        deskMapLat: null,
        deskMapLon: null,
        deskMapZoom: 16,
        libraryFiles: [],
        libraryCamPrefer: '',
        librarySearchTimer: null,
    };

    var DESK_MAP_DEFAULT_ZOOM = 16;

    function tr(key, fallback) {
        try {
            if (global.I18n && typeof I18n.t === 'function') {
                var v = I18n.t(key);
                if (v && v !== key) return v;
            }
        } catch (_) { /* ignore */ }
        return fallback != null ? fallback : key;
    }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function isSuperAdmin() {
        return global.__fmDashboardRole === 'super_admin';
    }

    function statusLabel(st) {
        if (st === 'open') return tr('opsCases.statusOpen', 'Open');
        if (st === 'ack_only') return tr('opsCases.statusAckOnly', 'Ack only');
        if (st === 'has_notes') return tr('opsCases.statusHasNotes', 'Has notes');
        if (st === 'amended') return tr('opsCases.statusAmended', 'Amended');
        if (st === 'reviewed') return tr('opsCases.statusReviewed', 'Reviewed');
        if (st === 'archived') return tr('opsCases.statusArchived', 'Archived');
        return st || '—';
    }

    function statusClass(st) {
        if (st === 'open') return 'ops-case-badge ops-case-badge-open';
        if (st === 'ack_only') return 'ops-case-badge ops-case-badge-ack';
        if (st === 'has_notes') return 'ops-case-badge ops-case-badge-notes';
        if (st === 'amended') return 'ops-case-badge ops-case-badge-amended';
        if (st === 'reviewed') return 'ops-case-badge ops-case-badge-reviewed';
        if (st === 'archived') return 'ops-case-badge ops-case-badge-archived';
        return 'ops-case-badge';
    }

    function formatWhen(iso) {
        if (!iso) return '—';
        try {
            var d = new Date(iso);
            if (Number.isNaN(d.getTime())) return String(iso);
            return d.toLocaleString();
        } catch (_) {
            return String(iso);
        }
    }

    function setAnalyticsTypeVisible() {
        var wrap = document.getElementById('ops-cases-type-wrap');
        if (!wrap) return;
        wrap.hidden = state.family !== 'ANALYTICS';
        if (state.family !== 'ANALYTICS') {
            state.type = '';
            var sel = document.getElementById('ops-cases-type');
            if (sel) sel.value = '';
        }
    }

    function buildQuery() {
        var params = new URLSearchParams();
        params.set('days', String(state.days || 14));
        params.set('limit', '100');
        if (state.family) params.set('family', state.family);
        if (state.type) params.set('type', state.type);
        if (state.audit === 'ack') {
            params.set('status', 'ack_only');
        } else if (state.audit === 'ack24') {
            params.set('status', 'ack_only');
            params.set('ackOnlyAgeHours', '24');
            params.set('oldestFirst', '1');
        } else if (state.audit === 'ack7d') {
            params.set('status', 'ack_only');
            params.set('ackOnlyAgeHours', String(7 * 24));
            params.set('oldestFirst', '1');
        } else if (state.audit === 'ack30d') {
            params.set('status', 'ack_only');
            params.set('ackOnlyAgeHours', String(30 * 24));
            params.set('oldestFirst', '1');
        } else if (state.audit === 'has_notes' || state.audit === 'amended' || state.audit === 'reviewed') {
            params.set('status', state.audit);
        }
        params.set('archive', state.archive === 'archived' || state.archive === 'all' ? state.archive : 'active');
        return params.toString();
    }

    function filterClient(rows) {
        var q = String(state.q || '').trim().toLowerCase();
        if (!q) return rows;
        return (rows || []).filter(function (r) {
            var blob = [
                r.caseId, r.cameraId, r.kind, r.title, r.closedBy, r.status,
            ].join(' ').toLowerCase();
            if (blob.indexOf(q) >= 0) return true;
            var notes = r.notes || [];
            for (var i = 0; i < notes.length; i += 1) {
                if (String(notes[i].text || '').toLowerCase().indexOf(q) >= 0) return true;
            }
            return false;
        });
    }

    var OPS_FEW_ROWS_MAX = 12;

    /** Scroll only when list fills the panel; empty/few rows = no scrollbar. */
    function syncOpsListLayout(rowCount, inDetail) {
        var panel = document.getElementById('ev-panel-ops-cases');
        var listWrap = document.getElementById('ops-cases-list-wrap');
        var tableWrap = document.getElementById('ops-cases-table-wrap');
        var evPanel = document.getElementById('evidence-panel');
        var n = parseInt(rowCount, 10) || 0;
        var isEmpty = n < 1;
        var few = n > 0 && n <= OPS_FEW_ROWS_MAX;
        [panel, listWrap, tableWrap].forEach(function (el) {
            if (!el) return;
            el.classList.toggle('oc-list-empty', isEmpty);
            el.classList.toggle('oc-few-rows', few && !inDetail);
        });
        if (panel) panel.classList.toggle('oc-detail-active', !!inDetail);
        if (evPanel) {
            var onOps = !!(panel && !panel.hidden);
            evPanel.classList.toggle('ev-ops-cases-empty', !!(onOps && isEmpty && !inDetail));
            evPanel.classList.toggle('ev-ops-cases-few-rows', !!(onOps && few && !inDetail));
            evPanel.classList.toggle('ev-ops-cases-detail', !!(onOps && inDetail));
            if (inDetail) evPanel.classList.remove('ev-ops-cases-few-rows');
        }
    }

    function renderList() {
        var tbody = document.getElementById('ops-cases-tbody');
        var empty = document.getElementById('ops-cases-empty');
        var meta = document.getElementById('ops-cases-meta');
        var tableWrap = document.getElementById('ops-cases-table-wrap');
        if (!tbody) return;
        var rows = filterClient(state.rows);
        if (!rows.length) {
            tbody.innerHTML = '';
            if (empty) empty.hidden = false;
            if (tableWrap) tableWrap.hidden = true;
            if (meta) meta.textContent = '';
            syncOpsListLayout(0, !!state.current);
            syncBulkUi();
            return;
        }
        if (empty) empty.hidden = true;
        if (tableWrap) tableWrap.hidden = false;
        if (meta) {
            meta.textContent = tr('opsCases.metaShown', '{n} shown').replace('{n}', String(rows.length));
        }
        tbody.innerHTML = '';
        rows.forEach(function (row) {
            var id = row.caseId || '';
            var trEl = document.createElement('tr');
            trEl.className = 'ops-cases-row';
            trEl.tabIndex = 0;
            trEl.setAttribute('data-case-id', id);
            var checked = state.selected[id] ? ' checked' : '';
            trEl.innerHTML =
                '<td class="ops-cases-check-cell"><input type="checkbox" class="case-select-checkbox" data-case-id="' + esc(id) + '"' + checked + '></td>' +
                '<td><code>' + esc(row.caseId) + '</code></td>' +
                '<td>Rev ' + esc(row.rev) + '</td>' +
                '<td><span class="' + statusClass(row.status) + '">' + esc(statusLabel(row.status)) + '</span></td>' +
                '<td>' + esc(row.type || row.family || '—') + '</td>' +
                '<td>' + esc(row.kind || '—') + '</td>' +
                '<td>' + esc(row.cameraId || '—') + '</td>' +
                '<td>' + esc(formatWhen(row.closedAt)) + '</td>' +
                '<td>' + esc(row.closedBy || '—') + '</td>';
            trEl.addEventListener('click', function (e) {
                if (e.target && e.target.closest && e.target.closest('.ops-cases-check-cell')) return;
                openCase(row.caseId);
            });
            trEl.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    if (e.target && e.target.closest && e.target.closest('.ops-cases-check-cell')) return;
                    e.preventDefault();
                    openCase(row.caseId);
                }
            });
            var checkCell = trEl.querySelector('.ops-cases-check-cell');
            if (checkCell) {
                checkCell.addEventListener('click', function (e) { e.stopPropagation(); });
                checkCell.addEventListener('mousedown', function (e) { e.stopPropagation(); });
            }
            tbody.appendChild(trEl);
        });
        syncOpsListLayout(rows.length, !!state.current);
        syncBulkUi();
    }

    function showList() {
        var list = document.getElementById('ops-cases-list-wrap');
        var detail = document.getElementById('ops-cases-detail-wrap');
        if (list) list.hidden = false;
        if (detail) detail.hidden = true;
        state.current = null;
        syncOpsListLayout(filterClient(state.rows).length, false);
    }

    function showDetail() {
        var list = document.getElementById('ops-cases-list-wrap');
        var detail = document.getElementById('ops-cases-detail-wrap');
        if (list) list.hidden = true;
        if (detail) detail.hidden = false;
        syncOpsListLayout(filterClient(state.rows).length, true);
    }

    function isImageName(name) {
        return /\.(jpe?g|png|gif|webp|bmp)$/i.test(String(name || ''));
    }

    function playEvidenceFile(fileId, fileName) {
        var emptyEl = document.getElementById('ops-cases-desk-player-empty');
        var imgEl = document.getElementById('ops-cases-desk-player-img');
        var vidEl = document.getElementById('ops-cases-desk-player-video');
        var fid = String(fileId || '').trim();
        if (!fid) return;
        state.playingEvidenceId = fid;
        var url = '/api/evidence/preview/' + encodeURIComponent(fid);
        if (isImageName(fileName)) {
            if (vidEl) {
                vidEl.pause();
                vidEl.removeAttribute('src');
                vidEl.hidden = true;
            }
            if (imgEl) {
                imgEl.src = url;
                imgEl.hidden = false;
            }
            if (emptyEl) emptyEl.hidden = true;
        } else {
            if (imgEl) {
                imgEl.removeAttribute('src');
                imgEl.hidden = true;
            }
            if (vidEl) {
                vidEl.src = url;
                vidEl.hidden = false;
            }
            if (emptyEl) emptyEl.hidden = true;
        }
    }

    function clearDeskPlayer() {
        var emptyEl = document.getElementById('ops-cases-desk-player-empty');
        var imgEl = document.getElementById('ops-cases-desk-player-img');
        var vidEl = document.getElementById('ops-cases-desk-player-video');
        state.playingEvidenceId = null;
        if (imgEl) {
            imgEl.removeAttribute('src');
            imgEl.hidden = true;
        }
        if (vidEl) {
            try { vidEl.pause(); } catch (_) {}
            vidEl.removeAttribute('src');
            vidEl.hidden = true;
        }
        if (emptyEl) emptyEl.hidden = false;
    }

    function renderDeskMedia(c) {
        var refs = (c && c.refs) || {};
        var linksEl = document.getElementById('ops-cases-desk-links');
        var listEl = document.getElementById('ops-cases-evidence-list');
        var mapEmpty = document.getElementById('ops-cases-desk-map-empty');
        var mapFrame = document.getElementById('ops-cases-desk-map-frame');
        var mapCoords = document.getElementById('ops-cases-desk-map-coords');
        var camEl = document.getElementById('ops-cases-desk-cam');
        var typeEl = document.getElementById('ops-cases-desk-type');
        var statusEl = document.getElementById('ops-cases-desk-status');
        var titleEl = document.getElementById('ops-cases-desk-title');

        if (camEl) camEl.textContent = (c && c.cameraId) || '—';
        if (typeEl) typeEl.textContent = (c && (c.kind || c.type)) || '—';
        if (statusEl) statusEl.textContent = statusLabel(c && c.status);
        if (titleEl) titleEl.textContent = (c && c.title) || '—';

        var evLinks = (c && Array.isArray(c.evidenceLinks)) ? c.evidenceLinks : [];
        if (listEl) {
            listEl.innerHTML = '';
            evLinks.forEach(function (l) {
                if (!l || !l.evidenceFileId) return;
                var li = document.createElement('li');
                var label = document.createElement('span');
                label.className = 'mono';
                label.textContent = (l.fileName || l.evidenceFileId) +
                    (l.source ? (' · ' + l.source) : '');
                var actions = document.createElement('div');
                actions.className = 'ops-case-ev-actions';
                var playBtn = document.createElement('button');
                playBtn.type = 'button';
                playBtn.className = 'btn btn-ghost btn-sm';
                playBtn.textContent = tr('opsCases.playEvidence', 'Play');
                playBtn.addEventListener('click', function () {
                    playEvidenceFile(l.evidenceFileId, l.fileName);
                });
                var unBtn = document.createElement('button');
                unBtn.type = 'button';
                unBtn.className = 'btn btn-ghost btn-sm';
                unBtn.textContent = tr('opsCases.unlinkEvidence', 'Unlink');
                unBtn.addEventListener('click', function () {
                    unlinkEvidence(c.caseId, l.evidenceFileId);
                });
                actions.appendChild(playBtn);
                actions.appendChild(unBtn);
                li.appendChild(label);
                li.appendChild(actions);
                listEl.appendChild(li);
            });
        }

        if (evLinks.length) {
            var prefer = state.playingEvidenceId
                && evLinks.some(function (l) { return l && l.evidenceFileId === state.playingEvidenceId; })
                ? state.playingEvidenceId
                : evLinks[0].evidenceFileId;
            var meta = evLinks.find(function (l) { return l && l.evidenceFileId === prefer; }) || evLinks[0];
            playEvidenceFile(prefer, meta && meta.fileName);
        } else {
            var crop = refs.cropUrl || refs.snapshotUrl || refs.photoUrl || null;
            var imgEl = document.getElementById('ops-cases-desk-player-img');
            var emptyEl = document.getElementById('ops-cases-desk-player-empty');
            var vidEl = document.getElementById('ops-cases-desk-player-video');
            if (vidEl) {
                try { vidEl.pause(); } catch (_) {}
                vidEl.removeAttribute('src');
                vidEl.hidden = true;
            }
            if (crop && imgEl) {
                imgEl.src = String(crop);
                imgEl.hidden = false;
                if (emptyEl) emptyEl.hidden = true;
            } else {
                clearDeskPlayer();
            }
        }

        if (linksEl) {
            linksEl.innerHTML = '';
            function addLink(label, id) {
                if (!id) return;
                var span = document.createElement('span');
                span.className = 'hint mono';
                span.textContent = label + ': ' + id;
                linksEl.appendChild(span);
            }
            addLink(tr('opsCases.deskLinkServerRec', 'Server record'), refs.serverRecordingEvidenceId);
            addLink(tr('opsCases.deskLinkDeviceRec', 'Device record'), refs.deviceRecordingEvidenceId);
            if (refs.sosIncidentId) {
                addLink(tr('opsCases.deskLinkSos', 'SOS id'), refs.sosIncidentId);
            }
        }

        var lat = refs.lat != null ? Number(refs.lat) : (refs.latitude != null ? Number(refs.latitude) : NaN);
        var lon = refs.lon != null ? Number(refs.lon) : (refs.lng != null ? Number(refs.lng) : (refs.longitude != null ? Number(refs.longitude) : NaN));
        var hasGps = Number.isFinite(lat) && Number.isFinite(lon) && !(lat === 0 && lon === 0);
        var mapLink = document.getElementById('ops-cases-desk-map-link');
        var mapActions = document.getElementById('ops-cases-desk-map-actions');
        var mapLeaflet = document.getElementById('ops-cases-desk-map-leaflet');
        if (hasGps) {
            if (mapEmpty) mapEmpty.hidden = true;
            if (mapCoords) {
                mapCoords.hidden = false;
                mapCoords.textContent = lat.toFixed(5) + ', ' + lon.toFixed(5);
            }
            if (mapActions) mapActions.hidden = false;
            if (mapLink) {
                mapLink.href = 'https://www.google.com/maps?q=' + encodeURIComponent(lat + ',' + lon);
            }
            showDeskMap(lat, lon);
        } else {
            destroyDeskMap();
            if (mapFrame) {
                mapFrame.removeAttribute('src');
                mapFrame.hidden = true;
            }
            if (mapLeaflet) mapLeaflet.hidden = true;
            if (mapEmpty) mapEmpty.hidden = false;
            if (mapCoords) {
                mapCoords.hidden = true;
                mapCoords.textContent = '';
            }
            if (mapActions) mapActions.hidden = true;
            if (mapLink) mapLink.removeAttribute('href');
        }
    }

    function destroyDeskMap() {
        if (state.deskMap) {
            try { state.deskMap.remove(); } catch (_) { /* ignore */ }
        }
        state.deskMap = null;
        state.deskMarker = null;
        state.deskMapLat = null;
        state.deskMapLon = null;
    }

    /** OPS-CASE-MAP-ZOOM-CONTROLS-V1 — Leaflet mini-map with +/- and Reset (not OSM iframe trap). */
    function showDeskMap(lat, lon) {
        var mapLeaflet = document.getElementById('ops-cases-desk-map-leaflet');
        var mapFrame = document.getElementById('ops-cases-desk-map-frame');
        var Lref = global.L;
        state.deskMapLat = lat;
        state.deskMapLon = lon;
        state.deskMapZoom = DESK_MAP_DEFAULT_ZOOM;

        if (!Lref || !mapLeaflet) {
            /* fallback iframe if Leaflet missing */
            if (mapFrame) {
                var d = 0.02;
                var bbox = (lon - d) + '%2C' + (lat - d) + '%2C' + (lon + d) + '%2C' + (lat + d);
                mapFrame.src = 'https://www.openstreetmap.org/export/embed.html?bbox=' + bbox
                    + '&layer=mapnik&marker=' + encodeURIComponent(lat + ',' + lon);
                mapFrame.hidden = false;
            }
            if (mapLeaflet) mapLeaflet.hidden = true;
            return;
        }

        if (mapFrame) {
            mapFrame.removeAttribute('src');
            mapFrame.hidden = true;
        }
        mapLeaflet.hidden = false;

        if (state.deskMap) {
            state.deskMap.setView([lat, lon], DESK_MAP_DEFAULT_ZOOM);
            if (state.deskMarker) state.deskMarker.setLatLng([lat, lon]);
            else state.deskMarker = Lref.marker([lat, lon]).addTo(state.deskMap);
            setTimeout(function () {
                try { state.deskMap.invalidateSize(); } catch (_) { /* ignore */ }
            }, 80);
            return;
        }

        /* scrollWheelZoom off — map must not trap desk panel scroll */
        state.deskMap = Lref.map(mapLeaflet, {
            zoomControl: true,
            scrollWheelZoom: false,
            attributionControl: true,
        }).setView([lat, lon], DESK_MAP_DEFAULT_ZOOM);
        Lref.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap',
        }).addTo(state.deskMap);
        state.deskMarker = Lref.marker([lat, lon]).addTo(state.deskMap);
        setTimeout(function () {
            try { state.deskMap.invalidateSize(); } catch (_) { /* ignore */ }
        }, 80);
    }

    function resetDeskMapView() {
        if (!state.deskMap || state.deskMapLat == null || state.deskMapLon == null) return;
        state.deskMap.setView([state.deskMapLat, state.deskMapLon], DESK_MAP_DEFAULT_ZOOM);
        try { state.deskMap.invalidateSize(); } catch (_) { /* ignore */ }
    }

    async function bindEvidence() {
        if (!state.current || !state.current.caseId) return;
        var sel = document.getElementById('ops-cases-bind-evidence-select');
        var input = document.getElementById('ops-cases-bind-evidence-id');
        var fid = sel ? String(sel.value || '').trim() : '';
        if (!fid && input) fid = String(input.value || '').trim();
        if (!fid) {
            window.alert(tr('opsCases.bindPickNeed', 'Select a Library file (or use Advanced id).'));
            return;
        }
        try {
            var res = await fetch('/api/ops-cases/' + encodeURIComponent(state.current.caseId) + '/evidence', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ evidenceFileId: fid }),
            });
            var data = await res.json();
            if (!res.ok || !data.ok) throw new Error((data && data.error) || 'link failed');
            if (sel) sel.value = '';
            if (input) input.value = '';
            renderDetail(data.case);
            loadList(true);
        } catch (err) {
            window.alert((err && err.message) || 'link failed');
        }
    }

    function syncBindAdvancedVisibility() {
        var adv = document.getElementById('ops-cases-bind-advanced');
        if (!adv) return;
        adv.hidden = !isSuperAdmin();
    }

    function fileLabel(f, camPrefer) {
        if (!f) return '';
        var name = f.fileName || f.id || '—';
        var cam = f.deviceId || '';
        var when = f.uploadedAt ? String(f.uploadedAt).slice(0, 16).replace('T', ' ') : '';
        var mark = (camPrefer && cam && String(cam) === String(camPrefer))
            ? (' ' + tr('opsCases.bindCamMatch', '(this camera)'))
            : '';
        return name + (cam ? (' · ' + cam) : '') + (when ? (' · ' + when) : '') + mark;
    }

    function fillLibrarySelect(files, camPrefer, q) {
        var sel = document.getElementById('ops-cases-bind-evidence-select');
        if (!sel) return;
        var needle = String(q || '').trim().toLowerCase();
        var linked = {};
        ((state.current && state.current.evidenceLinks) || []).forEach(function (l) {
            if (l && l.evidenceFileId) linked[String(l.evidenceFileId)] = true;
        });
        var rows = (files || []).slice();
        rows.sort(function (a, b) {
            var am = camPrefer && a && String(a.deviceId || '') === String(camPrefer) ? 0 : 1;
            var bm = camPrefer && b && String(b.deviceId || '') === String(camPrefer) ? 0 : 1;
            if (am !== bm) return am - bm;
            return 0;
        });
        if (needle) {
            rows = rows.filter(function (f) {
                var blob = ((f.fileName || '') + ' ' + (f.deviceId || '') + ' ' + (f.operatorName || '') + ' ' + (f.id || '')).toLowerCase();
                return blob.indexOf(needle) >= 0;
            });
        }
        var keep = sel.value;
        sel.innerHTML = '';
        var empty = document.createElement('option');
        empty.value = '';
        empty.textContent = tr('opsCases.bindPickEmpty', 'Select a Library file…');
        sel.appendChild(empty);
        rows.forEach(function (f) {
            if (!f || !f.id || linked[String(f.id)]) return;
            var opt = document.createElement('option');
            opt.value = f.id;
            opt.textContent = fileLabel(f, camPrefer);
            sel.appendChild(opt);
        });
        if (keep && Array.prototype.some.call(sel.options, function (o) { return o.value === keep; })) {
            sel.value = keep;
        }
    }

    async function loadLibraryPicker(force) {
        syncBindAdvancedVisibility();
        var camPrefer = (state.current && state.current.cameraId) ? String(state.current.cameraId) : '';
        state.libraryCamPrefer = camPrefer;
        var searchEl = document.getElementById('ops-cases-bind-search');
        var q = searchEl ? String(searchEl.value || '') : '';
        if (!force && state.libraryFiles.length) {
            fillLibrarySelect(state.libraryFiles, camPrefer, q);
            return;
        }
        try {
            var res = await fetch('/api/evidence/catalog?page=1&pageSize=80&status=active', {
                credentials: 'same-origin',
            });
            var data = await res.json();
            if (!res.ok || !data.ok) throw new Error('catalog');
            state.libraryFiles = data.files || [];
            fillLibrarySelect(state.libraryFiles, camPrefer, q);
        } catch (_) {
            state.libraryFiles = [];
            fillLibrarySelect([], camPrefer, q);
            var sel = document.getElementById('ops-cases-bind-evidence-select');
            if (sel && !sel.options.length) {
                sel.innerHTML = '<option value="">' + esc(tr('opsCases.bindLoadFailed', 'Could not load Library list')) + '</option>';
            }
        }
    }

    async function unlinkEvidence(caseId, evidenceFileId) {
        try {
            var res = await fetch(
                '/api/ops-cases/' + encodeURIComponent(caseId) + '/evidence/' + encodeURIComponent(evidenceFileId),
                { method: 'DELETE', credentials: 'same-origin' }
            );
            var data = await res.json();
            if (!res.ok || !data.ok) throw new Error((data && data.error) || 'unlink failed');
            if (state.playingEvidenceId === evidenceFileId) state.playingEvidenceId = null;
            renderDetail(data.case);
            loadList(true);
        } catch (err) {
            window.alert((err && err.message) || 'unlink failed');
        }
    }

    function renderDetail(c, opts) {
        state.current = c;
        showDetail();
        var head = document.getElementById('ops-cases-detail-head');
        var sub = document.getElementById('ops-cases-detail-sub');
        var touch = document.getElementById('ops-cases-detail-touch');
        var notesEl = document.getElementById('ops-cases-detail-notes');
        var auditEl = document.getElementById('ops-cases-detail-audit');
        var gate = document.getElementById('ops-cases-detail-gate');
        if (head) {
            head.textContent = (c.caseId || '—') + ' · Rev ' + (c.rev || 1) + ' · ' + statusLabel(c.status);
        }
        if (sub) {
            sub.textContent =
                (c.cameraId || '—') + ' · ' + (c.kind || c.type || '—') +
                ' · ' + tr('opsCases.closed', 'closed') + ' ' + formatWhen(c.closedAt) +
                ' ' + tr('opsCases.by', 'by') + ' ' + (c.closedBy || '—');
        }
        if (touch) {
            var lt = c.lastTouch || {};
            touch.textContent = tr('opsCases.lastTouch', 'Last activity') + ': ' +
                (lt.by || '—') + ' · ' + (lt.action || '—') + ' · ' + formatWhen(lt.at);
        }
        if (gate) {
            gate.textContent = isSuperAdmin()
                ? tr('opsCases.gateAdmin', 'Super admin: you may edit or delete past notes.')
                : tr('opsCases.gateOps', 'Operators may add notes only. Edit/delete needs Super admin.');
        }
        var linkedEl = document.getElementById('ops-cases-linked-case-file');
        if (linkedEl) {
            var refs = (c && c.refs) || {};
            var cfId = refs.linkedCaseFileId ? String(refs.linkedCaseFileId) : '';
            linkedEl.onclick = null;
            if (cfId) {
                linkedEl.hidden = false;
                linkedEl.textContent = tr('opsCases.linkedCaseFile', 'Linked Case File') + ': '
                    + (refs.linkedCaseFileTitle || cfId) + ' (' + cfId + ') — '
                    + tr('opsCases.openLinkedCaseFile', 'Open');
                linkedEl.style.cursor = 'pointer';
                linkedEl.onclick = function () {
                    if (global.EvidenceHub && EvidenceHub.showPanel) {
                        EvidenceHub.showPanel('case-files', { force: true });
                    }
                    setTimeout(function () {
                        if (global.CaseFilesUi && CaseFilesUi.openDetail) {
                            CaseFilesUi.openDetail(cfId);
                        }
                    }, 80);
                };
            } else {
                linkedEl.hidden = true;
                linkedEl.textContent = '';
                linkedEl.style.cursor = '';
            }
        }
        syncArchiveButtons(c);
        /* notesOnly: after Save note — do not remount map/player (was freezing scroll). */
        if (!(opts && opts.notesOnly)) {
            renderDeskMedia(c);
            loadLibraryPicker(false);
        } else {
            fillLibrarySelect(state.libraryFiles, (c && c.cameraId) || '', 
                (document.getElementById('ops-cases-bind-search') || {}).value || '');
            syncBindAdvancedVisibility();
        }
        if (notesEl) {
            var notes = c.notes || [];
            if (!notes.length) {
                notesEl.innerHTML = '<p class="hint">' + esc(tr('opsCases.notesEmpty', 'No add-on notes yet')) + '</p>';
            } else {
                notesEl.innerHTML = '';
                notes.forEach(function (n) {
                    var wrap = document.createElement('div');
                    wrap.className = 'ops-case-note enterprise-card';
                    var meta = document.createElement('div');
                    meta.className = 'ops-case-note-meta';
                    meta.textContent = (n.by || '—') + ' · ' + formatWhen(n.at) +
                        (n.editedAt ? (' · ' + tr('opsCases.edited', 'edited') + ' ' + formatWhen(n.editedAt)) : '');
                    var body = document.createElement('div');
                    body.className = 'ops-case-note-body';
                    body.textContent = n.text || '';
                    wrap.appendChild(meta);
                    wrap.appendChild(body);
                    if (isSuperAdmin()) {
                        var actions = document.createElement('div');
                        actions.className = 'ops-case-note-actions';
                        var editBtn = document.createElement('button');
                        editBtn.type = 'button';
                        editBtn.className = 'btn btn-ghost btn-sm';
                        editBtn.textContent = tr('common.edit', 'Edit');
                        editBtn.addEventListener('click', function () {
                            var next = window.prompt(tr('opsCases.editPrompt', 'Edit note'), n.text || '');
                            if (next == null) return;
                            patchNote(c.caseId, n.id, next);
                        });
                        var delBtn = document.createElement('button');
                        delBtn.type = 'button';
                        delBtn.className = 'btn btn-ghost btn-sm';
                        delBtn.textContent = tr('common.delete', 'Delete');
                        delBtn.addEventListener('click', function () {
                            if (!window.confirm(tr('opsCases.deleteConfirm', 'Delete this note?'))) return;
                            removeNote(c.caseId, n.id);
                        });
                        actions.appendChild(editBtn);
                        actions.appendChild(delBtn);
                        wrap.appendChild(actions);
                    }
                    notesEl.appendChild(wrap);
                });
            }
        }
        if (auditEl) {
            var audit = (c.audit || []).slice().reverse();
            if (!audit.length) {
                auditEl.innerHTML = '<p class="hint">' + esc(tr('opsCases.auditEmpty', 'No touch log yet')) + '</p>';
            } else {
                auditEl.innerHTML = '<ul class="ops-case-audit-list">' + audit.map(function (a) {
                    return '<li><span class="ops-case-audit-when">' + esc(formatWhen(a.at)) +
                        '</span> · ' + esc(a.by) + ' · ' + esc(a.action) +
                        ' · Rev ' + esc(a.rev) + '</li>';
                }).join('') + '</ul>';
            }
        }
        var addInput = document.getElementById('ops-cases-note-input');
        if (addInput) addInput.value = '';
    }

    /* OPS-CASE-UI-META-QUIET-V1 — no ambient load/fail chrome; empty state only. */
    async function fetchOpsJson(url) {
        var res = await fetch(url, { credentials: 'same-origin' });
        var ct = String(res.headers.get('content-type') || '');
        var text = await res.text();
        if (ct.indexOf('application/json') < 0 || (text && text.charAt(0) === '<')) {
            throw new Error('bad_response');
        }
        var data;
        try {
            data = JSON.parse(text);
        } catch (_) {
            throw new Error('bad_response');
        }
        return { res: res, data: data };
    }

    async function loadList(force) {
        if (state.loading && !force) return;
        state.loading = true;
        var meta = document.getElementById('ops-cases-meta');
        if (meta) meta.textContent = '';
        try {
            var out = await fetchOpsJson('/api/ops-cases?' + buildQuery());
            if (!out.res.ok || !out.data || !out.data.ok) {
                throw new Error('load failed');
            }
            state.rows = out.data.cases || [];
            renderList();
        } catch (_) {
            state.rows = [];
            renderList();
            if (meta) meta.textContent = '';
        } finally {
            state.loading = false;
        }
    }

    async function openCase(caseId) {
        var id = String(caseId || '').trim();
        if (!id) return;
        try {
            var out = await fetchOpsJson('/api/ops-cases/' + encodeURIComponent(id));
            if (!out.res.ok || !out.data || !out.data.ok || !out.data.case) {
                throw new Error('not found');
            }
            renderDetail(out.data.case);
        } catch (_) {
            showList();
            loadList(true);
        }
    }

    async function addNote() {
        if (!state.current || !state.current.caseId) return;
        var input = document.getElementById('ops-cases-note-input');
        var text = input ? String(input.value || '').trim() : '';
        if (!text) return;
        try {
            var res = await fetch('/api/ops-cases/' + encodeURIComponent(state.current.caseId) + '/notes', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text }),
            });
            var data = await res.json();
            if (!res.ok || !data.ok) throw new Error((data && data.error) || 'save failed');
            renderDetail(data.case, { notesOnly: true });
            loadList(true);
        } catch (err) {
            window.alert((err && err.message) || 'save failed');
        }
    }

    async function patchNote(caseId, noteId, text) {
        try {
            var res = await fetch(
                '/api/ops-cases/' + encodeURIComponent(caseId) + '/notes/' + encodeURIComponent(noteId),
                {
                    method: 'PATCH',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: text }),
                }
            );
            var data = await res.json();
            if (!res.ok || !data.ok) throw new Error((data && data.error) || 'edit failed');
            renderDetail(data.case, { notesOnly: true });
            loadList(true);
        } catch (err) {
            window.alert((err && err.message) || 'edit failed');
        }
    }

    async function removeNote(caseId, noteId) {
        try {
            var res = await fetch(
                '/api/ops-cases/' + encodeURIComponent(caseId) + '/notes/' + encodeURIComponent(noteId),
                { method: 'DELETE', credentials: 'same-origin' }
            );
            var data = await res.json();
            if (!res.ok || !data.ok) throw new Error((data && data.error) || 'delete failed');
            renderDetail(data.case, { notesOnly: true });
            loadList(true);
        } catch (err) {
            window.alert((err && err.message) || 'delete failed');
        }
    }

    function readFiltersFromDom() {
        var fam = document.getElementById('ops-cases-family');
        var typ = document.getElementById('ops-cases-type');
        var aud = document.getElementById('ops-cases-audit');
        var arch = document.getElementById('ops-cases-archive');
        var days = document.getElementById('ops-cases-days');
        var q = document.getElementById('ops-cases-search');
        state.family = fam ? String(fam.value || '') : '';
        state.type = typ ? String(typ.value || '') : '';
        state.audit = aud ? String(aud.value || '') : '';
        state.archive = arch ? String(arch.value || 'active') : 'active';
        if (state.archive !== 'archived' && state.archive !== 'all') state.archive = 'active';
        state.days = days ? (parseInt(days.value, 10) || 14) : 14;
        state.q = q ? String(q.value || '') : '';
        setAnalyticsTypeVisible();
    }

    function syncArchiveButtons(c) {
        var archBtn = document.getElementById('ops-cases-archive-btn');
        var unBtn = document.getElementById('ops-cases-unarchive-btn');
        var isArch = !!(c && (c.archived === true || c.archivedAt || c.status === 'archived'));
        var admin = isSuperAdmin();
        /* Mutual exclusive — never show both */
        if (archBtn) {
            var showArch = admin && !!c && !isArch;
            archBtn.hidden = !showArch;
            archBtn.setAttribute('aria-hidden', showArch ? 'false' : 'true');
        }
        if (unBtn) {
            var showUn = admin && !!c && isArch;
            unBtn.hidden = !showUn;
            unBtn.setAttribute('aria-hidden', showUn ? 'false' : 'true');
        }
    }

    async function archiveCurrent() {
        if (!state.current || !state.current.caseId) return;
        if (!isSuperAdmin()) {
            window.alert(tr('opsCases.archiveNeedAdmin', 'Super admin required to archive cases.'));
            return;
        }
        var ok = window.confirm(tr(
            'opsCases.archiveConfirm',
            'Archive this case? It leaves the Active list but stays on disk (notes, links, audit). Library media is not deleted.'
        ));
        if (!ok) return;
        try {
            var res = await fetch('/api/ops-cases/' + encodeURIComponent(state.current.caseId) + '/archive', {
                method: 'POST',
                credentials: 'same-origin',
            });
            var data = await res.json();
            if (!res.ok || !data.ok) throw new Error((data && data.error) || 'archive failed');
            renderDetail(data.case);
            loadList(true);
        } catch (err) {
            window.alert((err && err.message) || 'archive failed');
        }
    }

    function selectedCaseIds() {
        return Object.keys(state.selected).filter(function (k) { return state.selected[k]; });
    }

    function syncBulkUi() {
        var n = selectedCaseIds().length;
        var wrap = document.getElementById('ops-cases-bulk-actions');
        var btn = document.getElementById('ops-cases-bulk-purge');
        if (wrap) wrap.hidden = !isSuperAdmin();
        if (btn) btn.disabled = n < 1;
        syncCheckAll();
    }

    function syncCheckAll() {
        var all = document.getElementById('ops-cases-check-all');
        if (!all) return;
        var boxes = document.querySelectorAll('#ops-cases-tbody .case-select-checkbox');
        var n = 0;
        for (var i = 0; i < boxes.length; i += 1) {
            if (boxes[i].checked) n += 1;
        }
        all.checked = boxes.length > 0 && n === boxes.length;
        all.indeterminate = n > 0 && n < boxes.length;
    }

    function syncBulkPurgeVisibility() {
        syncBulkUi();
    }

    async function bulkPurgeCases() {
        if (!isSuperAdmin()) {
            window.alert(tr('opsCases.archiveNeedAdmin', 'Super admin required to archive cases.'));
            return;
        }
        var ids = selectedCaseIds();
        if (!ids.length) {
            window.alert(tr('opsCases.bulkArchiveNone', 'No cases selected to archive.'));
            return;
        }
        var confirmMsg = tr(
            'opsCases.bulkArchiveConfirm',
            'Are you sure you want to archive the selected cases? They will be hidden from the Active list but can be restored later.'
        );
        if (!window.confirm(confirmMsg)) return;
        var btn = document.getElementById('ops-cases-bulk-purge');
        if (btn) btn.disabled = true;
        var ok = 0;
        var fail = 0;
        for (var i = 0; i < ids.length; i += 1) {
            try {
                var res = await fetch('/api/ops-cases/' + encodeURIComponent(ids[i]) + '/archive', {
                    method: 'POST',
                    credentials: 'same-origin',
                });
                var data = await res.json();
                if (!res.ok || !data.ok) fail += 1;
                else {
                    ok += 1;
                    delete state.selected[ids[i]];
                }
            } catch (_) {
                fail += 1;
            }
        }
        if (btn) btn.disabled = false;
        var meta = document.getElementById('ops-cases-meta');
        if (meta) {
            meta.textContent = tr('opsCases.bulkArchiveDone', 'Archived {ok}, failed {fail}')
                .replace('{ok}', String(ok))
                .replace('{fail}', String(fail));
        }
        await loadList(true);
        syncBulkUi();
    }

    async function unarchiveCurrent() {
        if (!state.current || !state.current.caseId) return;
        if (!isSuperAdmin()) {
            window.alert(tr('opsCases.archiveNeedAdmin', 'Super admin required to archive cases.'));
            return;
        }
        try {
            var res = await fetch('/api/ops-cases/' + encodeURIComponent(state.current.caseId) + '/unarchive', {
                method: 'POST',
                credentials: 'same-origin',
            });
            var data = await res.json();
            if (!res.ok || !data.ok) throw new Error((data && data.error) || 'restore failed');
            renderDetail(data.case);
            loadList(true);
        } catch (err) {
            window.alert((err && err.message) || 'restore failed');
        }
    }

    async function continueAsCaseFile() {
        if (!state.current || !state.current.caseId) return;
        var btn = document.getElementById('ops-cases-continue-case-file');
        if (btn) btn.disabled = true;
        try {
            var res = await fetch(
                '/api/ops-cases/' + encodeURIComponent(state.current.caseId) + '/continue-case-file',
                { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: '{}' }
            );
            var data = await res.json();
            if (!res.ok || !data.ok) throw new Error((data && data.error) || 'continue failed');
            if (data.case) renderDetail(data.case, { notesOnly: true });
            var cfId = data.caseFileId
                || (data.detail && data.detail.caseFile && data.detail.caseFile.id)
                || null;
            if (!cfId) throw new Error('no case file id');
            if (global.EvidenceHub && EvidenceHub.showPanel) {
                EvidenceHub.showPanel('case-files', { force: true });
            }
            setTimeout(function () {
                if (global.CaseFilesUi && CaseFilesUi.openDetail) {
                    CaseFilesUi.openDetail(cfId);
                }
            }, 80);
        } catch (err) {
            window.alert((err && err.message) || 'continue failed');
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    function bindUi() {
        var fam = document.getElementById('ops-cases-family');
        var typ = document.getElementById('ops-cases-type');
        var aud = document.getElementById('ops-cases-audit');
        var arch = document.getElementById('ops-cases-archive');
        var days = document.getElementById('ops-cases-days');
        var q = document.getElementById('ops-cases-search');
        var refresh = document.getElementById('ops-cases-refresh');
        var back = document.getElementById('ops-cases-back');
        var addBtn = document.getElementById('ops-cases-note-add');
        function reload() {
            readFiltersFromDom();
            showList();
            loadList(true);
        }
        if (fam) fam.addEventListener('change', reload);
        if (typ) typ.addEventListener('change', reload);
        if (aud) aud.addEventListener('change', reload);
        if (arch) arch.addEventListener('change', reload);
        if (days) days.addEventListener('change', reload);
        if (q) {
            var t = null;
            q.addEventListener('input', function () {
                clearTimeout(t);
                t = setTimeout(function () {
                    readFiltersFromDom();
                    renderList();
                }, 200);
            });
        }
        if (refresh) refresh.addEventListener('click', reload);
        if (back) back.addEventListener('click', function () {
            clearDeskPlayer();
            destroyDeskMap();
            showList();
            loadList(true);
        });
        if (addBtn) addBtn.addEventListener('click', addNote);
        var continueBtn = document.getElementById('ops-cases-continue-case-file');
        if (continueBtn) continueBtn.addEventListener('click', continueAsCaseFile);
        var bindBtn = document.getElementById('ops-cases-bind-btn');
        if (bindBtn) bindBtn.addEventListener('click', bindEvidence);
        var bindRefresh = document.getElementById('ops-cases-bind-refresh');
        if (bindRefresh) bindRefresh.addEventListener('click', function () { loadLibraryPicker(true); });
        var bindSearch = document.getElementById('ops-cases-bind-search');
        if (bindSearch) {
            bindSearch.addEventListener('input', function () {
                clearTimeout(state.librarySearchTimer);
                state.librarySearchTimer = setTimeout(function () {
                    fillLibrarySelect(
                        state.libraryFiles,
                        state.libraryCamPrefer || ((state.current && state.current.cameraId) || ''),
                        bindSearch.value
                    );
                }, 180);
            });
        }
        var bindInput = document.getElementById('ops-cases-bind-evidence-id');
        if (bindInput) {
            bindInput.addEventListener('keydown', function (ev) {
                if (ev.key === 'Enter') {
                    ev.preventDefault();
                    bindEvidence();
                }
            });
        }
        syncBindAdvancedVisibility();
        var archBtn = document.getElementById('ops-cases-archive-btn');
        var unBtn = document.getElementById('ops-cases-unarchive-btn');
        if (archBtn) archBtn.addEventListener('click', archiveCurrent);
        if (unBtn) unBtn.addEventListener('click', unarchiveCurrent);
        var bulkPurge = document.getElementById('ops-cases-bulk-purge');
        if (bulkPurge && !bulkPurge._opsBulkBound) {
            bulkPurge._opsBulkBound = true;
            bulkPurge.addEventListener('click', function () { bulkPurgeCases(); });
        }
        var tbody = document.getElementById('ops-cases-tbody');
        if (tbody && !tbody._opsCheckBound) {
            tbody._opsCheckBound = true;
            tbody.addEventListener('change', function (e) {
                var t = e.target;
                if (!t || !t.classList || !t.classList.contains('case-select-checkbox')) return;
                var id = t.getAttribute('data-case-id') || '';
                if (id) state.selected[id] = !!t.checked;
                syncBulkUi();
            });
            tbody.addEventListener('click', function (e) {
                if (e.target && e.target.closest && e.target.closest('.ops-cases-check-cell')) {
                    e.stopPropagation();
                }
            }, true);
        }
        var checkAll = document.getElementById('ops-cases-check-all');
        if (checkAll && !checkAll._opsCheckAllBound) {
            checkAll._opsCheckAllBound = true;
            checkAll.addEventListener('change', function () {
                var on = !!checkAll.checked;
                var boxes = document.querySelectorAll('#ops-cases-tbody .case-select-checkbox');
                for (var i = 0; i < boxes.length; i += 1) {
                    boxes[i].checked = on;
                    var id = boxes[i].getAttribute('data-case-id') || '';
                    if (id) state.selected[id] = on;
                }
                syncBulkUi();
            });
            checkAll.addEventListener('click', function (e) { e.stopPropagation(); });
        }
        syncBulkUi();
        var mapReset = document.getElementById('ops-cases-desk-map-reset');
        if (mapReset) mapReset.addEventListener('click', resetDeskMapView);
    }

    function applyWeaponFilters() {
        var fam = document.getElementById('ops-cases-family');
        var typ = document.getElementById('ops-cases-type');
        if (fam) fam.value = 'ANALYTICS';
        if (typ) typ.value = 'WEAPON';
        state.family = 'ANALYTICS';
        state.type = 'WEAPON';
        setAnalyticsTypeVisible();
    }

    function applySosFilters() {
        var fam = document.getElementById('ops-cases-family');
        var typ = document.getElementById('ops-cases-type');
        if (fam) fam.value = 'SOS';
        if (typ) typ.value = '';
        state.family = 'SOS';
        state.type = '';
        setAnalyticsTypeVisible();
    }

    var bound = false;
    function onShow(opts) {
        if (!bound) {
            bindUi();
            bound = true;
        }
        syncBulkUi();
        if (opts && opts.weaponOnly) {
            applyWeaponFilters();
        } else if (opts && (opts.family === 'SOS' || opts.sosOnly)) {
            applySosFilters();
        }
        if (!(opts && opts.warm) || (opts && opts.force) || (opts && opts.weaponOnly) || (opts && opts.sosOnly) || (opts && opts.family) || (opts && opts.caseId)) {
            readFiltersFromDom();
            if (opts && opts.caseId) {
                openCase(opts.caseId);
            } else {
                showList();
                loadList(true);
            }
        }
    }

    function openWeaponCases(opts) {
        var o = opts || {};
        if (global.EvidenceManager && typeof EvidenceManager.showTab === 'function') {
            EvidenceManager.showTab('evidence');
        } else {
            var btnEv = document.getElementById('nav-tab-evidence');
            if (btnEv) btnEv.click();
        }
        setTimeout(function () {
            if (global.EvidenceHub && typeof EvidenceHub.showPanel === 'function') {
                EvidenceHub.showPanel('ops-cases', { force: true, skipRefresh: true });
            }
            onShow({ force: true, weaponOnly: true, caseId: o.caseId || null });
        }, 120);
    }

    global.OpsCasesUi = {
        onShow: onShow,
        openCase: openCase,
        openWeaponCases: openWeaponCases,
        showDeskMap: showDeskMap,
        showPanelCases: function (opts) {
            if (opts && (opts.weaponOnly || opts.type === 'WEAPON')) {
                openWeaponCases(opts);
                return;
            }
            if (global.EvidenceHub && typeof EvidenceHub.showPanel === 'function') {
                EvidenceHub.showPanel('ops-cases', { force: true, skipRefresh: true });
            }
            onShow({
                force: true,
                family: opts && opts.family ? opts.family : '',
                sosOnly: !!(opts && (opts.sosOnly || opts.family === 'SOS')),
                caseId: opts && opts.caseId ? opts.caseId : null,
            });
        },
    };
})(typeof window !== 'undefined' ? window : global);
