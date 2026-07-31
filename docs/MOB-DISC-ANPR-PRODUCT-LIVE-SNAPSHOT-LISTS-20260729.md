# MOB DISC — ANPR product plan: live ZLM + snapshot crop + plate lists (go / no-go)

**Date:** 2026-07-29  
**Status:** **LOCKED recommendation — GOOD TO CARRY ON** (software genre; manuals later)  
**Search:** ANPR, plate crop, snapshot upload, watchlist blacklist wanted, Analytics UI unified, YOLO colour model  
**Depends on:** `MOB-DISC-ANPR-ZLM-WORKER-STREAM-FANOUT-20260729.md` · analytics park disc · writing standards  
**UI home:** **Analytics** → **ANPR** (existing nav; license `analyticsAnpr`)

---

## Plain answer

**Yes — continue.** The ZLM-attach idea is good. Google/industry pattern matches what we should build:

1. **Live** — sample frames from WVP/ZLM (not a second invite to the BWC).  
2. **Snapshot / upload** — officer photo or freeze-frame → **crop plate** → read text → show result card.  
3. **Lists** — match every read against **blacklist / wanted / suspicious** (and optionally allow-list later).  

Do this **inside the existing Analytics hub** (same look as Face / Verify / Watchlist) — **not** a new sidebar dashboard CSS paste.

**Manuals:** still **later**, after ANPR UI + engine PASS.

---

## How others do it (research summary)

| Vendor / pattern | What they do | Take for Axiom |
|------------------|--------------|----------------|
| **Milestone XProtect LPR** | Live OCR on video; **match lists**; hits → events/alarms; operators search LPR events; import/export plate lists | Plate **match lists** + event history + alerts |
| **Plate Recognizer** | **Stream** (live RTSP, frame sample) **and Snapshot** (POST image API); webhooks; optional vehicle colour/make | Dual path: live worker + still upload |
| **Public-safety / parking ALPR** | Gate/live lane = continuous; mobile officer = photo upload; both hit same watchlists | BWC live **and** field photo upload share one list engine |

**Industry UX after a read (live or still):**

1. Show **cropped plate** image  
2. Show **plate text** + confidence  
3. Optional vehicle fields (colour / type) if model returns them  
4. Show **list hit** (e.g. Wanted / Blacklist / Suspicious) or “No list match”  
5. Allow operator action (ack alert, open map/cam, add note) per SOP  

That is exactly “cropping + information churning out once we go a snapshot.”

---

## Product recommendation (one path)

### A) Two intake modes (same engine, same lists)

| Mode | Operator action | Backend |
|------|-----------------|--------|
| **Live ANPR** | Select BWC(s) / start watch on Analytics → ANPR | Worker pulls ZLM/FLV URL; `process_fps` low (2–5); emit events |
| **Snapshot ANPR** | Upload photo **or** capture from live freeze | Run detect → **crop** → OCR → result panel; then list match |

Both modes call the **same** plate-read + **same** list matcher.

### B) Unified Analytics UI (must)

Stay under **Analytics** with existing hub chrome (`analytics-hub`, nav **ANPR**):

| Panel area | Content |
|------------|---------|
| Left / top nav | Already: Face recognition · Verify 1:1 · Watchlist · **ANPR** · Weapon detection |
| ANPR workspace | Tabs or segments: **Live** · **Snapshot** · **Plate lists** · **Hits / history** |
| After read | Card: crop thumbnail · plate string · confidence · colour (if model) · list badge · time · camera/officer |
| Alerts | Reuse alert/badge patterns consistent with SOS/Analytics (plain English: **Wanted**, **Blacklist**, **Suspicious**) — not “inference dump” |

**Cropping UI (Snapshot):**

1. Show full photo  
2. Auto-suggest plate box from detector (editable handles)  
3. Operator confirms crop → **Read plate**  
4. Result card fills; list match runs automatically  

Mirror the clarity of existing **Verify 1:1** (two photos → result) — same family, plate-specific.

### C) Plate lists (yes — blacklist / wanted / suspicious)

| List name (customer UI) | Meaning |
|-------------------------|---------|
| **Blacklist** | Deny / high concern (site policy) |
| **Wanted** | Law-enforcement / command priority |
| **Suspicious** | Watch / soft alert |

Optional later: **Allow list** (VIP / staff vehicles) — not required for V1.

**Rules:**

- IT/super admin maintains lists (import CSV like Milestone).  
- Every ANPR read (live or upload) is checked.  
- Hit → visible badge + optional sound/toast on Analytics / Operations (phase later).  
- Face **Watchlist** stays for faces; plate lists are **Plate lists** under ANPR (do not confuse operators by mixing face enroll with plate numbers in one dump).

