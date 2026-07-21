/**
 * ME8 — load LiveKit + conference hub only when VC tab is opened.
 */
(function (global) {
    'use strict';

    const VENDOR = '/vendor/livekit-client.umd.min.js?v=20260701-vc-bwc-remove';
    const LAYOUT = '/js/conference-layout.js?v=20260721-vc-fixed-camera-ingress-v1';
    const HUB = '/js/conference-hub.js?v=20260721-vc-fixed-camera-ingress-v1';

    let loadPromise = null;

    function loadScript(src) {
        return new Promise(function (resolve, reject) {
            if (document.querySelector('script[src="' + src + '"]')) {
                resolve();
                return;
            }
            const s = document.createElement('script');
            s.src = src;
            s.async = false;
            s.onload = function () { resolve(); };
            s.onerror = function () { reject(new Error('Failed to load ' + src)); };
            document.head.appendChild(s);
        });
    }

    function ensure() {
        if (global.ConferenceHub && global.LivekitClient) {
            return Promise.resolve(global.ConferenceHub);
        }
        if (loadPromise) return loadPromise;
        loadPromise = loadScript(VENDOR)
            .then(function () { return loadScript(LAYOUT); })
            .then(function () { return loadScript(HUB); })
            .then(function () {
                if (global.ConferenceHub && ConferenceHub.bindUi) {
                    ConferenceHub.bindUi();
                }
                return global.ConferenceHub;
            });
        return loadPromise;
    }

    global.VcLazy = { ensure: ensure };
}(typeof window !== 'undefined' ? window : this));
