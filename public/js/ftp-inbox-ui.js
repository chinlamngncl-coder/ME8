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
    var mapState = { map: null, marker: null, lat: null, lon: null };

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
        if (!iso) return '—';
        try {
            var d = new Date(iso);
            if (isNaN(d.getTime())) return String(iso);
            return d.toLocaleString();
        } catch (_) {
            return String(iso);
        }
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
        return {
            q: (qEl && qEl.value ? String(qEl.value) : '').trim().toLowerCase(),
            type: (tEl && tEl.value) || 'all',
        };
    }

    function filtered() {
        var f = filters();
        return rows.filter(function (r) {
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

    function selectedRels() {
        return Object.keys(selected).filter(function (k) { return selected[k]; });
    }

    function syncBulkUi() {
        var n = selectedRels().length;
        var wrap = document.getElementById('ftp-inbox-bulk-actions');
        if (wrap) wrap.hidden = n < 1;
        var all = document.getElementById('ftp-inbox-check-all');
        var list = filtered();
        if (all) {
            all.checked = list.length > 0 && list.every(function (r) {
                return selected[r.rel || r.path];
            });
            all.indeterminate = n > 0 && !all.checked;
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

    function paint() {
        var tbody = document.getElementById('ftp-inbox-tbody');
        var meta = document.getElementById('ftp-inbox-meta');
        var empty = document.getElementById('ftp-inbox-empty');
        var tableWrap = document.getElementById('ftp-inbox-table-wrap');
        if (!tbody) return;
        var list = filtered();
        var hasRows = list.length > 0;

        if (!rows.length) {
            tbody.innerHTML = '';
            selected = Object.create(null);
            if (empty) empty.hidden = false;
            if (tableWrap) tableWrap.hidden = true;
            setEmptyCopy(
                'No unassigned evidence',
                'Docking station uploads appear here before they are assigned to a case or the Evidence Library.'
            );
            if (meta) meta.textContent = '';
            syncBulkUi();
            return;
        }

        if (!hasRows) {
            tbody.innerHTML = '';
            if (empty) empty.hidden = false;
            if (tableWrap) tableWrap.hidden = true;
            setEmptyCopy('No matching files', 'Try clearing search or type filters.');
            if (meta) meta.textContent = '0 files (filtered)';
            syncBulkUi();
            return;
        }

        if (empty) empty.hidden = true;
        if (tableWrap) tableWrap.hidden = false;
        if (meta) {
            meta.textContent = list.length + ' file' + (list.length === 1 ? '' : 's')
                + (list.length !== rows.length ? ' (filtered)' : '');
        }

        tbody.innerHTML = list.map(function (r) {
            var kind = r.kind || r.mediaType || 'file';
            var rel = r.rel || r.path || '';
            var url = r.url || ('/api/ftp-inbox/file?rel=' + encodeURIComponent(rel));
            var thumb = '';
            if (kind === 'image' && (r.thumbUrl || url)) {
                thumb = '<img class="ftp-inbox-thumb" data-ftp-act="preview" data-rel="' + esc(rel) + '" data-kind="' + esc(kind) + '" data-name="' + esc(r.name || '') + '" src="' + esc(r.thumbUrl || url) + '" alt="">';
            } else {
                thumb = '<span class="ftp-inbox-thumb-ph" data-ftp-act="preview" data-rel="' + esc(rel) + '" data-kind="' + esc(kind) + '" data-name="' + esc(r.name || '') + '">' + esc(mediaLabel(kind)) + '</span>';
            }
            var device = r.deviceId || r.serial || '—';
            var officer = r.assignedOfficer || r.officerName || '—';
            var pin = groupColorForDevice(r.deviceId || r.serial, r.mapGroup);
            var verified = r.integrityVerified === true
                ? '<span class="ftp-inbox-verified" title="Matches docking station manifest">Verified</span>'
                : '';
            var officerHtml = '<span class="ftp-inbox-officer">'
                + '<span class="fleet-pin-color" style="background:' + esc(pin) + '"></span>'
                + '<span>' + esc(officer) + '</span>' + verified + '</span>';
            var lat = Number(r.lat);
            var lon = Number(r.lon);
            var hasGps = r.hasGps === true || (Number.isFinite(lat) && Number.isFinite(lon) && !(lat === 0 && lon === 0));
            var locHtml = hasGps
                ? '<button type="button" class="btn btn-ghost btn-sm" data-ftp-act="map" data-lat="' + esc(lat) + '" data-lon="' + esc(lon) + '">View Map</button>'
                : '<span class="hint">—</span>';
            var media = '<div class="ftp-inbox-media"><strong>' + esc(r.name || '') + '</strong>'
                + '<span class="hint">' + esc(fmtSize(r.size)) + ' · ' + esc(mediaLabel(kind)) + '</span></div>';
            var actions = '<div class="ftp-inbox-actions">'
                + '<button type="button" class="btn btn-ghost btn-sm" data-ftp-act="preview" data-rel="' + esc(rel) + '" data-kind="' + esc(kind) + '" data-name="' + esc(r.name || '') + '">Play / View</button>'
                + '<button type="button" class="btn btn-ghost btn-sm" data-ftp-act="case" data-rel="' + esc(rel) + '" data-name="' + esc(r.name || '') + '">Add to Case</button>';
            if (kind === 'image') {
                actions += '<button type="button" class="btn btn-action btn-sm" data-ftp-act="anpr" data-rel="' + esc(rel) + '" data-url="' + esc(url) + '">Send to ANPR</button>';
            }
            actions += '</div>';
            var checked = selected[rel] ? ' checked' : '';
            return '<tr data-rel="' + esc(rel) + '">'
                + '<td class="ftp-inbox-check-col"><input type="checkbox" class="ftp-inbox-row-check" data-rel="' + esc(rel) + '"' + checked + ' aria-label="Select file"></td>'
                + '<td class="ftp-inbox-preview-cell">' + thumb + '</td>'
                + '<td>' + esc(fmtTime(r.uploadedAt)) + '</td>'
                + '<td>' + esc(device) + '</td>'
                + '<td>' + officerHtml + '</td>'
                + '<td>' + locHtml + '</td>'
                + '<td>' + media + '</td>'
                + '<td>' + actions + '</td>'
                + '</tr>';
        }).join('');
        syncBulkUi();
    }

    function openPreview(rel, kind, name) {
        if (!rel) return;
        var url = '/api/ftp-inbox/file?rel=' + encodeURIComponent(rel);
        var dlg = document.getElementById('ftp-inbox-preview');
        var img = document.getElementById('ftp-inbox-preview-img');
        var vid = document.getElementById('ftp-inbox-preview-video');
        var cap = document.getElementById('ftp-inbox-preview-cap');
        if (!dlg) {
            window.open(url, '_blank', 'noopener');
            return;
        }
        if (cap) cap.textContent = name || 'Preview';
        if (kind === 'image') {
            if (vid) {
                try { vid.pause(); } catch (_) {}
                vid.removeAttribute('src');
                vid.hidden = true;
            }
            if (img) {
                img.src = url;
                img.hidden = false;
            }
        } else {
            if (img) {
                img.removeAttribute('src');
                img.hidden = true;
            }
            if (vid) {
                vid.src = url;
                vid.hidden = false;
            }
        }
        dlg.hidden = false;
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
        if (global.EvidenceHub && EvidenceHub.showPanel) {
            EvidenceHub.showPanel('ops-cases');
        }
        var meta = document.getElementById('ftp-inbox-meta');
        if (meta) meta.textContent = 'Ready for case assignment: ' + (name || 'selected file');
    }

    function bulkAddToCase() {
        var rels = selectedRels();
        if (!rels.length) return;
        var items = rels.map(function (rel) {
            var row = rows.find(function (r) { return (r.rel || r.path) === rel; });
            return { rel: rel, name: (row && row.name) || rel };
        });
        try {
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
            EvidenceHub.showPanel('ops-cases');
        }
        var meta = document.getElementById('ftp-inbox-meta');
        if (meta) meta.textContent = items.length + ' file(s) ready for case assignment';
    }

    function bulkPurge() {
        var rels = selectedRels();
        if (!rels.length) return;
        var msg = 'Permanently remove ' + rels.length + ' file'
            + (rels.length === 1 ? '' : 's')
            + ' from Unassigned Evidence? This cannot be undone.';
        if (!window.confirm(msg)) return;
        fetch('/api/ftp-inbox/purge', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rels: rels }),
        })
            .then(function (r) {
                return r.json().catch(function () { return {}; }).then(function (body) {
                    return { ok: r.ok, body: body };
                });
            })
            .then(function (res) {
                if (!res.ok || !res.body || res.body.ok === false) {
                    window.alert((res.body && res.body.message) || 'Could not remove selected files.');
                    return;
                }
                selected = Object.create(null);
                load(true);
            })
            .catch(function () {
                window.alert('Could not remove selected files.');
            });
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

    function onClick(ev) {
        var t = ev.target;
        if (!t) return;
        if (t.classList && t.classList.contains('ftp-inbox-row-check')) {
            var relC = t.getAttribute('data-rel') || '';
            if (relC) selected[relC] = !!t.checked;
            syncBulkUi();
            return;
        }
        var btn = t.closest ? t.closest('[data-ftp-act]') : null;
        if (!btn) return;
        var act = btn.getAttribute('data-ftp-act');
        var rel = btn.getAttribute('data-rel') || '';
        if (act === 'preview') openPreview(rel, btn.getAttribute('data-kind') || '', btn.getAttribute('data-name') || '');
        else if (act === 'case') addToCase(rel, btn.getAttribute('data-name') || '');
        else if (act === 'anpr') sendToAnpr(btn.getAttribute('data-url') || '', rel);
        else if (act === 'map') {
            var lat = Number(btn.getAttribute('data-lat'));
            var lon = Number(btn.getAttribute('data-lon'));
            if (Number.isFinite(lat) && Number.isFinite(lon)) showDeskMap(lat, lon);
        }
    }

    function load(force) {
        if (loaded && !force) {
            paint();
            return;
        }
        var meta = document.getElementById('ftp-inbox-meta');
        if (meta) meta.textContent = 'Loading…';
        fetch('/api/ftp-inbox', { credentials: 'same-origin' })
            .then(function (r) {
                return r.json().catch(function () { return {}; }).then(function (body) {
                    return { ok: r.ok, body: body };
                });
            })
            .then(function (res) {
                var body = res.body || {};
                rows = Array.isArray(body.files) ? body.files
                    : (Array.isArray(body.items) ? body.items : []);
                loaded = true;
                var alive = Object.create(null);
                rows.forEach(function (r) {
                    var rel = r.rel || r.path;
                    if (rel && selected[rel]) alive[rel] = true;
                });
                selected = alive;
                paint();
            })
            .catch(function () {
                rows = [];
                loaded = false;
                var tbody = document.getElementById('ftp-inbox-tbody');
                var empty = document.getElementById('ftp-inbox-empty');
                var tableWrap = document.getElementById('ftp-inbox-table-wrap');
                if (tbody) tbody.innerHTML = '';
                if (tableWrap) tableWrap.hidden = true;
                if (empty) empty.hidden = false;
                setEmptyCopy('Could not load inbox', 'Refresh and try again.');
                if (meta) meta.textContent = 'Load failed';
                syncBulkUi();
            });
    }

    function bind() {
        if (bound) return;
        bound = true;
        var root = document.getElementById('ev-panel-ftp-inbox');
        if (root) root.addEventListener('click', onClick);
        var refresh = document.getElementById('ftp-inbox-refresh');
        if (refresh) refresh.addEventListener('click', function () { load(true); });
        var search = document.getElementById('ftp-inbox-search');
        if (search) search.addEventListener('input', paint);
        var type = document.getElementById('ftp-inbox-type');
        if (type) type.addEventListener('change', paint);
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
        var bulkPurge = document.getElementById('ftp-inbox-bulk-purge');
        if (bulkPurge) bulkPurge.addEventListener('click', bulkPurge);
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

    function onShow(opts) {
        bind();
        load(!!(opts && opts.force));
    }

    global.FtpInboxUi = {
        onShow: onShow,
        refresh: function () { load(true); },
        showDeskMap: showDeskMap,
    };
})(typeof window !== 'undefined' ? window : this);
