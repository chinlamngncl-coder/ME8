'use strict';
const fs = require('fs');
const link = '<link rel="stylesheet" href="/css/global.css?v=20260723-global-ui-rollout-v1">';

function injectLink(file) {
  let s = fs.readFileSync(file, 'utf8');
  if (s.includes('global.css')) {
    console.log('already', file);
    return s;
  }
  if (s.includes('</title>')) s = s.replace('</title>', '</title>\n    ' + link);
  else s = s.replace('<head>', '<head>\n    ' + link);
  fs.writeFileSync(file, s);
  console.log('linked', file);
  return s;
}

// legal-notices
{
  let s = fs.readFileSync('public/legal-notices.html', 'utf8');
  s = s.replace(/<style>[\s\S]*?<\/style>\s*/, '');
  if (!s.includes('global.css')) s = s.replace('<title>', '  ' + link + '\n<title>');
  s = s.replace('<body>', '<body class="enterprise-legal">');
  s = s.replace('class="close-btn"', 'class="close-btn btn-secondary"');
  fs.writeFileSync('public/legal-notices.html', s);
  console.log('legal-notices ok');
}

[
  'public/command-centre.html',
  'public/command-wall.html',
  'public/live.html',
  'public/matrix.html',
  'public/test-seeta.html',
  'public/test-wvp-tile.html',
  'public/test-zlm.html',
].forEach(injectLink);

{
  let s = fs.readFileSync('public/command-centre.html', 'utf8');
  s = s.replace(/class="cs-btn"/g, 'class="cs-btn btn-secondary"');
  s = s.replace(/class="cs-btn cs-active"/g, 'class="cs-btn btn-primary cs-active"');
  s = s.replace(/class="cs-card /g, 'class="cs-card enterprise-card ');
  s = s.replace(/class="cs-card"/g, 'class="cs-card enterprise-card"');
  fs.writeFileSync('public/command-centre.html', s);
  console.log('command-centre classes');
}

{
  let s = fs.readFileSync('public/live.html', 'utf8');
  s = s.replace('id="btn-close"', 'id="btn-close" class="btn-primary"');
  s = s.replace('id="btn-play"', 'id="btn-play" class="btn-secondary"');
  s = s.replace('id="btn-stop"', 'id="btn-stop" class="btn-secondary"');
  s = s.replace('id="btn-mute"', 'id="btn-mute" class="btn-secondary"');
  s = s.replace('id="btn-call"', 'id="btn-call" class="btn-secondary"');
  fs.writeFileSync('public/live.html', s);
  console.log('live buttons');
}

{
  let s = fs.readFileSync('public/matrix.html', 'utf8');
  s = s.replace('id="btn-close"', 'id="btn-close" class="btn-primary"');
  fs.writeFileSync('public/matrix.html', s);
  console.log('matrix');
}

{
  let s = fs.readFileSync('public/command-wall.html', 'utf8');
  s = s.replace(/class="dr-preset-card"/g, 'class="dr-preset-card enterprise-card"');
  s = s.replace(/class="dr-monitor-card"/g, 'class="dr-monitor-card enterprise-card"');
  s = s.replace(/class="btn btn-action btn-sm"/g, 'class="btn btn-primary btn-action btn-sm"');
  s = s.replace(/class="btn btn-sm"/g, 'class="btn btn-secondary btn-sm"');
  s = s.replace('class="btn" id="dr-apply-sos"', 'class="btn btn-primary" id="dr-apply-sos"');
  fs.writeFileSync('public/command-wall.html', s);
  console.log('command-wall');
}

{
  let s = fs.readFileSync('public/index.html', 'utf8');
  s = s.replace(
    'global.css?v=20260723-ui-consolidation-v1',
    'global.css?v=20260723-global-ui-rollout-v1'
  );
  s = s.replace(
    'id="app-view-analytics" hidden',
    'id="app-view-analytics" class="enterprise-scope" hidden'
  );
  s = s.replace(
    'id="app-view-evidence" hidden',
    'id="app-view-evidence" class="enterprise-scope" hidden'
  );
  s = s.replace(
    'id="app-view-command-wall" hidden',
    'id="app-view-command-wall" class="enterprise-scope" hidden'
  );
  s = s.replace(
    'id="app-view-centre-summary" hidden',
    'id="app-view-centre-summary" class="enterprise-scope" hidden'
  );
  s = s.replace(
    'id="app-view-audit-trail" hidden',
    'id="app-view-audit-trail" class="enterprise-scope" hidden'
  );
  fs.writeFileSync('public/index.html', s);
  console.log('index scopes');
}

// verify
const files = fs.readdirSync('public').filter((f) => f.endsWith('.html'));
for (const f of files) {
  const s = fs.readFileSync('public/' + f, 'utf8');
  console.log(f, 'global=', s.includes('global.css'), 'style=', (s.match(/<style/g) || []).length);
}
