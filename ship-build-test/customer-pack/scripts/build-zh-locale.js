#!/usr/bin/env node
/**
 * Build public/locales/zh.json from en.json (Simplified Chinese).
 * Uses Google Translate gtx endpoint — run once before CN pack; requires network.
 * Usage: node scripts/build-zh-locale.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const LOCALE_DIR = path.join(__dirname, '..', 'public', 'locales');
const enPath = path.join(LOCALE_DIR, 'en.json');
const zhPath = path.join(LOCALE_DIR, 'zh.json');
const LOCK = new Set(['PTT', 'BWC', 'SIP', 'SOS', 'FTP', 'CSV', 'SD', 'HQ', 'LAN', 'VPN', 'ID', 'API', 'URL', 'HTTP', 'HTTPS', 'WebSocket', 'Docker', 'LiveKit', 'Node.js', 'IPv4', 'UDP', 'RTP', 'PDF', 'Android', 'Mobility Axiom', 'MobilityConference', 'Ubitron']);

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const existing = fs.existsSync(zhPath) ? JSON.parse(fs.readFileSync(zhPath, 'utf8')) : {};
const keys = Object.keys(en).sort();
const out = {};
let translated = 0;
let skipped = 0;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function protectTerms(text) {
  const placeholders = [];
  let s = String(text);
  LOCK.forEach((term) => {
    const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    s = s.replace(re, (m) => {
      const id = placeholders.length;
      placeholders.push(m);
      return `⟦${id}⟧`;
    });
  });
  return { s, placeholders };
}

function restoreTerms(text, placeholders) {
  return String(text).replace(/⟦(\d+)⟧/g, (_, i) => placeholders[Number(i)] || '');
}

function translateOne(text) {
  return new Promise((resolve, reject) => {
    const q = encodeURIComponent(text);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=${q}`;
    https.get(url, { headers: { 'User-Agent': 'MobilityC2-i18n-build/1.0' } }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          const parts = (parsed[0] || []).map((row) => row[0]).join('');
          resolve(parts || text);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('Building zh.json from', keys.length, 'keys...');
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    const src = en[k];
    if (existing[k] && existing[k] !== en[k] && existing[k] !== src) {
      out[k] = existing[k];
      skipped++;
      continue;
    }
    if (!src || typeof src !== 'string' || !src.trim()) {
      out[k] = src;
      continue;
    }
    if (/^[\d\s.,:;|{}/\-+()%©®™]+$/.test(src) || src.length < 2) {
      out[k] = src;
      continue;
    }
    const { s, placeholders } = protectTerms(src);
    try {
      const tr = await translateOne(s);
      out[k] = restoreTerms(tr, placeholders);
      translated++;
    } catch (e) {
      console.warn('fallback en for', k, e.message);
      out[k] = src;
    }
    if ((i + 1) % 50 === 0) {
      console.log('  ', i + 1, '/', keys.length);
      await sleep(400);
    } else {
      await sleep(120);
    }
  }
  const sorted = {};
  Object.keys(out).sort().forEach((k) => { sorted[k] = out[k]; });
  fs.writeFileSync(zhPath, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
  console.log('Wrote', zhPath, '— translated:', translated, 'kept:', skipped);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
