# MOB DISC — Evidence detail Download · custody raw JSON · where finalized exports live

**Date:** 2026-07-17  
**Status:** Paper only — discuss · **no APPLY**  
**Operator screenshot:** Prior exports + Custody trail + bottom blue **Download**  
**Rules:** No raw codes in operator-facing explanation / custody info

---

## 1) Bottom blue **Download** — what is it?

**It downloads the original evidence file** (the clip you opened), not the redacted export.

| Control | What you get |
|---------|----------------|
| Bottom **Download** (`#ev-detail-download`) | **Original** recording via `requestDownload` / evidence download API |
| Prior exports row link **Download** | **That export** (redacted / trim) via `export-stream/{exportId}` — only when finalized for redact |

So your read is correct: same original you already could take from the list / previous step. On the redact detail screen it **duplicates** and confuses people who want the redacted copy.

### Proposal (when you APPLY)

**`mob-evidence-detail-hide-original-download-v1`**

- Hide or remove the bottom original **Download** on evidence detail when the useful action is Prior exports (especially after redact work)  
- Or rename it clearly: **Download original** — only if legal still wants one-click original on detail  
- Keep Prior exports **Download** as the only “get the redacted file” control  

Default lean: **take it off** (or hide for normal redact flow) to stop confusion — you said remove.

---

## 2) Custody trail still shows raw codes — FAIL vs our rule

Screenshot line under **Evidence Redact Autoface**:

`{"regions":6,"sampled":135,"preview":"tight-sample","faceFollow":true,...}`

**Cause:** `lib/auditActionLabels.js` → `formatDetailSummary`. Known fields become words (`Mode: face-follow`). Anything else (autoface detail: regions / sampled / engine…) falls through to **`JSON.stringify(detail)`** — raw dump. That violates “explanation = words, no raw codes.”

### Proposal (when you APPLY)

**`mob-evidence-custody-redact-words-v1`**

- Map redact / autoface details to plain lines, e.g.  
  - “Auto face tracking · 6 areas · 135 samples · tight preview”  
  - No brand/engine JSON in the trail  
- Never fall back to raw JSON for `evidence.redact_*` actions (empty or short words only)

No need to explain engine brands in the trail.

---

## 3) Finalized Prior exports — where is the file? Search for super-admin?

### On disk (server PC)

`ME8\storage\evidence-exports\{evidenceFileId}\…_redacted_….mp4`  
(same as `MOB-DISC-REDACT-WHERE-DOES-IT-GO.md`)

Original stays in normal evidence storage — **unchanged**.

### In the app today

| Place | What |
|-------|------|
| **Same evidence detail → Prior exports** | List of exports · **Finalized** · row **Download** |
| Evidence list / library search | Finds the **original** clip — **not** a separate “all redacted exports” browser |
| Super-admin special “export search” page | **Does not exist today** |

So: **click path for the redacted file = open that evidence → Prior exports → Download.**  
There is **no** second hub today to search “all finalized redacts across cases.” Disk folder is ops/IT; operator path is Prior exports.

### If you want a search place later (named MOB, not now)

**`mob-evidence-exports-browser-v1`** (super-admin) — list/search finalized exports across files. Only if you ask; not inventing now.

---

## Named MOB queue (evidence UX — you APPLY one at a time)

1. **`mob-evidence-detail-hide-original-download-v1`** — remove/hide bottom original Download (or rename)  
2. **`mob-evidence-custody-redact-words-v1`** — custody = words only, no JSON dump  
3. Optional later: **`mob-evidence-exports-browser-v1`** — cross-file export search for super-admin  

---

## One line

**Bottom Download = original (redundant — remove/rename). Custody JSON = bug vs words rule. Finalized redacts live under Prior exports + disk `storage/evidence-exports\…` — no separate search page yet.**
