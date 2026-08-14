/**
 * ANALYTIC-TOAST-DRAGGABLE-V1 — drag analytic Ack/alert toasts by header (or whole card).
 */
(function (global) {
    'use strict';

    function restorePos(el, storageKey) {
        if (!el || !storageKey) return;
        try {
            var raw = sessionStorage.getItem(storageKey);
            if (!raw) return;
            var p = JSON.parse(raw);
            if (!p || p.left == null || p.top == null) return;
            el.style.position = 'fixed';
            el.style.left = String(p.left);
            el.style.top = String(p.top);
            el.style.right = 'auto';
            el.style.bottom = 'auto';
            el.style.transform = 'none';
        } catch (_) { /* ignore */ }
    }

    function savePos(el, storageKey) {
        if (!el || !storageKey) return;
        try {
            sessionStorage.setItem(storageKey, JSON.stringify({
                left: el.style.left,
                top: el.style.top,
            }));
        } catch (_) { /* ignore */ }
    }

    /**
     * @param {HTMLElement} el toast root
     * @param {{ handle?: string, storageKey?: string }} [opts]
     */
    function enable(el, opts) {
        opts = opts || {};
        if (!el || el.dataset.axToastDrag === '1') return el;
        el.dataset.axToastDrag = '1';
        var handle = opts.handle ? el.querySelector(opts.handle) : null;
        if (!handle) handle = el;
        handle.classList.add('ax-toast-drag-handle');
        if (!handle.getAttribute('title')) {
            handle.setAttribute('title', 'Drag to move');
        }
        restorePos(el, opts.storageKey);

        handle.addEventListener('pointerdown', function (e) {
            if (e.button != null && e.button !== 0) return;
            if (e.target && e.target.closest && e.target.closest('button, a, input, select, textarea, label')) {
                return;
            }
            e.preventDefault();
            var rect = el.getBoundingClientRect();
            el.style.position = 'fixed';
            el.style.left = rect.left + 'px';
            el.style.top = rect.top + 'px';
            el.style.right = 'auto';
            el.style.bottom = 'auto';
            el.style.transform = 'none';
            var startX = e.clientX;
            var startY = e.clientY;
            var origL = rect.left;
            var origT = rect.top;
            try { handle.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }

            function onMove(ev) {
                el.style.left = Math.round(origL + (ev.clientX - startX)) + 'px';
                el.style.top = Math.round(origT + (ev.clientY - startY)) + 'px';
            }
            function onUp() {
                handle.removeEventListener('pointermove', onMove);
                handle.removeEventListener('pointerup', onUp);
                handle.removeEventListener('pointercancel', onUp);
                savePos(el, opts.storageKey);
            }
            handle.addEventListener('pointermove', onMove);
            handle.addEventListener('pointerup', onUp);
            handle.addEventListener('pointercancel', onUp);
        });
        return el;
    }

    global.AnalyticToastDrag = {
        enable: enable,
        restorePos: restorePos,
    };
})(typeof window !== 'undefined' ? window : global);
