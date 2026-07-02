/**

 * Command Wall — Display Room presets (multi-monitor SOS ops layout).

 * Isolated launcher only; does not change SOS / live wall / map engines.

 */

(function (global) {

    const POPOUT_FEATURES = 'width=1920,height=1080,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes';

    const tracked = Object.create(null);

    let groupsLoaded = false;



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



    function openWindow(url, winName) {

        let win = tracked[winName];

        if (win && !win.closed) {

            try {

                win.location.href = url;

                win.focus();

                return win;

            } catch (_) {

                tracked[winName] = null;

            }

        }

        win = window.open(url, winName, POPOUT_FEATURES);

        if (win) tracked[winName] = win;

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

        return '/command-wall.html?' + params.toString();

    }



    function openCommandWallPopout(url) {

        return openWindow(url || '/command-wall.html', 'mobility-command-wall');

    }



    function openMapPopout() {

        const url = window.location.pathname + '?popout=map';

        const win = openWindow(url, 'mobility-map-wall');

        if (global.MapPopoutSync) {

            setTimeout(function () { MapPopoutSync.publishDebounced(); }, 600);

            setTimeout(function () { MapPopoutSync.publish(); }, 1500);

        }

        return win;

    }



    function openCentreSummaryPopout() {

        return openWindow('/command-centre.html', 'mobility-centre-summary');

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

        node.className = 'dr-status' + (ok === false ? ' dr-status-err' : ok === true ? ' dr-status-ok' : '');

    }



    function autoPlaceChecked() {

        const box = el('dr-auto-screens');

        return !!(box && box.checked);

    }



    async function placeOnScreen(win, screenIndex) {

        if (!win || win.closed || screenIndex < 1) return false;

        try {

            if (!('getScreenDetails' in window)) return false;

            const details = await window.getScreenDetails();

            const screens = details.screens || [];

            if (screenIndex >= screens.length) return false;

            const s = screens[screenIndex];

            win.moveTo(s.availLeft, s.availTop);

            win.resizeTo(s.availWidth, s.availHeight);

            return true;

        } catch (_) {

            return false;

        }

    }



    async function placeDisplayWindows(wallWin, mapWin, centreWin) {

        if (!autoPlaceChecked()) return { placed: 0, api: true };

        const hasApi = 'getScreenDetails' in window;

        if (!hasApi) return { placed: 0, api: false };

        let placed = 0;

        if (await placeOnScreen(wallWin, 1)) placed += 1;

        if (await placeOnScreen(mapWin, 2)) placed += 1;

        if (await placeOnScreen(centreWin, 3)) placed += 1;

        return { placed: placed, api: true };

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

        const groupIds = selectedGroupIds();

        if (!groupIds.length) {

            setStatus(tr('displayRoom.selectGroup'), false);

            return;

        }



        setStatus(tr('displayRoom.launching'), true);

        goOperationsTab();



        let groupsPayload = [];

        try {

            const res = await fetch('/api/dispatch-groups', { credentials: 'same-origin' });

            const data = await res.json();

            groupsPayload = (data && data.groups) || [];

        } catch (_) { /* ignore */ }



        const onlineCount = countOnlineInGroups(groupIds, groupsPayload);

        const layout = pickLayoutForCount(onlineCount || 1);

        const wallUrl = buildWallUrl(groupIds, layout);



        const blocked = [];

        const cw = openCommandWallPopout(wallUrl);

        const map = openMapPopout();

        const centre = openCentreSummaryPopout();

        if (!cw) blocked.push(tr('displayRoom.monitor2Title'));

        if (!map) blocked.push(tr('displayRoom.monitor3Title'));

        if (!centre) blocked.push(tr('displayRoom.monitor4Title'));

        if (blocked.length) {

            setStatus(tr('displayRoom.popupBlocked', { list: blocked.join(', ') }), false);

            return;

        }



        const place = await placeDisplayWindows(cw, map, centre);

        if (!place.api) {

            setStatus(tr('displayRoom.launchOkManual'), true);

            return;

        }

        if (place.placed > 0) {

            setStatus(tr('displayRoom.launchOkPlaced', { n: String(place.placed) }), true);

        } else {

            setStatus(tr('displayRoom.launchOkManual'), true);

        }

    }



    function bindUi() {

        const applyBtn = el('dr-apply-sos');

        const opsBtn = el('dr-open-ops');

        const m2Btn = el('dr-open-wall');

        const m3Btn = el('dr-open-map');

        const m4Btn = el('dr-open-centre');



        if (applyBtn) applyBtn.addEventListener('click', function () { applySosRoomPreset(); });

        if (opsBtn) opsBtn.addEventListener('click', function () {

            goOperationsTab();

            setStatus(tr('displayRoom.opsHint'), true);

        });

        if (m2Btn) m2Btn.addEventListener('click', function () {

            const ids = selectedGroupIds();

            const url = ids.length ? buildWallUrl(ids, '16') : '/command-wall.html';

            if (!openCommandWallPopout(url)) {

                setStatus(tr('displayRoom.popupBlocked', { list: tr('displayRoom.monitor2Title') }), false);

            }

        });

        if (m3Btn) m3Btn.addEventListener('click', function () {

            if (!openMapPopout()) setStatus(tr('displayRoom.popupBlocked', { list: tr('displayRoom.monitor3Title') }), false);

        });

        if (m4Btn) m4Btn.addEventListener('click', function () {

            if (!openCentreSummaryPopout()) setStatus(tr('displayRoom.popupBlocked', { list: tr('displayRoom.monitor4Title') }), false);

        });

    }



    function onShow() {

        setStatus('', null);

        loadGroups();

    }



    global.CwDisplayRoom = {

        bindUi: bindUi,

        onShow: onShow,

        applySosRoomPreset: applySosRoomPreset,

    };

})(window);


