/**
 * Watchlist enroll cropper \u2014 vanilla canvas only (no third-party crop library).
 * License: original Ubitron / ME8 code; no Cropper.js or similar.
 * Guides operator to our enroll specs before upload.
 */
(function (global) {
    var MIN_FACE = 160;
    var MIN_SHORT = 480;
    var MIN_SHARP = 25;
    var WARN_SHARP = 40;
    var MIN_LUMA = 15;
    var MAX_LUMA = 245;

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
        var el = document.getElementById('ax-bl-crop-modal');
        if (el) return el;
        el = document.createElement('div');
        el.id = 'ax-bl-crop-modal';
        el.hidden = true;
        el.innerHTML =
            '<div class="ax-bl-crop-panel" role="dialog" aria-labelledby="ax-bl-crop-title">' +
            '<h3 id="ax-bl-crop-title">' + esc(tr('analytics.bl.cropTitle', 'Crop face for watchlist')) + '</h3>' +
            '<p class="hint">' + esc(tr('analytics.bl.cropHint',
                'Frame one face. Green meters match our enroll rules. No third-party crop library \u2014 built-in tool only.')) + '</p>' +
            '<div class="ax-bl-crop-layout">' +
            '<div class="ax-bl-crop-stage-wrap"><canvas id="ax-bl-crop-canvas"></canvas></div>' +
            '<div class="ax-bl-crop-meters" id="ax-bl-crop-meters"></div>' +
            '</div>' +
            '<div class="ax-bl-crop-actions">' +
            '<button type="button" class="btn btn-ghost btn-sm" id="ax-bl-crop-cancel">' +
            esc(tr('analytics.bl.cropCancel', 'Cancel')) + '</button>' +
            '<button type="button" class="btn btn-ghost btn-sm" id="ax-bl-crop-full">' +
            esc(tr('analytics.bl.cropFull', 'Use full image')) + '</button>' +
            '<button type="button" class="btn btn-ghost btn-sm" id="ax-bl-crop-check">' +
            esc(tr('analytics.bl.cropCheck', 'Check with face service')) + '</button>' +
            '<button type="button" class="btn btn-action btn-sm" id="ax-bl-crop-use">' +
            esc(tr('analytics.bl.cropUse', 'Use this crop')) + '</button>' +
            '</div>' +
            '<p class="hint" id="ax-bl-crop-status"></p>' +
            '</div>';
        document.body.appendChild(el);
        el.addEventListener('click', function (ev) {
            if (ev.target === el) close();
        });
        document.getElementById('ax-bl-crop-cancel').addEventListener('click', close);
        document.getElementById('ax-bl-crop-full').addEventListener('click', function () {
            if (!state || !state.img) return;
            state.box = { x: 0, y: 0, w: state.img.naturalWidth, h: state.img.naturalHeight };
            draw();
            updateClientMeters();
        });
        document.getElementById('ax-bl-crop-check').addEventListener('click', runPreflight);
        document.getElementById('ax-bl-crop-use').addEventListener('click', useCrop);
        bindCanvasDrag();
        return el;
    }

    function setStatus(msg, cls) {
        var el = document.getElementById('ax-bl-crop-status');
        if (!el) return;
        el.textContent = msg || '';
        el.className = 'hint' + (cls ? ' ' + cls : '');
    }

    function meterRow(label, ok, warn, text) {
        var cls = ok ? 'is-ok' : (warn ? 'is-warn' : 'is-bad');
        return '<div class="ax-bl-meter ' + cls + '"><span class="ax-bl-meter-label">' + esc(label) +
            '</span><span class="ax-bl-meter-val">' + esc(text) + '</span></div>';
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

    function sampleCropImageData() {
        var b = boxNatural();
        if (!b || !state || !state.img) return null;
        var c = document.createElement('canvas');
        var tw = Math.min(b.w, 256);
        var th = Math.min(b.h, 256);
        if (tw < 8 || th < 8) return null;
        c.width = tw;
        c.height = th;
        var ctx = c.getContext('2d');
        ctx.drawImage(state.img, b.x, b.y, b.w, b.h, 0, 0, tw, th);
        return ctx.getImageData(0, 0, tw, th);
    }

    function lumaAndSharp(data) {
        if (!data) return { luma: 0, sharp: 0 };
        var d = data.data;
        var w = data.width;
        var h = data.height;
        var gray = new Float64Array(w * h);
        var sum = 0;
        for (var i = 0, p = 0; i < d.length; i += 4, p++) {
            var g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            gray[p] = g;
            sum += g;
        }
        var luma = sum / (w * h);
        var sharpSum = 0;
        var n = 0;
        for (var y = 1; y < h - 1; y++) {
            for (var x = 1; x < w - 1; x++) {
                var idx = y * w + x;
                var lap = -4 * gray[idx]
                    + gray[idx - 1] + gray[idx + 1]
                    + gray[idx - w] + gray[idx + w];
                sharpSum += lap * lap;
                n += 1;
            }
        }
        return { luma: luma, sharp: n ? sharpSum / n : 0 };
    }

    function updateClientMeters() {
        var host = document.getElementById('ax-bl-crop-meters');
        if (!host || !state) return;
        var b = boxNatural();
        var faceShort = b ? Math.min(b.w, b.h) : 0;
        var exportShort = Math.max(faceShort, MIN_SHORT);
        var qs = lumaAndSharp(sampleCropImageData());
        var faceOk = faceShort >= MIN_FACE;
        var sizeOk = exportShort >= MIN_SHORT;
        var sharpOk = qs.sharp >= MIN_SHARP;
        var sharpWarn = !sharpOk && qs.sharp >= WARN_SHARP * 0.5;
        var lumaOk = qs.luma >= MIN_LUMA && qs.luma <= MAX_LUMA;
        state.clientOk = faceOk && sizeOk && sharpOk && lumaOk;
        host.innerHTML =
            meterRow(tr('analytics.bl.meterFace', 'Face frame (px)'), faceOk, false,
                faceShort + ' \u00B7 need ≥ ' + MIN_FACE) +
            meterRow(tr('analytics.bl.meterImage', 'Enroll image short side'), sizeOk, false,
                exportShort + ' \u00B7 need ≥ ' + MIN_SHORT) +
            meterRow(tr('analytics.bl.meterSharp', 'Sharpness (approx)'), sharpOk, sharpWarn,
                Math.round(qs.sharp) + ' \u00B7 hard fail < ' + MIN_SHARP) +
            meterRow(tr('analytics.bl.meterLuma', 'Lighting (approx)'), lumaOk, false,
                Math.round(qs.luma) + ' \u00B7 ok ' + MIN_LUMA + '\u2013' + MAX_LUMA) +
            '<p class="hint">' + esc(tr('analytics.bl.meterNote',
                'Approx meters are local. “Check with face service” uses the same gate as enroll.')) + '</p>';
        var useBtn = document.getElementById('ax-bl-crop-use');
        if (useBtn) useBtn.disabled = !faceOk || !sizeOk;
    }

    function fitCanvas() {
        if (!state || !state.img) return;
        var canvas = document.getElementById('ax-bl-crop-canvas');
        var wrap = canvas && canvas.parentElement;
        if (!canvas || !wrap) return;
        var maxW = Math.max(280, wrap.clientWidth || 480);
        var maxH = 420;
        var iw = state.img.naturalWidth;
        var ih = state.img.naturalHeight;
        var scale = Math.min(maxW / iw, maxH / ih, 1);
        state.scale = scale;
        canvas.width = Math.round(iw * scale);
        canvas.height = Math.round(ih * scale);
        draw();
    }

    function draw() {
        if (!state || !state.img) return;
        var canvas = document.getElementById('ax-bl-crop-canvas');
        if (!canvas) return;
        var ctx = canvas.getContext('2d');
        var s = state.scale || 1;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(state.img, 0, 0, canvas.width, canvas.height);
        var b = state.box;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        var x = b.x * s;
        var y = b.y * s;
        var w = b.w * s;
        var h = b.h * s;
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
        var canvas = document.getElementById('ax-bl-crop-canvas');
        if (!canvas || canvas.__cropBound) return;
        canvas.__cropBound = true;
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
            var minSide = 80;
            if (drag.mode === 'move') {
                b.x = Math.max(0, Math.min(iw - b.w, b0.x + dx));
                b.y = Math.max(0, Math.min(ih - b.h, b0.y + dy));
            } else {
                var aspect = 1;
                if (drag.mode === 'se') {
                    b.w = Math.max(minSide, b0.w + dx);
                    b.h = b.w / aspect;
                } else if (drag.mode === 'nw') {
                    var nw = Math.max(minSide, b0.w - dx);
                    var nh = nw / aspect;
                    b.x = b0.x + b0.w - nw;
                    b.y = b0.y + b0.h - nh;
                    b.w = nw;
                    b.h = nh;
                } else if (drag.mode === 'ne') {
                    b.w = Math.max(minSide, b0.w + dx);
                    b.h = b.w / aspect;
                    b.y = b0.y + b0.h - b.h;
                } else if (drag.mode === 'sw') {
                    b.w = Math.max(minSide, b0.w - dx);
                    b.h = b.w / aspect;
                    b.x = b0.x + b0.w - b.w;
                }
                if (b.x < 0) { b.w += b.x; b.x = 0; }
                if (b.y < 0) { b.h += b.y; b.y = 0; }
                if (b.x + b.w > iw) b.w = iw - b.x;
                if (b.y + b.h > ih) b.h = ih - b.y;
                b.w = Math.max(minSide, b.w);
                b.h = b.w;
                if (b.y + b.h > ih) { b.h = ih - b.y; b.w = b.h; }
                if (b.x + b.w > iw) { b.w = iw - b.x; b.h = b.w; }
            }
            state.box = b;
            draw();
            updateClientMeters();
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
        var faceW = b.w;
        var faceH = b.h;
        var outW = Math.max(faceW, MIN_SHORT);
        var outH = Math.max(faceH, MIN_SHORT);
        // Keep square canvas ≥ MIN_SHORT; center native crop (pad, do not upscale face).
        var side = Math.max(outW, outH, MIN_SHORT);
        var c = document.createElement('canvas');
        c.width = side;
        c.height = side;
        var ctx = c.getContext('2d');
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, side, side);
        var dx = Math.floor((side - faceW) / 2);
        var dy = Math.floor((side - faceH) / 2);
        ctx.drawImage(state.img, b.x, b.y, b.w, b.h, dx, dy, faceW, faceH);
        c.toBlob(function (blob) {
            if (!blob) {
                cb(null);
                return;
            }
            if (blob.size < 30000) {
                c.toBlob(function (blob2) { cb(blob2 || blob); }, 'image/jpeg', 0.98);
                return;
            }
            if (blob.size > 20 * 1024 * 1024) {
                c.toBlob(function (blob2) { cb(blob2); }, 'image/jpeg', 0.8);
                return;
            }
            cb(blob);
        }, 'image/jpeg', 0.92);
    }

    function runPreflight() {
        setStatus(tr('analytics.bl.cropChecking', 'Checking with face service\u2026'), '');
        exportBlob(function (blob) {
            if (!blob) {
                setStatus(tr('analytics.bl.cropExportFail', 'Could not build crop image.'), 'is-bad');
                return;
            }
            var fd = new FormData();
            fd.append('photo', blob, 'enroll-crop.jpg');
            fd.append('model', 'Facenet');
            fetch('/api/analytics/fr/enroll-preflight', { method: 'POST', credentials: 'same-origin', body: fd })
                .then(function (r) {
                    return r.json().then(function (j) { return { status: r.status, j: j }; });
                })
                .then(function (pack) {
                    var j = pack.j || {};
                    if (j.ok) {
                        var face = (j.faceWidth && j.faceHeight)
                            ? (' \u00B7 face ' + j.faceWidth + '\u00D7' + j.faceHeight)
                            : '';
                        setStatus(tr('analytics.bl.cropPass', 'Passes enroll checks.') + face, 'is-ok');
                        state.preflightOk = true;
                        return;
                    }
                    state.preflightOk = false;
                    var msg = j.code || 'fr.failed';
                    if (global.AnalyticsHub && typeof AnalyticsHub.messageForCode === 'function') {
                        msg = AnalyticsHub.messageForCode(j.code || 'fr.failed');
                    } else if (j.code === 'fr.face_too_small') {
                        msg = tr('analytics.bl.faceTooSmall', 'Face too small \u2014 enlarge the frame.');
                    } else if (j.code === 'fr.quality_blur') {
                        msg = tr('analytics.bl.qualityBlur', 'Too blurry.');
                    } else if (j.code === 'fr.quality_lighting') {
                        msg = tr('analytics.bl.qualityLighting', 'Lighting out of range.');
                    } else if (j.code === 'fr.multi_face' || j.code === 'fr.multiple_faces') {
                        msg = tr('analytics.bl.multiFace', 'More than one face \u2014 tighten the crop.');
                    } else if (j.code === 'fr.no_face') {
                        msg = tr('analytics.verify.noFace', 'No face found.');
                    } else if (j.code === 'fr.service_down') {
                        msg = tr('analytics.verify.serviceDown', 'Face matching is not available.');
                    }
                    setStatus(msg, 'is-bad');
                })
                .catch(function () {
                    state.preflightOk = false;
                    setStatus(tr('analytics.verify.network', 'Could not reach the server.'), 'is-bad');
                });
        });
    }

    function useCrop() {
        var b = boxNatural();
        if (!b || Math.min(b.w, b.h) < MIN_FACE) {
            setStatus(tr('analytics.bl.cropNeedFace', 'Enlarge the frame so the face area is at least 160 px.'), 'is-bad');
            return;
        }
        exportBlob(function (blob) {
            if (!blob) {
                setStatus(tr('analytics.bl.cropExportFail', 'Could not build crop image.'), 'is-bad');
                return;
            }
            var file = new File([blob], 'watchlist-enroll.jpg', { type: 'image/jpeg' });
            if (state && typeof state.onReady === 'function') {
                state.onReady(file, {
                    width: Math.max(b.w, MIN_SHORT),
                    height: Math.max(b.h, MIN_SHORT),
                    faceShort: Math.min(b.w, b.h),
                });
            }
            close();
        });
    }

    function close() {
        var el = document.getElementById('ax-bl-crop-modal');
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
            var side = Math.min(img.naturalWidth, img.naturalHeight);
            var boxSide = Math.max(120, Math.floor(side * 0.55));
            state = {
                img: img,
                objectUrl: url,
                onReady: onReady,
                scale: 1,
                preflightOk: false,
                box: {
                    x: Math.floor((img.naturalWidth - boxSide) / 2),
                    y: Math.floor((img.naturalHeight - boxSide) / 2),
                    w: boxSide,
                    h: boxSide,
                },
            };
            var modal = document.getElementById('ax-bl-crop-modal');
            modal.hidden = false;
            fitCanvas();
            updateClientMeters();
            setStatus(tr('analytics.bl.cropReady', 'Drag the frame onto the face, then Check or Use this crop.'), '');
            bindCanvasDrag();
        };
        img.onerror = function () {
            try { URL.revokeObjectURL(url); } catch (_) { /* ignore */ }
            if (typeof onReady === 'function') onReady(null);
        };
        img.src = url;
    }

    global.FrEnrollCropper = {
        open: open,
        close: close,
        MIN_FACE: MIN_FACE,
        MIN_SHORT: MIN_SHORT,
    };
})(window);
