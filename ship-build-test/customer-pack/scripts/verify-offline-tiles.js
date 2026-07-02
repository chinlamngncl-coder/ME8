#!/usr/bin/env node
/**
 * Verify offline raster tiles for demo-2 lab regions.
 * Config: data/gis/offline/country-tile-bboxes.json
 *
 * Usage:
 *   node scripts/verify-offline-tiles.js
 *   node scripts/verify-offline-tiles.js --all-demo2
 *   node scripts/verify-offline-tiles.js --region sg
 *   node scripts/verify-offline-tiles.js --api http://127.0.0.1:3888
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const http = require('http');
const https = require('https');

const ROOT = path.join(__dirname, '..', 'data', 'gis', 'offline', 'tiles');
const CONFIG_PATH = path.join(__dirname, '..', 'data', 'gis', 'offline', 'country-tile-bboxes.json');
const BLOCKED_TILE_MD5 = 'c069a15b2cc2d6b6f527ad09eb93c61a';
const MIN_TILE_BYTES = 80;

function loadConfig() {
    const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    if (!raw || !raw.regions) throw new Error('Invalid country-tile-bboxes.json');
    return raw;
}

function parseArgs(argv) {
    const out = { allDemo2: false, regions: [], api: null, json: false, help: false };
    for (let i = 2; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--all-demo2') out.allDemo2 = true;
        else if (a === '--json') out.json = true;
        else if (a === '--region' && argv[i + 1]) out.regions.push(argv[++i]);
        else if (a === '--api' && argv[i + 1]) out.api = argv[++i];
        else if (a === '--help' || a === '-h') out.help = true;
    }
    if (!out.regions.length) out.allDemo2 = true;
    return out;
}

function printHelp() {
    console.log(`Usage:
  node scripts/verify-offline-tiles.js [--all-demo2]
  node scripts/verify-offline-tiles.js --region sg --region ph
  node scripts/verify-offline-tiles.js --api http://127.0.0.1:3888

Checks: tile count per region, OSM-block fingerprint, center sample, optional HTTP API.`);
}

function resolveRegionIds(cfg, args) {
    if (args.help) return [];
    const ids = new Set();
    if (args.allDemo2) (cfg.demo2Regions || []).forEach((id) => ids.add(id));
    args.regions.forEach((id) => ids.add(id));
    if (!ids.size) throw new Error('No regions selected');
    const missing = [...ids].filter((id) => !cfg.regions[id]);
    if (missing.length) throw new Error('Unknown region id(s): ' + missing.join(', '));
    return [...ids];
}

function lon2tile(lon, z) {
    return Math.floor(((lon + 180) / 360) * Math.pow(2, z));
}

function lat2tile(lat, z) {
    const r = (lat * Math.PI) / 180;
    return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * Math.pow(2, z));
}

function tileRange(bbox, minZ, maxZ) {
    const jobs = [];
    for (let z = minZ; z <= maxZ; z++) {
        const xMin = lon2tile(bbox.west, z);
        const xMax = lon2tile(bbox.east, z);
        const yMin = lat2tile(bbox.north, z);
        const yMax = lat2tile(bbox.south, z);
        for (let x = xMin; x <= xMax; x++) {
            for (let y = yMin; y <= yMax; y++) jobs.push({ z, x, y });
        }
    }
    return jobs;
}

function tileFile(z, x, y) {
    return path.join(ROOT, String(z), String(x), y + '.png');
}

function md5(buf) {
    return crypto.createHash('md5').update(buf).digest('hex');
}

function classifyBuffer(buf) {
    if (!buf || buf.length < MIN_TILE_BYTES) return 'invalid';
    if (buf[0] !== 0x89 || buf[1] !== 0x50) return 'invalid';
    if (md5(buf) === BLOCKED_TILE_MD5) return 'blocked';
    return 'ok';
}

function classifyFile(file) {
    if (!fs.existsSync(file)) return 'missing';
    try {
        return classifyBuffer(fs.readFileSync(file));
    } catch (_) {
        return 'invalid';
    }
}

function regionCenter(region) {
    return {
        lat: (region.north + region.south) / 2,
        lon: (region.east + region.west) / 2,
    };
}

function sampleZoom(region) {
    const maxZ = region.maxZ != null ? region.maxZ : 13;
    return Math.max(10, Math.min(maxZ, 12));
}

function verifyRegion(regionId, region) {
    const bbox = {
        west: region.west,
        south: region.south,
        east: region.east,
        north: region.north,
    };
    const minZ = region.minZ != null ? region.minZ : 3;
    const maxZ = region.maxZ != null ? region.maxZ : 13;
    const jobs = tileRange(bbox, minZ, maxZ);
    let ok = 0;
    let missing = 0;
    let blocked = 0;
    let invalid = 0;
    for (const { z, x, y } of jobs) {
        const st = classifyFile(tileFile(z, x, y));
        if (st === 'ok') ok++;
        else if (st === 'missing') missing++;
        else if (st === 'blocked') blocked++;
        else invalid++;
    }
    const center = regionCenter(region);
    const zSample = sampleZoom(region);
    const cx = lon2tile(center.lon, zSample);
    const cy = lat2tile(center.lat, zSample);
    const centerStatus = classifyFile(tileFile(zSample, cx, cy));
    const pass = missing === 0 && blocked === 0 && invalid === 0 && centerStatus === 'ok';
    return {
        regionId,
        country: region.country || '',
        name: region.name || regionId,
        expected: jobs.length,
        ok,
        missing,
        blocked,
        invalid,
        center: { z: zSample, x: cx, y: cy, status: centerStatus },
        pass,
    };
}

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        const lib = url.startsWith('https') ? https : http;
        const req = lib.get(url, { timeout: 8000 }, (res) => {
            const chunks = [];
            res.on('data', (c) => chunks.push(c));
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(chunks).toString('utf8')) });
                } catch (e) {
                    reject(new Error('bad json ' + res.statusCode));
                }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => req.destroy(new Error('timeout')));
    });
}

function fetchBytes(url) {
    return new Promise((resolve, reject) => {
        const lib = url.startsWith('https') ? https : http;
        const req = lib.get(url, { timeout: 8000 }, (res) => {
            const chunks = [];
            res.on('data', (c) => chunks.push(c));
            res.on('end', () => resolve({ status: res.statusCode, buf: Buffer.concat(chunks) }));
        });
        req.on('error', reject);
        req.on('timeout', () => req.destroy(new Error('timeout')));
    });
}

async function verifyApi(base, results) {
    const out = { base, config: null, tiles: [] };
    try {
        const cfgRes = await fetchJson(base.replace(/\/$/, '') + '/api/gis/offline/config');
        out.config = {
            status: cfgRes.status,
            forceOfflineOnly: !!(cfgRes.body && cfgRes.body.forceOfflineOnly),
            tilesExists: !!(cfgRes.body && cfgRes.body.tilesExists),
        };
    } catch (e) {
        out.config = { error: e.message };
    }
    for (const r of results) {
        const c = r.center;
        const url = base.replace(/\/$/, '') + '/api/gis/offline/tiles/' + c.z + '/' + c.x + '/' + c.y + '.png';
        try {
            const t = await fetchBytes(url);
            const st = t.status === 200 && classifyBuffer(t.buf) === 'ok' ? 'ok' : 'fail';
            out.tiles.push({ regionId: r.regionId, url, status: t.status, sample: st });
        } catch (e) {
            out.tiles.push({ regionId: r.regionId, url, sample: 'error', error: e.message });
        }
    }
    out.pass = !!(out.config && out.config.forceOfflineOnly && out.config.tilesExists)
        && out.tiles.every((t) => t.sample === 'ok');
    return out;
}

function countryRollup(cfg, results) {
    const byCountry = {};
    results.forEach((r) => {
        const code = r.country || '?';
        if (!byCountry[code]) byCountry[code] = { country: code, regions: [], pass: true };
        byCountry[code].regions.push(r.regionId);
        if (!r.pass) byCountry[code].pass = false;
    });
    return Object.keys(byCountry).sort().map((k) => byCountry[k]);
}

async function main() {
    const cfg = loadConfig();
    const args = parseArgs(process.argv);
    if (args.help) {
        printHelp();
        return;
    }
    if (!fs.existsSync(ROOT)) {
        console.error('FAIL — tiles folder missing:', ROOT);
        process.exit(1);
    }

    const regionIds = resolveRegionIds(cfg, args);
    const results = regionIds.map((id) => verifyRegion(id, cfg.regions[id]));
    const countries = countryRollup(cfg, results);
    let api = null;
    if (args.api) api = await verifyApi(args.api, results);

    const pass = results.every((r) => r.pass) && (!api || api.pass);
    const summary = {
        pass,
        regions: results.length,
        countries: countries.length,
        totalExpected: results.reduce((n, r) => n + r.expected, 0),
        totalOk: results.reduce((n, r) => n + r.ok, 0),
        blocked: results.reduce((n, r) => n + r.blocked, 0),
        missing: results.reduce((n, r) => n + r.missing, 0),
        invalid: results.reduce((n, r) => n + r.invalid, 0),
    };

    if (args.json) {
        console.log(JSON.stringify({ summary, results, countries, api }, null, 2));
    } else {
        console.log('VERIFY offline tiles — demo-2 regions:', regionIds.join(', '));
        console.log('Root:', ROOT);
        console.log('');
        results.forEach((r) => {
            const mark = r.pass ? 'OK' : 'FAIL';
            console.log(
                mark,
                r.regionId.padEnd(14),
                r.name,
                '—',
                r.ok + '/' + r.expected,
                'missing', r.missing,
                'blocked', r.blocked,
                'center', r.center.z + '/' + r.center.x + '/' + r.center.y, r.center.status
            );
        });
        console.log('');
        console.log('Countries (7):');
        countries.forEach((c) => {
            console.log(' ', c.pass ? 'OK' : 'FAIL', c.country, '—', c.regions.join(', '));
        });
        if (api) {
            console.log('');
            console.log('API', args.api, api.pass ? 'OK' : 'FAIL');
            if (api.config) console.log('  config', JSON.stringify(api.config));
            api.tiles.forEach((t) => console.log(' ', t.regionId, t.sample, t.status || t.error || ''));
        }
        console.log('');
        console.log(
            pass ? 'VERIFY OK' : 'VERIFY FAIL',
            '—',
            summary.totalOk + '/' + summary.totalExpected,
            'tiles, blocked', summary.blocked,
            'missing', summary.missing
        );
    }

    process.exit(pass ? 0 : 1);
}

main().catch((e) => {
    console.error(e.message || e);
    process.exit(1);
});
