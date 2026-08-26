/**
 * Parse Ubitron_Sorter.exe stdout lines and stamp catalog sort_type.
 * Never returns OS paths to callers.
 */
'use strict';

const path = require('path');
const siteDb = require('./siteDb');

function basenameOnly(raw) {
    return path.basename(String(raw || '').replace(/\\/g, '/')).slice(0, 240);
}

function normalizeClass(raw) {
    const s = String(raw || '').toLowerCase().trim();
    if (!s) return '';
    if (s === 'face' || s.indexOf('face') !== -1 || s === 'fr') return 'face';
    if (s === 'person' || s === 'human' || s === 'pedestrian' || s === 'body'
        || s.indexOf('full body') !== -1 || s.indexOf('full-body') !== -1
        || s.indexOf('fullbody') !== -1 || s.indexOf('human') !== -1
        || s.indexOf('person') !== -1 || s.indexOf('pedestrian') !== -1
        || (s.indexOf('body') !== -1 && s.indexOf('car') === -1)) return 'face';
    if (s === 'car' || s.indexOf('car') !== -1 || s.indexOf('vehicle') !== -1
        || s === 'lpr' || s === 'anpr' || s.indexOf('plate') !== -1) return 'car';
    return 'other';
}

function parseLine(line) {
    const t = String(line || '').trim();
    if (!t) return null;
    let obj = null;
    try {
        obj = JSON.parse(t);
    } catch (_) { /* text line */ }
    if (obj && typeof obj === 'object') {
        const fileName = basenameOnly(
            obj.fileName || obj.file_name || obj.filename || obj.name || obj.file
            || obj.path || obj.rel || ''
        );
        const sortType = normalizeClass(
            obj.sortType || obj.sort_type || obj.class || obj.label || obj.type
            || obj.category || obj.result || obj.cls
        );
        if (!fileName || !sortType) return null;
        return { fileName: fileName, sortType: sortType };
    }
    const parts = t.split(/[\t,|;]+/);
    if (parts.length >= 2) {
        const fileName = basenameOnly(parts[0].replace(/^["']|["']$/g, ''));
        const sortType = normalizeClass(parts[1]);
        if (!fileName || !sortType) return null;
        return { fileName: fileName, sortType: sortType };
    }
    const m = t.match(/^(.+?)\s+(face|car|vehicle|person|other|others)\s*$/i);
    if (!m) return null;
    return { fileName: basenameOnly(m[1]), sortType: normalizeClass(m[2]) };
}

async function applyLine(line) {
    const parsed = parseLine(line);
    if (!parsed || !siteDb.isReady()) return null;
    const row = await siteDb.findEvidenceByFileName(parsed.fileName);
    if (!row || !row.id) return null;
    await siteDb.setEvidenceSortType(row.id, parsed.sortType);
    return { evidenceId: row.id, sortType: parsed.sortType, fileName: parsed.fileName };
}

function attachStdout(child, onSorted) {
    if (!child || !child.stdout) return;
    let buf = '';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', function (chunk) {
        buf += String(chunk || '');
        const parts = buf.split(/\r?\n/);
        buf = parts.pop() || '';
        parts.forEach(function (line) {
            applyLine(line).then(function (hit) {
                if (hit && typeof onSorted === 'function') onSorted(hit);
            }).catch(function () { /* ignore bad line */ });
        });
    });
}

module.exports = { attachStdout, parseLine };
