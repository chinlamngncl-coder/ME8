# MOB DISC — Wake-up finalisation brief (leftovers · tests · industry) — 2026-08-11

**Status:** PAPER ONLY — read when you wake. **No code this turn.**  
**Updated:** 2026-08-11 — added **ANPR Colab enhancement** (§2b, Pri 2, industry).  
**Read:** `.cursorrules` · zero-change without APPLY · one MOB at a time · no ship nag · WVP stays / no park.  
**Audience:** Operator (you). Agent owns diagnosis/order; you PASS/FAIL from what you see after restart + hard refresh.

**Also true when you return:**

1. **Weapon** Track B Colab (negatives + knife) will be **finished** on your side → then reload APPLY.  
2. **ANPR enhancement via Colab** is now an explicit leftover genre (same brief) — **not** the same as Weapon RF-DETR folders; needs its own Colab plan → train → sidecar swap. Do **one** AI Colab genre at a time unless you override.

---

## 0) How to use this document

1. Skim **§1 Done recently** (what not to re-open).  
2. Do **§2 Smoke tests** (leftover proof — no APPLY unless FAIL).  
3. Pick **one** item from **§3 Recommended queue** when coding again.  
4. Use **§4 Industry wishlist** only for consideration — not automatic homework.  
5. **Ship / pack** only when you say ship — then pack gather + pre-ship gate (not today).

---

## 1) Done recently (treat as PASS unless re-broken)

### SOS / live / ledger (Aug 10)

| Item | Status | Notes |
|------|--------|--------|
| Post-teardown CleanData → StopRecord (`POST-TEARDOWN-CLEAN-STOP-V2`) | **PASS** (you) | Keep; do not spam more timing APPLYs without log proof |
| SOS ledger last frame on WVP FLV | **PASS** | `SOS-LEDGER-LAST-FRAME-FLV-V1` |
| Ack mute-hold (60s) in live Ops `index.html` | **PASS** | Not `dashboard-boot.js` |
| Banner middot mojibake | **APPLIED** | Spot-check once |
| Path B Record on SOS raise | **Kept by design** | Start record ≠ stop failure |

### Alert audio (Aug 10)

| Item | Status |
|------|--------|
| Presets + hold 5/8/10s | **APPLIED / in use** |
| Custom tone upload SOS + Analytics (server files) | **PASS** (“ok done”) |
| Header Mute + Repeat | **Removed on purpose** (you ordered) — silence via Enable voice / Enable alert tones |
| Per-action Weapon≠FR≠ANPR custom files | **Not done** (optional V2) |

### Brand / auth / copy (Aug 10–11)

| Item | Status |
|------|--------|
| C2 UI → Axiom (`BRAND-C2-UI-STRINGS-AXIOM-V1`) | **APPLIED** — chip = Axiom status |
| Users & authority Search / Role / Stations | **PASS** |
| Filter above hint + professional Stations copy | **PASS** (hint-order V1) |
| UI-COPY professional V1 (+ earlier V2 table) | **APPLIED** — spot leftover teachy hints only if loud |

### Evidence / cases (earlier Aug 10 discs — assume PASS unless you reopen)

Retention categories, delete queue 7d, ops-case notes/bind/picker, case-file continue — **genre largely applied**. Re-test only if a customer story fails.

---

## 2) Leftover **tests** (no code — prove before next APPLY)

Do these when fresh. One hard refresh per area. Mark PASS/FAIL on paper.

### A — Dashboard Authentication

1. Users & authority: title → **Search / Role / Stations** → hint **below**.  
2. Search `ncl` / Role Operator / Stations Assigned — list shrinks; clear → full list.  
3. Edit a filtered user → Save still works.  
4. Site security → Alerts & voice: presets + Custom Default|Custom + Preview (no save) + **Save alert tones**.  
5. Custom file survives refresh (server). Default tab uses preset again after Save.

### B — SOS (lab BWC)

