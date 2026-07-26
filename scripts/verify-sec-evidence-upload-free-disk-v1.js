'use strict';

/**
 * SEC Phase 1.3 — Evidence upload free-disk gate before multer
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const runJs = fs.readFileSync(path.join(root, 'run.js'), 'utf8');

function assertFreeDiskGate(src, label) {
    assert.ok(/async function requireFreeDiskSpace\s*\(/.test(src), label + ' requireFreeDiskSpace');
    assert.ok(/fs\.promises\.statfs\s*\(\s*FTP_ROOT\s*\)/.test(src), label + ' statfs(FTP_ROOT)');
    assert.ok(/stats\.bfree/.test(src) && /stats\.bsize/.test(src), label + ' bfree * bsize');
    assert.ok(/5\s*\*\s*1024\s*\*\s*1024\s*\*\s*1024/.test(src), label + ' 5 GB min');
    assert.ok(/status\s*\(\s*507\s*\)/.test(src), label + ' HTTP 507');
    assert.ok(
        /app\.post\(\s*['"]\/api\/evidence\/upload['"][\s\S]{0,900}?requireFreeDiskSpace[\s\S]{0,200}?httpsUploadMiddleware\.single\s*\(\s*['"]file['"]\s*\)/.test(src),
        label + ' upload: requireFreeDiskSpace before multer'
    );
}

assertFreeDiskGate(server, 'server');
assertFreeDiskGate(runJs, 'run');

console.log('[ok] verify-sec-evidence-upload-free-disk-v1');
