/**
 * Video matrix pop-out — Operations wall (6) or Command Wall (up to 32).
 * Play/stop/audio delegate to opener; matrix window attaches own FLV/JSMpeg decode (V2).
 */
(function (global) {
    'use strict';

    var matrixPopoutWin = null;
    var matrixSource = 'ops';
    var OPS_SLOT_COUNT = 10;
    var CW_SLOT_MAX = 32;

    function tr(key, params) {
        if (global.I18n && I18n.t) return I18n.t(key, params);
        return key;
    }

    function isCwSource() {
        return matrixSource === 'cw';
    }

    function currentSlotCount() {
        if (isCwSource()) {
            if (global.CommandWall && typeof CommandWall.getMatrixSlotCount === 'function') {
                return CommandWall.getMatrixSlotCount();
            }
            return 16;
        }
        return OPS_SLOT_COUNT;
    }

    function opsSlotEl(index) {
        return document.querySelector('.video-slot[data-slot="' + index + '"]');
    }

    function getSlotCanvas(slotIndex) {
        if (isCwSource()) {
            if (global.CommandWall && typeof CommandWall.getMatrixSlotCanvas === 'function') {
                return CommandWall.getMatrixSlotCanvas(slotIndex);
            }
            return null;
        }
        var el = opsSlotEl(slotIndex);
        if (!el) return null;
        var canvas = el.querySelector('.video-slot-stage canvas');
        if (canvas && canvas.width > 8 && canvas.height > 8) return canvas;
        return null;
    }

    function slotLabel(camId) {
        if (!camId) return '';
        if (global.FleetUi && FleetUi.getDeviceName) {
            var n = FleetUi.getDeviceName(camId);
            if (n) return n;
        }
        if (global.FleetDisplay && FleetDisplay.friendlyDeviceName) {
            return FleetDisplay.friendlyDeviceName(camId);
        }
        return camId;
    }

    function getSlotLiveVideo(slotIndex) {
        if (isCwSource()) {
            if (global.CommandWall && typeof CommandWall.getMatrixSlotVideo === 'function') {
                return CommandWall.getMatrixSlotVideo(slotIndex);
            }
            return null;
        }
        var el = opsSlotEl(slotIndex);
        if (!el) return null;
        var video = el.querySelector('.video-slot-stage video.me8-zlm-primary');
        return video || null;
    }

    function getSlotMirrorSource(slotIndex) {
        var canvas = getSlotCanvas(slotIndex);
        if (canvas) return canvas;
        return getSlotLiveVideo(slotIndex);
    }

    function flvUrlForCamId(camId) {
        if (!camId) return null;
        if (isCwSource()) {
            if (global.CommandWall && typeof CommandWall.getHandoffFlvUrlForCam === 'function') {
                return CommandWall.getHandoffFlvUrlForCam(camId);
            }
        } else if (global.VideoWall && typeof VideoWall.getHandoffFlvUrlForCam === 'function') {
            return VideoWall.getHandoffFlvUrlForCam(camId);
        }
        return null;
    }

    function getSlotFlvUrl(slotIndex) {
        var camId = '';
        if (isCwSource()) {
            if (global.CommandWall && typeof CommandWall.getMatrixSlotInfo === 'function') {
                camId = CommandWall.getMatrixSlotInfo(slotIndex).camId || '';
            }
        } else {
            var el = opsSlotEl(slotIndex);
            camId = el ? (el.getAttribute('data-cam-id') || '') : '';
        }
        return flvUrlForCamId(camId);
    }

    function getSlotMatrixInfo(slotIndex) {
        if (isCwSource()) {
            if (global.CommandWall && typeof CommandWall.getMatrixSlotInfo === 'function') {
                return CommandWall.getMatrixSlotInfo(slotIndex);
            }
            return {
                slotIndex: slotIndex,
                panelNum: slotIndex + 1,
                camId: '',
                label: '',
                status: '',
                hasLive: false,
                audioMuted: true,
            };
        }
        var el = opsSlotEl(slotIndex);
        var panelNum = slotIndex + 1;
        if (!el) {
            return { slotIndex: slotIndex, panelNum: panelNum, camId: '', label: '', status: '', hasLive: false, audioMuted: true };
        }
        var camId = el.getAttribute('data-cam-id') || '';
        var statusEl = el.querySelector('.video-slot-status');
        var audioMuted = true;
        if (global.VideoWall && typeof VideoWall.isSlotAudioMuted === 'function') {
            audioMuted = VideoWall.isSlotAudioMuted(slotIndex);
        }
        return {
            slotIndex: slotIndex,
            panelNum: panelNum,
            camId: camId,
            label: slotLabel(camId),
            status: statusEl ? statusEl.textContent : '',
            hasLive: !!(getSlotCanvas(slotIndex) || getSlotLiveVideo(slotIndex) || getSlotFlvUrl(slotIndex)),
            audioMuted: audioMuted,
        };
    }

    function playSlotByIndex(slotIndex) {
        if (isCwSource()) {
            if (global.CommandWall && typeof CommandWall.playMatrixSlot === 'function') {
                return CommandWall.playMatrixSlot(slotIndex);
            }
            return false;
        }
        var el = opsSlotEl(slotIndex);
        if (!el || !global.VideoWall || typeof VideoWall.playSlot !== 'function') return false;
        VideoWall.playSlot(el);
        return true;
    }

    function stopSlotByIndex(slotIndex) {
        if (isCwSource()) {
            if (global.CommandWall && typeof CommandWall.stopMatrixSlot === 'function') {
                return CommandWall.stopMatrixSlot(slotIndex);
            }
            return false;
        }
        var el = opsSlotEl(slotIndex);
        if (!el || !global.VideoWall || typeof VideoWall.stopSlot !== 'function') return false;
        VideoWall.stopSlot(el);
        return true;
    }

    function toggleSlotAudioByIndex(slotIndex) {
        if (isCwSource()) {
            if (global.CommandWall && typeof CommandWall.toggleMatrixSlotAudio === 'function') {
                CommandWall.toggleMatrixSlotAudio(slotIndex);
                return true;
            }
            return false;
        }
        if (global.VideoWall && typeof VideoWall.toggleSlotAudio === 'function') {
            VideoWall.toggleSlotAudio(slotIndex);
            return true;
        }
        return false;
    }

    function openMatrixPopout(slotIndices) {
        var max = currentSlotCount();
        var indices = (slotIndices || [])
            .map(function (n) { return parseInt(n, 10); })
            .filter(function (n) { return !isNaN(n) && n >= 0 && n < max; });
        if (!indices.length) return false;
        indices.sort(function (a, b) { return a - b; });
        var port = window.location.port || '3888';
        var url = '/matrix.html?slots=' + encodeURIComponent(indices.join(','))
            + '&port=' + encodeURIComponent(port)
            + '&source=' + encodeURIComponent(matrixSource)
            + '&max=' + encodeURIComponent(String(max));
        var features = 'width=1920,height=1080,menubar=no,toolbar=no,location=no,status=no,resizable=yes';
        if (matrixPopoutWin && !matrixPopoutWin.closed) {
            try {
                matrixPopoutWin.location.href = url;
                matrixPopoutWin.focus();
                return true;
            } catch (_) {
                matrixPopoutWin = null;
            }
        }
        matrixPopoutWin = window.open(url, 'mobility-video-matrix', features);
        return !!matrixPopoutWin;
    }

    function rebuildPicks(picksEl) {
        if (!picksEl) return;
        var count = currentSlotCount();
        picksEl.innerHTML = '';
        picksEl.classList.toggle('cw-picks', isCwSource());
        for (var i = 0; i < count; i += 1) {
            var label = document.createElement('label');
            label.className = 'video-matrix-pick';
            var cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.value = String(i);
            label.appendChild(cb);
            var span = document.createElement('span');
            span.textContent = tr('video.panel', { n: i + 1 });
            label.appendChild(span);
            picksEl.appendChild(label);
        }
    }

    function bindMatrixPopoutUi() {
        var openBtn = document.getElementById('video-matrix-open');
        var cwOpenBtn = document.getElementById('cw-matrix-open');
        var backdrop = document.getElementById('video-matrix-backdrop');
        var picksEl = document.getElementById('video-matrix-picks');
        var hintEl = document.querySelector('#video-matrix-dialog .hint');
        var errEl = document.getElementById('video-matrix-error');
        var cancelBtn = document.getElementById('video-matrix-cancel');
        var submitBtn = document.getElementById('video-matrix-submit');
        if (!backdrop || !picksEl) return;

        function closeDialog() {
            backdrop.hidden = true;
            if (errEl) errEl.hidden = true;
        }

        function openDialog(source) {
            matrixSource = source === 'cw' ? 'cw' : 'ops';
            if (hintEl) {
                hintEl.textContent = isCwSource()
                    ? tr('video.matrix.hintCw')
                    : tr('video.matrix.hint');
            }
            rebuildPicks(picksEl);
            if (errEl) errEl.hidden = true;
            backdrop.hidden = false;
        }

        if (openBtn) {
            openBtn.addEventListener('click', function () { openDialog('ops'); });
        }
        if (cwOpenBtn) {
            cwOpenBtn.addEventListener('click', function () {
                if (global.CommandWall && CommandWall.init) {
                    CommandWall.init(global.__mobilityDashboardSocket);
                }
                openDialog('cw');
            });
        }
        if (cancelBtn) cancelBtn.addEventListener('click', closeDialog);
        backdrop.addEventListener('click', function (e) {
            if (e.target === backdrop) closeDialog();
        });
        if (submitBtn) {
            submitBtn.addEventListener('click', function () {
                var selected = Array.prototype.slice.call(picksEl.querySelectorAll('input:checked'))
                    .map(function (cb) { return parseInt(cb.value, 10); })
                    .filter(function (n) { return !isNaN(n); });
                if (!selected.length) {
                    if (errEl) errEl.hidden = false;
                    return;
                }
                if (openMatrixPopout(selected)) closeDialog();
            });
        }
        global.addEventListener('fm-i18n-changed', function () {
            rebuildPicks(picksEl);
        });
    }

    global.VideoMatrix = {
        getSlotMatrixInfo: getSlotMatrixInfo,
        getSlotCanvas: getSlotCanvas,
        getSlotLiveVideo: getSlotLiveVideo,
        getSlotMirrorSource: getSlotMirrorSource,
        getSlotFlvUrl: getSlotFlvUrl,
        playSlotByIndex: playSlotByIndex,
        stopSlotByIndex: stopSlotByIndex,
        toggleSlotAudioByIndex: toggleSlotAudioByIndex,
        openMatrixPopout: openMatrixPopout,
        init: bindMatrixPopoutUi,
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindMatrixPopoutUi);
    } else {
        bindMatrixPopoutUi();
    }
})(window);