1. Raise SOS → Path B Record (LED/SD if your firmware shows it).  
2. Live opens; Ack; note mute-hold behaviour.  
3. Stop live → wait ~3s → CleanData + StopRecord in `fleet.log` (`post_teardown_clean_stop_v2`).  
4. LED/SD should stop self-record (device flaky OEM possible even if log once-ok).  
5. Ops case / ledger: **last frame** not white junk.  
6. Banner text: no `Â·` garbage.

### C — Alert sound

1. Preview SOS / Preview analytics.  
2. Real SOS: attention → speech (if on) → hold ~8s.  
3. Weapon / FR / ANPR hit: analytics tone (preset or custom).  
4. Uncheck Enable alert tones → silence.

### D — Live video (WVP handoff — regression smoke)

1. Ops wall: one cam Live; Stop chrome correct.  
2. Command Wall + FR live tile still Live (prior PASS — quick glance).  
3. Map pin mirror still shows picture when wall live (Firmware Gold rule — don’t freestyle pin attach).

### E — Weapon (when Colab done)

1. Copy `weapon_rfdetr_best.pt` → `ai_engine/weights/`.  
2. Say **`MOB-APPLY WEAPON-B-NEGATIVES-RELOAD-V1`** (sidecar reload — do **not** invent train flags).  
3. Lab: knife / gun stills + hard negatives (car/bull-bar) — fewer false car hits, knife still fires.

### F — ANPR (Colab enhancement — when that genre runs)

Locked product rules (do not violate in Colab or APPLY):

| Path | Engine | Blur gate |
|------|--------|-----------|
| Live BWC | **FastALPR only** (single-engine fast path) | Laplacian **&lt; 35** |
| High-res / CCTV | Dual: FastALPR + HyperLPR | Blur gate **100** |
| Forbidden | Generic word OCR (e.g. PP-OCRv4) for plates | — |

Lab proof after weights/swap:

1. Live BWC: plate read without lag regression (fast path still FastALPR-only).  
2. Hard cases you care about (night / angle / PH plate style / yellow PUV if still a site pain) — better than pre-Colab baseline.  
3. No accidental engine swap to banned OCR.  
4. Plate lists / hit alert still fire.

---

## 2b) AI Colab genres (Weapon + ANPR)

| Genre | What Colab is for | After Colab (APPLY) | Honest constraint |
|-------|-------------------|---------------------|-------------------|
| **Weapon Track B** | Negatives (car/SUV/bull-bar) + knife positives; RF-DETR Medium recipe in `ai_engine/colab/WEAPON-B-BOTH-COLAB.md` | `WEAPON-B-NEGATIVES-RELOAD-V1` | Apache stack; overwrite `weapon_rfdetr_best.pt` |
| **ANPR enhancement** | Improve **your** plate detect and/or OCR on **site stills** (crops + labels) | Named later: e.g. `ANPR-COLAB-PLAN-V1` (paper) → `ANPR-COLAB-TRAIN-V1` → `ANPR-WEIGHTS-RELOAD-V1` | **Not** Weapon copy-paste. License-clean trainers only (MIT/Apache). Keep FastALPR live fast-path. See `MOB-DISC-SELF-TRAIN-WEAPON-FR-ANPR-20260807.md` |

**Order recommendation when you wake:**

1. Finish **Weapon** Colab → reload → lab PASS.  
2. Then open **ANPR Colab** as its own genre: first **`MOB DISC` / `MOB-APPLY ANPR-COLAB-PLAN-V1`** (cells, dataset layout, what improves detect vs OCR) — **no train invent** until that plan is locked.  
3. Do **not** mix Weapon and ANPR weights in one notebook.

**FR reminder:** enroll Known Subjects = product “train who to alarm.” Full FR CNN Colab fine-tune is **not** the same easy path — out of this Colab pair unless you open a separate FR disc later.

Priority = **ship-risk / operator daily pain / locked WVP ladder**. Not “everything ever parked.”

