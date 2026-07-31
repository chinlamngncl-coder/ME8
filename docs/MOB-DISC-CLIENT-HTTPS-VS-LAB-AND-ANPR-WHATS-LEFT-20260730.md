# MOB DISC — Client HTTPS vs lab ports + what’s left after ANPR snapshot

**Date:** 2026-07-30  
**Status:** **FACT + NEXT MOB** — no code until APPLY  
**Search:** client site HTTPS, 4438, 3988, ANPR backlog, plate lists, live ANPR  
**Related:** `MOB-DISC-HTTPS-PRODUCT-VS-LAB-PORTS-PLAIN-20260723.md` · `MOB-DISC-ANPR-PRODUCT-LIVE-SNAPSHOT-LISTS-20260729.md` · `MOB-DISC-RESTART-HEALTH-PRINT-HTTPS-4438-V1-APPLIED.md`

---

## 1) Client site — will “3988 vs 4438” happen?

**Not the same mess — if ship is done right.**

| Lab (now) | Customer site (goal) |
|-----------|----------------------|
| Two doors: HTTP **3988** + HTTPS **4438** | **One** operator URL — **HTTPS** (often `:443` via IT proxy, or single published portal URL) |
| Restart used to print only HTTP (fixed in lab print MOB) | IT sets **Operator portal URL**; staff bookmark that — not raw dual ports |
| Self-signed cert → Privacy error click-through | Customer cert / corporate CA (or IT-managed TLS) |

So: clients should **not** live the weekly “which port?” hobby. Lab dual ports are training wheels. Ship goal remains **one HTTPS face** (`MOB-DISC-HTTPS-PRODUCT-VS-LAB-PORTS-PLAIN-20260723.md`).

Restart print MOB only cleans **lab** messaging; it does not invent dual doors for customers.

---

## 2) What we actually finished (honest)

Not “only a uni demo” — but **not** full ANPR product either.

| Done | Meaning |
|------|---------|
| Snapshot / crop / Read plate UI | Analytics ANPR 1-still path |
| FastALPR ship default | Field-class engine for that path |
| Soft fail / PH floor (as used) | Wrong-digit dump reduced |
| Engine health plain + pill | Status chrome |
| FR offline hit = alert only | Face investigation |
| CW cover fill | Command Wall look |
| Restart HTTPS print | Lab URL clarity |

**Still missing for “FR-style ANPR product”** (locked plan):

| Gap | Why it matters |
|-----|----------------|
| **Plate lists** (Blacklist / Wanted / Suspicious) | Without lists, read is a notepad — no hit / alert story |
| **Live ANPR** (ZLM sample, low FPS) | BWC watch like Face live tiles |
| **Offline video** load → plate crop/read | FR offline parity |
| Hits / history / alert UX | Match FR hit patterns (alert-only when offline) |
| Pack / ship sidecar like FR | Customer install path |
| Manuals | After UI + engine PASS |
| Weapon module | Separate park |

Snapshot 1:1 is **phase 1 of many** — engine PASS unlocked the rest; it did not finish the genre.

---

## 3) Recommended next MOB (one path)

**Do plate lists next — not live yet.**

Live without lists = pretty OCR ticker with no ops action.  
Lists without live = every snapshot/offline read can already **hit** — same matcher live will reuse.

### `ANPR-PLATE-LISTS-V1`

| # | Scope |
|---|--------|
| 1 | Analytics → ANPR → **Plate lists** (Blacklist / Wanted / Suspicious) — CRUD + import later OK |
| 2 | After every snapshot **Read plate**, run list match → badge on result card |
| 3 | No live worker yet · no Ops auto-jump storm · reuse plain English grades |
| 4 | Face Watchlist stays faces-only |

**PASS:** enroll a plate on Blacklist → read that plate from photo → card shows list hit.  
**Do not:** start live ZLM ANPR in this MOB · mix face enroll with plate numbers.

**After lists PASS → next genre step:** `ANPR-LIVE-ZLM-WATCH-V1` (or named from ZLM fan-out disc).

---

## Operator decide

When ready:

- **`MOB-APPLY ANPR-PLATE-LISTS-V1`**

**No code in this disc.**

---

## Lock record

| Item | Decision |
|------|----------|
| Client dual-port confusion | **Should not** be the customer experience |
| Snapshot-only = full ANPR | **False** — lists + live + offline still ahead |
| Next APPLY | **`ANPR-PLATE-LISTS-V1`** |
| Code | **None** until APPLY |
