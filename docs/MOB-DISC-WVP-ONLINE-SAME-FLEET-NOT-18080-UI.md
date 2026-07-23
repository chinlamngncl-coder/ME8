# MOB DISC — Rest of testing: **same Fleet** (not “go try :18080 UI”)

**Status:** DISC locked  
**Date:** 2026-07-16  
**Search:** `fleet or 18080`, `online rest test`, `not old tile`, `same fleet`  
**Operator:** Which one — same Fleet or 18080? Don’t ask to retry the old tried path. Need to **go online** already for the rest of the test.

---

## Direct answer

| Piece | Role | Operator uses? |
|-------|------|----------------|
| **Fleet / Mobility Axiom** `http://192.168.1.38:3988` | **Same product dashboard** — wall, Open All, map, PTT, evidence | **YES — this is the online path** |
| **WVP** `http://127.0.0.1:18080` (lab also `…38:18080`) | **Backend** media/GB service + ZLM (`me8-wvp` / `me8-wvp-zlm`) | **No** as the day-to-day test UI for “rest of testing” |
| Old lab `/test-wvp-tile.html` / Track-B-only tile soaks | Earlier prove path | **DONE / do not re-ask** |

**Same Fleet.** WVP `:18080` must be **running** (we bring it up). Operator does **not** leave Fleet to “test on 18080” for the rest of online work.

Flow (locked):

```text
Operator @ Fleet :3988  →  wall Open All / 2+ BWC
        ↓
Fleet broker calls WVP (:18080 startPlay) → WVP-ZLM FLV soft overlay
        ↓
If WVP down → FFmpeg underneath (NOT a ZLM pass — say so)
```

Proof still: log `live broker wvp-zlm primary` — not “I opened the WVP admin page.”

---

## Forbidden (waste)

- “Try the WVP UI on 18080 instead” as the main rest-test  
- “Open test-wvp-tile again” after that path was already tried  
- Treating Gate B `:8080` me8-zlm relay as the product online path  
- Another FFmpeg-only soak sold as going online on ZLM  

---

## “Go online” for rest of testing (locked meaning)

| Mean | Detail |
|------|--------|
| **UI** | Fleet dashboard only (`:3988`) |
| **Media primary** | WVP-ZLM via live adapter (Docker WVP stack up) |
| **Fallback** | Fleet FFmpeg — safety only; not the rest-test success story |
| **Agent** | Keep WVP stack up; preflight before calling a run a ZLM test; stop asking path choice |

Operator already chose WVP-ZLM. Rest of test = **Fleet online with that backend**, not a second product.

---

## SIP note (no re-ask — fact only)

- Fleet SIP **5060** = FFmpeg / legacy invite path  
- WVP SIP **5061** = WVP registration for `startPlay`  
BWCs must be reachable for WVP play for soft ZLM to win. If cams only on Fleet SIP and WVP has no device, broker falls back — agent diagnoses; does not send operator to old tile page as the fix.

---

## Related

- Stop asking: `MOB-DISC-WVP-ZLM-STOP-ASKING.md`  
- No soak without preflight: `MOB-DISC-WVP-NO-SOAK-WITHOUT-PREFLIGHT.md`  
- Multi-cam wall: `MOB-APPLIED-WVP-WALL-MULTI-CAM-ZLM-V1.md`  
- Broker primary: `MOB-DISC-WVP-LIVE-ADAPTER-ENABLE-ZLM-PRIMARY-LAB-V1.md`

---

## One line

**Rest of testing = same Fleet `:3988` with WVP-ZLM behind it. `:18080` is the engine — not a second UI to go retry.**
