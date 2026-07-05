
        var global = window;
        var mapBoot = (typeof MobilityMapGis !== 'undefined' && MobilityMapGis.getInitialView)
            ? MobilityMapGis.getInitialView()
            : { pos: [1.3521, 103.8198], zoom: 11 };
        const map = L.map('map', {
            attributionControl: false,
            zoomControl: true,
            minZoom: 2,
            maxZoom: 20,
            inertia: true,
            fadeAnimation: false,
            zoomAnimation: true,
            markerZoomAnimation: false,
        }).setView(mapBoot.pos, mapBoot.zoom);
        function fmMapResize() {
            try { map.invalidateSize(); } catch (_) { /* ignore */ }
        }
        if (typeof MobilityMapTiles !== 'undefined' && MobilityMapTiles.attachLeaflet) {
            MobilityMapTiles.attachLeaflet(map);
        } else {
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxNativeZoom: 19,
                maxZoom: 20,
                keepBuffer: 12,
                updateWhenIdle: false,
                updateWhenZooming: true,
                crossOrigin: true,
            }).addTo(map);
        }
        if (typeof MobilityMapGis !== 'undefined' && MobilityMapGis.init) MobilityMapGis.init(map);
        if (typeof MapPinLayer !== 'undefined' && MapPinLayer.init) MapPinLayer.init(map);
        if (document.documentElement.classList.contains('map-popout-mode')) {
            function popoutMapResize() { fmMapResize(); }
            setTimeout(popoutMapResize, 250);
            setTimeout(popoutMapResize, 900);
            window.addEventListener('resize', popoutMapResize);
        }
        let deviceMarkers = {};
        window.deviceMarkers = deviceMarkers;
        let cameraMarker = null;
        let lastMapCamId = null;
        let lastMapPos = null;
        var mapPinPopupSuppressed = {};
        var pinPopupRepositionRaf = null;
        var PIN_POPUP_GAP = 8;
        var PIN_DOT_HALF = 15;
        var PIN_POPUP_TIP_INSET = 10;
        var PIN_LABEL_CLEAR = 48;
        var pinVideoDockSyncTimer = null;
        var pinVideoStoppedByUser = Object.create(null);

        function markPinVideoUserStop(camId) {
            if (!camId) return;
            pinVideoStoppedByUser[normalizeCamId(camId)] = true;
        }

        function clearPinVideoUserStop(camId) {
            if (!camId) return;
            delete pinVideoStoppedByUser[normalizeCamId(camId)];
        }

        function isPinVideoStoppedByUser(camId) {
            return !!(camId && pinVideoStoppedByUser[normalizeCamId(camId)]);
        }
        window.isPinVideoStoppedByUser = isPinVideoStoppedByUser;
        window.markPinVideoUserStop = markPinVideoUserStop;
        window.clearPinVideoUserStop = clearPinVideoUserStop;

        var MAP_VIEWPORT_NARROW_PX = 900;
        var MAX_OPEN_PIN_POPUPS = 8;
        var PIN_LAZY_LIVE_FULL_MAX = 8;
        var pinOpenOrder = [];

        function trackPinPopupOpen(camId) {
            var id = normalizeCamId(camId);
            if (!id) return;
            pinOpenOrder = pinOpenOrder.filter(function (x) { return normalizeCamId(x) !== id; });
            pinOpenOrder.push(id);
        }

        function trackPinPopupClose(camId) {
            var id = normalizeCamId(camId);
            if (!id) return;
            pinOpenOrder = pinOpenOrder.filter(function (x) { return normalizeCamId(x) !== id; });
        }

        function pinOpenRankForCam(camId) {
            var id = normalizeCamId(camId);
            for (var i = 0; i < pinOpenOrder.length; i++) {
                if (normalizeCamId(pinOpenOrder[i]) === id) return i + 1;
            }
            return pinOpenOrder.length + 1;
        }

        function shouldLazyPinLive(camId, opts) {
            opts = opts || {};
            if (opts.userPlay || opts.sosLive) return false;
            if (isCamSosActive(camId)) return false;
            if (typeof VideoWall !== 'undefined' && VideoWall.isAlarmCamId && VideoWall.isAlarmCamId(camId)) return false;
            if (typeof VideoWall !== 'undefined' && VideoWall.mapPinHasLiveVideo && VideoWall.mapPinHasLiveVideo(camId)) {
                return false;
            }
            return pinOpenRankForCam(camId) > PIN_LAZY_LIVE_FULL_MAX;
        }
        window.shouldLazyPinLive = shouldLazyPinLive;
        window.pinOpenRankForCam = pinOpenRankForCam;
        var PIN_COLOC_CLUSTER_M = 25;
        var PIN_COLOC_SCREEN_PX = 320;
        var pinPopupDockSide = {};
        var pinPopupDockRing = {};
        var pinPopupDockIdx = {};
        /** Manual drag offset (px) on pin popups — cleared on popup close or reset layout. */
        var pinPopupDragOffset = {};
        /** True after operator drags a popup (distinct from auto-fan offsets). */
        var pinPopupUserMoved = {};
        var pinPopupDragSession = false;
        /** Stacked cluster: only this camId header may be dragged (set via HUD chip). */
        var stackDragFocusCamId = null;
        var mapPanActive = false;
        var pinDockLayoutBusy = false;
        /** Colocated cluster → which cam shows the single map popup (shift ‹ › up to 8). */
        var pinClusterActiveCam = {};
        var popoutMirrorSelectedCamId = null;
        var sosIncidentActive = false;
        var activeAlarmKind = 'sos';
        var geofenceLayers = {};
        var geofenceOutsideByCam = {};
        var geofenceToastTimer = null;
        var geofenceDraftCircle = null;
        var geofenceCenterMarker = null;
        var geofenceRadiusMarker = null;
        var geofenceDrawActive = false;
        var geofenceDrawCamId = null;
        var geofenceDrawAuth = null;
        var geofenceDraftCenter = null;
        var geofenceDrawSavedHidden = null;
        var sosResponseCircle = null;
        var sosResponseCircleRing = null;
        var sosResponseRadiusLabel = null;
        var sosResponseNearby = [];
        var mapPositionsCache = [];
        var SOS_RESPONSE_MAX = 10;
        var SOS_RESPONSE_RADIUS_DEFAULT = 500;
        var SOS_RESPONSE_RADIUS_OPTIONS = [200, 300, 400, 500, 1000];
        var MAP_PIN_COLORS = [
            '#3B82F6', '#22D3EE', '#4ADE80', '#FBBF24', '#FB923C', '#F472B6',
            '#A78BFA', '#2DD4BF', '#60A5FA', '#34D399', '#FCD34D', '#FB7185',
            '#818CF8', '#38BDF8', '#86EFAC', '#F97316', '#E879F9', '#06B6D4',
            '#2563EB', '#10B981', '#EF4444', '#D946EF', '#0EA5E9', '#84CC16',
        ];
        const socket = io();
        var mapSyncFirstPaintDone = false;
        var pendingSosAlarmEvents = [];
        socket.on('sos-alarm', function (data) {
            if (typeof onDashboardSosAlarm === 'function') onDashboardSosAlarm(data);
            else pendingSosAlarmEvents.push(data);
        });
        socket.on('sos-queue-update', function (snap) {
            applySosQueueSnapshot(snap);
            renderSosAlarmStrip();
        });
        socket.on('smart-gps-state', function (data) {
            if (typeof FleetUi !== 'undefined' && FleetUi.ingestSmartGpsState && data && Array.isArray(data.active)) {
                FleetUi.ingestSmartGpsState(data.active);
            }
            if (typeof RouteTrace !== 'undefined' && RouteTrace.onSmartGpsState) {
                RouteTrace.onSmartGpsState(data);
            }
        });
        FleetUi.init(socket);
        if (typeof VoiceAlerts !== 'undefined') VoiceAlerts.init({ socket: socket });
        ChatUi.init(socket);
        if (typeof PttRx !== 'undefined') PttRx.init(socket);
        if (typeof CallMic !== 'undefined') CallMic.bindSocket(socket);
        socket.on('connect', function () {
            refreshMapFromServer();
            fetch('/api/fleet').then(function (r) { return r.json(); }).then(function (data) {
                if (data && data.fleet && typeof FleetUi !== 'undefined' && FleetUi.ingestFleet) {
                    FleetUi.ingestFleet(data.fleet);
                }
            }).catch(function () { /* ignore */ });
        });
        socket.on('server-capabilities', function (data) {
            if (data && data.permissions && window.setDashboardPermissions) {
                window.setDashboardPermissions(data.permissions, data.role, data.username);
            }
            if (data && data.dispatchScope && window.setDashboardDispatchScope) {
                window.setDashboardDispatchScope(data.dispatchScope);
            }
            if (data && data.siteTime && data.siteTime.timezone) {
                window.siteTimezone = data.siteTime.timezone;
            }
        });
        socket.on('remote-control-denied', function (data) {
            alert((data && data.error) || 'Device control not authorized.');
        });
        socket.on('kill-switch-denied', function (data) {
            alert((data && data.error) || dashboardTr('map.killSwitch.fourEyesDenied'));
        });
        socket.on('kill-switch-request-ok', function () {
            alert(dashboardTr('map.killSwitch.fourEyesRequested'));
        });
        socket.on('kill-switch-approve-ok', function () {
            alert(dashboardTr('map.killSwitch.fourEyesApproved'));
        });
        socket.on('kill-switch-cancel-ok', function () {
            alert(dashboardTr('map.killSwitch.fourEyesCancelled'));
        });
        socket.on('kill-switch-pending-list', function (data) {
            renderKillSwitchPendingList(data && data.requests);
        });
        socket.on('kill-switch-resolved', function (data) {
            if (data && data.requestId) {
                killSwitchPendingCache = killSwitchPendingCache.filter(function (r) {
                    return r.id !== data.requestId;
                });
            }
        });

        function dashboardTr(key, params) {
            if (typeof I18n !== 'undefined' && I18n.t) return I18n.t(key, params);
            return key;
        }

        (function buildVideoWall() {
            const wall = document.getElementById('video-wall-slots');
            for (let i = 0; i < VideoWall.SLOT_COUNT; i++) {
                const slot = document.createElement('div');
                slot.className = 'video-slot' + (i === 0 ? ' selected' : '');
                slot.dataset.slot = String(i);
                slot.innerHTML =
                    '<div class="video-slot-caption"><span class="video-slot-label">' + dashboardTr('video.panel', { n: i + 1 }) + '</span></div>' +
                    '<div class="video-slot-box">' +
                    '<div class="video-slot-head">' +
                    '<span class="video-slot-status">Idle</span>' +
                    '<div class="video-slot-actions">' +
                    '<button type="button" class="video-slot-play" title="' + dashboardTr('video.play') + '">▶</button>' +
                    '<button type="button" class="video-slot-audio" title="' + dashboardTr('video.listenWhenLive') + '" aria-pressed="true" disabled>🔇</button>' +
                    '<button type="button" class="video-slot-call" title="' + dashboardTr('call.whenLive') + '" hidden disabled>📞</button>' +
                    '<button type="button" class="video-slot-ptt" title="' + dashboardTr('ptt.holdTalk') + '" hidden disabled>PTT</button>' +
                    '<button type="button" class="video-slot-stop" title="' + dashboardTr('video.stop') + '">■</button>' +
                    '<button type="button" class="video-slot-popout" title="' + dashboardTr('video.popout') + '">' + dashboardTr('video.popout') + '</button>' +
                    '</div></div>' +
                    '<div class="video-slot-stage"><span class="video-slot-empty">' + dashboardTr('video.selectDevice') + '</span></div>' +
                    '</div>';
                wall.appendChild(slot);
            }
        })();

        VideoWall.init(socket);
        window._videoWallInited = true;
        window.__mobilityDashboardSocket = socket;
        if (typeof CommandWall !== 'undefined' && CommandWall.init) CommandWall.init(socket);

        function slotOwnCamId(slotEl) {
            if (!slotEl) return '';
            var id = (slotEl.dataset.camId || slotEl.getAttribute('data-cam-id') || '').trim();
            if (id) return id;
            var slotIdx = slotEl.dataset.slot != null ? parseInt(slotEl.dataset.slot, 10) : NaN;
            if (!isNaN(slotIdx) && typeof VideoConfig !== 'undefined' && VideoConfig.getActiveDeviceForSlot) {
                var configured = VideoConfig.getActiveDeviceForSlot(slotIdx);
                if (configured) return String(configured).trim();
            }
            return '';
        }

        function fixIdleSlotCallButtons() {
            if (typeof VideoWall === 'undefined' || !VideoWall.isLiveCamId) return;
            document.querySelectorAll('.video-slot[data-slot]').forEach(function (slotEl) {
                var btn = slotEl.querySelector('.video-slot-call');
                if (!btn) return;
                var st = slotEl.querySelector('.video-slot-status');
                var status = (st && st.textContent) ? st.textContent.trim() : '';
                var camId = slotOwnCamId(slotEl);
                if (status === 'Idle' || !camId) {
                    btn.hidden = true;
                    btn.disabled = true;
                    return;
                }
                var live = !!VideoWall.isLiveCamId(camId);
                btn.hidden = !live;
                btn.disabled = !live;
            });
        }
        window.fixIdleSlotCallButtons = fixIdleSlotCallButtons;

        function wrapVideoWallCallUi(method) {
            if (!method) return method;
            return function () {
                var out = method.apply(this, arguments);
                setTimeout(fixIdleSlotCallButtons, 0);
                return out;
            };
        }

        if (VideoWall.playSlot) {
            var _playSlot = VideoWall.playSlot.bind(VideoWall);
            VideoWall.playSlot = function (slotEl) {
                _playSlot(slotEl);
                setTimeout(function () {
                    if (typeof closePinPopupsWithoutWallPlayer === 'function') closePinPopupsWithoutWallPlayer();
                    fixIdleSlotCallButtons();
                }, 200);
            };
        }
        if (VideoWall.stopSlot) VideoWall.stopSlot = wrapVideoWallCallUi(VideoWall.stopSlot.bind(VideoWall));
        if (VideoWall.assignCamToSlot) VideoWall.assignCamToSlot = wrapVideoWallCallUi(VideoWall.assignCamToSlot.bind(VideoWall));
        if (VideoWall.toggleVoiceCall) VideoWall.toggleVoiceCall = wrapVideoWallCallUi(VideoWall.toggleVoiceCall.bind(VideoWall));
        if (VideoWall.onSosAlarm) VideoWall.onSosAlarm = wrapVideoWallCallUi(VideoWall.onSosAlarm.bind(VideoWall));
        if (VideoWall.onFleetUpdate) VideoWall.onFleetUpdate = wrapVideoWallCallUi(VideoWall.onFleetUpdate.bind(VideoWall));
        if (VideoWall.onDeviceWentOffline) VideoWall.onDeviceWentOffline = wrapVideoWallCallUi(VideoWall.onDeviceWentOffline.bind(VideoWall));
        if (VideoWall.notifyStreamStopped) VideoWall.notifyStreamStopped = wrapVideoWallCallUi(VideoWall.notifyStreamStopped.bind(VideoWall));
        if (VideoWall.stopAllVideo) VideoWall.stopAllVideo = wrapVideoWallCallUi(VideoWall.stopAllVideo.bind(VideoWall));
        setTimeout(fixIdleSlotCallButtons, 0);
        setTimeout(fixIdleSlotCallButtons, 400);

        BwcDevices.init().then(function () {
            return VideoConfig.init();
        }).then(function () {
            if (typeof VideoWall.relabelWallSlots === 'function') VideoWall.relabelWallSlots();
            if (typeof fixIdleSlotCallButtons === 'function') fixIdleSlotCallButtons();
        });

        function applyDashboardSession(data) {
            if (!data || !data.ok) return;
            if (data.mustChangePassword) {
                window.location.replace('/must-change-password.html');
                return true;
            }
            if (data.mustEnrollTotp) {
                window.location.replace('/enroll-totp.html');
                return true;
            }
            if (data.permissions && window.setDashboardPermissions) {
                window.setDashboardPermissions(data.permissions, data.role, data.username);
            }
            if (global.SettingsHub && SettingsHub.applySession) {
                SettingsHub.applySession(data);
            }
            if (global.ServerSetup && ServerSetup.applySession) {
                ServerSetup.applySession(data);
            }
            if (global.ServerSetup && ServerSetup.bindSettingsAsideClicks) {
                ServerSetup.bindSettingsAsideClicks();
            }
            if (data.dispatchScope && window.setDashboardDispatchScope) {
                window.setDashboardDispatchScope(data.dispatchScope);
            }
            if (typeof applyDashboardSessionDisplay === 'function') {
                applyDashboardSessionDisplay(data);
            }
            var setupRow = document.getElementById('server-setup-row');
            if (setupRow && !data.canManageServer) {
                setupRow.hidden = true;
            }
            var centreTab = document.getElementById('nav-tab-centre-summary');
            if (centreTab && data.canManageServer) {
                centreTab.hidden = false;
            }
            if (global.SessionBus && SessionBus.warmSettings) {
                SessionBus.warmSettings().then(function (sdata) {
                    var urlEl = document.getElementById('display-operator-url');
                    if (urlEl && sdata && sdata.settings && sdata.settings.deployment) {
                        urlEl.textContent = sdata.settings.deployment.operatorUrl || sdata.settings.publicHost || '—';
                    }
                }).catch(function () { /* ignore */ });
            }
            return false;
        }

        var sessionPromise = (global.SessionBus && SessionBus.get)
            ? SessionBus.get()
            : fetch('/api/auth/session').then(function (r) { return r.json(); });
        sessionPromise.then(function (data) {
            if (applyDashboardSession(data)) return;
        }).catch(function () { /* ignore */ });

        document.getElementById('dashboard-logout').addEventListener('click', function () {
            if (window.AuthReverify && AuthReverify.clear) AuthReverify.clear();
            fetch('/api/auth/logout', { method: 'POST' }).finally(function () {
                window.location.href = '/login.html';
            });
        });

        function syncCameraId(id) {
            if (id) lastMapCamId = id;
        }

        function mapPopupRootForCam(camId) {
            if (!camId) return null;
            var id = String(camId).trim();
            var pops = document.querySelectorAll('.leaflet-popup-content .map-popup[data-cam-id]');
            for (var i = 0; i < pops.length; i++) {
                if (pops[i].getAttribute('data-cam-id') === id) return pops[i];
            }
            return null;
        }

        function getMapPopupRoot(camId) {
            if (camId) return mapPopupRootForCam(camId);
            return document.querySelector('.leaflet-popup-content .map-popup');
        }

        function pinTelSet(root, selector, text, className) {
            var el = root.querySelector(selector);
            if (!el) return;
            el.textContent = text;
            el.className = className || '';
        }

        function pinDeviceTimeFromData(camId, data) {
            var dt = data && data.deviceTime;
            if (dt && dt !== '—' && dt !== '--') {
                if (!data.deviceTimeSource || data.deviceTimeSource === 'device') return String(dt);
            }
            if (data && data.serverTime) return String(data.serverTime);
            if (window.globalTelemetryCache && window.globalTelemetryCache[camId]) {
                var cached = window.globalTelemetryCache[camId];
                dt = cached.deviceTime;
                if (dt && dt !== '—' && dt !== '--' && cached.deviceTimeSource !== 'server') return String(dt);
                if (cached.serverTime) return String(cached.serverTime);
            }
            return formatSiteEvidenceNow();
        }

        function formatSiteEvidenceNow() {
            var tz = window.siteTimezone || 'Asia/Singapore';
            try {
                var parts = new Intl.DateTimeFormat('en-GB', {
                    timeZone: tz,
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    fractionalSecondDigits: 3,
                    hour12: false
                }).formatToParts(new Date());
                var pick = function (type) {
                    var p = parts.find(function (x) { return x.type === type; });
                    return p ? p.value : '00';
                };
                return pick('year') + '-' + pick('month') + '-' + pick('day') + ' '
                    + pick('hour') + ':' + pick('minute') + ':' + pick('second') + '.' + pick('fractionalSecond');
            } catch (_) {
                return null;
            }
        }

        function refreshOpenPinDeviceTimes() {
            getOpenPinCamIds().forEach(function (camId) {
                var root = mapPopupRootForCam(camId);
                if (!root) return;
                var cache = window.globalTelemetryCache && window.globalTelemetryCache[camId];
                var deviceTime = pinDeviceTimeFromData(camId, cache || null);
                var muted = !cache || cache.deviceTimeSource === 'server';
                pinTelSet(root, '.pin-tel-device-time', deviceTime || '—', deviceTime && !muted ? '' : 'pin-tel-muted');
            });
        }
        setInterval(refreshOpenPinDeviceTimes, 1000);

        function refreshMapPinTelemetry(camId, data, online) {
            var root = mapPopupRootForCam(camId);
            if (!root) return;
            var deviceTime = pinDeviceTimeFromData(camId, data);
            var timeMuted = !data || data.deviceTimeSource === 'server';
            pinTelSet(root, '.pin-tel-device-time', deviceTime || '—', deviceTime && !timeMuted ? '' : 'pin-tel-muted');
            if (!data) return;
            setTelemetryUi(Object.assign({ cameraId: camId }, data));
        }

        function setConnStatus(online, offlineLabel) {
            var root = mapPopupRootForCam(lastMapCamId) || getMapPopupRoot();
            if (!root) return;
            pinTelSet(root, '.pin-tel-status', online ? ((typeof I18n !== 'undefined' && I18n.t) ? I18n.t('common.online') : 'Online') : (offlineLabel || ((typeof I18n !== 'undefined' && I18n.t) ? I18n.t('common.offline') : 'Offline')), online ? 'pin-tel-ok' : 'pin-tel-muted');
        }

        function setTelemetryUi(data) {
            if (!data || !data.cameraId) return;

            // Global background cache to preserve battery and signal state when pin is closed
            if (!window.globalTelemetryCache) window.globalTelemetryCache = {};
            var prevCache = window.globalTelemetryCache[data.cameraId] || {};
            var merged = Object.assign({}, prevCache, data);
            if ((data.battery == null || data.battery === '--' || data.battery === '—')
                && prevCache.battery && prevCache.battery !== '—' && prevCache.battery !== '--') {
                merged.battery = prevCache.battery;
            }
            if ((data.deviceTime == null || data.deviceTime === '--' || data.deviceTime === '—')
                && prevCache.deviceTime && prevCache.deviceTime !== '—' && prevCache.deviceTime !== '--') {
                merged.deviceTime = prevCache.deviceTime;
            }
            window.globalTelemetryCache[data.cameraId] = merged;

            var root = mapPopupRootForCam(data.cameraId);
            if (!root) return;

            if (data.battery != null && data.battery !== '--' && data.battery !== '—') {
                var b = String(data.battery);
                if (b.toUpperCase() === 'N/A') {
                    pinTelSet(root, '.pin-tel-battery', 'N/A', 'pin-tel-muted');
                } else {
                    pinTelSet(root, '.pin-tel-battery', b.indexOf('%') >= 0 ? b : b + ' %', '');
                }
            }
            if (data.recording === '1') {
                pinTelSet(root, '.pin-tel-record', dashboardTr('common.on'), 'pin-tel-rec');
            } else if (data.recording != null) {
                pinTelSet(root, '.pin-tel-record', dashboardTr('common.off'), 'pin-tel-muted');
            }
            if (data.audio === '1') {
                pinTelSet(root, '.pin-tel-audio', dashboardTr('common.on'), 'pin-tel-rec');
            } else if (data.audio != null) {
                pinTelSet(root, '.pin-tel-audio', dashboardTr('common.off'), 'pin-tel-muted');
            }
            if (merged.deviceTime && merged.deviceTime !== '—' && merged.deviceTime !== '--') {
                var dtMuted = merged.deviceTimeSource === 'server';
                pinTelSet(root, '.pin-tel-device-time', String(merged.deviceTime), dtMuted ? 'pin-tel-muted' : '');
            }
        }

        function applyFleetTelemetryToPanel(data, online) {
            if (!lastMapCamId) return;
            refreshMapPinTelemetry(lastMapCamId, data, online);
        }

        function mapPopupTelemetryHtml() {
            return '<div class="map-popup-telemetry">' +
                '<p class="map-popup-tel-title">' + dashboardTr('map.telemetry.title') + '</p>' +
                '<div class="map-popup-tel-grid">' +
                '<div class="map-popup-tel-row"><span>' + dashboardTr('map.telemetry.deviceTime') + '</span><span class="pin-tel-device-time pin-tel-muted">—</span></div>' +
                '<div class="map-popup-tel-row"><span>' + dashboardTr('map.telemetry.battery') + '</span><span class="pin-tel-battery">—</span></div>' +
                '<div class="map-popup-tel-row"><span>' + dashboardTr('map.telemetry.sdRecord') + '</span><span class="pin-tel-record">—</span></div>' +
                '<div class="map-popup-tel-row"><span>' + dashboardTr('map.telemetry.audioRec') + '</span><span class="pin-tel-audio">—</span></div>' +
                '</div></div>';
        }

        function mapPopupHeadHtml(camId, alarmKind) {
            var badgeClass = alarmKind === 'fall' ? 'fall' : (alarmKind ? 'sos' : 'patrol');
            var badgeText = alarmKind === 'fall' ? dashboardTr('map.pin.fall') : (alarmKind ? dashboardTr('map.pin.sos') : dashboardTr('map.pin.patrol'));
            var name = friendlyPinName(camId);
            var idHtml = '';
            if (typeof FleetDisplay !== 'undefined' && FleetDisplay.hasConfiguredName(camId)) {
                idHtml = '<span class="map-popup-id-inline">' + escapePinText(FleetDisplay.shortTechnicalId(camId)) + '</span>';
            }
            var metaHtml = '';
            if (idHtml || badgeText) {
                metaHtml = '<p class="map-popup-meta">' + idHtml +
                    (idHtml && badgeText ? ' ' : '') +
                    '<span class="map-popup-badge-inline ' + badgeClass + '">' + escapePinText(badgeText) + '</span></p>';
            }
            return '<div class="map-popup-head">' +
                '<div class="map-popup-head-text">' +
                (document.documentElement.classList.contains('map-popout-mode')
                    ? '<p class="map-popup-mirror-note">' + escapePinText(dashboardTr('map.popoutMirrorHint')) + '</p>' : '') +
                '<p class="map-popup-title" title="' + escapePinText(name) + '">' +
                '<span class="map-popup-name">' + escapePinText(name) + '</span></p>' +
                metaHtml +
                '</div>' +
                '<button type="button" class="map-pin-minimize" data-cam-id="' + escapePinText(camId) + '" title="' +
                escapePinText(dashboardTr('map.pin.minimize')) + '" aria-label="' + escapePinText(dashboardTr('map.pin.minimize')) + '">−</button>' +
                '</div>';
        }

        function showMapPinToast(message) {
            if (!message) return;
            var el = document.getElementById('map-pin-toast');
            if (!el) {
                el = document.createElement('div');
                el.id = 'map-pin-toast';
                el.className = 'map-pin-toast';
                el.setAttribute('role', 'status');
                el.setAttribute('aria-live', 'polite');
                document.body.appendChild(el);
            }
            el.textContent = message;
            el.classList.add('visible');
            if (showMapPinToast._timer) clearTimeout(showMapPinToast._timer);
            showMapPinToast._timer = setTimeout(function () { el.classList.remove('visible'); }, 4200);
        }
        window.showMapPinToast = showMapPinToast;

        function isMapViewportNarrow() {
            return window.innerWidth < MAP_VIEWPORT_NARROW_PX;
        }

        function syncMapViewportNarrowClass() {
            document.documentElement.classList.toggle('map-viewport-narrow', isMapViewportNarrow());
        }
        syncMapViewportNarrowClass();
        window.addEventListener('resize', function () {
            syncMapViewportNarrowClass();
            if (getOpenPinCamIds().length) assignColocatedPinPopupDocks();
        });

        function mapOfflinePopupHtml(camId, alarmKind) {
            return '<div class="map-popup map-popup-offline" data-cam-id="' + camId + '" data-offline-popup="1">' +
                mapPopupHeadHtml(camId, alarmKind) +
                '<div class="map-pin-offline-box"><span class="map-pin-offline-title">' + dashboardTr('map.pin.bwcOffline') + '</span></div>' +
                '</div>';
        }

        function mapPopupHtml(camId, alarmKind, isOnline) {
            if (isOnline === undefined) isOnline = isCamOnlineOnFleet(camId);
            if (!isOnline && !alarmKind) return mapOfflinePopupHtml(camId, alarmKind);
            const sosAttr = alarmKind ? ' data-sos-popup="1"' : '';
            var livePh = document.documentElement.classList.contains('map-popout-mode')
                ? dashboardTr('map.popoutMirrorVideoHint')
                : dashboardTr('map.pin.livePlaceholder');
            return '<div class="map-popup" data-cam-id="' + camId + '"' + sosAttr + '>' +
                mapPopupHeadHtml(camId, alarmKind) +
                '<span class="map-pin-ptt-rx-badge" hidden>' + dashboardTr('ptt.fieldBadge') + '</span>' +
                '<div class="sos-popup-container">' +
                '<div class="map-pin-video-wrap">' +
                '<div class="media-box vid-box map-pin-video" data-cam-id="' + camId + '">' +
                '<div class="map-pin-video-placeholder">' + livePh + '</div>' +
                '<button type="button" class="map-pin-audio-mute" title="' + dashboardTr('audio.listenLive') + '" hidden>🔇</button></div>' +
                '<div class="map-pin-video-bar">' +
                '<button type="button" class="map-pin-play" data-cam-id="' + camId + '" title="' + dashboardTr('call.liveVideo') + '">' + dashboardTr('call.liveVideo') + '</button>' +
                '<button type="button" class="map-pin-call" data-cam-id="' + camId + '" title="' + dashboardTr('call.whenLive') + '" hidden>' + dashboardTr('call.mapCall') + '</button>' +
                '<button type="button" class="map-pin-voice" data-cam-id="' + camId + '" title="' + dashboardTr('call.voiceOnly') + '" hidden>' + dashboardTr('call.voiceMap') + '</button>' +
                '<button type="button" class="map-pin-ptt" data-cam-id="' + camId + '" title="' + dashboardTr('ptt.holdTalk') + '" hidden>' + dashboardTr('ptt.mapLabel') + '</button>' +
                '<button type="button" class="map-pin-stop" data-cam-id="' + camId + '" title="' + dashboardTr('call.stopLive') + '" hidden>' + dashboardTr('call.stopLive') + '</button>' +
                '</div></div></div>' + mapPopupTelemetryHtml() + '</div>';
        }

        function clearCameraMarker(camId) {
            if (camId) {
                removeDeviceMarker(camId);
                updateMapPinLegend();
                return;
            }
            Object.keys(deviceMarkers).slice().forEach(function (id) { removeDeviceMarker(id); });
            cameraMarker = null;
            updateMapPinLegend();
        }

        function escapePinText(s) {
            return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
        }

        function normalizeCamId(camId) {
            return String(camId || '').trim();
        }

        var recentlyAckedSosByCam = {};
        var RECENT_ACK_PIN_MS = 8000;

        function getRecentAckedAlarmKind(camId) {
            var id = normalizeCamId(camId);
            var rec = recentlyAckedSosByCam[id];
            if (!rec) return null;
            if (rec.until <= Date.now()) {
                delete recentlyAckedSosByCam[id];
                return null;
            }
            return rec.kind || 'sos';
        }

        function markRecentlyAckedSos(camId, kind) {
            camId = normalizeCamId(camId);
            if (!camId) return;
            recentlyAckedSosByCam[camId] = {
                until: Date.now() + RECENT_ACK_PIN_MS,
                kind: kind === 'fall' ? 'fall' : 'sos',
            };
            if (window._recentAckPinTimer) clearTimeout(window._recentAckPinTimer);
            window._recentAckPinTimer = setTimeout(function () {
                var now = Date.now();
                Object.keys(recentlyAckedSosByCam).forEach(function (id) {
                    if (recentlyAckedSosByCam[id].until <= now) delete recentlyAckedSosByCam[id];
                });
                refreshAllDeviceMarkerStyles();
            }, RECENT_ACK_PIN_MS + 80);
            refreshAllDeviceMarkerStyles();
        }

        function getCamAlarmKind(camId) {
            var id = normalizeCamId(camId);
            if (!id) return null;
            var recentAck = getRecentAckedAlarmKind(id);
            if (recentAck) return recentAck;
            if (activeSosAlarms[id]) return activeSosAlarms[id].alarmKind || activeAlarmKind || 'sos';
            if (sosIncidentActive && pendingSosAck && normalizeCamId(pendingSosAck.cameraId) === id) {
                return pendingSosAck.alarmKind || activeAlarmKind || 'sos';
            }
            if (!sosIncidentActive) return null;
            if (typeof getSosCamId === 'function' && normalizeCamId(getSosCamId()) === id) {
                return activeAlarmKind || 'sos';
            }
            return null;
        }

        function isCamSosActive(camId) {
            return !!getCamAlarmKind(camId);
        }

        function applyAlarmBannerKind(kind) {
            var banner = document.getElementById('sos-banner');
            var prefix = document.getElementById('sos-banner-prefix');
            if (!banner || !prefix) return;
            var k = kind === 'fall' ? 'fall' : 'sos';
            banner.className = k === 'fall' ? 'kind-fall' : 'kind-sos';
            prefix.textContent = k === 'fall' ? dashboardTr('sos.banner.fall') : dashboardTr('sos.banner.distress');
        }

        function hashString(s) {
            var h = 0;
            var str = String(s || '');
            for (var i = 0; i < str.length; i++) h = ((h << 5) - h) + str.charCodeAt(i) | 0;
            return Math.abs(h);
        }

        function brightColorForKey(key) {
            return MAP_PIN_COLORS[hashString(String(key || '').toLowerCase()) % MAP_PIN_COLORS.length];
        }

        function isCamOnlineOnFleet(camId) {
            if (typeof FleetUi !== 'undefined' && FleetUi.isDeviceOnline) {
                return FleetUi.isDeviceOnline(camId);
            }
            return true;
        }

        window.dispatchGroupLookup = { byDevice: {}, byName: {}, groups: [] };

        function dispatchColorForCam(camId, mapGroup) {
            var lk = window.dispatchGroupLookup || {};
            if (camId && lk.byDevice && lk.byDevice[camId] && lk.byDevice[camId].color) {
                return lk.byDevice[camId].color;
            }
            var gk = String(mapGroup || '').toLowerCase();
            if (gk && lk.byName && lk.byName[gk] && lk.byName[gk].color) {
                return lk.byName[gk].color;
            }
            return null;
        }

        window.onDispatchGroupsUpdated = function () {
            if (typeof refreshAllDeviceMarkerStyles === 'function') refreshAllDeviceMarkerStyles();
            if (typeof FleetUi !== 'undefined' && FleetUi.refreshFromGroups) FleetUi.refreshFromGroups();
            if (typeof BwcDevices !== 'undefined' && BwcDevices.refreshGroupOptions) BwcDevices.refreshGroupOptions();
            if (typeof refreshPttGroupSelect === 'function') refreshPttGroupSelect();
            if (typeof refreshPttGroupPreview === 'function') refreshPttGroupPreview();
        };

        function escPttHtml(s) {
            return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
        }

        function getPinnedPttCamIds() {
            if (typeof FleetUi === 'undefined' || !FleetUi.getSelectedCamIds) return [];
            return FleetUi.getSelectedCamIds().filter(function (id) {
                return FleetUi.isDeviceOnline && FleetUi.isDeviceOnline(id);
            });
        }

        function pttMemberChipMeta(camId, fallbackColor, fallbackLabel) {
            var lk = window.dispatchGroupLookup || {};
            var entry = lk.byDevice && lk.byDevice[camId];
            var fleetName = (typeof FleetUi !== 'undefined' && FleetUi.getDeviceName)
                ? FleetUi.getDeviceName(camId)
                : camId;
            var label = fallbackLabel || (entry && entry.nickname) || fleetName || camId;
            var color = fallbackColor || dispatchColorForCam(camId) || '#64748b';
            var subtitle = entry && entry.groupName ? entry.groupName : '';
            return { camId: camId, label: label, color: color, subtitle: subtitle };
        }

        var pttGroupPickSourceKey = '';
        var pttGroupPickCamIds = [];
        var pttGroupMembersBound = false;

        function pttGroupPickSourceKeyFn() {
            var sel = document.getElementById('ptt-group-select');
            var groupId = sel && sel.value;
            if (groupId) return 'group:' + groupId;
            var pinned = getPinnedPttCamIds();
            if (pinned.length) return 'pinned:' + pinned.slice().sort().join('|');
            return '';
        }

        function fullPttCandidatesMeta() {
            var sel = document.getElementById('ptt-group-select');
            var groupId = sel && sel.value;
            var catalog = window.pttGroupCatalog || [];
            if (groupId) {
                var g = catalog.find(function (x) { return x.id === groupId; });
                return membersForSavedGroup(g);
            }
            var pinned = getPinnedPttCamIds();
            if (pinned.length) return membersForPinned();
            return [];
        }

        function syncPttGroupPickFromSource() {
            var key = pttGroupPickSourceKeyFn();
            var all = fullPttCandidatesMeta().map(function (m) { return m.camId; });
            if (key !== pttGroupPickSourceKey) {
                pttGroupPickSourceKey = key;
                pttGroupPickCamIds = all.slice();
                return;
            }
            pttGroupPickCamIds = pttGroupPickCamIds.filter(function (id) { return all.indexOf(id) >= 0; });
        }

        function renderPttGroupMemberChips(members, opts) {
            opts = opts || {};
            var wrap = document.getElementById('ptt-group-members-wrap');
            var el = document.getElementById('ptt-group-members');
            var hintEl = wrap && wrap.querySelector('.ptt-group-members-hint');
            if (!el || !wrap) return;
            if (!members || !members.length) {
                wrap.hidden = true;
                el.innerHTML = '';
                return;
            }
            wrap.hidden = false;
            if (hintEl) hintEl.hidden = !opts.editable;
            el.innerHTML = members.map(function (m) {
                var title = m.subtitle
                    ? (m.label + ' · ' + m.subtitle)
                    : m.label;
                var on = opts.editable
                    ? pttGroupPickCamIds.indexOf(m.camId) >= 0
                    : true;
                var chipClass = 'ptt-member-chip';
                if (opts.editable) chipClass += on ? ' ptt-member-chip-on' : ' ptt-member-chip-off';
                else chipClass += ' ptt-member-chip-readonly';
                var actionBtn = '';
                if (opts.editable) {
                    actionBtn = on
                        ? '<button type="button" class="ptt-member-chip-btn" data-ptt-pick-action="remove" data-cam-id="' + escPttHtml(m.camId) + '" title="' + escPttHtml(dashboardTr('ptt.excludeFromGroup')) + '" aria-label="' + escPttHtml(dashboardTr('common.exclude')) + '">×</button>'
                        : '<button type="button" class="ptt-member-chip-btn" data-ptt-pick-action="add" data-cam-id="' + escPttHtml(m.camId) + '" title="' + escPttHtml(dashboardTr('ptt.includeInGroup')) + '" aria-label="' + escPttHtml(dashboardTr('common.include')) + '">+</button>';
                }
                return '<span class="' + chipClass + '" title="' + escPttHtml(title) + '">'
                    + '<span class="ptt-member-dot" style="background:' + escPttHtml(m.color || '#64748b') + '"></span>'
                    + '<span class="ptt-member-name">' + escPttHtml(m.label) + '</span>'
                    + actionBtn + '</span>';
            }).join('');
        }

        function updatePttGroupJoinButton() {
            var btn = document.getElementById('ptt-group-join');
            var pickHint = document.getElementById('ptt-group-pick-hint');
            var editable = !!pttGroupPickSourceKeyFn();
            var n = pttGroupPickCamIds.length;
            if (btn) btn.disabled = !editable || n < 2;
            if (pickHint) {
                if (editable && fullPttCandidatesMeta().length) {
                    pickHint.hidden = false;
                    pickHint.textContent = n >= 2
                        ? dashboardTr('ptt.groupBox.pickReady', { n: n })
                        : dashboardTr('ptt.groupBox.pickNeedTwo', { n: n });
                    pickHint.classList.toggle('ready', n >= 2);
                    pickHint.classList.toggle('warn', n < 2);
                } else {
                    pickHint.hidden = true;
                    pickHint.textContent = '';
                    pickHint.classList.remove('ready', 'warn');
                }
            }
        }

        function bindPttGroupMemberClicks() {
            if (pttGroupMembersBound) return;
            var el = document.getElementById('ptt-group-members');
            if (!el) return;
            pttGroupMembersBound = true;
            el.addEventListener('click', function (e) {
                var btn = e.target.closest('[data-ptt-pick-action]');
                if (!btn) return;
                e.preventDefault();
                var camId = btn.getAttribute('data-cam-id');
                if (!camId) return;
                var action = btn.getAttribute('data-ptt-pick-action');
                if (action === 'remove') {
                    pttGroupPickCamIds = pttGroupPickCamIds.filter(function (id) { return id !== camId; });
                } else if (action === 'add' && pttGroupPickCamIds.indexOf(camId) < 0) {
                    pttGroupPickCamIds.push(camId);
                }
                renderPttGroupMemberChips(fullPttCandidatesMeta(), { editable: true });
                updatePttGroupJoinButton();
            });
        }

        function membersForSavedGroup(g) {
            if (!g) return [];
            var groupColor = g.color || '#64748b';
            return (g.members || []).filter(function (m) { return m && m.deviceId; }).map(function (m) {
                return pttMemberChipMeta(
                    m.deviceId,
                    groupColor,
                    m.nickname || m.deviceId
                );
            });
        }

        function membersForPinned() {
            return getPinnedPttCamIds().map(function (id) {
                return pttMemberChipMeta(id);
            });
        }

        function membersForActiveTeam() {
            var team = global.activeDispatchPttTeam;
            if (!Array.isArray(team) || !team.length) return [];
            return team.map(function (id) {
                return pttMemberChipMeta(String(id));
            });
        }

        function refreshPttGroupPreview() {
            var sel = document.getElementById('ptt-group-select');
            var dot = document.getElementById('ptt-group-color-dot');
            var pinnedHint = document.getElementById('ptt-group-pinned-hint');
            var groupId = sel && sel.value;
            var catalog = window.pttGroupCatalog || [];
            var g = groupId ? catalog.find(function (x) { return x.id === groupId; }) : null;
            var pinned = getPinnedPttCamIds();
            var candidates = fullPttCandidatesMeta();
            var editable = !!(g || pinned.length >= 1);

            if (dot) {
                if (g && g.color) {
                    dot.hidden = false;
                    dot.style.background = g.color;
                } else {
                    dot.hidden = true;
                    dot.style.background = '';
                }
            }

            if (pinnedHint) {
                if (!groupId && pinned.length >= 2) {
                    pinnedHint.hidden = false;
                    pinnedHint.textContent = dashboardTr('ptt.groupBox.pinnedReady', { n: pinned.length });
                } else if (!groupId && pinned.length === 1) {
                    pinnedHint.hidden = false;
                    pinnedHint.textContent = dashboardTr('ptt.groupBox.pinnedNeedMore');
                } else {
                    pinnedHint.hidden = true;
                    pinnedHint.textContent = '';
                }
            }

            if (editable && candidates.length) {
                syncPttGroupPickFromSource();
                renderPttGroupMemberChips(candidates, { editable: true });
            } else if (global.activeDispatchPttTeam && global.activeDispatchPttTeam.length) {
                renderPttGroupMemberChips(membersForActiveTeam(), { editable: false });
            } else {
                pttGroupPickSourceKey = '';
                pttGroupPickCamIds = [];
                renderPttGroupMemberChips([], {});
            }
            updatePttGroupJoinButton();
        }
        window.refreshPttGroupPreview = refreshPttGroupPreview;

        function refreshPttGroupSelect(groupsPayload) {
            var sel = document.getElementById('ptt-group-select');
            if (!sel) return;
            var prev = sel.value;
            function fill(groups) {
                window.pttGroupCatalog = groups || [];
                sel.innerHTML = '<option value="">' + dashboardTr('ptt.groupBox.select') + '</option>';
                (groups || []).forEach(function (g) {
                    if (!g || !g.id) return;
                    var n = (g.members && g.members.length) || g.memberCount || 0;
                    var names = (g.members || []).slice(0, 3).map(function (m) {
                        return (m && m.nickname) ? m.nickname : '';
                    }).filter(Boolean);
                    var namePart = names.length ? (' · ' + names.join(', ')) : '';
                    if ((g.members || []).length > 3) namePart += '…';
                    var opt = document.createElement('option');
                    opt.value = g.id;
                    opt.textContent = (g.name || g.id) + namePart + ' (' + n + ')';
                    opt.setAttribute('data-color', g.color || '#64748b');
                    sel.appendChild(opt);
                });
                if (prev) sel.value = prev;
                refreshPttGroupPreview();
            }
            if (Array.isArray(groupsPayload)) {
                fill(groupsPayload);
                return;
            }
            fetch('/api/dispatch-groups').then(function (r) { return r.json(); }).then(function (data) {
                if (data && data.ok) fill(data.groups || []);
            }).catch(function () { /* ignore */ });
        }
        window.refreshPttGroupSelect = refreshPttGroupSelect;

        function setPttGroupStatus(text, active) {
            var el = document.getElementById('ptt-group-status');
            if (!el) return;
            el.textContent = text || '';
            el.classList.toggle('active', !!active);
        }

        function joinDispatchPttGroup() {
            syncPttGroupPickFromSource();
            var pick = pttGroupPickCamIds.slice();
            if (pick.length < 2) {
                alert(dashboardTr('ptt.groupBox.pickNeedTwoAlert'));
                return;
            }
            var sel = document.getElementById('ptt-group-select');
            var groupId = sel && sel.value;
            var body = { camIds: pick };
            if (groupId) body.groupId = groupId;
            fetch('/api/dispatch-ptt-group', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify(body),
            }).then(function (r) { return r.json(); }).then(function (data) {
                if (data && data.ok && data.pttTeam && data.pttTeam.team) {
                    global.activeDispatchPttTeam = data.pttTeam.team.slice();
                    if (global.VideoWall && VideoWall.setDispatchPttTeam) {
                        VideoWall.setDispatchPttTeam(data.pttTeam.team);
                    }
                    var label = data.pttTeam.groupName
                        || dashboardTr('ptt.groupBox.quickName', { n: data.pttTeam.team.length });
                    setPttGroupStatus(
                        dashboardTr('ptt.groupBox.active', { name: label, n: data.pttTeam.team.length }),
                        true
                    );
                    refreshPttGroupPreview();
                } else {
                    alert((data && data.error) || dashboardTr('ptt.groupBox.failed'));
                }
            }).catch(function () { alert(dashboardTr('ptt.groupBox.failed')); });
        }

        function ungroupDispatchPtt() {
            fetch('/api/ptt-restore-always-on', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ source: 'dispatch' }),
            }).then(function (r) { return r.json(); }).then(function (data) {
                global.activeDispatchPttTeam = null;
                if (global.VideoWall && VideoWall.clearDispatchPttTeam) {
                    VideoWall.clearDispatchPttTeam(false);
                }
                setPttGroupStatus(
                    data && data.ok ? dashboardTr('ptt.groupBox.ungrouped') : dashboardTr('ptt.groupBox.ungroupFailed'),
                    false
                );
                refreshPttGroupPreview();
            }).catch(function () {
                setPttGroupStatus(dashboardTr('ptt.groupBox.ungroupFailed'), false);
            });
        }

        function openMapPopout() {
            var url = window.location.pathname + '?popout=map';
            var features = 'width=1920,height=1080,menubar=no,toolbar=no,location=no,status=no,resizable=yes';
            window.open(url, 'mobility-map-wall', features);
            if (typeof MapPopoutSync !== 'undefined') {
                setTimeout(function () { MapPopoutSync.publishDebounced(); }, 600);
                setTimeout(function () { MapPopoutSync.publish(); }, 1500);
            }
        }
        window.openMapPopout = openMapPopout;

        function loadDispatchGroupsForMap() {
            return fetch('/api/dispatch-groups').then(function (r) { return r.json(); }).then(function (data) {
                if (data && data.ok && data.lookup) window.dispatchGroupLookup = data.lookup;
                if (data && data.ok && typeof refreshPttGroupSelect === 'function') {
                    refreshPttGroupSelect(data.groups || []);
                }
                if (typeof updateMapPinLegend === 'function') updateMapPinLegend();
            }).catch(function () { /* ignore */ });
        }
        window.loadDispatchGroupsForMap = loadDispatchGroupsForMap;

        function showMapGroupMembers(groupName) {
            var lk = window.dispatchGroupLookup || {};
            var groups = (window.DispatchGroupsAdmin && DispatchGroupsAdmin.fetchGroups)
                ? null
                : null;
            fetch('/api/dispatch-groups').then(function (r) { return r.json(); }).then(function (data) {
                if (!data.ok) return;
                var g = (data.groups || []).find(function (x) {
                    return String(x.name).toLowerCase() === String(groupName || '').toLowerCase();
                });
                if (!g) return;
                var backdrop = document.getElementById('ss-group-view-backdrop');
                var title = document.getElementById('ss-group-view-title');
                var body = document.getElementById('ss-group-view-body');
                if (!backdrop || !body) return;
                if (title) title.textContent = g.name;
                body.innerHTML = '<ul class="ss-group-view-list">' + (g.members || []).map(function (m) {
                    var st = m.online ? 'Online' : 'Offline';
                    return '<li><span class="ss-group-dot" style="background:' + g.color + '"></span><strong>' +
                        escapePinText(m.nickname || '—') + '</strong>' +
                        (m.deviceId ? ' <code>' + escapePinText(m.deviceId) + '</code>' : '') +
                        ' <span class="hint">(' + st + ')</span></li>';
                }).join('') + '</ul>';
                backdrop.hidden = false;
            }).catch(function () { /* ignore */ });
        }

        function pinMetaForCam(camId, alarmKind, isOnline) {
            var operator = '';
            var mapGroup = '';
            if (typeof BwcDevices !== 'undefined' && BwcDevices.findByDeviceId) {
                var rec = BwcDevices.findByDeviceId(camId);
                if (rec) {
                    operator = rec.operatorName || '';
                    mapGroup = rec.mapGroup || '';
                }
            }
            var fleetName = '';
            if (typeof FleetUi !== 'undefined' && FleetUi.getDeviceName) {
                fleetName = FleetUi.getDeviceName(camId) || '';
            }
            var label = operator || fleetName || '';
            if (!label && typeof FleetDisplay !== 'undefined') label = FleetDisplay.friendlyDeviceName(camId);
            else if (!label) label = camId ? ('BWC #' + camId.slice(-4)) : 'BWC';
            var offline = isOnline === false && !alarmKind;
            var color;
            if (alarmKind === 'fall') {
                color = '#F59E0B';
                if (label.indexOf('FALL') !== 0) label = 'FALL · ' + label;
            } else if (alarmKind === 'sos') {
                color = '#FF3333';
                if (label.indexOf('SOS') !== 0) label = 'SOS · ' + label;
            } else if (offline) {
                color = '#94a3b8';
            } else {
                var dgColor = dispatchColorForCam(camId, mapGroup);
                color = dgColor || brightColorForKey(mapGroup || operator || camId);
            }
            var geofenceOutside = !alarmKind && isCamGeofenceOutside(camId);
            if (geofenceOutside) {
                color = '#f97316';
                var outLbl = dashboardTr('map.pin.geofenceOut');
                if (label.indexOf(outLbl) !== 0) label = outLbl + ' · ' + label;
            }
            return { label: label, color: color, mapGroup: mapGroup, alarmKind: alarmKind || null, offline: offline, geofenceOutside: geofenceOutside };
        }

        function isCamGeofenceOutside(camId) {
            return !!geofenceOutsideByCam[normalizeCamId(camId)];
        }

        function setCamGeofenceOutside(camId, outside) {
            var id = normalizeCamId(camId);
            if (!id) return;
            if (outside) geofenceOutsideByCam[id] = true;
            else delete geofenceOutsideByCam[id];
            if (typeof refreshAllDeviceMarkerStyles === 'function') refreshAllDeviceMarkerStyles();
        }

        function isDevicePinMarker(marker) {
            if (!marker) return false;
            for (var id in deviceMarkers) {
                if (deviceMarkers[id] === marker) return true;
            }
            return false;
        }

        function pinDistanceMeters(lat1, lon1, lat2, lon2) {
            var r = 6371000;
            var p1 = lat1 * Math.PI / 180;
            var p2 = lat2 * Math.PI / 180;
            var dLat = (lat2 - lat1) * Math.PI / 180;
            var dLon = (lon2 - lon1) * Math.PI / 180;
            var a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(p1) * Math.cos(p2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
            return 2 * r * Math.asin(Math.sqrt(a));
        }

        function getOpenPinCamIds() {
            return Object.keys(deviceMarkers).filter(function (id) {
                var m = deviceMarkers[id];
                return m && m.isPopupOpen && m.isPopupOpen();
            });
        }
        window.getOpenPinCamIds = getOpenPinCamIds;

        function mapMirrorGetState() {
            if (!map) return null;
            var c = map.getCenter();
            var openPins = getOpenPinCamIds().map(function (id) { return normalizeCamId(id); });
            var sel = null;
            if (typeof FleetUi !== 'undefined' && FleetUi.getSelectedCamId) {
                sel = normalizeCamId(FleetUi.getSelectedCamId());
            }
            var minimizedPins = [];
            openPins.forEach(function (id) {
                var root = mapPopupRootForCam(id);
                if (root && root.classList.contains('pin-popup-minimized')) minimizedPins.push(id);
            });
            return {
                v: 1,
                type: 'mirror',
                center: [c.lat, c.lng],
                zoom: map.getZoom(),
                openPins: openPins,
                selectedCamId: sel || null,
                minimizedPins: minimizedPins,
                at: Date.now(),
            };
        }

        function mapMirrorApplyState(state) {
            if (!state || state.type !== 'mirror' || !map || !window.mapPopoutMirrorActive) return;
            window.mapPopoutMirrorApplying = true;
            try {
                if (state.center && state.center.length >= 2 && state.zoom != null) {
                    map.setView(state.center, state.zoom, { animate: false, duration: 0 });
                }
                popoutMirrorSelectedCamId = state.selectedCamId ? normalizeCamId(state.selectedCamId) : null;
                var desired = (state.openPins || []).map(function (id) { return normalizeCamId(id); });
                var desiredSet = {};
                desired.forEach(function (id) { desiredSet[id] = true; });
                getOpenPinCamIds().slice().forEach(function (id) {
                    var nid = normalizeCamId(id);
                    if (!desiredSet[nid] && deviceMarkers[nid]) {
                        try { deviceMarkers[nid].closePopup(); } catch (_) { /* ignore */ }
                    }
                });
                desired.forEach(function (id) {
                    var m = deviceMarkers[id];
                    if (!m) return;
                    if (!m.isPopupOpen || !m.isPopupOpen()) {
                        try { m.openPopup(); } catch (_) { /* ignore */ }
                    }
                    var root = mapPopupRootForCam(id);
                    if (root) {
                        var min = (state.minimizedPins || []).indexOf(id) >= 0;
                        root.classList.toggle('pin-popup-minimized', min);
                        var minBtn = root.querySelector('.map-pin-minimize');
                        if (minBtn) {
                            minBtn.textContent = min ? '+' : '−';
                        }
                    }
                });
                refreshAllDeviceMarkerStyles();
                assignColocatedPinPopupDocks();
            } finally {
                window.mapPopoutMirrorApplying = false;
            }
        }

        function offsetLatLngMeters(lat, lon, bearingDeg, distM) {
            var R = 6378137;
            var br = bearingDeg * Math.PI / 180;
            var lat1 = lat * Math.PI / 180;
            var lon1 = lon * Math.PI / 180;
            var lat2 = Math.asin(Math.sin(lat1) * Math.cos(distM / R)
                + Math.cos(lat1) * Math.sin(distM / R) * Math.cos(br));
            var lon2 = lon1 + Math.atan2(
                Math.sin(br) * Math.sin(distM / R) * Math.cos(lat1),
                Math.cos(distM / R) - Math.sin(lat1) * Math.sin(lat2)
            );
            return { lat: lat2 * 180 / Math.PI, lon: lon2 * 180 / Math.PI };
        }

        function clusterAllPinCamIdsByGps() {
            var ids = Object.keys(deviceMarkers);
            var clusters = [];
            var remaining = ids.slice();
            while (remaining.length) {
                var seed = remaining.shift();
                var m = deviceMarkers[seed];
                if (!m) continue;
                var ll = m._gpsLatLng || m.getLatLng();
                var cluster = [{ id: seed, lat: ll.lat, lon: ll.lng }];
                for (var i = remaining.length - 1; i >= 0; i--) {
                    var otherId = remaining[i];
                    var mo = deviceMarkers[otherId];
                    if (!mo) { remaining.splice(i, 1); continue; }
                    var lo = mo._gpsLatLng || mo.getLatLng();
                    if (pinDistanceMeters(ll.lat, ll.lng, lo.lat, lo.lng) <= PIN_COLOC_CLUSTER_M) {
                        cluster.push({ id: otherId, lat: lo.lat, lon: lo.lng });
                        remaining.splice(i, 1);
                    }
                }
                cluster.sort(function (a, b) { return a.id.localeCompare(b.id); });
                clusters.push(cluster);
            }
            return clusters;
        }

        function markerGpsLatLng(marker) {
            if (!marker) return null;
            return marker._gpsLatLng || marker.getLatLng();
        }

        function clusterKeyForIds(cluster) {
            return (cluster || []).map(function (id) { return normalizeCamId(id); }).sort().join('|');
        }

        function friendlyPinName(camId) {
            if (typeof FleetDisplay !== 'undefined' && FleetDisplay.friendlyDeviceName) {
                return FleetDisplay.friendlyDeviceName(camId) || camId;
            }
            return camId;
        }

        function ensureClusterShiftBar(camId, cluster, clusterId) {
            var root = mapPopupRootForCam(camId);
            if (!root || !cluster || cluster.length < 2) return;
            var head = root.querySelector('.map-popup-head');
            if (!head) return;
            var idx = -1;
            for (var i = 0; i < cluster.length; i++) {
                if (normalizeCamId(cluster[i]) === normalizeCamId(camId)) { idx = i; break; }
            }
            if (idx < 0) idx = 0;
            var bar = head.querySelector('.map-pin-cluster-shift');
            if (!bar) {
                bar = document.createElement('div');
                bar.className = 'map-pin-cluster-shift';
                bar.innerHTML = '<button type="button" class="map-pin-cluster-prev" title="' + dashboardTr('map.clusterPrev') + '">‹</button>' +
                    '<span class="map-pin-cluster-label"></span>' +
                    '<button type="button" class="map-pin-cluster-next" title="' + dashboardTr('map.clusterNext') + '">›</button>';
                head.insertBefore(bar, head.firstChild);
            }
            bar.setAttribute('data-cluster', clusterId);
            var label = bar.querySelector('.map-pin-cluster-label');
            if (label) label.textContent = (idx + 1) + '/' + cluster.length + ' · ' + friendlyPinName(camId);
        }

        function collapseClusterMarkersToGps(cluster) {
            var cLat = 0;
            var cLon = 0;
            var n = 0;
            cluster.forEach(function (camId) {
                var ll = markerGpsLatLng(deviceMarkers[camId]);
                if (!ll) return;
                cLat += ll.lat;
                cLon += ll.lng;
                n += 1;
            });
            if (!n) return;
            cLat /= n;
            cLon /= n;
            var ck = clusterKeyForIds(cluster);
            var active = pinClusterActiveCam[ck] || cluster[0];
            cluster.forEach(function (camId, i) {
                var m = deviceMarkers[camId];
                if (!m) return;
                m.setLatLng([cLat, cLon]);
                if (m.setZIndexOffset) {
                    m.setZIndexOffset(normalizeCamId(camId) === normalizeCamId(active) ? 1400 : (1200 + i));
                }
            });
        }

        /** Cycle focus among colocated open pins — all popups stay open (no single-popup collapse). */
        function shiftPinCluster(clusterId, delta) {
            if (!clusterId) return;
            var ids = clusterId.split('|').filter(Boolean);
            var open = getOpenPinCamIds();
            var cluster = ids.filter(function (id) {
                return open.some(function (o) { return normalizeCamId(o) === normalizeCamId(id); });
            });
            if (cluster.length < 2) cluster = ids;
            if (cluster.length < 2) return;
            var active = pinClusterActiveCam[clusterId] || cluster[0];
            var idx = 0;
            for (var i = 0; i < cluster.length; i++) {
                if (normalizeCamId(cluster[i]) === normalizeCamId(active)) { idx = i; break; }
            }
            idx = (idx + delta + cluster.length) % cluster.length;
            active = cluster[idx];
            pinClusterActiveCam[clusterId] = active;
            bringPinPopupToFront(active);
        }

        function setPinClusterActive(camId) {
            bringPinPopupToFront(camId);
        }
        window.setPinClusterActive = setPinClusterActive;

        var PIN_DOCK_SPREAD_BEARING = {
            left: 270,
            right: 90,
            top: 0,
            bottom: 180,
            'diag-left': 315,
            'diag-right': 45
        };

        /** Colocated pins: pixel spread from GPS centroid (zoom-stable). Popups fan from same center. */
        function clusterCenterLayerPoint(cluster) {
            var center = clusterCenterLatLng(cluster);
            if (!center || !map) return null;
            return map.latLngToLayerPoint(center);
        }

        function layerPointDistance(a, b) {
            if (!a || !b) return Infinity;
            var dx = a.x - b.x;
            var dy = a.y - b.y;
            return Math.sqrt(dx * dx + dy * dy);
        }

        function mergeOpenPinClustersForScreen(clusters, open) {
            if (!map || !open || open.length < 2) return clusters;
            var pts = open.map(function (id) {
                var m = deviceMarkers[id];
                if (!m) return null;
                return map.latLngToLayerPoint(m._gpsLatLng || m.getLatLng());
            }).filter(Boolean);
            if (pts.length < 2) return clusters;
            var maxDist = 0;
            for (var i = 0; i < pts.length; i++) {
                for (var j = i + 1; j < pts.length; j++) {
                    maxDist = Math.max(maxDist, layerPointDistance(pts[i], pts[j]));
                }
            }
            if (maxDist > PIN_COLOC_SCREEN_PX) return clusters;
            var merged = open.slice().sort(function (a, b) {
                if (typeof VideoConfig !== 'undefined' && VideoConfig.findChannelByDeviceId) {
                    var cha = VideoConfig.findChannelByDeviceId(a);
                    var chb = VideoConfig.findChannelByDeviceId(b);
                    if (cha && chb && cha.slot !== chb.slot) return cha.slot - chb.slot;
                }
                var la = markerGpsLatLng(deviceMarkers[a]);
                var lb = markerGpsLatLng(deviceMarkers[b]);
                if (!la || !lb) return String(a).localeCompare(String(b));
                return la.lng - lb.lng;
            });
            return [merged];
        }

        function purgeOrphanPinPopups() {
            var open = getOpenPinCamIds().map(function (id) { return normalizeCamId(id); });
            var allowed = Object.create(null);
            open.forEach(function (id) { allowed[id] = true; });
            document.querySelectorAll('.leaflet-popup-pane .leaflet-popup').forEach(function (el) {
                var root = el.querySelector('.map-popup[data-cam-id]');
                var cid = root && normalizeCamId(root.getAttribute('data-cam-id'));
                if (!cid || !allowed[cid]) {
                    if (el.parentNode) el.parentNode.removeChild(el);
                }
            });
        }

        function colocatedMapClusterForCam(camId) {
            camId = normalizeCamId(camId);
            if (!camId) return [];
            var found = null;
            clusterAllPinCamIdsByGps().forEach(function (gpsCluster) {
                var ids = gpsCluster.map(function (e) { return e.id; }).filter(function (id) { return deviceMarkers[id]; });
                if (ids.some(function (id) { return normalizeCamId(id) === camId; })) found = ids.slice();
            });
            if (!found || found.length < 2) return found || [camId];
            if (found.length === 2) {
                found.sort(function (a, b) {
                    var la = markerGpsLatLng(deviceMarkers[a]);
                    var lb = markerGpsLatLng(deviceMarkers[b]);
                    if (!la || !lb) return String(a).localeCompare(String(b));
                    return la.lng - lb.lng;
                });
            } else {
                found.sort(function (a, b) { return String(a).localeCompare(String(b)); });
            }
            var merged = mergeOpenPinClustersForScreen([found], found);
            return (merged && merged[0] && merged[0].length >= 2) ? merged[0] : found;
        }

        function spreadStableColocatedMarkers() {
            var spreadIds = Object.create(null);
            var processed = Object.create(null);
            clusterAllPinCamIdsByGps().forEach(function (gpsCluster) {
                var seed = gpsCluster[0] && gpsCluster[0].id;
                if (!seed) return;
                var cluster = colocatedMapClusterForCam(seed);
                if (cluster.length < 2) return;
                var key = cluster.map(function (id) { return normalizeCamId(id); }).sort().join('|');
                if (processed[key]) return;
                processed[key] = true;
                var centerPt = clusterCenterLayerPoint(cluster);
                if (!centerPt) return;
                var distPx = Math.max(58, 38 + cluster.length * 14);
                assignClusterDockPlans(cluster).forEach(function (plan) {
                    var mk = deviceMarkers[plan.camId];
                    if (!mk) return;
                    var bearing = PIN_DOCK_SPREAD_BEARING[plan.side];
                    if (bearing == null) bearing = (360 / cluster.length) * plan.dockIdx;
                    var rad = bearing * Math.PI / 180;
                    var dx = Math.sin(rad) * distPx;
                    var dy = -Math.cos(rad) * distPx;
                    var pt = L.point(centerPt.x + dx, centerPt.y + dy);
                    mk.setLatLng(map.layerPointToLatLng(pt));
                    if (mk.setZIndexOffset) mk.setZIndexOffset(1200 + plan.dockIdx);
                    spreadIds[normalizeCamId(plan.camId)] = true;
                });
            });
            Object.keys(deviceMarkers).forEach(function (camId) {
                if (spreadIds[normalizeCamId(camId)]) return;
                var mk = deviceMarkers[camId];
                if (mk && mk._gpsLatLng) mk.setLatLng(mk._gpsLatLng);
            });
        }

        function bringPinPopupToFront(camId) {
            camId = normalizeCamId(camId);
            var m = deviceMarkers[camId];
            if (!m) return;
            if (m.bringToFront) m.bringToFront();
            if (m.setZIndexOffset) m.setZIndexOffset(1500);
            var popup = m.getPopup && m.getPopup();
            var el = popup && popup.getElement && popup.getElement();
            if (el) el.style.zIndex = '960';
            if (popup && popup._updatePosition) popup._updatePosition();
            if (stackedClusterContaining(camId)) setStackDragFocusCamId(camId);
        }
        window.bringPinPopupToFront = bringPinPopupToFront;

        function stackedClusterContaining(camId) {
            camId = normalizeCamId(camId);
            var clusters = clusterOpenPinCamIds(getOpenPinCamIds());
            for (var i = 0; i < clusters.length; i++) {
                if (clusters[i].length < 2) continue;
                if (clusters[i].some(function (id) { return normalizeCamId(id) === camId; })) return clusters[i];
            }
            return null;
        }

        function canDragStackedPinPopup(camId) {
            camId = normalizeCamId(camId);
            var cluster = stackedClusterContaining(camId);
            if (!cluster || cluster.length < 2) return true;
            if (!stackDragFocusCamId) return false;
            return normalizeCamId(stackDragFocusCamId) === camId;
        }

        function syncStackHudChipActive() {
            var focus = stackDragFocusCamId ? normalizeCamId(stackDragFocusCamId) : null;
            document.querySelectorAll('.map-pin-stack-hud-chip').forEach(function (c) {
                var cid = normalizeCamId(c.getAttribute('data-cam-id'));
                c.classList.toggle('active', focus !== null && cid === focus);
            });
        }

        function syncStackDragFocusUi(clusters) {
            clusters = clusters || clusterOpenPinCamIds(getOpenPinCamIds());
            var stackedByCam = Object.create(null);
            clusters.forEach(function (cluster) {
                if (cluster.length < 2) return;
                cluster.forEach(function (id) { stackedByCam[normalizeCamId(id)] = true; });
            });
            var focus = stackDragFocusCamId ? normalizeCamId(stackDragFocusCamId) : null;
            getOpenPinCamIds().forEach(function (camId) {
                var id = normalizeCamId(camId);
                var el = popupLeafletElForCam(id);
                if (!el || !el.classList.contains('map-pin-popup-stackable')) return;
                var inLockedStack = !!stackedByCam[id];
                el.classList.toggle('map-pin-popup-drag-focus', inLockedStack && focus === id);
                el.classList.toggle('map-pin-popup-drag-locked', inLockedStack && focus !== id);
            });
        }

        function setStackDragFocusCamId(camId) {
            stackDragFocusCamId = camId ? normalizeCamId(camId) : null;
            syncStackHudChipActive();
            syncStackDragFocusUi();
        }

        function clusterOpenPinCamIds(camIds) {
            if (!camIds || !camIds.length) return [];
            var openSet = {};
            camIds.forEach(function (id) { openSet[normalizeCamId(id)] = true; });
            var clusters = [];
            var assigned = {};
            clusterAllPinCamIdsByGps().forEach(function (gpsCluster) {
                var openInCluster = [];
                gpsCluster.forEach(function (e) {
                    var nid = normalizeCamId(e.id);
                    if (openSet[nid] && deviceMarkers[e.id]) {
                        openInCluster.push(e.id);
                        assigned[nid] = true;
                    }
                });
                if (openInCluster.length) clusters.push(openInCluster);
            });
            camIds.forEach(function (id) {
                var nid = normalizeCamId(id);
                if (!assigned[nid] && deviceMarkers[id]) clusters.push([id]);
            });
            clusters.forEach(function (cluster) {
                if (cluster.length === 2) {
                    cluster.sort(function (a, b) {
                        var ma = deviceMarkers[a];
                        var mb = deviceMarkers[b];
                        var la = ma && (ma._gpsLatLng || ma.getLatLng());
                        var lb = mb && (mb._gpsLatLng || mb.getLatLng());
                        if (!la || !lb) return String(a).localeCompare(String(b));
                        return la.lng - lb.lng;
                    });
                } else if (cluster.length > 2) {
                    cluster.sort(function (a, b) { return String(a).localeCompare(String(b)); });
                }
            });
            return mergeOpenPinClustersForScreen(clusters, camIds);
        }

        var PIN_POPUP_DOCK_SLOTS = {
            1: [{ side: 'right' }],
            2: [{ side: 'left' }, { side: 'right' }],
            3: [{ side: 'left' }, { side: 'right' }, { side: 'top' }],
            4: [{ side: 'left' }, { side: 'right' }, { side: 'top' }, { side: 'bottom' }],
            5: [{ side: 'left' }, { side: 'right' }, { side: 'top' }, { side: 'bottom' }, { side: 'diag-left' }],
            6: [{ side: 'left' }, { side: 'right' }, { side: 'top' }, { side: 'bottom' }, { side: 'diag-left' }, { side: 'diag-right' }],
            7: [{ side: 'left' }, { side: 'right' }, { side: 'top' }, { side: 'bottom' }, { side: 'diag-left' }, { side: 'diag-right' }, { side: 'left' }],
            8: [{ side: 'left' }, { side: 'right' }, { side: 'top' }, { side: 'bottom' }, { side: 'diag-left' }, { side: 'diag-right' }, { side: 'left' }, { side: 'right' }],
        };

        function sortClusterForDock(cluster) {
            if (cluster.length === 2) {
                return cluster.slice().sort(function (a, b) {
                    if (typeof VideoConfig !== 'undefined' && VideoConfig.findChannelByDeviceId) {
                        var cha = VideoConfig.findChannelByDeviceId(a);
                        var chb = VideoConfig.findChannelByDeviceId(b);
                        if (cha && chb && cha.slot !== chb.slot) return cha.slot - chb.slot;
                    }
                    var la = markerGpsLatLng(deviceMarkers[a]);
                    var lb = markerGpsLatLng(deviceMarkers[b]);
                    if (!la || !lb) return String(a).localeCompare(String(b));
                    return la.lng - lb.lng;
                });
            }
            var cLat = 0;
            var cLon = 0;
            var n = 0;
            cluster.forEach(function (camId) {
                var ll = markerGpsLatLng(deviceMarkers[camId]);
                if (!ll) return;
                cLat += ll.lat;
                cLon += ll.lng;
                n += 1;
            });
            if (!n) return cluster.slice();
            cLat /= n;
            cLon /= n;
            return cluster.slice().sort(function (a, b) {
                var la = markerGpsLatLng(deviceMarkers[a]);
                var lb = markerGpsLatLng(deviceMarkers[b]);
                if (!la || !lb) return String(a).localeCompare(String(b));
                return Math.atan2(la.lat - cLat, la.lng - cLon) - Math.atan2(lb.lat - cLat, lb.lng - cLon);
            });
        }

        function assignClusterDockPlans(cluster) {
            if (!cluster || !cluster.length) return [];
            var slots = PIN_POPUP_DOCK_SLOTS[Math.min(cluster.length, MAX_OPEN_PIN_POPUPS)] || PIN_POPUP_DOCK_SLOTS[1];
            var sorted = sortClusterForDock(cluster);
            return sorted.map(function (camId, idx) {
                var slot = slots[idx] || slots[slots.length - 1];
                return { camId: camId, side: slot.side, ring: 0, dockIdx: idx };
            });
        }

        function camIdForMarker(marker) {
            if (!marker) return null;
            for (var id in deviceMarkers) {
                if (deviceMarkers[id] === marker) return id;
            }
            return null;
        }

        function clusterCenterLatLng(cluster) {
            if (!cluster || cluster.length < 2) return null;
            var cLat = 0;
            var cLon = 0;
            var n = 0;
            cluster.forEach(function (camId) {
                var ll = markerGpsLatLng(deviceMarkers[camId]);
                if (!ll) return;
                cLat += ll.lat;
                cLon += ll.lng;
                n += 1;
            });
            if (!n) return null;
            return L.latLng(cLat / n, cLon / n);
        }

        function clusterMetaForOpenCam(camId) {
            camId = normalizeCamId(camId);
            if (!camId) return null;
            var clusters = clusterOpenPinCamIds(getOpenPinCamIds());
            for (var i = 0; i < clusters.length; i++) {
                var cluster = clusters[i];
                if (cluster.length < 2) continue;
                if (!cluster.some(function (id) { return normalizeCamId(id) === camId; })) continue;
                var center = clusterCenterLatLng(cluster);
                return center ? { center: center, size: cluster.length } : null;
            }
            var mapCluster = colocatedMapClusterForCam(camId);
            if (mapCluster.length >= 2) {
                var mapCenter = clusterCenterLatLng(mapCluster);
                return mapCenter ? { center: mapCenter, size: mapCluster.length } : null;
            }
            return null;
        }

        function attachPinPopupDockForCam(marker, camId) {
            camId = normalizeCamId(camId || camIdForMarker(marker));
            if (!marker || !camId) return;
            attachPinPopupDockLayout(
                marker,
                pinPopupDockSide[camId] || 'right',
                pinPopupDockRing[camId] || 0,
                pinPopupDockIdx[camId] || 0,
                clusterMetaForOpenCam(camId)
            );
        }

        function removeClusterShiftBars(openIds) {
            (openIds || getOpenPinCamIds()).forEach(function (camId) {
                var root = mapPopupRootForCam(camId);
                if (!root) return;
                var bar = root.querySelector('.map-pin-cluster-shift');
                if (bar) bar.remove();
                var stackBar = root.querySelector('.map-pin-stack-toolbar');
                if (stackBar) stackBar.remove();
            });
        }

        function popupLeafletElForCam(camId) {
            var m = deviceMarkers[camId];
            if (!m) return null;
            var popup = m.getPopup && m.getPopup();
            return popup && popup.getElement && popup.getElement();
        }

        function popupRectsOverlap(elA, elB) {
            if (!elA || !elB) return false;
            var a = elA.getBoundingClientRect();
            var b = elB.getBoundingClientRect();
            var pad = 12;
            return !(a.right - pad < b.left + pad || a.left + pad > b.right - pad
                || a.bottom - pad < b.top + pad || a.top + pad > b.bottom - pad);
        }

        function clusterPopupsOverlap(cluster) {
            for (var i = 0; i < cluster.length; i++) {
                for (var j = i + 1; j < cluster.length; j++) {
                    if (popupRectsOverlap(
                        popupLeafletElForCam(cluster[i]),
                        popupLeafletElForCam(cluster[j])
                    )) return true;
                }
            }
            return false;
        }

        function ensureStackPopupToolbar(camId, cluster, clusterId, idx, overlapping) {
            /* Toolbar moved to #map-pin-stack-hud — always visible above overlapping popups. */
        }

        function autoFanStackedPopups(cluster) {
            if (!cluster || cluster.length < 2) return;
            if (cluster.length === 2) return;
            var hasUserDrag = cluster.some(function (camId) {
                return !!pinPopupUserMoved[normalizeCamId(camId)];
            });
            if (hasUserDrag) return;
            repositionAllOpenPinPopupsMeasured();
            if (!clusterPopupsOverlap(cluster)) return;
            var fanDist = 340;
            var yStep = 36;
            cluster.forEach(function (camId, idx) {
                camId = normalizeCamId(camId);
                if (cluster.length === 2) {
                    pinPopupDragOffset[camId] = {
                        x: idx === 0 ? -fanDist : fanDist,
                        y: idx === 0 ? -yStep : yStep,
                    };
                } else {
                    var bear = [315, 45, 225, 135, 270, 90][idx % 6];
                    var rad = bear * Math.PI / 180;
                    pinPopupDragOffset[camId] = {
                        x: Math.round(Math.sin(rad) * fanDist),
                        y: Math.round(-Math.cos(rad) * fanDist * 0.38),
                    };
                }
            });
        }

        function updateMapPinStackHud(open, clusters) {
            var hud = document.getElementById('map-pin-stack-hud');
            if (!hud) return;
            open = open || getOpenPinCamIds();
            clusters = clusters || clusterOpenPinCamIds(open);
            var stackedCluster = null;
            clusters.forEach(function (cluster) {
                if (cluster.length >= 2 && !stackedCluster) stackedCluster = cluster;
            });
            if (!stackedCluster) {
                hud.hidden = true;
                hud.removeAttribute('data-cluster');
                var chips = hud.querySelector('.map-pin-stack-hud-chips');
                if (chips) chips.innerHTML = '';
                stackDragFocusCamId = null;
                return;
            }
            repositionAllOpenPinPopupsMeasured();
            var clusterId = clusterKeyForIds(stackedCluster);
            var overlapping = clusterPopupsOverlap(stackedCluster);
            var focusNorm = stackDragFocusCamId ? normalizeCamId(stackDragFocusCamId) : null;
            var focusInCluster = focusNorm && stackedCluster.some(function (id) {
                return normalizeCamId(id) === focusNorm;
            });
            if (!focusInCluster) {
                stackDragFocusCamId = normalizeCamId(stackedCluster[0]);
                focusNorm = stackDragFocusCamId;
            }
            hud.hidden = false;
            hud.setAttribute('data-cluster', clusterId);
            var label = hud.querySelector('.map-pin-stack-hud-label');
            if (label) {
                var stackHint = dashboardTr('map.pinStackSelectDrag');
                if (!stackHint || stackHint === 'map.pinStackSelectDrag') {
                    stackHint = 'Select chip, then drag that header';
                }
                label.textContent = overlapping
                    ? ('Overlapping (' + stackedCluster.length + ') — ' + stackHint)
                    : ('Stacked nearby (' + stackedCluster.length + ') — ' + stackHint);
            }
            var chipsEl = hud.querySelector('.map-pin-stack-hud-chips');
            if (chipsEl) {
                chipsEl.innerHTML = stackedCluster.map(function (camId) {
                    var name = friendlyPinName(camId);
                    var nid = normalizeCamId(camId);
                    var active = nid === focusNorm ? ' active' : '';
                    return '<button type="button" class="map-pin-stack-hud-chip' + active +
                        '" data-cam-id="' + escapePinText(nid) + '" title="' + escapePinText(dashboardTr('map.bringToFront')) + '">' +
                        escapePinText(name) + '</button>';
                }).join('');
            }
        }

        function beginPinPopupDrag(ev, camId, popup, el) {
            if (!camId || !popup || !el) return;
            pinPopupDragSession = true;
            pinPopupUserMoved[camId] = true;
            var startX = ev.clientX;
            var startY = ev.clientY;
            var base = pinPopupDragOffset[camId] || { x: 0, y: 0 };
            el.classList.add('map-pin-popup-user-moved');
            bringPinPopupToFront(camId);
            document.body.classList.add('map-pin-popup-dragging');
            function blockSelect(blockEv) { blockEv.preventDefault(); }
            document.addEventListener('selectstart', blockSelect);
            document.addEventListener('dragstart', blockSelect);
            function onMove(moveEv) {
                if (moveEv.cancelable) moveEv.preventDefault();
                pinPopupDragOffset[camId] = {
                    x: base.x + (moveEv.clientX - startX),
                    y: base.y + (moveEv.clientY - startY),
                };
                if (popup._updatePosition) popup._updatePosition();
            }
            function onUp() {
                pinPopupDragSession = false;
                document.body.classList.remove('map-pin-popup-dragging');
                document.removeEventListener('selectstart', blockSelect);
                document.removeEventListener('dragstart', blockSelect);
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                document.removeEventListener('touchmove', onMove);
                document.removeEventListener('touchend', onUp);
                document.removeEventListener('touchcancel', onUp);
                if (map && map.dragging) map.dragging.enable();
            }
            if (map && map.dragging) map.dragging.disable();
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
            document.addEventListener('touchmove', onMove, { passive: false });
            document.addEventListener('touchend', onUp);
            document.addEventListener('touchcancel', onUp);
        }

        function initMapPinStackHudEvents() {
            if (window._mapPinStackHudInit) return;
            window._mapPinStackHudInit = true;
            document.addEventListener('click', function (e) {
                var chip = e.target.closest('.map-pin-stack-hud-chip');
                if (chip) {
                    e.preventDefault();
                    e.stopPropagation();
                    var camId = chip.getAttribute('data-cam-id');
                    if (camId) {
                        setStackDragFocusCamId(camId);
                        bringPinPopupToFront(camId);
                    }
                    return;
                }
                var hudReset = e.target.closest('.map-pin-stack-hud-reset');
                if (hudReset) {
                    var hud = document.getElementById('map-pin-stack-hud');
                    var clusterId = hud && hud.getAttribute('data-cluster');
                    if (clusterId) {
                        e.preventDefault();
                        e.stopPropagation();
                        resetStackedPinPopupLayout(clusterId);
                    }
                }
            }, true);
            document.addEventListener('mousedown', function (e) {
                if (window.mapPopoutMirrorActive) return;
                if (e.button !== 0) return;
                if (e.target.closest('.map-pin-minimize')) return;
                var head = e.target.closest('.map-pin-popup-stackable .map-popup-head');
                if (!head || e.target.closest('#map-pin-stack-hud') || e.target.closest('.map-pin-stack-hud-reset')) return;
                if (e.target.closest('.map-pin-minimize')) return;
                var root = head.closest('.map-popup');
                var camId = root && normalizeCamId(root.getAttribute('data-cam-id'));
                if (!camId) return;
                var m = deviceMarkers[camId];
                if (!m || !m.isPopupOpen || !m.isPopupOpen()) return;
                var popup = m.getPopup();
                var el = popup && popup.getElement && popup.getElement();
                if (!el || !el.classList.contains('map-pin-popup-stackable')) return;
                if (!canDragStackedPinPopup(camId)) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (typeof showMapPinToast === 'function') {
                        showMapPinToast('Select a device chip above, then drag that panel\'s header');
                    }
                    return;
                }
                e.preventDefault();
                e.stopPropagation();
                beginPinPopupDrag(e, camId, popup, el);
            }, true);
            document.addEventListener('touchstart', function (e) {
                if (window.mapPopoutMirrorActive) return;
                if (e.target.closest('.map-pin-minimize')) return;
                var touch = e.changedTouches && e.changedTouches[0];
                if (!touch) return;
                var head = e.target.closest('.map-pin-popup-stackable .map-popup-head');
                if (!head || e.target.closest('#map-pin-stack-hud') || e.target.closest('.map-pin-stack-hud-reset')) return;
                if (e.target.closest('.map-pin-minimize')) return;
                var root = head.closest('.map-popup');
                var camId = root && normalizeCamId(root.getAttribute('data-cam-id'));
                if (!camId) return;
                var m = deviceMarkers[camId];
                if (!m || !m.isPopupOpen || !m.isPopupOpen()) return;
                var popup = m.getPopup();
                var el = popup && popup.getElement && popup.getElement();
                if (!el || !el.classList.contains('map-pin-popup-stackable')) return;
                if (!canDragStackedPinPopup(camId)) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (typeof showMapPinToast === 'function') {
                        showMapPinToast('Select a device chip above, then drag that panel\'s header');
                    }
                    return;
                }
                e.preventDefault();
                e.stopPropagation();
                beginPinPopupDrag(touch, camId, popup, el);
            }, { passive: false, capture: true });
            document.addEventListener('click', function (e) {
                var stopBtn = e.target.closest('.map-pin-stop');
                if (stopBtn && stopBtn.closest('.leaflet-popup-content')) {
                    var stopCamId = normalizeCamId(stopBtn.getAttribute('data-cam-id'));
                    markPinVideoUserStop(stopCamId);
                    if (pinVideoDockSyncTimer) {
                        clearTimeout(pinVideoDockSyncTimer);
                        pinVideoDockSyncTimer = null;
                    }
                }
                var playBtn = e.target.closest('.map-pin-play');
                if (playBtn && playBtn.closest('.leaflet-popup-content')) {
                    clearPinVideoUserStop(normalizeCamId(playBtn.getAttribute('data-cam-id')));
                }
                var minBtn = e.target.closest('.map-pin-minimize');
                if (!minBtn) return;
                e.preventDefault();
                e.stopPropagation();
                var camId = normalizeCamId(minBtn.getAttribute('data-cam-id'));
                var root = mapPopupRootForCam(camId);
                if (!root) return;
                var minimized = root.classList.toggle('pin-popup-minimized');
                minBtn.textContent = minimized ? '+' : '−';
                minBtn.title = dashboardTr(minimized ? 'map.pin.expand' : 'map.pin.minimize');
                minBtn.setAttribute('aria-label', minBtn.title);
                if (!minimized) {
                    clearPinVideoUserStop(camId);
                    if (typeof VideoWall !== 'undefined' && VideoWall.wallHasPlayerForCam && VideoWall.wallHasPlayerForCam(camId)) {
                        syncPinVideoFromWall(camId);
                    } else if (typeof VideoWall !== 'undefined' && VideoWall.playMapPinVideoIfPopupOpen) {
                        VideoWall.playMapPinVideoIfPopupOpen(camId, 0, { forceLive: true });
                    }
                    setTimeout(function () {
                        var mk = deviceMarkers[camId];
                        if (mk && mk.getPopup && mk.getPopup()._updatePosition) mk.getPopup()._updatePosition();
                    }, 30);
                }
            }, true);
        }

        function bindStackedPinPopupDrag(popup, camId) {
            /* Drag wired via initMapPinStackHudEvents delegation. */
        }

        function updateStackedPopupDragUi(open, clusters) {
            open = open || getOpenPinCamIds();
            clusters = clusters || clusterOpenPinCamIds(open);
            open.forEach(function (camId) {
                var id = normalizeCamId(camId);
                var el = popupLeafletElForCam(id);
                if (!el) return;
                el.classList.add('map-pin-popup-stackable');
                el.classList.remove('map-pin-popup-overlap');
                el.classList.toggle('map-pin-popup-user-moved', !!pinPopupUserMoved[id]);
            });
            removeClusterShiftBars(open);
            clusters.forEach(function (cluster) {
                if (cluster.length < 2) return;
                autoFanStackedPopups(cluster);
                var overlapping = clusterPopupsOverlap(cluster);
                cluster.forEach(function (camId) {
                    var m = deviceMarkers[camId];
                    if (!m || !m.isPopupOpen || !m.isPopupOpen()) return;
                    var popup = m.getPopup();
                    var el = popup && popup.getElement && popup.getElement();
                    if (el && overlapping) el.classList.add('map-pin-popup-overlap');
                    if (popup && popup._updatePosition) popup._updatePosition();
                });
            });
            open.forEach(function (camId) {
                var m = deviceMarkers[camId];
                if (!m || !m.isPopupOpen || !m.isPopupOpen()) return;
                var popup = m.getPopup();
                if (popup && popup._updatePosition) popup._updatePosition();
            });
            initMapPinStackHudEvents();
            updateMapPinStackHud(open, clusters);
            syncStackDragFocusUi(clusters);
        }

        function resetStackedPinPopupLayout(clusterId) {
            if (!clusterId) return;
            var ids = clusterId.split('|').filter(Boolean).map(function (id) { return normalizeCamId(id); });
            ids.forEach(function (id) {
                delete pinPopupDragOffset[id];
                delete pinPopupUserMoved[id];
            });
            if (ids.length) stackDragFocusCamId = ids[0];
            assignColocatedPinPopupDocks();
        }

        function attachPinPopupDockLayout(marker, side, ring, dockIdx, clusterMeta) {
            side = side || 'right';
            ring = ring || 0;
            dockIdx = dockIdx || 0;
            var popup = marker && marker.getPopup && marker.getPopup();
            if (!popup) return;
            popup._pinDockSide = side;
            popup._pinDockRing = ring;
            popup._pinDockIdx = dockIdx;
            if (clusterMeta && clusterMeta.center && clusterMeta.size >= 2) {
                popup._pinClusterCenter = clusterMeta.center;
                popup._pinClusterSize = clusterMeta.size;
            } else {
                popup._pinClusterCenter = null;
                popup._pinClusterSize = 0;
            }
            popup._updatePosition = function () {
                if (!this._map || !this._source) return;
                var dock = this._pinDockSide || 'right';
                var el = this.getElement();
                if (el) {
                    el.classList.remove(
                        'map-pin-popup-right', 'map-pin-popup-left', 'map-pin-popup-top', 'map-pin-popup-bottom',
                        'map-pin-popup-diag-left', 'map-pin-popup-diag-right', 'map-pin-popup-dock'
                    );
                    el.classList.add('map-pin-popup-' + dock);
                    el.classList.add('map-pin-popup-dock');
                    el.style.zIndex = String(900 + (this._pinDockIdx || 0) * 140);
                }
                var camId = camIdForMarker(this._source);
                var liveMeta = clusterMetaForOpenCam(camId);
                if (liveMeta && liveMeta.size >= 2) {
                    this._pinClusterCenter = liveMeta.center;
                    this._pinClusterSize = liveMeta.size;
                } else {
                    this._pinClusterCenter = null;
                    this._pinClusterSize = 0;
                }
                var clusterFan = (this._pinClusterSize || 0) >= 2;
                var pt = this._map.latLngToLayerPoint(this._source.getLatLng());
                var w = el && el.offsetWidth >= 40 ? el.offsetWidth : 300;
                var h = el && el.offsetHeight >= 40 ? el.offsetHeight : 280;
                var gap = PIN_DOT_HALF + PIN_POPUP_GAP + PIN_POPUP_TIP_INSET + (clusterFan ? 10 : 0);
                var idx = this._pinDockIdx || 0;
                var yStagger = (clusterFan && this._pinClusterSize === 2)
                    ? (idx === 0 ? -22 : 22) : 0;
                var x = pt.x;
                var y = pt.y;
                if (dock === 'right') {
                    x = pt.x + gap + PIN_LABEL_CLEAR;
                    y = pt.y - h * 0.5 - 8 + yStagger;
                } else if (dock === 'left') {
                    x = pt.x - gap - w - PIN_LABEL_CLEAR;
                    y = pt.y - h * 0.5 - 8 + yStagger;
                } else if (dock === 'top') {
                    x = pt.x - w * 0.5;
                    y = pt.y - gap - h - 8 + yStagger;
                } else if (dock === 'bottom') {
                    x = pt.x - w * 0.5;
                    y = pt.y + gap + PIN_DOT_HALF - 8 + yStagger;
                } else if (dock === 'diag-left') {
                    x = pt.x - gap - w;
                    y = pt.y - gap - h * 0.55 + yStagger;
                } else if (dock === 'diag-right') {
                    x = pt.x + gap;
                    y = pt.y - gap - h * 0.55 + yStagger;
                }
                var dragCamId = camIdForMarker(this._source);
                var dragOff = dragCamId && pinPopupDragOffset[dragCamId];
                var mapSize = this._map.getSize();
                if (mapSize) {
                    var pad = 12;
                    var tl = this._map.containerPointToLayerPoint([pad, pad]);
                    var br = this._map.containerPointToLayerPoint([mapSize.x - w - pad, mapSize.y - h - pad]);
                    x = Math.max(tl.x, Math.min(x, br.x));
                    y = Math.max(tl.y, Math.min(y, br.y));
                }
                if (dragOff) {
                    x += dragOff.x;
                    y += dragOff.y;
                }
                L.DomUtil.setPosition(this._container, L.point(x, y));
            };
        }

        var PIN_POPUP_CROWDED_MIN = 3;
        var PIN_POPUP_CROWDED_HEAVY_MIN = 6;

        function applyPinPopupDensity(open, clusters) {
            var crowded = open.length >= PIN_POPUP_CROWDED_MIN
                || clusters.some(function (c) { return c.length >= 3; });
            var heavy = open.length >= PIN_POPUP_CROWDED_HEAVY_MIN;
            open.forEach(function (camId) {
                var m = deviceMarkers[camId];
                if (!m || !m.isPopupOpen || !m.isPopupOpen()) return;
                var popup = m.getPopup();
                var el = popup && popup.getElement && popup.getElement();
                if (el) {
                    el.classList.toggle('map-popup-compact', crowded);
                    el.classList.toggle('map-popup-crowded', crowded);
                    el.classList.toggle('map-popup-crowded-heavy', heavy);
                }
                var root = mapPopupRootForCam(camId);
                if (root) {
                    root.classList.toggle('map-popup-compact', crowded);
                    root.classList.toggle('map-popup-crowded', crowded);
                    root.classList.toggle('map-popup-crowded-heavy', heavy);
                }
            });
        }

        function repairOpenPinPopupVideos(openIds) {
            (openIds || getOpenPinCamIds()).forEach(function (camId) {
                var root = mapPopupRootForCam(camId);
                if (!root) return;
                var box = root.querySelector('.map-pin-video');
                if (!box) return;
                var ph = box.querySelector('.map-pin-video-placeholder');
                var hasLive = typeof VideoWall !== 'undefined' && VideoWall.mapPinHasLiveVideo && VideoWall.mapPinHasLiveVideo(camId);
                if (hasLive) {
                    if (ph) ph.hidden = true;
                    box.classList.add('vid-box-live', 'map-pin-has-live');
                    box.querySelectorAll('.map-pin-streaming-label').forEach(function (el) {
                        el.style.opacity = '0';
                        el.style.display = 'none';
                    });
                }
                if (typeof VideoWall !== 'undefined' && VideoWall.updateMapPinStopButton) {
                    VideoWall.updateMapPinStopButton(camId);
                }
            });
        }

        function repositionAllOpenPinPopupsMeasured() {
            var open = getOpenPinCamIds();
            open.forEach(function (camId) {
                var m = deviceMarkers[camId];
                if (!m || !m.isPopupOpen || !m.isPopupOpen()) return;
                var popup = m.getPopup();
                if (popup && popup._updatePosition) popup._updatePosition();
            });
            requestAnimationFrame(function () {
                open.forEach(function (camId) {
                    var m = deviceMarkers[camId];
                    if (!m || !m.isPopupOpen || !m.isPopupOpen()) return;
                    var popup = m.getPopup();
                    if (popup && popup._updatePosition) popup._updatePosition();
                });
                repairOpenPinPopupVideos(open);
            });
        }

        function refreshSpreadPinIcons(openIds) {
            (openIds || getOpenPinCamIds()).forEach(function (camId) {
                var m = deviceMarkers[camId];
                if (!m) return;
                var selSet = (typeof FleetUi !== 'undefined' && FleetUi.getSelectedCamIds)
                    ? FleetUi.getSelectedCamIds() : [];
                var sel = (typeof FleetUi !== 'undefined' && FleetUi.getSelectedCamId) ? FleetUi.getSelectedCamId() : null;
                var selected = selSet.indexOf(normalizeCamId(camId)) >= 0
                    || normalizeCamId(camId) === normalizeCamId(sel);
                m.setIcon(buildPinIcon(
                    pinMetaForCam(camId, getCamAlarmKind(camId), isCamOnlineOnFleet(camId)),
                    selected
                ));
            });
        }

        function assignColocatedPinPopupDocks() {
            pinDockLayoutBusy = true;
            var open = getOpenPinCamIds();
            open.forEach(function (camId) {
                var nid = normalizeCamId(camId);
                if (!pinPopupUserMoved[nid]) delete pinPopupDragOffset[nid];
            });
            pinPopupDockSide = {};
            pinPopupDockRing = {};
            pinPopupDockIdx = {};
            var clusters = clusterOpenPinCamIds(open);
            removeClusterShiftBars(open);
            clusters.forEach(function (cluster) {
                var center = clusterCenterLatLng(cluster);
                var meta = center ? { center: center, size: cluster.length } : null;
                assignClusterDockPlans(cluster).forEach(function (plan) {
                    pinPopupDockSide[plan.camId] = plan.side;
                    pinPopupDockRing[plan.camId] = plan.ring;
                    pinPopupDockIdx[plan.camId] = plan.dockIdx;
                    attachPinPopupDockLayout(deviceMarkers[plan.camId], plan.side, plan.ring, plan.dockIdx, meta);
                });
            });
            open.forEach(function (camId) {
                var mapCluster = colocatedMapClusterForCam(camId);
                if (mapCluster.length < 2) return;
                var plan = null;
                assignClusterDockPlans(mapCluster).forEach(function (p) {
                    if (normalizeCamId(p.camId) === normalizeCamId(camId)) plan = p;
                });
                if (!plan || !deviceMarkers[plan.camId]) return;
                var mapCenter = clusterCenterLatLng(mapCluster);
                var mapMeta = mapCenter ? { center: mapCenter, size: mapCluster.length } : null;
                pinPopupDockSide[plan.camId] = plan.side;
                pinPopupDockRing[plan.camId] = plan.ring;
                pinPopupDockIdx[plan.camId] = plan.dockIdx;
                attachPinPopupDockLayout(deviceMarkers[plan.camId], plan.side, plan.ring, plan.dockIdx, mapMeta);
            });
            spreadStableColocatedMarkers();
            refreshSpreadPinIcons(open);
            applyPinPopupDensity(open, clusters);
            repositionAllOpenPinPopupsMeasured();
            if (typeof VideoWall !== 'undefined' && VideoWall.syncAllOpenPinPopupControls) {
                VideoWall.syncAllOpenPinPopupControls();
            }
            if (typeof VideoWall !== 'undefined' && VideoWall.syncWallSlotPinOpenBadges) {
                VideoWall.syncWallSlotPinOpenBadges();
            }
            updateStackedPopupDragUi(open, clusters);
            pinDockLayoutBusy = false;
            purgeOrphanPinPopups();
            if (typeof MapPopoutSync !== 'undefined' && !window.mapPopoutMirrorActive && !window.mapPopoutMirrorApplying) {
                MapPopoutSync.publishDebounced();
            }
            setTimeout(function () {
                spreadStableColocatedMarkers();
                refreshSpreadPinIcons(open);
                repositionAllOpenPinPopupsMeasured();
                updateStackedPopupDragUi(open, clusters);
                purgeOrphanPinPopups();
            }, 150);
            setTimeout(function () {
                spreadStableColocatedMarkers();
                refreshSpreadPinIcons(open);
                repositionAllOpenPinPopupsMeasured();
                updateStackedPopupDragUi(open, clusters);
                purgeOrphanPinPopups();
            }, 450);
        }

        function enforceMaxOpenPinPopups(preferredCamId) {
            preferredCamId = normalizeCamId(preferredCamId);
            var open = getOpenPinCamIds();
            if (open.length <= MAX_OPEN_PIN_POPUPS) return;
            var victims = open.filter(function (id) { return normalizeCamId(id) !== preferredCamId; });
            victims.sort();
            while (getOpenPinCamIds().length > MAX_OPEN_PIN_POPUPS && victims.length) {
                var victim = victims.shift();
                if (victim && deviceMarkers[victim]) {
                    try { deviceMarkers[victim].closePopup(); } catch (_) { /* ignore */ }
                }
            }
            assignColocatedPinPopupDocks();
        }

        function attachPinPopupRightLayout(marker) {
            attachPinPopupDockForCam(marker, camIdForMarker(marker));
        }

        function refreshPinPopupPosition(marker) {
            if (!marker || !marker.isPopupOpen || !marker.isPopupOpen()) return;
            attachPinPopupDockForCam(marker, camIdForMarker(marker));
            var popup = marker.getPopup();
            if (popup && popup._updatePosition) popup._updatePosition();
        }

        function repositionOpenPinPopupsLight() {
            getOpenPinCamIds().forEach(function (camId) {
                var m = deviceMarkers[camId];
                if (!m || !m.isPopupOpen || !m.isPopupOpen()) return;
                var popup = m.getPopup();
                if (popup && popup._updatePosition) popup._updatePosition();
            });
        }

        function refreshAllOpenPinPopups() {
            assignColocatedPinPopupDocks();
        }
        window.refreshOpenPinPopups = refreshAllOpenPinPopups;

        if (typeof MapPopoutSync !== 'undefined') {
            MapPopoutSync.init({
                isPopout: document.documentElement.classList.contains('map-popout-mode'),
                map: map,
                getState: mapMirrorGetState,
                applyState: mapMirrorApplyState,
            });
        }

        function schedulePinPopupReposition() {
            if (pinPopupDragSession || mapPanActive || pinDockLayoutBusy) return;
            if (getOpenPinCamIds().length === 0) return;
            if (pinPopupRepositionRaf) return;
            pinPopupRepositionRaf = requestAnimationFrame(function () {
                pinPopupRepositionRaf = null;
                repositionOpenPinPopupsLight();
            });
        }

        function schedulePinPopupDockRefresh() {
            if (pinPopupDragSession || mapPanActive) return;
            assignColocatedPinPopupDocks();
        }

        document.addEventListener('click', function (e) {
            var prev = e.target.closest('.map-pin-cluster-prev');
            var next = e.target.closest('.map-pin-cluster-next');
            if (!prev && !next) return;
            var bar = e.target.closest('.map-pin-cluster-shift');
            if (!bar) return;
            e.preventDefault();
            e.stopPropagation();
            shiftPinCluster(bar.getAttribute('data-cluster'), prev ? -1 : 1);
        }, true);

        map.on('popupopen', function (e) {
            if (e.popup && e.popup._source && isDevicePinMarker(e.popup._source)) {
                var cid = camIdForMarker(e.popup._source);
                if (cid) trackPinPopupOpen(cid);
                enforceMaxOpenPinPopups(cid);
                assignColocatedPinPopupDocks();
                schedulePinPopupReposition();
                if (cid && typeof socket !== 'undefined' && socket) {
                    socket.emit('pin-open', { cameraId: cid });
                }
                refreshOpenPinDeviceTimes();
                if (typeof MapPopoutSync !== 'undefined' && !window.mapPopoutMirrorActive && !window.mapPopoutMirrorApplying) {
                    MapPopoutSync.publishDebounced();
                }
            }
        });
        map.on('popupclose', function (e) {
            if (e.popup && e.popup._source && isDevicePinMarker(e.popup._source)) {
                var cid = camIdForMarker(e.popup._source);
                if (cid) trackPinPopupClose(cid);
                if (cid) {
                    var nid = normalizeCamId(cid);
                    delete pinPopupDragOffset[nid];
                    delete pinPopupUserMoved[nid];
                    if (stackDragFocusCamId && normalizeCamId(stackDragFocusCamId) === nid) {
                        stackDragFocusCamId = null;
                    }
                }
                if (cid && typeof VideoWall !== 'undefined' && VideoWall.cleanupMapPinPlayerOnPopupClose) {
                    VideoWall.cleanupMapPinPlayerOnPopupClose(cid);
                }
                if (cid && typeof VideoWall !== 'undefined' && VideoWall.wallHasPlayerForCam && VideoWall.wallHasPlayerForCam(cid)) {
                    if (!window.mapPopoutMirrorActive && !window.mapPopoutMirrorApplying) {
                        showMapPinToast(dashboardTr('map.pin.wallStillLive'));
                    }
                }
                if (typeof VideoWall !== 'undefined' && VideoWall.syncWallSlotPinOpenBadges) {
                    VideoWall.syncWallSlotPinOpenBadges();
                }
                if (typeof MapPopoutSync !== 'undefined' && !window.mapPopoutMirrorActive) {
                    MapPopoutSync.publishDebounced();
                }
                setTimeout(function () {
                    assignColocatedPinPopupDocks();
                    repairOpenPinPopupVideos();
                    purgeOrphanPinPopups();
                }, 40);
            }
        });
        map.on('movestart', function () { mapPanActive = true; });
        map.on('zoomstart', function () { mapPanActive = true; });
        map.on('moveend', function () {
            mapPanActive = false;
            schedulePinPopupReposition();
            if (sosIncidentActive) syncSosResponseCircleGeometry();
        });
        map.on('zoomend', function () {
            mapPanActive = false;
            schedulePinPopupDockRefresh();
        });
        map.on('resize', schedulePinPopupReposition);

        function buildPinIcon(meta, selected) {
            var wrapKind = meta.alarmKind === 'fall' ? ' fall' : (meta.alarmKind === 'sos' ? ' sos' : '');
            if (meta.geofenceOutside && !meta.alarmKind) wrapKind += ' geofence-out';
            if (meta.offline) wrapKind += ' offline';
            var cls = 'bwc-pin-wrap' + wrapKind + (selected ? ' selected' : '');
            var glow = meta.alarmKind ? meta.color : meta.color;
            var html = '<div class="' + cls + '">' +
                '<div class="bwc-pin-label" title="' + escapePinText(meta.label) + '">' + escapePinText(meta.label) + '</div>' +
                '<div class="bwc-pin-dot" style="background:' + meta.color + ';box-shadow:0 0 12px ' + glow + ',0 2px 8px rgba(0,0,0,0.5)"></div></div>';
            return L.divIcon({
                className: 'bwc-pin-icon',
                html: html,
                iconSize: [110, 52],
                iconAnchor: [55, 46],
                popupAnchor: [0, 0],
            });
        }

        function closeMapPinPopup(camId) {
            camId = normalizeCamId(camId);
            if (camId && deviceMarkers[camId]) {
                try { deviceMarkers[camId].closePopup(); } catch (_) { /* ignore */ }
            }
        }
        window.closeMapPinPopup = closeMapPinPopup;

        function suppressMapPinPopup(camId) {
            camId = normalizeCamId(camId);
            if (!camId) return;
            mapPinPopupSuppressed[camId] = true;
            closeMapPinPopup(camId);
        }
        window.suppressMapPinPopup = suppressMapPinPopup;

        function clearMapPinPopupSuppression(camId) {
            camId = normalizeCamId(camId);
            if (!camId) return;
            delete mapPinPopupSuppressed[camId];
        }
        window.clearMapPinPopupSuppression = clearMapPinPopupSuppression;

        function closePinPopupsWithoutWallPlayer() {
            getOpenPinCamIds().slice().forEach(function (id) {
                if (typeof VideoWall === 'undefined' || !VideoWall.wallHasPlayerForCam
                    || !VideoWall.wallHasPlayerForCam(id)) {
                    closeMapPinPopup(id);
                }
            });
        }
        window.closePinPopupsWithoutWallPlayer = closePinPopupsWithoutWallPlayer;

        function removeDeviceMarker(camId) {
            if (!camId || !deviceMarkers[camId]) return;
            if (typeof MapPinLayer !== 'undefined' && MapPinLayer.detachMarker) {
                MapPinLayer.detachMarker(deviceMarkers[camId]);
            } else {
                map.removeLayer(deviceMarkers[camId]);
            }
            if (cameraMarker === deviceMarkers[camId]) cameraMarker = null;
            delete deviceMarkers[camId];
        }

        function openPinColocatedCluster(camId) {
            camId = normalizeCamId(camId);
            var open = getOpenPinCamIds();
            if (open.length < 2) return null;
            var clusters = clusterOpenPinCamIds(open);
            for (var i = 0; i < clusters.length; i++) {
                if (clusters[i].length < 2) continue;
                if (clusters[i].some(function (id) { return normalizeCamId(id) === camId; })) return clusters[i];
            }
            return null;
        }

        /** Pan map to device only when appropriate — colocated open pins stay put; SOS follows red dot only when far. */
        function shouldPanMapToDevice(camId, lat, lon, isSos) {
            var sel = (typeof FleetUi !== 'undefined' && FleetUi.getSelectedCamId) ? FleetUi.getSelectedCamId() : null;
            if (!isSos) return normalizeCamId(camId) === normalizeCamId(sel);
            if (openPinColocatedCluster(camId)) return false;
            if (map && lat != null && lon != null && !isNaN(lat) && !isNaN(lon)) {
                var center = map.getCenter();
                if (center && typeof map.distance === 'function') {
                    if (map.distance(center, L.latLng(lat, lon)) < 120) return false;
                }
            }
            return true;
        }

        function refreshAllDeviceMarkerStyles() {
            var selSet = (typeof FleetUi !== 'undefined' && FleetUi.getSelectedCamIds)
                ? FleetUi.getSelectedCamIds() : [];
            var selId = (typeof FleetUi !== 'undefined' && FleetUi.getSelectedCamId) ? FleetUi.getSelectedCamId() : null;
            var selNorm = normalizeCamId(selId);
            if (window.mapPopoutMirrorActive && popoutMirrorSelectedCamId) {
                selNorm = popoutMirrorSelectedCamId;
            }
            var sosFocus = focusedSosCamId ? normalizeCamId(focusedSosCamId) : null;
            Object.keys(deviceMarkers).forEach(function (camId) {
                var m = deviceMarkers[camId];
                if (!m) return;
                var isSos = isCamSosActive(camId);
                var alarmKind = getCamAlarmKind(camId);
                var pinned = selSet.indexOf(normalizeCamId(camId)) >= 0;
                var focused = normalizeCamId(camId) === selNorm
                    || (sosFocus && normalizeCamId(camId) === sosFocus);
                m.setIcon(buildPinIcon(pinMetaForCam(camId, alarmKind, isCamOnlineOnFleet(camId)), pinned || focused));
                if (m.setZIndexOffset) {
                    m.setZIndexOffset(focused ? 1400 : (pinned ? 1200 : (isSos ? 1100 : 0)));
                }
            });
            var frontId = sosFocus || selNorm;
            if (frontId && deviceMarkers[frontId] && deviceMarkers[frontId].bringToFront) {
                deviceMarkers[frontId].bringToFront();
            }
            var clearBtn = document.getElementById('fleet-clear-pins');
            if (clearBtn) clearBtn.hidden = selSet.length === 0;
            updateMapPinLegend();
        }
        window.refreshAllDeviceMarkerStyles = refreshAllDeviceMarkerStyles;

        function upsertDeviceMarker(camId, lat, lon, isSos, openPopup, isOnline) {
            camId = normalizeCamId(camId);
            if (!camId || lat == null || lon == null || isNaN(lat) || isNaN(lon)) return;
            if (isOnline === undefined) isOnline = isCamOnlineOnFleet(camId);
            var selSet = (typeof FleetUi !== 'undefined' && FleetUi.getSelectedCamIds)
                ? FleetUi.getSelectedCamIds() : [];
            var sel = (typeof FleetUi !== 'undefined' && FleetUi.getSelectedCamId) ? FleetUi.getSelectedCamId() : null;
            if (typeof MapPinLayer !== 'undefined' && MapPinLayer.setSelectedCamIds) {
                var pinSel = selSet.slice();
                if (sel && pinSel.indexOf(sel) < 0) pinSel.push(sel);
                MapPinLayer.setSelectedCamIds(pinSel);
            }
            var selected = selSet.indexOf(camId) >= 0 || normalizeCamId(camId) === normalizeCamId(sel);
            if (window.mapPopoutMirrorActive && popoutMirrorSelectedCamId) {
                selected = normalizeCamId(camId) === popoutMirrorSelectedCamId;
            }
            if (isSos == null) isSos = isCamSosActive(camId);
            var alarmKind = getCamAlarmKind(camId);
            if (!alarmKind && isSos === true) alarmKind = activeAlarmKind || 'sos';
            var meta = pinMetaForCam(camId, alarmKind, isOnline);
            var html = mapPopupHtml(camId, alarmKind, isOnline);
            var latlng = [lat, lon];
            var m = deviceMarkers[camId];
            var popupWasOpen = !!(m && m.isPopupOpen && m.isPopupOpen());
            if (m) {
                var existingPopup = m.getPopup && m.getPopup();
                if (existingPopup) {
                    existingPopup.options.autoClose = false;
                    existingPopup.options.closeOnClick = false;
                }
                if (!m._pinPopupMoveHook) {
                    m._pinPopupMoveHook = true;
                    m.on('move', function () {
                        if (mapPanActive || pinDockLayoutBusy) return;
                        schedulePinPopupReposition();
                    });
                }
                m._gpsLatLng = L.latLng(lat, lon);
                m.setLatLng(latlng);
                m.setIcon(buildPinIcon(meta, selected));
                if (!pinPopupShouldKeepVideo(camId, isSos)) {
                    m.setPopupContent(html);
                } else {
                    var root = getMapPopupRoot(camId);
                    if (root) {
                        root.setAttribute('data-sos-popup', isSos ? '1' : '0');
                        root.setAttribute('data-cam-id', camId);
                        var badge = root.querySelector('.map-popup-badge-inline') || root.querySelector('.map-popup-badge');
                        if (badge) {
                            var ak = getCamAlarmKind(camId);
                            badge.className = (badge.classList.contains('map-popup-badge-inline') ? 'map-popup-badge-inline ' : 'map-popup-badge ')
                                + (ak === 'fall' ? 'fall' : (ak ? 'sos' : 'patrol'));
                            badge.textContent = ak === 'fall' ? dashboardTr('map.pin.fall') : (ak ? dashboardTr('map.pin.sos') : dashboardTr('map.pin.patrol'));
                        }
                        ensureMapPopupTelemetry(camId);
                        if (!isPinVideoStoppedByUser(camId)
                            && (window.mapPinPopupAllowMulti
                            || !window.mapPinPopupFocusCamId
                            || normalizeCamId(window.mapPinPopupFocusCamId) === normalizeCamId(camId))) {
                            syncPinVideoFromWall(camId);
                        }
                    }
                }
                if (!pinPopupShouldKeepVideo(camId, isSos) && m.isPopupOpen && m.isPopupOpen()) {
                    schedulePinPopupDockRefresh();
                }
                if (m.isPopupOpen && m.isPopupOpen()) schedulePinPopupReposition();
            } else {
                m = L.marker(latlng, { icon: buildPinIcon(meta, selected) });
                m._gpsLatLng = L.latLng(lat, lon);
                m.bindPopup(html, {
                    maxWidth: 320,
                    className: 'map-pin-popup-right',
                    autoPan: false,
                    autoClose: false,
                    closeOnClick: false,
                    offset: [0, 0],
                });
                attachPinPopupRightLayout(m);
                m.on('click', function (e) {
                    if (window.mapPopoutMirrorActive) {
                        if (L && L.DomEvent && L.DomEvent.stopPropagation) L.DomEvent.stopPropagation(e);
                        return;
                    }
                    if (geofenceDrawActive) return;
                    if (L && L.DomEvent && L.DomEvent.stopPropagation) L.DomEvent.stopPropagation(e);
                    clearMapPinPopupSuppression(camId);
                    window.mapPinPopupFocusCamId = normalizeCamId(camId);
                    clearPinVideoUserStop(camId);
                    suppressPttChromeForLivePinOpen(camId);
                    if (typeof expandMapPinVideo === 'function' && expandMapPinVideo(camId)) {
                        setTimeout(function () {
                            afterMarkerPopupReady(camId, isCamSosActive(camId));
                        }, 80);
                    }
                    if (m.bringToFront) m.bringToFront();
                    if (m.setZIndexOffset) m.setZIndexOffset(1200);
                    if (!m.isPopupOpen || !m.isPopupOpen()) m.openPopup();
                    bringPinPopupToFront(camId);
                    if (typeof VideoWall !== 'undefined' && VideoWall.wallHasPlayerForCam && VideoWall.wallHasPlayerForCam(camId)) {
                        syncPinVideoFromWall(camId);
                    }
                    scheduleSyncOpenPinVideosFromWall(camId);
                    enforceMaxOpenPinPopups(camId);
                    assignColocatedPinPopupDocks();
                    schedulePinPopupReposition();
                    setTimeout(function () {
                        assignColocatedPinPopupDocks();
                        afterMarkerPopupReady(camId, isCamSosActive(camId));
                    }, 120);
                    if (typeof selectFleetDevice === 'function') {
                        var pinIds = (typeof FleetUi !== 'undefined' && FleetUi.getSelectedCamIds)
                            ? FleetUi.getSelectedCamIds().map(function (id) { return normalizeCamId(id); }) : [];
                        var cidNorm = normalizeCamId(camId);
                        selectFleetDevice(camId, {
                            skipMapPopup: true,
                            skipVideo: pinIds.indexOf(cidNorm) < 0 && pinIds.length >= 1,
                            addToMulti: true,
                            keepMulti: true,
                        });
                    }
                });
                m.on('popupclose', function () {
                    trackPinPopupClose(camId);
                    if (typeof MapPinLayer !== 'undefined' && MapPinLayer.setPopupOpenCamId) {
                        MapPinLayer.setPopupOpenCamId(camId, false);
                    }
                    var nid = normalizeCamId(camId);
                    mapPinPopupSuppressed[nid] = true;
                    delete pinPopupDragOffset[nid];
                    delete pinPopupUserMoved[nid];
                    if (stackDragFocusCamId && normalizeCamId(stackDragFocusCamId) === nid) {
                        stackDragFocusCamId = null;
                    }
                    if (typeof VideoWall !== 'undefined' && VideoWall.cleanupMapPinPlayerOnPopupClose) {
                        VideoWall.cleanupMapPinPlayerOnPopupClose(camId);
                    }
                    if (typeof VideoWall !== 'undefined' && VideoWall.syncWallSlotPinOpenBadges) {
                        VideoWall.syncWallSlotPinOpenBadges();
                    }
                    setTimeout(function () {
                        assignColocatedPinPopupDocks();
                        repairOpenPinPopupVideos();
                        purgeOrphanPinPopups();
                    }, 40);
                });
                m.on('popupopen', function () {
                    trackPinPopupOpen(camId);
                    suppressPttChromeForLivePinOpen(camId);
                    if (typeof MapPinLayer !== 'undefined' && MapPinLayer.setPopupOpenCamId) {
                        MapPinLayer.setPopupOpenCamId(camId, true);
                    }
                    assignColocatedPinPopupDocks();
                    schedulePinPopupReposition();
                    setTimeout(function () {
                        assignColocatedPinPopupDocks();
                        schedulePinPopupReposition();
                        if (!window.mapPopoutMirrorActive) {
                            var streamLivePop = typeof VideoWall !== 'undefined' && VideoWall.isCameraLive && VideoWall.isCameraLive(camId);
                            var sosActivePop = window.isSosIncidentActive && window.isSosIncidentActive();
                            if ((sosActivePop || streamLivePop) && !isPinVideoStoppedByUser(camId)) {
                                if (sosActivePop || !shouldLazyPinLive(camId)) {
                                    syncPinVideoFromWall(camId);
                                } else if (typeof VideoWall !== 'undefined' && VideoWall.updateMapPinStopButton) {
                                    VideoWall.updateMapPinStopButton(camId);
                                }
                            } else if (typeof VideoWall !== 'undefined' && VideoWall.playMapPinVideoIfPopupOpen) {
                                if (!shouldLazyPinLive(camId)) {
                                    VideoWall.playMapPinVideoIfPopupOpen(camId, 0, { forceLive: true });
                                } else if (VideoWall.updateMapPinStopButton) {
                                    VideoWall.updateMapPinStopButton(camId);
                                }
                            }
                            repairOpenPinPopupVideos(getOpenPinCamIds());
                            if (typeof VideoWall !== 'undefined' && VideoWall.syncPinVoiceUi) {
                                VideoWall.syncPinVoiceUi(camId);
                            }
                        }
                        if (typeof VideoWall !== 'undefined' && VideoWall.syncWallSlotPinOpenBadges) {
                            VideoWall.syncWallSlotPinOpenBadges();
                        }
                    }, 40);
                });
                m.on('move', function () {
                    if (mapPanActive || pinDockLayoutBusy) return;
                    schedulePinPopupReposition();
                });
                deviceMarkers[camId] = m;
            }
            if (getOpenPinCamIds().length >= 2) {
                spreadStableColocatedMarkers();
            } else if (m && m._gpsLatLng) {
                m.setLatLng(m._gpsLatLng);
            }
            if (selected || isSos) cameraMarker = m;
            if (typeof MapPinLayer !== 'undefined' && MapPinLayer.attachMarker) {
                MapPinLayer.attachMarker(m, isSos, alarmKind, camId);
            } else if (m && !map.hasLayer(m)) {
                m.addTo(map);
            }
            if (openPopup) delete mapPinPopupSuppressed[camId];
            if ((openPopup || popupWasOpen) && !mapPinPopupSuppressed[camId]) {
                enforceMaxOpenPinPopups(camId);
                attachPinPopupDockForCam(m, camId);
                if (m.isPopupOpen && m.isPopupOpen()) {
                    assignColocatedPinPopupDocks();
                } else {
                    m.openPopup();
                    setTimeout(function () {
                        enforceMaxOpenPinPopups(camId);
                        assignColocatedPinPopupDocks();
                        afterMarkerPopupReady(camId, isSos);
                    }, 120);
                }
            }
        }
        window.assignColocatedPinPopupDocks = assignColocatedPinPopupDocks;
        window.repairOpenPinPopupVideos = repairOpenPinPopupVideos;

        function updateMapPinLegend() {
            var el = document.getElementById('map-pin-legend');
            if (!el) return;
            var groups = {};
            Object.keys(deviceMarkers).forEach(function (camId) {
                var meta = pinMetaForCam(camId, getCamAlarmKind(camId), isCamOnlineOnFleet(camId));
                if (meta.alarmKind) return;
                if (meta.offline) return;
                var legName = meta.mapGroup || meta.label;
                if (!groups[legName]) groups[legName] = meta.color;
            });
            var rows = '';
            var keys = Object.keys(groups).sort();
            keys.forEach(function (name) {
                rows += '<div class="leg-row leg-row-click" role="button" tabindex="0" data-group-name="' + escapePinText(name) + '"><span class="leg-dot" style="background:' + groups[name] + ';box-shadow:0 0 8px ' + groups[name] + '"></span><span>' +
                    escapePinText(name) + '</span></div>';
            });
            el.querySelectorAll('.leg-row-click').forEach(function (row) {
                row.addEventListener('click', function () {
                    showMapGroupMembers(row.getAttribute('data-group-name'));
                });
            });
            rows += '<div class="leg-row"><span class="leg-dot" style="background:#FF3333;box-shadow:0 0 8px #FF3333"></span><span>' + dashboardTr('map.legend.sosAlarm') + '</span></div>';
            rows += '<div class="leg-row"><span class="leg-dot" style="background:#f97316;box-shadow:0 0 8px #f97316"></span><span>' + dashboardTr('map.legend.geofenceOut') + '</span></div>';
            rows += '<div class="leg-row"><span class="leg-dot" style="background:#94a3b8;box-shadow:none;opacity:0.9"></span><span>' + dashboardTr('map.legend.offlineLast') + '</span></div>';
            el.innerHTML = '<h5>' + dashboardTr('map.legend.groups') + '</h5>' + rows;
            el.hidden = keys.length === 0 && Object.keys(deviceMarkers).length === 0;
        }

        function updateMapGpsPendingBanner(pending) {
            var el = document.getElementById('map-gps-pending');
            if (!el) return;
            var list = Array.isArray(pending) ? pending : [];
            if (!list.length) {
                el.hidden = true;
                el.textContent = '';
                return;
            }
            var names = list.map(function (d) {
                var name = d.name;
                if (typeof FleetDisplay !== 'undefined' && FleetDisplay.friendlyDeviceName && d.cameraId) {
                    name = FleetDisplay.friendlyDeviceName(d.cameraId) || name;
                }
                return name || d.cameraId;
            }).join(', ');
            el.textContent = dashboardTr('map.gpsPending', { names: names, n: list.length });
            el.hidden = false;
        }

        function isKnownFleetCam(camId) {
            camId = normalizeCamId(camId);
            if (!camId) return false;
            if (typeof FleetUi !== 'undefined' && FleetUi.isKnownDevice && FleetUi.isKnownDevice(camId)) return true;
            if (typeof BwcDevices !== 'undefined' && BwcDevices.findByDeviceId && BwcDevices.findByDeviceId(camId)) return true;
            return false;
        }

        var syncMarkersDebounceTimer = null;
        var mapScopeFitDone = false;
        function maybeFitMapToScopedPins(devices) {
            if (mapScopeFitDone || window.mapPopoutMirrorActive) return;
            var scope = window.dashboardDispatchScope;
            if (!scope || scope.seeAll) return;
            var pts = (devices || []).filter(function (d) {
                return d && d.lat != null && d.lon != null && !isNaN(parseFloat(d.lat)) && !isNaN(parseFloat(d.lon));
            });
            if (!pts.length) return;
            mapScopeFitDone = true;
            var bounds = L.latLngBounds(pts.map(function (d) {
                return [parseFloat(d.lat), parseFloat(d.lon)];
            }));
            map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 });
        }

        function fitMapToFleetPins() {
            if (!map || window.mapPopoutMirrorActive) return;
            var pinned = (typeof FleetUi !== 'undefined' && FleetUi.getSelectedCamIds)
                ? FleetUi.getSelectedCamIds().map(function (id) { return normalizeCamId(id); }) : [];
            var pts = [];
            Object.keys(deviceMarkers).forEach(function (camId) {
                var nid = normalizeCamId(camId);
                if (pinned.length && pinned.indexOf(nid) < 0) return;
                var ll = markerGpsLatLng(deviceMarkers[camId]);
                if (!ll || isNaN(ll.lat) || isNaN(ll.lng)) return;
                pts.push([ll.lat, ll.lng]);
            });
            if (!pts.length && mapPositionsCache && mapPositionsCache.length) {
                mapPositionsCache.forEach(function (d) {
                    if (!d || !d.cameraId || d.lat == null || d.lon == null) return;
                    var nid = normalizeCamId(d.cameraId);
                    if (pinned.length && pinned.indexOf(nid) < 0) return;
                    var la = parseFloat(d.lat);
                    var lo = parseFloat(d.lon);
                    if (!isNaN(la) && !isNaN(lo)) pts.push([la, lo]);
                });
            }
            if (!pts.length) return;
            if (pts.length === 1) {
                map.setView(pts[0], Math.min(Math.max(map.getZoom(), 12), 15));
            } else {
                map.fitBounds(L.latLngBounds(pts), { padding: [48, 48], maxZoom: 15 });
            }
            schedulePinPopupReposition();
            setTimeout(schedulePinPopupReposition, 150);
        }
        window.fitMapToFleetPins = fitMapToFleetPins;

        function syncAllDeviceMarkersNow() {
            fetch('/api/map-positions')
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    mapPositionsCache = (data && data.devices) ? data.devices : [];
                    updateMapGpsPendingBanner(data && data.pendingGps);
                    var seen = {};
                    (data.devices || []).forEach(function (d) {
                        if (!d.cameraId || d.lat == null || d.lon == null) return;
                        seen[d.cameraId] = true;
                        var isSos = isCamSosActive(d.cameraId);
                        var online = d.online != null ? !!d.online : isCamOnlineOnFleet(d.cameraId);
                        var gid = normalizeCamId(d.cameraId);
                        if (d.geofenceOutside) geofenceOutsideByCam[gid] = true;
                        else delete geofenceOutsideByCam[gid];
                        upsertDeviceMarker(d.cameraId, parseFloat(d.lat), parseFloat(d.lon), isSos, false, online);
                    });
                    Object.keys(deviceMarkers).forEach(function (id) {
                        if (seen[id]) return;
                        if (!isKnownFleetCam(id)) {
                            removeDeviceMarker(id);
                            return;
                        }
                        var mk = deviceMarkers[id];
                        var ll = mk ? markerGpsLatLng(mk) : null;
                        if (!isCamOnlineOnFleet(id) && mk && ll) {
                            upsertDeviceMarker(id, ll.lat, ll.lng, isCamSosActive(id), false, false);
                            return;
                        }
                        if (isCamOnlineOnFleet(id) && mk && ll) {
                            upsertDeviceMarker(id, ll.lat, ll.lng, isCamSosActive(id), false, true);
                            if (typeof MapPinLayer !== 'undefined' && MapPinLayer.attachMarker) {
                                MapPinLayer.attachMarker(
                                    deviceMarkers[id],
                                    isCamSosActive(id),
                                    getCamAlarmKind(id),
                                    id
                                );
                            }
                            return;
                        }
                        removeDeviceMarker(id);
                    });
                    refreshAllDeviceMarkerStyles();
                    updateMapPinLegend();
                    if (getOpenPinCamIds().length >= 1) {
                        assignColocatedPinPopupDocks();
                    }
                    var pinPopupOpen = Object.keys(deviceMarkers).some(function (id) {
                        var mk = deviceMarkers[id];
                        return mk && mk.isPopupOpen && mk.isPopupOpen();
                    });
                    if (pinPopupOpen) schedulePinPopupReposition();
                    maybeFitMapToScopedPins(data.devices || []);
                })
                .catch(function () { /* ignore */ });
        }
        function syncAllDeviceMarkers() {
            if (syncMarkersDebounceTimer) clearTimeout(syncMarkersDebounceTimer);
            syncMarkersDebounceTimer = setTimeout(function () {
                syncMarkersDebounceTimer = null;
                syncAllDeviceMarkersNow();
            }, 500);
        }
        window.syncAllDeviceMarkers = syncAllDeviceMarkers;

        function mapPopupHasLiveVideo(camId) {
            var root = camId ? mapPopupRootForCam(camId) : null;
            var pop = root ? root.parentElement : document.querySelector('.leaflet-popup-content');
            return !!(pop && pop.querySelector('.map-pin-video canvas, .vid-box canvas, .sos-popup-container canvas'));
        }

        function ensureMapPopupTelemetry(camId) {
            var root = mapPopupRootForCam(camId);
            if (!root) return;
            if (root.querySelector('.map-popup-telemetry')) return;
            root.insertAdjacentHTML('beforeend', mapPopupTelemetryHtml());
        }

        function isMapPinPttCommIntent(camId) {
            if (!camId) return false;
            camId = normalizeCamId(camId);
            if (window.mapPinOpenPttCommCamId && normalizeCamId(window.mapPinOpenPttCommCamId) === camId) return true;
            return !!(typeof VideoWall !== 'undefined' && VideoWall.isPttCommPinIntent && VideoWall.isPttCommPinIntent(camId));
        }

        function suppressPttChromeForLivePinOpen(camId) {
            if (!camId || isMapPinPttCommIntent(camId)) return;
            if (typeof VideoWall !== 'undefined' && VideoWall.suppressPinOpenPttChrome) {
                VideoWall.suppressPinOpenPttChrome(camId);
            }
        }

        function afterMarkerPopupReady(camId, isSos) {
            fmMapResize();
            assignColocatedPinPopupDocks();
            if (window.mapPopoutMirrorActive) {
                schedulePinPopupReposition();
                return;
            }
            suppressPttChromeForLivePinOpen(camId);
            bindPinVideoPanel(camId);
            var root = mapPopupRootForCam(camId);
            var offlinePopup = root && root.getAttribute('data-offline-popup') === '1';
            if (!offlinePopup) {
                ensureMapPopupTelemetry(camId);
                var tel = null;
                var on = false;
                if (typeof FleetUi !== 'undefined' && FleetUi.getDeviceState) {
                    var st = FleetUi.getDeviceState(camId);
                    tel = st && st.telemetry;
                    on = st && st.online;
                }

                // Restore saved background data if available
                if (window.globalTelemetryCache && window.globalTelemetryCache[camId]) {
                    tel = Object.assign({}, tel || {}, window.globalTelemetryCache[camId]);
                }

                refreshMapPinTelemetry(camId, tel, on);
            }
            if (isMapPinPttCommIntent(camId)) {
                if (typeof VideoWall !== 'undefined' && VideoWall.openMapPinPttComm) {
                    VideoWall.openMapPinPttComm(camId);
                } else if (typeof VideoWall !== 'undefined' && VideoWall.syncMapPinPttComm) {
                    VideoWall.syncMapPinPttComm(camId, 0);
                }
                repairOpenPinPopupVideos(getOpenPinCamIds());
                schedulePinPopupReposition();
                return;
            }
            var streamLive = typeof VideoWall !== 'undefined' && VideoWall.isCameraLive && VideoWall.isCameraLive(camId);
            if ((isSos || streamLive) && !isPinVideoStoppedByUser(camId)) {
                if (isSos || !shouldLazyPinLive(camId)) {
                    syncPinVideoFromWall(camId);
                } else if (typeof VideoWall !== 'undefined' && VideoWall.updateMapPinStopButton) {
                    VideoWall.updateMapPinStopButton(camId);
                }
            } else if (!offlinePopup && typeof VideoWall !== 'undefined' && VideoWall.playMapPinVideoIfPopupOpen) {
                if (!shouldLazyPinLive(camId, { sosLive: !!isSos })) {
                    VideoWall.playMapPinVideoIfPopupOpen(camId, 0, { forceLive: true, sosLive: !!isSos });
                } else if (VideoWall.updateMapPinStopButton) {
                    VideoWall.updateMapPinStopButton(camId);
                }
            }
            repairOpenPinPopupVideos(getOpenPinCamIds());
            schedulePinPopupReposition();
        }

        function pinPopupHasVisibleVideo(camId) {
            var root = mapPopupRootForCam(camId);
            if (!root || root.classList.contains('pin-popup-minimized')) return false;
            var host = root.querySelector('.map-pin-video') || root.querySelector('.vid-box');
            if (!host || !host.classList.contains('map-pin-has-live')) return false;
            var canvas = host.querySelector('canvas');
            return !!(canvas && canvas.width > 8 && canvas.height > 8);
        }

        function scheduleSyncOpenPinVideosFromWall(preferredCamId) {
            if (pinVideoDockSyncTimer) clearTimeout(pinVideoDockSyncTimer);
            pinVideoDockSyncTimer = setTimeout(function () {
                pinVideoDockSyncTimer = null;
                if (window.mapPopoutMirrorActive) return;
                var ids;
                if (preferredCamId) {
                    ids = [normalizeCamId(preferredCamId)];
                } else if (window.mapPinPopupAllowMulti) {
                    ids = getOpenPinCamIds();
                } else if (window.mapPinPopupFocusCamId) {
                    ids = [normalizeCamId(window.mapPinPopupFocusCamId)];
                } else {
                    ids = getOpenPinCamIds();
                }
                ids.forEach(function (id) {
                    if (shouldLazyPinLive(id) && !pinPopupHasVisibleVideo(id)) {
                        if (VideoWall.updateMapPinStopButton) VideoWall.updateMapPinStopButton(id);
                        return;
                    }
                    syncPinVideoFromWall(id);
                });
            }, 280);
        }
        window.scheduleSyncOpenPinVideosFromWall = scheduleSyncOpenPinVideosFromWall;

        function resyncPinVideoAfterSosAck(camId) {
            camId = normalizeCamId(camId);
            if (!camId) return;
            clearPinVideoUserStop(camId);
            syncPinVideoFromWall(camId);
        }

        function syncPinVideoFromWall(camId) {
            if (window.mapPopoutMirrorActive) return;
            if (!camId || typeof VideoWall === 'undefined') return;
            if (shouldLazyPinLive(camId) && !pinPopupHasVisibleVideo(camId)) {
                if (VideoWall.updateMapPinStopButton) VideoWall.updateMapPinStopButton(camId);
                return;
            }
            if (isPinVideoStoppedByUser(camId)) {
                if (VideoWall.updateMapPinStopButton) VideoWall.updateMapPinStopButton(camId);
                return;
            }
            if (pinPopupHasVisibleVideo(camId)) {
                var pinRoot = mapPopupRootForCam(camId);
                var pinHost = pinRoot && (pinRoot.querySelector('.map-pin-video') || pinRoot.querySelector('.vid-box'));
                if (pinHost && pinHost.classList.contains('map-pin-has-live')) {
                    if (VideoWall.updateMapPinStopButton) VideoWall.updateMapPinStopButton(camId);
                    return;
                }
            }
            var root = mapPopupRootForCam(camId);
            if (root && root.classList.contains('pin-popup-minimized')) {
                root.classList.remove('pin-popup-minimized');
            }
            if (VideoWall.syncMapPopupPlayer) {
                VideoWall.syncMapPopupPlayer(camId);
            }
            if (deviceMarkers[camId]) refreshPinPopupPosition(deviceMarkers[camId]);
            if (VideoWall.updateMapPinStopButton) VideoWall.updateMapPinStopButton(camId);
        }
        window.syncPinVideoFromWall = syncPinVideoFromWall;

        function bindPinVideoPanel(camId) {
            var root = mapPopupRootForCam(camId) || getMapPopupRoot();
            if (!root) return;
            var box = root.querySelector('.map-pin-video') || root.querySelector('.vid-box');
            if (!box) return;
            var id = box.getAttribute('data-cam-id') || camId || lastMapCamId;
            if (id && !box.getAttribute('data-cam-id')) box.setAttribute('data-cam-id', id);
            if (typeof VideoWall !== 'undefined' && VideoWall.updateMapPinStopButton) {
                VideoWall.updateMapPinStopButton(id);
            }
        }

        var canMapDeviceControl = false;
        var canDeviceKillSwitch = false;
        var canGeofenceControl = false;
        var canClearMapPinsPerm = false;
        var isSuperAdmin = false;
        var dashboardUsername = '';
        var lastDashboardSession = null;
        var killSwitchPendingCache = [];
        var KILL_SWITCH_REASON_MIN_LEN = 10;

        function dashboardRoleLabel(role) {
            var roleKey = role === 'super_admin' ? 'role.superAdmin' : 'role.operator';
            var roleLabel = role === 'super_admin' ? 'Super admin' : 'Operator';
            if (typeof I18n !== 'undefined' && I18n.t) {
                var translated = I18n.t(roleKey);
                if (translated && translated !== roleKey) roleLabel = translated;
            }
            return roleLabel;
        }

        function applyDashboardSessionDisplay(data) {
            if (!data || !data.ok) return;
            lastDashboardSession = data;
            var el = document.getElementById('display-dashboard-user');
            var roleEl = document.getElementById('display-dashboard-role');
            if (el && data.username) el.textContent = data.username;
            if (roleEl && data.role) {
                roleEl.hidden = false;
                roleEl.textContent = dashboardRoleLabel(data.role);
                roleEl.className = 'ss-role-badge ' + data.role;
            }
            var chip = document.getElementById('header-session-chip');
            var headerUser = document.getElementById('header-session-user');
            var headerRole = document.getElementById('header-session-role');
            var headerDisplay = document.getElementById('header-session-display');
            if (chip) chip.hidden = !data.username;
            if (headerUser) headerUser.textContent = data.username || '—';
            if (headerRole && data.role) {
                headerRole.hidden = false;
                headerRole.textContent = dashboardRoleLabel(data.role);
                headerRole.className = 'header-session-role ss-role-badge ' + data.role;
            } else if (headerRole) {
                headerRole.hidden = true;
            }
            if (headerDisplay) {
                var dn = data.displayName ? String(data.displayName).trim() : '';
                if (dn) {
                    headerDisplay.textContent = dn;
                    headerDisplay.hidden = false;
                } else {
                    headerDisplay.textContent = '';
                    headerDisplay.hidden = true;
                }
            }
        }
        window.applyDashboardSessionDisplay = applyDashboardSessionDisplay;

        window.setDashboardPermissions = function (perms, role, username) {
            canMapDeviceControl = !!(perms && perms.mapDeviceControl);
            canDeviceKillSwitch = !!(perms && perms.deviceKillSwitch);
            canGeofenceControl = !!(perms && perms.geofenceControl);
            canClearMapPinsPerm = !!(perms && perms.clearMapPins);
            isSuperAdmin = role === 'super_admin';
            if (username) dashboardUsername = String(username);
            if (typeof FleetUi !== 'undefined' && FleetUi.setClearMapPinsPermission) {
                FleetUi.setClearMapPinsPermission(canClearMapPinsPerm);
            }
            refreshMapToolbarState();
            if (window.EvidenceManager && EvidenceManager.applyPermissions) {
                EvidenceManager.applyPermissions(perms, role);
            }
        };

        window.setDashboardDispatchScope = function (scope) {
            window.dashboardDispatchScope = scope || null;
            if (scope && !scope.seeAll && typeof FleetUi !== 'undefined' && FleetUi.setStatusFilter) {
                FleetUi.setStatusFilter('online');
            }
        };

        function refreshMapToolbarState() {
            var sel = document.getElementById('map-bwc-target');
            var hasCam = !!(sel && sel.value);
            var mapControls = document.getElementById('map-controls');
            var permBtn = document.getElementById('map-toolbar-perm-btn');
            var gfToolbar = document.getElementById('geofence-toolbar');
            if (mapControls) mapControls.classList.toggle('no-device-perm', !canMapDeviceControl);
            if (permBtn) permBtn.hidden = canMapDeviceControl;
            if (gfToolbar) gfToolbar.classList.toggle('no-geofence-perm', !canGeofenceControl);
            var rebootBtn = document.getElementById('map-kill-reboot-btn');
            var shutdownBtn = document.getElementById('map-kill-shutdown-btn');
            if (rebootBtn) rebootBtn.hidden = !canDeviceKillSwitch;
            if (shutdownBtn) shutdownBtn.hidden = !canDeviceKillSwitch;
            setToolbarButtonsEnabled(hasCam && canMapDeviceControl);
            renderKillSwitchPendingList(killSwitchPendingCache);
        }

        function getToolbarTargetCamId() {
            var sel = document.getElementById('map-bwc-target');
            if (sel && sel.value) return sel.value;
            if (typeof FleetUi !== 'undefined' && FleetUi.getSelectedCamId) return FleetUi.getSelectedCamId();
            return lastMapCamId || null;
        }

        function setToolbarButtonsEnabled(on) {
            document.querySelectorAll('#map-controls .toolbar-btn').forEach(function (btn) {
                if (btn.id === 'map-popout-open') return;
                btn.disabled = !on;
            });
        }

        function refreshMapToolbarBwcList() {
            var sel = document.getElementById('map-bwc-target');
            if (!sel) return;
            var online = (typeof FleetUi !== 'undefined' && FleetUi.getOnlineDevices)
                ? FleetUi.getOnlineDevices() : [];
            var current = getToolbarTargetCamId() || '';
            if (current && !online.some(function (m) { return m.id === current; })) current = '';
            var html = '<option value="">BWC online</option>';
            online.forEach(function (m) {
                var label = m.name || m.id;
                html += '<option value="' + String(m.id).replace(/"/g, '&quot;') + '"' +
                    (m.id === current ? ' selected' : '') + '>' +
                    String(label).replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</option>';
            });
            sel.innerHTML = html;
            if (current && online.some(function (m) { return m.id === current; })) sel.value = current;
            refreshMapToolbarState();
        }
        function openMapPermissionHelp() {
            if (typeof ServerSetup !== 'undefined' && ServerSetup.openUsersGrant) {
                ServerSetup.openUsersGrant();
                return;
            }
            alert(dashboardTr('map.permGrantSteps'));
        }

        window.refreshMapToolbarBwcList = refreshMapToolbarBwcList;

        function ensureToolbarTarget(camId) {
            if (!camId) return;
            syncCameraId(camId);
            var sel = document.getElementById('map-bwc-target');
            if (sel) sel.value = camId;
            if (typeof FleetUi !== 'undefined' && FleetUi.pick) {
                FleetUi.pick(camId, { skipVideo: true, skipMapPopup: true });
            } else {
                socket.emit('select-device', { cameraId: camId });
            }
            setToolbarButtonsEnabled(true);
            refreshMapToolbarState();
        }

        function requestSnapshot(camId) {
            if (!canMapDeviceControl) {
                alert(dashboardTr('map.permDenied'));
                return;
            }
            if (!camId) camId = getToolbarTargetCamId();
            if (!camId) {
                alert('Select a BWC from the list first.');
                return;
            }
            ensureToolbarTarget(camId);
            socket.emit('remote-control', 'TakePicture');
        }

        function pinPopupShouldKeepVideo(camId, isSos) {
            if (!isCamOnlineOnFleet(camId) && !isSos && !getCamAlarmKind(camId)) return false;
            if (isSos && mapPopupHasLiveVideo(camId)) return true;
            if (mapPopupHasLiveVideo(camId)) return true;
            if (typeof VideoWall !== 'undefined' && VideoWall.mapPinHasLiveVideo && VideoWall.mapPinHasLiveVideo(camId)) return true;
            if (typeof VideoWall !== 'undefined' && VideoWall.isWallPlayingCam && VideoWall.isWallPlayingCam(camId)) return true;
            if (typeof VideoWall !== 'undefined' && VideoWall.isCameraLive && VideoWall.isCameraLive(camId)) return true;
            return false;
        }

        function placeCameraMarker(lat, lon, camId, isSos, openPopup, opts) {
            opts = opts || {};
            if (lat == null || lon == null || isNaN(lat) || isNaN(lon)) return;
            camId = normalizeCamId(camId);
            if (openPopup && opts.pttCommPin) {
                window.mapPinOpenPttCommCamId = camId;
            } else if (openPopup) {
                suppressPttChromeForLivePinOpen(camId);
            }
            lastMapPos = { lat: lat, lon: lon };
            lastMapCamId = camId;
            var m = deviceMarkers[camId];
            var popupOpen = !!(m && m.isPopupOpen && m.isPopupOpen());
            upsertDeviceMarker(camId, lat, lon, isSos, openPopup && !popupOpen);
            refreshAllDeviceMarkerStyles();
            var latlng = [lat, lon];
            var sel = (typeof FleetUi !== 'undefined' && FleetUi.getSelectedCamId) ? FleetUi.getSelectedCamId() : null;
            if (!opts.skipPan && shouldPanMapToDevice(camId, lat, lon, isSos)) {
                map.setView(latlng, isSos ? 16 : Math.max(map.getZoom(), 14));
            }
            if (popupOpen || openPopup) {
                schedulePinPopupReposition();
                setTimeout(schedulePinPopupReposition, 80);
                setTimeout(schedulePinPopupReposition, 250);
            }
            if (openPopup && !popupOpen) {
                setTimeout(function () { afterMarkerPopupReady(camId, isSos); }, 150);
            }
        }

        function refreshMapFromServer() {
            if (!mapSyncFirstPaintDone) {
                mapSyncFirstPaintDone = true;
                syncAllDeviceMarkersNow();
            } else {
                syncAllDeviceMarkers();
            }
            syncGeofenceLayers();
        }

        function syncMapPinForCam(camId, opts) {
            opts = opts || {};
            if (!camId) return;

            syncCameraId(camId);

            fetch('/api/last-gps?camId=' + encodeURIComponent(camId))
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    if (data.lat == null || data.lon == null || !data.cameraId) return;

                    var isSos = window.isSosIncidentActive && window.isSosIncidentActive();

                    placeCameraMarker(
                        parseFloat(data.lat),
                        parseFloat(data.lon),
                        data.cameraId,
                        isSos,
                        opts.openPopup === true,
                        { pttCommPin: !!opts.pttCommPin }
                    );

                    if (window.deviceMarkers && window.deviceMarkers[data.cameraId]) {
                        setTimeout(function () {
                            assignColocatedPinPopupDocks();
                        }, 80);
                    }
                })
                .catch(function (err) {
                    if (typeof console !== 'undefined') console.warn('[Map] GPS sync failed:', err);
                });
        }
        window.syncMapPinForCam = syncMapPinForCam;

        socket.on('heartbeat', function (data) {
            FleetUi.onHeartbeat(data);
            VideoWall.onHeartbeat(data);
            if (data.cameraId && lastMapPos && lastMapCamId
                && normalizeCamId(data.cameraId) === normalizeCamId(lastMapCamId)) {
                placeCameraMarker(lastMapPos.lat, lastMapPos.lon, data.cameraId, sosIncidentActive, false);
            }
        });

        function showOfflineLastLocationPin(camId, lat, lon) {
            if (!camId) return;
            camId = normalizeCamId(camId);
            var sel = (typeof FleetUi !== 'undefined' && FleetUi.getSelectedCamId) ? FleetUi.getSelectedCamId() : null;
            var keepOpen = (typeof FleetUi !== 'undefined' && FleetUi.isPinSelected && FleetUi.isPinSelected(camId))
                || normalizeCamId(sel) === camId;
            if (!keepOpen) closeMapPinPopup(camId);
            if (typeof VideoWall !== 'undefined' && VideoWall.stopPinLive) {
                VideoWall.stopPinLive(camId);
            }
            if (lat != null && lon != null && !isNaN(lat) && !isNaN(lon)) {
                upsertDeviceMarker(camId, parseFloat(lat), parseFloat(lon), isCamSosActive(camId), false, false);
                return;
            }
            var m = deviceMarkers[camId];
            if (m) {
                var ll = m.getLatLng();
                upsertDeviceMarker(camId, ll.lat, ll.lng, isCamSosActive(camId), false, false);
                return;
            }
            fetch('/api/last-gps?camId=' + encodeURIComponent(camId))
                .then(function (r) { return r.json(); })
                .then(function (g) {
                    if (g.lat == null || g.lon == null) return;
                    upsertDeviceMarker(camId, parseFloat(g.lat), parseFloat(g.lon), false, false, false);
                    updateMapPinLegend();
                })
                .catch(function () { /* ignore */ });
        }

        socket.on('device-offline', function (data) {
            FleetUi.onDeviceOffline(data);
            if (data && data.cameraId) {
                showOfflineLastLocationPin(data.cameraId, data.lat, data.lon);
                refreshAllDeviceMarkerStyles();
                updateMapPinLegend();
                if (typeof VideoWall !== 'undefined' && VideoWall.onDeviceWentOffline) {
                    VideoWall.onDeviceWentOffline(data.cameraId);
                }
            }
        });

        socket.on('fleet-roster', function (fleet) {
            FleetUi.ingestFleet(fleet);
            (fleet || []).forEach(function (m) {
                if (!m || !m.id || !deviceMarkers[m.id]) return;
                var ll = deviceMarkers[m.id].getLatLng();
                var online = m.status === '1';
                upsertDeviceMarker(m.id, ll.lat, ll.lng, isCamSosActive(m.id), false, online);
            });
            refreshAllDeviceMarkerStyles();
        });

        socket.on('device-status', function (data) {
            FleetUi.onDeviceStatus(data);
            setTelemetryUi(data);
        });

        function applyGpsMapUpdate(camId, lat, lon, isSos, online) {
            upsertDeviceMarker(camId, lat, lon, isSos, false, online);
            if (activeSosAlarms[normalizeCamId(camId)]) {
                var rec = activeSosAlarms[normalizeCamId(camId)];
                rec.lat = lat;
                rec.lon = lon;
            }
            refreshAllDeviceMarkerStyles();
            updateMapPinLegend();
            if (isSos || camId === FleetUi.getSelectedCamId()) {
                syncCameraId(camId);
                lastMapPos = { lat: lat, lon: lon };
                lastMapCamId = camId;
            }
            if (shouldPanMapToDevice(camId, lat, lon, isSos)) {
                map.setView([lat, lon], isSos ? 16 : Math.max(map.getZoom(), 14));
            }
            if (sosIncidentActive && pendingSosAck) {
                mergeMapPositionInCache(camId, lat, lon, online);
                if (normalizeCamId(pendingSosAck.cameraId) === normalizeCamId(camId)) {
                    pendingSosAck.lat = lat;
                    pendingSosAck.lon = lon;
                    syncSosResponseCircleGeometry();
                }
                if (!sosResponseCircle) drawSosResponseCircleFromServer();
                else refreshSosResponseTeam();
                schedulePinPopupReposition();
            }
        }

        socket.on('gps-update', function (data) {
            if (!data || data.lat == null || data.lon == null) return;
            if (!isKnownFleetCam(data.cameraId)) return;
            var lat = parseFloat(data.lat);
            var lon = parseFloat(data.lon);
            var isSos = isCamSosActive(data.cameraId);
            var online = isCamOnlineOnFleet(data.cameraId);
            if (typeof MapPinLayer !== 'undefined' && MapPinLayer.queueGpsUpdate) {
                MapPinLayer.queueGpsUpdate(data.cameraId, lat, lon, { isSos: isSos, online: online }, function (id, la, lo, meta) {
                    applyGpsMapUpdate(id, la, lo, meta.isSos, meta.online);
                });
            } else {
                applyGpsMapUpdate(data.cameraId, lat, lon, isSos, online);
            }
        });

        var pendingSosAck = null;
        var activeSosAlarms = {};
        var focusedSosCamId = null;
        var sosQueueSnapshot = { active: [], queued: [], pending: [], maxLive: 6 };

        function getSosAlarmCount() {
            return Object.keys(activeSosAlarms).length;
        }

        function getFocusedSosAlarm() {
            var id = focusedSosCamId ? normalizeCamId(focusedSosCamId) : null;
            if (id && activeSosAlarms[id]) return activeSosAlarms[id];
            var keys = Object.keys(activeSosAlarms);
            if (!keys.length) return null;
            focusedSosCamId = keys[0];
            return activeSosAlarms[keys[0]];
        }

        function applySosQueueSnapshot(snap) {
            if (!snap) return;
            sosQueueSnapshot = {
                active: snap.active || [],
                queued: snap.queued || [],
                pending: snap.pending || [],
                maxLive: snap.maxLive || 8,
            };
        }

        function videoStatusForSosCam(camId) {
            camId = normalizeCamId(camId);
            if (!camId) return 'none';
            var snap = sosQueueSnapshot;
            if ((snap.active || []).some(function (id) { return normalizeCamId(id) === camId; })) return 'live';
            if ((snap.pending || []).some(function (id) { return normalizeCamId(id) === camId; })) return 'connecting';
            if ((snap.queued || []).some(function (id) { return normalizeCamId(id) === camId; })) return 'queued';
            if (global.VideoWall && VideoWall.hasLiveVideoFrameForCam && VideoWall.hasLiveVideoFrameForCam(camId)) return 'live';
            return 'none';
        }

        function sosAlarmDisplayName(camId) {
            if (typeof FleetDisplay !== 'undefined' && FleetDisplay.friendlyDeviceName) {
                return FleetDisplay.friendlyDeviceName(camId) || camId;
            }
            if (typeof FleetUi !== 'undefined' && FleetUi.getDeviceName) {
                return FleetUi.getDeviceName(camId) || camId;
            }
            return camId;
        }

        function upsertActiveSosAlarm(data) {
            if (!data || !data.cameraId) return null;
            var camId = normalizeCamId(data.cameraId);
            var prev = activeSosAlarms[camId];
            activeSosAlarms[camId] = {
                cameraId: camId,
                time: data.time || (prev && prev.time) || '',
                lat: data.lat != null ? data.lat : (prev && prev.lat),
                lon: data.lon != null ? data.lon : (prev && prev.lon),
                incidentId: data.incidentId || (prev && prev.incidentId) || null,
                alarmKind: data.alarmKind === 'fall' ? 'fall' : ((prev && prev.alarmKind) || 'sos'),
                stashSnapshot: null,
            };
            return activeSosAlarms[camId];
        }

        function getActiveSosCamIds() {
            return Object.keys(activeSosAlarms);
        }
        window.getActiveSosCamIds = getActiveSosCamIds;

        function isMapPinVideoMinimized(camId) {
            var root = mapPopupRootForCam(camId);
            return !!(root && root.classList.contains('pin-popup-minimized'));
        }

        function minimizeMapPinVideo(camId) {
            camId = normalizeCamId(camId);
            var root = mapPopupRootForCam(camId);
            if (!root) return;
            root.classList.add('pin-popup-minimized');
            schedulePinPopupReposition();
        }
        window.minimizeMapPinVideo = minimizeMapPinVideo;

        function expandMapPinVideo(camId) {
            camId = normalizeCamId(camId);
            var root = mapPopupRootForCam(camId);
            if (!root || !root.classList.contains('pin-popup-minimized')) return false;
            clearPinVideoUserStop(camId);
            root.classList.remove('pin-popup-minimized');
            if (typeof VideoWall !== 'undefined' && VideoWall.syncMapPopupPlayer) {
                VideoWall.syncMapPopupPlayer(camId);
            }
            if (typeof VideoWall !== 'undefined' && VideoWall.updateMapPinStopButton) {
                VideoWall.updateMapPinStopButton(camId);
            }
            schedulePinPopupReposition();
            return true;
        }
        window.expandMapPinVideo = expandMapPinVideo;
        window.isMapPinVideoMinimized = isMapPinVideoMinimized;

        function focusSosAlarm(camId) {
            camId = normalizeCamId(camId);
            if (!activeSosAlarms[camId]) return;
            focusedSosCamId = camId;
            pendingSosAck = activeSosAlarms[camId];
            setPinClusterActive(camId);
            refreshSosStormBanner();
            renderSosAlarmStrip();
            refreshAllDeviceMarkerStyles();
            assignColocatedPinPopupDocks();
            drawSosResponseCircleFromServer();
            schedulePinPopupReposition();
        }

        function refreshSosStormBanner() {
            var n = getSosAlarmCount();
            var banner = document.getElementById('sos-banner');
            if (!banner) return;
            if (!n) {
                banner.style.display = 'none';
                return;
            }
            banner.style.display = 'flex';
            var alarm = getFocusedSosAlarm();
            if (!alarm) return;
            pendingSosAck = alarm;
            activeAlarmKind = alarm.alarmKind || 'sos';
            applyAlarmBannerKind(activeAlarmKind);
            var prefix = document.getElementById('sos-banner-prefix');
            if (prefix) {
                var base = activeAlarmKind === 'fall'
                    ? dashboardTr('sos.banner.fall')
                    : dashboardTr('sos.banner.distress');
                prefix.textContent = n > 1 ? (base + ' · ' + n + ' alarms') : base;
            }
            if (typeof FleetDisplay !== 'undefined') {
                FleetDisplay.setCamLabel(document.getElementById('sos-cam'), alarm.cameraId);
            } else {
                document.getElementById('sos-cam').innerText = alarm.cameraId;
            }
            document.getElementById('sos-time').innerText = alarm.time || '';
            syncSosPttMemberUi();
        }

        function renderSosAlarmStrip() {
            var strip = document.getElementById('sos-alarm-strip');
            if (!strip) return;
            var keys = Object.keys(activeSosAlarms);
            if (keys.length <= 1) {
                strip.hidden = true;
                strip.innerHTML = '';
                return;
            }
            strip.hidden = false;
            strip.innerHTML = keys.map(function (camId) {
                var a = activeSosAlarms[camId];
                var status = videoStatusForSosCam(camId);
                var badgeLabel = status === 'live' ? 'Live' : (status === 'queued' ? 'Queued' : (status === 'connecting' ? '…' : '—'));
                var hasGps = a.lat != null && a.lon != null && !isNaN(parseFloat(a.lat)) && !isNaN(parseFloat(a.lon));
                var focused = normalizeCamId(focusedSosCamId) === camId ? ' focused' : '';
                return '<div class="sos-alarm-row' + focused + '" data-cam="' + String(camId).replace(/"/g, '&quot;') + '">' +
                    '<span class="sos-alarm-name">' + String(sosAlarmDisplayName(camId)).replace(/</g, '&lt;') + '</span>' +
                    '<span class="sos-alarm-gps">' + (hasGps ? 'GPS' : 'no GPS') + '</span>' +
                    '<span class="sos-alarm-badge ' + status + '">' + badgeLabel + '</span>' +
                    '<button type="button" class="sos-alarm-ack-btn" data-cam="' + String(camId).replace(/"/g, '&quot;') + '">Ack</button>' +
                    '</div>';
            }).join('');
        }

        (function bindSosAlarmStrip() {
            var strip = document.getElementById('sos-alarm-strip');
            if (!strip) return;
            strip.addEventListener('click', function (e) {
                var ackBtn = e.target.closest('.sos-alarm-ack-btn');
                if (ackBtn) {
                    e.stopPropagation();
                    openSosAcknowledge(ackBtn.getAttribute('data-cam'));
                    return;
                }
                var row = e.target.closest('.sos-alarm-row');
                if (row) focusSosAlarm(row.getAttribute('data-cam'));
            });
        })();

        function getSosResponseRadiusM() {
            var el = document.getElementById('sos-response-radius');
            var v = el ? parseInt(el.value, 10) : SOS_RESPONSE_RADIUS_DEFAULT;
            if (SOS_RESPONSE_RADIUS_OPTIONS.indexOf(v) < 0) return SOS_RESPONSE_RADIUS_DEFAULT;
            return v;
        }

        function getSosAlarmCenterLatLon() {
            var alarm = pendingSosAck;
            if (!alarm && typeof getFocusedSosAlarm === 'function') alarm = getFocusedSosAlarm();
            if (!alarm) return null;
            var lat = alarm.lat != null ? parseFloat(alarm.lat) : NaN;
            var lon = alarm.lon != null ? parseFloat(alarm.lon) : NaN;
            if (!isNaN(lat) && !isNaN(lon)) return { lat: lat, lon: lon };
            var camId = alarm.cameraId;
            if (camId && deviceMarkers[camId]) {
                var ll = deviceMarkers[camId].getLatLng();
                if (ll && ll.lat != null && ll.lng != null) {
                    return { lat: ll.lat, lon: ll.lng };
                }
            }
            return null;
        }

        function mergeMapPositionInCache(camId, lat, lon, online) {
            var id = normalizeCamId(camId);
            if (!id || lat == null || lon == null || isNaN(lat) || isNaN(lon)) return;
            var found = false;
            mapPositionsCache = (mapPositionsCache || []).map(function (d) {
                var did = normalizeCamId(d && (d.cameraId || d.id));
                if (did !== id) return d;
                found = true;
                return Object.assign({}, d, {
                    cameraId: id,
                    lat: lat,
                    lon: lon,
                    online: online != null ? !!online : d.online !== false,
                });
            });
            if (!found) {
                mapPositionsCache.push({
                    cameraId: id,
                    lat: lat,
                    lon: lon,
                    online: online !== false,
                });
            }
        }

        var sosNearbyGpsRefreshTimers = [];

        function clearSosNearbyGpsRefreshTimers() {
            sosNearbyGpsRefreshTimers.forEach(function (t) { clearTimeout(t); });
            sosNearbyGpsRefreshTimers = [];
        }

        function scheduleSosNearbyGpsRefresh() {
            clearSosNearbyGpsRefreshTimers();
            [2500, 8000].forEach(function (delayMs) {
                sosNearbyGpsRefreshTimers.push(setTimeout(function () {
                    if (!sosIncidentActive || !pendingSosAck) return;
                    fetchMapPositionsForSos(function () {
                        refreshSosResponseTeam();
                    });
                }, delayMs));
            });
        }

        function sosDevicePositionsForScan() {
            var byId = {};
            (mapPositionsCache || []).forEach(function (d) {
                var camId = d && (d.cameraId || d.id) ? String(d.cameraId || d.id) : '';
                if (!camId || d.lat == null || d.lon == null) return;
                byId[normalizeCamId(camId)] = {
                    cameraId: normalizeCamId(camId),
                    lat: parseFloat(d.lat),
                    lon: parseFloat(d.lon),
                    online: d.online !== false,
                    name: d.name || d.operatorName || camId,
                };
            });
            Object.keys(deviceMarkers).forEach(function (camId) {
                var id = normalizeCamId(camId);
                if (!id || byId[id]) return;
                var m = deviceMarkers[camId];
                if (!m) return;
                var ll = m.getLatLng();
                byId[id] = {
                    cameraId: id,
                    lat: ll.lat,
                    lon: ll.lng,
                    online: isCamOnlineOnFleet(camId),
                    name: (typeof FleetDisplay !== 'undefined' && FleetDisplay.friendlyDeviceName)
                        ? FleetDisplay.friendlyDeviceName(camId)
                        : camId,
                };
            });
            if (typeof FleetUi !== 'undefined' && FleetUi.getAllDevices) {
                FleetUi.getAllDevices().forEach(function (m) {
                    if (!m || !m.id) return;
                    var id = normalizeCamId(m.id);
                    if (byId[id]) {
                        byId[id].online = m.status === '1';
                        if (m.name) byId[id].name = m.name;
                        return;
                    }
                    var mk = deviceMarkers[id] || deviceMarkers[m.id];
                    if (!mk) return;
                    var ll = mk.getLatLng();
                    byId[id] = {
                        cameraId: id,
                        lat: ll.lat,
                        lon: ll.lng,
                        online: m.status === '1',
                        name: m.name || id,
                    };
                });
            }
            return Object.keys(byId).map(function (id) { return byId[id]; });
        }

        function computeSosNearby(radiusM) {
            var center = getSosAlarmCenterLatLon();
            if (!center) return [];
            var alarmCamId = pendingSosAck && pendingSosAck.cameraId ? normalizeCamId(pendingSosAck.cameraId) : '';
            var out = [];
            sosDevicePositionsForScan().forEach(function (d) {
                var camId = normalizeCamId(d.cameraId);
                if (!camId || camId === alarmCamId) return;
                if (d.lat == null || d.lon == null || isNaN(d.lat) || isNaN(d.lon)) return;
                var dist = haversineMeters(center.lat, center.lon, d.lat, d.lon);
                if (dist > radiusM) return;
                var name = d.name;
                if (typeof FleetDisplay !== 'undefined' && FleetDisplay.friendlyDeviceName) {
                    name = FleetDisplay.friendlyDeviceName(camId) || name;
                } else if (typeof FleetUi !== 'undefined' && FleetUi.getDeviceName) {
                    name = FleetUi.getDeviceName(camId) || name;
                }
                if (!d.online) name = name + ' (offline)';
                out.push({ cameraId: camId, distanceM: Math.round(dist), name: name, online: !!d.online });
            });
            out.sort(function (a, b) { return a.distanceM - b.distanceM; });
            return out.slice(0, SOS_RESPONSE_MAX);
        }

        function computeNearestSosUnit() {
            var center = getSosAlarmCenterLatLon();
            if (!center) return null;
            var alarmCamId = pendingSosAck && pendingSosAck.cameraId ? normalizeCamId(pendingSosAck.cameraId) : '';
            var nearest = null;
            sosDevicePositionsForScan().forEach(function (d) {
                var camId = normalizeCamId(d.cameraId);
                if (!camId || camId === alarmCamId) return;
                if (d.lat == null || d.lon == null || isNaN(d.lat) || isNaN(d.lon)) return;
                var dist = haversineMeters(center.lat, center.lon, d.lat, d.lon);
                if (!nearest || dist < nearest.distanceM) {
                    nearest = { cameraId: camId, distanceM: Math.round(dist), name: d.name, online: !!d.online };
                }
            });
            return nearest;
        }

        function sosPttTeamFriendlyNames(team) {
            return (team || []).map(function (id) {
                if (typeof FleetDisplay !== 'undefined' && FleetDisplay.friendlyDeviceName) {
                    return FleetDisplay.friendlyDeviceName(id) || String(id).slice(-4);
                }
                if (typeof FleetUi !== 'undefined' && FleetUi.getDeviceName) {
                    return FleetUi.getDeviceName(id) || String(id).slice(-4);
                }
                return String(id).slice(-4);
            });
        }

        function showSosPttTeamToast(message, ms) {
            var el = document.getElementById('sos-ptt-team-toast');
            if (!el) {
                el = document.createElement('div');
                el.id = 'sos-ptt-team-toast';
                el.setAttribute('role', 'status');
                el.setAttribute('aria-live', 'polite');
                document.body.appendChild(el);
            }
            el.textContent = message;
            el.hidden = false;
            if (window._sosPttTeamToastTimer) clearTimeout(window._sosPttTeamToastTimer);
            window._sosPttTeamToastTimer = setTimeout(function () { el.hidden = true; }, ms || 12000);
        }

        function endSosPttTeam() {
            if (global.VideoWall && VideoWall.restorePttAfterSosSessionClose) {
                VideoWall.restorePttAfterSosSessionClose();
            } else {
                global.activeSosPttTeam = null;
                var dispatchActive = global.activeDispatchPttTeam && global.activeDispatchPttTeam.length > 1;
                if (!dispatchActive) {
                    fetch('/api/ptt-restore-always-on', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'same-origin',
                        body: JSON.stringify({ source: 'sos-team-end' }),
                    }).catch(function () { /* ignore */ });
                }
            }
            var pttToast = document.getElementById('sos-ptt-team-toast');
            if (pttToast) pttToast.hidden = true;
            syncSosPttTeamUi();
            setPttGroupStatus('SOS response team ended.', false);
        }
        window.endSosPttTeam = endSosPttTeam;

        function syncSosPttTeamUi() {
            var team = global.activeSosPttTeam;
            var active = Array.isArray(team) && team.length > 1;
            var btn = document.getElementById('sos-ptt-team-btn');
            if (btn) {
                btn.classList.toggle('active', active);
                btn.setAttribute('aria-pressed', active ? 'true' : 'false');
                btn.textContent = active ? 'PTT TEAM · ON' : dashboardTr('sos.banner.pttTeam');
            }
            var sidebar = document.getElementById('sos-ptt-team-sidebar');
            var postBanner = active && getSosAlarmCount() === 0;
            if (sidebar) {
                sidebar.hidden = !postBanner;
                if (postBanner) {
                    var sideSummary = document.getElementById('sos-ptt-team-sidebar-summary');
                    if (sideSummary) {
                        var sideLabels = sosPttTeamFriendlyNames(team).join(', ');
                        sideSummary.textContent = 'SOS response team — ' + team.length + ' unit(s): '
                            + sideLabels + '. Hold PTT on map pin or wall.';
                    }
                }
            }
            var el = document.getElementById('sos-response-summary');
            if (!el) {
                syncSosPttMemberUi();
                return;
            }
            if (!active) {
                el.classList.remove('sos-ptt-team-active');
                syncSosPttMemberUi();
                return;
            }
            var labels = sosPttTeamFriendlyNames(team).join(', ');
            el.classList.add('sos-ptt-team-active');
            el.textContent = 'PTT team ON — ' + team.length + ' unit(s): ' + labels
                + '. Hold PTT on map pin or wall during active SOS.';
            syncSosPttMemberUi();
        }

        function sosPttTeamSizeNow() {
            var team = global.activeSosPttTeam;
            if (team && team.length) return team.length;
            return (pendingSosAck && pendingSosAck.cameraId) ? 1 : 0;
        }

        function sosPttOnTeamMap() {
            var onTeam = {};
            var alarmCamId = pendingSosAck && pendingSosAck.cameraId
                ? normalizeCamId(pendingSosAck.cameraId) : '';
            (global.activeSosPttTeam || []).forEach(function (id) { onTeam[normalizeCamId(id)] = true; });
            if (alarmCamId && (!global.activeSosPttTeam || !global.activeSosPttTeam.length)) {
                onTeam[alarmCamId] = true;
            }
            return { onTeam: onTeam, alarmCamId: alarmCamId };
        }

        function computeFleetPttMemberCandidates() {
            var meta = sosPttOnTeamMap();
            var onTeam = meta.onTeam;
            if (sosPttTeamSizeNow() >= SOS_RESPONSE_MAX) return [];
            var center = getSosAlarmCenterLatLon();
            var radiusM = getSosResponseRadiusM();
            var byId = {};
            sosDevicePositionsForScan().forEach(function (d) {
                var camId = normalizeCamId(d.cameraId);
                if (!camId || onTeam[camId] || d.online === false) return;
                if (d.lat == null || d.lon == null || isNaN(d.lat) || isNaN(d.lon)) return;
                var dist = center
                    ? haversineMeters(center.lat, center.lon, d.lat, d.lon) : null;
                var name = d.name;
                if (typeof FleetDisplay !== 'undefined' && FleetDisplay.friendlyDeviceName) {
                    name = FleetDisplay.friendlyDeviceName(camId) || name;
                } else if (typeof FleetUi !== 'undefined' && FleetUi.getDeviceName) {
                    name = FleetUi.getDeviceName(camId) || name;
                }
                byId[camId] = {
                    cameraId: camId,
                    distanceM: dist != null ? Math.round(dist) : null,
                    name: name || camId,
                    outsideCircle: dist != null && dist > radiusM,
                    remote: false,
                };
            });
            if (typeof BwcDevices !== 'undefined' && BwcDevices.listDevices) {
                BwcDevices.listDevices().forEach(function (row) {
                    var camId = normalizeCamId(row && row.deviceId);
                    if (!camId || onTeam[camId] || byId[camId]) return;
                    if (!isCamOnlineOnFleet(camId)) return;
                    var name = row.operatorName || camId;
                    if (typeof FleetDisplay !== 'undefined' && FleetDisplay.friendlyDeviceName) {
                        name = FleetDisplay.friendlyDeviceName(camId) || name;
                    } else if (typeof FleetUi !== 'undefined' && FleetUi.getDeviceName) {
                        name = FleetUi.getDeviceName(camId) || name;
                    }
                    byId[camId] = {
                        cameraId: camId,
                        distanceM: null,
                        name: name,
                        outsideCircle: true,
                        remote: true,
                    };
                });
            }
            var out = Object.keys(byId).map(function (k) { return byId[k]; });
            out.sort(function (a, b) {
                if (a.distanceM == null && b.distanceM == null) {
                    return String(a.name).localeCompare(String(b.name));
                }
                if (a.distanceM == null) return 1;
                if (b.distanceM == null) return -1;
                return a.distanceM - b.distanceM;
            });
            return out;
        }

        function renderSosPttMemberList() {
            var list = document.getElementById('sos-ptt-add-list');
            if (!list) return;
            var candidates = computeFleetPttMemberCandidates();
            if (!candidates.length) {
                list.innerHTML = '<span class="sos-ptt-member-empty">No more online units to add '
                    + '(max ' + SOS_RESPONSE_MAX + ', or everyone on fleet is already on the team).</span>';
                return;
            }
            list.innerHTML = candidates.map(function (d) {
                var cid = String(d.cameraId).replace(/"/g, '&quot;');
                var distLabel = d.distanceM != null
                    ? (' (' + d.distanceM + ' m' + (d.outsideCircle ? ' · outside circle' : '') + ')')
                    : ' (remote / no GPS)';
                var cls = 'sos-ptt-add-btn' + (d.remote ? ' remote' : (d.outsideCircle ? ' outside' : ''));
                return '<button type="button" class="' + cls + '" data-cam-id="' + cid + '">+ '
                    + escapePinText(d.name) + distLabel + '</button>';
            }).join('');
            list.querySelectorAll('.sos-ptt-add-btn').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    addSosPttHelper(btn.getAttribute('data-cam-id'));
                });
            });
        }

        function syncSosPttMemberUi() {
            var strip = document.getElementById('sos-ptt-add-strip');
            var btn = document.getElementById('sos-ptt-member-btn');
            var panel = document.getElementById('sos-ptt-member-panel');
            if (!strip || !btn) return;
            if (!sosIncidentActive) {
                strip.hidden = true;
                if (panel) panel.hidden = true;
                return;
            }
            strip.hidden = false;
            var full = sosPttTeamSizeNow() >= SOS_RESPONSE_MAX;
            btn.disabled = full;
            btn.title = full
                ? ('PTT team full (' + SOS_RESPONSE_MAX + ' max)')
                : 'Add car fleet, remote, or extra officers to SOS PTT';
            if (!btn._sosPttMemberHook) {
                btn._sosPttMemberHook = true;
                btn.addEventListener('click', function () {
                    if (btn.disabled) return;
                    var p = document.getElementById('sos-ptt-member-panel');
                    if (!p) return;
                    if (p.hidden) {
                        renderSosPttMemberList();
                        p.hidden = false;
                    } else {
                        p.hidden = true;
                    }
                });
            }
        }

        function prewakeSosPttTeam(camIds) {
            if (!camIds || !camIds.length || !socket) return;
            camIds.forEach(function (id) {
                if (id) socket.emit('ptt-wake-device', { camId: id });
            });
        }

        function applySosPttTeamResult(data, opts) {
            opts = opts || {};
            if (!data || !data.ok || !data.pttTeam || !data.pttTeam.team) return false;
            global.activeSosPttTeam = data.pttTeam.team.slice();
            prewakeSosPttTeam(data.pttTeam.team);
            syncSosPttTeamUi();
            if (!opts.silentToast) {
                var names = sosPttTeamFriendlyNames(data.pttTeam.team).join(' + ');
                showSosPttTeamToast('PTT team ON — ' + names + ' (' + data.pttTeam.team.length + ' units). Hold PTT to talk.', 14000);
            }
            renderSosPttMemberList();
            return true;
        }

        function addSosPttHelper(helperCamId) {
            helperCamId = normalizeCamId(helperCamId);
            var alarm = getFocusedSosAlarm() || pendingSosAck;
            if (!alarm || !alarm.cameraId) {
                alert('No active SOS alarm.');
                return;
            }
            if (sosPttTeamSizeNow() >= SOS_RESPONSE_MAX) {
                alert('PTT team is full (' + SOS_RESPONSE_MAX + ' units max).');
                return;
            }
            var onTeam = sosPttOnTeamMap().onTeam;
            if (onTeam[helperCamId]) {
                alert('That unit is already on the PTT team.');
                return;
            }
            var list = document.getElementById('sos-ptt-add-list');
            if (list) {
                list.querySelectorAll('.sos-ptt-add-btn').forEach(function (b) { b.disabled = true; });
            }
            var addName = (typeof FleetDisplay !== 'undefined' && FleetDisplay.friendlyDeviceName)
                ? FleetDisplay.friendlyDeviceName(helperCamId) : helperCamId;
            showSosPttTeamToast('Adding ' + addName + ' to PTT team…', 8000);
            var team = global.activeSosPttTeam;
            var useFullPush = !team || team.length < 2;
            var fetchOpts = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: useFullPush
                    ? JSON.stringify({ cameraId: alarm.cameraId, helperCamIds: [helperCamId] })
                    : JSON.stringify({
                        cameraId: alarm.cameraId,
                        helperCamIds: [helperCamId],
                        existingTeam: team.slice(),
                    }),
            };
            fetch(useFullPush ? '/api/sos-ptt-team' : '/api/sos-ptt-team-add', fetchOpts)
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    if (applySosPttTeamResult(data, { silentToast: !useFullPush })) {
                        if (!useFullPush) {
                            showSosPttTeamToast('Added ' + addName + ' — team now '
                                + data.pttTeam.team.length + ' unit(s).', 12000);
                        }
                    } else {
                        showSosPttTeamToast((data && data.error) || 'Add to PTT failed.', 8000);
                        alert((data && data.error) || 'Add to PTT failed.');
                        renderSosPttMemberList();
                    }
                })
                .catch(function () {
                    showSosPttTeamToast('Add to PTT failed.', 8000);
                    alert('Add to PTT failed.');
                    renderSosPttMemberList();
                });
        }
        window.addSosPttHelper = addSosPttHelper;

        function updateSosResponseSummary() {
            var el = document.getElementById('sos-response-summary');
            if (!el) return;
            if (global.activeSosPttTeam && global.activeSosPttTeam.length > 1) {
                syncSosPttTeamUi();
                return;
            }
            el.classList.remove('sos-ptt-team-active');
            var radiusM = getSosResponseRadiusM();
            var n = sosResponseNearby.length;
            if (!getSosAlarmCenterLatLon()) {
                el.textContent = dashboardTr('sos.response.noGps');
                return;
            }
            if (!n) {
                var nearest = computeNearestSosUnit();
                var base = dashboardTr('sos.response.noneNearby', { radius: radiusM });
                if (nearest) {
                    var nName = nearest.name || nearest.cameraId;
                    if (typeof FleetDisplay !== 'undefined' && FleetDisplay.friendlyDeviceName) {
                        nName = FleetDisplay.friendlyDeviceName(nearest.cameraId) || nName;
                    }
                    var offTag = nearest.online ? '' : ' (offline)';
                    el.textContent = base + ' Nearest (GPS): ' + nName + offTag + ' — ' + nearest.distanceM + ' m.';
                } else {
                    el.textContent = base;
                }
                return;
            }
            var names = sosResponseNearby.map(function (x) {
                return x.name + ' (' + x.distanceM + ' m)';
            }).join(', ');
            el.textContent = dashboardTr('sos.response.nearby', { n: n, max: SOS_RESPONSE_MAX, radius: radiusM, names: names })
                + ' — Press PTT team to join them on one push-to-talk group (audio only).';
        }

        function pushSosPttTeamNow() {
            var alarm = getFocusedSosAlarm() || pendingSosAck;
            if (!alarm || !alarm.cameraId) {
                alert('No active SOS alarm.');
                return;
            }
            var btn = document.getElementById('sos-ptt-team-btn');
            if (btn && btn.disabled) return;
            if (btn) btn.disabled = true;
            showSosPttTeamToast('Pushing PTT team to nearby units…', 8000);
            refreshSosResponseTeam();
            var helpers = sosResponseNearby.filter(function (d) { return d.online !== false; }).map(function (d) { return d.cameraId; });
            if (!helpers.length) {
                var nearest = computeNearestSosUnit();
                if (nearest && nearest.online !== false && confirm('No unit inside radius. Push PTT to nearest (' + (nearest.name || nearest.cameraId) + ', ' + nearest.distanceM + ' m GPS)?')) {
                    helpers = [nearest.cameraId];
                } else if (!nearest || nearest.online === false) {
                    if (btn) btn.disabled = false;
                    alert('No online nearby units in circle. Use + Team Member or widen radius.');
                    return;
                } else {
                    if (btn) btn.disabled = false;
                    return;
                }
            }
            fetch('/api/sos-ptt-team', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cameraId: alarm.cameraId,
                    helperCamIds: helpers,
                }),
            }).then(function (r) { return r.json(); }).then(function (data) {
                if (!applySosPttTeamResult(data)) {
                    showSosPttTeamToast((data && data.error) || 'PTT push failed.', 8000);
                    alert((data && data.error) || 'PTT push failed. Is PTT enabled on server?');
                }
            }).catch(function () {
                showSosPttTeamToast('PTT push failed.', 8000);
                alert('PTT push failed.');
            }).finally(function () {
                if (btn) btn.disabled = false;
            });
        }
        window.pushSosPttTeamNow = pushSosPttTeamNow;

        function pushSosSmartGpsTeam() {
            var alarm = getFocusedSosAlarm() || pendingSosAck;
            if (!alarm || !alarm.cameraId) return;
            refreshSosResponseTeam();
            var helpers = sosResponseNearby.filter(function (d) { return d.online !== false; }).map(function (d) { return d.cameraId; });
            fetch('/api/smart-gps/sos-team', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({
                    cameraId: alarm.cameraId,
                    helperCamIds: helpers,
                }),
            }).catch(function () { /* ignore */ });
        }

        function syncSosResponseCircleGeometry() {
            var center = getSosAlarmCenterLatLon();
            if (!center || !sosResponseCircle) return;
            var radiusM = getSosResponseRadiusM();
            var latlng = [center.lat, center.lon];
            sosResponseCircle.setLatLng(latlng);
            sosResponseCircle.setRadius(radiusM);
            if (sosResponseCircleRing) {
                sosResponseCircleRing.setLatLng(latlng);
                sosResponseCircleRing.setRadius(radiusM);
            }
            if (sosResponseRadiusLabel) {
                var edge = destinationPoint(center.lat, center.lon, radiusM, 90);
                sosResponseRadiusLabel.setLatLng(edge);
                var inner = sosResponseRadiusLabel.getElement && sosResponseRadiusLabel.getElement();
                if (inner) {
                    var chip = inner.querySelector('.sos-radius-map-label');
                    if (chip) chip.textContent = radiusM + ' m';
                }
            }
        }

        function refreshSosResponseTeam() {
            if (!sosIncidentActive || !pendingSosAck) return;
            var radiusM = getSosResponseRadiusM();
            sosResponseNearby = computeSosNearby(radiusM);
            updateSosResponseSummary();
            syncSosResponseCircleGeometry();
        }

        function fetchMapPositionsForSos(cb) {
            fetch('/api/map-positions')
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    mapPositionsCache = (data && data.devices) ? data.devices : [];
                    if (typeof cb === 'function') cb();
                })
                .catch(function () {
                    if (typeof cb === 'function') cb();
                });
        }

        function drawSosResponseCircle() {
            clearSosResponseCircle(false);
            var center = getSosAlarmCenterLatLon();
            if (!center) {
                updateSosResponseSummary();
                return;
            }
            var radiusM = getSosResponseRadiusM();
            var latlng = [center.lat, center.lon];
            sosResponseCircle = L.circle(latlng, {
                radius: radiusM,
                color: '#ef4444',
                weight: 1,
                fillColor: '#ef4444',
                fillOpacity: 0.14,
                interactive: false,
            }).addTo(map);
            sosResponseCircleRing = L.circle(latlng, {
                radius: radiusM,
                color: '#ffffff',
                weight: 2.5,
                fillOpacity: 0,
                dashArray: '10, 7',
                interactive: false,
            }).addTo(map);
            var edge = destinationPoint(center.lat, center.lon, radiusM, 90);
            sosResponseRadiusLabel = L.marker(edge, {
                icon: L.divIcon({
                    className: 'sos-radius-label-icon',
                    html: '<div class="sos-radius-map-label">' + radiusM + ' m</div>',
                    iconSize: [0, 0],
                    iconAnchor: [0, 12],
                }),
                interactive: false,
            }).addTo(map);
            sosResponseCircle.bringToFront();
            sosResponseCircleRing.bringToFront();
            sosResponseRadiusLabel.bringToFront();
            sosResponseNearby = computeSosNearby(radiusM);
            updateSosResponseSummary();
        }

        function clearSosResponseCircle(clearNearby) {
            if (clearNearby !== false) sosResponseNearby = [];
            if (sosResponseCircle) {
                try { map.removeLayer(sosResponseCircle); } catch (_) { /* ignore */ }
                sosResponseCircle = null;
            }
            if (sosResponseCircleRing) {
                try { map.removeLayer(sosResponseCircleRing); } catch (_) { /* ignore */ }
                sosResponseCircleRing = null;
            }
            if (sosResponseRadiusLabel) {
                try { map.removeLayer(sosResponseRadiusLabel); } catch (_) { /* ignore */ }
                sosResponseRadiusLabel = null;
            }
        }

        function onSosResponseRadiusChange() {
            if (!sosIncidentActive) return;
            fetchMapPositionsForSos(function () {
                drawSosResponseCircle();
                schedulePinPopupReposition();
            });
        }

        function drawSosResponseCircleFromServer() {
            fetchMapPositionsForSos(function () {
                drawSosResponseCircle();
                schedulePinPopupReposition();
                setTimeout(schedulePinPopupReposition, 200);
            });
        }

        function paintSosMapPin(camId, data, openPopup) {
            var lat = data.lat != null && data.lat !== '' ? parseFloat(data.lat) : NaN;
            var lon = data.lon != null && data.lon !== '' ? parseFloat(data.lon) : NaN;
            var skipPan = !!(data && !data.startVideo && (data.refresh || data.fromLiveBye || data.alreadyLive));
            if ((isNaN(lat) || isNaN(lon)) && lastMapPos && normalizeCamId(lastMapCamId) === camId) {
                lat = lastMapPos.lat;
                lon = lastMapPos.lon;
            }
            if (!isNaN(lat) && !isNaN(lon)) {
                placeCameraMarker(lat, lon, camId, true, !!openPopup, { skipPan: skipPan });
                return;
            }
            if (deviceMarkers[camId]) {
                var ll = deviceMarkers[camId].getLatLng();
                upsertDeviceMarker(camId, ll.lat, ll.lng, true, !!openPopup);
                refreshAllDeviceMarkerStyles();
            }
        }

        function positionSosReceivedToast(el) {
            if (!el) return;
            var banner = document.getElementById('sos-banner');
            var bannerVisible = banner && banner.style.display !== 'none' && banner.offsetHeight > 0;
            if (bannerVisible) {
                var bottom = banner.getBoundingClientRect().bottom;
                el.style.top = (bottom + 6) + 'px';
                el.style.left = '50%';
                el.style.right = 'auto';
                el.style.transform = 'translateX(-50%)';
            } else {
                el.style.top = '52px';
                el.style.right = '12px';
                el.style.left = 'auto';
                el.style.transform = 'none';
            }
        }

        function flashSosReceivedToast(camId) {
            var el = document.getElementById('sos-received-toast');
            if (!el) {
                el = document.createElement('div');
                el.id = 'sos-received-toast';
                document.body.appendChild(el);
            }
            el.textContent = 'SOS received · ' + (camId || '');
            el.hidden = false;
            positionSosReceivedToast(el);
            requestAnimationFrame(function () { positionSosReceivedToast(el); });
            if (window._sosToastTimer) clearTimeout(window._sosToastTimer);
            window._sosToastTimer = setTimeout(function () { el.hidden = true; }, 8000);
        }

        /** Every sos-alarm event runs full UI — no sameSos early return (replay-only bypass caused cold-start silence). */
        function onDashboardSosAlarm(data) {
            try {
                if (!data || !data.cameraId) return;
                var camId = normalizeCamId(data.cameraId);
                if (typeof console !== 'undefined' && console.info) {
                    console.info('[SOS] dashboard event', data.action || 'sos-alarm', camId, {
                        startVideo: !!data.startVideo,
                        refresh: !!data.refresh,
                        replay: !!data.replay,
                        fromLiveBye: !!data.fromLiveBye,
                    });
                }
                upsertActiveSosAlarm({
                    cameraId: camId,
                    time: data.time || '',
                    lat: data.lat,
                    lon: data.lon,
                    incidentId: data.incidentId || null,
                    alarmKind: data.alarmKind === 'fall' ? 'fall' : 'sos',
                });
                if (!focusedSosCamId || data.startVideo) focusedSosCamId = camId;
                sosIncidentActive = getSosAlarmCount() > 0;
                activeAlarmKind = activeSosAlarms[camId].alarmKind || 'sos';
                global.activeSosPttTeam = null;
                syncSosPttTeamUi();
                clearMapPinPopupSuppression(camId);
                pendingSosAck = getFocusedSosAlarm();
                refreshSosStormBanner();
                if (global.VideoWall && VideoWall.liveFramePreviewDataUrl) {
                    var sosSnapEarly = VideoWall.liveFramePreviewDataUrl(camId);
                    if (sosSnapEarly && activeSosAlarms[camId]) activeSosAlarms[camId].stashSnapshot = sosSnapEarly;
                }
                if (global.VideoWall && VideoWall.syncWallStopDuringSos) VideoWall.syncWallStopDuringSos();
        flashSosReceivedToast(camId);
        var openPopup = true; // Force the pin video pop-out window to open instantly
        paintSosMapPin(camId, data, openPopup);
                VideoWall.onSosAlarm(data);
                if (global.VideoWall && VideoWall.unmuteAudioForSosCam) {
                    getActiveSosCamIds().forEach(function (id) { VideoWall.unmuteAudioForSosCam(id); });
                }
                stashSosAckSnapshot(camId);
                resyncPinVideoAfterSosAck(camId);
                setTimeout(function () {
                    assignColocatedPinPopupDocks();
                }, 200);
                if (data.refresh || data.fromLiveBye) {
                    schedulePinPopupReposition();
                }
                fetchMapPositionsForSos(function () {
                    refreshSosResponseTeam();
                    if (!data.refresh && !data.replay && !data.fromLiveBye) {
                        pushSosSmartGpsTeam();
                    }
                });
                if (!data.refresh && !data.replay && !data.fromLiveBye) {
                    scheduleSosNearbyGpsRefresh();
                }
                requestAnimationFrame(function () {
                    drawSosResponseCircleFromServer();
                    schedulePinPopupReposition();
                });
                renderSosAlarmStrip();
                refreshSosLedger();
            } catch (err) {
                if (typeof console !== 'undefined' && console.error) {
                    console.error('[SOS] handler error', err);
                }
            }
        }
        while (pendingSosAlarmEvents.length) onDashboardSosAlarm(pendingSosAlarmEvents.shift());

        socket.on('connect', function () {
            if (typeof restoreOpenSosBanner === 'function') restoreOpenSosBanner();
        });

        socket.on('geofence-breach', function (data) {
            if (!data || !data.cameraId) return;
            setCamGeofenceOutside(data.cameraId, true);
            var name = data.operatorName || '';
            if (!name && typeof FleetDisplay !== 'undefined') name = FleetDisplay.friendlyDeviceName(data.cameraId);
            else if (!name) name = 'BWC #' + String(data.cameraId).slice(-4);
            showGeofenceToast(dashboardTr('geofence.toast.breach', { name: name }));
            if (data.lat != null && data.lon != null) {
                upsertDeviceMarker(data.cameraId, parseFloat(data.lat), parseFloat(data.lon), isCamSosActive(data.cameraId), false);
            }
        });

        socket.on('geofence-enter', function (data) {
            if (!data || !data.cameraId) return;
            setCamGeofenceOutside(data.cameraId, false);
            var name = data.operatorName || '';
            if (!name && typeof FleetDisplay !== 'undefined') name = FleetDisplay.friendlyDeviceName(data.cameraId);
            else if (!name) name = 'BWC #' + String(data.cameraId).slice(-4);
            showGeofenceToast(dashboardTr('geofence.toast.reentered', { name: name }), 3500);
        });

        socket.on('geofence-status', function (data) {
            if (!data || !data.cameraId) return;
            setCamGeofenceOutside(data.cameraId, !!data.geofenceOutside);
            if (data.lat != null && data.lon != null) {
                upsertDeviceMarker(data.cameraId, parseFloat(data.lat), parseFloat(data.lon), isCamSosActive(data.cameraId), false);
            }
        });

        socket.on('geofence-update', function (data) {
            if (!data || !data.cameraId) return;
            drawGeofenceForDevice(data.cameraId, data.geofence || null);
            if (Object.prototype.hasOwnProperty.call(data, 'geofenceOutside')) {
                setCamGeofenceOutside(data.cameraId, !!data.geofenceOutside);
            } else if (!data.geofence) {
                setCamGeofenceOutside(data.cameraId, false);
            }
        });

        function showGeofenceToast(text, ms) {
            var el = document.getElementById('map-geofence-toast');
            if (!el) return;
            el.textContent = text;
            el.style.display = 'block';
            if (geofenceToastTimer) clearTimeout(geofenceToastTimer);
            geofenceToastTimer = setTimeout(function () {
                el.style.display = 'none';
            }, ms || 8000);
        }

        function drawGeofenceForDevice(camId, gf) {
            if (geofenceLayers[camId]) {
                try { map.removeLayer(geofenceLayers[camId]); } catch (_) { /* ignore */ }
                delete geofenceLayers[camId];
            }
            if (!gf || typeof gf !== 'object') return;
            var layer = null;
            if (gf.mode === 'circle') {
                var clat = Number(gf.centerLat);
                var clng = Number(gf.centerLng);
                var rm = Number(gf.radiusM);
                if (Number.isFinite(clat) && Number.isFinite(clng) && rm > 0) {
                    layer = L.circle([clat, clng], {
                        radius: rm,
                        color: '#38bdf8',
                        weight: 2,
                        dashArray: '6 4',
                        fillColor: '#0ea5e9',
                        fillOpacity: 0.08,
                        interactive: false,
                        bubblingMouseEvents: false,
                    }).addTo(map);
                }
            } else if (gf.mode === 'polygon' && Array.isArray(gf.ring) && gf.ring.length >= 3) {
                var latlngs = gf.ring.map(function (p) { return [Number(p.lat), Number(p.lng)]; });
                layer = L.polygon(latlngs, {
                    color: '#38bdf8',
                    weight: 2,
                    dashArray: '6 4',
                    fillColor: '#0ea5e9',
                    fillOpacity: 0.08,
                }).addTo(map);
            }
            if (layer) geofenceLayers[camId] = layer;
        }

        function syncGeofenceLayers() {
            if (typeof BwcDevices === 'undefined' || !BwcDevices.listDevices) return;
            var seen = {};
            BwcDevices.listDevices().forEach(function (d) {
                if (!d || !d.deviceId) return;
                seen[d.deviceId] = true;
                drawGeofenceForDevice(d.deviceId, d.geofence || null);
            });
            Object.keys(geofenceLayers).forEach(function (id) {
                if (!seen[id]) {
                    try { map.removeLayer(geofenceLayers[id]); } catch (_) { /* ignore */ }
                    delete geofenceLayers[id];
                }
            });
        }
        window.syncGeofenceLayers = syncGeofenceLayers;

        function getGeofenceRadiusM() {
            var radEl = document.getElementById('geofence-radius');
            var rad = radEl ? parseInt(radEl.value, 10) : 200;
            if (!Number.isFinite(rad) || rad < 50) rad = 200;
            if (rad > 50000) rad = 50000;
            return rad;
        }

        async function fillGeofenceAuthFields(userElId, passElId) {
            var userEl = document.getElementById(userElId);
            if (!userEl) return;
            try {
                var sess = await fetch('/api/auth/session').then(function (r) { return r.json(); });
                if (sess && sess.ok && sess.username) userEl.value = sess.username;
            } catch (_) { /* ignore */ }
            var passEl = passElId ? document.getElementById(passElId) : null;
            if (passEl) passEl.value = '';
        }

        var geofenceSetDevicesAll = [];
        var geofenceClearDevicesAll = [];

        function filterGeofenceDevices(devices, filterVal) {
            var list = devices || [];
            if (filterVal === 'geofenced') list = list.filter(function (d) { return d.hasGeofence; });
            if (filterVal === 'online') list = list.filter(function (d) { return d.online; });
            if (filterVal === 'offline') list = list.filter(function (d) { return !d.online; });
            return list;
        }

        function geofencePickTagsHtml(d, opts) {
            opts = opts || {};
            var tags = '';
            if (opts.showOnline !== false) {
                tags += d.online
                    ? '<span class="geofence-pick-tag online">' + dashboardTr('geofence.tag.online') + '</span>'
                    : '<span class="geofence-pick-tag offline">' + dashboardTr('geofence.tag.offline') + '</span>';
            }
            if (d.hasGeofence) {
                tags += '<span class="geofence-pick-tag geofenced">' + dashboardTr('geofence.tag.geofenced') + '</span>';
            } else if (opts.showGeofence || opts.clearableOnly) {
                tags += '<span class="geofence-pick-tag no-geofence">' + dashboardTr('geofence.tag.noGeofence') + '</span>';
            }
            return tags ? ('<span class="geofence-pick-tags">' + tags + '</span>') : '';
        }

        function renderGeofencePickList(listEl, emptyEl, devices, radioName, preselectId, opts) {
            if (!listEl || !emptyEl) return;
            opts = opts || {};
            listEl.innerHTML = '';
            if (!devices || !devices.length) {
                emptyEl.hidden = false;
                return;
            }
            emptyEl.hidden = true;
            var firstSelectable = null;
            if (opts.clearableOnly) {
                for (var fi = 0; fi < devices.length; fi++) {
                    if (devices[fi].hasGeofence) { firstSelectable = devices[fi]; break; }
                }
            }
            devices.forEach(function (d, i) {
                var clearable = !opts.clearableOnly || !!d.hasGeofence;
                var label = document.createElement('label');
                label.className = 'geofence-pick-option' + (clearable ? '' : ' geofence-pick-disabled');
                var name = d.operatorName || (typeof FleetDisplay !== 'undefined' ? FleetDisplay.friendlyDeviceName(d.deviceId) : d.deviceId);
                var group = d.mapGroup ? (' · ' + d.mapGroup) : '';
                var checked = false;
                if (clearable) {
                    if (preselectId && d.deviceId === preselectId && d.hasGeofence) checked = true;
                    else if (!preselectId && firstSelectable && d.deviceId === firstSelectable.deviceId) checked = true;
                    else if (!opts.clearableOnly && ((preselectId && d.deviceId === preselectId) || (!preselectId && i === 0))) checked = true;
                }
                label.innerHTML = '<input type="radio" name="' + radioName + '" value="' + String(d.deviceId).replace(/"/g, '&quot;') + '"' +
                    (checked ? ' checked' : '') + (clearable ? '' : ' disabled') + '>' +
                    '<span class="pick-name">' + String(name).replace(/</g, '&lt;') + group + '</span>' +
                    geofencePickTagsHtml(d, opts);
                listEl.appendChild(label);
            });
        }

        function refreshGeofenceSetList() {
            var filterVal = (document.getElementById('geofence-set-filter') || {}).value || 'all';
            renderGeofencePickList(
                document.getElementById('geofence-set-list'),
                document.getElementById('geofence-set-empty'),
                filterGeofenceDevices(geofenceSetDevicesAll, filterVal),
                'geofence-set-pick',
                selectedCamForGeofence(),
                { showOnline: true, showGeofence: true }
            );
        }

        function refreshGeofenceClearList() {
            var filterVal = (document.getElementById('geofence-clear-filter') || {}).value || 'all';
            var hintEl = document.getElementById('geofence-clear-hint');
            var anyGeofenced = geofenceClearDevicesAll.some(function (d) { return d.hasGeofence; });
            if (hintEl) hintEl.hidden = anyGeofenced || !geofenceClearDevicesAll.length;
            renderGeofencePickList(
                document.getElementById('geofence-clear-list'),
                document.getElementById('geofence-clear-empty'),
                filterGeofenceDevices(geofenceClearDevicesAll, filterVal),
                'geofence-clear-pick',
                selectedCamForGeofence(),
                { showOnline: true, showGeofence: true, clearableOnly: true }
            );
        }

        function selectedCamForGeofence() {
            if (typeof FleetUi !== 'undefined' && FleetUi.getSelectedCamId) {
                var sel = FleetUi.getSelectedCamId();
                if (sel) return sel;
            }
            if (lastMapCamId) return lastMapCamId;
            return null;
        }

        function haversineMeters(lat1, lon1, lat2, lon2) {
            var R = 6371000;
            var toRad = function (x) { return x * Math.PI / 180; };
            var dLat = toRad(lat2 - lat1);
            var dLon = toRad(lon2 - lon1);
            var a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
            return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
        }

        function destinationPoint(lat, lng, distM, bearingDeg) {
            var R = 6378137;
            var br = bearingDeg * Math.PI / 180;
            var lat1 = lat * Math.PI / 180;
            var lon1 = lng * Math.PI / 180;
            var ang = distM / R;
            var lat2 = Math.asin(Math.sin(lat1) * Math.cos(ang) + Math.cos(lat1) * Math.sin(ang) * Math.cos(br));
            var lon2 = lon1 + Math.atan2(Math.sin(br) * Math.sin(ang) * Math.cos(lat1), Math.cos(ang) - Math.sin(lat1) * Math.sin(lat2));
            return L.latLng(lat2 * 180 / Math.PI, lon2 * 180 / Math.PI);
        }

        function geofenceCenterIcon() {
            return L.divIcon({
                className: 'geofence-handle-wrap',
                html: '<div class="geofence-center-handle" title="' + dashboardTr('geofence.draw.dragCentre') + '"></div>',
                iconSize: [22, 22],
                iconAnchor: [11, 11],
            });
        }

        function geofenceRadiusIcon() {
            return L.divIcon({
                className: 'geofence-handle-wrap',
                html: '<div class="geofence-radius-handle" title="' + dashboardTr('geofence.draw.dragResize') + '"></div>',
                iconSize: [18, 18],
                iconAnchor: [9, 9],
            });
        }

        function setGeofenceRadiusInput(m) {
            var rad = Math.max(50, Math.min(50000, Math.round(m)));
            var el = document.getElementById('geofence-radius');
            if (el) el.value = String(rad);
            return rad;
        }

        function syncGeofenceRadiusMarkerPosition() {
            if (!geofenceDraftCenter || !geofenceRadiusMarker) return;
            var r = getGeofenceRadiusM();
            var edge = destinationPoint(geofenceDraftCenter.lat, geofenceDraftCenter.lng, r, 90);
            geofenceRadiusMarker.setLatLng(edge);
        }

        function applyGeofenceDraftCenter(lat, lng) {
            geofenceDraftCenter = { lat: lat, lng: lng };
            if (geofenceDraftCircle) geofenceDraftCircle.setLatLng([lat, lng]);
            if (geofenceCenterMarker) geofenceCenterMarker.setLatLng([lat, lng]);
            syncGeofenceRadiusMarkerPosition();
        }

        function applyGeofenceDraftRadius(radiusM) {
            var r = setGeofenceRadiusInput(radiusM);
            if (geofenceDraftCircle) geofenceDraftCircle.setRadius(r);
            syncGeofenceRadiusMarkerPosition();
        }

        function removeGeofenceDraftHandles() {
            if (geofenceCenterMarker) {
                try { map.removeLayer(geofenceCenterMarker); } catch (_) { /* ignore */ }
                geofenceCenterMarker = null;
            }
            if (geofenceRadiusMarker) {
                try { map.removeLayer(geofenceRadiusMarker); } catch (_) { /* ignore */ }
                geofenceRadiusMarker = null;
            }
            if (geofenceDraftCircle) {
                try { map.removeLayer(geofenceDraftCircle); } catch (_) { /* ignore */ }
                geofenceDraftCircle = null;
            }
        }

        function buildGeofenceDraftVisuals() {
            if (!geofenceDrawActive || !geofenceDraftCenter) return;
            removeGeofenceDraftHandles();
            var lat = geofenceDraftCenter.lat;
            var lng = geofenceDraftCenter.lng;
            var r = getGeofenceRadiusM();
            geofenceDraftCircle = L.circle([lat, lng], {
                radius: r,
                color: '#f59e0b',
                weight: 3,
                dashArray: '10 8',
                fillColor: '#f59e0b',
                fillOpacity: 0.18,
                interactive: false,
                bubblingMouseEvents: false,
            }).addTo(map);
            geofenceCenterMarker = L.marker([lat, lng], {
                draggable: true,
                icon: geofenceCenterIcon(),
                zIndexOffset: 2000,
            }).addTo(map);
            geofenceRadiusMarker = L.marker(destinationPoint(lat, lng, r, 90), {
                draggable: true,
                icon: geofenceRadiusIcon(),
                zIndexOffset: 2001,
            }).addTo(map);
            geofenceCenterMarker.on('drag', function () {
                var ll = geofenceCenterMarker.getLatLng();
                geofenceDraftCenter = { lat: ll.lat, lng: ll.lng };
                if (geofenceDraftCircle) geofenceDraftCircle.setLatLng(ll);
                syncGeofenceRadiusMarkerPosition();
            });
            geofenceCenterMarker.on('dragend', function () {
                showGeofenceToast(dashboardTr('geofence.toast.centreMoved'), 3500);
            });
            geofenceRadiusMarker.on('drag', function () {
                if (!geofenceDraftCenter) return;
                var c = geofenceCenterMarker.getLatLng();
                var h = geofenceRadiusMarker.getLatLng();
                var dist = haversineMeters(c.lat, c.lng, h.lat, h.lng);
                applyGeofenceDraftRadius(dist);
            });
            geofenceRadiusMarker.on('dragend', function () {
                showGeofenceToast(dashboardTr('geofence.toast.radiusSet', { n: getGeofenceRadiusM() }), 3500);
            });
        }

        function updateGeofenceDraftCircle() {
            if (!geofenceDrawActive || !geofenceDraftCenter) return;
            if (geofenceDraftCircle && geofenceCenterMarker && geofenceRadiusMarker) {
                applyGeofenceDraftRadius(getGeofenceRadiusM());
                return;
            }
            buildGeofenceDraftVisuals();
        }

        function onGeofenceDrawMapClick(e) {
            if (!geofenceDrawActive || !e || !e.latlng) return;
            L.DomEvent.stopPropagation(e);
            applyGeofenceDraftCenter(e.latlng.lat, e.latlng.lng);
            if (!geofenceCenterMarker) buildGeofenceDraftVisuals();
            showGeofenceToast(dashboardTr('geofence.toast.centrePlaced'), 3500);
        }

        function stopGeofenceDrawMode() {
            geofenceDrawActive = false;
            var hiddenCam = geofenceDrawSavedHidden;
            geofenceDrawCamId = null;
            geofenceDrawAuth = null;
            geofenceDraftCenter = null;
            geofenceDrawSavedHidden = null;
            removeGeofenceDraftHandles();
            map.off('click', onGeofenceDrawMapClick);
            if (map.doubleClickZoom && map.doubleClickZoom.enabled()) { /* ok */ }
            else if (map.doubleClickZoom) map.doubleClickZoom.enable();
            if (map.scrollWheelZoom && !map.scrollWheelZoom.enabled()) map.scrollWheelZoom.enable();
            var wrap = document.querySelector('.map-canvas-wrap');
            if (wrap) wrap.classList.remove('geofence-drawing');
            var bar = document.getElementById('geofence-draw-bar');
            if (bar) bar.hidden = true;
            if (hiddenCam && typeof BwcDevices !== 'undefined' && BwcDevices.findByDeviceId) {
                var rec = BwcDevices.findByDeviceId(hiddenCam);
                if (rec && rec.geofence) drawGeofenceForDevice(hiddenCam, rec.geofence);
            }
        }

        async function startGeofenceDrawMode(camId, auth) {
            stopGeofenceDrawMode();
            geofenceDrawActive = true;
            geofenceDrawCamId = camId;
            geofenceDrawAuth = auth;
            if (geofenceLayers[camId]) {
                try { map.removeLayer(geofenceLayers[camId]); } catch (_) { /* ignore */ }
                delete geofenceLayers[camId];
                geofenceDrawSavedHidden = camId;
            }
            var center = map.getCenter();
            if (lastMapCamId === camId && lastMapPos) {
                center = L.latLng(lastMapPos.lat, lastMapPos.lon);
            } else {
                try {
                    var gps = await fetch('/api/last-gps?camId=' + encodeURIComponent(camId)).then(function (r) { return r.json(); });
                    if (gps && gps.lat != null && gps.lon != null) {
                        center = L.latLng(parseFloat(gps.lat), parseFloat(gps.lon));
                    }
                } catch (_) { /* use map centre */ }
            }
            geofenceDraftCenter = { lat: center.lat, lng: center.lng };
            buildGeofenceDraftVisuals();
            map.on('click', onGeofenceDrawMapClick);
            if (map.doubleClickZoom) map.doubleClickZoom.disable();
            var wrap = document.querySelector('.map-canvas-wrap');
            if (wrap) wrap.classList.add('geofence-drawing');
            var bar = document.getElementById('geofence-draw-bar');
            if (bar) bar.hidden = false;
            map.setView(center, Math.max(map.getZoom(), 15));
            setTimeout(function () { fmMapResize(); }, 100);
            var who = typeof FleetDisplay !== 'undefined' ? FleetDisplay.friendlyDeviceName(camId) : camId;
            showGeofenceToast(dashboardTr('geofence.toast.drawStart', { name: who }), 12000);
        }

        async function confirmGeofenceDraw() {
            if (!geofenceDrawActive || !geofenceDrawCamId || !geofenceDrawAuth || !geofenceDraftCenter) return;
            var btn = document.getElementById('geofence-draw-confirm');
            if (btn) { btn.disabled = true; btn.textContent = dashboardTr('common.saving'); }
            try {
                var payload = {
                    deviceId: geofenceDrawCamId,
                    username: geofenceDrawAuth.username,
                    password: geofenceDrawAuth.password,
                    geofence: {
                        mode: 'circle',
                        centerLat: geofenceDraftCenter.lat,
                        centerLng: geofenceDraftCenter.lng,
                        radiusM: getGeofenceRadiusM(),
                    },
                };
                var res = await fetch('/api/geofence/set', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                var data = await res.json();
                if (!data.ok) {
                    var msg = data.error === 'invalid_credentials' ? dashboardTr('geofence.error.badCredentials')
                        : (data.error === 'geofence_not_permitted' ? dashboardTr('geofence.error.notPermitted')
                            : (data.error || dashboardTr('geofence.error.save', { msg: '' })));
                    throw new Error(msg);
                }
                geofenceDrawSavedHidden = null;
                stopGeofenceDrawMode();
                if (typeof BwcDevices !== 'undefined' && BwcDevices.load) await BwcDevices.load();
                drawGeofenceForDevice(data.deviceId, data.geofence);
                var who = data.operatorName || (typeof FleetDisplay !== 'undefined' ? FleetDisplay.friendlyDeviceName(data.deviceId) : data.deviceId);
                showGeofenceToast(dashboardTr('geofence.toast.saved', { name: who }), 5000);
            } catch (err) {
                alert(dashboardTr('geofence.error.save', { msg: (err && err.message ? err.message : err) }));
            } finally {
                if (btn) { btn.disabled = false; btn.textContent = dashboardTr('geofence.draw.save'); }
            }
        }

        function setGeofenceModalA11y(backdropId, show) {
            var backdrop = document.getElementById(backdropId);
            if (!backdrop) return;
            if ('inert' in backdrop) backdrop.inert = !show;
            backdrop.setAttribute('aria-hidden', show ? 'false' : 'true');
            backdrop.querySelectorAll('input[type="password"]').forEach(function (inp) {
                inp.tabIndex = show ? 0 : -1;
                inp.disabled = !show;
            });
        }

        function closeSetGeofenceDialog() {
            document.getElementById('geofence-set-backdrop').hidden = true;
            setGeofenceModalA11y('geofence-set-backdrop', false);
            var err = document.getElementById('geofence-set-error');
            if (err) { err.textContent = ''; err.style.display = 'none'; }
        }

        async function openSetGeofenceDialog() {
            if (!canGeofenceControl) {
                alert(dashboardTr('map.geofencePermDenied'));
                openMapPermissionHelp();
                return;
            }
            await fillGeofenceAuthFields('geofence-set-user', 'geofence-set-pass');
            document.getElementById('geofence-set-error').style.display = 'none';
            var setFilter = document.getElementById('geofence-set-filter');
            if (setFilter) setFilter.value = 'all';
            try {
                var res = await fetch('/api/geofence/set-options');
                var data = await res.json();
                geofenceSetDevicesAll = data.devices || [];
            } catch (_) {
                geofenceSetDevicesAll = [];
            }
            refreshGeofenceSetList();
            document.getElementById('geofence-set-backdrop').hidden = false;
            setGeofenceModalA11y('geofence-set-backdrop', true);
            document.getElementById('geofence-set-pass').focus();
        }

        async function submitSetGeofenceContinue() {
            var errEl = document.getElementById('geofence-set-error');
            var picked = document.querySelector('input[name="geofence-set-pick"]:checked');
            var username = (document.getElementById('geofence-set-user').value || '').trim();
            var password = document.getElementById('geofence-set-pass').value || '';
            if (!username || !password) {
                errEl.textContent = dashboardTr('geofence.error.needCredentials');
                errEl.style.display = 'block';
                return;
            }
            if (!picked || !picked.value) {
                errEl.textContent = dashboardTr('geofence.error.selectBwc');
                errEl.style.display = 'block';
                return;
            }
            var btn = document.getElementById('geofence-set-continue');
            if (btn) { btn.disabled = true; btn.textContent = dashboardTr('geofence.set.checking'); }
            try {
                var v = await fetch('/api/auth/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: username, password: password, checkGeofence: true }),
                });
                var vd = await v.json();
                if (!vd.ok) {
                    if (vd.error === 'geofence_not_permitted') throw new Error(dashboardTr('geofence.error.notPermitted'));
                    throw new Error(dashboardTr('geofence.error.badCredentials'));
                }
                closeSetGeofenceDialog();
                await startGeofenceDrawMode(picked.value, { username: username, password: password });
            } catch (err) {
                errEl.textContent = err && err.message ? err.message : String(err);
                errEl.style.display = 'block';
            } finally {
                if (btn) { btn.disabled = false; btn.textContent = dashboardTr('geofence.set.drawOnMap'); }
            }
        }

        function closeClearGeofenceDialog() {
            document.getElementById('geofence-clear-backdrop').hidden = true;
            setGeofenceModalA11y('geofence-clear-backdrop', false);
            var err = document.getElementById('geofence-clear-error');
            if (err) { err.textContent = ''; err.style.display = 'none'; }
        }

        function renderClearGeofenceOptions(devices) {
            geofenceClearDevicesAll = devices || [];
            refreshGeofenceClearList();
        }

        async function openClearGeofenceDialog() {
            if (!canGeofenceControl) {
                alert(dashboardTr('map.geofencePermDenied'));
                openMapPermissionHelp();
                return;
            }
            await fillGeofenceAuthFields('geofence-clear-user', 'geofence-clear-pass');
            document.getElementById('geofence-clear-error').style.display = 'none';
            var clearFilter = document.getElementById('geofence-clear-filter');
            if (clearFilter) clearFilter.value = 'all';
            try {
                var res = await fetch('/api/geofence/clear-options');
                var data = await res.json();
                renderClearGeofenceOptions(data.devices || []);
            } catch (_) {
                renderClearGeofenceOptions([]);
            }
            document.getElementById('geofence-clear-backdrop').hidden = false;
            setGeofenceModalA11y('geofence-clear-backdrop', true);
            document.getElementById('geofence-clear-pass').focus();
        }

        async function submitClearGeofence() {
            var errEl = document.getElementById('geofence-clear-error');
            var picked = document.querySelector('input[name="geofence-clear-pick"]:checked');
            var username = (document.getElementById('geofence-clear-user').value || '').trim();
            var password = document.getElementById('geofence-clear-pass').value || '';
            if (!username || !password) {
                errEl.textContent = dashboardTr('geofence.error.needCredentialsShort');
                errEl.style.display = 'block';
                return;
            }
            if (!picked || !picked.value || picked.disabled) {
                errEl.textContent = dashboardTr('geofence.error.selectGeofenced');
                errEl.style.display = 'block';
                return;
            }
            var pickedDev = geofenceClearDevicesAll.find(function (d) { return d.deviceId === picked.value; });
            if (!pickedDev || !pickedDev.hasGeofence) {
                errEl.textContent = dashboardTr('geofence.error.noGeofence');
                errEl.style.display = 'block';
                return;
            }
            var submitBtn = document.getElementById('geofence-clear-submit');
            if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = dashboardTr('geofence.clear.clearing'); }
            try {
                var res = await fetch('/api/geofence/clear', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ deviceId: picked.value, username: username, password: password }),
                });
                var data = await res.json();
                if (!data.ok) {
                    var msg = data.error === 'invalid_credentials' ? dashboardTr('geofence.error.badCredentials')
                        : (data.error === 'geofence_not_permitted' ? dashboardTr('geofence.error.notPermitted')
                            : (data.error || 'Clear failed'));
                    throw new Error(msg);
                }
                if (typeof BwcDevices !== 'undefined' && BwcDevices.load) await BwcDevices.load();
                drawGeofenceForDevice(data.deviceId, null);
                closeClearGeofenceDialog();
                var who = data.operatorName || (typeof FleetDisplay !== 'undefined' ? FleetDisplay.friendlyDeviceName(data.deviceId) : data.deviceId);
                showGeofenceToast(dashboardTr('geofence.toast.cleared', { name: who }), 4000);
            } catch (err) {
                errEl.textContent = err && err.message ? err.message : String(err);
                errEl.style.display = 'block';
            } finally {
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = dashboardTr('map.clearGeofencing'); }
            }
        }

        socket.on('ftp-upload', function (data) {
            if (data && data.linkedAlarmId) refreshSosLedger();
        });

        function renderSosAckHelpers(alarmCamId) {
            var listEl = document.getElementById('sos-ack-helpers');
            var emptyEl = document.getElementById('sos-ack-helpers-empty');
            if (!listEl) return;
            refreshSosResponseTeam();
            var helpers = sosResponseNearby.slice();
            if (!helpers.length) {
                listEl.innerHTML = '';
                listEl.hidden = true;
                if (emptyEl) emptyEl.hidden = false;
                return;
            }
            if (emptyEl) emptyEl.hidden = true;
            listEl.hidden = false;
            listEl.innerHTML = helpers.map(function (d) {
                var distLabel = dashboardTr('sos.response.distanceM', { m: d.distanceM });
                return '<label class="sos-ack-helper-row">' +
                    '<input type="checkbox" value="' + String(d.cameraId).replace(/"/g, '&quot;') + '" checked>' +
                    '<span class="sos-ack-helper-name">' + String(d.name).replace(/</g, '&lt;') +
                    ' <span class="sos-ack-helper-dist">(' + distLabel + ')</span></span>' +
                    '</label>';
            }).join('');
        }

        function selectedSosAckHelpers() {
            var listEl = document.getElementById('sos-ack-helpers');
            if (!listEl) return [];
            return Array.prototype.slice.call(listEl.querySelectorAll('input[type=checkbox]:checked'))
                .map(function (cb) { return cb.value; })
                .filter(Boolean);
        }

        function stashSosAckSnapshot(camId) {
            if (!camId) return;
            var alarm = activeSosAlarms[normalizeCamId(camId)];
            if (!alarm) return;
            if (global.VideoWall && VideoWall.liveFramePreviewDataUrl) {
                var instant = VideoWall.liveFramePreviewDataUrl(camId);
                if (instant) alarm.stashSnapshot = instant;
            }
            if (!alarm.stashSnapshot && global.VideoWall && VideoWall.captureLiveFrameForCam) {
                VideoWall.captureLiveFrameForCam(camId).then(function (dataUrl) {
                    if (dataUrl && activeSosAlarms[normalizeCamId(camId)]) {
                        activeSosAlarms[normalizeCamId(camId)].stashSnapshot = dataUrl;
                    }
                });
            }
        }
        window.stashSosAckSnapshot = stashSosAckSnapshot;

        function openSosAcknowledge(forCamId) {
            if (forCamId) focusSosAlarm(forCamId);
            var alarm = getFocusedSosAlarm();
            var camId = alarm && alarm.cameraId ? alarm.cameraId : getSosCamId();
            var time = alarm && alarm.time ? alarm.time : document.getElementById('sos-time').innerText;
            if (typeof FleetDisplay !== 'undefined') FleetDisplay.setCamLabel(document.getElementById('sos-ack-cam'), camId);
            else document.getElementById('sos-ack-cam').innerText = camId;
            document.getElementById('sos-ack-time').innerText = time;
            document.getElementById('sos-ack-note').value = '';
            renderSosAckHelpers(camId);
            document.getElementById('sos-ack-backdrop').hidden = false;
            updateSosAckCapturePreview(camId);
            stashSosAckSnapshot(camId);
            setTimeout(function () { document.getElementById('sos-ack-note').focus(); }, 50);
        }
        window.openSosAcknowledge = openSosAcknowledge;

        function updateSosAckCapturePreview(camId) {
            var wrap = document.getElementById('sos-ack-capture-wrap');
            var preview = document.getElementById('sos-ack-preview');
            var noVideo = document.getElementById('sos-ack-no-video');
            var includeSnap = document.getElementById('sos-ack-include-snap');
            if (!wrap || !preview || !noVideo || !includeSnap) return;
            var stashed = activeSosAlarms[normalizeCamId(camId)] && activeSosAlarms[normalizeCamId(camId)].stashSnapshot;
            var hasFrame = stashed || (global.VideoWall && VideoWall.hasLiveVideoFrameForCam && VideoWall.hasLiveVideoFrameForCam(camId));
            if (hasFrame) {
                var dataUrl = stashed || (VideoWall.liveFramePreviewDataUrl && VideoWall.liveFramePreviewDataUrl(camId));
                if (dataUrl) {
                    wrap.hidden = false;
                    noVideo.hidden = true;
                    preview.hidden = false;
                    preview.src = dataUrl;
                    includeSnap.checked = true;
                    includeSnap.disabled = false;
                    return;
                }
            }
            wrap.hidden = true;
            preview.hidden = true;
            preview.removeAttribute('src');
            includeSnap.checked = false;
            includeSnap.disabled = true;
            noVideo.hidden = false;
        }

        function closeSosAcknowledgeDialog() {
            document.getElementById('sos-ack-backdrop').hidden = true;
            var submitBtn = document.getElementById('sos-ack-submit');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = dashboardTr('sos.ack.submitClose');
            }
        }

        window.isSosIncidentActive = function () { return sosIncidentActive; };
        window.isCamSosActive = isCamSosActive;

        window.getSosCamId = function () {
            var el = document.getElementById('sos-cam');
            if (!el) return '';
            if (typeof FleetDisplay !== 'undefined') return FleetDisplay.camIdFromElement(el);
            return String(el.getAttribute('data-cam-id') || el.innerText || '').trim();
        };

        function muteAckedCamLiveAudio(camId) {
            if (camId && typeof VideoWall !== 'undefined' && VideoWall.muteLiveAudioForCam) {
                VideoWall.muteLiveAudioForCam(camId);
            }
        }

        /** After SOS close — patrol pins were on the map layer during alarm; re-attach so cluster/viewport does not hide them until zoom-out. */
        function reattachFleetMarkersAfterSosClose() {
            var openIds = getOpenPinCamIds();
            if (typeof MapPinLayer !== 'undefined' && MapPinLayer.setPopupOpenCamId) {
                openIds.forEach(function (id) { MapPinLayer.setPopupOpenCamId(id, true); });
            }
            Object.keys(deviceMarkers).forEach(function (camId) {
                var m = deviceMarkers[camId];
                if (!m) return;
                var alarmKind = getCamAlarmKind(camId);
                var isSos = isCamSosActive(camId);
                if (typeof MapPinLayer !== 'undefined' && MapPinLayer.attachMarker) {
                    MapPinLayer.attachMarker(m, isSos, alarmKind, camId);
                } else if (!map.hasLayer(m)) {
                    m.addTo(map);
                }
            });
            if (Object.keys(deviceMarkers).length >= 2) {
                spreadStableColocatedMarkers();
            }
            refreshAllDeviceMarkerStyles();
            updateMapPinLegend();
            if (typeof MapPinLayer !== 'undefined' && MapPinLayer.flushDeferredGps) {
                MapPinLayer.flushDeferredGps(function (id, la, lo, meta) {
                    meta = meta || {};
                    applyGpsMapUpdate(id, la, lo, meta.isSos, meta.online);
                });
            }
            if (typeof syncAllDeviceMarkers === 'function') {
                syncAllDeviceMarkers();
            }
            if (map) {
                try { map.fire('moveend'); } catch (_) { /* ignore */ }
            }
        }

        /** After SOS Ack — patrol Field PTT banner/linger must not outlive the incident. */
        function dismissFieldPttForSosClose() {
            if (global.PttRx && PttRx.dismissAllFieldPttSession) {
                PttRx.dismissAllFieldPttSession();
                return;
            }
            if (global.PttRx && PttRx.clearAllLinger) PttRx.clearAllLinger();
            if (global.VideoWall && VideoWall.clearAllFieldPttRx) VideoWall.clearAllFieldPttRx();
            if (global.FleetUi && FleetUi.clearAllPttRxFlags) FleetUi.clearAllPttRxFlags();
        }

        function dismissAllSosUi(opts) {
            opts = opts || {};
            clearSosNearbyGpsRefreshTimers();
            fetch('/api/smart-gps/restore-incident', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: '{}',
            }).catch(function () { /* ignore */ });
            document.getElementById('sos-banner').style.display = 'none';
            sosIncidentActive = false;
            activeAlarmKind = 'sos';
            pendingSosAck = null;
            activeSosAlarms = {};
            focusedSosCamId = null;
            dismissFieldPttForSosClose();
            clearSosResponseCircle();
            applyAlarmBannerKind('sos');
            renderSosAlarmStrip();
            VideoWall.clearAlarmStates();
            var hadSosPttTeam = !!(global.activeSosPttTeam && global.activeSosPttTeam.length > 1);
            var needSosPttRestore = hadSosPttTeam || !!opts.sosPttRestore;
            global.activeSosPttTeam = null;
            syncSosPttTeamUi();
            var pttToast = document.getElementById('sos-ptt-team-toast');
            if (pttToast) pttToast.hidden = true;
            syncSosPttMemberUi();
            if (needSosPttRestore && global.VideoWall && VideoWall.restorePttAfterSosSessionClose) {
                VideoWall.restorePttAfterSosSessionClose();
            }
            updateSosResponseSummary();
            if (opts.recentAckCamId) {
                markRecentlyAckedSos(opts.recentAckCamId, opts.recentAckKind);
                muteAckedCamLiveAudio(opts.recentAckCamId);
                resyncPinVideoAfterSosAck(opts.recentAckCamId);
            }
            reattachFleetMarkersAfterSosClose();
        }

        function dismissOneSos(camId, opts) {
            opts = opts || {};
            camId = normalizeCamId(camId);
            if (!camId) return;
            delete activeSosAlarms[camId];
            if (normalizeCamId(focusedSosCamId) === camId) {
                var keys = Object.keys(activeSosAlarms);
                focusedSosCamId = keys.length ? keys[0] : null;
            }
            sosIncidentActive = getSosAlarmCount() > 0;
            if (!sosIncidentActive) {
                if (typeof expandMapPinVideo === 'function') expandMapPinVideo(camId);
                dismissAllSosUi(opts);
                return;
            }
            pendingSosAck = getFocusedSosAlarm();
            refreshSosStormBanner();
            renderSosAlarmStrip();
            markRecentlyAckedSos(camId, opts.recentAckKind);
            muteAckedCamLiveAudio(camId);
            if (typeof expandMapPinVideo === 'function') expandMapPinVideo(camId);
            resyncPinVideoAfterSosAck(camId);
            if (global.VideoWall && VideoWall.unmuteAudioForSosCam) {
                getActiveSosCamIds().forEach(function (id) { VideoWall.unmuteAudioForSosCam(id); });
            }
            refreshAllDeviceMarkerStyles();
            drawSosResponseCircleFromServer();
        }

        function dismissSos(opts) {
            dismissAllSosUi(opts);
        }

        function submitSosAcknowledge() {
            var submitBtn = document.getElementById('sos-ack-submit');
            if (submitBtn && submitBtn.disabled) return;
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = dashboardTr('common.saving');
            }

            var note = (document.getElementById('sos-ack-note').value || '').trim();
            var alarm = getFocusedSosAlarm() || pendingSosAck;
            var camId = alarm && alarm.cameraId ? alarm.cameraId : getSosCamId();
            var ackKind = (alarm && alarm.alarmKind) || activeAlarmKind || 'sos';
            var payload = {
                cameraId: camId,
                alarmTime: alarm && alarm.time ? alarm.time : document.getElementById('sos-time').innerText,
                incidentId: alarm && alarm.incidentId ? alarm.incidentId : null,
                note: note,
                helperCamIds: selectedSosAckHelpers(),
            };
            var includeSnapEl = document.getElementById('sos-ack-include-snap');
            var includeSnap = !!(includeSnapEl && includeSnapEl.checked && !includeSnapEl.disabled);

            function resetSubmitBtn() {
                if (!submitBtn) return;
                submitBtn.disabled = false;
                submitBtn.textContent = dashboardTr('sos.ack.submitClose');
            }

            function sendAck(snapshotBase64) {
                function finishDismiss(sosPttRestore) {
                    closeSosAcknowledgeDialog();
                    dismissOneSos(camId, {
                        recentAckCamId: camId,
                        recentAckKind: ackKind,
                        sosPttRestore: !!sosPttRestore,
                    });
                    resetSubmitBtn();
                }
                try {
                    if (snapshotBase64) payload.snapshotBase64 = snapshotBase64;
                    fetch('/api/sos-acknowledge', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                    })
                        .then(function (r) { return r.json(); })
                        .then(function (data) {
                            var ackPushedTeam = !!(data && data.ok && data.pttTeam
                                && data.pttTeam.team && data.pttTeam.team.length > 1);
                            var hadSosPttTeam = global.activeSosPttTeam
                                && global.activeSosPttTeam.length > 1;
                            refreshSosLedger();
                            finishDismiss(ackPushedTeam || hadSosPttTeam);
                        })
                        .catch(function () { finishDismiss(false); });
                } catch (_) {
                    finishDismiss(false);
                }
            }

            function resolveAckSnapshot(cb) {
                var alarmRec = activeSosAlarms[normalizeCamId(camId)];
                if (alarmRec && alarmRec.stashSnapshot) {
                    cb(alarmRec.stashSnapshot);
                    return;
                }
                if (global.VideoWall && VideoWall.captureLiveFrameForCam) {
                    VideoWall.captureLiveFrameForCam(camId).then(function (dataUrl) {
                        if (dataUrl) { cb(dataUrl); return; }
                        if (global.VideoWall && VideoWall.liveFramePreviewDataUrl) {
                            cb(VideoWall.liveFramePreviewDataUrl(camId) || null);
                        } else {
                            cb(null);
                        }
                    });
                    return;
                }
                if (global.VideoWall && VideoWall.liveFramePreviewDataUrl) {
                    cb(VideoWall.liveFramePreviewDataUrl(camId) || null);
                    return;
                }
                cb(null);
            }

            try {
                if (includeSnap) {
                    resolveAckSnapshot(function (dataUrl) { sendAck(dataUrl || null); });
                    return;
                }
                sendAck(null);
            } catch (_) {
                sendAck(null);
            }
        }

        function formatLedgerTime(iso) {
            if (!iso) return '';
            try {
                return new Date(iso).toLocaleString();
            } catch (_) {
                return iso;
            }
        }

        function renderSosChart(chart) {
            var el = document.getElementById('sos-chart');
            if (!el) return;
            el.innerHTML = '';
            if (!chart || !chart.length) {
                el.innerHTML = '<div class="sos-ledger-empty">No data</div>';
                return;
            }
            var max = 1;
            chart.forEach(function (c) { if (c.count > max) max = c.count; });
            chart.forEach(function (c) {
                var col = document.createElement('div');
                col.className = 'sos-chart-col';
                var h = Math.round((c.count / max) * 44) || (c.count ? 6 : 4);
                col.innerHTML = '<div class="sos-chart-bar" title="' + c.count + ' alarm(s)"><i style="height:' + h + 'px"></i></div>' +
                    '<span>' + c.label + '</span>';
                el.appendChild(col);
            });
        }

        var sosLedgerRows = [];
        var sosLedgerPinRequired = false;
        var sosLedgerPendingDetailId = null;
        var sosDetailCurrentRow = null;
        var SOS_LEDGER_SESSION_KEY = 'fm-sos-ledger-unlocked';
        var SOS_LEDGER_DAYS = 7;

        function loadSosLedgerGate() {
            fetch('/api/sos-ledger-gate').then(function (r) { return r.json(); }).then(function (data) {
                sosLedgerPinRequired = !!(data && data.pinRequired);
                if (!sosLedgerPinRequired) sessionStorage.setItem(SOS_LEDGER_SESSION_KEY, '1');
            }).catch(function () { sosLedgerPinRequired = false; });
        }

        function sosLedgerIsUnlocked() {
            return !sosLedgerPinRequired || sessionStorage.getItem(SOS_LEDGER_SESSION_KEY) === '1';
        }

        function closeSosDetailDialog() {
            document.getElementById('sos-detail-backdrop').hidden = true;
            document.getElementById('sos-detail-panel').hidden = true;
            document.getElementById('sos-pin-panel').hidden = true;
            sosLedgerPendingDetailId = null;
            sosDetailCurrentRow = null;
            document.getElementById('sos-pin-error').style.display = 'none';
            document.getElementById('sos-pin-input').value = '';
            var frame = document.getElementById('sos-detail-report-frame');
            if (frame) {
                frame.removeAttribute('src');
                frame.hidden = true;
            }
            var noReport = document.getElementById('sos-detail-no-report');
            if (noReport) noReport.hidden = true;
        }

        function sosReportUrlForRow(row) {
            if (!row) return '';
            if (row.reportUrl) return row.reportUrl;
            if (row.folderRel) {
                return '/sos-media/' + String(row.folderRel).replace(/\\/g, '/') + '/incident.html';
            }
            return '';
        }

        function showSosPinDialog() {
            document.getElementById('sos-detail-backdrop').hidden = false;
            document.getElementById('sos-detail-panel').hidden = true;
            document.getElementById('sos-pin-panel').hidden = false;
            document.getElementById('sos-pin-error').style.display = 'none';
            setTimeout(function () { document.getElementById('sos-pin-input').focus(); }, 50);
        }

        function showSosDetailDialog(row) {
            sosDetailCurrentRow = row;
            document.getElementById('sos-detail-backdrop').hidden = false;
            document.getElementById('sos-pin-panel').hidden = true;
            document.getElementById('sos-detail-panel').hidden = false;
            document.getElementById('sos-detail-status').textContent = row.acknowledged ? dashboardTr('sos.detail.statusAck') : dashboardTr('sos.detail.statusOpen');
            document.getElementById('sos-detail-time').textContent = formatLedgerTime(row.at);
            document.getElementById('sos-detail-operator').textContent = row.operatorName || (typeof FleetDisplay !== 'undefined' ? FleetDisplay.friendlyDeviceName(row.cameraId) : row.cameraId) || '—';
            var reportUrl = sosReportUrlForRow(row);
            var frame = document.getElementById('sos-detail-report-frame');
            var noReport = document.getElementById('sos-detail-no-report');
            var newTabBtn = document.getElementById('sos-detail-new-tab');
            var openBtn = document.getElementById('sos-detail-open-folder');
            if (openBtn) openBtn.disabled = !row.id;
            if (newTabBtn) {
                newTabBtn.disabled = !reportUrl;
                newTabBtn.dataset.reportUrl = reportUrl || '';
            }
            if (frame && reportUrl) {
                frame.hidden = false;
                if (noReport) noReport.hidden = true;
                frame.onload = function () {
                    try {
                        if (frame.contentDocument && frame.contentDocument.title === '404') {
                            frame.hidden = true;
                            if (noReport) noReport.hidden = false;
                        }
                    } catch (_) { /* cross-origin — ignore */ }
                };
                frame.onerror = function () {
                    frame.hidden = true;
                    if (noReport) noReport.hidden = false;
                };
                frame.src = reportUrl + (reportUrl.indexOf('?') >= 0 ? '&' : '?') + '_=' + Date.now();
            } else {
                if (frame) {
                    frame.removeAttribute('src');
                    frame.hidden = true;
                }
                if (noReport) noReport.hidden = false;
            }
        }

        function downloadSosIncidentRecording(evidenceId) {
            if (!evidenceId) return;
            fetch('/api/evidence/request-download', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileId: evidenceId }),
            }).then(function (r) { return r.json(); }).then(function (data) {
                if (!data.ok || !data.downloadUrl) {
                    alert((data && data.error) || 'Download failed');
                    return;
                }
                window.location.href = data.downloadUrl;
            }).catch(function () { alert('Download failed'); });
        }

        function openSosIncidentFolder(incidentId) {
            if (!incidentId) return;
            fetch('/api/sos-incidents/open', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ incidentId: incidentId }),
            }).then(function (r) { return r.json(); }).then(function (data) {
                if (data.ok) {
                    alert(dashboardTr('sos.alert.openedLocal', { path: data.path || '' }));
                    return;
                }
                alert(dashboardTr('sos.alert.openFolderManual', { path: data.path || '' }));
            }).catch(function () {
                alert(dashboardTr('sos.alert.openFolderFailed'));
            });
        }

        function clearSosDashboardList() {
            if (!confirm(dashboardTr('sos.confirm.clearList'))) return;
            fetch('/api/sos-incidents/clear', { method: 'POST' }).then(function (r) { return r.json(); }).then(function (data) {
                if (data.ok) refreshSosLedger();
                else alert(dashboardTr('sos.error.clearList'));
            }).catch(function () {
                alert(dashboardTr('sos.error.clearList'));
            });
        }

        function openSosLedgerDetail(id) {
            var row = sosLedgerRows.find(function (r) { return r.id === id; });
            if (!row) return;
            if (sosLedgerPinRequired && !sosLedgerIsUnlocked()) {
                sosLedgerPendingDetailId = id;
                showSosPinDialog();
                return;
            }
            showSosDetailDialog(row);
        }

        function submitSosLedgerPin() {
            var pin = (document.getElementById('sos-pin-input').value || '').trim();
            if (!pin) {
                document.getElementById('sos-pin-input').focus();
                return;
            }
            fetch('/api/sos-ledger-unlock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin: pin }),
            }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); }).then(function (res) {
                if (!res.ok) {
                    document.getElementById('sos-pin-error').style.display = 'block';
                    document.getElementById('sos-pin-input').focus();
                    return;
                }
                sessionStorage.setItem(SOS_LEDGER_SESSION_KEY, '1');
                document.getElementById('sos-pin-error').style.display = 'none';
                var id = sosLedgerPendingDetailId;
                sosLedgerPendingDetailId = null;
                document.getElementById('sos-pin-input').value = '';
                if (id) openSosLedgerDetail(id);
            }).catch(function () {
                document.getElementById('sos-pin-error').textContent = dashboardTr('sos.pin.verifyFailed');
                document.getElementById('sos-pin-error').style.display = 'block';
            });
        }

        function restoreOpenSosBanner() {
            fetch('/api/sos-open-alarms').then(function (r) { return r.json(); }).then(function (data) {
                if (!data || !data.ok || !data.alarms || !data.alarms.length) return;
                applySosQueueSnapshot(data.queue);
                data.alarms.forEach(function (open) {
                    if (!open || !open.cameraId) return;
                    var camId = normalizeCamId(open.cameraId);
                    upsertActiveSosAlarm({
                        cameraId: camId,
                        time: open.alarmTime || '',
                        lat: open.lat,
                        lon: open.lon,
                        incidentId: open.id,
                        alarmKind: open.alarmKind === 'fall' ? 'fall' : 'sos',
                    });
                    var la = open.lat != null && open.lat !== '' ? parseFloat(open.lat) : NaN;
                    var lo = open.lon != null && open.lon !== '' ? parseFloat(open.lon) : NaN;
                    if ((isNaN(la) || isNaN(lo)) && lastMapPos && normalizeCamId(lastMapCamId) === camId) {
                        la = lastMapPos.lat;
                        lo = lastMapPos.lon;
                    }
                    paintSosMapPin(camId, {
                        cameraId: camId,
                        lat: la,
                        lon: lo,
                        refresh: true,
                        replay: true,
                        startVideo: false,
                    }, false);
                });
                focusedSosCamId = normalizeCamId(data.alarms[0].cameraId);
                sosIncidentActive = true;
                activeAlarmKind = activeSosAlarms[focusedSosCamId]
                    ? (activeSosAlarms[focusedSosCamId].alarmKind || 'sos')
                    : 'sos';
                pendingSosAck = getFocusedSosAlarm();
                refreshSosStormBanner();
                renderSosAlarmStrip();
                requestAnimationFrame(function () {
                    drawSosResponseCircleFromServer();
                    schedulePinPopupReposition();
                });
            }).catch(function () { /* ignore */ });
        }

        function setSosLedgerMeta(text, state) {
            var meta = document.getElementById('sos-ledger-meta');
            if (!meta) return;
            if (!text) {
                meta.hidden = true;
                meta.textContent = '';
                meta.className = 'hint';
                return;
            }
            meta.hidden = false;
            meta.textContent = text;
            meta.className = 'hint' + (state === 'error' ? ' is-error' : '');
        }

        function refreshSosLedger(opts) {
            opts = opts || {};
            var list = document.getElementById('sos-ledger-list');
            var syncBtn = document.getElementById('sos-ledger-sync');
            if (syncBtn) syncBtn.disabled = true;
            return fetch('/api/sos-incidents?limit=50&days=' + SOS_LEDGER_DAYS).then(function (r) { return r.json(); }).then(function (data) {
                var windowDays = data.windowDays || SOS_LEDGER_DAYS;
                renderSosChart(data.chart || []);
                var rows = data.entries || [];
                sosLedgerRows = rows;
                var openCount = rows.filter(function (r) { return !r.acknowledged; }).length;
                var older = (data.ledgerTotal || 0) > (data.totalInWindow || rows.length);
                if (!rows.length) {
                    list.innerHTML = '<div class="sos-ledger-empty">' + dashboardTr('sos.ledger.emptyWindow', { n: windowDays }) + '</div>';
                    setSosLedgerMeta(dashboardTr('sos.ledger.metaEmpty', { n: windowDays }), '');
                    return;
                }
                list.innerHTML = '';
                rows.forEach(function (row) {
                    var item = document.createElement('div');
                    item.className = 'sos-ledger-item';
                    item.title = dashboardTr('sos.ledger.clickView');
                    var thumb = row.snapshot
                        ? '<img class="sos-ledger-thumb" src="' + row.snapshot + '" alt="">'
                        : '<div class="sos-ledger-thumb"></div>';
                    var tag = row.acknowledged ? dashboardTr('sos.ledger.tagAck') : dashboardTr('sos.ledger.tagOpen');
                    var typeTag = row.alarmKind === 'fall' ? dashboardTr('sos.ledger.tagFall') : dashboardTr('sos.ledger.tagSos');
                    var hint = row.acknowledged ? dashboardTr('sos.ledger.hintAck') : dashboardTr('sos.ledger.hintOpen');
                    if (row.serverRecordingEvidenceId) hint += ' · ' + dashboardTr('sos.ledger.hasRecording');
                    var op = row.operatorName ? String(row.operatorName) : (typeof FleetDisplay !== 'undefined' ? FleetDisplay.friendlyDeviceName(row.cameraId) : dashboardTr('fleet.bwc'));
                    var cam = '';
                    item.innerHTML = thumb +
                        '<div class="sos-ledger-body"><div class="sos-ledger-tag">' + typeTag + ' · ' + tag + '</div>' +
                        '<div class="when">' + formatLedgerTime(row.at) + ' · ' + op.replace(/</g, '&lt;') + cam + '</div>' +
                        '<div class="note-hint">' + hint + '</div></div>';
                    item.addEventListener('click', function () { openSosLedgerDetail(row.id); });
                    list.appendChild(item);
                });
                var summary = rows.length + ' shown (' + windowDays + ' days)';
                if (openCount) summary += ' · ' + openCount + ' need acknowledge';
                if (older) summary += ' · older in folder';
                summary += ' · Updated ' + new Date().toLocaleTimeString();
                setSosLedgerMeta(summary, '');
                if (!opts.silent) {
                    list.classList.remove('sos-list-pulse');
                    void list.offsetWidth;
                    list.classList.add('sos-list-pulse');
                    list.scrollTop = 0;
                }
            }).catch(function () {
                list.innerHTML = '';
                setSosLedgerMeta('Could not load SOS ledger', 'error');
            }).finally(function () {
                if (syncBtn) syncBtn.disabled = false;
            });
        }

        document.getElementById('sos-ack-cancel').addEventListener('click', closeSosAcknowledgeDialog);
        document.getElementById('sos-ack-submit').addEventListener('click', submitSosAcknowledge);
        document.getElementById('sos-ack-recapture').addEventListener('click', function () {
            var cam = pendingSosAck && pendingSosAck.cameraId
                ? pendingSosAck.cameraId
                : getSosCamId();
            stashSosAckSnapshot(cam);
            updateSosAckCapturePreview(cam);
        });
        document.getElementById('sos-ack-backdrop').addEventListener('click', function (e) {
            if (e.target.id === 'sos-ack-backdrop') closeSosAcknowledgeDialog();
        });
        document.getElementById('sos-detail-close').addEventListener('click', closeSosDetailDialog);
        document.getElementById('sos-detail-new-tab').addEventListener('click', function () {
            var url = this.dataset.reportUrl || sosReportUrlForRow(sosDetailCurrentRow);
            if (url) window.open(url, '_blank', 'noopener');
        });
        document.getElementById('sos-detail-open-folder').addEventListener('click', function () {
            if (sosDetailCurrentRow && sosDetailCurrentRow.id) openSosIncidentFolder(sosDetailCurrentRow.id);
        });
        document.getElementById('sos-pin-cancel').addEventListener('click', closeSosDetailDialog);
        document.getElementById('sos-pin-submit').addEventListener('click', submitSosLedgerPin);
        document.getElementById('sos-pin-input').addEventListener('keydown', function (e) {
            if (e.key === 'Enter') submitSosLedgerPin();
        });
        document.getElementById('sos-detail-backdrop').addEventListener('click', function (e) {
            if (e.target.id === 'sos-detail-backdrop') closeSosDetailDialog();
        });
        document.getElementById('sos-ledger-sync').addEventListener('click', function () {
            refreshSosLedger();
        });
        document.getElementById('sos-ledger-clear').addEventListener('click', clearSosDashboardList);

        var pttJoinBtn = document.getElementById('ptt-group-join');
        var pttUngroupBtn = document.getElementById('ptt-group-ungroup');
        var sosPttTeamEndBtn = document.getElementById('sos-ptt-team-end');
        if (sosPttTeamEndBtn) sosPttTeamEndBtn.addEventListener('click', endSosPttTeam);
        var pttGroupSelect = document.getElementById('ptt-group-select');
        bindPttGroupMemberClicks();
        if (pttJoinBtn) pttJoinBtn.addEventListener('click', joinDispatchPttGroup);
        if (pttUngroupBtn) pttUngroupBtn.addEventListener('click', ungroupDispatchPtt);
        if (pttGroupSelect) pttGroupSelect.addEventListener('change', refreshPttGroupPreview);
        var mapPopoutBtn = document.getElementById('map-popout-open');
        if (mapPopoutBtn) mapPopoutBtn.addEventListener('click', openMapPopout);
        var srvRecStart = document.getElementById('map-server-record-start');
        var srvRecStop = document.getElementById('map-server-record-stop');
        if (srvRecStart) srvRecStart.addEventListener('click', startServerRecord);
        if (srvRecStop) srvRecStop.addEventListener('click', stopServerRecord);

        document.getElementById('geofence-set-open').addEventListener('click', openSetGeofenceDialog);
        document.getElementById('geofence-set-cancel').addEventListener('click', closeSetGeofenceDialog);
        document.getElementById('geofence-set-continue').addEventListener('click', submitSetGeofenceContinue);
        document.getElementById('geofence-set-backdrop').addEventListener('click', function (e) {
            if (e.target.id === 'geofence-set-backdrop') closeSetGeofenceDialog();
        });
        document.getElementById('geofence-clear-open').addEventListener('click', openClearGeofenceDialog);
        document.getElementById('geofence-set-filter').addEventListener('change', refreshGeofenceSetList);
        document.getElementById('geofence-clear-filter').addEventListener('change', refreshGeofenceClearList);
        document.getElementById('geofence-clear-cancel').addEventListener('click', closeClearGeofenceDialog);
        document.getElementById('geofence-clear-submit').addEventListener('click', submitClearGeofence);
        document.getElementById('geofence-clear-backdrop').addEventListener('click', function (e) {
            if (e.target.id === 'geofence-clear-backdrop') closeClearGeofenceDialog();
        });
        setGeofenceModalA11y('geofence-set-backdrop', false);
        setGeofenceModalA11y('geofence-clear-backdrop', false);
        document.getElementById('geofence-draw-confirm').addEventListener('click', confirmGeofenceDraw);
        document.getElementById('geofence-draw-cancel').addEventListener('click', stopGeofenceDrawMode);
        document.getElementById('geofence-radius').addEventListener('input', updateGeofenceDraftCircle);
        document.getElementById('geofence-radius').addEventListener('change', updateGeofenceDraftCircle);
        var sosRadiusEl = document.getElementById('sos-response-radius');
        if (sosRadiusEl) sosRadiusEl.addEventListener('change', onSosResponseRadiusChange);
        document.getElementById('map-bwc-target').addEventListener('change', function () {
            var id = this.value;
            if (id) ensureToolbarTarget(id);
            else refreshMapToolbarState();
        });

        function downloadSosCsv() {
            var stamp = new Date().toISOString().slice(0, 10);
            window.location.href = '/api/sos-incidents/export?days=' + SOS_LEDGER_DAYS + '&_=' + stamp;
        }

        function remoteControlRequiresReason(cmd) {
            return cmd === 'Lock' || cmd === 'Reboot' || cmd === 'ShutDown';
        }

        function isKillSwitchFourEyesCmd(cmd) {
            return cmd === 'Reboot' || cmd === 'ShutDown';
        }

        function ksEscAttr(s) {
            return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
        }

        function formatKillSwitchExpires(iso) {
            if (!iso) return '';
            try {
                var t = new Date(iso).getTime();
                if (Number.isNaN(t)) return '';
                var sec = Math.max(0, Math.round((t - Date.now()) / 1000));
                return Math.floor(sec / 60) + 'm ' + (sec % 60) + 's';
            } catch (_) { return ''; }
        }

        function renderKillSwitchPendingList(requests) {
            killSwitchPendingCache = (requests || []).slice();
            var bar = document.getElementById('kill-switch-approve-bar');
            var list = document.getElementById('kill-switch-approve-list');
            if (!bar || !list) return;
            if (!canDeviceKillSwitch || !killSwitchPendingCache.length) {
                bar.hidden = true;
                list.innerHTML = '';
                return;
            }
            bar.hidden = false;
            list.innerHTML = killSwitchPendingCache.map(function (r) {
                var deviceLabel = remoteDeviceLabel(r.camId);
                var cmdLabel = r.recordCmd === 'ShutDown'
                    ? dashboardTr('map.shutdownDevice') : dashboardTr('map.rebootDevice');
                var isMine = dashboardUsername && r.requesterUsername === dashboardUsername;
                var exp = formatKillSwitchExpires(r.expiresAt);
                var actions = '';
                if (isMine) {
                    actions = '<button type="button" class="btn btn-ghost btn-sm ks-cancel" data-request-id="'
                        + ksEscAttr(r.id) + '">' + dashboardTr('common.cancel') + '</button>';
                } else {
                    actions = '<button type="button" class="btn btn-stop btn-sm ks-approve" data-request-id="'
                        + ksEscAttr(r.id) + '">' + dashboardTr('map.killSwitch.approve') + '</button>';
                }
                var incident = r.incidentId ? (' · ' + ksEscAttr(r.incidentId)) : '';
                return '<div class="kill-switch-approve-item"><div class="ks-meta"><strong>'
                    + ksEscAttr(cmdLabel) + '</strong> — ' + ksEscAttr(deviceLabel)
                    + '<br>' + dashboardTr('map.killSwitch.requestedBy', { user: r.requesterUsername || '—' })
                    + (exp ? (' · ' + dashboardTr('map.killSwitch.expiresIn', { time: exp })) : '')
                    + '<div class="ks-reason">' + ksEscAttr(r.reason || '') + incident + '</div></div>'
                    + '<div class="ks-actions">' + actions + '</div></div>';
            }).join('');
        }

        (function wireKillSwitchApproveBar() {
            var list = document.getElementById('kill-switch-approve-list');
            if (!list) return;
            list.addEventListener('click', function (e) {
                var approveBtn = e.target.closest('.ks-approve');
                var cancelBtn = e.target.closest('.ks-cancel');
                if (approveBtn) {
                    var approveId = approveBtn.getAttribute('data-request-id');
                    if (!approveId) return;
                    if (!confirm(dashboardTr('map.killSwitch.confirmApprove'))) return;
                    socket.emit('kill-switch-approve', { requestId: approveId });
                } else if (cancelBtn) {
                    var cancelId = cancelBtn.getAttribute('data-request-id');
                    if (!cancelId) return;
                    if (!confirm(dashboardTr('map.killSwitch.confirmCancel'))) return;
                    socket.emit('kill-switch-cancel', { requestId: cancelId });
                }
            });
        })();

        function emitRemoteControl(cmd, meta) {
            if (meta && (meta.reason || meta.incidentId)) {
                socket.emit('remote-control', {
                    command: cmd,
                    reason: meta.reason || '',
                    incidentId: meta.incidentId || '',
                });
            } else {
                socket.emit('remote-control', cmd);
            }
        }

        var killSwitchReasonPending = null;

        function closeKillSwitchReasonDialog() {
            var backdrop = document.getElementById('kill-switch-reason-backdrop');
            if (backdrop) backdrop.hidden = true;
            killSwitchReasonPending = null;
        }

        function setKillSwitchIncidentOpen(open) {
            var fields = document.getElementById('kill-switch-incident-fields');
            var toggle = document.getElementById('kill-switch-incident-toggle');
            if (fields) fields.hidden = !open;
            if (toggle) {
                toggle.textContent = open
                    ? dashboardTr('map.killSwitch.incidentHide')
                    : dashboardTr('map.killSwitch.incidentToggle');
                toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            }
        }

        function updateKillSwitchReasonCounter() {
            var reasonEl = document.getElementById('kill-switch-reason-text');
            var counter = document.getElementById('kill-switch-reason-counter');
            if (!reasonEl || !counter) return;
            var len = String(reasonEl.value || '').trim().length;
            counter.textContent = dashboardTr('map.killSwitch.reasonMinHint', {
                count: len,
                min: KILL_SWITCH_REASON_MIN_LEN,
            });
            counter.classList.toggle('ok', len >= KILL_SWITCH_REASON_MIN_LEN);
            counter.classList.toggle('short', len > 0 && len < KILL_SWITCH_REASON_MIN_LEN);
        }

        function openKillSwitchReasonDialog(cmd, camId) {
            var backdrop = document.getElementById('kill-switch-reason-backdrop');
            var title = document.getElementById('kill-switch-reason-title');
            var hint = document.getElementById('kill-switch-reason-hint');
            var reasonEl = document.getElementById('kill-switch-reason-text');
            var incidentEl = document.getElementById('kill-switch-incident-id');
            var errEl = document.getElementById('kill-switch-reason-error');
            if (!backdrop || !reasonEl) return;
            killSwitchReasonPending = { cmd: cmd, camId: camId };
            if (title) {
                if (cmd === 'Reboot') title.textContent = dashboardTr('map.killSwitch.titleReboot');
                else if (cmd === 'ShutDown') title.textContent = dashboardTr('map.killSwitch.titleShutdown');
                else title.textContent = dashboardTr('map.killSwitch.titleLock');
            }
            if (hint) {
                hint.textContent = isKillSwitchFourEyesCmd(cmd)
                    ? dashboardTr('map.killSwitch.fourEyesReasonHint')
                    : dashboardTr('map.killSwitch.reasonHint');
            }
            reasonEl.value = '';
            if (incidentEl) incidentEl.value = '';
            if (errEl) errEl.textContent = '';
            setKillSwitchIncidentOpen(false);
            updateKillSwitchReasonCounter();
            backdrop.hidden = false;
            reasonEl.focus();
        }

        (function wireKillSwitchReasonDialog() {
            var backdrop = document.getElementById('kill-switch-reason-backdrop');
            var cancelBtn = document.getElementById('kill-switch-reason-cancel');
            var submitBtn = document.getElementById('kill-switch-reason-submit');
            var reasonEl = document.getElementById('kill-switch-reason-text');
            var incidentEl = document.getElementById('kill-switch-incident-id');
            var incidentToggle = document.getElementById('kill-switch-incident-toggle');
            var errEl = document.getElementById('kill-switch-reason-error');
            if (!backdrop || !submitBtn || !reasonEl) return;
            if (cancelBtn) cancelBtn.addEventListener('click', closeKillSwitchReasonDialog);
            if (incidentToggle) {
                incidentToggle.addEventListener('click', function () {
                    var fields = document.getElementById('kill-switch-incident-fields');
                    setKillSwitchIncidentOpen(fields ? fields.hidden : true);
                });
            }
            reasonEl.addEventListener('input', updateKillSwitchReasonCounter);
            backdrop.addEventListener('click', function (e) {
                if (e.target === backdrop) closeKillSwitchReasonDialog();
            });
            submitBtn.addEventListener('click', function () {
                if (!killSwitchReasonPending) return;
                var reason = String(reasonEl.value || '').trim();
                if (reason.length < KILL_SWITCH_REASON_MIN_LEN) {
                    if (errEl) {
                        errEl.textContent = dashboardTr('map.killSwitch.reasonTooShort', { min: KILL_SWITCH_REASON_MIN_LEN });
                    }
                    reasonEl.focus();
                    updateKillSwitchReasonCounter();
                    return;
                }
                var incidentId = incidentEl ? String(incidentEl.value || '').trim() : '';
                var pending = killSwitchReasonPending;
                closeKillSwitchReasonDialog();
                if (isKillSwitchFourEyesCmd(pending.cmd)) {
                    ensureToolbarTarget(pending.camId);
                    socket.emit('kill-switch-request', {
                        command: pending.cmd,
                        reason: reason,
                        incidentId: incidentId,
                        camId: pending.camId,
                    });
                } else {
                    ensureToolbarTarget(pending.camId);
                    emitRemoteControl(pending.cmd, { reason: reason, incidentId: incidentId });
                }
            });
        })();

        function sendCommand(cmd) {
            if (!canMapDeviceControl) {
                alert(dashboardTr('map.permDenied'));
                return;
            }
            var camId = getToolbarTargetCamId();
            if (!camId) {
                alert(dashboardTr('map.toolbar.selectFirst'));
                return;
            }
            ensureToolbarTarget(camId);
            socket.emit('remote-control', cmd);
        }

        function remoteDeviceLabel(camId) {
            var label = camId;
            if (typeof FleetUi !== 'undefined' && FleetUi.getDeviceName) {
                var name = FleetUi.getDeviceName(camId);
                if (name) label = name + ' (' + camId + ')';
            }
            return label;
        }

        function sendRemoteDeviceCommand(cmd) {
            if (!canMapDeviceControl) {
                alert(dashboardTr('map.permDenied'));
                return;
            }
            var camId = getToolbarTargetCamId();
            if (!camId) {
                alert(dashboardTr('map.toolbar.selectFirst'));
                return;
            }
            var label = remoteDeviceLabel(camId);
            var ok = false;
            if (cmd === 'Lock') {
                ok = confirm(dashboardTr('map.confirmLock', { id: label }));
            } else if (cmd === 'Unlock') {
                ok = confirm(dashboardTr('map.confirmUnlock', { id: label }));
            } else if (cmd === 'Reboot') {
                if (!canDeviceKillSwitch) {
                    alert(dashboardTr('map.killSwitchDenied'));
                    return;
                }
                ok = confirm(dashboardTr('map.confirmReboot1', { id: label }));
                if (ok) ok = confirm(dashboardTr('map.confirmReboot2', { id: label }));
            } else if (cmd === 'ShutDown') {
                if (!canDeviceKillSwitch) {
                    alert(dashboardTr('map.killSwitchDenied'));
                    return;
                }
                ok = confirm(dashboardTr('map.confirmShutdown1', { id: label }));
                if (ok) ok = confirm(dashboardTr('map.confirmShutdown2', { id: label }));
            } else {
                ok = true;
            }
            if (!ok) return;
            if (remoteControlRequiresReason(cmd)) {
                openKillSwitchReasonDialog(cmd, camId);
                return;
            }
            ensureToolbarTarget(camId);
            emitRemoteControl(cmd);
        }
        window.sendRemoteDeviceCommand = sendRemoteDeviceCommand;

        async function startServerRecord() {
            if (!canMapDeviceControl) {
                alert(dashboardTr('map.permDenied'));
                return;
            }
            var camId = getToolbarTargetCamId();
            if (!camId) {
                alert('Select a BWC from the list first.');
                return;
            }
            try {
                var res = await fetch('/api/evidence/live-record/start', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ camId: camId }),
                });
                var data = await res.json();
                if (!res.ok || !data.ok) throw new Error((data && data.error) || 'Start failed');
                alert(dashboardTr('map.serverRecordStarted', { file: (data.recording && data.recording.fileName) || '' }));
            } catch (err) {
                alert(err.message || 'Server record failed');
            }
        }

        async function stopServerRecord() {
            if (!canMapDeviceControl) {
                alert(dashboardTr('map.permDenied'));
                return;
            }
            var camId = getToolbarTargetCamId();
            if (!camId) {
                alert('Select a BWC from the list first.');
                return;
            }
            try {
                var res = await fetch('/api/evidence/live-record/stop', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ camId: camId }),
                });
                var data = await res.json();
                if (!res.ok || !data.ok) throw new Error((data && data.error) || 'Stop failed');
                var id = data.recording && data.recording.evidenceId;
                alert(id
                    ? dashboardTr('map.serverRecordStopped', { id: id })
                    : dashboardTr('map.serverRecordStoppedPending'));
            } catch (err) {
                alert(err.message || 'Stop server record failed');
            }
        }
        window.startServerRecord = startServerRecord;
        window.stopServerRecord = stopServerRecord;

        async function loadStoragePaths() {
            try {
                var res = await fetch('/api/storage');
                var data = await res.json();
                document.getElementById('storage-ftp-path').textContent = data.ftpLabel || data.ftp || '—';
            } catch (_) {
                document.getElementById('storage-ftp-path').textContent = '—';
            }
        }
        window.loadStoragePaths = loadStoragePaths;

        async function openStorageFolder(folder) {
            try {
                var res = await fetch('/api/open-folder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folder: folder }) });
                var data = await res.json();
                if (data.ok) {
                    alert(dashboardTr('storage.alert.openedLocal', { path: data.path || '' }));
                    return;
                }
                alert(dashboardTr('storage.alert.openManual', { path: data.path || '' }));
            } catch (_) {
                alert(dashboardTr('storage.alert.openFailed'));
            }
        }

        loadStoragePaths();
        if (typeof loadDispatchGroupsForMap === 'function') loadDispatchGroupsForMap();
        loadSosLedgerGate();
        var mapPermBtn = document.getElementById('map-toolbar-perm-btn');
        if (mapPermBtn) mapPermBtn.addEventListener('click', openMapPermissionHelp);
        refreshSosLedger({ silent: true });
        restoreOpenSosBanner();
        Promise.resolve(typeof ServerSetup !== 'undefined' && ServerSetup.init ? ServerSetup.init() : null).finally(function () {
            refreshMapFromServer();
        });
        window.addEventListener('fm-i18n-changed', function () {
            if (typeof I18n !== 'undefined' && I18n.applyPage) I18n.applyPage(document);
            if (lastDashboardSession) applyDashboardSessionDisplay(lastDashboardSession);
            refreshGeofenceSetList();
            refreshGeofenceClearList();
            refreshSosLedger({ silent: true });
            refreshMapToolbarBwcList();
            if (typeof VideoWall !== 'undefined' && VideoWall.relabelWallSlots) VideoWall.relabelWallSlots();
            if (typeof updateMapPinLegend === 'function') updateMapPinLegend();
            applyAlarmBannerKind(activeAlarmKind);
        });
        setTimeout(function () { fmMapResize(); }, 200);
        window.addEventListener('resize', function () { fmMapResize(); });

        (function initSidebarCollapse() {
            var KEY = 'mobility-sidebar-collapsed';
            var main = document.getElementById('main-container');
            var btn = document.getElementById('sidebar-collapse-toggle');
            if (!main || !btn) return;

            function panelLabel(collapsed) {
                return dashboardTr(collapsed ? 'fleet.showPanel' : 'fleet.hidePanel');
            }

            function syncToggle(collapsed) {
                btn.textContent = collapsed ? '\u25B6' : '\u25C0';
                btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
                btn.title = panelLabel(collapsed);
                btn.setAttribute('aria-label', panelLabel(collapsed));
            }

            function resizeMapAfterSidebar() {
                setTimeout(function () {
                    try { if (map) fmMapResize(); } catch (_) { /* ignore */ }
                }, 220);
            }

            function setCollapsed(collapsed, persist) {
                main.classList.toggle('sidebar-collapsed', collapsed);
                syncToggle(collapsed);
                if (persist !== false) {
                    try { localStorage.setItem(KEY, collapsed ? '1' : '0'); } catch (_) { /* ignore */ }
                }
                resizeMapAfterSidebar();
            }

            var startCollapsed = false;
            try { startCollapsed = localStorage.getItem(KEY) === '1'; } catch (_) { /* ignore */ }
            setCollapsed(startCollapsed, false);

            btn.addEventListener('click', function () {
                setCollapsed(!main.classList.contains('sidebar-collapsed'));
            });
        })();
    