| Pri | Arc | Why | Next step |
|-----|-----|-----|-----------|
| **1** | **Weapon reload after Colab** | You said Colab finishes when back | `MOB-APPLY WEAPON-B-NEGATIVES-RELOAD-V1` then lab PASS |
| **2** | **ANPR Colab enhancement** | You asked to enhance ANPR via Colab too | After Weapon PASS: `MOB-APPLY ANPR-COLAB-PLAN-V1` (paper/cells/dataset) → train → `ANPR-WEIGHTS-RELOAD-V1` — keep FastALPR live path |
| **3** | **WVP live lifecycle** | Locked phase 1 — stop / signal lost / stall on FLV wall | Re-read harm disc; if still FAIL → `FLV-WALL-LIFECYCLE-PARITY-V1` (or current named successor if already half-done — **confirm with log/UI before APPLY**) |
| **4** | **Wall / pin audio** | Industry C2: hear field while watching | `WALL-AUDIO-PATH-V1` after video lifecycle stable |
| **5** | **Conference BWC under handoff** | Broken while WVP handoff ON (harm B10) | `CONFERENCE-BWC-INGRESS-WVP-HANDOFF-V1` when VC matters for demo |
| **6** | **PTT 29201 when cam WVP-homed** | Soft PTT reliability | `PTT-29201-WVP-HOMED-V1` only with failing lab proof |
| **7** | **Dual-record dock must** | Ops/compliance story | `OPS-CASE-DUAL-RECORD-AUTO-DOCK-MUST-V1` when dock on desk |
| **8** | **Alert tones per-action** | Weapon ≠ Face ≠ Plate files | Optional `HQ-ALERT-PER-ACTION-TONES-V2` — only if SOP demands |
| **9** | **Session mute control** | Header mute removed | Optional Settings “Mute alerts this session” — only if you miss it |
| **10** | **UI copy leftovers** | Teachy bombs only | Named key APPLY or copy follow-up **after you grant Grep** |
| **11** | **Ship / manuals / TOTP** | Pack time only | Pack gather + pre-ship gate; `FM_TOTP_SUSPENDED` off for real customer |

**Do not** open books of MOBs. One APPLY → you PASS → next.

---

## 4) Industry lens — worth considering (not automatic)

Body-worn / PSAP / control-room products (Axon-class / Genetec-adjacent expectations) usually need these **stories**. Map to ME8 honestly.

### 4.1 Must-feel solid before customer demo

| Story | ME8 today | Worth? |
|-------|-----------|--------|
| SOS → see live + hear alert + ack | Strong (recent work) | Re-smoke §2B–C |
| Stop live stops device SD when you commanded Record | Log OK; device OEM flaky | Document OEM limit; don’t infinite timing APPLYs |
| Evidence chain (keep / delete queue / retention) | Applied | One customer walkthrough |
| Live wall stop/signal chrome under FLV | Historically harmed | **Pri 2** |
| Field audio while watching wall | Historically weak under FLV | **Pri 3** |
| Roles / groups / least privilege | Filter + hierarchy OK | Spot-check Assigned-only operator |

### 4.2 High value if you sell “AI + ops”

| Story | ME8 today | Worth? |
|-------|-----------|--------|
| Weapon AI false positives on cars | Colab Track B | **Pri 1** when back |
| **ANPR accuracy on your plates / night / angle** | Engines + lists strong; **site fine-tune via Colab** still open | **Pri 2** after Weapon — industry expects local plate performance, not only generic OCR |
| FR / ANPR / Weapon desk tones distinct | Shared analytics custom | Optional per-action V2 |
| Cases + Case Files + PDF/report | Two concepts exist | Manuals must explain; avoid merging without APPLY |
| Redact / export for court | Paths exist | Demo script + one FAIL→fix only |

**ANPR Colab — what “enhancement” usually means in industry**

| Target | Typical gain | ME8 note |
|--------|--------------|----------|
| Plate **detector** (find the plate box) | Fewer missed / sliver crops | Fine-tune detect on your camera stills |
| Plate **OCR** (read characters) | Fewer wrong chars on PH / worn / yellow | Fine-tune reader **or** harden dual path — keep FastALPR on live BWC |
| Lists / rules only | Which plates alarm | Already product — not Colab |

