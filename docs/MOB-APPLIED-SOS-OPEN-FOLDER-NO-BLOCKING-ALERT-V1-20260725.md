# MOB-APPLIED — SOS open folder: no blocking alert

**Date:** 2026-07-25  
**MOB:** `SOS-OPEN-FOLDER-NO-BLOCKING-ALERT-V1`  
**Disc:** `MOB-DISC-SOS-BLOCKING-ALERT-BLOCKS-NEW-SOS-20260725.md`  
**Operator:** **PASS** (2026-07-25)

## Why

`alert()` after **Server folder (admin)** / storage open froze the dashboard tab until OK. A new BWC SOS could look silent on that tab while the dialog was open.

## Change

| Before | After |
|--------|--------|
| `alert(…openedLocal / openFolderManual / openFailed…)` | `AdminActionBus.toast(…, 7000)` via `notifyFolderOpenNonBlocking` |
| Same for storage `openStorageFolder` | Same non-blocking toast |

- Live: `public/index.html`  
- Mirror: `public/js/dashboard-boot.js`  
- Toast CSS: slightly wider + `pre-wrap` / `word-break` so paths remain readable  

Explorer spawn (SEC 1.2) **unchanged**.

## Out of scope

- Other `alert()` / `confirm()` elsewhere (clear list, kill switch, etc.)  
- SEC 1.3–1.5  

## Operator smoke

1. **Ctrl+F5** (hard refresh) after Fleet is up  
2. Open an SOS incident → **Server folder (admin)**  
3. Expect: Explorer opens + bottom toast with path — **no** OK dialog that freezes the page  
4. Leave the toast alone (do not need to click) → press SOS on BWC  
5. Expect: SOS UI still updates on this tab  

Say **PASS** or **FAIL**.

## Next

After PASS: resume SEC Phase 1 — confirm **1.2** PASS if not already, then **Task 1.3** only (`SEC-EVIDENCE-UPLOAD-FREE-DISK-V1`).
