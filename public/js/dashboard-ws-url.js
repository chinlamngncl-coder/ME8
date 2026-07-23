/**
 * WSS-VIDEO-AUDIO-SOCKETS-V1 — build ws/wss URLs from the page origin.
 * Same host/port as Ops (HTTP or HTTPS). Paths: /ws/video , /ws/audio
 */
(function (global) {
    'use strict';

    function pageWsProto() {
        return global.location && global.location.protocol === 'https:' ? 'wss:' : 'ws:';
    }

    function pageHost() {
        return (global.location && global.location.host) || '127.0.0.1';
    }

    function videoWsUrl(camId) {
        var url = pageWsProto() + '//' + pageHost() + '/ws/video';
        if (camId) url += '?camId=' + encodeURIComponent(String(camId));
        return url;
    }

    function audioWsUrl() {
        return pageWsProto() + '//' + pageHost() + '/ws/audio';
    }

    global.DashboardWsUrl = {
        videoWsUrl: videoWsUrl,
        audioWsUrl: audioWsUrl,
        pageWsProto: pageWsProto,
    };
})(typeof window !== 'undefined' ? window : globalThis);
