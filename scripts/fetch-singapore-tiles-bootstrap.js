#!/usr/bin/env node
/**
 * @deprecated Use fetch-offline-tiles-bootstrap.js --region sg
 */
'use strict';
const { spawnSync } = require('child_process');
const r = spawnSync(process.execPath, [require('path').join(__dirname, 'fetch-offline-tiles-bootstrap.js'), '--region', 'sg'], {
    stdio: 'inherit',
});
process.exit(r.status || 0);
