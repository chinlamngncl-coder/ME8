# MOB DISC — Wake-up checklist: still to finish (migration only · no invent)

**Date:** 2026-07-21 ~01:21  
**Status:** LOCKED PAPER — **no APPLY tonight** · operator wakes → continue  
**Operator:** *There are still some to finish right? VC adding video of BWC (also already in baseline), Call (baseline), anything else? Double check. When I wake up we will do it. Migration, not new invention, do not keep patching.*

---

## Direct answer

**Yes — more remains before ship.**  
**No — we do not invent new products.** Each open item is **Fleet/baseline already had it**; under WVP handoff it broke or never got the paint pipe. Work = **migrate that baseline function onto WVP**, same as Command Wall / FR / popout.

**Rule when you wake:** one named MOB from the list below → PASS → next. No pin inventons. No Tactical until video + vuln done.

---

## Already PASS (do not redo)

| Surface | Notes |
|---------|--------|
| Ops wall lifecycle (Stopped / signal / stall) | `FLV-WALL-LIFECYCLE-PARITY-V1` |
| Command Wall Live | `COMMAND-WALL-FLV-HANDOFF-V1` |
| FR live watch tiles | `FR-LIVE-WATCH-FLV-HANDOFF-V1` |
| Panel popout + matrix popout + Close-safe | FLV handoff MOBs |
| Evidence / SOS ledger / login chrome (non-live) | Not in this video scar list |
| Tactical Zone & Evidentiary Engine | **Parked after** video + vuln — architecture noted, **not now** |

---

## Open — video / voice migration (Track A · lab when you wake)

Ordered for wake-up. **Baseline exists for each.**

| # | What | Baseline fact | Status now | Migration MOB (existing names — not new invention) |
|---|------|---------------|------------|-----------------------------------------------------|
| **1** | **Map pin + picture + Call chrome** | Classic pin + Call (`toggleVoiceCall` / `start-bwc-call`) | Cleanup **APPLIED** tonight — **your PASS pending** | `PIN-FLEET-BASELINE-PLAYER-ONLY-CLEANUP-V1` — **test first on wake** |
| **2** | **Call reliability** (WVP-homed BWC) | Fleet Call on `:29201` | Still FAIL / flaky when cam on WVP `:5060` | `PTT-29201-WVP-HOMED-V1` — migrate Call/PTT login path, **don’t redesign Call** |
| **3** | **VC — let BWC video into conference** | Baseline conference ingress via Fleet pool INVITE | **Broken under handoff** (pool INVITE skipped) | `CONFERENCE-BWC-INGRESS-WVP-HANDOFF-V1` — same “let BWC in” product; feed from **WVP/ZLM**, not new VC app |
| **4** | **Wall listen audio** | Fleet PCM listen with live | Likely dead (`hasAudio:false` on FLV) | `WALL-AUDIO-PATH-V1` — restore listen, don’t invent player |
| **5** | Soft **PTT** / group Join edge cases | Fleet PTT + groups | Partial | `PTT-GROUP-SELECT-1PLUS-V1` then mesh `SOS-GROUP-FIELD-RX-RELAY-V1` only if still needed after 29201 |
| **6** | Pin dock jump / panel 16:9 polish | Classic dock + Jul-19 panel | Jump still reported; panel polish lost in restore | **Only after 1–3 PASS** — restore classic dock timing / reapply panel from baseline — **not** FOCUSED-OPEN inventons |
| **7** | Map TV popout mirror | Depends on ops wall | Unknown | After pin PASS |

**You named correctly:**

- **VC + BWC video** → row **3** (baseline conference; migrate ingress to WVP).  
- **Call** → rows **1** (chrome/path cleanup test) then **2** (29201 when WVP-homed).  

---

## Open — ship blockers (after Track A lab PASS)

| Track | What | Rule |
|-------|------|------|
| **B — Vuln** | Google four-pack S0–S3 (`mob-sec-evidence-upload-safe-name` …) | **Before customer zip** — already locked |
| **C — TLS / HTTPS / WSS** | Secure context for mic, wss, same-origin media | **Before multi-PC / customer LAN** |
| **D — Tactical Zone & Evidentiary** | Architecture locked | **After** video + vuln — see `MOB-DISC-TACTICAL-ZONE-EVIDENTIARY-ENGINE-AFTER-VIDEO-VULN-20260721.md` |

---

## Wake-up procedure (operator)

1. Right-click `RESTART-FLEET.bat` → Run as administrator (skip broken `LAB-CONSOLE-START` until small bat fix).  
2. Hard refresh.  
3. **First:** re-test tonight’s cleanup — pin-only → picture → **Call**.  
   - PASS → go to **VC BWC ingress** or **PTT-29201** (agent picks by fail symptom).  
   - FAIL → say which (video / Call / jump) — **cleanup again vs classic**, not a new invent MOB.  
4. Then VC “add BWC video” migration.  
5. Do **not** start Tactical / export until A + B done.

---

## Agent must remember

| Do | Do not |
|----|--------|
| Migrate baseline Fleet functions onto WVP | Invent FORCE-START / NO-TOPLEFT / new Call stack / new VC app |
| One MOB → your PASS → next | Patch storm same night |
| Pin/Call/VC = restore | “Redo from scratch” |
| Bat fix = optional tiny MOB later | Confuse bat with product FAIL |

---

## Bottom line for morning

**Still to finish (migration):**  
1) Confirm pin+Call cleanup PASS → 2) Call/PTT `:29201` when WVP-homed → 3) **VC let BWC in** via WVP → 4) wall audio → 5) PTT group edges → 6) dock/panel polish from baseline → then **vuln** → **TLS** → **Tactical**.

**Not missing design.** Baseline already has VC BWC-in and Call. WVP scarred the pipe. We migrate the pipe.
