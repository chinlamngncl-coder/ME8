#!/usr/bin/env node
/**
 * Bootstrap offline raster tiles for Beijing metro (OSM, WGS84).
 * Dev/lab use — for production China packs use Planetiler + Geofabrik (see BUILD-CHINA-OFFLINE-TILES.ps1).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..', 'data', 'gis', 'offline', 'tiles');
const MIN_Z = 3;
const MAX_Z = 12;
// Beijing metro bbox (WGS84)
const BBOX = { west: 115.8, south: 39.4, east: 117.0, north: 40.2 };
const UA = 'MobilityC2-offline-bootstrap/1.0 (dev pack; contact operator)';

function lon2tile(lon, z) {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, z));
}

function lat2tile(lat, z) {
  const r = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * Math.pow(2, z));
}

function tileRange(z) {
  const xMin = lon2tile(BBOX.west, z);
  const xMax = lon2tile(BBOX.east, z);
  const yMin = lat2tile(BBOX.north, z);
  const yMax = lat2tile(BBOX.south, z);
  const list = [];
  for (let x = xMin; x <= xMax; x++) {
    for (let y = yMin; y <= yMax; y++) list.push({ z, x, y });
  }
  return list;
}

function fetchTile(z, x, y) {
  const host = 'abc'[((x + y) % 3)];
  const url = `https://${host}.tile.openstreetmap.org/${z}/${x}/${y}.png`;
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': UA } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        const loc = res.headers.location;
        if (!loc) return reject(new Error('redirect missing'));
        https.get(loc, { headers: { 'User-Agent': UA } }, (res2) => {
          const chunks = [];
          res2.on('data', (c) => chunks.push(c));
          res2.on('end', () => resolve(Buffer.concat(chunks)));
        }).on('error', reject);
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error('HTTP ' + res.statusCode));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
    req.setTimeout(30000, () => req.destroy(new Error('timeout')));
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const jobs = [];
  for (let z = MIN_Z; z <= MAX_Z; z++) jobs.push(...tileRange(z));
  console.log('Fetching', jobs.length, 'tiles (z', MIN_Z, '-', MAX_Z, 'Beijing)...');
  let ok = 0;
  let fail = 0;
  for (let i = 0; i < jobs.length; i++) {
    const { z, x, y } = jobs[i];
    const dir = path.join(ROOT, String(z), String(x));
    const file = path.join(dir, y + '.png');
    if (fs.existsSync(file) && fs.statSync(file).size > 200) {
      ok++;
      continue;
    }
    fs.mkdirSync(dir, { recursive: true });
    try {
      const buf = await fetchTile(z, x, y);
      fs.writeFileSync(file, buf);
      ok++;
    } catch (e) {
      fail++;
      console.warn('skip', z, x, y, e.message);
    }
    if ((i + 1) % 25 === 0) console.log(' ', i + 1, '/', jobs.length, 'ok', ok, 'fail', fail);
    await sleep(180);
  }
  console.log('Done — ok:', ok, 'fail:', fail, 'root:', ROOT);
  if (ok < 10) {
    console.error('Too few tiles — check network and retry.');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
