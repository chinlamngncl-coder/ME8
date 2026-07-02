/**
 * AES-256-GCM encrypted evidence export with super-admin approval queue.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const siteDb = require('./siteDb');
const evidenceRegistry = require('./evidenceRegistry');

const MAGIC = Buffer.from('MAXM');
const FORMAT_VERSION = 1;
const DOWNLOAD_TOKEN_MS = 24 * 60 * 60 * 1000;
const PASS_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

let storageDir = null;
let exportRoot = null;

function init(dir) {
    storageDir = dir;
    exportRoot = path.join(dir, 'secure-exports');
    fs.mkdirSync(exportRoot, { recursive: true });
    siteDb.init(dir);
}

function secureExportEnabled() {
    return process.env.FM_EVIDENCE_SECURE_EXPORT !== '0';
}

function newRequestId() {
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return 'SE-' + stamp + '-' + crypto.randomBytes(4).toString('hex');
}

function generatePassphrase() {
    const groups = [];
    for (let g = 0; g < 4; g++) {
        let part = '';
        for (let i = 0; i < 4; i++) {
            part += PASS_CHARS[crypto.randomInt(PASS_CHARS.length)];
        }
        groups.push(part);
    }
    return groups.join('-');
}

function deriveKey(passphrase, salt) {
    return crypto.scryptSync(String(passphrase), salt, 32);
}

function encryptFileToMobilityAes(inputPath, outputPath, passphrase, originalName) {
    const salt = crypto.randomBytes(16);
    const key = deriveKey(passphrase, salt);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const input = fs.readFileSync(inputPath);
    const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);
    const tag = cipher.getAuthTag();
    const header = JSON.stringify({
        v: FORMAT_VERSION,
        originalName: originalName || path.basename(inputPath),
        algorithm: 'aes-256-gcm',
        salt: salt.toString('hex'),
    });
    const headerLen = Buffer.alloc(4);
    headerLen.writeUInt32BE(Buffer.byteLength(header, 'utf8'), 0);
    const payload = Buffer.concat([
        MAGIC,
        Buffer.from([FORMAT_VERSION]),
        headerLen,
        Buffer.from(header, 'utf8'),
        iv,
        tag,
        encrypted,
    ]);
    fs.writeFileSync(outputPath, payload);
    return payload.length;
}

function createRequest(session, fileId, reason, clientIp) {
    if (!secureExportEnabled()) {
        throw new Error('Protected export is not enabled on this site.');
    }
    const file = siteDb.getEvidenceFile(fileId);
    if (!file) throw new Error('Evidence file not found.');
    const fullPath = evidenceRegistry.resolveFilePath(file);
    if (!fullPath) throw new Error('File is not available on storage.');
    if (session && session.userId) {
        const pending = siteDb.countPendingSecureExportsForUser(session.userId, fileId);
        if (pending > 0) throw new Error('An export request for this file is already awaiting review.');
    }
    const requestId = newRequestId();
    const now = new Date().toISOString();
    siteDb.insertSecureExportRequest({
        requestId,
        evidenceFileId: file.id,
        requestedBy: session ? session.username : null,
        requesterUserId: session ? session.userId : null,
        requesterRole: session ? session.role : null,
        reason: reason ? String(reason).trim().slice(0, 500) : null,
        status: 'pending',
        requestedAt: now,
        clientIp: clientIp || null,
    });
    return {
        requestId,
        fileId: file.id,
        fileName: file.fileName,
        status: 'pending',
        requestedAt: now,
    };
}

function listRequests(opts) {
    return siteDb.listSecureExportRequests(opts);
}

function listPending() {
    return siteDb.listSecureExportRequests({ status: 'pending', limit: 100 });
}

function approveRequest(requestId, session, clientIp) {
    const req = siteDb.getSecureExportRequest(requestId);
    if (!req) throw new Error('Request not found.');
    if (req.status !== 'pending') throw new Error('This request has already been reviewed.');
    const file = siteDb.getEvidenceFile(req.evidenceFileId);
    if (!file) throw new Error('Evidence file not found.');
    const fullPath = evidenceRegistry.resolveFilePath(file);
    if (!fullPath) throw new Error('File is not available on storage.');
    const passphrase = generatePassphrase();
    const encName = path.basename(file.fileName, path.extname(file.fileName)) + '.mobility.aes';
    const encPath = path.join(exportRoot, requestId + '.mobility.aes');
    const byteSize = encryptFileToMobilityAes(fullPath, encPath, passphrase, file.fileName);
    const now = new Date();
    const downloadExpiresAt = new Date(now.getTime() + DOWNLOAD_TOKEN_MS).toISOString();
    const updated = siteDb.updateSecureExportRequest(requestId, {
        status: 'approved',
        reviewedBy: session ? session.username : null,
        reviewerUserId: session ? session.userId : null,
        reviewedAt: now.toISOString(),
        encryptedPath: path.relative(storageDir, encPath).replace(/\\/g, '/'),
        encryptedFileName: encName,
        byteSize,
        downloadExpiresAt,
    });
    return {
        request: updated,
        passphrase,
        downloadUrl: '/api/evidence/secure-export/stream/' + encodeURIComponent(requestId),
        downloadExpiresAt,
        clientIp: clientIp || null,
    };
}

function denyRequest(requestId, session, denyReason) {
    const req = siteDb.getSecureExportRequest(requestId);
    if (!req) throw new Error('Request not found.');
    if (req.status !== 'pending') throw new Error('This request has already been reviewed.');
    return siteDb.updateSecureExportRequest(requestId, {
        status: 'denied',
        reviewedBy: session ? session.username : null,
        reviewerUserId: session ? session.userId : null,
        reviewedAt: new Date().toISOString(),
        denyReason: denyReason ? String(denyReason).trim().slice(0, 500) : null,
    });
}

function resolveStreamDownload(requestId, session) {
    const req = siteDb.getSecureExportRequest(requestId);
    if (!req) return { error: 'Request not found.', status: 404 };
    if (req.status !== 'approved') return { error: 'This export has not been approved.', status: 403 };
    if (req.consumedAt) return { error: 'This download was already used. Submit a new request.', status: 410 };
    if (req.downloadExpiresAt && Date.parse(req.downloadExpiresAt) < Date.now()) {
        return { error: 'Download period has ended. Submit a new request.', status: 410 };
    }
    const isSuper = session && session.role === 'super_admin';
    const isRequester = session && req.requesterUserId && session.userId === req.requesterUserId;
    if (!isSuper && !isRequester) {
        return { error: 'This export belongs to another user.', status: 403 };
    }
    if (!req.encryptedPath) return { error: 'Protected export file is unavailable.', status: 404 };
    const fullPath = path.join(storageDir, req.encryptedPath);
    const norm = path.normalize(fullPath);
    if (!norm.startsWith(path.normalize(exportRoot))) return { error: 'Export could not be opened.', status: 500 };
    if (!fs.existsSync(norm)) return { error: 'Protected export file is unavailable.', status: 404 };
    return { req, fullPath, fileName: req.encryptedFileName || (requestId + '.mobility.aes') };
}

function markConsumed(requestId) {
    siteDb.updateSecureExportRequest(requestId, {
        consumedAt: new Date().toISOString(),
        status: 'consumed',
    });
}

module.exports = {
    init,
    secureExportEnabled,
    createRequest,
    listRequests,
    listPending,
    approveRequest,
    denyRequest,
    resolveStreamDownload,
    markConsumed,
    DOWNLOAD_TOKEN_MS,
    encryptFileToMobilityAes,
    deriveKey,
    FORMAT_VERSION,
    MAGIC,
};
