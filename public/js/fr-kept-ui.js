/**
 * Evidence → Investigation holds (FR Keep packs from storage/fr-kept).
 * mob-fr-kept-evidence-ui
 */
(function (global) {
    var bound = false;
    var lastCount = 0;

    function tr(key, fallback, params) {
        if (global.I18n && I18n.t) {
            var s = I18n.t(key, params);
            if (s && s !== key) return s;
        }
        var out = fallback != null ? String(fallback) : String(key || '').split('.').pop() || key;
        if (params && typeof params === 'object') {
            Object.keys(params).forEach(function (k) {
                out = out.replace(new RegExp('\\{' + k + '\\}', 'g'), String(params[k]));
            });
        }
        return out;
    }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/"/g, '&quot;');
    }

    function fmtTime(iso) {
        if (!iso) return '—';
        try { return new Date(iso).toLocaleString(); } catch (_) { return String(iso); }
    }

    function scoreLabel(pct) {
        if (pct == null || pct === '') return '—';
        var n = Number(pct);
        if (!isFinite(n)) return esc(pct);
        return Math.round(n) + '%';
    }

    function gpsLabel(row) {
        var lat = row.lat;
        var lon = row.lon;
        if (lat == null || lon == null || lat === '' || lon === '') return '—';
        var a = Number(lat);
        var b = Number(lon);
        if (!isFinite(a) || !isFinite(b)) return '—';
        return a.toFixed(5) + ', ' + b.toFixed(5);
    }

    function bindUi() {
        if (bound) return;
        bound = true;
        var refresh = document.getElementById('ev-holds-refresh');
        if (refresh) {
            refresh.addEventListener('click', function () {
                loadList(true);
            });
        }
        var grid = document.getElementById('ev-holds-grid');
        if (grid) {
            grid.addEventListener('click', function (e) {
                var openBtn = e.target.closest('[data-hold-open]');
                if (openBtn) {
                    var url = openBtn.getAttribute('data-hold-open');
                    if (url) openPreview(url, openBtn.getAttribute('data-hold-title') || '');
                    return;
                }
                var copyBtn = e.target.closest('[data-hold-copy]');
                if (copyBtn) {
                    var text = copyBtn.getAttribute('data-hold-copy') || '';
                    copyText(text).then(function () {
                        copyBtn.textContent = tr('evidenceHub.holdsCopied', 'Copied');
                        setTimeout(function () {
                            copyBtn.textContent = tr('evidenceHub.holdsCopyId', 'Copy ID');
                        }, 1200);
                    }).catch(function () { /* ignore */ });
                }
            });
        }
        var closePrev = document.getElementById('ev-holds-preview-close');
        if (closePrev) {
            closePrev.addEventListener('click', function () {
                var dlg = document.getElementById('ev-holds-preview');
                if (dlg) dlg.hidden = true;
            });
        }
        if (!global._frKeptUiI18nBound) {
            global._frKeptUiI18nBound = true;
            global.addEventListener('fm-i18n-changed', function () {
                loadList(true);
            });
        }
    }

    function copyText(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text);
        }
        return new Promise(function (resolve, reject) {
            try {
                var ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed';
                ta.style.left = '-9999px';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    }

    function openPreview(url, title) {
        var dlg = document.getElementById('ev-holds-preview');
        var img = document.getElementById('ev-holds-preview-img');
        var cap = document.getElementById('ev-holds-preview-cap');
        if (!dlg || !img) {
            window.open(url, '_blank', 'noopener');
            return;
        }
        img.src = url;
        img.alt = title || tr('evidenceHub.holdsPreview', 'Hold preview');
        if (cap) cap.textContent = title || '';
        dlg.hidden = false;
    }

    function renderEmpty(metaEl, gridEl, msg) {
        if (metaEl) metaEl.textContent = '';
        if (gridEl) {
            gridEl.innerHTML = '<p class="hint ev-holds-empty">' + esc(msg) + '</p>';
        }
    }

    function renderRows(rows, folderHint) {
        var grid = document.getElementById('ev-holds-grid');
        var meta = document.getElementById('ev-holds-meta');
        if (!grid) return;
        lastCount = rows.length;
        if (meta) {
            meta.textContent = tr('evidenceHub.holdsMeta', '{count} hold(s)', { count: rows.length });
        }
        if (!rows.length) {
            renderEmpty(meta, grid, tr(
                'evidenceHub.holdsEmpty',
                'No investigation holds yet. Use Keep on an FR snap or map pin to save one here.'
            ));
            return;
        }
        var html = rows.map(function (row) {
            var id = row.id || '';
            var thumb = row.thumbUrl || ('/api/analytics/fr/kept/' + encodeURIComponent(id) + '/jpg');
            var name = row.displayName || '—';
            var cam = row.deviceLabel || row.camId || '—';
            var title = (row.displayName ? row.displayName + ' · ' : '') + (row.camId || id);
            return (
                '<article class="ev-hold-card" data-hold-id="' + esc(id) + '">'
                + '<button type="button" class="ev-hold-thumb" data-hold-open="' + esc(thumb) + '" data-hold-title="' + esc(title) + '" title="' + esc(tr('evidenceHub.holdsOpen', 'Open')) + '">'
                + '<img src="' + esc(thumb) + '" alt="" loading="lazy">'
                + '</button>'
                + '<div class="ev-hold-body">'
                + '<div class="ev-hold-name">' + esc(name) + '</div>'
                + '<div class="hint">' + esc(cam) + '</div>'
                + '<div class="hint">' + esc(fmtTime(row.keptAt || row.at)) + '</div>'
                + '<div class="hint">' + esc(tr('evidenceHub.holdsScore', 'Score')) + ': ' + scoreLabel(row.scorePct)
                + ' · GPS: ' + esc(gpsLabel(row)) + '</div>'
                + '<div class="ev-hold-actions">'
                + '<button type="button" class="btn btn-ghost btn-sm" data-hold-open="' + esc(thumb) + '" data-hold-title="' + esc(title) + '">'
                + esc(tr('evidenceHub.holdsOpen', 'Open')) + '</button>'
                + '<button type="button" class="btn btn-ghost btn-sm" data-hold-copy="' + esc(id) + '">'
                + esc(tr('evidenceHub.holdsCopyId', 'Copy ID')) + '</button>'
                + '</div>'
                + '<code class="ev-hold-id">' + esc(id) + '</code>'
                + '</div></article>'
            );
        }).join('');
        if (folderHint) {
            html += '<p class="hint ev-holds-folder">' + esc(tr(
                'evidenceHub.holdsFolderHint',
                'Server folder (IT): {folder}',
                { folder: folderHint }
            )) + '</p>';
        }
        grid.innerHTML = html;
    }

    async function loadList(force) {
        bindUi();
        var grid = document.getElementById('ev-holds-grid');
        var meta = document.getElementById('ev-holds-meta');
        if (!grid) return;
        if (!force && lastCount > 0 && grid.querySelector('.ev-hold-card')) return;
        grid.innerHTML = '<p class="hint">' + esc(tr('evidenceHub.loading', 'Loading…')) + '</p>';
        if (meta) meta.textContent = '';
        try {
            var res = await fetch('/api/analytics/fr/kept?limit=100', {
                credentials: 'same-origin',
                headers: { Accept: 'application/json' },
            });
            var data = await res.json().catch(function () { return {}; });
            if (res.status === 403) {
                renderEmpty(meta, grid, tr(
                    'evidenceHub.holdsNotLicensed',
                    'Face recognition is not licensed on this server.'
                ));
                return;
            }
            if (!res.ok || !data.ok) {
                renderEmpty(meta, grid, tr('evidenceHub.holdsLoadFail', 'Could not load investigation holds.'));
                return;
            }
            renderRows(Array.isArray(data.holds) ? data.holds : [], data.folderHint || '');
        } catch (_) {
            renderEmpty(meta, grid, tr('evidenceHub.holdsLoadFail', 'Could not load investigation holds.'));
        }
    }

    function onShow(opts) {
        opts = opts || {};
        loadList(!!opts.force);
    }

    global.FrKeptUi = {
        onShow: onShow,
        refresh: function () { return loadList(true); },
        bindUi: bindUi,
    };
}(window));
