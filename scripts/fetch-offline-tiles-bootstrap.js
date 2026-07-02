#!/usr/bin/env node
/**
 * Bootstrap offline raster tiles (OSM, WGS84) into data/gis/offline/tiles/.
 * Config: data/gis/offline/country-tile-bboxes.json
 *
 * Usage:
 *   node scripts/fetch-offline-tiles-bootstrap.js --list
 *   node scripts/fetch-offline-tiles-bootstrap.js --region sg
 *   node scripts/fetch-offline-tiles-bootstrap.js --country cn
 *   node scripts/fetch-offline-tiles-bootstrap.js --all-demo2
 */
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..', 'data', 'gis', 'offline', 'tiles');
const CONFIG_PATH = path.join(__dirname, '..', 'data', 'gis', 'offline', 'country-tile-bboxes.json');
const UA = 'MobilityC2-offline-bootstrap/1.1 (lab pack; contact operator)';
const DEFAULT_DELAY_MS = 160;
/** OSM volunteer servers return this PNG (HTTP 200) when the client is blocked — not a real map tile. */
const BLOCKED_TILE_MD5 = 'c069a15b2cc2d6b6f527ad09eb93c61a';
const CARTO_HOSTS = ['a', 'b', 'c', 'd'];

function loadConfig() {
    const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    if (!raw || !raw.regions) throw new Error('Invalid country-tile-bboxes.json');
    return raw;
}

function parseArgs(argv) {
    const out = { list: false, allDemo2: false, purgeBad: false, regions: [], countries: [] };
    for (let i = 2; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--list') out.list = true;
        else if (a === '--all-demo2') out.allDemo2 = true;
        else if (a === '--purge-bad') out.purgeBad = true;
        else if (a === '--region' && argv[i + 1]) { out.regions.push(argv[++i]); }
        else if (a === '--country' && argv[i + 1]) { out.countries.push(argv[++i]); }
        else if (a === '--help' || a === '-h') out.help = true;
    }
    return out;
}

function printHelp() {
    console.log(`Usage:
  node scripts/fetch-offline-tiles-bootstrap.js --list
  node scripts/fetch-offline-tiles-bootstrap.js --region sg
  node scripts/fetch-offline-tiles-bootstrap.js --country cn
  node scripts/fetch-offline-tiles-bootstrap.js --country za --country ph
  node scripts/fetch-offline-tiles-bootstrap.js --all-demo2
  node scripts/fetch-offline-tiles-bootstrap.js --purge-bad --all-demo2

Demo-2: 7 countries, 11 regions (no Malaysia). Uses Carto raster (OSM data) — not tile.openstreetmap.org.`);
}

function md5(buf) {
    return crypto.createHash('md5').update(buf).digest('hex');
}

function isValidTileBuffer(buf) {
    if (!buf || buf.length < 80) return false;
    if (buf[0] !== 0x89 || buf[1] !== 0x50) return false;
    return md5(buf) !== BLOCKED_TILE_MD5;
}

function isValidTileFile(file) {
    try {
        if (!fs.existsSync(file)) return false;
        const st = fs.statSync(file);
        if (st.size < 80) return false;
        return isValidTileBuffer(fs.readFileSync(file));
    } catch (_) {
        return false;
    }
}

function purgeBlockedTiles() {
    if (!fs.existsSync(ROOT)) return 0;
    let removed = 0;
    function walk(dir) {
        for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
            const p = path.join(dir, ent.name);
            if (ent.isDirectory()) walk(p);
            else if (ent.name.endsWith('.png') && !isValidTileFile(p)) {
                fs.unlinkSync(p);
                removed++;
            }
        }
    }
    walk(ROOT);
    return removed;
}

