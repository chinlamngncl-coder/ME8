# MOB DISC — What are those parked items? Refresh done? Go FR replacement next?

**Status:** DISC only — **no APPLY**  
**Date:** 2026-07-13  
**Trigger:** Explain re-enroll/cutover, hold Clear/Close, map restore-view; did we do refresh?; shall we push FR replacement?  
**Search:** re-enroll, cutover, disposition, restore-view, grace disconnect, FR replacement next  

---

## 1) What those three names mean (plain English)

### A — Re-enroll / match cutover *(FR engine finish)*

| Name | What it is |
|------|------------|
| **Re-enroll** (`mob-fr-gallery-re-enroll-migrate`) | Watchlist faces were embedded with **old DeepFace vectors**. Lab now runs **ONNX**. Different math/dims → **snaps work, matches stay weak/wrong** until each face is re-embedded (bulk migrate or re-photo enroll). |
| **Cutover** (`mob-fr-engine-cutover`) | Make **onnx** the **code/ship default** (not only lab `.env`). DeepFace stays backup/rollback. |

**Today:** Lab ONNX is **up**. Replacement is **not finished** until re-enroll (+ later cutover).

```
ONNX running  →  snaps OK
old gallery   →  match BAD until re-enroll
cutover       →  ship packs don’t need hand-edited .env
```

---

### B — Hold Clear / Close *(Investigation holds lifecycle)*

Investigation holds = Keep tray (browse/open/Play path started).

**Missing:** way out of the tray.

| Action | Meaning |
|--------|---------|
| **Clear / Close hold** | Done with this snap — reason + log; files stay in history |
| **Discard** | Soft-hide from Active |
| **Link to case** | Escalate to Case file |
| **Delete** | Rare admin purge + audit |

Not the same as closing a **Case file**. DISC: `MOB-DISC-FR-HOLDS-DISPOSITION-LIFECYCLE.md` — **not APPLIED**.

---

### C — Map restore-view *(FR pin Close → map zoom)*

Show FR on map zooms tight (`zoom ≥ 16`). Close removes red pin but **leaves the map zoomed** → other BWC pins look “gone” until **Fit pins**.

**`mob-fr-map-close-restore-view`:** remember previous center/zoom; restore on Close (carefully — don’t kill live pin video). Tag APPLIED; **restore still parked** (risk note exists).

---

## 2) Did we do the “refresh thing”?

**No — DISC only, not APPLIED.**

| MOB | Job | Status |
|-----|-----|--------|
| `mob-live-viewer-grace-disconnect` | F5 / blip: don’t kill BWC encode for ~90s if same user returns | **Not applied** |
| `mob-operator-session-restore` | Bring back open cams / pins / tab after reload | **Not applied** |
| `mob-fr-watch-session-restore` | FR watch set comes back | **Not applied** |

Today: F5 still = new desk, live work rebuilt by hand. Soft socket reconnect without F5 still works as always.

Docs: `MOB-DISC-REFRESH-ENTERPRISE-UX.md`, `MOB-DISC-OPERATOR-REFRESH-SESSION-RESTORE.md`

---

## 3) Shall we go forward with FR replacement?

**Yes — that’s the highest-value next FR genre**, if matching honesty matters now.

| Order | What | Why |
|-------|------|-----|
| **1** | One **manual re-enroll** + live walk-test | Proves ONNX match before big MOB |
| **2** | `mob-fr-gallery-re-enroll-migrate` if gallery > few faces | Bulk fix |
| **3** | `mob-fr-engine-cutover` | Ship/lab default locked |
| Optional | Side-face gate | After match is honest |

**Do not block replacement on:** hold Clear/Close, map restore-view, or refresh grace — those are **ops UX**, parallel tracks.

```
Recommended next focus:  FR match honesty (re-enroll → cutover)
Parked OK for later:     hold disposition · map restore · F5 grace/restore
Already nice this wave:  snaps · holds UI · map tag/expand · offline Play
```

---

## Cheat sheet

| Phrase | One sentence |
|--------|----------------|
| Re-enroll | Rebuild watchlist face vectors for ONNX so **match** works |
| Cutover | Make onnx the default engine in code/ship |
| Hold Clear/Close | Finish/dispose Investigation holds with reason + log |
| Map restore-view | After FR Close, put map zoom back so fleet pins visible |
| Refresh thing | Grace + session restore so F5 doesn’t nuke live — **not done** |

---

## Suggested next (pick one)

1. **`MOB-APPLY` after you manually re-enroll one person and walk-test** — if PASS, then `mob-fr-gallery-re-enroll-migrate` or cutover  
2. Or say **`MOB-APPLY mob-fr-gallery-re-enroll-migrate`** if gallery is already many faces  
3. Refresh genre only if F5 pain > match pain this week  

**Locked suggestion:** go **FR replacement (match)** next; leave holds/map-restore/refresh parked until match PASS.

---

## No code in this DISC
