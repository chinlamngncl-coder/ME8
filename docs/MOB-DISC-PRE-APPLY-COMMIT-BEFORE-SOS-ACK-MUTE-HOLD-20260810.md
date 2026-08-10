# MOB DISC — Pre-APPLY safety: commit/push before SOS-ACK-MUTE-HOLD — 2026-08-10

**Status:** LOCKED. Commit/push = **checkpoint only**. Mute-hold **not** coded until separate APPLY.

---

## Will mute-hold break SOS / live video?

**No — if scoped correctly.**

| Touch | SOS-ACK-MUTE-HOLD-V1 |
|-------|----------------------|
| `muteAckedCamLiveAudio` / Ack dismiss timing only | **Yes** (delay mute) |
| `video-wall.js` attach/detach / FLV / pin mirror / Firmware Gold cores | **No** |
| SIP / DeviceControl / Path B Record / stop-video / WVP hard-stop | **No** |
| SOS raise / strip / case note submit | **No** (Ack note flow stays) |

Mute-hold = **when** we call mute after Ack — not tear-down of live, not BYE, not Record.

Past “destroyed” episodes were from broader live/stop/PIN edits. This MOB must stay a **small timer around existing mute call** only.

---

## This turn

1. Git **commit + push** current good state (operator asked).  
2. **No** mute-hold patch until `MOB-APPLY SOS-ACK-MUTE-HOLD-V1`.

---

## After APPLY (when ordered)

- One file preference: `dashboard-boot.js` mute-on-Ack delay only.  
- Operator PASS: Ack → still hear ~20s → then mute; manual mute wins.  
- If live/video regresses → revert that MOB only (checkpoint already on remote).
