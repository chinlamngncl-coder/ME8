/**
 * ANPR plate cropper — vanilla canvas (no third-party crop library).
 * Wide freeform box for plates. MOB: ANPR-SNAPSHOT-CROP-READ-V1
 */
(function (global) {
    var MIN_W = 80;
    var MIN_H = 32;
    var ASPECT = 3.2;

    var state = null;

    function tr(key, fallback) {
        if (typeof I18n !== 'undefined' && I18n.t) {
            var s = I18n.t(key);
            if (s && s !== key) return s;
        }
        return fallback || key;
    }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function ensureModal() {
        var el = document.getElementById('ax-anpr-crop-modal');
        if (el) return el;
        el = document.createElement('div');
        el.id = 'ax-anpr-crop-modal';
        el.hidden = true;
        el.innerHTML =
            '<div class="ax-anpr-crop-panel" role="dialog" aria-labelledby="ax-anpr-crop-title">' +
            '<h3 id="ax-anpr-crop-title">' + esc(tr('analytics.anpr.cropTitle', 'Crop plate')) + '</h3>' +
            '<p class="hint">' + esc(tr('analytics.anpr.cropHint',
                'Drag the frame onto the number plate, then use this crop.')) + '</p>' +
            '<div class="ax-anpr-crop-stage-wrap"><canvas id="ax-anpr-crop-canvas"></canvas></div>' +
            '<div class="ax-anpr-crop-actions">' +
            '<button type="button" class="btn btn-ghost btn-sm" id="ax-anpr-crop-cancel">' +
            esc(tr('analytics.anpr.cropCancel', 'Cancel')) + '</button>' +
            '<button type="button" class="btn btn-ghost btn-sm" id="ax-anpr-crop-full">' +
            esc(tr('analytics.anpr.cropFull', 'Use full image')) + '</button>' +
            '<button type="button" class="btn btn-action btn-sm" id="ax-anpr-crop-use">' +
            esc(tr('analytics.anpr.cropUse', 'Use this crop')) + '</button>' +
            '</div>' +
            '<p class="hint" id="ax-anpr-crop-status"></p>' +
            '</div>';
        document.body.appendChild(el);
        el.addEventListener('click', function (ev) {
            if (ev.target === el) close();
        });
        document.getElementById('ax-anpr-crop-cancel').addEventListener('click', close);
        document.getElementById('ax-anpr-crop-full').addEventListener('click', function () {
            if (!state || !state.img) return;
            state.box = { x: 0, y: 0, w: state.img.naturalWidth, h: state.img.naturalHeight };
            draw();
            setStatus(tr('analytics.anpr.cropFullReady', 'Using full image.'), '');
        });
        document.getElementById('ax-anpr-crop-use').addEventListener('click', useCrop);
        bindCanvasDrag();
        return el;
    }

    function setStatus(msg, cls) {
        var el = document.getElementById('ax-anpr-crop-status');
        if (!el) return;
        el.textContent = msg || '';
        el.className = 'hint' + (cls ? ' ' + cls : '');
    }

    function boxNatural() {
        if (!state || !state.img) return null;
        return {
            x: Math.round(state.box.x),
            y: Math.round(state.box.y),
            w: Math.round(state.box.w),
            h: Math.round(state.box.h),
        };
    }

    function fitCanvas() {
        var canvas = document.getElementById('ax-anpr-crop-canvas');
        if (!canvas || !state || !state.img) return;
        var maxW = 720;
        var maxH = 420;
        var iw = state.img.naturalWidth;
        var ih = state.img.naturalHeight;
        var scale = Math.min(maxW / iw, maxH / ih, 1);
        state.scale = scale;
        canvas.width = Math.max(1, Math.floor(iw * scale));
        canvas.height = Math.max(1, Math.floor(ih * scale));
        draw();
    }

    function draw() {
        var canvas = document.getElementById('ax-anpr-crop-canvas');
        if (!canvas || !state || !state.img) return;
        var ctx = canvas.getContext('2d');
        var s = state.scale || 1;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(state.img, 0, 0, canvas.width, canvas.height);
        var b = state.box;
        var x = b.x * s;
        var y = b.y * s;
        var w = b.w * s;
        var h = b.h * s;
        ctx.fillStyle = 'rgba(2, 6, 23, 0.55)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.clearRect(x, y, w, h);
        ctx.drawImage(state.img, b.x, b.y, b.w, b.h, x, y, w, h);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
        var hs = 10;
        ctx.fillStyle = '#38bdf8';
        [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].forEach(function (pt) {
            ctx.fillRect(pt[0] - hs / 2, pt[1] - hs / 2, hs, hs);
        });
    }

    function bindCanvasDrag() {
        var canvas = document.getElementById('ax-anpr-crop-canvas');
        if (!canvas || canvas.__anprCropBound) return;
        canvas.__anprCropBound = true;
        var drag = null;

        function pos(ev) {
            var r = canvas.getBoundingClientRect();
            var cx = (ev.clientX - r.left) * (canvas.width / r.width);
            var cy = (ev.clientY - r.top) * (canvas.height / r.height);
            var s = state.scale || 1;
            return { x: cx / s, y: cy / s };
        }

        function hitHandle(p) {
            var b = state.box;
            var hs = 14 / (state.scale || 1);
            var corners = [
                { k: 'nw', x: b.x, y: b.y },
                { k: 'ne', x: b.x + b.w, y: b.y },
                { k: 'sw', x: b.x, y: b.y + b.h },
                { k: 'se', x: b.x + b.w, y: b.y + b.h },
            ];
            for (var i = 0; i < corners.length; i++) {
                var c = corners[i];
                if (Math.abs(p.x - c.x) <= hs && Math.abs(p.y - c.y) <= hs) return c.k;
            }
            if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) return 'move';
            return null;
        }

        canvas.addEventListener('pointerdown', function (ev) {
            if (!state) return;
            canvas.setPointerCapture(ev.pointerId);
            var p = pos(ev);
            var mode = hitHandle(p) || 'move';
            drag = { mode: mode, start: p, box: Object.assign({}, state.box) };
            ev.preventDefault();
        });
        canvas.addEventListener('pointermove', function (ev) {
            if (!drag || !state) return;
            var p = pos(ev);
            var dx = p.x - drag.start.x;
            var dy = p.y - drag.start.y;
            var b0 = drag.box;
            var iw = state.img.naturalWidth;
            var ih = state.img.naturalHeight;
            var b = { x: b0.x, y: b0.y, w: b0.w, h: b0.h };
            if (drag.mode === 'move') {
                b.x = Math.max(0, Math.min(iw - b.w, b0.x + dx));
                b.y = Math.max(0, Math.min(ih - b.h, b0.y + dy));
            } else {
                if (drag.mode === 'se') {
                    b.w = Math.max(MIN_W, b0.w + dx);
                    b.h = Math.max(MIN_H, b0.h + dy);
                } else if (drag.mode === 'nw') {
                    b.w = Math.max(MIN_W, b0.w - dx);
                    b.h = Math.max(MIN_H, b0.h - dy);
                    b.x = b0.x + b0.w - b.w;
                    b.y = b0.y + b0.h - b.h;
                } else if (drag.mode === 'ne') {
                    b.w = Math.max(MIN_W, b0.w + dx);
                    b.h = Math.max(MIN_H, b0.h - dy);
                    b.y = b0.y + b0.h - b.h;
                } else if (drag.mode === 'sw') {
                    b.w = Math.max(MIN_W, b0.w - dx);
                    b.h = Math.max(MIN_H, b0.h + dy);
                    b.x = b0.x + b0.w - b.w;
                }
                if (b.x < 0) { b.w += b.x; b.x = 0; }
                if (b.y < 0) { b.h += b.y; b.y = 0; }
                if (b.x + b.w > iw) b.w = iw - b.x;
                if (b.y + b.h > ih) b.h = ih - b.y;
                b.w = Math.max(MIN_W, b.w);
                b.h = Math.max(MIN_H, b.h);
            }
            state.box = b;
            draw();
        });
        canvas.addEventListener('pointerup', function () { drag = null; });
        canvas.addEventListener('pointercancel', function () { drag = null; });
    }

    function exportBlob(cb) {
        var b = boxNatural();
        if (!b || !state || !state.img) {
            cb(null);
            return;
        }
        var c = document.createElement('canvas');
        c.width = Math.max(1, b.w);
        c.height = Math.max(1, b.h);
        var ctx = c.getContext('2d');
        ctx.drawImage(state.img, b.x, b.y, b.w, b.h, 0, 0, b.w, b.h);
        c.toBlob(function (blob) {
            if (!blob) {
                cb(null);
                return;
            }
            if (blob.size > 12 * 1024 * 1024) {
                c.toBlob(function (blob2) { cb(blob2); }, 'image/jpeg', 0.82);
                return;
            }
            cb(blob);
        }, 'image/jpeg', 0.92);
    }

    function useCrop() {
        var b = boxNatural();
        if (!b || b.w < MIN_W || b.h < MIN_H) {
            setStatus(tr('analytics.anpr.cropTooSmall', 'Enlarge the frame onto the plate.'), 'is-bad');
            return;
        }
        exportBlob(function (blob) {
            if (!blob) {
                setStatus(tr('analytics.anpr.cropExportFail', 'Could not build crop image.'), 'is-bad');
                return;
            }
            var file = new File([blob], 'anpr-plate-crop.jpg', { type: 'image/jpeg' });
            if (state && typeof state.onReady === 'function') {
                state.onReady(file, { width: b.w, height: b.h });
            }
            close();
        });
    }

    function close() {
        var el = document.getElementById('ax-anpr-crop-modal');
        if (el) el.hidden = true;
        if (state && state.objectUrl) {
            try { URL.revokeObjectURL(state.objectUrl); } catch (_) { /* ignore */ }
        }
        state = null;
    }

    function open(file, onReady) {
        if (!file) return;
        ensureModal();
        var url = URL.createObjectURL(file);
        var img = new Image();
        img.onload = function () {
            var iw = img.naturalWidth;
            var ih = img.naturalHeight;
            var boxW = Math.max(MIN_W, Math.floor(iw * 0.62));
            var boxH = Math.max(MIN_H, Math.floor(boxW / ASPECT));
            if (boxH > ih * 0.45) {
                boxH = Math.max(MIN_H, Math.floor(ih * 0.28));
                boxW = Math.max(MIN_W, Math.floor(boxH * ASPECT));
            }
            if (boxW > iw) boxW = iw;
            if (boxH > ih) boxH = ih;
            state = {
                img: img,
                objectUrl: url,
                onReady: onReady,
                scale: 1,
                box: {
                    x: Math.floor((iw - boxW) / 2),
                    y: Math.floor((ih - boxH) / 2),
                    w: boxW,
                    h: boxH,
                },
            };
            var modal = document.getElementById('ax-anpr-crop-modal');
            modal.hidden = false;
            fitCanvas();
            setStatus(tr('analytics.anpr.cropReady', 'Drag the frame onto the plate, then Use this crop.'), '');
            bindCanvasDrag();
        };
        img.onerror = function () {
            try { URL.revokeObjectURL(url); } catch (_) { /* ignore */ }
            if (typeof onReady === 'function') onReady(null);
        };
        img.src = url;
    }

    global.AnprPlateCropper = {
        open: open,
        close: close,
    };
})(window);
