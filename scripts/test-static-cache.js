'use strict';
const assert = require('assert');
const staticCache = require('../lib/staticCache');

assert.strictEqual(staticCache.hasCacheBustQuery({ originalUrl: '/js/foo.js?v=20260701' }), true);
assert.strictEqual(staticCache.hasCacheBustQuery({ url: '/vendor/leaflet.js?v=1' }), true);
assert.strictEqual(staticCache.hasCacheBustQuery({ originalUrl: '/js/display-names.js' }), false);

const headers = {};
staticCache.applyJsCacheControl({ originalUrl: '/js/video-wall.js?v=1' }, { setHeader(k, v) { headers[k] = v; } });
assert.ok(headers['Cache-Control'].includes('immutable'));

const headers2 = {};
staticCache.applyJsCacheControl({ originalUrl: '/js/chat-ui.js' }, { setHeader(k, v) { headers2[k] = v; } });
assert.ok(headers2['Cache-Control'].includes('max-age=3600'));
assert.ok(!headers2['Cache-Control'].includes('immutable'));

console.log('static-cache unit test OK');
