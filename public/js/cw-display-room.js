/**

 * Command Wall — Display Room presets (multi-monitor SOS ops layout).

 * Isolated launcher only; does not change SOS / live wall / map engines.

 */

(function (global) {

    const POPOUT_FEATURES = 'width=1920,height=1080,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes';

    const tracked = Object.create(null);

    let groupsLoaded = false;

    let monitor3Profile = 'map';

    let capSocket = null;



    function tr(key, params) {

        if (global.I18n && I18n.t) return I18n.t(key, params);

        return key;

    }



    function esc(s) {

        return String(s == null ? '' : s)

            .replace(/&/g, '&amp;')

            .replace(/</g, '&lt;')

            .replace(/"/g, '&quot;');

    }



    function el(suffix) {

        return document.getElementById('cw-' + suffix) || document.getElementById(suffix);

    }



    function needsNavigate(win, url) {
        try {
            if (!win || !win.location) return false;
            const path = win.location.pathname || '';
            // Already on Command Wall — never reload (reload = blink + stuck Loading roster).
            if (path === '/command-wall.html') return false;
            if (path === '/' || path === '/index.html' || path.indexOf('/login') === 0) return true;
            const want = new URL(url, window.location.origin);
            return path !== want.pathname;
        } catch (_) {
            // about:blank / not readable yet — window.open already has the URL; do not assign again.
            return false;
        }
    }

    function openWindow(url, winName) {
        let win = tracked[winName];
        if (win && !win.closed) {
            try {
                if (needsNavigate(win, url)) win.location.href = url;
                try { win.focus(); } catch (_) { /* ignore */ }
                return win;
            } catch (_) {
                tracked[winName] = null;
            }
        }
        win = window.open(url, winName, POPOUT_FEATURES);
        if (win) tracked[winName] = win;
        // Do not set location.href after open — aborts first navigation and causes blink loop.
        try { if (win) win.focus(); } catch (_) { /* ignore */ }
        return win;
    }



    function pickLayoutForCount(n) {

        if (n <= 1) return '1';

        if (n <= 4) return '4';

        if (n <= 9) return '9';

        return '16';

    }



    function selectedGroupIds() {

        const root = el('dr-groups');

        if (!root) return [];

        const ids = [];

        root.querySelectorAll('input[type="checkbox"][data-group-id]:checked').forEach(function (cb) {

            if (cb.dataset.groupId) ids.push(cb.dataset.groupId);

        });

        return ids;

    }



    function countOnlineInGroups(groupIds, groups) {

        const idSet = new Set(groupIds);

        let n = 0;

        (groups || []).forEach(function (g) {

            if (!idSet.has(g.id)) return;

            (g.members || []).forEach(function (m) {

                if (m.deviceId && m.online) n += 1;

            });

        });

        return n;

    }



    function buildWallUrl(groupIds, layout) {

        const params = new URLSearchParams();

        if (groupIds.length) params.set('groups', groupIds.join(','));

        params.set('autofill', '1');

        params.set('layout', layout || '16');

        params.set('panel', 'live');

        return '/command-wall.html?' + params.toString();

    }



    function openCommandWallPopout(url, winName) {
        // Fresh unique name each time — named reuse caused blink / reload / repeat INVITE storms.
        const target = url || '/command-wall.html?panel=live';
        const name = winName === '_blank' || !winName
            ? ('mobility-wall-' + String(Date.now()))
            : winName;
        return openWindow(target, name);
    }

    function openMapPopout() {
        // Always main app map URL — never command-wall.html?popout=map (broken if opened from CW Control room).
        const url = '/?popout=map';
        const win = openWindow(url, 'mobility-map-' + String(Date.now()));
        if (global.MapPopoutSync) {
            setTimeout(function () { MapPopoutSync.publishDebounced(); }, 600);
            setTimeout(function () { MapPopoutSync.publish(); }, 1500);
        }
        return win;
    }

    function openAnalyticsPopout() {
        return openWindow('/?popout=analytics', 'mobility-analytics-' + String(Date.now()));
    }

    function normalizeMonitor3Profile(raw) {
        const v = String(raw || '').trim().toLowerCase();
        return v === 'analytics' ? 'analytics' : 'map';
    }

    function monitor3I18nKeys(profile) {
        if (profile === 'analytics') {
            return {
                title: 'displayRoom.monitor3TitleAnalytics',
                hint: 'displayRoom.monitor3HintAnalytics',
                button: 'displayRoom.openAnalytics',
                popupOk: 'displayRoom.popupOpenedAnalytics',
            };
        }
        return {
            title: 'displayRoom.monitor3Title',
            hint: 'displayRoom.monitor3Hint',
            button: 'displayRoom.openMap',
            popupOk: 'displayRoom.popupOpenedMap',
        };
    }

    function syncMonitor3Card(profile) {
        const btn = el('dr-open-map');
        if (!btn) return;
        const card = btn.closest('.dr-monitor-card');
        if (!card) return;
        const keys = monitor3I18nKeys(profile);
        const titleEl = card.querySelector('.dr-monitor-title');
        const hintEl = card.querySelector('.dr-monitor-hint');
        if (titleEl) {
            titleEl.setAttribute('data-dr-dynamic', '1');
            titleEl.setAttribute('data-i18n', keys.title);
            titleEl.textContent = tr(keys.title);
        }
        if (hintEl) {
            hintEl.setAttribute('data-dr-dynamic', '1');
            hintEl.setAttribute('data-i18n', keys.hint);
            hintEl.textContent = tr(keys.hint);
        }
        btn.setAttribute('data-dr-dynamic', '1');
        btn.setAttribute('data-i18n', keys.button);
        btn.textContent = tr(keys.button);
    }

    function applyDisplayMonitor3Profile(data) {
        monitor3Profile = normalizeMonitor3Profile(data && data.displayMonitor3);
        syncMonitor3Card(monitor3Profile);
    }

    function onServerCapabilities(data) {
        global.__fmServerCapabilities = data || null;
        applyDisplayMonitor3Profile(data);
    }

    function bindCapabilitiesSocket() {
        const existing = global.__mobilityDashboardSocket;
        if (existing && !existing.__cwDisplayRoomCapBound) {
            existing.__cwDisplayRoomCapBound = true;
            existing.on('server-capabilities', onServerCapabilities);
        }
        if (!existing && typeof global.io === 'function' && !capSocket) {
            capSocket = global.io({ withCredentials: true });
            capSocket.on('server-capabilities', onServerCapabilities);
        }
    }

    function fetchDisplayMonitor3Profile() {
        return fetch('/api/health', { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (j) {
                if (j && j.displayMonitor3) {
                    applyDisplayMonitor3Profile({ displayMonitor3: j.displayMonitor3 });
                    return;
                }
                return fetch('/api/display-room/profile', { credentials: 'same-origin' })
                    .then(function (r2) { return r2.json(); })
                    .then(function (j2) {
                        if (j2 && j2.ok) applyDisplayMonitor3Profile(j2);
                    });
            })
            .catch(function () { /* keep current profile */ });
    }

    function syncDisplayMonitor3Profile() {
        if (global.__fmServerCapabilities && global.__fmServerCapabilities.displayMonitor3) {
            applyDisplayMonitor3Profile(global.__fmServerCapabilities);
        }
        bindCapabilitiesSocket();
        return fetchDisplayMonitor3Profile();
    }

    function openMonitor3Popout() {
        if (monitor3Profile === 'analytics') return openAnalyticsPopout();
        return openMapPopout();
    }

    function openCentreSummaryPopout() {
        return openWindow('/command-centre.html', 'mobility-centre-' + String(Date.now()));
    }



    function goOperationsTab() {

        if (global.EvidenceManager && EvidenceManager.showTab) {

            EvidenceManager.showTab('ops');

            return true;

        }

        if (window.location.pathname === '/' || window.location.pathname.endsWith('index.html')) {

            window.location.hash = 'ops';

        }

        return false;

    }



    function setStatus(msg, ok) {

        const node = el('dr-status');

        if (!node) return;

        node.textContent = msg || '';

        let cls = 'dr-status';

        if (ok === false) cls += ' dr-status-err dr-status-banner';

        else if (ok === true) cls += ' dr-status-ok dr-status-banner';

        node.className = cls;

        node.setAttribute('role', ok === false ? 'alert' : 'status');

        node.setAttribute('aria-live', ok === false ? 'assertive' : 'polite');

    }



    function scrollStatusIntoView() {

        const node = el('dr-status');

        if (!node || !node.scrollIntoView) return;

        try {

            node.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

        } catch (_) {

            node.scrollIntoView(false);

        }

    }



    const statusWatchTimers = [];

    function clearStatusWatchers() {
        while (statusWatchTimers.length) {
            clearInterval(statusWatchTimers.pop());
        }
    }

    function watchPopoutClosed(win) {
        if (!win) return;
        const timer = setInterval(function () {
            try {
                if (!win.closed) return;
            } catch (_) {
                /* treat as closed */
            }
            clearInterval(timer);
            const idx = statusWatchTimers.indexOf(timer);
            if (idx >= 0) statusWatchTimers.splice(idx, 1);
            setStatus('', null);
        }, 400);
        statusWatchTimers.push(timer);
    }

    function placeFailMessage(reason, monitorTitleKey) {
        const monitor = tr(monitorTitleKey);
        if (reason === 'no_api') return tr('displayRoom.placeFailNoApi', { monitor: monitor });
        if (reason === 'denied') return tr('displayRoom.placeFailDenied', { monitor: monitor });
        if (reason === 'no_screen') return tr('displayRoom.placeFailNoScreen', { monitor: monitor });
        if (reason === 'closed') return tr('displayRoom.placeFailClosed', { monitor: monitor });
        return tr('displayRoom.placeFailManual', { monitor: monitor });
    }

    function openWithFeedback(openFn, successKey, monitorTitleKey, screenIndex) {
        const win = openFn();
        if (!win) {
            setStatus(tr('displayRoom.popupBlocked', { list: tr(monitorTitleKey) }), false);
            scrollStatusIntoView();
            return Promise.resolve(null);
        }

        function finishOpenedOnly() {
            setStatus(tr(successKey), true);
            scrollStatusIntoView();
            try { win.focus(); } catch (_) {}
            watchPopoutClosed(win);
        }

        function finishPlacedOk() {
            setStatus(tr('displayRoom.popupOpenedPlaced', { monitor: tr(monitorTitleKey) }), true);
            scrollStatusIntoView();
            try { win.focus(); } catch (_) {}
            watchPopoutClosed(win);
        }

        function finishPlaceFailed(reason) {
            // Amber/false — never leave sticky green "opened" when place was requested and failed.
            setStatus(placeFailMessage(reason, monitorTitleKey), false);
            scrollStatusIntoView();
            try { win.focus(); } catch (_) {}
            watchPopoutClosed(win);
        }

        if (typeof screenIndex === 'number' && screenIndex >= 1 && autoPlaceChecked()) {
            return placeOnScreen(win, screenIndex).then(function (result) {
                if (result && result.ok) finishPlacedOk();
                else finishPlaceFailed(result && result.reason ? result.reason : 'move_failed');
                return win;
            });
        }

        finishOpenedOnly();
        return Promise.resolve(win);
    }

    function autoPlaceChecked() {
        const box = el('dr-auto-screens');
        return !!(box && box.checked);
    }

    function waitPopoutSettled(win) {
        return new Promise(function (resolve) {
            let done = false;
            function finish() {
                if (done) return;
                done = true;
                resolve();
            }
            try {
                if (win.document && win.document.readyState === 'complete') {
                    setTimeout(finish, 80);
                    return;
                }
            } catch (_) { /* ignore */ }
            try {
                win.addEventListener('load', function () { setTimeout(finish, 120); });
            } catch (_) { /* ignore */ }
            setTimeout(finish, 1500);
        });
    }

    /** @returns {Promise<{ok:boolean, reason?:string}>} */
    async function placeOnScreen(win, screenIndex) {
        if (!win || win.closed) return { ok: false, reason: 'closed' };
        if (screenIndex < 1) return { ok: false, reason: 'no_screen' };

        await waitPopoutSettled(win);
        if (win.closed) return { ok: false, reason: 'closed' };

        if (!('getScreenDetails' in window)) {
            return { ok: false, reason: 'no_api' };
        }

        let details;
        try {
            details = await window.getScreenDetails();
        } catch (_) {
            // Permission denied or transient activation failure — not a silent green success.
            return { ok: false, reason: 'denied' };
        }

        const screens = (details && details.screens) || [];
        if (screenIndex >= screens.length) {
            return { ok: false, reason: 'no_screen' };
        }

        const s = screens[screenIndex];
        if (!s) return { ok: false, reason: 'no_screen' };

        try {
            win.moveTo(s.availLeft, s.availTop);
            win.resizeTo(s.availWidth, s.availHeight);
            return { ok: true };
        } catch (_) {
            return { ok: false, reason: 'move_failed' };
        }
    }

    async function placeDisplayWindows(wallWin, mapWin, centreWin) {
        if (!autoPlaceChecked()) return { placed: 0, api: true, attempted: false };

        if (!('getScreenDetails' in window)) {
            return { placed: 0, api: false, attempted: true, reason: 'no_api' };
        }

        let placed = 0;
        let lastFail = null;
        const jobs = [
            { win: wallWin, idx: 1 },
            { win: mapWin, idx: 2 },
            { win: centreWin, idx: 3 },
        ];
        for (let i = 0; i < jobs.length; i += 1) {
            const job = jobs[i];
            if (!job.win) continue;
            const result = await placeOnScreen(job.win, job.idx);
            if (result && result.ok) placed += 1;
            else if (result && result.reason) lastFail = result.reason;
        }
        return { placed: placed, api: true, attempted: true, reason: lastFail };
    }



    function renderGroups(groups) {

        const root = el('dr-groups');

        if (!root) return;

        if (!groups || !groups.length) {

            root.innerHTML = '<p class="dr-groups-empty">' + esc(tr('displayRoom.noGroups')) + '</p>';

            return;

        }

        root.innerHTML = groups.map(function (g) {

            const online = (g.members || []).filter(function (m) { return m.online; }).length;

            const total = (g.members || []).length;

            return '<label class="dr-group-check">'

                + '<input type="checkbox" data-group-id="' + esc(g.id) + '" checked>'

                + '<span class="dr-group-dot" style="background:' + esc(g.color || '#64748b') + '"></span>'

                + '<span class="dr-group-name">' + esc(g.name || g.id) + '</span>'

                + '<span class="dr-group-meta">' + online + '/' + total + '</span>'

                + '</label>';

        }).join('');

        groupsLoaded = true;

    }



    async function loadGroups() {

        if (groupsLoaded) return;

        try {

            const res = await fetch('/api/dispatch-groups', { credentials: 'same-origin' });

            const data = await res.json();

            if (!res.ok || !data.ok) throw new Error((data && data.error) || 'Failed');

            renderGroups(data.groups || []);

        } catch (_) {

            const root = el('dr-groups');

            if (root) root.innerHTML = '<p class="dr-groups-empty">—</p>';

        }

    }



    async function applySosRoomPreset() {
        // Same as Monitor 2 + 3 + 4 — convenience open only. No autofill, no auto INVITE, no layout-1 shrink.
        await fetchDisplayMonitor3Profile();
        setStatus(tr('displayRoom.launching'), true);
        goOperationsTab();

        const blocked = [];
        const m3Keys = monitor3I18nKeys(monitor3Profile);
        const cw = openCommandWallPopout('/command-wall.html?panel=live', '_blank');
        const map = openMonitor3Popout();
        const centre = openCentreSummaryPopout();

        if (!cw) blocked.push(tr('displayRoom.monitor2Title'));
        if (!map) blocked.push(tr(m3Keys.title));
        if (!centre) blocked.push(tr('displayRoom.monitor4Title'));

        if (blocked.length) {
            setStatus(tr('displayRoom.popupBlocked', { list: blocked.join(', ') }), false);
            scrollStatusIntoView();
            return;
        }

        const place = await placeDisplayWindows(cw, map, centre);

        if (place.attempted && !place.api) {
            setStatus(tr('displayRoom.placeFailNoApiLaunch'), false);
            scrollStatusIntoView();
            watchPopoutClosed(cw);
            watchPopoutClosed(map);
            watchPopoutClosed(centre);
            return;
        }

        if (place.attempted && place.placed === 0) {
            setStatus(placeFailMessage(place.reason || 'move_failed', 'displayRoom.monitor2Title'), false);
            scrollStatusIntoView();
            watchPopoutClosed(cw);
            watchPopoutClosed(map);
            watchPopoutClosed(centre);
            return;
        }

        if (place.placed > 0) {
            setStatus(tr('displayRoom.launchOkPlaced', { n: String(place.placed) }), true);
        } else {
            setStatus(tr('displayRoom.launchOkManual'), true);
        }

        scrollStatusIntoView();
        watchPopoutClosed(cw);
        watchPopoutClosed(map);
        watchPopoutClosed(centre);
    }



    function bindUi() {
        if (window._cwDisplayRoomBound) return;
        window._cwDisplayRoomBound = true;
        syncAutoPlaceHint();
        bindCapabilitiesSocket();
        syncDisplayMonitor3Profile();
        if (!window._cwDisplayRoomI18nBound) {
            window._cwDisplayRoomI18nBound = true;
            window.addEventListener('fm-i18n-changed', function () {
                syncMonitor3Card(monitor3Profile);
            });
        }

        const applyBtn = el('dr-apply-sos');

        const opsBtn = el('dr-open-ops');

        const m2Btn = el('dr-open-wall');

        const m3Btn = el('dr-open-map');

        const m4Btn = el('dr-open-centre');



        if (applyBtn) applyBtn.addEventListener('click', function () { applySosRoomPreset(); });

        if (opsBtn) opsBtn.addEventListener('click', function () {

            goOperationsTab();

            setStatus(tr('displayRoom.opsHint'), true);

            scrollStatusIntoView();

        });

        if (m2Btn) m2Btn.addEventListener('click', function () {
            // Empty wall only — no autofill. Same rule as Open all monitors.
            openWithFeedback(function () {
                return openCommandWallPopout('/command-wall.html?panel=live', '_blank');
            }, 'displayRoom.popupOpenedWall', 'displayRoom.monitor2Title', 1);
        });

        if (m3Btn) m3Btn.addEventListener('click', function () {
            const keys = monitor3I18nKeys(monitor3Profile);
            openWithFeedback(openMonitor3Popout, keys.popupOk, keys.title, 2);
        });

        if (m4Btn) m4Btn.addEventListener('click', function () {

            openWithFeedback(openCentreSummaryPopout, 'displayRoom.popupOpenedCentre', 'displayRoom.monitor4Title', 3);

        });

    }



    function onShow() {
        clearStatusWatchers();
        setStatus('', null);
        loadGroups();
        syncAutoPlaceHint();
        syncDisplayMonitor3Profile();
    }

    function syncAutoPlaceHint() {
        const hint = el('dr-auto-place-hint');
        if (!hint) return;
        if (!('getScreenDetails' in window)) {
            hint.textContent = tr('displayRoom.autoScreensUnsupported');
            hint.hidden = false;
            return;
        }
        hint.textContent = tr('displayRoom.autoScreensHint');
        hint.hidden = false;
    }



    global.CwDisplayRoom = {

        bindUi: bindUi,

        onShow: onShow,

        applySosRoomPreset: applySosRoomPreset,

    };

})(window);


