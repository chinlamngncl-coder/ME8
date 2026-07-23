# MOB DISC — Live stack revert later (rotten WVP / Plan B lane)

**Date:** 2026-07-17  
**Status:** LOCKED paper — no APPLY needed to *read*; restore only when **you** say the restore phrase  
**Why:** Operator wants a clear exit from the Gate-C / WVP / fail-open / Plan B lane back to “normal” without hunting files.

---

## What “normal” means here

**Pre–Gate C pack baseline** (before this live rot lane):

| Restore | Phrase / script | Notes |
|---------|-----------------|-------|
| Full tree toward pre-Gate-C | **`RUN RESTORE-ME8-PRE-GATE-C`** → `RESTORE-ME8-PRE-GATE-C.ps1` | Primary unwind for this genre |
| Pin / wall Firmware Gold only | **`RUN RESTORE-ME8-FIRMWARE-GOLD`** | Use if pin/mirror broke — not full live stack |
| Failed-live snapshot | `RESTORE-ME8-FAILED-LIVE-V1.ps1` | Only if you intentionally saved that checkpoint |

Agent **never** auto-restores. You type the phrase.

---

## Hot files in this rotten lane (for surgical revert)

If full restore is too blunt, copy these from `baseline/2026-07-14-pre-gate-c/` (paths under pack/MANIFEST):

| File | Lane |
|------|------|
| `lib/zlmLabRelay.js` | Plan B relay (openh264 / discardcorrupt / scale) |
| `lib/livePlaybackBroker.js` | Soft try / fail-open / primary choice |
| `lib/wvpLabClient.js` | WVP startPlay / soft try |
| `lib/wvpRegisterMirror.js` | Fleet→WVP register mirror (if present in baseline) |
| `lib/wvpSipLanMap.js` / `lib/wvpDbLanPatch.js` | LAN host patch |
| `public/js/video-wall.js` | Soft wall — **Firmware Gold lock**; prefer Gold restore if pin broke |
| `server.js` | WVP lab API / adapter wiring |

Prefer **full PRE-GATE-C restore** over cherry-pick unless you know exactly which file.

---

## APPLIED MOBs this revert undoes (live genre)

| MOB | Doc |
|-----|-----|
| `mob-live-broker-failopen-fast-v1` | `MOB-APPLIED-LIVE-BROKER-FAILOPEN-FAST-V1.md` |
| `mob-zlm-relay-discardcorrupt-v1` | `MOB-APPLIED-ZLM-RELAY-DISCARDCORRUPT-V1.md` |
| `mob-wvp-invite-rtp-answer-v1` | `MOB-APPLIED-WVP-INVITE-RTP-ANSWER-V1.md` |
| Earlier WVP mirror / SIP LAN / soft-after-ffmpeg | Matching `MOB-APPLIED-WVP-*` |

After restore: restart Fleet, hard refresh once, Soft Open = expect pre-Gate-C behavior (no claim of Plan A).

---

## Explicitly not covered

- Brand / Axiom  
- Evidence redact genre  
- Ship pack checklist  

---

## One line

**Live lane looks rotten → you say `RUN RESTORE-ME8-PRE-GATE-C` when you want normal back. Agent does not auto-restore.**
