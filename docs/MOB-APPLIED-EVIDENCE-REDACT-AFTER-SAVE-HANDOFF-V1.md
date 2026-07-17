# MOB APPLIED — mob-evidence-redact-after-save-handoff-v1

**Date:** 2026-07-17 ~01:21  
**Files:** `public/js/evidence-hub.js` · `public/index.html` · `public/locales/en.json`  
**Cache:** `evidence-hub.js?v=20260717-redact-after-save-handoff`

---

## Bug fixed

Finalize / note panel lived **inside** `#ev-redact-mark-panel`. Success hid mark → Finalize stayed invisible → Save re-enabled → burn-again loop.

---

## What changed

| Change | Detail |
|--------|--------|
| DOM | mark-panel · mark-footer (Save) · note-panel are **siblings** |
| Rebuild gate | Old dialog rebuilt if note nested under mark (`data-redact-handoff=v1`) |
| Success | Hide mark + Save footer → show note + green **Redacted copy ready** + Finalize |
| Fail | Stay on mark; error on progress; Save re-armed once |
| Success finally | **Does not** re-enable Save (no double-burn) |
| Close / Finalize | Reload detail + scroll to **Prior exports** (`#ev-prior-exports`) |

---

## You (one hard refresh)

1. Hard refresh dashboard (Ctrl+F5) so cache bust loads.  
2. Open Evidence → Redact → Auto face-follow → **Save once** → wait.  
3. Pass = screen switches to **Redaction description** with **Finalize & register** (and ready line).  
4. Finalize → detail shows **Prior exports** `[Redacted]` → **Download** when Finalized.  
5. Fail = still stuck on Save after burn → tell agent.

Do **not** press Save again after a successful burn.

---

## One line

**After-Save handoff fixed: Finalize shows after one Save; no nested hide; no Save re-arm loop.**
