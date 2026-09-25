/**
 * VMS-PTZ-PRO-CONTROL-V1 — virtual stick (click knob + drag) + chrome min/close.
 * Hosts call setTarget(); moves hit POST /api/fixed-cams/:id/ptz (internal mock flag when enabled).
 */
(function (global) {
    'use strict';

    var _labMockCached = null;
    var _labMockPromise = null;

    function isPtzLicensed() {
        try {
            if (global.LicenseEntitlementsUi && typeof global.LicenseEntitlementsUi.hasFeature === 'function') {
                return !!global.LicenseEntitlementsUi.hasFeature('ptzControl');
            }
        } catch (_) { /* ignore */ }
        return true;
    }

    function fetchLabMockFlag() {
        if (_labMockCached !== null) return Promise.resolve(_labMockCached);
        if (_labMockPromise) return _labMockPromise;
        _labMockPromise = fetch('/api/ptz/ui-flags', { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (j) {
                _labMockCached = !!(j && j.ok && j.labMock);
                return _labMockCached;
            })
            .catch(function () {
                _labMockCached = false;
                return false;
            });
        return _labMockPromise;
    }

    /** Screen dx/dy (y down) → ONVIF-ish 8-way action + speed 0.1–0.8 */
    function stickToMove(dx, dy, maxR) {
        var mag = Math.sqrt(dx * dx + dy * dy) / Math.max(1, maxR);
        if (mag < 0.18) return { action: 'stop', speed: 0 };
        mag = Math.min(1, mag);
        var ptzX = dx / maxR;
        var ptzY = -dy / maxR;
        var ang = Math.atan2(ptzY, ptzX);
        var step = Math.PI / 8;
        var action = 'right';
        if (ang >= -step && ang < step) action = 'right';
        else if (ang >= step && ang < 3 * step) action = 'up-right';
        else if (ang >= 3 * step && ang < 5 * step) action = 'up';
        else if (ang >= 5 * step && ang < 7 * step) action = 'up-left';
        else if (ang >= 7 * step || ang < -7 * step) action = 'left';
        else if (ang >= -7 * step && ang < -5 * step) action = 'down-left';
        else if (ang >= -5 * step && ang < -3 * step) action = 'down';
        else action = 'down-right';
        return { action: action, speed: 0.1 + mag * 0.7 };
    }

    /** Map-relative: rotate stick so screen-up = map north given current heading. */
    function remapStickMapRelative(dx, dy, headingDeg) {
        var h = (Number(headingDeg) * Math.PI) / 180;
        if (!isFinite(h)) return { dx: dx, dy: dy };
        var cos = Math.cos(h);
        var sin = Math.sin(h);
        /* camera-right = east*cos + south*sin ; camera-forward → screen-up flips */
        var camRight = dx * cos + dy * sin;
        var camFwd = dx * sin - dy * cos;
        return { dx: camRight, dy: -camFwd };
    }

    function headingLabel(deg, cardinal) {
        if (!isFinite(Number(deg))) return '';
        var c = cardinal || '';
        var n = Math.round(Number(deg));
        return c ? ('Facing ' + n + '\u00B0 ' + c) : ('Facing ' + n + '\u00B0');
    }

    var PAD_VEC = {
        up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0],
        'up-left': [-1, -1], 'up-right': [1, -1],
        'down-left': [-1, 1], 'down-right': [1, 1],
    };

    function remapPadAction(action, headingDeg) {
        var v = PAD_VEC[action];
        if (!v || !isFinite(Number(headingDeg))) return action;
        var rem = remapStickMapRelative(v[0], v[1], headingDeg);
        var move = stickToMove(rem.dx, rem.dy, 1);
        return move.action === 'stop' ? action : move.action;
    }

    function pushMapHeading(camId, headingDeg) {
        if (!camId || !isFinite(Number(headingDeg))) return;
        try {
            if (typeof global.applyFixedCameraMapHeading === 'function') {
                global.applyFixedCameraMapHeading(String(camId), Number(headingDeg));
            }
        } catch (_) { /* host */ }
    }

    function VmsPtzJoystick(container, options, callbacks) {
        if (!container) throw new Error('VmsPtzJoystick requires a container');
        this._root = container;
        this._opts = options || {};
        this._cb = callbacks || {};
        this._camId = null;
        this._hasPtz = false;
        this._labMock = !!this._opts.labMock;
        this._label = '';
        this._speed = 0.45;
        this._bound = false;
        this._panelDragging = false;
        this._panelPointerId = null;
        this._stickDragging = false;
        this._ox = 0;
        this._oy = 0;
        this._lastStickAction = '';
        this._stickTimer = null;
        this._minimized = false;
        this._tab = 'digi';
        this._digiLevel = 1;
        this._ptzTabEnabled = true;
        this._headingDeg = null;
        this._cardinal = '';
        this._statusPollTimer = null;
        this._mapRelative = true;
        this._calibrateMode = false;
        this._undoNorth = null;
        this._undoTimer = null;
        this._renderShell();
        this._bind();
        this._refreshUi();
        var self = this;
        fetchLabMockFlag().then(function (on) {
            if (on) self._labMock = true;
            self._refreshUi();
            if (typeof self._cb.onLabMock === 'function') {
                try { self._cb.onLabMock(!!on); } catch (_) { /* host */ }
            }
        });
    }

    VmsPtzJoystick.prototype._el = function (sel) {
        return this._root.querySelector(sel);
    };

    VmsPtzJoystick.prototype._renderShell = function () {
        var showNumpad = !!this._opts.showNumpad;
        var isFloating = !!this._opts.isFloating;
        var compact = !!this._opts.compact;
        var proChrome = this._opts.proChrome !== false;
        var p = this._opts.classPrefix != null ? String(this._opts.classPrefix) : 'cw-';
        this._prefix = p;
        this._root.classList.add(p + 'ptz-panel');
        if (proChrome) this._root.classList.add('is-pro', 'is-pro-v2', 'is-stick');
        if (isFloating) this._root.classList.add('is-inv-hud');
        if (!this._root.id && isFloating) this._root.id = 'inv-ptz-hud';

        var html = '';
        if (!compact) {
            html +=
                '<div class="' + p + 'ptz-chrome pin-drag-handle" data-ptz-drag="1" title="Drag panel">' +
                '<div class="' + p + 'ptz-title' + (isFloating ? ' inv-ptz-drag' : '') + '">Camera Control</div>' +
                '<div class="' + p + 'ptz-chrome-actions">' +
                '<button type="button" class="' + p + 'ptz-win-btn" data-ptz-min="1" title="Minimize" aria-label="Minimize">−</button>' +
                '<button type="button" class="' + p + 'ptz-win-btn" data-ptz-close="1" title="Close" aria-label="Close">×</button>' +
                '</div></div>' +
                '<div class="' + p + 'ptz-body" data-ptz-body="1">' +
                '<div class="' + p + 'ptz-tabs" role="tablist">' +
                '<button type="button" class="' + p + 'ptz-tab is-active" data-ptz-tab="digi" role="tab" aria-selected="true">Digi PTZ</button>' +
                '<button type="button" class="' + p + 'ptz-tab" data-ptz-tab="ptz" role="tab" aria-selected="false">PTZ</button>' +
                '</div>' +
                '<div class="' + p + 'ptz-camera" data-ptz-cam="1">-</div>' +
                '<div class="' + p + 'ptz-pane" data-ptz-pane="digi">' +
                '<div class="' + p + 'ptz-digi-row">' +
                '<button type="button" data-digi="out" aria-label="Digital zoom out">−</button>' +
                '<span class="' + p + 'ptz-digi-level" data-digi-level="1">1.0×</span>' +
                '<button type="button" data-digi="in" aria-label="Digital zoom in">+</button>' +
                '<button type="button" data-digi="reset" class="' + p + 'ptz-digi-reset">Reset</button>' +
                '</div>' +
                '<div class="' + p + 'ptz-digi-hint">Wheel on the picture to zoom · drag to pan · all cameras</div>' +
                '</div>' +
                '<div class="' + p + 'ptz-pane" data-ptz-pane="ptz" hidden>' +
                '<div class="' + p + 'ptz-set-north" data-ptz-set-north-wrap="1" hidden>' +
                '<button type="button" class="' + p + 'ptz-set-north-btn" data-ptz-set-north="1">Set North</button>' +
                '<p class="' + p + 'ptz-set-north-hint">Pan so the view faces north, then set.</p>' +
                '</div>';
        } else {
            html += '<div class="' + p + 'ptz-camera" data-ptz-cam="1" hidden>-</div>';
            this._root.classList.add('is-compact-row');
        }

        if (compact) {
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
                '<div class="' + p + 'ptz-pro-body">' +
                '<div class="' + p + 'ptz-stick" data-ptz-stick="1" role="application" aria-label="PTZ stick — press and drag">' +
                '<div class="' + p + 'ptz-stick-ring"></div>' +
                '<div class="' + p + 'ptz-stick-knob" data-ptz-knob="1"></div>' +
                '</div>' +
                '<div class="' + p + 'ptz-pro-side">' +
                '<button type="button" data-ptz="home" class="' + p + 'ptz-home-btn" title="Home">Home</button>' +
                '<div class="' + p + 'ptz-zoom">' +
                '<button type="button" data-ptz="zoom-out" aria-label="Zoom out">−</button>' +
                '<button type="button" data-ptz="zoom-in" aria-label="Zoom in">+</button>' +
                '</div>' +
                '</div>' +
                '</div>' +
                '<div class="' + p + 'ptz-presets" role="group" aria-label="Presets">' +
                '<span class="' + p + 'ptz-presets-label">Presets</span>' +
                '<div class="' + p + 'ptz-presets-grid">' +
                '<button type="button" data-ptz-preset="1">1</button>' +
                '<button type="button" data-ptz-preset="2">2</button>' +
                '<button type="button" data-ptz-preset="3">3</button>' +
                '<button type="button" data-ptz-preset="4">4</button>' +
                '<button type="button" data-ptz-preset="5">5</button>' +
                '<button type="button" data-ptz-preset="6">6</button>' +
                '<button type="button" data-ptz-preset="7">7</button>' +
                '<button type="button" data-ptz-preset="8">8</button>' +
                '</div></div>' +
                '<div class="' + p + 'ptz-status" data-ptz-status="1"></div>' +
                '</div>' + /* ptz pane */
                '</div>'; /* body */
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
        if (compact) {
            html += '<div class="' + p + 'ptz-status" data-ptz-status="1"></div>';
        }
        this._root.innerHTML = html;
    };

    VmsPtzJoystick.prototype._resetKnob = function () {
        var knob = this._el('[data-ptz-knob]');
        if (knob) {
            knob.style.transform = 'translate(-50%, -50%)';
            knob.style.left = '50%';
            knob.style.top = '50%';
        }
    };

    VmsPtzJoystick.prototype._applyStickPointer = function (clientX, clientY) {
        var stick = this._el('[data-ptz-stick]');
        var knob = this._el('[data-ptz-knob]');
        if (!stick || !knob) return;
        var rect = stick.getBoundingClientRect();
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + rect.height / 2;
        var maxR = Math.min(rect.width, rect.height) * 0.38;
        var dx = clientX - cx;
        var dy = clientY - cy;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > maxR && dist > 0) {
            dx = (dx / dist) * maxR;
            dy = (dy / dist) * maxR;
        }
        knob.style.left = '50%';
        knob.style.top = '50%';
        knob.style.transform = 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px))';

        var rdx = dx;
        var rdy = dy;
        if (this._mapRelative && isFinite(Number(this._headingDeg))) {
            var rem = remapStickMapRelative(dx, dy, this._headingDeg);
            rdx = rem.dx;
            rdy = rem.dy;
        }
        var move = stickToMove(rdx, rdy, maxR);
        this._speed = move.speed || 0.45;
        if (move.action === 'stop') {
            if (this._lastStickAction && this._lastStickAction !== 'stop') {
                this._send('stop');
                this._lastStickAction = 'stop';
            }
            return;
        }
        if (move.action !== this._lastStickAction) {
            this._lastStickAction = move.action;
            this._send(move.action);
        } else {
            this._send(move.action);
        }
    };

    VmsPtzJoystick.prototype._bind = function () {
        if (this._bound) return;
        this._bound = true;
        var self = this;
        var root = this._root;
        var p = this._prefix;

        root.querySelectorAll('[data-ptz]').forEach(function (btn) {
            var action = btn.getAttribute('data-ptz');
            if (action === 'home') {
                btn.addEventListener('click', function (ev) {
                    ev.stopPropagation();
                    self._send('home');
                });
                return;
            }
            btn.addEventListener('mousedown', function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                self._send(action);
            });
            btn.addEventListener('mouseup', function (ev) {
                ev.stopPropagation();
                self._send('stop');
            });
            btn.addEventListener('mouseleave', function () { self._send('stop'); });
            btn.addEventListener('touchstart', function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                self._send(action);
            }, { passive: false });
            btn.addEventListener('touchend', function () { self._send('stop'); });
        });

        root.querySelectorAll('[data-ptz-preset]').forEach(function (btn) {
            btn.addEventListener('click', function (ev) {
                ev.stopPropagation();
                var n = String(btn.getAttribute('data-ptz-preset') || '').trim();
                if (!n) return;
                self._send('goto-preset', { presetToken: n });
            });
            btn.addEventListener('mousedown', function (ev) { ev.stopPropagation(); });
        });

        var setNorthBtn = this._el('[data-ptz-set-north]');
        if (setNorthBtn) {
            setNorthBtn.addEventListener('click', function (ev) {
                ev.stopPropagation();
                self._onSetNorthClick();
            });
            setNorthBtn.addEventListener('mousedown', function (ev) { ev.stopPropagation(); });
        }

        root.querySelectorAll('[data-ptz-num]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var n = Number(btn.getAttribute('data-ptz-num'));
                if (typeof self._cb.onNumpadClick === 'function') {
                    try { self._cb.onNumpadClick(n); } catch (_) { /* host */ }
                }
            });
        });

        var minBtn = this._el('[data-ptz-min]');
        if (minBtn) {
            minBtn.addEventListener('click', function (ev) {
                ev.stopPropagation();
                self.setMinimized(!self._minimized);
                if (typeof self._cb.onMinimize === 'function') {
                    try { self._cb.onMinimize(self._minimized); } catch (_) { /* host */ }
                }
            });
        }
        var closeBtn = this._el('[data-ptz-close]');
        if (closeBtn) {
            closeBtn.addEventListener('click', function (ev) {
                ev.stopPropagation();
                self.setVisible(false);
                if (typeof self._cb.onClose === 'function') {
                    try { self._cb.onClose(); } catch (_) { /* host */ }
                }
            });
        }

        /* VMS-DIGI-ZOOM-TAB-V1 */
        root.querySelectorAll('[data-ptz-tab]').forEach(function (btn) {
            btn.addEventListener('click', function (ev) {
                ev.stopPropagation();
                var tab = btn.getAttribute('data-ptz-tab');
                if (tab === 'ptz' && !self._ptzTabEnabled) return;
                self.setTab(tab);
            });
        });
        root.querySelectorAll('[data-digi]').forEach(function (btn) {
            btn.addEventListener('click', function (ev) {
                ev.stopPropagation();
                var act = btn.getAttribute('data-digi');
                var steps = [1, 1.5, 2, 3, 4, 6, 8];
                var idx = steps.indexOf(self._digiLevel);
                if (idx < 0) idx = 0;
                var next = self._digiLevel;
                if (act === 'in') next = steps[Math.min(steps.length - 1, idx + 1)];
                else if (act === 'out') next = steps[Math.max(0, idx - 1)];
                else if (act === 'reset') next = 1;
                self.setDigiLevel(next, true);
            });
        });

        /* Virtual stick: press on ring/knob and drag */
        var stick = this._el('[data-ptz-stick]');
        if (stick) {
            var onDown = function (clientX, clientY, ev) {
                if (!self._canMove()) return;
                self._stickDragging = true;
                self._panelDragging = false;
                self._lastStickAction = '';
                stick.classList.add('is-active');
                self._applyStickPointer(clientX, clientY);
                if (ev) ev.preventDefault();
            };
            stick.addEventListener('mousedown', function (ev) {
                ev.stopPropagation();
                onDown(ev.clientX, ev.clientY, ev);
            });
            stick.addEventListener('touchstart', function (ev) {
                ev.stopPropagation();
                var t = ev.touches && ev.touches[0];
                if (!t) return;
                onDown(t.clientX, t.clientY, ev);
            }, { passive: false });
        }

        function placeFloatingPanel(left, top) {
            var w = root.offsetWidth || 220;
            var h = root.offsetHeight || 80;
            var maxL = Math.max(8, window.innerWidth - w - 8);
            var maxT = Math.max(8, window.innerHeight - h - 8);
            left = Math.max(8, Math.min(maxL, left));
            top = Math.max(8, Math.min(maxT, top));
            root.style.left = left + 'px';
            root.style.top = top + 'px';
            root.style.right = 'auto';
            root.style.bottom = 'auto';
            root.style.transform = 'none';
        }

        function endPanelDrag() {
            if (!self._panelDragging) return;
            self._panelDragging = false;
            self._panelPointerId = null;
            root.classList.remove('is-dragging');
            document.body.classList.remove('cw-ptz-panel-dragging');
            document.removeEventListener('selectstart', self._blockSelect);
            document.removeEventListener('dragstart', self._blockSelect);
            document.removeEventListener('pointermove', self._onPanelMove);
            document.removeEventListener('pointerup', self._onPanelUp);
            document.removeEventListener('pointercancel', self._onPanelUp);
        }

        self._blockSelect = function (blockEv) { blockEv.preventDefault(); };
        self._onPanelMove = function (ev) {
            if (!self._panelDragging) return;
            if (self._panelPointerId != null && ev.pointerId !== self._panelPointerId) return;
            /* Delta from grab point — panel stays under the finger/cursor (Ops pin style) */
            placeFloatingPanel(
                self._dragStartLeft + (ev.clientX - self._dragStartX),
                self._dragStartTop + (ev.clientY - self._dragStartY)
            );
            if (ev.cancelable) ev.preventDefault();
        };
        self._onPanelUp = function (ev) {
            if (self._panelPointerId != null && ev.pointerId !== self._panelPointerId) return;
            if (handle && handle.releasePointerCapture && self._panelPointerId != null) {
                try { handle.releasePointerCapture(self._panelPointerId); } catch (_) { /* already up */ }
            }
            endPanelDrag();
        };

        document.addEventListener('mousemove', function (ev) {
            if (self._stickDragging) {
                self._applyStickPointer(ev.clientX, ev.clientY);
            }
        });
        document.addEventListener('touchmove', function (ev) {
            if (!self._stickDragging) return;
            var t = ev.touches && ev.touches[0];
            if (!t) return;
            self._applyStickPointer(t.clientX, t.clientY);
            ev.preventDefault();
        }, { passive: false });
        document.addEventListener('mouseup', function () {
            if (self._stickDragging) {
                self._stickDragging = false;
                self._lastStickAction = '';
                self._send('stop');
                self._resetKnob();
                var st = self._el('[data-ptz-stick]');
                if (st) st.classList.remove('is-active');
            }
        });
        document.addEventListener('touchend', function () {
            if (!self._stickDragging) return;
            self._stickDragging = false;
            self._lastStickAction = '';
            self._send('stop');
            self._resetKnob();
            var st = self._el('[data-ptz-stick]');
            if (st) st.classList.remove('is-active');
        });

        /* Panel move — same feel as Ops stacked pin */
        var handle = null;
        if (this._opts.isFloating) {
            handle = this._el('[data-ptz-drag]');
            if (handle) {
                handle.addEventListener('pointerdown', function (ev) {
                    if (ev.button !== 0) return;
                    if (ev.target && ev.target.closest('button')) return;
                    self._stickDragging = false;
                    var rect = root.getBoundingClientRect();
                    /* Lock to viewport left/top NOW so mouse and panel share one coordinate space */
                    placeFloatingPanel(rect.left, rect.top);
                    rect = root.getBoundingClientRect();
                    self._dragStartX = ev.clientX;
                    self._dragStartY = ev.clientY;
                    self._dragStartLeft = rect.left;
                    self._dragStartTop = rect.top;
                    self._panelDragging = true;
                    self._panelPointerId = ev.pointerId;
                    root.classList.add('is-dragging');
                    document.body.classList.add('cw-ptz-panel-dragging');
                    document.addEventListener('selectstart', self._blockSelect);
                    document.addEventListener('dragstart', self._blockSelect);
                    document.addEventListener('pointermove', self._onPanelMove, { passive: false });
                    document.addEventListener('pointerup', self._onPanelUp);
                    document.addEventListener('pointercancel', self._onPanelUp);
                    if (handle.setPointerCapture) {
                        try { handle.setPointerCapture(ev.pointerId); } catch (_) { /* best-effort */ }
                    }
                    ev.preventDefault();
                    ev.stopPropagation();
                });
            }
        }
    };

    VmsPtzJoystick.prototype._canMove = function () {
        return !!(isPtzLicensed() && this._camId && (this._hasPtz || this._labMock));
    };

    VmsPtzJoystick.prototype._refreshUi = function () {
        var camEl = this._el('[data-ptz-cam]');
        var status = this._el('[data-ptz-status]');
        var licensed = isPtzLicensed();
        var label = this._label || (this._camId ? 'Camera' : 'Empty');
        if (camEl) camEl.textContent = label;

        var dead = !this._canMove();
        this._root.querySelectorAll('[data-ptz], [data-ptz-preset]').forEach(function (btn) {
            btn.disabled = dead;
        });
        var stick = this._el('[data-ptz-stick]');
        if (stick) stick.classList.toggle('is-disabled', dead);

        if (status) {
            if (!licensed) status.textContent = 'PTZ Disabled';
            else if (!this._camId) status.textContent = 'Empty';
            else if (this._labMock && !this._hasPtz) status.textContent = '';
            else if (!this._hasPtz) status.textContent = 'No PTZ';
            else if (isFinite(Number(this._headingDeg))) {
                status.textContent = headingLabel(this._headingDeg, this._cardinal);
            }
            else status.textContent = '';
        }
        var northWrap = this._el('[data-ptz-set-north-wrap]');
        if (northWrap) northWrap.hidden = !(this._calibrateMode && this._canMove());
    };

    VmsPtzJoystick.prototype.setCalibrateMode = function (on) {
        this._calibrateMode = !!on;
        this._root.classList.toggle('is-calibrate-north', this._calibrateMode);
        if (!this._calibrateMode) {
            this._undoNorth = null;
            if (this._undoTimer) {
                clearTimeout(this._undoTimer);
                this._undoTimer = null;
            }
        }
        this._refreshUi();
        if (this._calibrateMode && this._tab !== 'ptz') this.setTab('ptz');
        else if (this._calibrateMode) this._startStatusPoll();
    };

    VmsPtzJoystick.prototype.setNorth = function () {
        this._onSetNorthClick();
    };

    VmsPtzJoystick.prototype._onSetNorthClick = function () {
        var self = this;
        if (!this._calibrateMode || !this._canMove() || !this._camId) return;
        if (!window.confirm('Save current view as north for this camera?')) return;
        var id = String(this._camId);
        fetch('/api/fixed-cams/' + encodeURIComponent(id) + '/ptz/set-north', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: '{}',
        })
            .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
            .then(function (pack) {
                var j = pack.j || {};
                if (!pack.ok || !j.ok) {
                    if (typeof self._cb.onCalibrateMsg === 'function') {
                        try { self._cb.onCalibrateMsg('Could not save north.', true); } catch (_) { /* host */ }
                    }
                    return;
                }
                self._headingDeg = Number(j.headingDeg);
                self._cardinal = j.cardinal ? String(j.cardinal) : 'N';
                self._undoNorth = {
                    camId: id,
                    previousNorthOffsetDeg: Number(j.previousNorthOffsetDeg),
                };
                pushMapHeading(id, self._headingDeg);
                self._refreshUi();
                if (typeof self._cb.onCalibrateMsg === 'function') {
                    try {
                        self._cb.onCalibrateMsg('North saved.', false, {
                            undo: function () { self._undoSetNorth(); },
                        });
                    } catch (_) { /* host */ }
                }
                if (self._undoTimer) clearTimeout(self._undoTimer);
                self._undoTimer = setTimeout(function () {
                    self._undoNorth = null;
                    self._undoTimer = null;
                }, 8000);
                self._pollStatusOnce();
            })
            .catch(function () {
                if (typeof self._cb.onCalibrateMsg === 'function') {
                    try { self._cb.onCalibrateMsg('Could not save north.', true); } catch (_) { /* host */ }
                }
            });
    };

    VmsPtzJoystick.prototype._undoSetNorth = function () {
        var self = this;
        var u = this._undoNorth;
        if (!u || !u.camId) return;
        var prev = Number(u.previousNorthOffsetDeg);
        if (!Number.isFinite(prev)) prev = 0;
        fetch('/api/fixed-cams/' + encodeURIComponent(u.camId), {
            method: 'PUT',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ northOffsetDeg: prev }),
        })
            .then(function (r) { return r.json(); })
            .then(function (j) {
                self._undoNorth = null;
                if (self._undoTimer) {
                    clearTimeout(self._undoTimer);
                    self._undoTimer = null;
                }
                if (j && j.ok) {
                    self._pollStatusOnce();
                    if (typeof self._cb.onCalibrateMsg === 'function') {
                        try { self._cb.onCalibrateMsg('North restore undone.', false); } catch (_) { /* host */ }
                    }
                }
            })
            .catch(function () { /* ignore */ });
    };

    VmsPtzJoystick.prototype.undoSetNorth = function () {
        this._undoSetNorth();
    };

    VmsPtzJoystick.prototype._stopStatusPoll = function () {
        if (this._statusPollTimer) {
            clearInterval(this._statusPollTimer);
            this._statusPollTimer = null;
        }
    };

    VmsPtzJoystick.prototype._pollStatusOnce = function () {
        var self = this;
        if (!this._camId || !this._canMove()) return;
        fetch('/api/fixed-cams/' + encodeURIComponent(this._camId) + '/ptz/status', {
            credentials: 'same-origin',
        })
            .then(function (r) { return r.json(); })
            .then(function (j) {
                if (!j || !j.ok || String(self._camId) !== String(j.cameraId || self._camId)) return;
                self._headingDeg = Number(j.headingDeg);
                self._cardinal = j.cardinal ? String(j.cardinal) : '';
                pushMapHeading(self._camId, self._headingDeg);
                self._refreshUi();
            })
            .catch(function () { /* ignore */ });
    };

    VmsPtzJoystick.prototype._startStatusPoll = function () {
        this._stopStatusPoll();
        if (!this._camId || !this._canMove()) return;
        this._pollStatusOnce();
        var self = this;
        this._statusPollTimer = setInterval(function () {
            if (!self._camId || self._root.hidden || self._tab !== 'ptz') return;
            self._pollStatusOnce();
        }, 900);
    };

    VmsPtzJoystick.prototype._send = function (action, extra) {
        if (!this._canMove() && action !== 'stop') return;
        if (!this._camId) return;
        var id = String(this._camId || '').trim();
        if (!id) return;
        var self = this;
        if (this._mapRelative && PAD_VEC[action] && isFinite(Number(this._headingDeg)) && !this._stickDragging) {
            action = remapPadAction(action, this._headingDeg);
        }
        if (action && action !== 'stop' && typeof this._cb.onMove === 'function') {
            try { this._cb.onMove(action, extra); } catch (_) { /* host */ }
        }
        var body = { action: action, speed: this._speed };
        if (extra && typeof extra === 'object') {
            Object.keys(extra).forEach(function (k) { body[k] = extra[k]; });
        }
        fetch('/api/fixed-cams/' + encodeURIComponent(id) + '/ptz', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        }).then(function () {
            if (action !== 'stop') self._pollStatusOnce();
        }).catch(function () { /* ignore */ });
    };

    VmsPtzJoystick.prototype.setTab = function (tab) {
        tab = tab === 'ptz' ? 'ptz' : 'digi';
        if (tab === 'ptz' && !this._ptzTabEnabled) tab = 'digi';
        var changed = this._tab !== tab;
        this._tab = tab;
        this._root.querySelectorAll('[data-ptz-tab]').forEach(function (btn) {
            var on = btn.getAttribute('data-ptz-tab') === tab;
            btn.classList.toggle('is-active', on);
            btn.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        this._root.querySelectorAll('[data-ptz-pane]').forEach(function (pane) {
            pane.hidden = pane.getAttribute('data-ptz-pane') !== tab;
        });
        if (tab === 'ptz') this._startStatusPoll();
        else this._stopStatusPoll();
        /* Only notify on real change — same-tab setTab was freezing the UI (sync loop) */
        if (changed && typeof this._cb.onTabChange === 'function') {
            try { this._cb.onTabChange(tab); } catch (_) { /* host */ }
        }
    };

    VmsPtzJoystick.prototype.setPtzTabEnabled = function (on) {
        on = !!on;
        if (this._ptzTabEnabled === on) {
            if (!on && this._tab === 'ptz') this.setTab('digi');
            return;
        }
        this._ptzTabEnabled = on;
        var ptzTab = this._el('[data-ptz-tab="ptz"]');
        if (ptzTab) {
            ptzTab.disabled = !this._ptzTabEnabled;
            ptzTab.classList.toggle('is-disabled', !this._ptzTabEnabled);
            ptzTab.title = this._ptzTabEnabled ? 'PTZ' : 'PTZ not available for this camera';
        }
        if (!this._ptzTabEnabled && this._tab === 'ptz') this.setTab('digi');
    };

    VmsPtzJoystick.prototype.setDigiLevel = function (level, notify) {
        var steps = [1, 1.5, 2, 3, 4, 6, 8];
        var n = Number(level);
        if (!isFinite(n)) n = 1;
        var best = 1;
        var bestD = 99;
        steps.forEach(function (s) {
            var d = Math.abs(s - n);
            if (d < bestD) { bestD = d; best = s; }
        });
        n = best;
        this._digiLevel = n;
        var elLv = this._el('[data-digi-level]');
        if (elLv) elLv.textContent = (n % 1 === 0 ? String(n) : n.toFixed(1)) + '\u00D7';
        if (notify && typeof this._cb.onDigiZoom === 'function') {
            try { this._cb.onDigiZoom(n); } catch (_) { /* host */ }
        }
    };

    VmsPtzJoystick.prototype.getDigiLevel = function () {
        return this._digiLevel;
    };

    VmsPtzJoystick.prototype.setTarget = function (camId, meta) {
        meta = meta || {};
        this._camId = camId ? String(camId).trim() : null;
        this._hasPtz = !!(meta.hasPtz);
        if (meta.labMock != null) this._labMock = !!meta.labMock;
        this._label = meta.label != null ? String(meta.label) : '';
        this._headingDeg = null;
        this._cardinal = '';
        if (meta.digiLevel != null) this.setDigiLevel(meta.digiLevel, false);
        var wantPtzTab = meta.ptzTabEnabled != null
            ? !!meta.ptzTabEnabled
            : !!(this._hasPtz || this._labMock);
        this.setPtzTabEnabled(wantPtzTab);
        if (meta.tab) this.setTab(meta.tab);
        this._refreshUi();
        if (this._camId && this._tab === 'ptz' && this._canMove()) this._startStatusPoll();
        else this._stopStatusPoll();
    };

    VmsPtzJoystick.prototype.setMinimized = function (on) {
        this._minimized = !!on;
        this._root.classList.toggle('is-minimized', this._minimized);
        var minBtn = this._el('[data-ptz-min]');
        if (minBtn) {
            minBtn.textContent = this._minimized ? '▢' : '−';
            minBtn.title = this._minimized ? 'Restore' : 'Minimize';
            minBtn.setAttribute('aria-label', minBtn.title);
        }
    };

    VmsPtzJoystick.prototype.setVisible = function (on) {
        this._root.hidden = !on;
        if (on && this._opts.isFloating && !this._root.style.left && !this._root.style.top) {
            this._root.style.right = '16px';
            this._root.style.bottom = '16px';
        }
        if (!on) {
            this._stickDragging = false;
            this._send('stop');
            this._resetKnob();
            this._stopStatusPoll();
        } else if (this._tab === 'ptz') {
            this._startStatusPoll();
        }
    };

    VmsPtzJoystick.prototype.getRoot = function () {
        return this._root;
    };

    VmsPtzJoystick.prototype.isLabMock = function () {
        return !!this._labMock;
    };

    function create(container, options, callbacks) {
        return new VmsPtzJoystick(container, options, callbacks);
    }

    global.VmsPtzJoystick = {
        create: create,
        isPtzLicensed: isPtzLicensed,
        fetchLabMockFlag: fetchLabMockFlag,
    };
})(window);
