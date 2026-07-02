#!/usr/bin/env node
/**
 * Vendor only — download Centre Summary AI model into vendor/llm/ before shipping to clients.
 * Usage: node scripts/download-centre-llm.js
 */
const path = require('path');
const centreLlm = require('../lib/centreLlm');

const root = path.join(__dirname, '..');
const dest = centreLlm.vendorModelPath(root);

console.log('Downloading Centre Summary AI model for customer packages…');
console.log('Target:', dest);

centreLlm.downloadModelTo(dest)
    .then(function () {
        console.log('\nDone. Include vendor/llm/ in your installer USB/ZIP.');
        console.log('Customers: no download — server copies on first start.');
    })
    .catch(function (err) {
        console.error('\nFailed:', err.message);
        process.exit(1);
    });
