/**
 * ME8 dashboard static asset cache — long-lived /js and /vendor when cache-busted (?v=).
 */
'use strict';

const path = require('path');
const express = require('express');

const ONE_YEAR_SEC = 31536000;
const ONE_DAY_SEC = 86400;
const ONE_HOUR_SEC = 3600;

const HTML_CACHE_CONTROL = 'no-cache';

function hasCacheBustQuery(req) {
    const url = req.originalUrl || req.url || '';
    return /[?&]v=/.test(url);
}

function applyJsCacheControl(req, res) {
    const cc = hasCacheBustQuery(req)
        ? `public, max-age=${ONE_YEAR_SEC}, immutable`
        : `public, max-age=${ONE_HOUR_SEC}`;
    res.setHeader('Cache-Control', cc);
}

function mountDir(urlPath, diskSubdir, publicRoot, cacheControl) {
    const root = path.join(publicRoot, diskSubdir);
    return [
        (req, res, next) => {
            if (typeof cacheControl === 'function') {
                cacheControl(req, res);
            } else {
                res.setHeader('Cache-Control', cacheControl);
            }
            next();
        },
        express.static(root, {
            etag: true,
            lastModified: true,
            fallthrough: false,
        }),
    ];
}

function registerDashboardStatic(app, publicRoot) {
    publicRoot = publicRoot || path.join(__dirname, '..', 'public');

    app.use(
        '/vendor',
        ...mountDir('/vendor', 'vendor', publicRoot, `public, max-age=${ONE_YEAR_SEC}, immutable`)
    );

    app.use('/js', ...mountDir('/js', 'js', publicRoot, applyJsCacheControl));

    app.use(
        '/locales',
        ...mountDir('/locales', 'locales', publicRoot, `public, max-age=${ONE_DAY_SEC}`)
    );

    app.use(
        express.static(publicRoot, {
            etag: true,
            lastModified: true,
            setHeaders(res, filePath) {
                const base = path.basename(filePath);
                if (base.endsWith('.html')) {
                    res.setHeader('Cache-Control', HTML_CACHE_CONTROL);
                    return;
                }
                if (/\.(png|jpe?g|gif|webp|svg|ico)$/i.test(base)) {
                    res.setHeader('Cache-Control', `public, max-age=${ONE_DAY_SEC}`);
                    return;
                }
                if (base.endsWith('.css')) {
                    res.setHeader('Cache-Control', `public, max-age=${ONE_DAY_SEC}`);
                }
            },
        })
    );
}

module.exports = {
    ONE_YEAR_SEC,
    ONE_DAY_SEC,
    ONE_HOUR_SEC,
    HTML_CACHE_CONTROL,
    hasCacheBustQuery,
    applyJsCacheControl,
    registerDashboardStatic,
};
