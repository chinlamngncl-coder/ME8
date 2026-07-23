/**
 * Evidence \u2192 Investigation holds (FR Keep packs from storage/fr-kept).
 * mob-fr-kept-evidence-ui + FR-HOLDS-DISPOSITION-STATUS-V1 + FR-HOLDS-CARD-ACTIONS-V1
 */
(function (global) {
    var bound = false;
    var lastCount = 0;
    var statusFilter = 'open';
    var pendingClearId = null;

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
        if (!iso) return '\u2014';
        try { return new Date(iso).toLocaleString(); } catch (_) { return String(iso); }
    }

    function scoreLabel(pct) {
        if (pct == null || pct === '') return '\u2014';
        var n = Number(pct);
        if (!isFinite(n)) return esc(pct);
        return Math.round(n) + '%';
    }

    function gpsLabel(row) {
        var lat = row.lat;
        var lon = row.lon;
        if (lat == null || lon == null || lat === '' || lon === '') return '\u2014';
        var a = Number(lat);
        var b = Number(lon);
        if (!isFinite(a) || !isFinite(b)) return '\u2014';
        return a.toFixed(5) + ', ' + b.toFixed(5);
    }

    function currentStatusFilter() {
        var sel = document.getElementById('ev-holds-status-filter');
        var v = sel ? String(sel.value || 'open').toLowerCase() : statusFilter;
        if (v === 'all' || v === 'open' || v === 'cleared' || v === 'discarded' || v === 'linked') return v;
        return 'open';
    }

    function statusLabel(status) {
        var s = String(status || 'open').toLowerCase();
        if (s === 'cleared') return tr('evidenceHub.holdsStatusCleared', 'Cleared');
        if (s === 'discarded') return tr('evidenceHub.holdsStatusDiscarded', 'Discarded');
        if (s === 'linked') return tr('evidenceHub.holdsStatusLinked', 'Linked');
        return tr('evidenceHub.holdsStatusOpen', 'Open');
    }

    function emptyMessageForFilter(filter) {
        if (filter === 'cleared') {
            return tr('evidenceHub.holdsEmptyCleared', 'No cleared holds in this view.');
        }
        if (filter === 'discarded') {
            return tr('evidenceHub.holdsEmptyDiscarded', 'No discarded holds in this view.');
        }
        if (filter === 'all') {
            return tr('evidenceHub.holdsEmptyAll', 'No investigation holds yet.');
        }
        return tr(
            'evidenceHub.holdsEmptyOpen',
            'No open holds. Use Keep on an FR snap or map pin to save one here.'
        );
    }

    function actionSep() {
        return '<span class="hint" aria-hidden="true"> \u00B7 </span>';
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
        var statusSel = document.getElementById('ev-holds-status-filter');
        if (statusSel) {
            statusSel.value = statusFilter;
            statusSel.addEventListener('change', function () {
                statusFilter = currentStatusFilter();
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
                    return;
                }
                var clearBtn = e.target.closest('[data-hold-clear]');
                if (clearBtn) {
                    openClearDialog(clearBtn.getAttribute('data-hold-clear') || '', clearBtn.getAttribute('data-hold-title') || '');
                    return;
                }
                var discardBtn = e.target.closest('[data-hold-discard]');
                if (discardBtn) {
                    discardHold(discardBtn.getAttribute('data-hold-discard') || '', discardBtn.getAttribute('data-hold-title') || '');
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
        var clearCancel = document.getElementById('ev-holds-clear-cancel');
        if (clearCancel) clearCancel.addEventListener('click', closeClearDialog);
        var clearSubmit = document.getElementById('ev-holds-clear-submit');
        if (clearSubmit) clearSubmit.addEventListener('click', submitClearDialog);
        var clearBackdrop = document.getElementById('ev-holds-clear-backdrop');
        if (clearBackdrop) {
            clearBackdrop.addEventListener('click', function (e) {
                if (e.target === clearBackdrop) closeClearDialog();
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

    function closeClearDialog() {
        pendingClearId = null;
        var dlg = document.getElementById('ev-holds-clear-backdrop');
        var err = document.getElementById('ev-holds-clear-error');
        var note = document.getElementById('ev-holds-clear-note');
        var reason = document.getElementById('ev-holds-clear-reason');
        if (dlg) dlg.hidden = true;
        if (err) { err.hidden = true; err.textContent = ''; }
        if (note) note.value = '';
        if (reason) reason.value = '';
    }

    function openClearDialog(id, title) {
        pendingClearId = id;
        var dlg = document.getElementById('ev-holds-clear-backdrop');
        var summary = document.getElementById('ev-holds-clear-summary');
        var err = document.getElementById('ev-holds-clear-error');
        if (summary) summary.textContent = title || id;
        if (err) { err.hidden = true; err.textContent = ''; }
        if (dlg) dlg.hidden = false;
    }

    async function postDisposition(id, body) {
        return fetch('/api/analytics/fr/kept/' + encodeURIComponent(id) + '/disposition', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(body || {}),
        });
    }

    async function submitClearDialog() {
        if (!pendingClearId) return;
        var reasonEl = document.getElementById('ev-holds-clear-reason');
        var noteEl = document.getElementById('ev-holds-clear-note');
        var errEl = document.getElementById('ev-holds-clear-error');
        var reason = reasonEl ? String(reasonEl.value || '').trim() : '';
        var note = noteEl ? String(noteEl.value || '').trim() : '';
        if (!reason) {
            if (errEl) {
                errEl.textContent = tr('evidenceHub.holdsClearReasonPick', 'Select\u2026');
                errEl.hidden = false;
            }
            return;
        }
        try {
            var res = await postDisposition(pendingClearId, { status: 'cleared', reason: reason, note: note });
            var data = await res.json().catch(function () { return {}; });
            if (!res.ok || !data.ok) {
                if (errEl) {
                    errEl.textContent = tr('evidenceHub.holdsDispositionFail', 'Could not update hold.');
                    errEl.hidden = false;
                }
                return;
            }
            closeClearDialog();
            loadList(true);
        } catch (_) {
            if (errEl) {
                errEl.textContent = tr('evidenceHub.holdsDispositionFail', 'Could not update hold.');
                errEl.hidden = false;
            }
        }
    }

    async function discardHold(id, title) {
        if (!id) return;
        var msg = tr(
            'evidenceHub.holdsDiscardConfirm',
            'Discard this hold? It will leave the Open list but stays on the server for audit.',
            { title: title || id }
        );
        if (!global.confirm(msg)) return;
        try {
            var res = await postDisposition(id, { status: 'discarded', reason: 'discarded' });
            var data = await res.json().catch(function () { return {}; });
            if (!res.ok || !data.ok) {
                global.alert(tr('evidenceHub.holdsDispositionFail', 'Could not update hold.'));
                return;
            }
            loadList(true);
        } catch (_) {
            global.alert(tr('evidenceHub.holdsDispositionFail', 'Could not update hold.'));
        }
    }

    function renderEmpty(metaEl, gridEl, msg) {
        if (metaEl) metaEl.textContent = '';
        if (gridEl) {
            gridEl.innerHTML = '<p class="hint ev-holds-empty">' + esc(msg) + '</p>';
        }
    }

    function renderRows(rows, folderHint, filter) {
        var grid = document.getElementById('ev-holds-grid');
        var meta = document.getElementById('ev-holds-meta');
        if (!grid) return;
        lastCount = rows.length;
        if (meta) {
            meta.textContent = tr('evidenceHub.holdsMeta', '{count} hold(s)', { count: rows.length });
        }
        if (!rows.length) {
            renderEmpty(meta, grid, emptyMessageForFilter(filter));
            return;
        }
        var html = rows.map(function (row) {
            var id = row.id || '';
            var thumb = row.thumbUrl || ('/api/analytics/fr/kept/' + encodeURIComponent(id) + '/jpg');
            var name = row.displayName || '\u2014';
            var cam = row.deviceLabel || row.camId || '\u2014';
            var title = (row.displayName ? row.displayName + ' \u00B7 ' : '') + (row.camId || id);
            var status = String(row.status || 'open').toLowerCase();
            var statusChip = '<span class="ev-hold-status ev-hold-status-' + esc(status) + '">' + esc(statusLabel(status)) + '</span>';
            var actions = ''
                + '<button type="button" class="btn btn-ghost btn-sm ev-hold-action-link" data-hold-open="' + esc(thumb) + '" data-hold-title="' + esc(title) + '">'
                + esc(tr('evidenceHub.holdsOpen', 'Open')) + '</button>'
                + actionSep()
                + '<button type="button" class="btn btn-ghost btn-sm ev-hold-action-link" data-hold-copy="' + esc(id) + '">'
                + esc(tr('evidenceHub.holdsCopyId', 'Copy ID')) + '</button>';
            if (status === 'open') {
                actions += actionSep()
                    + '<button type="button" class="btn btn-ghost btn-sm ev-hold-action-link" data-hold-clear="' + esc(id) + '" data-hold-title="' + esc(title) + '">'
                    + esc(tr('evidenceHub.holdsClear', 'Clear')) + '</button>'
                    + actionSep()
                    + '<button type="button" class="btn btn-ghost btn-sm ev-hold-action-link ev-hold-action-danger" data-hold-discard="' + esc(id) + '" data-hold-title="' + esc(title) + '">'
                    + esc(tr('evidenceHub.holdsDiscard', 'Discard')) + '</button>';
            }
            var dispositionLine = '';
            if (status !== 'open' && row.dispositionAt) {
                dispositionLine = '<div class="hint">' + esc(fmtTime(row.dispositionAt));
                if (row.dispositionReason) {
                    dispositionLine += ' \u00B7 ' + esc(row.dispositionReason.replace(/_/g, ' '));
                }
                dispositionLine += '</div>';
            }
            return (
                '<article class="ev-hold-card" data-hold-id="' + esc(id) + '">'
                + '<button type="button" class="ev-hold-thumb" data-hold-open="' + esc(thumb) + '" data-hold-title="' + esc(title) + '" title="' + esc(tr('evidenceHub.holdsOpen', 'Open')) + '">'
                + '<img src="' + esc(thumb) + '" alt="" loading="lazy">'
                + '</button>'
                + '<div class="ev-hold-body">'
                + '<div class="ev-hold-head"><div class="ev-hold-name">' + esc(name) + '</div>' + statusChip + '</div>'
                + '<div class="hint">' + esc(cam) + '</div>'
                + '<div class="hint">' + esc(fmtTime(row.keptAt || row.at)) + '</div>'
                + '<div class="hint">' + esc(tr('evidenceHub.holdsScore', 'Score')) + ': ' + scoreLabel(row.scorePct)
                + ' \u00B7 GPS: ' + esc(gpsLabel(row)) + '</div>'
                + dispositionLine
                + '<div class="ev-hold-actions">' + actions + '</div>'
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
        statusFilter = currentStatusFilter();
        if (!force && lastCount > 0 && grid.querySelector('.ev-hold-card')) return;
        grid.innerHTML = '<p class="hint">' + esc(tr('evidenceHub.loading', 'Loading\u2026')) + '</p>';
        if (meta) meta.textContent = '';
        try {
            var url = '/api/analytics/fr/kept?limit=100&status=' + encodeURIComponent(statusFilter);
            var res = await fetch(url, {
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
            renderRows(Array.isArray(data.holds) ? data.holds : [], data.folderHint || '', statusFilter);
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
