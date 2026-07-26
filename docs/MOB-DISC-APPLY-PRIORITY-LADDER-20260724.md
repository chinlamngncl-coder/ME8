# MOB DISC — APPLY priority ladder + auto-next (no nag wait)

**Date:** 2026-07-24  
**Operator ask:** List APPLYs with priority/levels; after each MOB, agent suggests the next — do not wait to be asked again.  
**Lock:** Finish **Tactical** before dual-pane / PiP. One APPLY at a time. Urgent FAIL always jumps the queue.

---

## How this works

| You say | Agent does |
|---------|------------|
| `MOB-APPLY <name>` | Build that one only |
| **PASS** | Mark done → **immediately name the next APPLY** from this ladder |
| **FAIL** + what you see | Fix that MOB (or one named repair) — ladder pauses |
| Genre done / push | Reminder only when you ask push |

Agent must **not** end with “which do you prefer?” when the ladder already picks one.

---

## Levels

| Level | Meaning |
|-------|---------|
| **L0** | Eyes only — already APPLIED; need your PASS/FAIL |
| **L1** | **Tactical genre now** (your order: finish Tactical first) |
| **L2** | Parked after Tactical — dual-pane / fixed PiP |
| **L3** | Fleet / ops leftovers (pin, call group polish, VC handoff backend) — after L1/L2 or if FAIL forces |

---

## L0 — Confirm PASS (no new code)

| # | MOB | Notes |
|---|-----|--------|
| 0a | `OPS-LEFT-PANEL-BTN-COMPACT-UNIFY-V1` | **PASS** (you said) |
| 0b | `VC-OPS-BWC-GRID-NO-OVERLAP-V1` | **Await PASS** — 2+ BWC/fixed cells on Operations |
| 0c | `TACTICAL-MAP-AR-POI-V1` | Await PASS if not said |
| 0d | `USER-CIRCLE-BATCH-OPEN-V1` | Await PASS if not said |
| 0e | VC empty states / 14-stream layouts | Await PASS if still open |

---

## L1 — Tactical (build order)

| Pri | APPLY name | Why | After PASS → |
|-----|------------|-----|----------------|
| **1a** | `TACTICAL-AR-CIRCLE-BATCH-OPEN-V1` | Circle batch — FAIL UX → repaired by 1b | → 1b |
| **1b** | `TACTICAL-PREPARE-OPERATE-MODE-FLOW-V1` | **PASS** (modes/banner) | → 1c |
| **1c** | `TACTICAL-OPEN-GRABBED-PIN-POPUP-LIVE-V1` | APPLIED partial — fixed→pin; **BWC→wall REJECTED** | → 1d |
| **1d** | `TACTICAL-OPEN-GRABBED-BWC-PIN-CYCLE-V1` | Media OK; **layout FAIL** pin-stack when GPS near | → 1e |
| **1e** | `TACTICAL-GRAB-RESULT-TILE-BANK-V1` | APPLIED but **REJECTED** — edge dock ≠ pin layout | → 1f |
| **1f** | `TACTICAL-GRAB-PIN-SPIDERFY-OFFSET-V1` | APPLIED — “not bad”; pin fan in zone | → 1g |
| **1g** | `TACTICAL-PIN-VIDEO-DRAGGABLE-V1` | APPLIED — “good” (drag pin video) | → 1h |
| **1h** | `TACTICAL-PIN-CLUSTER-SPIDERFY-TEAM-COLOR-V1` | APPLIED → **FAIL** (full view: no pins) | → 1i repair |
| **1i** | `TACTICAL-PIN-FULLVIEW-VISIBLE-OPS-CHROME-V1` | APPLIED → **FAIL** (still blank island) | → 1j |
| **1j** | `TACTICAL-PIN-MOUNT-PROVE-NO-SILENT-FAIL-V1` | **APPLIED** — pins visible | → 1k |
| **1k** | `TACTICAL-PIN-MARKER-SPREAD-OPS-COLOC-V1` | APPLIED → **too wide** (eyes) | → 1l |
| **1l** | `TACTICAL-PIN-SPREAD-MATCH-OPS-DIST-V1` | **APPLIED** — awaiting PASS (Ops dist + zoom gate) | → **L0 SEC** |
| **2** | `TACTICAL-ZONE-TURF-ENTRY-EXIT-V1` | Zone enter/exit engine | #3 or dual-pane |
| **3** | `TACTICAL-SITE-IMAGE-OVERLAY-T2` | Floor plan under pins (optional) | Dual-pane gate |

**Not in L1 yet:** Dual-pane / 6 PiP — see L2.

---

## L0 — Security (PRIORITY after Tactical handoff)

**Disc:** `MOB-DISC-SEC-GOOGLE-FIVE-TIMING-SPAWN-DISK-WS-20260724.md`  
**Status:** **PARKED — start immediately when Tactical pin-mount genre hands off** (or operator says start SEC now).  
**Beats:** Turf, dual-pane, ship polish.

| Order | APPLY name | Risk |
|-------|------------|------|
| 1.1 | `SEC-BWC-COMPANION-TIMING-SAFE-HASH-V1` | **APPLIED** — awaiting PASS |
| 1.2 | `SEC-SOS-OPEN-EXPLORER-NO-CMD-V1` | Low–Med — cmd.exe |
| 1.3 | `SEC-EVIDENCE-UPLOAD-FREE-DISK-V1` | Medium — disk DoS |
| 1.4 | `SEC-MSG-REASSEMBLER-TTL-V1` | Medium — RAM leak |
| 1.5 | `SEC-MSGWSS-HMAC-AUTH-V1` | **High** — WS cam spoof |

First after 1.1 PASS: `MOB-APPLY SEC-SOS-OPEN-EXPLORER-NO-CMD-V1`

---

## L2 — Dual-pane (Understanding OK — **unpark after tile bank**)

| Pri | APPLY name | Why |
|-----|------------|-----|
| A | `TACTICAL-DUAL-PANE-MAP-WIDE-V1` | 50/50 map + wide fixed cam — after grab tile bank proves L/R/T/B |
| B | `TACTICAL-FIXED-PIP-SLOTS-V1` | N slots (default 6), fixed only, floor = swap |
| C | Wide-video pin icons / later BWC-on-pixels | After A+B prove |

**Eyes 2026-07-24:** GPS-near pin stack proves why ops wants L/R/T/B — Disc `MOB-DISC-PIN-STACK-GPS-NEAR-LR-TB-20260724.md`.

---

## L3 — Fleet leftovers (when Tactical/dual not the pain)

| Pri | APPLY name | Notes |
|-----|------------|--------|
| 1 | `PIN-CLICK-POPUP-OPEN-NO-DOCK-STORM-V1` | Map pin genre 7e — if pin click still hurts |
| 2 | Call group polish / broadcast | Only if Call Groups still FAIL |
| 3 | `CONFERENCE-BWC-INGRESS-WVP-HANDOFF-V1` | VC BWC under WVP handoff backend — if ingress still broken |

---

## Agent pick RIGHT NOW

**Architect roadmap locked** — `MOB-DISC-ARCHITECT-MASTER-ROADMAP-20260725.md`  
**Phase 2 COMPLETE.** Overwatch (AR) words **PASS**.

Phase **3** PAUSED until you open it.

---

## Do not

- Bundle circle + Turf + dual-pane in one APPLY  
- Start L2 while L1 unfinished (unless you override)  
- Re-ask “pick A or B” when this ladder already picks
