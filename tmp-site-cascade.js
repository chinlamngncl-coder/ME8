var fs = require('fs');
var p = 'C:/Users/user/Desktop/Enterprise Mobility/ME8/lib/siteDb.js';
var s = fs.readFileSync(p, 'utf8');
if (s.indexOf('deleteEvidenceFileCascade') < 0) {
  s = s.replace(
    "async function deleteEvidenceExport(id) {\n    return (await query('DELETE FROM evidence_exports WHERE export_id=$1', [String(id)])).rowCount > 0;\n}",
    "async function deleteEvidenceExport(id) {\n    return (await query('DELETE FROM evidence_exports WHERE export_id=$1', [String(id)])).rowCount > 0;\n}\n\n/** EVIDENCE-DELETE-QUEUE-7D-V1 — purge catalog row after queue window (disk unlink is caller). */\nasync function deleteEvidenceFileCascade(evidenceFileId) {\n    const id = String(evidenceFileId || '').trim();\n    if (!id) return false;\n    await query('DELETE FROM case_file_evidence WHERE evidence_file_id=$1', [id]);\n    try { await query('DELETE FROM evidence_attachments WHERE evidence_file_id=$1', [id]); } catch (_) { /* optional table */ }\n    await query('DELETE FROM evidence_downloads WHERE evidence_file_id=$1', [id]);\n    await query('DELETE FROM evidence_meta WHERE evidence_file_id=$1', [id]);\n    try { await query('DELETE FROM evidence_exports WHERE evidence_file_id=$1', [id]); } catch (_) { /* ignore */ }\n    const removed = await query('DELETE FROM evidence_files WHERE id=$1', [id]);\n    return removed.rowCount > 0;\n}"
  );
}
if (s.indexOf('deleteEvidenceFileCascade,') < 0) {
  s = s.replace(
    'deleteEvidenceExport, listNonFinalizedRedactExports',
    'deleteEvidenceExport, deleteEvidenceFileCascade, listNonFinalizedRedactExports'
  );
}
fs.writeFileSync(p, s);
console.log('cascade', s.indexOf('deleteEvidenceFileCascade') > 0);
