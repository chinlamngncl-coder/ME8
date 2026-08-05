# -*- coding: utf-8 -*-
from pathlib import Path

p = Path(__file__).resolve().parents[1] / "public" / "index.html"
text = p.read_text(encoding="utf-8")

old = (
    '                <div id="ax-panel-anpr" class="ax-hub-panel" hidden>\n'
    '                    <p id="ax-anpr-status" class="ax-engine-health" aria-live="polite">&mdash;</p>\n'
    '                    <nav class="ax-anpr-subnav" aria-label="ANPR sections">'
)
new = (
    '                <div id="ax-panel-anpr" class="ax-hub-panel" hidden>\n'
    '                    <div class="ax-anpr-subnav-bar">\n'
    '                    <nav class="ax-anpr-subnav" aria-label="ANPR sections">'
)
if old not in text:
    raise SystemExit("ANPR panel start not found")
text = text.replace(old, new, 1)

close_old = (
    '                        <span id="ax-anpr-subnav-watch-badge" class="ax-anpr-subnav-watch-badge" aria-live="polite" hidden aria-hidden="true">0 Active Watchlist Hits</span>\n'
    '                    </nav>\n'
    '                    <div id="ax-anpr-sub-live-panel" class="ax-anpr-sub-panel" hidden>'
)
close_new = (
    '                        <span id="ax-anpr-subnav-watch-badge" class="ax-anpr-subnav-watch-badge" aria-live="polite" hidden aria-hidden="true">0 Active Watchlist Hits</span>\n'
    '                    </nav>\n'
    '                    <p id="ax-anpr-status" class="ax-engine-health" aria-live="polite">&mdash;</p>\n'
    '                    </div>\n'
    '                    <div id="ax-anpr-sub-live-panel" class="ax-anpr-sub-panel" hidden>'
)
if close_old not in text:
    raise SystemExit("ANPR subnav close not found")
text = text.replace(close_old, close_new, 1)

old_css = (
    '        .ax-hub-nav { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; flex-shrink: 0; }\n'
    '        .ax-hub-nav-primary { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }\n'
    '        .ax-hub-nav-fr-sub { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }\n'
    '        .ax-hub-nav-fr-sub[hidden] { display: none !important; }\n'
    '        .ax-hub-nav-btn { padding: 6px 12px; font-size: 11px; border-radius: 6px; border: 1px solid #475569; background: #1e293b; color: #cbd5e1; cursor: pointer; }\n'
    '        .ax-hub-nav-primary-btn { font-size: 1.15rem; font-weight: 500; padding: 2px 12px; line-height: 1.2; }\n'
    '        .ax-hub-nav-sub-btn { font-size: 11px; padding: 6px 12px; font-weight: 400; }'
)
new_css = (
    '        .ax-hub-nav { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; flex-shrink: 0; margin-bottom: 0; padding-bottom: 0; }\n'
    '        .ax-hub-nav-primary { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }\n'
    '        .ax-hub-nav-fr-sub { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-bottom: 0; }\n'
    '        .ax-hub-nav-fr-sub[hidden] { display: none !important; }\n'
    '        .ax-hub-nav-btn { font-family: var(--font-ui, inherit); padding: 6px 12px; font-size: 11px; border-radius: 6px; border: 1px solid #475569; background: #1e293b; color: #cbd5e1; cursor: pointer; }\n'
    '        .ax-hub-nav-primary-btn { font-family: var(--font-ui, inherit); font-size: 1.15rem; font-weight: 500; letter-spacing: 0.3px; padding: 2px 12px; line-height: 1.2; }\n'
    '        .ax-hub-nav-sub-btn { font-size: 11px; padding: 6px 12px; font-weight: 400; }'
)
if old_css not in text:
    raise SystemExit("hub nav css not found")
text = text.replace(old_css, new_css, 1)

text = text.replace(
    "global.css?v=20260804-hub-fr-nav-mag-v1",
    "global.css?v=20260804-anpr-nav-compact-v1",
    1,
)

p.write_text(text, encoding="utf-8")
print("patched", p)