Do **not** expect one zip + RF-DETR Weapon recipe to equal ANPR. Wrong architecture.

### 4.3 Nice / later (don’t block finalise)

| Story | Note |
|-------|------|
| Until-Ack looping siren | Fatigue risk; hold 8s is industry-safer default |
| Multi-language parity for new EN copy | th/id/ko/fil lag — V2+ locales only if customer needs |
| ZLM latency → ~2s wall | **PARKED** (your rule) — don’t reopen without named latency MOB |
| GIS offline / CAD deep | Only if RFP demands |
| Cloud multi-tenant polish | SaaS path exists — not lab-blocker |

### 4.4 Explicitly out of “finalise this week”

- Renaming Mobility Axiom / Ubitron  
- Turning off WVP handoff “to fix lab”  
- Firmware Gold pin dual-JSMpeg  
- DeviceControl back to `sip_txn`  
- Daily SOS ledger / TOTP nag  

---

## 5) Open arcs from older “what’s left” (updated)

From `MOB-DISC-WHATS-LEFT-ONE-BY-ONE-AFTER-COPY-20260810.md` — refreshed:

| Old # | Arc | Now |
|-------|-----|-----|
| 1 Alert/SOS audio | Mostly **done** + custom files PASS — only re-test |
| 2 Dual-record dock | **Still open** — needs dock |
| 3 SOS lab Part 1 | **Mostly PASS** — keep smoke |
| 4 Case File / picker | Applied — spot-check |
| 5 Weapon Track B | **Your Colab → then reload APPLY** |
| 5b **ANPR Colab enhance** | **NEW leftover** — plan → Colab → reload; after Weapon |
| 6 WVP ladder | **Still the big remaining engineering genre** |
| 7 Ship | Pack time only |

Parent open-arcs file (if present): `MOB-DISC-OPEN-ARCS-DO-NOT-DROP-20260809.md` — do not drop; reconcile against this brief when coding.

---

## 6) WVP / Fleet parity reminder (locked order)

Unless you override a phase number:

| Phase | Intent |
|-------|--------|
| 1 | FLV wall lifecycle (stop / signal / stall) |
| 2 | Command Wall (prior PASS — don’t regress) |
| 3 | FR live tiles (prior PASS) |
| 4 | Pin FLV mirror harden |
| 5 | Pin focused open / layout storm |
| 6+ | Audio, PTT 29201, PTT group, panel polish |

Source of truth: `MOB-DISC-WVP-HARM-100-CONSOLIDATION-FIX-PLAN-20260720.md` + `me8-wvp-finish-no-park`.

---

## 7) Git / checkpoint hygiene (when you ask)

- Genre batch commit/push only when **you** confirm genre PASS (`lab-git-push-<genre>`).  
- Do not commit `.env`, weights dumps, or huge ops-cases noise unless you ask.  
- Baselines / Firmware Gold: restore only on your phrase.

---

## 8) First messages when you wake (suggested)

**Copy-paste one:**

```text
Weapon Colab done. MOB-APPLY WEAPON-B-NEGATIVES-RELOAD-V1
```

or

```text
Weapon PASS. MOB-APPLY ANPR-COLAB-PLAN-V1
```

or

```text
Smoke §2 PASS except <X>. MOB-APPLY <exact name>
```

or

```text
MOB DISC only — update wake-up brief after smoke
```

---

## 9) One-line verdict

**Product is close on SOS desk UX, auth filters, alert tones (incl. custom), and copy.**  
**AI when you return: Weapon Colab → reload PASS, then ANPR Colab enhancement (own plan — not Weapon clone; keep FastALPR live).**  
**Biggest remaining engineering mountain is WVP/FLV parity (lifecycle → audio → conference/PTT).**  
**Biggest compliance mountain with hardware is dual-record + dock.**

No APPLY this document. Sleep well — run §2 smoke, then **one** Pri from §3.
