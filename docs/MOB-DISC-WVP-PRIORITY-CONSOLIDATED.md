# MOB DISC — Track B consolidate by priority (risk vs critical function)

**Date:** 2026-07-15 ~01:01  
**Status:** DECISION BOARD — discussion only; **no APPLY** until you name one MOB  
**Goal:** Best live Lab / scale path **without** breaking critical product function  

---

## Critical function — do not risk in latency MOBs

| Keep locked / out of scope unless you name it |
|-----------------------------------------------|
| Fleet wall / Open All / pin canvas mirror (**Firmware Gold**) |
| PTT / SIP **5060** / `pttServer` / `sipServer` / `psG711Audio` |
| Fleet `me8-zlm` :8080 used by wall path |
| Brand **Mobility Axiom** / login factory hint gate |
| Evidence **product** rules (who stores what) — change only via named Evidence MOB |
| Track A BWC on Fleet SIP — not moved for Track B experiments |

**Safe blast radius for latency work:** Lab WVP tiles + modern `me8-wvp` / `me8-wvp-zlm` only.

If a MOB could touch wall/PTT → **reject** or split.

---

## What we already know (short)

| Fact | Meaning |
|------|---------|
| Drag to live → ~**2–3 s** | Path OK; creep = player buffer |
| Soft catch-up preferred | No routine hard jump (ops events) |
| Hard jump only &gt;~10 s | Emergency / post Wi‑Fi hole |
| Tonight soak break | **No** WVP BYE — Wi‑Fi/client fit |
| Last night ~23:32 | Cam **BYE** + media注销 — different class |
| Stamp Google / `modify_stamp` | Second knife; fossil FAIL risk |
| Jessibuca | Big product bet — later |
| Server MP4 | Evidence master — policy separate; Lab soaks already saw some record |

---

## Priority stack (do in this order)

### P0 — Now (ops, no APPLY)

| # | Item | Risk to critical | Do |
|---|------|------------------|-----|
| P0.1 | Finish hour soak / note BYE | None | You Stop when done → agent log read |
| P0.2 | Quieter Wi‑Fi for prove soaks | None | Less TV on same AP if proving stability |

---

### P1 — First code MOB (highest product value / controlled risk)

**`mob-wvp-lab-mpegts-live-chase`** *(soft-first)*

| | |
|--|--|
| **Does** | Lab tiles: `liveSync` / soft `playbackRate`; focus → catch-up; hard jump **only** if debt &gt; ~10 s |
| **Does not** | Wall, stamp ini, Jessibuca, record policy, Fleet SIP |
| **Risk** | Low–medium: Lab UI hitch or rare speed-up; Gate B chase scar → abort in 5 min |
| **Protects** | Critical live ops feel; no skip for normal creep |
| **PASS** | 30+ min, ~2–5 s hand lag, **no** drag babysitting |

**This is the default “we decide and run” candidate.**

---

### P2 — Only if P1 PASS but something still wrong

| Pri | MOB | When | Risk |
|-----|-----|------|------|
| P2.a | Cam dig / `mob-wvp-lab-auto-replay-after-bye` | Soak still shows mid **`[收到bye]`** | Low (Lab reopen) — don’t touch wall |
| P2.b | `mob-wvp-modern-modify-stamp-1` | Soft chase OK but stamp hell / residual creep | **Medium** (fossil lag FAIL) — modern ZLM only, abort fast |
| P2.c | `mob-wvp-modern-lowlatency-1` | After or instead of stamp if glitch OK | Medium (花屏) |

**One at a time.** Never bundle P1+P2.b.

---

### P3 — Product / Evidence (not latency chase)

| Pri | MOB | Note |
|-----|-----|------|
| P3.a | Evidence server-record **policy** | Vault = 1.0× server master; not browser. Disk/retention first. |
| P3.b | `mob-wvp-lab-jessibuca` | Only if mpegts soft-chase **FAIL** at scale / tender needs WVP-class player |

---

### P4 — Parked / forbidden from this lane

| Item | Why |
|------|-----|
| Gate-B stash-off + chasing recipe as-is | Known minutes lag |
| Wall / Open All / pin / Firmware Gold | Critical path |
| Fossil stamp re-run on old all-in-one | Already FAIL |
| “ZLM is fine, only frontend” as dogma | BYE + stamp still real when logged |
| Bundle soft-chase + stamp + Jessibuca + record | Too much; breaks zero-change discipline |

---

## Risk vs payoff (decide with eyes open)

```
                    PAYOFF (ops feel / tender)
                         high
                          │
         P1 soft-chase ●  │
                          │     P3 Jessibuca
                          │           ●
         P2 auto-replay ● │
                          │  P2 stamp ●  (riskier)
            low ──────────┼────────────── high RISK to critical
                          │
                    (wall/PTT = off chart — don't go)
```

**Willing to take bigger risk for time?** → Still **P1**, not stamp/Jessibuca first. Soft-chase is the high-payoff / still-contained bet. Bigger risk inside P1 = allow emergency &gt;10 s jump + focus snap in **same** MOB (one prove).

---

## Decision line (fill when you choose)

| Choice | You say |
|--------|---------|
| Run soft-chase when ready | `MOB-APPLY mob-wvp-lab-mpegts-live-chase` |
| Wait for soak BYE result first | “soak done” → then APPLY |
| Skip to stamp (not recommended first) | name stamp MOB explicitly |
| Park all latency | say park |

**Agent default recommendation:** **P1 soft-first Lab chase** after soak log glance — critical functions untouched.

---

## One line

**Priority: finish soak → Lab mpegts soft catch-up (+ focus, jump only if &gt;10s) → BYE/auto-replay or stamp only if needed → Evidence/Jessibuca later — never wall/PTT in this lane.**