### D) Models (colour + plate)

| Piece | Role |
|-------|------|
| Plate detector (e.g. YOLO plate weights) | Find box → crop |
| OCR (e.g. PaddleOCR by region) | Text from crop |
| Optional vehicle/colour head | Fill “Colour” on result card when confidence OK |

**Air-gap:** ship models in pack / offline load (same philosophy as other optional AI). No “must call cloud OCR” for enterprise on-prem.

**Do not** invent WebRTC fan-out or rip ZLM — live path stays **WVP/ZLM consumer**.

---

## Arguments / watch-outs

| Risk | Mitigation |
|------|------------|
| Many live ANPR cams melt CPU | Cap concurrent live ANPR; low FPS; license limits |
| Bad crop / blurry BWC photo | Confidence threshold; show “Low confidence — confirm manually”; allow re-crop |
| List false hits | Threshold + operator confirm on Wanted; audit log who acknowledged |
| UI sprawl | One Analytics hub only; no second dashboard CSS system |
| Manuals too early | Keep park until ANPR PASS |

---

## Suggested build order (software MOBs — when you APPLY)

| # | MOB name (suggested) | Outcome |
|---|----------------------|---------|
| 1 | `ANPR-SNAPSHOT-CROP-READ-V1` | Upload/freeze → crop UI → plate + confidence card |
| 2 | `ANPR-PLATE-LISTS-V1` | Blacklist / Wanted / Suspicious CRUD + match on read |
| 3 | `ANPR-LIVE-ZLM-WORKER-V1` | Live sample from existing play URL; events into Hits |
| 4 | `ANPR-COLOUR-VEHICLE-FIELDS-V1` | Optional colour/vehicle on card when model ready |
| 5 | `MANUALS-V1-ANALYTICS-ANPR-WEAPON-SYNC-V1` | Manuals after UI PASS |

**Start with Snapshot + crop + lists** if officers already take photos — fastest operator value.  
**Then** live ZLM worker for continuous watch.

(You may swap 1 and 3 if live corridor is the priority — say so when APPLY.)

**Agent default pick:** **1 → 2 → 3 → 4 → manuals.**  
**Progress:** `ANPR-SNAPSHOT-CROP-READ-V1` **APPLIED** 2026-07-29 — **operator OCR FAIL** (e.g. AAJ 8008 → AAJ 80584). See `docs/MOB-DISC-ANPR-OCR-FAIL-FR-STYLE-LIVE-VIDEO-CROP-MATCH-20260729.md`.  
**Pack / notice lock:** `docs/MOB-DISC-ANALYTICS-PACK-LIKE-FR-AND-PUBLIC-NOTICE-AFTER-WEAPONS-20260729.md` — analytics nodes pack like FR; public notice **after weapons**.  
**Next default MOB:** `ANPR-PH-OCR-HARDEN-V1` (main-line band + yellow PUV preprocess + O/0 — ROI V1 field FAIL on tight crop).  
**ROI V1:** partial PASS bumper synthetic · **FAIL** yellow PUV — `docs/MOB-DISC-ANPR-ROI-V1-FIELD-FAIL-YELLOW-PUV-20260729.md`

---

## UI / design system

- Use existing **Analytics** hub + `global.css` tokens (`--accent-blue`, cards, buttons).  
- **Reject** the earlier “unified dashboard CSS” paste as the shell.  
- New ANPR controls: plain names — **Read plate**, **Crop**, **Upload photo**, **Plate lists**, **Hits**.  
- Match writing standards: bold exact labels when documented later.

---

## License

Gate with existing **`analyticsAnpr`**. Padlock **ANPR** tab when off (already sketched in hub).

---

## Operator decide

If you agree this plan:

1. Say **go ahead** / `MOB-APPLY ANPR-SNAPSHOT-CROP-READ-V1` (or name another first MOB from the table).  
2. Or say **swap: live first** if continuous BWC watch is more important than upload.

No code until that APPLY.

---

## Lock record

| Item | Decision |
|------|----------|
| Continue ZLM-attach ANPR? | **Yes** |
| Snapshot + crop + result card? | **Yes — required** |
| Upload officer photo + list match? | **Yes — same engine** |
| Blacklist / Wanted / Suspicious? | **Yes — Plate lists** |
| Unified UI under Analytics? | **Yes** |
| Manuals now? | **No** |
| First software MOB (default) | `ANPR-SNAPSHOT-CROP-READ-V1` |
