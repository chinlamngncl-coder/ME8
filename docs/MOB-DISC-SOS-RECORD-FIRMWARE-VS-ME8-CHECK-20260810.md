# MOB DISC — SOS record: firmware vs ME8 (check) (2026-08-10)

**Status:** LOCKED answer. **No code this turn.**  
**Read:** `.cursorrules` (DeviceControl = once; zero change without APPLY).  
**Ask:** On SOS, does BWC auto-record? Did we MOB it? ~10s delay? Does our software also record?

---

## Short answer

| Path | Who | Did we MOB it? | What you get |
|------|-----|----------------|--------------|
| **Firmware on camera** | BWC itself | Not our MOB — **OEM program** on the unit | Local SD record; you may see start after a few seconds (~10s can be firmware) |
| **Path B — ME8 → device** | Fleet sends DeviceControl **`Record`** on **new SOS raise** | **Yes** — `SOS-DEVICE-RECORD-ON-ALARM-V1` (in dual-record genre) | Same belt recording; `udp_once`; ledger `deviceRecordCmd*` |
| **Path A — ME8 HQ** | Server records **live stream** when SOS pulls live | **Yes** — `liveCaptureEnabled` + `liveCaptureAutoOnSos` | HQ MP4 → `serverRecordingEvidenceId` (dies if live dies) |
| **Path C — dock** | Upload later linked to same SOS | **Yes** (code); **lab PASS deferred** (no dock) | `deviceRecordingEvidenceId` |

So: **both** can happen — camera firmware **and** our software commanding Record **and** HQ live capture when live exists.

---

## Your “~10 seconds”

That delay is **usually the camera / firmware**, not a ME8 “wait 10s then Record” timer in the locked design.  
ME8 Path B fires on **alarm raise** (same moment as ledger). If the red light / file start feels late, that is typically **BWC behavior** (or SIP reach delay), not a 10s sleep we documented as product.

Lab check: server log `SOS device Record commanded` / `device control sent` + `mode:"udp_once"` near SOS time — then watch the unit.

---

## Does “our software” record too?

**Yes, when live is up:** Path A = HQ/server capture of the SOS live path.  
**Not a second invented belt file from Node** — ground truth file is still on the **camera** (firmware and/or our Record command), then **dock/FTP** into Library.

---

## Open / not done

| Item | Status |
|------|--------|
| Path B + A code | Done |
| Operator re-PASS Part 1 SOS Record | Still open verify |
| Dock match-back lab | Delayed (no station) |
| `OPS-CASE-DUAL-RECORD-AUTO-DOCK-MUST-V1` | Open when dock ready |

**Disc:** `MOB-DISC-SOS-DUAL-RECORD-DOCK-MATCHBACK-20260809.md`
