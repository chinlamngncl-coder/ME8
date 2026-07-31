/**
 * SELECT-CARET-UNIFY-ALL-UI-V1
 * Wrap single-choice <select> in .ax-select-wrap so the CSS ::after caret shows.
 * Safety: move the same select node (keep id / listeners). Caret is pointer-events: none.
 * Never builds a fake dropdown. Never wraps input/textarea.
 */
(function (global) {
    'use strict';

    var REENTRY = false;
    var OBS = null;
    var SCHED = null;

    function shouldSkip(sel) {
        if (!sel || !sel.tagName || sel.tagName !== 'SELECT') return true;
        if (sel.multiple) return true;
        if (sel.size && Number(sel.size) > 1) return true;
        if (sel.hasAttribute('hidden')) return true;
        if (sel.getAttribute('aria-hidden') === 'true') return true;
        if (sel.closest && sel.closest('.ax-select-wrap')) return true;
        /* display:none on the select itself — skip; parent-hidden panels still wrap */
        try {
            if (sel.style && sel.style.display === 'none') return true;
        } catch (e) { /* ignore */ }
        return false;
    }

    function wrapOne(sel) {
        if (shouldSkip(sel)) return false;
        var parent = sel.parentNode;
        if (!parent) return false;
        var wrap = document.createElement('span');
        wrap.className = 'ax-select-wrap';
        parent.insertBefore(wrap, sel);
        wrap.appendChild(sel);
        return true;
    }

    function wrapAll(root) {
        if (REENTRY) return;
        REENTRY = true;
        try {
            var scope = root && root.querySelectorAll ? root : document;
            var list;
            if (scope.nodeType === 1 && scope.tagName === 'SELECT') {
                list = [scope];
            } else {
                list = scope.querySelectorAll ? scope.querySelectorAll('select') : [];
            }
            for (var i = 0; i < list.length; i++) {
                wrapOne(list[i]);
            }
        } finally {
            REENTRY = false;
        }
    }

    function scheduleWrap(root) {
        if (SCHED) return;
        SCHED = setTimeout(function () {
            SCHED = null;
            wrapAll(root || document);
        }, 40);
    }

    function startObserver() {
        if (OBS || typeof MutationObserver === 'undefined' || !document.body) return;
        OBS = new MutationObserver(function (mutations) {
            if (REENTRY) return;
            var need = false;
            for (var i = 0; i < mutations.length; i++) {
                var m = mutations[i];
                if (m.type !== 'childList' || !m.addedNodes || !m.addedNodes.length) continue;
                for (var j = 0; j < m.addedNodes.length; j++) {
                    var n = m.addedNodes[j];
                    if (!n || n.nodeType !== 1) continue;
                    if (n.classList && n.classList.contains('ax-select-wrap')) continue;
                    if (n.tagName === 'SELECT' || (n.querySelector && n.querySelector('select'))) {
                        need = true;
                        break;
                    }
                }
                if (need) break;
            }
            if (need) scheduleWrap(document);
        });
        OBS.observe(document.body, { childList: true, subtree: true });
    }

    function boot() {
        wrapAll(document);
        startObserver();
    }

    global.AxSelectWrap = {
        refresh: function (root) { wrapAll(root || document); },
        boot: boot
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})(typeof window !== 'undefined' ? window : this);
