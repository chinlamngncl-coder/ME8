# MOB DISC — ANPR offline / file hit = alert only (parity record)

**Date:** 2026-07-30  
**Status:** **RECORDED — no code** (FR path applied separately)  
**Operator:** Same rule as FR offline video: investigation media hits must **alert only** — no auto Ops jump, no forced wall live. Apply for ANPR when that hit path exists.  
**Related:** `MOB-DISC-FR-OFFLINE-HIT-ALERT-ONLY-V1-APPLIED.md` · FR parent `MOB-DISC-FR-OFFLINE-HIT-NO-OPS-JUMP-20260730.md`

---

## Plain English

1. FR offline-video hits are now alert-only (`FR-OFFLINE-HIT-ALERT-ONLY-V1`).  
2. **ANPR today:** product ANPR is snapshot/crop **read** in Analytics — there is **no** offline-video (or file) watchlist-hit → `goOpsOnHit` / wall-promote path equivalent to FR.  
3. When ANPR later emits plate-list / watchlist hits from **uploaded video or photo investigation** (not live BWC), use the same rule: toast/HQ/chime OK; **no** auto Ops; **no** auto live panel. Explicit Go to map may pan only if GPS is real — never steal wall from a fake/offline cam id.

---

## Current state (2026-07-30)

| Surface | Exists? | Ops jump risk |
|---------|---------|---------------|
| Analytics ANPR photo read | Yes | No — result card only |
| ANPR live BWC continuous match + hit toast | Not ship-complete like FR | N/A until built |
| ANPR offline video / file → watchlist hit | **Not built** | N/A |

---

## Locked product rule (when built)

| Hit source | Alert | Auto Ops + wall live |
|------------|-------|----------------------|
| Live BWC ANPR (future) | Yes | Per live tier rules (separate MOB) |
| Offline video / uploaded investigation | Yes | **No** — alert only |
| Explicit Go to map | — | Map only if useful; **no** forced live |

Mark payload with a clear source (e.g. `source: 'offline-video'` or `source: 'anpr-file'`) so UI can gate like FR.

---

## Recommended future MOB (do not APPLY yet)

### `ANPR-OFFLINE-HIT-ALERT-ONLY-V1`

Wire when ANPR offline/file hits ship — mirror FR `isOfflineVideoHit` / go-ops gate in the ANPR alarm surface (or shared helper).

**Do not** invent ANPR hit UX in this disc.

---

## Lock record

| Item | Decision |
|------|----------|
| Same alert-only rule as FR offline | **Accepted** for future ANPR investigation hits |
| Code now | **None** — record only |
| Next APPLY name when ready | **`ANPR-OFFLINE-HIT-ALERT-ONLY-V1`** |
