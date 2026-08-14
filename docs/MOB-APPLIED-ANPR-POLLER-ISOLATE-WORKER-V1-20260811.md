# MOB-APPLIED ANPR-POLLER-ISOLATE-WORKER-V1

**Date:** 2026-08-11  
**Status:** APPLIED  
**Hatch:** `FM_ANPR_POLLER_ISOLATE=0` → old in-process poller  

---

## What changed

ANPR live grab / track / harvest runs in a **child Node process** so Fleet **SIP / presence / Socket / WVP control** stay on main.

| File | Role |
|------|------|
| `lib/anprLivePoller.js` | Main bridge (fork + IPC sync) |
| `lib/anprLivePollerChild.js` | Child entry |
| `lib/anprLivePollerRuntime.js` | Full poller (child or hatch in-process) |

**Kept:** grab ~150ms, multi-target, OCR path, WVP live-cam truth synced from main every 1s.  
**Not touched:** SIP cores, `video-wall.js`, FR/Weapon pollers (next APPLYs).

---

## Professional capacity record (WVP sell method — not 2‑BWC)

Canonical: `MOB-DISC-CAPACITY-MULTI-NODE-LIVE.md`  
Reconnect: `MOB-DISC-RECONNECT-100-500-1000-CAPACITY-ALREADY-LOCKED-20260811.md`  
Concurrent modules: `MOB-DISC-CONCURRENT-MODULES-SHIP-NOT-2BWC-LAB-20260811.md`

| Meter | Product meaning | Today / plan |
|-------|-----------------|--------------|
| Registered BWC | License `maxBwcDevices` | **100 → 500 → 1000+** sell tiers |
| Dashboard users | `maxDashboardUsers` | Named operators (order 10s–100s) |
| Super admins | `FM_MAX_SUPER_ADMINS` (~5) | Break-glass / see-all — **not** unlimited exclusive lives |
| User scope | Dispatch groups | Operators see **their** cams; not whole city by default |
| Concurrent **distinct live** | `FM_MAX_CONCURRENT_LIVE` / pool | Lab **8** site-wide; raise only with soak MOB; **WVP/ZLM** = shared ingest + fan-out |
| Analytics watch | FR/ANPR/Weapon slots | Budgeted watched cams — same spirit as live tiles |

**Why WVP:** one cam → one ingest → many viewers; presence stays Fleet; decode budget ≠ registered count. That is why we changed to WVP — so **register many, open few, fan-out many desks**.

**Modules that must run concurrent (ship contract):** Ops/Command wall · live map · tactical · evidence · VC · FR · ANPR · Weapon — with pollers **isolated** (this MOB = ANPR; FR/Weapon next).

---

## Operator PASS

1. Restart Fleet (child should log `[anpr-child] ready`).  
2. Restart `START-ANPR.bat`. Hard refresh.  
3. Live ANPR on + Ops roster **≥5–10 min** — **no Online/Offline flap**.  
4. Plates still arrive (multi-car OK).  

**FAIL hatch:** set `FM_ANPR_POLLER_ISOLATE=0`, restart, report.

---

## FR / Weapon / Tactical — status (honest)

| Module | Isolate poller | Notes |
|--------|----------------|-------|
| **ANPR** | **DONE** this MOB | Child + ship sibling |
| **FR** | **Not yet** | Still on main — next `FR-POLLER-ISOLATE-WORKER-V1` |
| **Weapon** | **Not yet** | Still on main — next `WEAPON-POLLER-ISOLATE-WORKER-V1` |
| **Tactical / matrix / map / VC / Evidence** | N/A as poller | Use **WVP + Fleet main** (video/presence/UI) — not a separate grab poller. Finish = WVP parity ladder, not this isolate genre |

---

## 1-click packing (not broken)

Ship has **no `lib/`** (`run.js` blob). Isolate still packs:

- `build:ship` / `build-ship-runtime.js` also emit **`anpr-poller-child.js`** next to `run.js`
- Main forks that sibling (same Node, same zip)
- Customer still **one Start bat → node run.js** — child auto-forks

Not a second installer. Not “cannot pack together.”

---

## Next APPLYs (genre)

1. `FR-POLLER-ISOLATE-WORKER-V1`  
2. `WEAPON-POLLER-ISOLATE-WORKER-V1`  
3. `ANALYTICS-SHARED-GRAB-BUDGET-V1`  
4. `CONCURRENT-MODULES-SMOKE-PACK-V1`