function resolveRegionIds(cfg, args) {
    if (args.list || args.help) return [];
    const ids = new Set();
    if (args.allDemo2) {
        (cfg.demo2Regions || []).forEach((id) => ids.add(id));
    }
    args.regions.forEach((id) => ids.add(id));
    args.countries.forEach((code) => {
        const list = cfg.countries && cfg.countries[code];
        if (!list) throw new Error('Unknown country code: ' + code);
        list.forEach((id) => ids.add(id));
    });
    if (!ids.size) {
        throw new Error('No regions selected. Use --region, --country, or --all-demo2 (see --help).');
    }
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

function fetchTile(z, x, y) {
    const host = CARTO_HOSTS[(x + y) % CARTO_HOSTS.length];
    const url = `https://${host}.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`;
    return new Promise((resolve, reject) => {
        const req = https.get(url, { headers: { 'User-Agent': UA } }, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                const loc = res.headers.location;
                if (!loc) return reject(new Error('redirect missing'));
                https.get(loc, { headers: { 'User-Agent': UA } }, (res2) => {
                    const chunks = [];
                    res2.on('data', (c) => chunks.push(c));
                    res2.on('end', () => {
                        const buf = Buffer.concat(chunks);
                        if (!isValidTileBuffer(buf)) return reject(new Error('blocked or invalid tile'));
                        resolve(buf);
                    });
                }).on('error', reject);
                return;
            }
            if (res.statusCode !== 200) {
                res.resume();
                return reject(new Error('HTTP ' + res.statusCode));
            }
            const chunks = [];
            res.on('data', (c) => chunks.push(c));
            res.on('end', () => {
                const buf = Buffer.concat(chunks);
                if (!isValidTileBuffer(buf)) return reject(new Error('blocked or invalid tile'));
                resolve(buf);
            });
        });
        req.on('error', reject);
        req.setTimeout(30000, () => req.destroy(new Error('timeout')));
    });
}

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

async function bootstrapRegion(regionId, region) {
    const bbox = {
        west: region.west,
        south: region.south,
        east: region.east,
        north: region.north,
    };
    const minZ = region.minZ != null ? region.minZ : 3;
    const maxZ = region.maxZ != null ? region.maxZ : 13;
    const jobs = tileRange(bbox, minZ, maxZ);
    const label = region.name || regionId;
    console.log('');
    console.log('===', regionId, '—', label, `(z${minZ}–${maxZ},`, jobs.length, 'tiles) ===');
    let ok = 0;
    let fail = 0;
    let fetched = 0;
    for (let i = 0; i < jobs.length; i++) {
        const { z, x, y } = jobs[i];
        const dir = path.join(ROOT, String(z), String(x));
        const file = path.join(dir, y + '.png');
        if (isValidTileFile(file)) {
            ok++;
            continue;
        }
        if (fs.existsSync(file)) {
            try { fs.unlinkSync(file); } catch (_) { /* ignore */ }
        }
        fs.mkdirSync(dir, { recursive: true });
        try {
            const buf = await fetchTile(z, x, y);
            fs.writeFileSync(file, buf);
            ok++;
            fetched++;
        } catch (e) {
            fail++;
            console.warn('skip', regionId, z, x, y, e.message);
        }
        if ((i + 1) % 50 === 0) {
            console.log(' ', regionId, i + 1, '/', jobs.length, 'ok', ok, 'fail', fail, 'new', fetched);
        }
        await sleep(DEFAULT_DELAY_MS);
    }
    console.log('Region done:', regionId, '— ok:', ok, 'fail:', fail, 'new:', fetched);
    return { regionId, ok, fail, jobs: jobs.length };
}

async function main() {
    const cfg = loadConfig();
    const args = parseArgs(process.argv);
    if (args.help) {
        printHelp();
        return;
    }
    if (args.list) {
        console.log('Demo-2 regions:', (cfg.demo2Regions || []).join(', '));
        console.log('');
        Object.keys(cfg.regions).forEach((id) => {
            const r = cfg.regions[id];
            console.log(id, '—', r.name, `[${r.country}] z${r.minZ}-${r.maxZ}`);
        });
        return;
    }

    const regionIds = resolveRegionIds(cfg, args);
    console.log('Offline tile bootstrap — regions:', regionIds.join(', '));
    console.log('Output:', ROOT);
    console.log('Tile source: Carto Voyager (OSM data)');

    if (args.purgeBad) {
        const removed = purgeBlockedTiles();
        console.log('Purged invalid/blocked tiles:', removed);
    }

    const results = [];
    for (const id of regionIds) {
        results.push(await bootstrapRegion(id, cfg.regions[id]));
    }

    console.log('');
    console.log('Summary:');
    let bad = 0;
    results.forEach((r) => {
        console.log(' ', r.regionId, 'ok', r.ok, '/', r.jobs, 'fail', r.fail);
        if (r.ok < 10) bad++;
    });
    if (bad) {
        console.error(bad, 'region(s) had too few tiles — check network and retry.');
        process.exit(1);
    }
    console.log('Bootstrap OK —', results.length, 'region(s)');
}

main().catch((e) => {
    console.error(e.message || e);
    process.exit(1);
});
