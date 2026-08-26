// mob-missed-activity-shell + mob-missed-item-detail
// Header "Alerts" bell + drawer. Click a row \u2192 detail panel (kind, device, time).
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

    /** Match i18n.js humanizeKey \u2014 treat that as missing translation, use fallback. */
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
        return (typeof fmtDateTime === 'function') ? fmtDateTime(iso) : String(iso || '\u2014');
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
        if (kind === 'wall_nudge') {
            return {
                title: tr('missedActivity.wallNudge', 'Operator Escalation'),
                tag: tr('missedActivity.wallNudgeTag', 'ESCALATE'),
                tagClass: 'is-wall-nudge',
                blurb: tr('missedActivity.wallNudgeDetail', 'Command Wall asked an admin to review this camera.'),
            };
        }
        return {
            title: tr('missedActivity.sos', 'SOS alert'),
            tag: tr('missedActivity.sosTag', 'SOS'),
            tagClass: 'is-sos',
            blurb: tr('missedActivity.sosDetail', 'SOS recorded while you were away.'),
        };
    }

    function isWallViewActive() {
        try {
            var cw = document.getElementById('app-view-command-wall');
            if (!cw || cw.hidden) return false;
            if (cw.getAttribute('aria-hidden') === 'true') return false;
            var st = window.getComputedStyle(cw);
            if (st && (st.display === 'none' || st.visibility === 'hidden')) return false;
            return true;
        } catch (e) { return false; }
    }

    function wallNudgeMatchLabel(it) {
        var src = String((it && it.source) || '').toLowerCase();
        if (src === 'anpr_list' || src.indexOf('anpr') === 0) {
            return tr('missedActivity.wallNudgeAnpr', 'ANPR Match');
        }
        if (src === 'fr_blacklist' || src.indexOf('fr') === 0) {
            return tr('missedActivity.wallNudgeWatchlist', 'Watchlist Match');
        }
        if (src === 'bwc_sos' || src.indexOf('sos') >= 0) {
            return tr('missedActivity.wallNudgeSos', 'SOS');
        }
        if (src.indexOf('vms') === 0) {
            return tr('missedActivity.wallNudgeVms', 'Camera Alarm');
        }
        return tr('missedActivity.wallNudgeGeneric', 'Wall Alert');
    }

    function wallNudgeSubtext(it) {
        var op = (it && it.nudgedBy) ? String(it.nudgedBy) : tr('missedActivity.wallOperator', 'Operator');
        return op + ' \u00b7 ' + wallNudgeMatchLabel(it) + ' \u00b7 ' + timeAgo(it && it.at);
    }

    function markItemRead() {
        setLastRead(Date.now());
        renderBadge(unreadCount(lastItems), lastItems.some(function (row) { return row.urgent === true; }));
    }

    function onWallNudgeClick(it) {
        var camId = it && it.camId ? String(it.camId) : '';
        markItemRead();
        closeDrawer();
        if (!camId) return;
        if (isWallViewActive() && window.CommandWall && typeof window.CommandWall.focusNudgeCam === 'function') {
            try { window.CommandWall.focusNudgeCam(camId); } catch (e) { /* ignore */ }
            return;
        }
        gotoOpsWithCamLive(camId);
    }

    function focusWallNudgeCam(camId) {
        onWallNudgeClick({ camId: camId });
    }

    function gotoOpsWithCamLive(camId) {
        var opsTab = document.getElementById('nav-tab-ops');
        if (opsTab) {
            try { opsTab.click(); } catch (e) { /* ignore */ }
        }
        if (!camId) return;
        setTimeout(function () {
            try {
                if (typeof window.selectFleetDevice === 'function') {
                    window.selectFleetDevice(camId, { pttCommPin: false });
                }
            } catch (e) { /* ignore */ }
        }, 200);
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
            '<span class="ma-detail-tag ' + escText(meta.tagClass) + '">' +
                escText((typeof UiFormatter !== 'undefined' && UiFormatter.formatEventTag)
                    ? UiFormatter.formatEventTag(meta.tag) : meta.tag) + '</span>' +
            '<h4 class="ma-detail-title">' + escText(meta.title) + '</h4>' +
            '<p class="ma-item-sub" style="margin:0">' + escText(meta.blurb) + '</p>' +
            '<dl class="ma-detail-dl">' +
                '<dt>' + escText(tr('missedActivity.fieldDevice', 'Device')) + '</dt>' +
                '<dd>' + escText(label) + '</dd>' +
                '<dt>' + escText(tr('missedActivity.fieldCamId', 'Camera ID')) + '</dt>' +
                '<dd>' + escText(camId || '\u2014') + '</dd>' +
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
                    escText(kind === 'wall_nudge'
                        ? tr('missedActivity.openFocus', 'Open Camera')
                        : tr('missedActivity.openOps', 'Open on Operations')) +
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
            if (kind === 'wall_nudge') focusWallNudgeCam(camId);
            else gotoOpsWithCam(camId);
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
            var cls = kind === 'fall' ? 'ma-fall'
                : (kind === 'ptt' ? 'ma-ptt'
                : (kind === 'wall_nudge' ? 'ma-wall-nudge' : 'ma-sos'));
            row.className = 'ma-item ' + cls;
            var meta = kindMeta(kind);
            var cam = it.camId ? escText(deviceLabel(it.camId)) : escText(tr('missedActivity.unknownCam', 'Unknown device'));
            var sub = kind === 'wall_nudge'
                ? escText(wallNudgeSubtext(it))
                : (cam + ' \u00b7 ' + escText(timeAgo(it.at)));
            row.innerHTML =
                '<span class="ma-item-tag">' + escText((typeof UiFormatter !== 'undefined' && UiFormatter.formatEventTag)
                    ? UiFormatter.formatEventTag(meta.tag) : meta.tag) + '</span>' +
                '<div class="ma-item-body">' +
                    '<div class="ma-item-title">' + escText(meta.title) + '</div>' +
                    '<div class="ma-item-sub">' + sub + '</div>' +
                    (it.note ? '<div class="ma-item-sub">' + escText(it.note) + '</div>' : '') +
                '</div>';
            row.addEventListener('click', function () {
                if (kind === 'wall_nudge') onWallNudgeClick(it);
                else openDetail(it);
            });
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
            .catch(function () { /* offline / transient \u2014 keep last state */ });
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
