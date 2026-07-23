# MOB DISC — What now · classic first · then real WVP next (not vague)

**Date:** 2026-07-18 ~12:20  
**Status:** DISC — analysis + exact next pastes  
**Ask:** Go back to classic? Why always “go back” with no next? Give concrete analysis.

---

## Short answer

| Question | Answer |
|----------|--------|
| Go back to classic **now**? | **Yes — first.** Live is dead until we undo thin. |
| Is that the whole plan forever? | **No.** Classic = put out the fire. Then a **real** WVP step with prerequisites. |

---

## Why “go back” is step 1 (not laziness)

Log already proved thin path is a **dead end for today’s cam wiring**:

1. Thin skips Fleet INVITE for Chin  
2. WVP `startPlay` **fails**  
3. → no picture  

Until undo, every “try live” wastes your time.  
**Classic first = restore the path that passed last night.** Then build WVP on that floor — not on a black panel.

---

## Exact next (two pastes — in order)

### Step 1 — now (fire)

```text
MOB-APPLY undo-thin-wvp-back-to-classic-live
```

After apply + restart: Chin live works again (Fleet/FFmpeg).  
You say: **`classic-live-ok`** or **`still-dead`**.

### Step 2 — only after classic-live-ok (real WVP)

```text
MOB-APPLY wvp-thin-picture-v2-failopen-fleet
```

**What v2 means (concrete — not “later someday”):**

| Rule | Why |
|------|-----|
| **Never** skip Fleet INVITE until WVP `startPlay` has succeeded once for that cam | Stops today’s black-hole (skip + fail = nothing) |
| Broker: try WVP overlay **after** Fleet/JSMpeg is up (soft-after) | Fail → keep FFmpeg (you still see picture) |
| Chin allowlist only | kk stays classic |
| Soft Open UI | Still frozen |
| Soft Open-only | Stay **0** |

**Topology gate before v2 can show ZLM picture (honest):**

WVP must see Chin online. Today Chin talks Fleet `:5062` (online/SOS).  
`startPlay` failed = WVP does **not** own a working GB session for Chin.

So **before or as part of v2 test**, one of these (you pick later — not during fire):

| Path | Meaning |
|------|---------|
| **B1 — Dual row if cam allows** | Keep Fleet online on `:5062`; add/keep GB to WVP `:5060` + WVP platform for **video only** |
| **B2 — Temp WVP-only GB** | Point GB at WVP `:5060` for a Chin soak, then return to classic keys — **only when you order it** |
| **B3 — Prove WVP device list first** | Open WVP UI `:18080` → Chin online there → then v2 play — no BWC rekey if already listed |

No platform flip during Step 1.

---

## Why thin v1 failed (analysis, not blame fog)

```text
Wanted:  Chin picture via WVP→ZLM
Coded:   Skip Fleet INVITE + hope startPlay works
Reality: startPlay failed → skip left zero path → can’t open live
```

That is a **design bug in v1**, not “mystery BWC.”  
v2 = fail-open Fleet always; WVP is bonus overlay when startPlay works.

---

## Park option

If you do **not** want WVP this week:

1. Paste Step 1 undo only  
2. Say **`park wvp`**  
3. Stay classic PASS floor  

---

## What I will not do

- Another thin MOB that skips Fleet before WVP works  
- Soft Open UI storm  
- “You’re already on ZLM” with flags that lie  
- Undo with no Step 2 name  

---

**One line:** Yes — undo to classic **now** (`undo-thin-wvp-back-to-classic-live`); after `classic-live-ok`, next concrete APPLY is `wvp-thin-picture-v2-failopen-fleet` (Fleet always underneath; WVP only if startPlay works + WVP sees Chin).
