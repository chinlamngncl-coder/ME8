/**
 * Target A: restore Server Config shell CSS in index.html from ec0296d pristine.
 * Does NOT strip SSL HTML, SaaS data attrs, or non-Settings code.
 */
const fs = require('fs');
const path = require('path');

const appRoot = process.cwd();
const curPath = path.join(appRoot, 'public', 'index.html');
const pristinePath = path.join(process.env.TEMP, 'me8-a-index.html');

let cur = fs.readFileSync(curPath, 'utf8');
const pristine = fs.readFileSync(pristinePath, 'utf8');

function normNl(s) {
  return s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function extractBetween(src, startIncl, endExcl) {
  const s = src.indexOf(startIncl);
  if (s < 0) throw new Error('START not found: ' + startIncl.slice(0, 80));
  const e = src.indexOf(endExcl, s);
  if (e < 0) throw new Error('END not found after: ' + startIncl.slice(0, 80));
  return { s, e, text: src.slice(s, e) };
}

function replaceBetween(hay, startIncl, endExcl, newMid) {
  const { s, e } = extractBetween(hay, startIncl, endExcl);
  return hay.slice(0, s) + newMid + hay.slice(e);
}

// Work in LF for matching, write back with original style (prefer CRLF if file had it)
const hadCRLF = cur.includes('\r\n');
cur = normNl(cur);
const pris = normNl(pristine);

// --- 1) app-view-server … workspace (strip ULTIMATE unlock) ---
{
  const start = '        #app-view-server {';
  const end = '        /* HELP-ABOUT-CENTER-V1 */';
  const p = extractBetween(pris, start, end).text;
  cur = replaceBetween(cur, start, end, p);
  console.log('OK workspace shell');
}

// --- 2) #server-setup-panel shell through .ss-setup-head-top ---
{
  const start = '        #server-setup-panel {';
  // There may be comments before it now — find the panel rule that has height/flex
  // Prefer the one after .ss-role-badge-ui.operator
  const anchor = '        .ss-role-badge-ui.operator { background: #334155; color: #cbd5e1; }\n';
  const pAnchor = pris.indexOf(anchor);
  const cAnchor = cur.indexOf(anchor);
  if (pAnchor < 0 || cAnchor < 0) throw new Error('role badge anchor missing');

  // Remove any Target A / surgical / ultimate comment lines immediately before #server-setup-panel after anchor
  const cAfter = cur.slice(cAnchor + anchor.length);
  const pAfter = pris.slice(pAnchor + anchor.length);

  const pPanelStart = pAfter.indexOf('        #server-setup-panel {');
  const cPanelStart = cAfter.search(/\s*\/\* CSS-[^*]*\*\/\s*(?=#server-setup-panel \{)|        #server-setup-panel \{/);
  // Simpler: find #server-setup-panel { in after-anchor region
  const pIdx = pAfter.indexOf('        #server-setup-panel {');
  const cIdx = cAfter.indexOf('        #server-setup-panel {');
  // If comment precedes in current, include from comment
  let cFrom = cIdx;
  const commentMatch = cAfter.slice(0, cIdx).match(/(\/\* CSS-[\s\S]*?\*\/\s*)$/);
  if (commentMatch) cFrom = cIdx - commentMatch[1].length;

  const pEndRel = pAfter.indexOf('        .ss-setup-head-top {', pIdx);
  const cEndRel = cAfter.indexOf('        .ss-setup-head-top {', cIdx);
  if (pIdx < 0 || cIdx < 0 || pEndRel < 0 || cEndRel < 0) throw new Error('panel block bounds');

  const pristinePanel = pAfter.slice(pIdx, pEndRel);
  cur =
    cur.slice(0, cAnchor + anchor.length + cFrom) +
    pristinePanel +
    cur.slice(cAnchor + anchor.length + cEndRel);
  console.log('OK panel shell');
}

// --- 3) .ss-panel-scroll + table wrap max-heights (pristine) ---
{
  const start = '        .ss-panel-scroll {';
  // Replace single-line / multi through next unique rule
  const pStart = pris.indexOf(start, pris.indexOf('#server-setup-panel {'));
  const cStart = cur.indexOf(start, cur.indexOf('#server-setup-panel {'));
  // Take until .ss-network-grid { after panel section
  const endMark = '        .ss-network-grid { display: grid;';
  const pEnd = pris.indexOf(endMark, pStart);
  const cEnd = cur.indexOf(endMark, cStart);
  if (pStart < 0 || cStart < 0 || pEnd < 0 || cEnd < 0) throw new Error('scroll/table block');
  cur = cur.slice(0, cStart) + pris.slice(pStart, pEnd) + cur.slice(cEnd);
  console.log('OK scroll + table wraps');
}

// --- 4) server-setup-actions through protocol tabs / config-body ---
{
  // From #server-setup-panel .server-setup-actions { to .ss-main-panel {
  const start = '        #server-setup-panel .server-setup-actions {';
  const end = '        .ss-main-panel { display: none; }';
  const p = extractBetween(pris, start, end).text;
  // Current may have surgical comments — find start
  if (!cur.includes(start)) throw new Error('actions start missing in current');
  cur = replaceBetween(cur, start, end, p);
  console.log('OK actions + nav + body + content');
}

// --- 5) Kill leftover ultimate/surgical content-limit blocks if any remain ---
cur = cur.replace(/\n\s*\/\* CSS-ULTIMATE-UNIFICATION-AND-BLEED:[^*]*\*\/\n(?:[^\n]*\n){0,12}/g, '\n');
cur = cur.replace(/\n\s*\/\* CSS-SURGICAL-CONTENT-LIMIT:[^*]*\*\/\n(?:[^\n]*\n){0,12}/g, '\n');
cur = cur.replace(/\n\s*\/\* CSS-FULL-RESET-AND-SAFE-WRAP:[^*]*\*\/\n(?:[^\n]*\n){0,8}/g, '\n');

// Remove stray max-width 1000 on config-content / panel-scroll if still present
cur = cur.replace(
  /        \/\* CSS-ULTIMATE[^*]*\*\/\n        \.ss-config-content \{[\s\S]*?\n        \}\n(?:        #ss-panel-scroll\.ss-panel-scroll \{[\s\S]*?\n        \}\n)?/g,
  ''
);

// Ensure .ss-config-content is pristine if still wrong
{
  const re = /        \.ss-config-content \{[^}]+\}/;
  const pMatch = pris.match(/        \.ss-config-content \{[^}]+\}/);
  if (pMatch && re.test(cur)) {
    cur = cur.replace(re, pMatch[0]);
    console.log('OK ss-config-content');
  }
}

// --- 6) Cache bust unify link ---
if (!/settings-theme-unify\.css\?v=/.test(cur)) throw new Error('unify link missing');
cur = cur.replace(
  /settings-theme-unify\.css\?v=[^"]+/,
  'settings-theme-unify.css?v=20260726-target-a-ui-theme-fallback-v1'
);
console.log('OK cache bust');

// --- 7) Safety: SSL HTML + saas attrs must remain ---
for (const must of ['id="ss-section-ssl"', 'id="ss-ssl-cert"', 'data-ss-saas-hide', 'ss-config-nav', 'ss-panel-scroll']) {
  if (!cur.includes(must)) throw new Error('SAFETY FAIL missing ' + must);
}
console.log('OK safety markers');

if (hadCRLF) cur = cur.replace(/\n/g, '\r\n');
fs.writeFileSync(curPath, cur, 'utf8');
console.log('WROTE public/index.html');
