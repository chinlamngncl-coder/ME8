# MOB DISC — Analytics engines pack like FR + public notice after weapons

**Date:** 2026-07-29  
**Status:** **LOCKED reminder** (no code in this disc)  
**Search:** analytics pack FR parity, ANPR sidecar ship, weapon pack, tessdata, public notice  
**Trigger (operator):** “analytics must be packed like FR” · after weapons · public notice  
**Related:**  
- FR ship copy: `scripts/me8-ship/PACK-PH-KR-ME8-ONESHOT.ps1` (`fr-sidecar`, `START-FR.bat`, `START-FACE-MATCHING.bat`)  
- ANPR snapshot: `MOB-DISC-ANPR-SNAPSHOT-CROP-READ-V1-APPLIED.md`  
- Product plan: `MOB-DISC-ANPR-PRODUCT-LIVE-SNAPSHOT-LISTS-20260729.md`  
- Manuals park: `MOB-DISC-MANUALS-V1-ANALYTICS-ANPR-WEAPON-PARK.md`  
- Ship remind (no daily nag): `MOB-DISC-SHIP-REMINDERS-NO-NAG.md` · pack gather: `MOB-DISC-SHIP-PACK-GATHER-REMINDER-20260725.md`

---

## Plain English (locked)

1. **Every Analytics starter / node / model pack** (Face, ANPR, Weapon, anything later) must ship **the same way FR already does**: already inside the customer zip / install tree — **not** “first run downloads from the internet” and **not** “lab-only folder left behind.”  
2. **Public notice** for Analytics modules (customer / site / legal / ops announcement) is **not forgotten** — do it **after Weapon detection** software genre is done (and ANPR paths are past starter), **before** treating Analytics as customer-complete.  
3. This is a **future reminder disc**, not a daily nag. AI must surface it at the right gates only (below).

---

## FR = the pack pattern (do not invent a second style)

What FR already proves on ship:

| Piece | FR pattern (keep) |
|-------|-------------------|
| Engine folder in pack | e.g. `fr-sidecar/` (app + requirements + INSTALL) |
| Operator start | `START-FR.bat` / `START-FACE-MATCHING.bat` in pack root when needed |
| Pack script | Copy into customer app dir in `PACK-*-ONESHOT` / ship gather |
| Air-gap | Customer can install/start without pulling models from a random CDN at first open |
| License | Module still gated by `analyticsFr` / license.lic — pack ≠ always-on |

**ANPR / Weapon / future analytics must match that shape** when each module reaches ship readiness:

| Module | Must pack (examples — exact names when each MOB lands) |
|--------|--------------------------------------------------------|
| **FR** | Already: sidecar(s) + START bats via ship script |
| **ANPR** | Sidecar and/or vendored OCR data (`tessdata` / YOLO weights / START bat as designed) + ship-script copy — **no silent npm first-download as the only path for customer** |
| **Weapon** | Same: detection node/weights/start + ship-script copy |
| **Any later analytics node** | Same rule before customer pack |

Lab may use download-on-first-run while building. **Customer pack gate must not.**

---

## Gap note (today — do not ignore at ship)

`ANPR-SNAPSHOT-CROP-READ-V1` uses in-process `tesseract.js`. That is fine for **lab**.  
Before customer ship of ANPR:

- Vendor language data under pack (e.g. `anpr-sidecar/tessdata`) **or** a packed ANPR sidecar with INSTALL/START like FR  
- Wire `scripts/me8-ship/…` to **copy** those assets into the zip  
- Prove offline first plate-read on a clean pack PC  

Named MOB when ready (suggested): `ANPR-SHIP-PACK-PARITY-V1` (after lists/live PASS as needed).  
Weapon: `WEAPON-SHIP-PACK-PARITY-V1` when weapon engine exists.

---

## Public notice (after weapons — do not drop)

**When:** After **Weapon detection** software genre is **PASS** (and ANPR snapshot + lists + live as far as you freeze for that ship), **before** declaring Analytics customer-complete / writing final Analytics manuals / sending pack that markets all three.

**What “public notice” means here (lock intent):**

- Customer-facing notice that optional Analytics modules (Face / ANPR / Weapon) exist, what they do in plain English, license/entitlement, and any **legal / privacy / model-use** notes required for that market  
- Not a daily chat nag; not a fake marketing page in-lab  
- Align with manuals unlock (`MANUALS-V1-ANALYTICS-ANPR-WEAPON-SYNC-V1`) and module licensing language already sketched in `MOB-DISC-MODULE-LICENSING.md`

**Suggested APPLY later:** `ANALYTICS-PUBLIC-NOTICE-V1` (paper + any UI/README/ship notice only after weapons PASS).

---

## When the AI must remind (gates only)

| Gate | Reminder |
|------|----------|
| Ordinary ANPR/FR/live MOB | **Silent** on this disc |
| Designing / APPLY a new analytics engine or “starter node” | Remind: **pack like FR** before calling it ship-ready |
| Operator says **ship / pack / customer pack** and Analytics modules are in the build | Add to pack gather: **FR + ANPR + Weapon assets actually in zip** (parity check) |
| Operator says weapons **PASS** / weapons genre done / “Analytics finished” | Remind: **`ANALYTICS-PUBLIC-NOTICE-V1`** still pending unless already done |
| Manuals unlock for ANPR/weapon | Cross-check pack parity + public notice status |

**Forbidden:** Opening every session with “remember pack / public notice.”

---

## Agent must / must not

**Must**

- Treat “packed like FR” as a **ship acceptance** rule for every analytics engine  
- Keep this disc linked from ANPR/weapon product discs  
- At ship/pack: verify analytics folders + start bats are copied, not only license flags  

**Must not**

- Ship ANPR/Weapon that only work after online model download on customer PC  
- Invent a second dashboard/installer style for analytics nodes  
- Forget public notice after weapons by jumping straight to “done”  
- Nag daily  

---

## Lock record

| Item | Decision |
|------|----------|
| Analytics starters/nodes/packs | **Must ship like FR** (in zip + start path + air-gap) |
| Lab download-on-first-run | OK while building; **not** customer ship |
| Public notice | **After weapons PASS**, before Analytics customer-complete |
| Daily remind | **No** |
| Suggested later MOBs | `ANPR-SHIP-PACK-PARITY-V1` · `WEAPON-SHIP-PACK-PARITY-V1` · `ANALYTICS-PUBLIC-NOTICE-V1` |

**No code in this disc.** Code only after named `MOB-APPLY` for a parity or notice MOB.
