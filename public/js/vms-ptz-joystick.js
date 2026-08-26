/**
 * VMS-PTZ-JOYSTICK-CORE-V1 - shared Camera Control pad.
 * Hosts call setTarget(); moves hit POST /api/fixed-cams/:id/ptz only.
 */
(function (global) {
    'use strict';

    function isPtzLicensed() {
        try {
            if (global.LicenseEntitlementsUi && typeof global.LicenseEntitlementsUi.hasFeature === 'function') {
                return !!global.LicenseEntitlementsUi.hasFeature('ptzControl');
            }
        } catch (_) { /* ignore */ }
        /* Investigation / hosts without entitlements UI - keep prior behavior; API still gates. */
        return true;
    }

    function VmsPtzJoystick(container, options, callbacks) {
        if (!container) throw new Error('VmsPtzJoystick requires a container');
        this._root = container;
        this._opts = options || {};
        this._cb = callbacks || {};
        this._camId = null;
        this._hasPtz = false;
        this._label = '';
        this._bound = false;
        this._dragging = false;
        this._ox = 0;
        this._oy = 0;
        this._renderShell();
        this._bind();
        this._refreshUi();
    }

    VmsPtzJoystick.prototype._el = function (sel) {
        return this._root.querySelector(sel);
    };

    VmsPtzJoystick.prototype._renderShell = function () {
        var showNumpad = !!this._opts.showNumpad;
        var isFloating = !!this._opts.isFloating;
        var compact = !!this._opts.compact;
        var p = this._opts.classPrefix != null ? String(this._opts.classPrefix) : 'cw-';
        this._prefix = p;
        this._root.classList.add(p + 'ptz-panel');
        if (isFloating) this._root.classList.add('is-inv-hud');
        if (!this._root.id && isFloating) this._root.id = 'inv-ptz-hud';

        var html = '';
        if (!compact) {
            html +=
                '<div class="' + p + 'ptz-title' + (isFloating ? ' inv-ptz-drag' : '') + '" data-ptz-drag="1">Camera Control</div>' +
                '<div class="' + p + 'ptz-camera" data-ptz-cam="1">-</div>';
        } else {
            html += '<div class="' + p + 'ptz-camera" data-ptz-cam="1" hidden>-</div>';
            this._root.classList.add('is-compact-row');
        }
        if (compact) {
            /* Zoom out | D-pad | Zoom in — no clip under the cross */
            html +=
                '<div class="' + p + 'ptz-compact-row">' +
                '<button type="button" data-ptz="zoom-out" aria-label="Zoom out">-</button>' +
                '<div class="' + p + 'ptz-pad">' +
                '<button type="button" data-ptz="up" aria-label="Tilt up">&#9650;</button>' +
                '<button type="button" data-ptz="left" aria-label="Pan left">&#9664;</button>' +
                '<button type="button" data-ptz="home" aria-label="Home">&#9679;</button>' +
                '<button type="button" data-ptz="right" aria-label="Pan right">&#9654;</button>' +
                '<button type="button" data-ptz="down" aria-label="Tilt down">&#9660;</button>' +
                '</div>' +
                '<button type="button" data-ptz="zoom-in" aria-label="Zoom in">+</button>' +
                '</div>';
        } else {
            html +=
                '<div class="' + p + 'ptz-pad">' +
                '<button type="button" data-ptz="up" aria-label="Tilt up">&#9650;</button>' +
                '<button type="button" data-ptz="left" aria-label="Pan left">&#9664;</button>' +
                '<button type="button" data-ptz="home" aria-label="Home">&#9679;</button>' +
                '<button type="button" data-ptz="right" aria-label="Pan right">&#9654;</button>' +
                '<button type="button" data-ptz="down" aria-label="Tilt down">&#9660;</button>' +
                '</div>' +
                '<div class="' + p + 'ptz-zoom">' +
                '<button type="button" data-ptz="zoom-out">- Zoom</button>' +
                '<button type="button" data-ptz="zoom-in">+ Zoom</button>' +
                '</div>';
        }
        if (showNumpad) {
            html +=
                '<div class="' + p + 'ptz-zoom inv-ptz-numpad" role="group" aria-label="Fast Swap">' +
                '<button type="button" data-ptz-num="1">1</button>' +
                '<button type="button" data-ptz-num="2">2</button>' +
                '<button type="button" data-ptz-num="3">3</button>' +
                '<button type="button" data-ptz-num="4">4</button>' +
                '<button type="button" data-ptz-num="5">5</button>' +
                '<button type="button" data-ptz-num="6">6</button>' +
                '</div>';
        }
        html += '<div class="' + p + 'ptz-status" data-ptz-status="1"></div>';
        this._root.innerHTML = html;
    };

    VmsPtzJoystick.prototype._bind = function () {
        if (this._bound) return;
        this._bound = true;
        var self = this;
        var root = this._root;

        root.querySelectorAll('[data-ptz]').forEach(function (btn) {
            var action = btn.getAttribute('data-ptz');
            if (action === 'home') {
                btn.addEventListener('click', function () { self._send('home'); });
                return;
            }
            btn.addEventListener('mousedown', function (ev) {
                ev.preventDefault();
                self._send(action);
            });
            btn.addEventListener('mouseup', function () { self._send('stop'); });
            btn.addEventListener('mouseleave', function () { self._send('stop'); });
            btn.addEventListener('touchstart', function (ev) {
                ev.preventDefault();
                self._send(action);
            }, { passive: false });
            btn.addEventListener('touchend', function () { self._send('stop'); });
        });

        root.querySelectorAll('[data-ptz-num]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var n = Number(btn.getAttribute('data-ptz-num'));
                if (typeof self._cb.onNumpadClick === 'function') {
                    try { self._cb.onNumpadClick(n); } catch (_) { /* host */ }
                }
            });
        });

        if (this._opts.isFloating) {
            var handle = this._el('[data-ptz-drag]') || root;
            handle.addEventListener('mousedown', function (ev) {
                if (ev.target && ev.target.closest('button')) return;
                self._dragging = true;
                var rect = root.getBoundingClientRect();
                self._ox = ev.clientX - rect.left;
                self._oy = ev.clientY - rect.top;
                ev.preventDefault();
            });
            document.addEventListener('mousemove', function (ev) {
                if (!self._dragging) return;
                root.style.left = Math.max(8, ev.clientX - self._ox) + 'px';
                root.style.top = Math.max(8, ev.clientY - self._oy) + 'px';
                root.style.right = 'auto';
                root.style.bottom = 'auto';
            });
            document.addEventListener('mouseup', function () { self._dragging = false; });
        }
    };

    VmsPtzJoystick.prototype._canMove = function () {
        return !!(isPtzLicensed() && this._camId && this._hasPtz);
    };

    VmsPtzJoystick.prototype._refreshUi = function () {
        var camEl = this._el('[data-ptz-cam]');
        var status = this._el('[data-ptz-status]');
        var licensed = isPtzLicensed();
        var label = this._label || (this._camId ? 'Camera' : 'Empty');
        if (camEl) camEl.textContent = label;

        var dead = !this._canMove();
        this._root.querySelectorAll('[data-ptz]').forEach(function (btn) {
            btn.disabled = dead;
        });

        if (status) {
            if (!licensed) status.textContent = 'PTZ Disabled';
            else if (!this._camId) status.textContent = 'Empty';
            else if (!this._hasPtz) status.textContent = 'Fixed Camera';
            else status.textContent = 'Ready';
        }
    };

    VmsPtzJoystick.prototype._send = function (action) {
        if (!this._canMove()) return;
        var id = String(this._camId || '').trim();
        if (!id) return;
        if (action && action !== 'stop' && typeof this._cb.onMove === 'function') {
            try { this._cb.onMove(action); } catch (_) { /* host */ }
        }
        fetch('/api/fixed-cams/' + encodeURIComponent(id) + '/ptz', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: action }),
        }).catch(function () { /* ignore */ });
    };

    /**
     * @param {string|null} camId
     * @param {{ hasPtz?: boolean, label?: string }} meta
     */
    VmsPtzJoystick.prototype.setTarget = function (camId, meta) {
        meta = meta || {};
        this._camId = camId ? String(camId).trim() : null;
        this._hasPtz = !!(meta.hasPtz);
        this._label = meta.label != null ? String(meta.label) : '';
        this._refreshUi();
    };

    VmsPtzJoystick.prototype.setVisible = function (on) {
        this._root.hidden = !on;
        if (on && this._opts.isFloating && !this._root.style.left && !this._root.style.top) {
            this._root.style.right = '16px';
            this._root.style.bottom = '16px';
        }
    };

    VmsPtzJoystick.prototype.getRoot = function () {
        return this._root;
    };

    function create(container, options, callbacks) {
        return new VmsPtzJoystick(container, options, callbacks);
    }

    global.VmsPtzJoystick = {
        create: create,
        isPtzLicensed: isPtzLicensed,
    };
})(window);
