#!/usr/bin/env node
/**
 * Customer install verify — no lib/ imports, no internal paths in messages.
 */
'use strict';

const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const quiet = process.argv.includes('--quiet');
const root = path.join(__dirname, '..');

function ok(msg) {
  if (!quiet) console.log('[ok] ' + msg);
}

function fail(msg) {
  console.error('[fail] ' + msg);
  process.exit(1);
}

if (!fs.existsSync(path.join(root, 'run.js'))) {
  fail('run.js missing — use the Mobility Axiom delivery pack.');
}

if (!fs.existsSync(path.join(root, 'package.json'))) {
  fail('package.json missing');
}

const vendorFfmpeg = path.join(root, 'vendor', 'ffmpeg-lgpl', 'ffmpeg.exe');
if (!fs.existsSync(vendorFfmpeg)) {
  fail('Media engine not found in installation package — contact your vendor to re-issue the pack.');
}
ok('Media engine ready');

const nodeMajor = parseInt(process.versions.node.split('.')[0], 10);
if (nodeMajor < 18) fail('Node 18+ required (found ' + process.version + ')');
ok('Node ' + process.version);

const modelFile = String(process.env.FM_LLM_MODEL_FILE || 'qwen2.5-1.5b-instruct-q4_k_m.gguf').trim();
if (/qwen2\.5-3b/i.test(modelFile) || /qwen2\.5-72b/i.test(modelFile)) {
  fail('Centre Summary assistant model is not approved for this package — contact your vendor.');
}

const vendorModel = path.join(root, 'vendor', 'llm', modelFile);
const legacyBlocked = path.join(root, 'vendor', 'llm', 'qwen2.5-3b-instruct-q4_k_m.gguf');
if (fs.existsSync(legacyBlocked)) {
  fail('Remove legacy assistant model from install folder — contact your vendor for the current package.');
}
if (fs.existsSync(vendorModel)) {
  ok('Centre Summary AI model bundled');
} else if (!quiet) {
  console.warn('[warn] Centre Summary AI model not found in vendor/llm/');
}

const storage = path.join(root, 'storage');
if (!fs.existsSync(storage)) {
  fs.mkdirSync(storage, { recursive: true });
  ok('created storage/');
}

const licensePath = path.join(storage, 'platform-license.json');
if (process.env.FM_RENTAL_MODE === '1' || process.env.FM_LICENSE_REQUIRED === '1') {
  if (!fs.existsSync(licensePath)) {
    if (!quiet) console.warn('[warn] Trial license file missing in storage/');
  } else {
    try {
      const lic = JSON.parse(fs.readFileSync(licensePath, 'utf8'));
      if (lic.customerName) ok('platform license present — ' + lic.customerName);
      else ok('platform license present');
    } catch (_) {
      if (!quiet) console.warn('[warn] platform-license.json could not be read');
    }
  }
}

if (!quiet) console.log('\nMobility Axiom install check passed.\n');
