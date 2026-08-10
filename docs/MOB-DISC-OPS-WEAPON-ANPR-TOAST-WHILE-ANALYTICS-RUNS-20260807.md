# MOB DISC — Ops desk: how HQ sees Weapon / ANPR while Analytics runs (2026-08-07)

**Status:** disc only. No code until APPLY.  
**Ask:** User on **live Ops**. Weapon (and ANPR) Analytics left **open/running**. Alert fires on Analytics side — how does Ops know? Toast on Ops? Like FR?

---

## Yes — I get what you mean

Two directions:

| Direction | Meaning |
|-----------|---------|
| **A — Analytics → Ops** | Operator is on Weapon panel; hit → toast; they may press **Show on map** (choice). |
| **B — Ops while Analytics runs** | Operator lives on **Ops map/wall**. Weapon/ANPR watch still running in background. Hit must **wake them on Ops** without them staring at Analytics. |

You are asking about **B**. FR already does B (global pop). Weapon/ANPR must too.

---

## What is true today

| Module | Detect while on Ops? | HQ wake on Ops? |
|--------|----------------------|-----------------|
| **FR** | Yes (live poller) | **Yes** — global HQ bar + red toast on every tab (including Ops). May auto map for blacklist. |
| **Weapon** | Yes **only if** Start watch left running (server still has `weapon-watch-slots`) | **Yes (just shipped)** — `WEAPON-ALARM-TOAST-BLINK-V1` listens `weapon-detect` on **any** page → orange blink + toast on Ops too. **No auto jump** (by design). |
| **ANPR** | Yes if ANPR live watch running | Live list hit → `FrAlarm.onHit` (FR-shaped toast). Needs socket bind + live watch active. |

So: **Weapon toast on Ops is already the plan and the code path** — not Analytics-only.  
If you are on Ops with Weapon watch running and get a hit, you should see the **WEAPON** bar + toast without opening Analytics.

If that did not show in lab: hard refresh + prove Start watch still on + hit again (PASS/FAIL that).

---

## Suggestion (one product rule)

**All three wake HQ on Ops with a toast/bar. Differ how “aggressive” they are:**

```
Ops desk (operator home)
        │
        ├── FR hit     → already: blink + toast (+ auto Ops/map for high blacklist)
        ├── ANPR live  → same family: toast/bar on Ops (show plate + BWC); Go map / Ack
        └── Weapon     → blink + toast on Ops (cam + gun/knife); Ack / Open Weapon / Show on map
                         NO auto steal Ops / NO fake SOS
```

| | Toast on Ops? | Auto jump / wall steal? |
|--|---------------|-------------------------|
| FR | Yes | Yes for high blacklist (locked) |
| ANPR | Yes | Live: map/promote per existing FR pipeline; Offline: alert only |
| Weapon | Yes | **Never auto** — operator chooses Show on map / Open Weapon |

You do **not** need a second “Ops-only” toast system. One global toast per module is enough. Ops is just another tab looking at the same toast.

---

## Extra (optional later — not required for V1)

| Idea | Why | When |
|------|-----|------|
| Soft **pin pulse** on Ops map for Weapon cam | Eyes stay on map; toast still primary | After toast PASS if you still miss hits |
| Chime / voice (session mute aware) | Ears when eyes on wall | Later MOB |
| Keep Analytics popout + Ops dual screen | Toast on both sockets | Already socket broadcast — prove multi-window |

---

## Gaps to watch (lab)

1. **Weapon watch stopped** when leaving Analytics → no detects → no toast. Rule: Start watch must stay on for background detect.  
2. **ANPR** never opened this session → confirm `anpr-list-hit` listener is bound (if FAIL, MOB: `ANPR-ALARM-BIND-GLOBAL-V1`).  
3. Two bars (FR red + Weapon orange) can stack — OK; Ack each.

---

## Recommendation

**Keep global toasts for Weapon + ANPR on Ops** (same as FR wake, milder for Weapon).  
Do **not** invent a separate Ops-only alarm UI.

**Next code only if lab FAIL:**  
- Weapon toast missing on Ops with watch running → fix bind/cache (`WEAPON-OPS-TOAST-PROVE-FIX-V1`)  
- ANPR toast missing on Ops → `ANPR-ALARM-BIND-GLOBAL-V1`

Otherwise continue arranged queue: `WEAPON-LIGHTBOX-POS-KEEP-V1` / tile expand / B negatives.
