/**
 * Live viewer telemetry \u2014 read-only table for super-admin / tech diagnostics.
 */
(function (global) {
    'use strict';

    function tr(key, params) {
        if (global.I18n && I18n.t) return I18n.t(key, params);
        return key;
    }

    function esc(s) {
        const d = document.createElement('div');
        d.textContent = s == null ? '' : String(s);
        return d.innerHTML;
    }

    function watcherSummary(watchers) {
        if (!watchers || !watchers.length) return '\u2014';
        return watchers.map(function (w) {
            const who = w.username || tr('tech.liveViewers.anon');
            const surfaces = [];
            if (w.ops) surfaces.push(tr('tech.liveViewers.opsShort'));
            if (w.commandWall) surfaces.push(tr('tech.liveViewers.wallShort'));
            return who + (surfaces.length ? ' (' + surfaces.join(', ') + ')' : '');
        }).join('; ');
    }

    function render(el, payload) {
        if (!el) return;
        const data = payload && payload.telemetry ? payload.telemetry : payload;
        if (!data) {
            el.textContent = tr('tech.liveViewers.empty');
            return;
        }
        const cams = data.cameras || [];
        if (!cams.length) {
            el.innerHTML = '<p class="setup-hint">' + esc(tr('tech.liveViewers.empty')) + '</p>';
            return;
        }
        const summary = tr('tech.liveViewers.summary', {
            active: String(data.activePoolSessions != null ? data.activePoolSessions : 0),
            max: String(data.maxLive != null ? data.maxLive : 8),
        });
        let rows = '';
        cams.forEach(function (row) {
            const poolLabel = row.poolStreaming
                ? tr('tech.liveViewers.poolStreaming')
                : (row.poolActive ? tr('tech.liveViewers.poolActive') : tr('tech.liveViewers.poolOff'));
            rows += '<tr>'
                + '<td>' + esc(row.camId) + '</td>'
                + '<td>' + esc(poolLabel) + '</td>'
                + '<td>' + esc(String(row.poolWsClients != null ? row.poolWsClients : 0)) + '</td>'
                + '<td>' + esc(String(row.opsRefs != null ? row.opsRefs : 0)) + '</td>'
                + '<td>' + esc(String(row.commandWallRefs != null ? row.commandWallRefs : 0)) + '</td>'
                + '<td>' + esc(String(row.socketsWithRefs != null ? row.socketsWithRefs : 0)) + '</td>'
                + '<td>' + esc(watcherSummary(row.watchers)) + '</td>'
                + '</tr>';
        });
        el.innerHTML =
            '<p class="setup-hint">' + esc(summary) + '</p>'
            + '<table class="cs-table ss-live-viewer-table"><thead><tr>'
            + '<th>' + esc(tr('tech.liveViewers.colCam')) + '</th>'
            + '<th>' + esc(tr('tech.liveViewers.colPool')) + '</th>'
            + '<th>' + esc(tr('tech.liveViewers.colWs')) + '</th>'
            + '<th>' + esc(tr('tech.liveViewers.colOps')) + '</th>'
            + '<th>' + esc(tr('tech.liveViewers.colWall')) + '</th>'
            + '<th>' + esc(tr('tech.liveViewers.colSockets')) + '</th>'
            + '<th>' + esc(tr('tech.liveViewers.colWatchers')) + '</th>'
            + '</tr></thead><tbody>' + rows + '</tbody></table>';
    }

    function fetchTelemetry(useTechApi) {
        const url = useTechApi ? '/api/tech/live-viewers' : '/api/diagnostics/live-viewers';
        return fetch(url, { credentials: 'same-origin', cache: 'no-cache' })
            .then(function (res) { return res.json().then(function (data) { return { res: res, data: data }; }); })
            .then(function (pack) {
                if (!pack.res.ok || !pack.data.ok) {
                    const err = new Error((pack.data && pack.data.error) || tr('tech.liveViewers.loadFailed'));
                    throw err;
                }
                return pack.data;
            });
    }

    function loadInto(el, opts) {
        opts = opts || {};
        if (!el) return Promise.resolve();
        el.textContent = tr('common.loading');
        return fetchTelemetry(!!opts.useTechApi)
            .then(function (data) {
                render(el, data);
            })
            .catch(function (err) {
                el.textContent = (err && err.message) || tr('tech.liveViewers.loadFailed');
            });
    }

    global.LiveViewerTelemetry = {
        fetch: fetchTelemetry,
        render: render,
        loadInto: loadInto,
    };
})(typeof window !== 'undefined' ? window : this);
