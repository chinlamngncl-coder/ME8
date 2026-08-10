# MOB DISC — Weapon lightbox X / drag, car=gun FP, alarm ops (2026-08-07)

**Status:** disc only. No code until a named `MOB-APPLY` below.  
**Operator shots:** lightbox title “Weapon detection — gun”; Recent card “gun · kk” on black SUV + bull bar; caption junk on still.

---

## 1) Why the close X looks covered

Weapon lightbox is a **fixed center modal** (`#ax-wd-snap-lightbox`) with `overflow: hidden` on the shell. Close is a bare `×` in the chrome with large font and tight padding. That clips the top of the glyph against the chrome / radius — same family as “X feels covered,” not a missing button.

FR / ANPR lightboxes already use a clearer chrome + hit target. Weapon never got that polish in SCROLL-MAG-FAST (scope was list + mag + poll knobs only).

Backdrop click also closes — if X feels dead, click outside once as a temporary escape (Escape also closes).

## 2) Why it is not movable like FR / ANPR

**By design so far — incomplete parity, not a regression.**

| Surface | Behavior |
|---------|----------|
| FR red toast / FR snap chrome | `makeDraggable` on header |
| ANPR snap lightbox | movable / FR-style chrome |
| Weapon snap lightbox | fixed `left/top 50%` + `translate(-50%,-50%)` — **no drag bind** |

SCROLL-MAG-FAST added mag + hover zoom only. Drag was never in that APPLY.

## 3) Why a car / front metal bar = “gun”

**Yes — bull bar / push bumper + dark SUV geometry is a classic gun FP**, especially on CPU RF-DETR Medium with noisy stills. Caption overlays (“you? OK somebo”) are **rubbish scene content**; they do not help the model and can make boxes worse.

This is **model + data**, not a broken Recent UI. Track **B** (Colab) stays the product path. Do **not** retrain Track A smoke for this.

**Enhance this rubbish:**

1. Operator gathers **negatives** for Colab B: cars, bull bars, empty garage, phones, TV/YouTube UI, caption-heavy frames, no real weapon.  
2. Re-export / retrain B in Colab → replace `weapon_rfdetr_best.pt` (slim sidecar if needed).  
3. Optional lab knob later: slightly higher `FM_WEAPON_CONF_GUN` — band-aid only; negatives win.

## 4) Alarm hit today — what should happen?

**Today (correct / locked):** hit → **Recent card only**. No HQ WEAPON banner, no blink toast, no Ack, no auto SOS, no auto PTT.

**Police cannot “call HQ / SOS” from this lightbox** — those actions were never wired. Device **SOS** must stay **device-origin only** (never invent SOS from a weapon still). Older discs already locked that.

**What ops should get (FR-shaped, weapon-named):**

| Action | Intent |
|--------|--------|
| **WEAPON toast** (blink / pulse) | HQ sees hit without living in Analytics |
| **Ack / Dismiss** | Clear blink; keep or drop from active queue |
| **Open live** | Jump to that cam tile / wall |
| **Map** (if GPS) | Pin focus — BWC only |
| **PTT / talk to officer** | Existing Fleet PTT to that unit / nearby GPS BWCs — **not** SOS |
| **Push tone / sound to BWC** | Only if DeviceControl / firmware already supports a safe one-shot alert — separate MOB, prove `udp_once` |

Do **not** auto-blast radio on every FP (bull bar). Alarm MOB must keep confirm + dedupe; operator Ack before “notify field” is safer for lab.

## 5) Recommendation (one path)

| Order | MOB | Why |
|-------|-----|-----|
| **Next** | `WEAPON-LIGHTBOX-DRAG-X-PARITY-V1` | Fix clipped X + drag chrome like FR (cheap, no radio risk) |
| Then | Colab B **negatives** (cars / bull bars / captions) + retrain B | Kill this FP class |
| Then | `WEAPON-ALARM-NEARBY-V1` | HQ WEAPON toast + Ack + blink + Open live + optional nearby PTT — **never fake SOS** |

Optional later (after alarm PASS): `WEAPON-FIELD-TONE-V1` (one-shot device tone) only with named APPLY + DeviceControl once proof.

---

## One next APPLY (UI only)

`MOB-APPLY WEAPON-LIGHTBOX-DRAG-X-PARITY-V1`

Exact scope: Weapon lightbox chrome = clear close hit-target; header drag like FR; cache-bust. No alarm, no retrain, no SOS.
