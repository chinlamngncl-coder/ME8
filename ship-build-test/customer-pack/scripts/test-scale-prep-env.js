'use strict';
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');
const scalePrep = require('../lib/scalePrep');

const root = path.join(__dirname, '..');
const envPath = path.join(root, '.env.me8.example');
const parsed = dotenv.parse(fs.readFileSync(envPath, 'utf8'));

const prev = {
    FM_USE_CACHE_DEBOUNCE: process.env.FM_USE_CACHE_DEBOUNCE,
    FM_GPS_CACHE_DEBOUNCE_MS: process.env.FM_GPS_CACHE_DEBOUNCE_MS,
    FM_CONTACT_CACHE_DEBOUNCE_MS: process.env.FM_CONTACT_CACHE_DEBOUNCE_MS,
};
Object.assign(process.env, parsed);

const cfg = scalePrep.loadScalePrepEnv();
process.env.FM_USE_CACHE_DEBOUNCE = prev.FM_USE_CACHE_DEBOUNCE;
process.env.FM_GPS_CACHE_DEBOUNCE_MS = prev.FM_GPS_CACHE_DEBOUNCE_MS;
process.env.FM_CONTACT_CACHE_DEBOUNCE_MS = prev.FM_CONTACT_CACHE_DEBOUNCE_MS;

const ok = cfg.gpsCacheDebounceMs === 2000
    && cfg.contactCacheDebounceMs === 2000;

console.log('me8.example debounce cfg:', cfg);
if (!ok) {
    console.error('FAIL: expected 2000ms GPS and contact debounce when FM_USE_CACHE_DEBOUNCE=1');
    process.exit(1);
}
console.log('scale-prep env test OK');

async function testAsyncDebouncedWriter() {
    let calls = 0;
    const writer = scalePrep.createDebouncedWriter(async () => {
        calls += 1;
        await new Promise((r) => setTimeout(r, 5));
    }, 40);
    writer.schedule();
    writer.schedule();
    await new Promise((r) => setTimeout(r, 80));
    await writer.flush();
    if (calls !== 1) {
        console.error('FAIL: async debounced writer expected 1 flush, got', calls);
        process.exit(1);
    }
    console.log('async debounced writer test OK');
}

testAsyncDebouncedWriter().catch((err) => {
    console.error('FAIL:', err.message);
    process.exit(1);
});
