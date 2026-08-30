/**
 * ANPR Search & History — infinite scroll grid + filters.
 * Does not touch live PIP pairing or draggable snap modal chrome.
 */
(function (global) {
    'use strict';

    var offset = 0;
    var loading = false;
    var hasMore = true;
    var bound = false;

    function tr(key, fallback) {
        try {
            if (global.i18n && typeof global.i18n.t === 'function') {
                var v = global.i18n.t(key);
                if (v && v !== key) return v;
            }
        } catch (_) { /* ignore */ }
        return fallback || key;
    }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function filters() {
        return {
            q: (document.getElementById('ax-anpr-hist-q') || {}).value || '',
            vehicleType: (document.getElementById('ax-anpr-hist-vtype') || {}).value || 'All',
            camId: (document.getElementById('ax-anpr-hist-cam') || {}).value || '',
            from: (document.getElementById('ax-anpr-hist-from') || {}).value || '',
            to: (document.getElementById('ax-anpr-hist-to') || {}).value || '',
        };
    }

    function cardHtml(e) {
        var plate = e.unclear
            ? tr('analytics.anpr.unclear', 'Unclear / Manual Review')
            : (e.plate || e.plateCompact || '—');
        var mmr = e.mmrText || [e.color, e.make, e.model].filter(Boolean).join(' - ');
        var meta = [
            e.at ? String(e.at).replace('T', ' ').slice(0, 19) : '—',
            e.deviceLabel || e.camId || '—',
            e.vehicleType || '',
            mmr,
        ].filter(Boolean).join(' · ');
        return '<div class="ax-anpr-hist-card' + (e.unclear ? ' is-unclear' : '') + '" data-anpr-hist-id="' + esc(e.id) + '" role="listitem" title="' +
            esc(tr('analytics.anpr.liveRailExpandHint', 'Click to expand')) + '">' +
            '<div class="ax-anpr-hist-thumb">' +
            (e.vehicleUrl
                ? '<img class="ax-anpr-hist-macro" src="' + esc(e.vehicleUrl) + '" alt="' +
                    esc(tr('analytics.anpr.histMacroAlt', 'Vehicle Macro Crop')) + '">'
                : '<div class="ax-anpr-hist-macro-empty hint">—</div>') +
            (e.cropUrl
                ? '<img class="ax-anpr-hist-micro" src="' + esc(e.cropUrl) + '" alt="">'
                : '') +
            '</div>' +
            '<div class="ax-anpr-rail-plate">' + esc(plate) + '</div>' +
            '<div class="ax-anpr-rail-meta">' + esc(meta) + '</div>' +
            '</div>';
    }

    function openDetail(entry) {
        if (!entry) return;
        if (global.AnprLiveWatch && typeof AnprLiveWatch.pushRail === 'function') {
            /* Reuse existing vehicle snap lightbox via a synthetic rail open */
        }
        var tick = Object.assign({}, entry.payload || {}, {
            plate: entry.plate,
            plateCompact: entry.plateCompact,
            vehicleUrl: entry.vehicleUrl,
            cropUrl: entry.cropUrl,
            deviceLabel: entry.deviceLabel,
            camId: entry.camId,
            at: entry.at,
            make: entry.make,
            model: entry.model,
            color: entry.color,
            mmrText: entry.mmrText,
            unclear: entry.unclear,
            reviewStatus: entry.reviewStatus,
            lat: entry.lat,
            lon: entry.lon,
            vehicleLabel: entry.vehicleType,
        });
        if (global.AnprLiveWatch && typeof AnprLiveWatch.openHistoryDetail === 'function') {
            AnprLiveWatch.openHistoryDetail(tick);
            return;
        }
        /* Fallback: dispatch custom event for lightbox */
        try {
            global.dispatchEvent(new CustomEvent('anpr-history-open', { detail: tick }));
        } catch (_) { /* ignore */ }
    }

    function appendEntries(entries, reset) {
        var grid = document.getElementById('ax-anpr-hist-grid');
        if (!grid) return;
        if (reset) grid.innerHTML = '';
        if (!entries || !entries.length) {
            if (reset) {
                grid.innerHTML = '<div class="hint ax-anpr-hist-empty">' +
                    esc(tr('analytics.anpr.histEmpty', 'No captures match these filters.')) + '</div>';
            }
            return;
        }
        var html = entries.map(cardHtml).join('');
        if (reset) grid.innerHTML = html;
        else grid.insertAdjacentHTML('beforeend', html);
    }

    function loadMore(reset) {
        if (loading) return;
        if (!reset && !hasMore) return;
        loading = true;
        var status = document.getElementById('ax-anpr-hist-status');
        if (status) status.textContent = tr('analytics.anpr.histLoading', 'Loading…');
        if (reset) {
            offset = 0;
            hasMore = true;
        }
        var f = filters();
        var params = [
            'limit=24',
            'offset=' + offset,
        ];
        if (f.q) params.push('q=' + encodeURIComponent(f.q));
        if (f.vehicleType && f.vehicleType !== 'All') params.push('vehicleType=' + encodeURIComponent(f.vehicleType));
        if (f.camId) params.push('camId=' + encodeURIComponent(f.camId));
        if (f.from) params.push('from=' + encodeURIComponent(new Date(f.from).toISOString()));
        if (f.to) {
            var toD = new Date(f.to);
            toD.setHours(23, 59, 59, 999);
            params.push('to=' + encodeURIComponent(toD.toISOString()));
        }
        fetch('/api/analytics/anpr/history?' + params.join('&'), { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                loading = false;
                if (!data || !data.ok) {
                    if (status) status.textContent = (data && data.error) || tr('analytics.anpr.histFail', 'History unavailable');
                    if (reset) appendEntries([], true);
                    return;
                }
                appendEntries(data.entries || [], !!reset);
                offset += (data.entries || []).length;
                hasMore = !!data.hasMore;
                if (status) {
                    status.textContent = tr('analytics.anpr.histCount', 'Showing') + ' ' + offset +
                        ' / ' + (data.total || offset) +
                        (hasMore ? '' : ' · ' + tr('analytics.anpr.histEnd', 'end'));
                }
            })
            .catch(function () {
                loading = false;
                if (status) status.textContent = tr('analytics.anpr.histFail', 'History unavailable');
            });
    }

    function bind() {
        if (bound) return;
        bound = true;
        var searchBtn = document.getElementById('ax-anpr-hist-search');
        var resetBtn = document.getElementById('ax-anpr-hist-reset');
        var scroller = document.getElementById('ax-anpr-hist-scroll');
        var grid = document.getElementById('ax-anpr-hist-grid');
        if (searchBtn) searchBtn.addEventListener('click', function () { loadMore(true); });
        if (resetBtn) {
            resetBtn.addEventListener('click', function () {
                ['ax-anpr-hist-q', 'ax-anpr-hist-cam', 'ax-anpr-hist-from', 'ax-anpr-hist-to'].forEach(function (id) {
                    var el = document.getElementById(id);
                    if (el) el.value = '';
                });
                var vt = document.getElementById('ax-anpr-hist-vtype');
                if (vt) vt.value = 'All';
                loadMore(true);
            });
        }
        if (scroller) {
            scroller.addEventListener('scroll', function () {
                if (!hasMore || loading) return;
                if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 80) {
                    loadMore(false);
                }
            });
        }
        if (grid) {
            grid.addEventListener('dblclick', function (ev) {
                var card = ev.target && ev.target.closest
                    ? ev.target.closest('[data-anpr-hist-id]')
                    : null;
                if (!card) return;
                var id = card.getAttribute('data-anpr-hist-id');
                fetch('/api/analytics/anpr/history/' + encodeURIComponent(id), { credentials: 'same-origin' })
                    .then(function (r) { return r.json(); })
                    .then(function (data) {
                        if (data && data.ok && data.entry) openDetail(data.entry);
                    })
                    .catch(function () { /* ignore */ });
            });
            grid.addEventListener('click', function (ev) {
                var card = ev.target && ev.target.closest
                    ? ev.target.closest('[data-anpr-hist-id]')
                    : null;
                if (!card) return;
                var id = card.getAttribute('data-anpr-hist-id');
                fetch('/api/analytics/anpr/history/' + encodeURIComponent(id), { credentials: 'same-origin' })
                    .then(function (r) { return r.json(); })
                    .then(function (data) {
                        if (data && data.ok && data.entry) openDetail(data.entry);
                    })
                    .catch(function () { /* ignore */ });
            });
        }
    }

    function onShow() {
        bind();
        loadMore(true);
    }

    global.AnprHistory = {
        onShow: onShow,
        reload: function () { loadMore(true); },
    };
})(typeof window !== 'undefined' ? window : this);
