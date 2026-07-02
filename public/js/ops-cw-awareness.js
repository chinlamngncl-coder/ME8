/**
 * Operations — ambient ticker when embedded Command Wall has live/connecting video.
 */
(function (global) {
    var pollTimer = null;
    var POLL_MS = 1500;

    function tr(key, params) {
        if (typeof I18n !== 'undefined' && I18n.t) return I18n.t(key, params);
        return key;
    }

    function isOpsTabActive() {
        var ops = document.getElementById('app-view-ops');
        return !!(ops && !ops.hidden);
    }

    function getSummary() {
        if (!global.CommandWall || !CommandWall.getLiveSlotSummary) return [];
        try {
            return CommandWall.getLiveSlotSummary() || [];
        } catch (_) {
            return [];
        }
    }

    function formatText(slots) {
        var names = slots.map(function (s) {
            if (s.decoded) return s.name;
            var hint = tr('ops.cwAwareness.connecting');
            return s.name + ' (' + hint + ')';
        });
        return tr('ops.cwAwareness.live', { list: names.join(' · '), count: slots.length });
    }

    function update() {
        var bar = document.getElementById('ops-cw-awareness');
        if (!bar) return;
        if (!isOpsTabActive() || global.mapPopoutMirrorActive) {
            bar.hidden = true;
            return;
        }
        var slots = getSummary();
        if (!slots.length) {
            bar.hidden = true;
            return;
        }
        bar.hidden = false;
        var textEl = bar.querySelector('.ops-cw-awareness-text');
        var track = bar.querySelector('.ops-cw-awareness-track');
        if (textEl) textEl.textContent = formatText(slots);
        if (track && textEl) {
            track.classList.remove('ops-cw-awareness-scroll');
            requestAnimationFrame(function () {
                track.classList.toggle('ops-cw-awareness-scroll', textEl.scrollWidth > track.clientWidth + 4);
            });
        }
    }

    function openCommandWall() {
        if (global.EvidenceManager && EvidenceManager.showTab) {
            EvidenceManager.showTab('command-wall');
            return;
        }
        var btn = document.getElementById('nav-tab-command-wall');
        if (btn) btn.click();
    }

    function init() {
        var bar = document.getElementById('ops-cw-awareness');
        if (!bar) return;
        var openBtn = bar.querySelector('.ops-cw-awareness-open');
        if (openBtn) {
            openBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                openCommandWall();
            });
        }
        bar.addEventListener('click', function () {
            openCommandWall();
        });
        if (pollTimer) clearInterval(pollTimer);
        pollTimer = setInterval(update, POLL_MS);
        update();
    }

    global.OpsCwAwareness = { init: init, refresh: update };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(window);
