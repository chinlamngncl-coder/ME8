/**
 * Coded runbooks — structured troubleshooting for engineer diagnostics UI.
 * Source files live in docs/runbooks/ (shipped with app; API requires engineer session).
 */

const fs = require('fs');
const path = require('path');

const RUNBOOKS_DIR = path.join(__dirname, '..', 'docs', 'runbooks');

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function listRunbooks() {
    const indexPath = path.join(RUNBOOKS_DIR, 'index.json');
    if (!fs.existsSync(indexPath)) return [];
    const index = readJson(indexPath);
    const ids = Array.isArray(index.runbooks) ? index.runbooks : [];
    return ids.map((id) => {
        const filePath = path.join(RUNBOOKS_DIR, `${id}.json`);
        if (!fs.existsSync(filePath)) {
            return { id, title: id, missing: true };
        }
        const rb = readJson(filePath);
        return {
            id: rb.id || id,
            title: rb.title || id,
            severity: rb.severity || 'medium',
            symptoms: rb.symptoms || [],
        };
    });
}

function getRunbook(id) {
    const safeId = String(id || '').trim().replace(/[^a-z0-9-]/gi, '');
    if (!safeId) return null;
    const filePath = path.join(RUNBOOKS_DIR, `${safeId}.json`);
    if (!fs.existsSync(filePath)) return null;
    return readJson(filePath);
}

module.exports = { listRunbooks, getRunbook, RUNBOOKS_DIR };
