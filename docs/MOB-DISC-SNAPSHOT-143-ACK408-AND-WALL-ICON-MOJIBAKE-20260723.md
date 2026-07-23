# MOB DISC — 01:43 Snapshot ×6 feel + wall icon garbage (who / what)

**Date:** 2026-07-23 (~01:45)  
**Status:** PAPER only — **no APPLY** until you name a phrase  
**Keep:** WVP handoff ON. One MOB at a time.

---

## 1) Snapshot at ~1:43am — log verdict (agent counted)

Operator: one Snapshot click → BWC feels like **~6** shots.

### Exact `fleet.log` lines (cam `…009`)

| Time (+08) | Event | Meaning |
|------------|--------|---------|
| **01:43:26.094** | `device control sent` TakePicture | **Exactly one** Fleet send |
| | `callId` `dc263a4e-e914-4465-9ef2-e1dbef833e0a` | One Call-Id |
| | `contactSource`: **`wvp_register_peer`** | WVP-homed LAN contact |
| **01:43:34.097** | `device control ack timeout` | **No SIP final reply in 8s** (`responseN: 0`) |
| | note: *UDP retransmit risk on cam* | Stack may re-send same MESSAGE |
| **01:43:58.108** | `device control ack late` **status 408** | Request Timeout ~32s later (`ok: false`) |

**Today TakePicture `device control sent` count:** still only the known lines (not a 6× emit storm).

### Plain English

Fleet did **not** fire Snapshot six times.  
It fired **once**, got **no clean 200**, timed out, then a late **408**. That pattern matches **SIP UDP retransmits** of the same DeviceControl MESSAGE — some BWC firmwares run TakePicture on **each** copy → feels like 6 shots.

ACK TRACE did its job. This is **not** “dashboard multi-bind.”  
Next fix genre (when you want APPLY): harden DeviceControl delivery / wait for ACK / suppress stack retransmit abuse — **not** a Snapshot button debounce.

**Recommended later APPLY (name when ready):**  
`DEVICE-CONTROL-SIP-NO-RETRANSMIT-STORM-V1` — **APPLIED** 2026-07-23 (`MOB-APPLIED-DEVICE-CONTROL-SIP-NO-RETRANSMIT-STORM-V1-20260723.md`).

---

## 2) Wall panel icons looking like garbage — what / who

### What you see (from your screenshot)

| Looks like | Intended |
|------------|----------|
| `â–¶` | Play ▶ |
| `ðŸ"‡` | Speaker emoji (listen) |
| `â–¬` / `â– ` | Stop ■ |
| `Vid Popout` | Popout label (i18n `video.popout`) |
| PTT missing on some idle panels | **Normal** — PTT button is `hidden` until that slot is live |

This is **mojibake** (UTF-8 symbols saved/served wrong), same family as the map toolbar `â†’` you already saw.

### Who changed icons “without permission”?

**Not a secret redesign MOB tonight** that swapped your chrome for ugliness on purpose.

| Fact | Detail |
|------|--------|
| **Classic baseline** (`baseline/2026-07-18-classic-pass`) | Slot builders still have clean `▶` / `■` |
| **Current `public/index.html`** | Same builders now contain **literal mojibake** (`â–¶`, `ðŸ”‡`, …) in the video-slot HTML strings (~9863) |
| **`MAP-TOOLBAR-ARROW-ENCODING-V1`** (tonight, you APPLIED) | Fixed **map toolbar only** — APPLIED doc said wall icons were **out of scope** |
| **`CALL-GROUP-DISPATCH-V1`** (tonight) | Left-panel Call Groups — **did not** invent wall slot icons |
| **`Vid Popout` text** | Product i18n key `video.popout` = `"Vid Popout"` + `video-wall.js` sets that label — not tonight’s Call Groups |

**Honest cause:** long-running **encoding rot** in `public/index.html` when agents/editors touch that huge file on Windows without forcing UTF-8. Symbols that used to be ▶ became garbage **in the file on disk**. No named MOB said “replace play with â–¶.”

So: **responsible = file encoding damage over many edits**, not one rogue “icon redesign” APPLY you never approved. Still **our mess to fix** — with a named APPLY, entities/`\u25B6` like the map arrow fix.

**Recommended APPLY when you want it:**  
`MOB-APPLY WALL-SLOT-ICON-ENCODING-V1`  
Scope: video-slot play / listen / call / stop (+ related map-pin mute if same rot) → HTML entities or `\uXXXX` only. Match classic look. **No** layout inventing.

---

## 3) Order (agent pick — when you are back)

| Priority | Item | Why |
|----------|------|-----|
| **1** | Sleep / no more live test tonight | You said too late — OK |
| **2** | `WALL-SLOT-ICON-ENCODING-V1` | Visible trust; quick; no SIP risk |
| **3** | DeviceControl retransmit / 408 path | Real Snapshot×6 cause from 01:43 proof |
| — | Call Groups | Applied; test when awake |

Do **not** turn WVP off to “fix” Snapshot. Contact was `wvp_register_peer` — path is intentional under handoff.

---

## Phrases (when ready — not now)

- **`MOB-APPLY WALL-SLOT-ICON-ENCODING-V1`** — fix garbage wall icons  
- **`MOB-APPLY DEVICE-CONTROL-SIP-NO-RETRANSMIT-STORM-V1`** — (name may refine after short disc) stop multi-fire from MESSAGE retransmit / 408

Until then: this disc only.
