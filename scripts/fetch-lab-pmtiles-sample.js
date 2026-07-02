#!/usr/bin/env node
/**
 * Extract a Singapore bbox from the Protomaps daily build into data/gis/offline/pmtiles/.
 * Requires pmtiles CLI: https://github.com/protomaps/go-pmtiles/releases
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const OUT_DIR = path.join(__dirname, '..', 'data', 'gis', 'offline', 'pmtiles');
const OUT_FILE = path.join(OUT_DIR, 'singapore.pmtiles');
const BBOX = '103.6,1.15,104.1,1.48';
const BUILD_URL = process.env.PROTOMAPS_BUILD_URL || 'https://build.protomaps.com/20250618.pmtiles';

function main() {
    if (fs.existsSync(OUT_FILE) && fs.statSync(OUT_FILE).size > 4096) {
        console.log('PMTiles already present — skip:', OUT_FILE);
        return;
    }
    fs.mkdirSync(OUT_DIR, { recursive: true });

    const args = ['extract', BUILD_URL, OUT_FILE, `--bbox=${BBOX}`, '--maxzoom=14'];
    console.log('pmtiles', args.join(' '));
    const r = spawnSync('pmtiles', args, { stdio: 'inherit', shell: process.platform === 'win32' });

    if (r.error || r.status !== 0) {
        console.warn('');
        console.warn('PMTiles extract skipped — install pmtiles CLI, then re-run:');
        console.warn('  https://github.com/protomaps/go-pmtiles/releases');
        console.warn('  Or copy any .pmtiles file to:', OUT_DIR);
        console.warn('  Set PROTOMAPS_BUILD_URL if the default daily build URL expired.');
        process.exit(0);
    }
    console.log('PMTiles OK:', OUT_FILE);
}

main();
