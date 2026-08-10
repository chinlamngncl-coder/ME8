# MOB DISC — Weapon alert logic: blink + toast, operator chooses (2026-08-07)

**Status:** disc only. No code until APPLY.  
**Correction:** Weapon is **not** the same as FR/ANPR auto-Ops. Weapon = **blink + pop** so HQ can call backup. Operator decides next step.

---

## Confirm — I get it now

| | FR / ANPR Live | Weapon |
|--|----------------|--------|
| Goal | Match person / plate → often jump Ops / pin | Gun/knife still → **wake HQ** |
| Auto go Ops? | Live path may promote map / live | **No auto Ops** |
| Who is the cam? | Must show BWC/cam | Already known on the hit (device name + id) |
| What HQ needs | Triage match | **See blink**, open live if wanted, **call backup** |

Weapon alert already carries **which BWC / fixed cam**. We do not need a second “find who” step. We need **attention + choice**.

Never fake device **SOS**. Backup = human on software (PTT / phone / radio), not remote SOS button.

---

## Recommended logic (one flow)

```
Weapon confirm hit (already in Recent)
        │
        ▼
HQ: blink strip + WEAPON toast (crop thumb + cam name + gun/knife + time)
        │
        ├── stays blinking until Ack or Dismiss
        │
        └── operator picks ONE action (no auto jump):
              • Ack          → stop blink, keep Recent
              • Open Weapon  → Analytics Weapon + that cam live / wall focus
              • Show on map  → Ops map focus that pin (BWC or fixed) — optional live PiP later
              • Call backup  → later: nearby PTT / radio (Phase 2) — not SOS
```

**Default on hit:** blink + toast only. Screen does **not** switch to Ops by itself.

---

## Toast buttons (options on the card)

Put these on the WEAPON toast (FR-shaped chrome, Weapon wording):

| Button | What it does | In V1? |
|--------|----------------|--------|
| **Ack** | Stop blink / clear active toast; hit stays in Recent | **Yes** |
| **Dismiss** | Same as soft clear without “handled” mark (optional = merge with Ack) | Optional |
| **Open Weapon** | Go Weapon panel + start/focus that cam live (your “open live on wall + go to weapon”) | **Yes** |
| **Show on map** | Switch Ops + focus that cam pin (BWC **or** fixed). No forced full wall storm | **Yes** (operator choice) |
| **Call backup** | Open nearby / PTT group for that unit | **Phase 2** after toast PASS |

**Show BWC live on map?**  
Yes as a **button**, not auto. Toast can show a small thumb of the crop; live map PiP only if they press **Show on map** (or a later “Live on map” if pin video already works).

---

## Blink rules (simple)

1. New Weapon hit → HQ strip + toast **blink/pulse**.  
2. More hits same cam inside dedupe window → refresh toast, keep blinking (no spam stack).  
3. Different cam → queue badge (like FR) or second toast — pick **queue badge** in V1.  
4. **Ack** or **Dismiss** → blink stops.  
5. Refresh / new login → blink cleared (Recent may still have crops if server kept them).

---

## What V1 does **not** do

- Auto jump Ops (unlike FR live promote)  
- Fake SOS on the device  
- Auto PTT blast to all nearby (FP risk — bull bar)  
- Mix into FR / ANPR rails  
- Offline Weapon file hits (none yet)

---

## MOB split

| MOB | Scope |
|-----|--------|
| `WEAPON-ALARM-TOAST-BLINK-V1` | Blink + toast + **Ack** + **Open Weapon** + **Show on map**. No auto Ops. No SOS. No auto backup radio. |
| `WEAPON-ALARM-BACKUP-PTT-V1` | Call backup / nearby PTT from toast (after toast PASS) |
| (earlier UI) | `WEAPON-LIGHTBOX-POS-KEEP-V1`, `WEAPON-TILE-CLICK-EXPAND-V1` — still fine before alarm |

---

## One next APPLY (when you want alarm UI)

`MOB-APPLY WEAPON-ALARM-TOAST-BLINK-V1`

Until then, finish lightbox POS-KEEP / tile expand if you still want those first.
