# MOB DISC — Ledger-frame APPLY did **not** break BWC stop-record — 2026-08-10

**Status:** LOCKED from log. **No code this turn.**  
**Read:** `.cursorrules` · CREDIT-LEAN.

---

## Your claim

After `SOS-LEDGER-LAST-FRAME-FLV-V1`, BWC self-record “came back” / no longer stops.

---

## Facts

### 1) What the ledger APPLY changed

| File | Change |
|------|--------|
| `public/js/video-wall.js` | Capture helpers: sample FLV `<video>` for SOS snapshot |
| `public/index.html` | Re-stash delays + `video-wall.js` cache bust |

**Zero** edits to `server.js` DeviceControl, Path B Record, CleanData, StopRecord, or post-teardown.

`video-wall.js` has **no** `StopRecord` / `CleanData` / `recordCmd` calls.

### 2) Post-teardown stop path still in `server.js`

`POST-TEARDOWN-CLEAN-STOP-V2` still present (`runPostTeardownCleanStop`).

### 3) Log **after** ledger APPLY (latest ~23:03)

```
23:02:48  SOS → Record udp_once once ok     ← Path B (always on SOS since that MOB)
23:02:58  Ack  hasSnapshot:true
23:03:03  stop-video → post-teardown armed → hard-stop
23:03:03  post-teardown clean-stop wait settleMs:2500
23:03:05  CleanData: 1 once ok
23:03:06  StopRecord once ok
```

Same order you asked to **keep**. Fleet did **not** drop CleanData/StopRecord when we fixed the ledger frame.

---

## What you are seeing (two different things)

| Symptom | Cause |
|---------|--------|
| BWC **starts** record on SOS | Path B **`Record` on raise** — still on; you said keep post-teardown stop as-is; we did **not** re-add Record in the FLV APPLY |
| BWC **keeps** recording after stop | Device may still ignore CleanData/StopRecord (same OEM flaky as before). Log shows we **still send** them after stop |

Ledger frame fix ≠ Record on SOS. Record on SOS was already there.

---

## Verdict

| Question | Answer |
|----------|--------|
| Did FLV last-frame APPLY re-enable Path B Record? | **No** |
| Did it remove post-teardown CleanData/StopRecord? | **No** (log proves still fires) |
| Nonsense to “revert ledger frame to fix stop”? | **Yes** — wrong target |

If SD LED still on after 23:03 sequence → **device still not honoring stop cmds**; next is OEM / park Path B Record — **not** undo ledger FLV capture.

---

## If you want a product change next (only after APPLY)

| APPLY | Meaning |
|-------|---------|
| `SOS-PATH-B-RECORD-OFF-V1` | Stop sending **Record** on SOS raise (HQ live + ledger frame only) |
| Or OEM next cmd | New §10 line — not more timing without proof |

No APPLY this turn.
