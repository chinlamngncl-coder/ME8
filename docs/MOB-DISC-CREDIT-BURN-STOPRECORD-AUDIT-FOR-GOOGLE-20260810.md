# MOB DISC — Credit burn + StopRecord work audit (send to Google) — 2026-08-10

**Status:** AUDIT ONLY. **No code this turn.**  
**Read:** `.cursorrules` · CREDIT-LEAN-HARD · zero change without APPLY.

Operator: angry — credit burn; StopRecord genre failed; wants **exact log + exact what agent changed** for third-party check.

---

## Why credits burned (honest)

| Waste | What happened |
|-------|----------------|
| **Wrong file for mute-hold V1** | Patched `dashboard-boot.js` — Ops **does not load it**. Live Ack mute is **inline `index.html`**. One wasted APPLY + retest. |
| **StopRecord V1 timing wrong** | Sent StopRecord at **pool soft-stop**; cam re-lit after **hard-stop ~4s later**. Log proved send worked; product still FAIL. |
| **StopRecord V2** | Moved StopRecord to **after hard-stop** — another APPLY + restart cycle. |
| **Many MOB DISCs + log greps** | Each FAIL → disc + log extract → new APPLY. Token-heavy even when patches were small. |
| **Not lean enough** | Should have proven **which file runs** before mute-hold V1; should have put StopRecord on hard-stop **first**. |

Agent fault: wrong attachment point twice (mute file; StopRecord timing). Not “firmware guess without log” on the last StopRecord FAIL — log showed send ok.

---

## What was changed (files)

### A) Mute hold (Ack listen 60s) — PASS (short)

| APPLY | Files |
|-------|--------|
| `SOS-ACK-MUTE-HOLD-V1` | `public/js/dashboard-boot.js` only → **ineffective** (not loaded) |
| `SOS-ACK-MUTE-HOLD-RESPECT-V2` | **`public/index.html`** (live Ack path) + mirror `dashboard-boot.js` |

Behavior: Ack → no instant mute → 60s then mute; re-unmute retries after pin resync.

### B) Banner rubbish `Â·` — APPLIED

| APPLY | Files |
|-------|--------|
| `SOS-UI-MIDDOT-MOJIBAKE-V1` | `public/index.html` — strip `Â&middot;` / `Â\u00B7` / `Â©`; hide empty Nav/Live hints |

### C) SOS Path B Record on raise — already shipped earlier

| | |
|--|--|
| Function | `scheduleDeviceRecordOnSos` in `server.js` |
| On new SOS | one DeviceControl **`Record`** `udp_once` |

### D) StopRecord on stop video

| APPLY | Files | Behavior |
|-------|--------|----------|
| **V1** | `server.js` | Arm on Record ok; **StopRecord at `releaseCamStreamWhenUnwatched` / pool stop** |
| **V2** | `server.js` + `lib/wvpVideoHandoff.js` | Arm held; **StopRecord in `setOnHardStopComplete` after hard-stop**; pool-stop only if handoff off |

DeviceControl mode unchanged: **`udp_once`** only. No `sip_txn`. No Firmware Gold pin/FLV rewrite intended.

### E) Git checkpoint (before mute genre)

| | |
|--|--|
| Commit | `189b2eb` on `backup/20260722-tested-genres` |
| Remote | pushed `origin/backup/20260722-tested-genres` |

---

## Log evidence (from `storage/fleet.log`, kk `34020000001329000009`)

### Run that proved V1 **did send** StopRecord (still operator FAIL on LED)

```
2026-08-10 20:17:25 … device alarm raised … sos
2026-08-10 20:17:25 … device control sent … "recordCmd":"Record" … "mode":"udp_once"
2026-08-10 20:17:25 … SOS device Record commanded … alarm-1786364245932
2026-08-10 20:17:25 … device control once ok … Record
2026-08-10 20:17:40 … sos acknowledged
2026-08-10 20:17:43 … stop-video from dashboard … remainingViewers:0
2026-08-10 20:17:43 … pool stop — no dashboard viewers
2026-08-10 20:17:43 … SOS device StopRecord commanded … reason: operator_live_stop
2026-08-10 20:17:43 … device control sent … "recordCmd":"StopRecord" … "mode":"udp_once"
2026-08-10 20:17:43 … device control once ok … StopRecord
2026-08-10 20:17:43 … wvp video handoff soft-stop scheduled … graceMs:4000
2026-08-10 20:17:47 … wvp video handoff hard-stop … ok:true
```

**Reading for Google:** Fleet sent Record at SOS and StopRecord at stop; UDP once-ok. Hard-stop is **~4 seconds after** StopRecord (V1). Operator still saw SD record re-light → V1 timing wrong relative to live tear-down, not “never commanded.”

### Earlier same evening (before V1 restart) — stop with **no** StopRecord

```
20:11:47 Record … 20:12:04 stop + pool stop + hard-stop — NO StopRecord line
20:13:16 Record … 20:14:32 stop + hard-stop — NO StopRecord line
```

Those runs = old process **without** V1 loaded (or no arm).

### V2 run (20:21–20:22) — StopRecord **after** hard-stop (wire order correct)

```
2026-08-10 20:21:50 … Record … udp_once … once ok
2026-08-10 20:22:00 … sos acknowledged
2026-08-10 20:22:05 … stop-video … pool stop … soft-stop scheduled graceMs:4000
2026-08-10 20:22:09 … wvp video handoff hard-stop … ok:true
2026-08-10 20:22:09 … device control sent … "recordCmd":"StopRecord" … udp_once
2026-08-10 20:22:09 … SOS device StopRecord commanded … reason: operator_live_hard_stop
2026-08-10 20:22:09 … device control once ok … StopRecord
```

**Reading:** V2 timing on the wire is what we wanted. If operator still saw SD record after this → **device ignores StopRecord / re-arms after live end** — not “Fleet forgot to send.” More StopRecord APPLYs without OEM behavior change = more credit burn for no gain.

### Pattern from earlier diagnose (~18:24)

Same cam: one Record at SOS; Ack; stop-video soft→hard; **no second Record**. Auto LED after stop was not a second Fleet Record.

---

## What agent must NOT do next without APPLY

- No more StopRecord spam / `sip_txn`  
- No video-wall / pin mirror / FLV rewrite “to fix record LED”  
- No repo-wide scans  
- One named APPLY only after you order it  

---

## One-line verdict for Google

**We send Record on SOS and StopRecord on stop (`udp_once`); V1 StopRecord landed before hard-stop; operator still saw SD record — so either hard-stop re-arms record on device, or StopRecord is ignored after live end; V2 moves StopRecord after hard-stop; mute-hold V1 wasted credits by editing a file Ops does not load.**
