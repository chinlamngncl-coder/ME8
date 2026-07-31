# MOB DISC — ANPR Live: vehicle crop still FAIL + slots cut off (honest)

**Date:** 2026-07-31  
**Status:** DISC — **no code until** named APPLY  
**Operator:** Not PASS/FAIL paperwork — product still wrong. Cropping is **fast** but **not whole vehicle**. Live **slots cut by page bottom**. Asks: can we crop from a smaller “iframe” / PiP while full slot stays real live? Did agent break slot rules?

**Related APPLIED:** `ANPR-LIVE-VEHICLE-SCENE-PLATE-V1` (field not accepted)  
**UI rule:** Live video matrix must **fit viewport — no cut-off tiles, no page scroll to see tiles** (`.cursorrules` SCROLLING).

---

## 1) Honest answer — did this APPLY break the 4 live slots?

| Question | Honest answer |
|----------|----------------|
| Did **VEHICLE-SCENE-PLATE-V1** redesign the live 2×2 slot grid? | **No.** That APPLY did **not** change tile count, 2×2 grid, or `aspect-ratio: 16/9`. It changed **rail** thumbs (vehicle vs plate), lightbox, poller `vehicleUrl`, sidecar vehicle ONNX. |
| Are the slots **broken / cut off** now? | **Yes — FAIL.** Screenshot: slots 3–4 only a thin strip at the bottom. That **violates** the live-matrix viewport rule. |
| Who owns the mess? | **ANPR Live layout genre** (roster + 2×2 + 8-rail side) was already fragile (`min-height: min(70vh, 720px)` + tiles with **fixed 16:9 aspect-ratio** → row height overflows the panel). Vehicle APPLY did **not** invent that geometry, but also **did not fix it**, and rail CSS tweaks did not restore a locked viewport. **Agent should have refused to leave Live cut off.** Treating that as **layout debt = open FAIL**, not “operator imagination.” |
| “8 slots can’t be seen” | Live watch is **4** video slots (`1/4 live`). **8** = Recent plates **rail** cards. Cut-off problem on screenshot is the **bottom live row (slots 3–4)**. Rail also feels cramped — separate from live grid. |

**Rule break verdict:**  
- **Intentional redesign of slots in vehicle APPLY?** No.  
- **Live matrix cut by page = rule FAIL?** **Yes.** Must be a named layout fix — not ignored.

---

## 2) Why rail still does not show “whole motor / vehicle”

Screenshot reading (operator lens):

| What you see | What it means |
|--------------|----------------|
| Top rail cards = blue scrap + plate-ish text | Primary thumb fell back to **tight plate / junk crop**, or vehicle box was wrong / missing → `vehicleUrl` empty → UI uses `cropUrl` |
| Lower cards = night moto / scooter partial | Vehicle detect **sometimes** fires, but crop is still **tight** (pad default **8%**) — not “whole vehicle in frame” |
| Speed OK | Cadence MOB worked; **geometry / product** did not |

So: **fast ≠ correct.** VEHICLE-SCENE APPLIED on paper; **field FAIL** for “whole vehicle.”

Locked product need (unchanged):

- Rail / match evidence must show a **recognizable whole vehicle** (moto / car / bus / lorry), not plate scrap or bumper scrap.  
- Plate crop may sit as a **small secondary** strip. Matching still uses plate text/lists.

---

## 3) Your idea — full live slot + smaller slower PiP (“iframe”) for crop

Plain English of what you asked:

```text
Each live slot:
  ┌─────────────────────────────┐
  │  REAL live FLV (full slot)  │  ← ops watch (unchanged attach parity)
  │                    ┌──────┐ │
  │                    │ PiP  │ │  ← slower / still-friendly decode
  │                    │ grab │ │     used ONLY for vehicle+plate crop
  │                    └──────┘ │
  └─────────────────────────────┘
Rail / match ← crop WHOLE vehicle from PiP/grab path ← then OCR / list match
```

| Piece | Recommendation |
|-------|----------------|
| “iframe” | Prefer **PiP `<video>` / canvas** inside the tile (same origin FLV or periodic still), **not** a literal cross-origin `<iframe>` (CORS / second WVP session pain). Call it **PiP grab surface** in product language. |
| Full slot | Keep **current** Me8LivePlayerFactory FLV primary — do not replace with slow stream. |
| PiP | Smaller, bottom-right; may run **lower FPS / longer buffer / still snap** so vehicle detector sees a stable frame. |
| Crop | Vehicle box on PiP/still with **large pad** (or full vehicle hull) → `vehicleUrl`; plate on that ROI → match. |
| Risk | Second decode per cam = CPU. Cap: PiP only for **active** watched cams (≤4). |

**Agent pick (one path):**  
Next crop MOB = **widen vehicle scene crop** (pad / hull / refuse plate-only as rail primary) **plus** optional **PiP grab** if still grabs stay junk.  
**Do not** start with a literal iframe experiment.

**Layout MOB must be separate or first:** fix cut-off 4-slot Live to viewport lock **before** more crop chrome, or PiP will sit on a broken grid.

---

## 4) Proposed APPLY names (order)

| # | MOB | Why |
|---|-----|-----|
| 1 | `ANPR-LIVE-TILES-VIEWPORT-LOCK-V1` | Fix 2×2 cut-off; all 4 slots fully visible; no page scroll for matrix. **Rules compliance.** |
| 2 | `ANPR-LIVE-WHOLE-VEHICLE-CROP-V1` | Rail primary = whole vehicle (big pad / hull); never promote plate scrap as main thumb when vehicle exists; drop plate-only fallback as primary. |
| 3 | `ANPR-LIVE-PIP-GRAB-CROP-V1` (optional) | PiP slower grab inside slot for crop path — only if (2) still fails on live FLV stills. |

**Do not bundle 1+2+3 without operator naming.** Prefer **1 then 2**.

---

## 5) Explicit non-goals

- Turning off WVP handoff / new Fleet video stack  
- Port / IP / license lectures in this genre  
- Declaring VEHICLE-SCENE PASS  
- Changing live slot count to 8 without a named MOB (today = 4 live + 8 rail)

---

## Lock

1. **Slots cut off = FAIL / rule break** — fix with `ANPR-LIVE-TILES-VIEWPORT-LOCK-V1`. Vehicle APPLY did not redesign slots but left Live illegal.  
2. **Whole vehicle still FAIL** — fast crop ≠ correct crop.  
3. **PiP grab** idea accepted as optional follow-up; not literal iframe first.  
4. No code until you `MOB-APPLY` a name above.
