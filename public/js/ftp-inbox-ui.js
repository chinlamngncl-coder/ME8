/**
 * Evidence & Docking — Unassigned Evidence (FTP staging).
 * Does not admit into Evidence Library / Cases tables.
 */
(function (global) {
    'use strict';

    var rows = [];
    var loaded = false;
    var bound = false;
    var selected = Object.create(null);
    var isSuperAdmin = false;
    var mapState = { map: null, marker: null, lat: null, lon: null };
    var edgeFilter = { face: false, lpr: false, sos: false };

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function fmtSize(n) {
        var b = Number(n) || 0;
        if (b < 1024) return b + ' B';
        if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
        return (b / (1024 * 1024)).toFixed(1) + ' MB';
    }

    function fmtTime(iso) {
        return (typeof fmtDateTime === 'function') ? fmtDateTime(iso) : String(iso || '—');
    }

    function groupColorForDevice(deviceId, mapGroup) {
        var lk = global.dispatchGroupLookup || {};
        if (deviceId && lk.byDevice && lk.byDevice[deviceId] && lk.byDevice[deviceId].color) {
            return lk.byDevice[deviceId].color;
        }
        var gk = String(mapGroup || '').toLowerCase();
        if (gk && lk.byName && lk.byName[gk] && lk.byName[gk].color) {
            return lk.byName[gk].color;
        }
        return '#64748b';
    }

    function filters() {
        var qEl = document.getElementById('ftp-inbox-search');
        var tEl = document.getElementById('ftp-inbox-type');
        var cEl = document.getElementById('ftp-inbox-class');
        return {
            q: (qEl && qEl.value ? String(qEl.value) : '').trim().toLowerCase(),
            type: (tEl && tEl.value) || 'all',
            sortClass: (cEl && cEl.value) || 'all',
        };
    }

    function sorterClass(r) {
        var raw = String((r && (r.sortType || r.sorterType || r.sorterClass || r.classLabel || r.mediaClass || r.category)) || '').toLowerCase();
        if (raw === 'face' || raw === 'fr' || raw === 'person' || raw === 'human' || raw === 'body'
            || raw === 'pedestrian' || raw.indexOf('full body') !== -1) return 'face';
        if (raw === 'car' || raw === 'vehicle' || raw === 'lpr' || raw === 'anpr' || raw === 'plate') return 'car';
        if (r && r.face === true) return 'face';
        if (r && (r.lpr === true || r.anpr === true || r.vehicle === true)) return 'car';
        var hay = [
            Array.isArray(r && r.tags) ? r.tags.join(' ') : (r && r.tags),
            r && r.name, r && r.fileName, r && r.rel, r && r.path,
        ].map(function (x) { return String(x || '').toLowerCase(); }).join(' ');
        if (hay.indexOf('face') !== -1 || hay.indexOf('human') !== -1 || hay.indexOf('person') !== -1
            || hay.indexOf('body') !== -1 || hay.indexOf('pedestrian') !== -1) return 'face';
        if (hay.indexOf('car') !== -1 || hay.indexOf('vehicle') !== -1 || hay.indexOf('lpr') !== -1 || hay.indexOf('anpr') !== -1 || hay.indexOf('plate') !== -1) return 'car';
        return 'other';
    }

    function cameraSnLabel(r) {
        var raw = String((r && (r.deviceId || r.serial || r.device_number || r.deviceNumber)) || '').trim();
        if (!raw || raw === '—') return '—';
        if (/^\d{8}$/.test(raw) || /^\d{4}-\d{2}-\d{2}$/.test(raw)) return 'Manual Upload';
        return raw;
    }

    function caseIdOf(r) {
        var cid = r && (r.case_id || r.caseId || r.associatedCaseId || r.caseID);
        return String(cid || '').trim();
    }

    function isNetAssigned(r) {
        return !!caseIdOf(r);
    }

    function kindFromName(name) {
        var ext = String(name || '').toLowerCase();
        if (/\.(jpe?g|png|gif|webp|bmp)$/i.test(ext)) return 'image';
        if (/\.(mp4|mov|avi|mkv|webm|ts)$/i.test(ext)) return 'video';
        return 'file';
    }

    function normalizeCatalogFile(f) {
        if (!f) return null;
        var name = f.fileName || f.name || '';
        var kind = f.kind || f.mediaType || kindFromName(name);
        var id = f.id || f.evidence_file_id || '';
        return {
            id: id,
            name: name,
            rel: id || f.relativePath || f.path || '',
            path: f.relativePath || f.path || '',
            size: f.byteSize || f.size || 0,
            deviceId: f.deviceId || f.serial || '',
            serial: f.serial || f.deviceId || '',
            officerName: f.operatorName || f.officerName || '',
            assignedOfficer: f.operatorName || f.assignedOfficer || '',
            uploadedAt: f.uploadedAt || '',
            source: f.source || '',
            dockId: f.dockId || f.dock_id || '',
            dockBay: f.dockBay != null ? f.dockBay : f.dock_bay,
            tags: f.tags || [],
            case_id: f.case_id || f.caseId || f.associatedCaseId || '',
            associatedCaseId: f.associatedCaseId || f.caseId || f.case_id || '',
            sosIncidentId: f.sosIncidentId || '',
            fromLibrary: f.fromLibrary === true || String(f.source || '') === 'library',
            kind: kind,
            mediaType: kind,
            sos: f.sos === true,
            sortType: f.sortType || f.sorterType || f.sorterClass || f.classLabel || '',
            face: f.face === true,
            lpr: f.lpr === true,
            anpr: f.anpr === true,
            isPriority: f.isPriority === true || f.is_priority === true || Number(f.is_priority) === 1
                || /[-_]IMP/i.test(String(f.fileName || f.name || '')),
            aiHitTargetId: f.aiHitTargetId || f.ai_hit_target_id || null,
            aiHitType: f.aiHitType || f.ai_hit_type || null,
        };
    }

    function netRows(list) {
        return (list || []).filter(function (r) { return !isNetAssigned(r); });
    }

    function matchesEdgeChip(r) {
        var any = edgeFilter.face || edgeFilter.lpr || edgeFilter.sos;
        if (!any) return true;
        var src = triageSource(r);
        if (edgeFilter.sos && src.sos) return true;
        var hay = [
            r.tags, r.source, r.ingest, r.via, r.alertType, r.name, r.rel, r.path, r.kind, r.edge,
        ].map(function (x) { return String(x || '').toLowerCase(); }).join(' ');
        if (edgeFilter.face && (hay.indexOf('face') !== -1 || hay.indexOf('fr-') !== -1 || hay.indexOf('fr_') !== -1 || r.face === true)) return true;
        if (edgeFilter.lpr && (hay.indexOf('lpr') !== -1 || hay.indexOf('anpr') !== -1 || hay.indexOf('plate') !== -1 || r.lpr === true)) return true;
        return false;
    }

    function filtered() {
        var f = filters();
        return netRows(rows).filter(function (r) {
            if (!matchesEdgeChip(r)) return false;
            var cls = sorterClass(r);
            if (f.sortClass === 'face' && cls !== 'face') return false;
            if (f.sortClass === 'car' && cls !== 'car') return false;
            if (f.sortClass === 'other' && cls !== 'other') return false;
            var kind = String(r.kind || r.mediaType || '');
            if (f.type === 'video' && kind !== 'video') return false;
            if (f.type === 'image' && kind !== 'image') return false;
            if (!f.q) return true;
            var hay = [
                r.name, r.rel, r.path, r.deviceId, r.serial,
                r.officerName, r.assignedOfficer, r.mapGroup,
            ].map(function (x) { return String(x || '').toLowerCase(); }).join(' ');
            return hay.indexOf(f.q) !== -1;
        });
    }

    function triageSource(r) {
        var src = String((r && r.source) || '').toLowerCase();
        var hay = [
            r.tags, r.alertType, r.sosIncidentId, r.name, r.rel, r.path,
        ].map(function (x) { return String(x || '').toLowerCase(); }).join(' ');
        var sos = hay.indexOf('sos') !== -1 || r.sos === true;
        var dockStation = !!(r.dockId || (r.dockBay != null && String(r.dockBay) !== ''));
        var edgeCam = src === 'https_upload' || src === 'fixed_cam' || src === 'edge' || r.edge === true;
        var bwc = src === 'live_server' || src === 'dock_ftp' || src === 'dock_ftp_watch';
        if (!bwc && !edgeCam && !dockStation) bwc = true;
        return { sos: sos, bwc: bwc, edgeCam: edgeCam, dockStation: dockStation };
    }

    function isTacticalLane(r) {
        var s = triageSource(r);
        return !!(s.sos || String((r && r.source) || '').toLowerCase() === 'live_server');
    }

    function rowIsPriority(r) {
        if (r && (r.isPriority === true || r.is_priority === true || Number(r.is_priority) === 1)) return true;
        var name = String((r && (r.name || r.fileName)) || '').toUpperCase();
        return name.indexOf('-IMP') !== -1 || name.indexOf('_IMP') !== -1;
    }

    function sortBadgeHtml(r) {
        var html = '';
        if (rowIsPriority(r)) {
            html += '<span class="ev-triage-badge ev-triage-badge-priority">PRIORITY</span>';
        }
        var cls = sorterClass(r);
        if (cls === 'face') html += '<span class="ev-triage-badge ev-triage-badge-face">Face/Human</span>';
        else if (cls === 'car') html += '<span class="ev-triage-badge ev-triage-badge-car">Car</span>';
        else html += '<span class="ev-triage-badge">Others</span>';
        return html;
    }

    function sourceBadgesHtml(r) {
        if (r && (r.fromLibrary || String((r.source || '')).toLowerCase() === 'library')) {
            var sosLib = triageSource(r).sos;
            return '<span class="ev-triage-badge">Library</span>'
                + (sosLib ? '<span class="ev-triage-badge ev-triage-badge-sos">SOS</span>' : '')
                + sortBadgeHtml(r);
        }
        var s = triageSource(r);
        var html = '';
        if (s.bwc) html += '<span class="ev-triage-badge">BWC</span>';
        if (s.edgeCam) html += '<span class="ev-triage-badge">Edge Cam</span>';
        if (s.dockStation) html += '<span class="ev-triage-badge">Docking Station</span>';
        if (s.sos) html += '<span class="ev-triage-badge ev-triage-badge-sos">SOS</span>';
        html += sortBadgeHtml(r);
        return html || '<span class="ev-triage-badge">BWC</span>';
    }

    function selectedRels() {
        var fromDom = [];
        var tbody = document.getElementById('ftp-inbox-tbody');
        if (tbody) {
            tbody.querySelectorAll('.ftp-inbox-row-check:checked').forEach(function (cb) {
                var rel = cb.getAttribute('data-rel') || '';
                if (rel) fromDom.push(rel);
            });
        }
        if (fromDom.length) return fromDom;
        return Object.keys(selected).filter(function (k) { return selected[k]; });
    }

    function syncBulkUi() {
        var n = selectedRels().length;
        var all = document.getElementById('ftp-inbox-check-all');
        var list = filtered();
        if (all) {
            all.checked = list.length > 0 && list.every(function (r) {
                return selected[r.rel || r.path];
            });
            all.indeterminate = n > 0 && !all.checked;
        }
        var countEl = document.getElementById('toggle-count');
        if (countEl) countEl.textContent = String(n);
        var mass = document.getElementById('btn-mass-link');
        if (mass) mass.disabled = n <= 0;
        var pickCase = (global.CaseFilesUi && typeof CaseFilesUi.libraryReturnCaseId === 'function')
            ? CaseFilesUi.libraryReturnCaseId() : null;
        var bulkCase = document.getElementById('ftp-inbox-bulk-case');
        if (bulkCase) {
            bulkCase.hidden = !pickCase;
            bulkCase.disabled = n <= 0;
            bulkCase.textContent = 'Add selected to incident';
        }
    }

    function setEmptyCopy(titleText, subText) {
        var empty = document.getElementById('ftp-inbox-empty');
        if (!empty) return;
        var title = empty.querySelector('.ftp-inbox-empty-title');
        var sub = empty.querySelector('.ftp-inbox-empty-subtext');
        if (title) title.textContent = titleText;
        if (sub) sub.textContent = subText;
    }

    function mediaLabel(kind) {
        if (kind === 'image') return 'Image';
        if (kind === 'video') return 'Video';
        if (kind === 'audio') return 'Audio';
        return 'File';
    }

    function skeletonRowHtml() {
        return '<tr class="skeleton-row">'
            + '<td><span class="skeleton-block skeleton-block-lg"></span></td>'
            + '<td><span class="skeleton-block skeleton-block-md"></span></td>'
            + '<td><span class="skeleton-block skeleton-block-sm"></span></td>'
            + '<td><span class="skeleton-block skeleton-block-sm"></span></td>'
            + '<td><span class="skeleton-block skeleton-block-md"></span></td>'
            + '<td><span class="skeleton-block skeleton-block-actions"></span></td>'
            + '</tr>';
    }

    function showSkeleton() {
        var tbody = document.getElementById('ftp-inbox-tbody');
        if (tbody) tbody.innerHTML = skeletonRowHtml() + skeletonRowHtml() + skeletonRowHtml();
    }

    function paint() {
        var tbody = document.getElementById('ftp-inbox-tbody');
        var meta = document.getElementById('ftp-inbox-meta');
        var empty = document.getElementById('ftp-inbox-empty');
        var tableWrap = document.getElementById('ftp-inbox-table-wrap');
        if (!tbody) return;
        var list = filtered();
        var hasRows = list.length > 0;
        tbody.innerHTML = '';
        // AI hit state comes from DB (evidence_files.ai_hit_target_id) — no sessionStorage

        if (!loaded) {
            if (empty) {
                empty.hidden = true;
                empty.style.display = 'none';
            }
            if (tableWrap) tableWrap.hidden = false;
            showSkeleton();
            if (meta) meta.textContent = '';
            syncBulkUi();
            return;
        }

        if (!hasRows) {
            if (empty) {
                empty.hidden = false;
                empty.style.display = '';
            }
            if (tableWrap) tableWrap.hidden = true;
            if (meta) meta.textContent = rows.length ? '0 files (filtered)' : '0 files';
            syncBulkUi();
            return;
        }

        if (empty) {
            empty.hidden = true;
            empty.style.display = 'none';
        }
        if (tableWrap) tableWrap.hidden = false;
        if (meta) {
            meta.textContent = list.length + ' file' + (list.length === 1 ? '' : 's')
                + (list.length !== rows.length ? ' (filtered)' : '');
        }

        tbody.innerHTML = list.slice().sort(function (a, b) {
            var at = isTacticalLane(a) ? 0 : 1;
            var bt = isTacticalLane(b) ? 0 : 1;
            return at - bt;
        }).map(function (r) {
            var kind = r.kind || r.mediaType || 'file';
            var rel = r.rel || r.path || '';
            var device = cameraSnLabel(r);
            var officer = r.assignedOfficer || r.officerName || '—';
            var checked = selected[rel] ? ' checked' : '';
            var fileId = r.evidence_file_id || r.id || r.name || rel;
            var thumbUrl = kind === 'image' && fileId
                ? ('/api/evidence/preview/' + encodeURIComponent(fileId))
                : '';
            var thumb = '<span class="ev-triage-thumb">'
                + (thumbUrl ? '<img src="' + esc(thumbUrl) + '" alt="" width="40" height="40">' : '')
                + '</span>';
            var toggle = '<label class="enterprise-toggle">'
                + '<input type="checkbox" class="ftp-inbox-row-check" data-rel="' + esc(rel) + '" value="' + esc(fileId) + '"' + checked + ' aria-label="Select file">'
                + '<span></span></label>';
            var isSos = !!triageSource(r).sos;
            var incidentId = r.associatedCaseId || r.caseId || r.sosIncidentId || r.id || fileId;
            var softHit = !!(r.aiHitTargetId) && !(r.associatedCaseId || r.caseId);
            var actions = isSos
                ? ('<div class="ftp-inbox-session-actions">'
                    + '<button type="button" class="btn btn-danger btn-sm" data-ftp-act="incident" data-case-id="' + esc(incidentId) + '">Open active incident</button>'
                    + '</div>')
                : ('<div class="ftp-inbox-session-actions">'
                    + '<button type="button" class="btn btn-ghost btn-sm btn-review" data-ftp-act="preview" data-rel="' + esc(rel) + '" data-file-id="' + esc(fileId) + '" data-kind="' + esc(kind) + '" data-name="' + esc(r.name || '') + '">Review</button>'
                    + '<button type="button" class="btn btn-action btn-sm btn-analyze" data-ftp-act="analyze" data-rel="' + esc(rel) + '" data-file-id="' + esc(fileId) + '" data-case-id="' + esc(r.associatedCaseId || r.caseId || '') + '" data-sort-type="' + esc(sorterClass(r)) + '" data-name="' + esc(r.name || '') + '">Analyze</button>'
                    + (softHit
                        ? '<span class="ev-triage-badge ev-triage-badge-ai-hit" title="AI match found, but file is not attached to an incident yet.">[ AI Hit - Unassigned ]</span>'
                        : '')
                    + (rowIsPriority(r) && isSuperAdmin
                        ? '<button type="button" class="btn btn-ghost btn-sm" data-ftp-act="release-priority" data-file-id="' + esc(fileId) + '">Release Priority</button>'
                        : '')
                    + '</div>');
            var deviceCell = officer && officer !== '—'
                ? (esc(device) + ' (' + esc(officer) + ')')
                : esc(device);
            return '<tr data-rel="' + esc(rel) + '">'
                + '<td>' + toggle + thumb + '<span class="ev-triage-name">' + esc(r.name || 'Session') + '</span></td>'
                + '<td>' + sourceBadgesHtml(r) + '</td>'
                + '<td>' + deviceCell + '</td>'
                + '<td>' + esc(fmtSize(r.size)) + '</td>'
                + '<td>' + esc(fmtTime(r.uploadedAt)) + '</td>'
                + '<td>' + actions + '</td>'
                + '</tr>';
        }).join('');
        syncBulkUi();
    }

    function openPreview(rel, kind, name, fileId) {
        if (!rel && !fileId) return;
        var url = '/api/evidence/preview/' + encodeURIComponent(fileId || rel);
        var dlg = document.getElementById('ftp-inbox-preview');
        var img = document.getElementById('ftp-inbox-preview-img');
        var vid = document.getElementById('ftp-inbox-preview-video');
        var cap = document.getElementById('ftp-inbox-preview-cap');
        if (!dlg) {
            window.open(url, '_blank', 'noopener');
            return;
        }
        if (img) {
            img.removeAttribute('src');
            img.hidden = true;
        }
        if (vid) {
            try { vid.pause(); } catch (_) {}
            vid.removeAttribute('src');
            vid.hidden = true;
        }
        if (cap) cap.textContent = name || 'Preview';
        var isImg = kind === 'image' || (kind !== 'video' && /\.(jpe?g|png|gif|webp|bmp)$/i.test(String(name || rel || '')));
        if (isImg) {
            if (img) {
                img.src = url;
                img.hidden = false;
            }
        } else if (vid) {
            vid.src = url;
            vid.hidden = false;
        }
        dlg.hidden = false;
        try { dlg.scrollTop = 0; } catch (_) { /* ignore */ }
    }

    function closePreview() {
        var dlg = document.getElementById('ftp-inbox-preview');
        var img = document.getElementById('ftp-inbox-preview-img');
        var vid = document.getElementById('ftp-inbox-preview-video');
        if (dlg) dlg.hidden = true;
        if (img) {
            img.removeAttribute('src');
            img.hidden = true;
        }
        if (vid) {
            try { vid.pause(); } catch (_) {}
            vid.removeAttribute('src');
            vid.hidden = true;
        }
    }

    /** Same Leaflet pattern as OpsCasesUi.showDeskMap — isolated host so Cases panel stays untouched. */
    function showDeskMap(lat, lon) {
        if (global.OpsCasesUi && typeof OpsCasesUi.showDeskMap === 'function'
            && document.getElementById('ops-cases-desk-map-leaflet')
            && document.getElementById('ev-panel-ops-cases')
            && !document.getElementById('ev-panel-ops-cases').hidden) {
            OpsCasesUi.showDeskMap(lat, lon);
            return;
        }
        var dlg = document.getElementById('ftp-inbox-map');
        var host = document.getElementById('ftp-inbox-map-leaflet');
        var coords = document.getElementById('ftp-inbox-map-coords');
        var Lref = global.L;
        if (!dlg || !host) return;
        dlg.hidden = false;
        if (coords) coords.textContent = Number(lat).toFixed(5) + ', ' + Number(lon).toFixed(5);
        mapState.lat = lat;
        mapState.lon = lon;
        if (!Lref) {
            host.innerHTML = '<p class="hint">Map library is not available.</p>';
            return;
        }
        setTimeout(function () {
            if (mapState.map) {
                mapState.map.setView([lat, lon], 16);
                if (mapState.marker) mapState.marker.setLatLng([lat, lon]);
                else mapState.marker = Lref.marker([lat, lon]).addTo(mapState.map);
                try { mapState.map.invalidateSize(); } catch (_) { /* ignore */ }
                return;
            }
            mapState.map = Lref.map(host, {
                zoomControl: true,
                scrollWheelZoom: false,
                attributionControl: true,
            }).setView([lat, lon], 16);
            Lref.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; OpenStreetMap',
            }).addTo(mapState.map);
            mapState.marker = Lref.marker([lat, lon]).addTo(mapState.map);
            try { mapState.map.invalidateSize(); } catch (_) { /* ignore */ }
        }, 40);
    }

    function closeMap() {
        var dlg = document.getElementById('ftp-inbox-map');
        if (dlg) dlg.hidden = true;
    }

    function addToCase(rel, name) {
        try {
            sessionStorage.setItem('ftpInboxPendingCase', JSON.stringify({
                rel: rel,
                name: name || '',
                at: Date.now(),
            }));
        } catch (_) { /* ignore */ }
        var row = rows.find(function (r) { return (r.rel || r.path) === rel; });
        var fileId = row && (row.evidenceFileId || row.fileId);
        if (fileId && global.CaseFilesUi && CaseFilesUi.promptAddToCase) {
            CaseFilesUi.promptAddToCase(fileId).catch(function () { /* ignore */ });
            return;
        }
        if (global.EvidenceHub && EvidenceHub.showPanel) {
            EvidenceHub.showPanel('case-files');
        }
        var meta = document.getElementById('ftp-inbox-meta');
        if (meta) meta.textContent = 'Ready for case assignment: ' + (name || 'selected file');
    }

    function selectedFileIds() {
        return selectedRels().map(function (rel) {
            var row = rows.find(function (r) { return (r.rel || r.path) === rel; });
            return (row && (row.evidenceFileId || row.evidence_file_id || row.id)) || '';
        }).filter(Boolean);
    }

    function bulkAddToCase() {
        var ids = selectedFileIds();
        if (!ids.length) return;
        var pickCase = (global.CaseFilesUi && typeof CaseFilesUi.libraryReturnCaseId === 'function')
            ? CaseFilesUi.libraryReturnCaseId() : null;
        if (pickCase && global.CaseFilesUi && typeof CaseFilesUi.completeLibraryPicks === 'function') {
            CaseFilesUi.completeLibraryPicks(ids).catch(function () { /* ignore */ });
            return;
        }
        var rels = selectedRels();
        var items = rels.map(function (rel) {
            var row = rows.find(function (r) { return (r.rel || r.path) === rel; });
            return { rel: rel, name: (row && row.name) || rel };
        });
        try {
            sessionStorage.setItem('pendingBulkCaseEvidence', JSON.stringify(ids));
            sessionStorage.setItem('ftpInboxPendingCaseBulk', JSON.stringify({
                items: items,
                at: Date.now(),
            }));
            if (items[0]) {
                sessionStorage.setItem('ftpInboxPendingCase', JSON.stringify({
                    rel: items[0].rel,
                    name: items[0].name,
                    at: Date.now(),
                }));
            }
        } catch (_) { /* ignore */ }
        if (global.EvidenceHub && EvidenceHub.showPanel) {
            EvidenceHub.showPanel('case-files');
        }
        var meta = document.getElementById('ftp-inbox-meta');
        if (meta) meta.textContent = items.length + ' file(s) ready for case assignment';
    }

    function massLinkToIncident() {
        var ids = selectedFileIds();
        if (!ids.length) return;
        var pickCase = (global.CaseFilesUi && typeof CaseFilesUi.libraryReturnCaseId === 'function')
            ? CaseFilesUi.libraryReturnCaseId() : null;
        if (pickCase && global.CaseFilesUi && typeof CaseFilesUi.completeLibraryPicks === 'function') {
            CaseFilesUi.completeLibraryPicks(ids).catch(function () { /* ignore */ });
            return;
        }
        try {
            sessionStorage.setItem('pendingBulkCaseEvidence', JSON.stringify(ids));
        } catch (_) { /* ignore */ }
        if (global.EvidenceManager && typeof EvidenceManager.showTab === 'function') {
            EvidenceManager.showTab('evidence');
        }
        if (global.CaseFilesUi && typeof CaseFilesUi.beginIncidentAttach === 'function') {
            CaseFilesUi.beginIncidentAttach(ids);
            return;
        }
        bulkAddToCase();
    }

    function openActiveIncident(caseId) {
        var id = String(caseId || '').trim();
        if (global.EvidenceManager && typeof EvidenceManager.showTab === 'function') {
            EvidenceManager.showTab('evidence');
        }
        if (global.CaseFilesUi && typeof CaseFilesUi.openCase === 'function') {
            CaseFilesUi.openCase({ caseId: id });
            return;
        }
        if (global.EvidenceHub && EvidenceHub.showPanel) EvidenceHub.showPanel('case-files');
    }

    function releasePriority(fileId) {
        var id = String(fileId || '').trim();
        if (!id || !isSuperAdmin) return;
        fetch('/api/evidence/detail/' + encodeURIComponent(id) + '/release-priority', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: '{}',
        }).then(function (r) {
            return r.json().catch(function () { return {}; }).then(function (body) {
                return { ok: r.ok && body && body.ok !== false };
            });
        }).then(function (res) {
            if (!res.ok) {
                window.alert('Could not release priority.');
                return;
            }
            rows.forEach(function (row) {
                if ((row.id || row.evidence_file_id) === id) row.isPriority = false;
            });
            lastInboxKey = '';
            paint();
            load(true, true);
        }).catch(function () {
            window.alert('Could not release priority.');
        });
    }

    function bulkPurge() {
        var rels = selectedRels();
        if (!rels.length) {
            window.alert('Toggle the files you want to clear, then click Bulk Clear.');
            return;
        }
        if (!isSuperAdmin) {
            var blocked = rels.some(function (rel) {
                var row = rows.find(function (r) { return (r.rel || r.path) === rel; });
                return rowIsPriority(row);
            });
            if (blocked) {
                window.alert('Priority files cannot be cleared. Attach them to an incident.');
                return;
            }
        }
        var libIds = [];
        var otherIds = [];
        rels.forEach(function (rel) {
            var row = rows.find(function (r) { return (r.rel || r.path) === rel; });
            var id = (row && (row.id || row.evidence_file_id)) || rel;
            if (row && row.fromLibrary) libIds.push(id);
            else otherIds.push(id);
        });
        var msg = libIds.length && !otherIds.length
            ? ('Remove ' + libIds.length + ' file' + (libIds.length === 1 ? '' : 's') + ' from Triage? They stay in the Library.')
            : ('Remove ' + rels.length + ' file' + (rels.length === 1 ? '' : 's') + ' from Evidence Triage? Dock files move to the delete queue. Library files stay in the Library.');
        if (!window.confirm(msg)) return;
        var jobs = [];
        if (libIds.length) {
            jobs.push(fetch('/api/evidence/remove-from-triage', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileIds: libIds }),
            }).then(function (r) {
                return r.json().catch(function () { return {}; }).then(function (body) {
                    return (body && body.ids) || (r.ok ? libIds : []);
                });
            }).catch(function () { return []; }));
        }
        otherIds.forEach(function (id) {
            jobs.push(fetch('/api/evidence/detail/' + encodeURIComponent(id) + '/queue-delete', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: '{}',
            }).then(function (r) {
                return r.json().catch(function () { return {}; }).then(function (body) {
                    return (r.ok && body && body.ok !== false) ? [id] : [];
                });
            }).catch(function () { return []; }));
        });
        Promise.all(jobs).then(function (chunks) {
            var okIds = [];
            chunks.forEach(function (part) {
                (part || []).forEach(function (id) { if (id) okIds.push(id); });
            });
            if (!okIds.length) {
                window.alert('Could not remove selected files.');
                return;
            }
            dropRels(rels);
            load(true, true);
        }).catch(function () {
            window.alert('Could not remove selected files.');
        });
    }

    function openAnalyze(fileId, rel, caseId, sortType) {
        var id = String(fileId || rel || '').trim();
        if (!id) return;
        try { sessionStorage.setItem('pending_analysis_id', id); } catch (_) { /* ignore */ }
        try {
            var st = String(sortType || '').trim().toLowerCase();
            if (st && st !== 'other') sessionStorage.setItem('pending_analysis_sort', st);
            else sessionStorage.removeItem('pending_analysis_sort');
        } catch (_) { /* ignore */ }
        try {
            var cid = String(caseId || '').trim();
            if (cid) sessionStorage.setItem('pending_analysis_case_id', cid);
            else sessionStorage.removeItem('pending_analysis_case_id');
        } catch (_) { /* ignore */ }
        if (global.EvidenceManager && typeof EvidenceManager.showTab === 'function') {
            EvidenceManager.showTab('analytics');
        } else {
            var btnAx = document.getElementById('nav-tab-analytics');
            if (btnAx) btnAx.click();
        }
    }

    function sendToAnpr(url, rel) {
        var filePath = rel || url || '';
        try {
            sessionStorage.setItem('autoLoadAnprFile', filePath);
            sessionStorage.setItem('ftpInboxPendingAnpr', JSON.stringify({
                url: url || '',
                rel: rel || '',
                at: Date.now(),
            }));
        } catch (_) { /* ignore */ }
        if (global.EvidenceManager && typeof EvidenceManager.showTab === 'function') {
            EvidenceManager.showTab('analytics');
        } else {
            var btnAx = document.getElementById('nav-tab-analytics');
            if (btnAx) btnAx.click();
        }
        setTimeout(function () {
            var hubAnpr = document.querySelector('.ax-hub-nav-btn[data-panel="anpr"]');
            if (hubAnpr && !hubAnpr.disabled) hubAnpr.click();
            var snap = document.getElementById('ax-anpr-sub-snapshot');
            if (snap) snap.click();
            if (global.AnalyticsHub && typeof AnalyticsHub.consumeAutoLoadAnprFile === 'function') {
                AnalyticsHub.consumeAutoLoadAnprFile();
            }
        }, 180);
        var meta = document.getElementById('ftp-inbox-meta');
        if (meta) meta.textContent = 'Opening plate reader…';
    }

    function rootContainsToggle(el) {
        var root = document.getElementById('ev-panel-ftp-inbox');
        return !!(root && el && root.contains(el));
    }

    function onClick(ev) {
        var t = ev.target;
        if (!t) return;
        if (t.classList && (t.classList.contains('ftp-inbox-row-check') || t.classList.contains('enterprise-checkbox'))) {
            var relC = t.getAttribute('data-rel') || '';
            if (relC) selected[relC] = !!t.checked;
            syncBulkUi();
            return;
        }
        var tog = t.closest ? t.closest('.enterprise-toggle') : null;
        if (tog && rootContainsToggle(tog)) {
            var cb = tog.querySelector('.ftp-inbox-row-check');
            if (cb) {
                var relT = cb.getAttribute('data-rel') || '';
                if (relT) selected[relT] = !!cb.checked;
                syncBulkUi();
            }
            return;
        }
        var btn = t.closest ? t.closest('[data-ftp-act]') : null;
        if (!btn) return;
        var act = btn.getAttribute('data-ftp-act');
        var rel = btn.getAttribute('data-rel') || '';
        if (act === 'preview') openPreview(rel, btn.getAttribute('data-kind') || '', btn.getAttribute('data-name') || '', btn.getAttribute('data-file-id') || '');
        else if (act === 'case') addToCase(rel, btn.getAttribute('data-name') || '');
        else if (act === 'analyze') openAnalyze(btn.getAttribute('data-file-id') || rel, rel, btn.getAttribute('data-case-id'), btn.getAttribute('data-sort-type'));
        else if (act === 'incident') openActiveIncident(btn.getAttribute('data-case-id') || rel);
        else if (act === 'release-priority') releasePriority(btn.getAttribute('data-file-id') || '');
        else if (act === 'anpr') sendToAnpr(btn.getAttribute('data-url') || '', rel);
        else if (act === 'map') {
            var lat = Number(btn.getAttribute('data-lat'));
            var lon = Number(btn.getAttribute('data-lon'));
            if (Number.isFinite(lat) && Number.isFinite(lon)) showDeskMap(lat, lon);
        }
    }

    var lastInboxKey = '';
    var fetchBusy = false;
    var fetchGen = 0;

    function inboxKey(list) {
        var arr = list || [];
        return String(arr.length) + '\n' + arr.map(function (r) {
            return String(r.rel || r.path || '') + '\t' + String(r.size || 0) + '\t'
                + String(r.uploadedAt || r.mtime || r.mtimeMs || '') + '\t'
                + String(r.case_id || r.caseId || r.associatedCaseId || '');
        }).sort().join('\n');
    }

    function setRefreshSpin(on) {
        var btn = document.getElementById('ftp-inbox-refresh');
        if (!btn) return;
        btn.classList.toggle('is-refreshing', !!on);
        btn.setAttribute('aria-busy', on ? 'true' : 'false');
    }

    function dropRels(rels) {
        var drop = Object.create(null);
        (rels || []).forEach(function (rel) { drop[String(rel || '')] = true; });
        rows = rows.filter(function (r) { return !drop[r.rel || r.path]; });
        Object.keys(drop).forEach(function (rel) { delete selected[rel]; });
        lastInboxKey = '';
        loaded = true;
        paint();
    }

    function applyInboxList(next) {
        next = netRows(Array.isArray(next) ? next : []);
        lastInboxKey = inboxKey(next);
        rows = next;
        loaded = true;
        var alive = Object.create(null);
        rows.forEach(function (r) {
            var rel = r.rel || r.path;
            if (rel && selected[rel]) alive[rel] = true;
        });
        selected = alive;
        var tbody = document.getElementById('ftp-inbox-tbody');
        if (tbody) tbody.innerHTML = '';
        paint();
    }

    function load(quiet, force) {
        if (fetchBusy && !force) return;
        fetchBusy = true;
        var gen = ++fetchGen;
        if (force) setRefreshSpin(true);
        fetch('/api/evidence/catalog?status=active&limit=500', { credentials: 'same-origin' })
            .then(function (r) {
                return r.json().catch(function () { return {}; }).then(function (body) {
                    return { ok: r.ok, body: body };
                });
            })
            .then(function (res) {
                if (gen !== fetchGen) return;
                fetchBusy = false;
                if (force) setRefreshSpin(false);
                var body = res.body || {};
                var raw = Array.isArray(body.files) ? body.files
                    : (Array.isArray(body.items) ? body.items : []);
                var next = raw.map(normalizeCatalogFile).filter(Boolean);
                if (!res.ok || body.ok === false) {
                    if (!quiet && !rows.length) {
                        loaded = false;
                        showSkeleton();
                    }
                    return;
                }
                var key = inboxKey(netRows(next));
                if (!force && loaded && key === lastInboxKey) return;
                applyInboxList(next);
            })
            .catch(function () {
                if (gen !== fetchGen) return;
                fetchBusy = false;
                if (force) setRefreshSpin(false);
                if (rows.length) return;
                loaded = false;
                lastInboxKey = '';
                showSkeleton();
            });
    }

    function bind() {
        if (bound) return;
        bound = true;
        fetch('/api/auth/session', { credentials: 'same-origin' }).then(function (r) {
            return r.json().catch(function () { return {}; });
        }).then(function (body) {
            isSuperAdmin = !!(body && body.ok && body.role === 'super_admin');
            paint();
        }).catch(function () { /* keep operator */ });
        var root = document.getElementById('ev-panel-ftp-inbox');
        if (root) {
            root.addEventListener('click', onClick);
            root.addEventListener('change', function (ev) {
                var t = ev.target;
                if (!t || !t.classList || !t.classList.contains('ftp-inbox-row-check')) return;
                var relC = t.getAttribute('data-rel') || '';
                if (relC) selected[relC] = !!t.checked;
                syncBulkUi();
            });
        }
        var refresh = document.getElementById('ftp-inbox-refresh');
        if (refresh) {
            refresh.addEventListener('click', function () {
                lastInboxKey = '';
                load(false, true);
            });
        }
        var chips = document.getElementById('ftp-inbox-edge-filters');
        if (chips) {
            chips.addEventListener('click', function (ev) {
                var btn = ev.target && ev.target.closest ? ev.target.closest('[data-edge-filter]') : null;
                if (!btn || !chips.contains(btn)) return;
                var key = btn.getAttribute('data-edge-filter');
                if (!key || !Object.prototype.hasOwnProperty.call(edgeFilter, key)) return;
                edgeFilter[key] = !edgeFilter[key];
                btn.classList.toggle('active', edgeFilter[key]);
                btn.classList.toggle('btn-primary', edgeFilter[key]);
                btn.classList.toggle('btn-ghost', !edgeFilter[key]);
                btn.setAttribute('aria-pressed', edgeFilter[key] ? 'true' : 'false');
                paint();
            });
        }
        var search = document.getElementById('ftp-inbox-search');
        if (search) search.addEventListener('input', paint);
        var type = document.getElementById('ftp-inbox-type');
        if (type) type.addEventListener('change', paint);
        var sortClass = document.getElementById('ftp-inbox-class');
        if (sortClass) sortClass.addEventListener('change', paint);
        var dateEl = document.getElementById('ftp-inbox-date');
        if (dateEl) dateEl.addEventListener('change', paint);
        var checkAll = document.getElementById('ftp-inbox-check-all');
        if (checkAll) {
            checkAll.addEventListener('change', function () {
                var on = !!checkAll.checked;
                filtered().forEach(function (r) {
                    var rel = r.rel || r.path;
                    if (rel) selected[rel] = on;
                });
                paint();
            });
        }
        var bulkCase = document.getElementById('ftp-inbox-bulk-case');
        if (bulkCase) bulkCase.addEventListener('click', bulkAddToCase);
        var massLink = document.getElementById('btn-mass-link');
        if (massLink) massLink.addEventListener('click', massLinkToIncident);
        var bulkPurgeBtn = document.getElementById('ftp-inbox-bulk-purge');
        if (bulkPurgeBtn) bulkPurgeBtn.addEventListener('click', bulkPurge);
        var prevClose = document.getElementById('ftp-inbox-preview-close');
        if (prevClose) prevClose.addEventListener('click', closePreview);
        var mapClose = document.getElementById('ftp-inbox-map-close');
        if (mapClose) mapClose.addEventListener('click', closeMap);
        var prevDlg = document.getElementById('ftp-inbox-preview');
        if (prevDlg) {
            prevDlg.addEventListener('click', function (ev) {
                if (ev.target === prevDlg) closePreview();
            });
        }
        var mapDlg = document.getElementById('ftp-inbox-map');
        if (mapDlg) {
            mapDlg.addEventListener('click', function (ev) {
                if (ev.target === mapDlg) closeMap();
            });
        }
    }

    var pollTimer = null;
    var sorterSockBound = false;

    function applySortedLabel(payload) {
        var id = String((payload && payload.evidenceId) || '').trim();
        var name = String((payload && payload.fileName) || '').trim();
        var cls = String((payload && payload.sortType) || '').toLowerCase();
        if (!cls) return;
        var hit = false;
        rows.forEach(function (r) {
            var rid = String(r.id || r.evidence_file_id || '');
            var rname = String(r.name || '');
            if ((id && rid === id) || (name && rname === name)) {
                r.sortType = cls;
                r.sorterType = cls;
                hit = true;
            }
        });
        if (hit) paint();
    }

    function bindSorterSocket() {
        if (sorterSockBound) return;
        if (typeof global.io !== 'function') return;
        sorterSockBound = true;
        var sock = global.io();
        sock.on('evidence-sorted', applySortedLabel);
    }

    function onShow(opts) {
        bind();
        bindSorterSocket();
        var force = !!(opts && opts.force);
        load(!force && !!rows.length, force);
        if (pollTimer) clearInterval(pollTimer);
        pollTimer = setInterval(function () {
            var panel = document.getElementById('ev-panel-ftp-inbox');
            if (panel && !panel.hidden) load(true, false);
        }, 2000);
    }

    global.FtpInboxUi = {
        onShow: onShow,
        refresh: function () { lastInboxKey = ''; load(false, true); },
        showDeskMap: showDeskMap,
        selectedFileIds: selectedFileIds,
        openActiveIncident: openActiveIncident,
    };
    global.openActiveIncident = openActiveIncident;
})(typeof window !== 'undefined' ? window : this);
