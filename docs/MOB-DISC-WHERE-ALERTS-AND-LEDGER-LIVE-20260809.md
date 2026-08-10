# MOB DISC — Where SOS / FR / ANPR alerts & ledger live (2026-08-09)

**Status:** LOCKED map for the operator. **Yes — the Cases office work is done** (store + desk + wires).  
**Not the same thing:** live toast/HQ blink ≠ saved office. Field report Case Files ≠ Ops Cases.

---

## One-screen answer

| What you mean | Where to look in software | Saved how | Done? |
|---------------|---------------------------|-----------|-------|
| **Office after Ack** (SOS / Face / Plate / Weapon) | **Evidence → Cases** | `storage/ops-cases/…` JSON (`SO-` / `FR-` / `AN-` / `WD-`) | ✅ Yes |
| **SOS just pressed (before Ack)** | Today: Ops **SOS LOG** only until Ack. **Agreed shift:** case on raise + rename LOG → case — `MOB-DISC-SOS-LOG-TO-SOS-CASE-SHIFT-20260809.md` | Ledger + Ops Cases bridge | ⏳ shift APPLY pending |
| **SOS live + ledger strip** | **Operations** (SOS panel / ledger list) | Existing SOS incident ledger (same as before) | ✅ Yes (older) |
| **Field report folders** (narrative + linked clips) | **Evidence → Case Files** | Case-files store (separate) | ✅ Yes (separate product) |
| Live toast / red-orange HQ bar | Any page while alarm is up | Not the filing cabinet — Ack / Open / Map only | ✅ Alarm UX; office = Cases |

---

## A. Ops Cases (the “alerts office” you asked about)

**Path:** Evidence & Docking → left nav **Cases**.

| Alert type | How it gets into Cases | Case id prefix |
|------------|------------------------|----------------|
| SOS | Ack (or Ack-only path) from SOS | `SO-` |
| Face (FR) | Ack / dismiss from FR alert | `FR-` |
| Plate (ANPR) | Ack / dismiss from ANPR alert | `AN-` |
| Weapon | Ack / dismiss / overflow | `WD-` |

**On disk (lab):** under storage ops-cases tree — day → SOS or ANALYTICS → type → one JSON per case (notes + audit).  
**SOS Cases link** the existing SOS ledger id — not a second SOS database.

**APPLY arc (done):** desk + SOS/Weapon/FR/ANPR wire — see `MOB-DISC-OPS-CASE-CONSOLIDATED-WEBCHECK-20260809.md`.

---

## B. SOS ledger (Operations — still exists)

**Path:** Operations → SOS area / **ledger list** (incident history strip you already use).

- Live SOS handling, dual media cards (HQ / Ground when linked), Record-on-alarm, etc.  
- When you Ack into Cases, the **ledger incident stays**; Cases holds the office notes/status.

**Part 1 testing now:** SOS Record + link. **Dock Part 2** delayed (no station).

---

## C. Case Files (field reports — different desk)

**Path:** Evidence → **Case Files**.

- Officer **field report** narrative + link library evidence.  
- Can create from SOS / link SOS.  
- **Not** the auto FR/ANPR/Weapon analytics case list (that is **Cases**).

Recent: Save requires narrative + jumps to list (`CASE-FILES-SAVE-JUMP-LIST-V1`).

---

## D. What is *not* “saved to Cases”

| Surface | Role |
|---------|------|
| Toast / HQ blink | Alarm only until Ack |
| Weapon History panel | Retrieve / reopen path; Ack also feeds Cases |
| Analytics Live rails | Live investigation — not the long-term office |

---

## E. If you “forgot” — quick check

1. Hard refresh.  
2. Trigger or find an Ack’d Face / Plate / Weapon / SOS.  
3. **Evidence → Cases** → filter family/type → open row → notes.  
4. For raw SOS timeline: **Operations** SOS ledger.  
5. For written field report: **Evidence → Case Files**.

---

## F. Still open (not “where is it”)

- Dock Part 2 prove (no station).  
- Weapon B later.  
- Optional: more Case Files / Cases polish only if you name APPLY.

**Agent:** When user asks “where are alerts saved?” → this disc. Do not invent a second office.
