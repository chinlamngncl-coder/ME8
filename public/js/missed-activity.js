// mob-missed-activity-shell + mob-missed-item-detail
// Header "Alerts" bell + drawer. Click a row → detail panel (kind, device, time).
// Go to Operations selects the device when possible. No PTT/SIP pipeline edits.
// mob-missed-bell-copy: never show humanizeKey "Label" from old missedActivity.label key.
(function () {
    'use strict';

    var POLL_MS = 12000;
    var LAST_READ_KEY = 'ma-ptt-lastread';
    var els = {};
    var timer = null;
    var lastCount = -1;
    var lastItems = [];
    var detailItem = null;

    function getLastRead() {
        try {
            var v = parseInt(window.localStorage.getItem(LAST_READ_KEY), 10);
            return isNaN(v) ? 0 : v;
        } catch (e) { return 0; }
    }

    function setLastRead(ts) {
        try { window.localStorage.setItem(LAST_READ_KEY, String(ts)); } catch (e) { /* ignore */ }
    }

    function unreadCount(items) {
        var lastRead = getLastRead();
        var n = 0;
        (items || []).forEach(function (it) {
            var t = new Date(it.at).getTime();
            if (!isNaN(t) && t > lastRead) n++;
        });
        return n;
    }

    /** Match i18n.js humanizeKey — treat that as missing translation, use fallback. */
    function humanizeKeyTail(key) {
        var tail = String(key || '').split('.').pop() || String(key || '');
        return tail
            .replace(/([A-Z])/g, ' $1')
            .replace(/_/g, ' ')
            .replace(/^./, function (c) { return c.toUpperCase(); })
            .trim();
    }

    function tr(key, fallback) {
        try {
            function accept(v) {
                if (!v || v === key) return false;
                if (v === humanizeKeyTail(key)) return false;
                return true;
            }
            if (typeof window.tr === 'function') {
                var v = window.tr(key);
                if (accept(v)) return v;
            }
            if (typeof I18n !== 'undefined' && I18n.t) {
                var s = I18n.t(key);
                if (accept(s)) return s;
            }
        } catch (e) { /* ignore */ }
        return fallback;
    }

    function ready(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn);
        } else {
            fn();
        }
    }

    function timeAgo(iso) {
        if (!iso) return '';
        var t = new Date(iso).getTime();
        if (isNaN(t)) return '';
        var diff = Math.max(0, Date.now() - t);
        var m = Math.floor(diff / 60000);
        if (m < 1) return tr('missedActivity.justNow', 'just now');
        if (m < 60) return m + tr('missedActivity.minShort', 'm') + ' ' + tr('missedActivity.ago', 'ago');
        var h = Math.floor(m / 60);
        if (h < 24) return h + tr('missedActivity.hrShort', 'h') + ' ' + tr('missedActivity.ago', 'ago');
        var d = Math.floor(h / 24);
        return d + tr('missedActivity.dayShort', 'd') + ' ' + tr('missedActivity.ago', 'ago');
    }

    function formatWhen(iso) {
        if (!iso) return '—';
        var d = new Date(iso);
        if (isNaN(d.getTime())) return String(iso);
        try {
            return d.toLocaleString();
        } catch (e) {
            return d.toISOString();
        }
    }

    function escText(s) {
        var div = document.createElement('div');
        div.textContent = s == null ? '' : String(s);
        return div.innerHTML;
    }

    function deviceLabel(camId) {
        if (!camId) return tr('missedActivity.unknownCam', 'Unknown device');
        try {
            if (typeof FleetDisplay !== 'undefined' && FleetDisplay.friendlyDeviceName) {
                var n = FleetDisplay.friendlyDeviceName(camId);
                if (n) return String(n);
            }
        } catch (e) { /* ignore */ }
        return String(camId);
    }

    function kindMeta(kind) {
        if (kind === 'ptt') {
            return {
                title: tr('missedActivity.ptt', 'Missed PTT'),
                tag: tr('missedActivity.pttTag', 'PTT'),
                tagClass: '',
                blurb: tr('missedActivity.pttDetail', 'Field PTT ended before an operator opened Alerts.'),
            };
        }
        if (kind === 'fall') {
            return {
                title: tr('missedActivity.fall', 'Fall alert'),
                tag: tr('missedActivity.fallTag', 'FALL'),
                tagClass: 'is-fall',
                blurb: tr('missedActivity.fallDetail', 'Fall alert recorded while you were away.'),
            };
        }
        return {
            title: tr('missedActivity.sos', 'SOS alert'),
            tag: tr('missedActivity.sosTag', 'SOS'),
            tagClass: 'is-sos',
            blurb: tr('missedActivity.sosDetail', 'SOS recorded while you were away.'),
        };
    }

    function engagePtt(camId) {
        if (!camId) return;
        fetch('/api/missed-activity/ptt/engage', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ camId: String(camId) }),
        }).then(function () { refresh(); }).catch(function () { /* ignore */ });
    }

    function bindPttEngageListeners() {
        document.addEventListener('click', function (e) {
            var banner = e.target.closest('#ptt-rx-banner, #ptt-rx-live-toast');
            if (!banner) return;
            var camId = banner.getAttribute('data-cam-id');
            if (camId) engagePtt(camId);
        }, true);
    }

    function showListView() {
        detailItem = null;
        if (els.list) els.list.hidden = false;
        if (els.detail) {
            els.detail.hidden = true;
            els.detail.innerHTML = '';
        }
        if (els.heading) els.heading.textContent = tr('missedActivity.title', 'Alerts');
    }

    function openDrawer() {
        if (els.overlay) els.overlay.hidden = false;
        if (els.drawer) els.drawer.hidden = false;
        showListView();
        setLastRead(Date.now());
        refresh();
    }

    function closeDrawer() {
        showListView();
        if (els.overlay) els.overlay.hidden = true;
        if (els.drawer) els.drawer.hidden = true;
    }

    function gotoOpsWithCam(camId) {
        closeDrawer();
        var opsTab = document.getElementById('nav-tab-ops');
        if (opsTab) {
            try { opsTab.click(); } catch (e) { /* ignore */ }
        }
        if (!camId) return;
        setTimeout(function () {
            try {
                if (typeof window.selectFleetDevice === 'function') {
                    window.selectFleetDevice(camId, { skipVideo: true, pttCommPin: true });
                }
            } catch (e) { /* ignore */ }
        }, 80);
    }

    function openDetail(it) {
        if (!els.detail || !it) return;
        detailItem = it;
        var kind = it.kind || 'ptt';
        var meta = kindMeta(kind);
        var camId = it.camId ? String(it.camId) : '';
        var label = deviceLabel(camId);
        if (els.list) els.list.hidden = true;
        els.detail.hidden = false;
        if (els.heading) els.heading.textContent = tr('missedActivity.detailTitle', 'Alert detail');
        els.detail.innerHTML =
            '<button type="button" class="ma-detail-back" id="ma-detail-back">← ' +
                escText(tr('missedActivity.back', 'Back to list')) + '</button>' +
            '<span class="ma-detail-tag ' + escText(meta.tagClass) + '">' + escText(meta.tag) + '</span>' +
            '<h4 class="ma-detail-title">' + escText(meta.title) + '</h4>' +
            '<p class="ma-item-sub" style="margin:0">' + escText(meta.blurb) + '</p>' +
            '<dl class="ma-detail-dl">' +
                '<dt>' + escText(tr('missedActivity.fieldDevice', 'Device')) + '</dt>' +
                '<dd>' + escText(label) + '</dd>' +
                '<dt>' + escText(tr('missedActivity.fieldCamId', 'Camera ID')) + '</dt>' +
                '<dd>' + escText(camId || '—') + '</dd>' +
                '<dt>' + escText(tr('missedActivity.fieldWhen', 'When')) + '</dt>' +
                '<dd>' + escText(formatWhen(it.at)) +
                    (it.at ? ' <span class="ma-item-sub">(' + escText(timeAgo(it.at)) + ')</span>' : '') +
                '</dd>' +
                (it.note
                    ? ('<dt>' + escText(tr('missedActivity.fieldNote', 'Note')) + '</dt><dd>' + escText(it.note) + '</dd>')
                    : '') +
            '</dl>' +
            '<div class="ma-detail-actions">' +
                '<button type="button" class="btn btn-action" id="ma-detail-ops">' +
                    escText(tr('missedActivity.openOps', 'Open on Operations')) +
                '</button>' +
                '<button type="button" class="btn btn-ghost" id="ma-detail-close-detail">' +
                    escText(tr('missedActivity.closeDetail', 'Close detail')) +
                '</button>' +
            '</div>';
        var back = document.getElementById('ma-detail-back');
        var ops = document.getElementById('ma-detail-ops');
        var closeDet = document.getElementById('ma-detail-close-detail');
        if (back) back.addEventListener('click', function () {
            showListView();
            renderList(lastItems);
        });
        if (ops) ops.addEventListener('click', function () {
            gotoOpsWithCam(camId);
        });
        if (closeDet) closeDet.addEventListener('click', function () {
            showListView();
            renderList(lastItems);
        });
    }

    function renderBadge(count, hasAlert) {
        if (els.bell) els.bell.hidden = false;
        if (els.badge) {
            els.badge.hidden = count <= 0;
            els.badge.textContent = count > 99 ? '99+' : String(count);
        }
        if (els.bell) {
            if (hasAlert) els.bell.classList.add('has-alert');
            else els.bell.classList.remove('has-alert');
        }
    }

    function renderList(items) {
        if (!els.list) return;
        els.list.innerHTML = '';
        if (!items || !items.length) {
            var empty = document.createElement('div');
            empty.className = 'ma-empty';
            empty.textContent = tr('missedActivity.empty', 'No alerts. All clear.');
            els.list.appendChild(empty);
            return;
        }
        items.forEach(function (it) {
            var kind = it.kind || 'sos';
            var row = document.createElement('div');
            var cls = kind === 'fall' ? 'ma-fall' : (kind === 'ptt' ? 'ma-ptt' : 'ma-sos');
            row.className = 'ma-item ' + cls;
            var meta = kindMeta(kind);
            var cam = it.camId ? escText(deviceLabel(it.camId)) : escText(tr('missedActivity.unknownCam', 'Unknown device'));
            var sub = cam + ' \u00b7 ' + escText(timeAgo(it.at));
            row.innerHTML =
                '<span class="ma-item-tag">' + escText(meta.tag) + '</span>' +
                '<div class="ma-item-body">' +
                    '<div class="ma-item-title">' + escText(meta.title) + '</div>' +
                    '<div class="ma-item-sub">' + sub + '</div>' +
                    (it.note ? '<div class="ma-item-sub">' + escText(it.note) + '</div>' : '') +
                '</div>';
            row.addEventListener('click', function () { openDetail(it); });
            els.list.appendChild(row);
        });
    }

    function refresh() {
        fetch('/api/missed-activity', { credentials: 'same-origin', headers: { 'Accept': 'application/json' } })
            .then(function (r) {
                if (r.status === 401 || r.status === 403) return null;
                return r.json();
            })
            .then(function (data) {
                if (!data || !data.ok) return;
                var items = data.items || [];
                lastItems = items;
                var count = unreadCount(items);
                var hasAlert = items.some(function (it) { return it.urgent === true; });
                renderBadge(count, hasAlert);
                if (els.drawer && !els.drawer.hidden && !detailItem) renderList(items);
                lastCount = count;
            })
            .catch(function () { /* offline / transient — keep last state */ });
    }

    function start() {
        els.bell = document.getElementById('missed-activity-bell');
        els.badge = document.getElementById('missed-activity-badge');
        els.drawer = document.getElementById('missed-activity-drawer');
        els.overlay = document.getElementById('missed-activity-overlay');
        els.list = document.getElementById('missed-activity-list');
        els.detail = document.getElementById('missed-activity-detail');
        els.close = document.getElementById('missed-activity-close');
        els.label = document.getElementById('missed-activity-label');
        els.heading = document.getElementById('missed-activity-heading');
        if (!els.bell) return;
        if (els.label) els.label.textContent = tr('missedActivity.bellText', 'Alerts');

        els.bell.addEventListener('click', function () {
            if (els.drawer && els.drawer.hidden) openDrawer();
            else closeDrawer();
        });
        if (els.close) els.close.addEventListener('click', closeDrawer);
        if (els.overlay) els.overlay.addEventListener('click', closeDrawer);
        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape' || !els.drawer || els.drawer.hidden) return;
            if (detailItem) {
                showListView();
                renderList(lastItems);
                return;
            }
            closeDrawer();
        });

        bindPttEngageListeners();
        document.addEventListener('fm-missed-activity-changed', refresh);

        refresh();
        timer = setInterval(refresh, POLL_MS);
    }

    ready(start);
})();
