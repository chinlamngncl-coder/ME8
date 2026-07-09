// mob-missed-activity-shell
// Header "Missed activity" bell + slide-in drawer. Read-only surface fed by the
// SOS ledger so an operator returning from a break instantly sees emergencies
// that fired while they were away. No PTT/SIP pipeline touched; polls a
// scoped, read-only endpoint (/api/missed-activity). Acknowledge stays in the
// SOS ledger flow (later MOB); clicking an item deep-links to Operations.
(function () {
    'use strict';

    var POLL_MS = 12000;
    var LAST_READ_KEY = 'ma-ptt-lastread';
    var els = {};
    var timer = null;
    var lastCount = -1;

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

    function tr(key, fallback) {
        try {
            if (typeof window.tr === 'function') {
                var v = window.tr(key);
                if (v && v !== key) return v;
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

    function escText(s) {
        var div = document.createElement('div');
        div.textContent = s == null ? '' : String(s);
        return div.innerHTML;
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
        // Banner click = engaged (not missed). Listens at document level so locked
        // ptt-rx.js does not need edits.
        document.addEventListener('click', function (e) {
            var banner = e.target.closest('#ptt-rx-banner, #ptt-rx-live-toast');
            if (!banner) return;
            var camId = banner.getAttribute('data-cam-id');
            if (camId) engagePtt(camId);
        }, true);
    }

    function openDrawer() {
        if (els.overlay) els.overlay.hidden = false;
        if (els.drawer) els.drawer.hidden = false;
        // Opening the drawer marks everything up to now as read (unread model).
        setLastRead(Date.now());
        refresh();
    }

    function closeDrawer() {
        if (els.overlay) els.overlay.hidden = true;
        if (els.drawer) els.drawer.hidden = true;
    }

    function gotoOps() {
        closeDrawer();
        var opsTab = document.getElementById('nav-tab-ops');
        if (opsTab) {
            try { opsTab.click(); } catch (e) { /* ignore */ }
        }
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
            empty.textContent = tr('missedActivity.empty', 'No missed activity. All clear.');
            els.list.appendChild(empty);
            return;
        }
        items.forEach(function (it) {
            var kind = it.kind || 'sos';
            var row = document.createElement('div');
            var cls = kind === 'fall' ? 'ma-fall' : (kind === 'ptt' ? 'ma-ptt' : 'ma-sos');
            row.className = 'ma-item ' + cls;
            var title, tag;
            if (kind === 'ptt') {
                title = tr('missedActivity.ptt', 'Missed PTT');
                tag = tr('missedActivity.pttTag', 'PTT');
            } else if (kind === 'fall') {
                title = tr('missedActivity.fall', 'Fall alert');
                tag = tr('missedActivity.fallTag', 'FALL');
            } else {
                title = tr('missedActivity.sos', 'SOS alert');
                tag = tr('missedActivity.sosTag', 'SOS');
            }
            var cam = it.camId ? escText(it.camId) : tr('missedActivity.unknownCam', 'Unknown device');
            var sub = cam + ' \u00b7 ' + escText(timeAgo(it.at));
            row.innerHTML =
                '<span class="ma-item-tag">' + escText(tag) + '</span>' +
                '<div class="ma-item-body">' +
                    '<div class="ma-item-title">' + escText(title) + '</div>' +
                    '<div class="ma-item-sub">' + sub + '</div>' +
                    (it.note ? '<div class="ma-item-sub">' + escText(it.note) + '</div>' : '') +
                '</div>';
            row.addEventListener('click', gotoOps);
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
                // Unread model: badge counts items newer than the last drawer open.
                var count = unreadCount(items);
                // Urgency pulse reserved for future high-priority items (e.g. missed
                // emergency call). SOS is intentionally NOT sourced here — the day-1
                // red distress banner already covers unacknowledged SOS across tabs.
                var hasAlert = items.some(function (it) { return it.urgent === true; });
                renderBadge(count, hasAlert);
                if (els.drawer && !els.drawer.hidden) renderList(items);
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
        els.close = document.getElementById('missed-activity-close');
        els.label = document.getElementById('missed-activity-label');
        if (!els.bell) return;
        if (els.label) els.label.textContent = tr('missedActivity.label', 'Missed');

        els.bell.addEventListener('click', function () {
            if (els.drawer && els.drawer.hidden) openDrawer();
            else closeDrawer();
        });
        if (els.close) els.close.addEventListener('click', closeDrawer);
        if (els.overlay) els.overlay.addEventListener('click', closeDrawer);
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && els.drawer && !els.drawer.hidden) closeDrawer();
        });

        bindPttEngageListeners();
        document.addEventListener('fm-missed-activity-changed', refresh);

        refresh();
        timer = setInterval(refresh, POLL_MS);
    }

    ready(start);
})();
