#!/usr/bin/env node
/**
 * Rental setup — ensure vendor/llm model exists (copy path for shipping, optional download).
 * Usage: node scripts/prepare-centre-llm.js
 */
const fs = require('fs');
const path = require('path');
const centreLlm = require('../lib/centreLlm');

const root = path.join(__dirname, '..');
const vendorDest = centreLlm.vendorModelPath(root);
const quiet = process.argv.includes('--quiet');

function log(msg) {
    if (!quiet) console.log(msg);
}

function warn(msg) {
    if (!quiet) console.warn('[warn] ' + msg);
}

if (fs.existsSync(vendorDest)) {
    log('[ok] Centre Summary AI model bundled at vendor/llm/');
    process.exit(0);
}

if (process.env.FM_LLM_AUTO_DOWNLOAD === '0') {
    warn('Centre Summary AI model missing in vendor/llm/.');
    warn('Vendor: run scripts\\download-centre-llm.ps1 before shipping to customers.');
    process.exit(0);
}

log('Centre Summary AI model not bundled — downloading to vendor/llm/ (one-time)…');
centreLlm.downloadModelTo(vendorDest)
    .then(function () {
        log('[ok] Model saved to vendor/llm/ — include in customer packages.');
    })
    .catch(function (err) {
        warn('Could not download AI model: ' + err.message);
        warn('Run scripts\\download-centre-llm.ps1 with internet, then re-ship.');
        process.exit(1);
    });
