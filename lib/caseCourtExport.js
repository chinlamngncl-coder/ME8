/**
 * Court package ZIP for a case file — Incident_Report.html + Exhibits/.
 * STORE zip (no extra npm). Never puts OS paths in the archive names or HTML.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const evidenceRegistry = require('./evidenceRegistry');

const CRC_TABLE = (function () {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        t[n] = c >>> 0;
    }
    return t;
})();

function crc32(buf) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
}

function dosDateTime(d) {
    const dt = d instanceof Date ? d : new Date();
    const dosTime = (dt.getHours() << 11) | (dt.getMinutes() << 5) | Math.floor(dt.getSeconds() / 2);
    const dosDate = ((dt.getFullYear() - 1980) << 9) | ((dt.getMonth() + 1) << 5) | dt.getDate();
    return { dosTime: dosTime, dosDate: dosDate };
}

function u16(n) {
    const b = Buffer.alloc(2);
    b.writeUInt16LE(n & 0xFFFF, 0);
    return b;
}

function u32(n) {
    const b = Buffer.alloc(4);
    b.writeUInt32LE(n >>> 0, 0);
    return b;
}

function buildZip(entries) {
    const dos = dosDateTime(new Date());
    const locals = [];
    const centrals = [];
    let offset = 0;
    (entries || []).forEach(function (ent) {
        const name = Buffer.from(String(ent.name || 'file'), 'utf8');
        const data = Buffer.isBuffer(ent.data) ? ent.data : Buffer.from(ent.data || '');
        const crc = crc32(data);
        const local = Buffer.concat([
            Buffer.from([0x50, 0x4b, 0x03, 0x04]),
            u16(20),
            u16(0x0800),
            u16(0),
            u16(dos.dosTime),
            u16(dos.dosDate),
            u32(crc),
            u32(data.length),
            u32(data.length),
            u16(name.length),
            u16(0),
            name,
            data,
        ]);
        const central = Buffer.concat([
            Buffer.from([0x50, 0x4b, 0x01, 0x02]),
            u16(20),
            u16(20),
            u16(0x0800),
            u16(0),
            u16(dos.dosTime),
            u16(dos.dosDate),
            u32(crc),
            u32(data.length),
            u32(data.length),
            u16(name.length),
            u16(0),
            u16(0),
            u16(0),
            u16(0),
            u32(0),
            u32(offset),
            name,
        ]);
        locals.push(local);
        centrals.push(central);
        offset += local.length;
    });
    const centralBuf = Buffer.concat(centrals);
    const eocd = Buffer.concat([
        Buffer.from([0x50, 0x4b, 0x05, 0x06]),
        u16(0),
        u16(0),
        u16(entries.length),
        u16(entries.length),
        u32(centralBuf.length),
        u32(offset),
        u16(0),
    ]);
    return Buffer.concat(locals.concat([centralBuf, eocd]));
}

function htmlEsc(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function safeZipPart(s) {
    return String(s || 'file')
        .replace(/[^a-zA-Z0-9._-]+/g, '_')
        .replace(/^\.+/, '')
        .slice(0, 80) || 'file';
}

function typeLabel(type) {
    if (type === 'ai_report') return 'AI report';
    if (type === 'fr_hit') return 'FR hit';
    if (type === 'anpr_hit') return 'ANPR hit';
    return 'Media';
}

function exhibitBody(content) {
    const t = String(content || '');
    if (t.indexOf('hit:') === 0) {
        const i = t.indexOf('\n');
        return i >= 0 ? t.slice(i + 1) : '';
    }
    return t;
}

function parseApiUrl(raw) {
    const s = String(raw || '').trim();
    if (s.indexOf('/api/') !== 0) return null;
    const pathOnly = s.split('?')[0];
    let m = pathOnly.match(/^\/api\/evidence\/preview\/([^/]+)$/);
    if (m) return { kind: 'evidence', id: decodeURIComponent(m[1]) };
    m = pathOnly.match(/^\/api\/analytics\/fr\/crop\/([^/]+)$/);
    if (m) return { kind: 'fr', file: decodeURIComponent(m[1]) };
    m = pathOnly.match(/^\/api\/analytics\/anpr\/crop\/([^/]+)$/);
    if (m) return { kind: 'anpr', file: decodeURIComponent(m[1]) };
    m = pathOnly.match(/^\/api\/analytics\/weapon\/crop\/([^/]+)$/);
    if (m) return { kind: 'weapon', file: decodeURIComponent(m[1]) };
    return null;
}

function extFor(abs, fallback) {
    const e = path.extname(String(abs || '')).toLowerCase();
    if (e && e.length <= 8) return e;
    return fallback || '.bin';
}

function readIfFile(abs) {
    if (!abs) return null;
    try {
        if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return null;
        return fs.readFileSync(abs);
    } catch (_) {
        return null;
    }
}

function buildReportHtml(detail) {
    const cf = (detail && detail.caseFile) || {};
    const exhibits = Array.isArray(detail && detail.exhibits) ? detail.exhibits : [];
    const rows = exhibits.map(function (ex) {
        const n = ex.exhibitNumber || '';
        const body = exhibitBody(ex.content);
        return '<article class="ex">'
            + '<h2>E' + htmlEsc(String(n)) + ' — ' + htmlEsc(ex.title || typeLabel(ex.exhibitType)) + '</h2>'
            + '<p class="meta">' + htmlEsc(typeLabel(ex.exhibitType))
            + (ex.createdAt ? (' · ' + htmlEsc(String(ex.createdAt))) : '') + '</p>'
            + (body ? ('<pre>' + htmlEsc(body) + '</pre>') : '')
            + '</article>';
    }).join('\n');
    return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">'
        + '<title>Incident report ' + htmlEsc(cf.id || '') + '</title>'
        + '<style>'
        + 'body{font-family:Segoe UI,system-ui,sans-serif;color:#111;background:#fff;margin:24px;max-width:800px;}'
        + 'h1{font-size:20px;margin:0 0 8px;} h2{font-size:14px;margin:16px 0 4px;}'
        + '.meta{color:#444;font-size:12px;margin:0 0 12px;} pre{white-space:pre-wrap;font-size:13px;}'
        + '.ex{border-top:1px solid #ccc;padding-top:8px;} @media print{body{margin:12mm;}}'
        + '</style></head><body>'
        + '<h1>' + htmlEsc(cf.title || 'Incident report') + '</h1>'
        + '<p class="meta">Case ' + htmlEsc(cf.id || '')
        + (cf.officerName ? (' · Officer ' + htmlEsc(cf.officerName)) : '')
        + (cf.deviceId ? (' · Device ' + htmlEsc(cf.deviceId)) : '')
        + (cf.status ? (' · ' + htmlEsc(cf.status)) : '')
        + '</p>'
        + '<h2>Officer notes</h2>'
        + '<pre>' + htmlEsc(cf.narrative || '—') + '</pre>'
        + '<h2>Chronological timeline and exhibits</h2>'
        + (rows || '<p>No exhibits.</p>')
        + '</body></html>';
}

async function collectFiles(detail, deps) {
    const out = [];
    const seen = new Set();
    const exhibits = Array.isArray(detail && detail.exhibits) ? detail.exhibits : [];
    for (let i = 0; i < exhibits.length; i++) {
        const ex = exhibits[i];
        const n = 'E' + String(ex.exhibitNumber || (i + 1));
        const base = 'Exhibits/' + n + '_' + safeZipPart(ex.title || ex.exhibitType || 'exhibit');
        if (ex.exhibitType === 'ai_report' && ex.content) {
            out.push({ name: base + '.txt', data: Buffer.from(String(ex.content), 'utf8') });
        }
        const parsed = parseApiUrl(ex.fileUrl);
        if (!parsed) continue;
        let abs = null;
        let fallbackExt = '.jpg';
        if (parsed.kind === 'evidence') {
            const file = await evidenceRegistry.getFile(parsed.id);
            abs = file ? evidenceRegistry.resolveFilePath(file) : null;
            fallbackExt = extFor(file && file.fileName, '.bin');
        } else if (parsed.kind === 'fr' && deps.frCropPath) {
            abs = deps.frCropPath(parsed.file);
        } else if (parsed.kind === 'anpr' && deps.anprCropPath) {
            abs = deps.anprCropPath(parsed.file);
        } else if (parsed.kind === 'weapon' && deps.weaponCropPath) {
            abs = deps.weaponCropPath(parsed.file);
        }
        const buf = readIfFile(abs);
        if (!buf) continue;
        const key = String(abs);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ name: base + extFor(abs, fallbackExt), data: buf });
    }
    const evidence = Array.isArray(detail && detail.evidence) ? detail.evidence : [];
    for (let j = 0; j < evidence.length; j++) {
        const ev = evidence[j];
        if (!ev || ev.missing || !ev.evidenceFileId) continue;
        const file = await evidenceRegistry.getFile(ev.evidenceFileId);
        const abs = file ? evidenceRegistry.resolveFilePath(file) : null;
        const buf = readIfFile(abs);
        if (!buf) continue;
        const key = String(abs);
        if (seen.has(key)) continue;
        seen.add(key);
        const fn = safeZipPart(ev.fileName || ev.evidenceFileId);
        out.push({ name: 'Exhibits/Linked_' + fn, data: buf });
    }
    return out;
}

async function buildZipBuffer(detail, deps) {
    const files = [{ name: 'Incident_Report.html', data: Buffer.from(buildReportHtml(detail), 'utf8') }];
    const media = await collectFiles(detail, deps || {});
    // TODO (Pre-Ship Block): Implement AES-256 password encryption for Court ZIP exports once BWC/Dock AES architecture is finalized.
    return buildZip(files.concat(media));
}

module.exports = {
    buildZipBuffer: buildZipBuffer,
};
