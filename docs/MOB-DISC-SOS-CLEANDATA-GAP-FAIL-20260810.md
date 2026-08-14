# MOB DISC — SOS-CLEANDATA-GAP-THEN-STOP-V1 FAIL (log) — 2026-08-10

**Status:** FAIL locked. **Code path ran correctly.** **No code this turn.**  
**Read:** `.cursorrules` · CREDIT-LEAN · stop inventing timing APPLYs without new OEM line.

---

## Latest run (kk `…0009`) — order is what we asked

### Run A (~21:02)

| Time | Event |
|------|--------|
| 21:02:20 | SOS **Record** once ok |
| 21:02:26 | Ack |
| 21:02:32.572 | `sos cleanData-gap-stop before teardown` |
| 21:02:32.575 | **CleanData: 1** sent + once ok |
| **21:02:33.584** | **StopRecord** (~**1009 ms** later) once ok |
| 21:02:33.590 | soft-stop scheduled (teardown starts **after** StopRecord) |
| 21:02:37.627 | hard-stop ok |

### Run B (~21:03) — same pattern

CleanData → ~1s → StopRecord → then soft/hard-stop. Both once ok.

---

## Verdict

| Question | Answer |
|----------|--------|
| Did gap V1 run? | **Yes** |
| Same-ms pile-up with hard-stop? | **No** — CleanData/StopRecord **before** soft/hard-stop |
| Operator SD re-light FAIL? | **Yes** (your report) |
| More Fleet timing tweaks without OEM? | **Stop** — wire path exhausted for this approach |

Fleet sent Clear 警情 + StopRecord with live still up and 1s gap. Device still re-arms SD (or never left 警情). That is **device/OEM accept behavior**, not missing ME8 send.

---

## Open OEM questions (for Google / manual §10)

1. Exact string: `CleanData: 1` vs `CleanData:1` (no space)?  
2. Is CleanData alone enough, or must platform send **ResetAlarm / Alarm** clear another way?  
3. Does BWC require **operator Ack on device** to leave 警情?  
4. After CleanData, is **StopRecord** even needed — or **only** CleanData, or opposite?  
5. Does Path B **Record on SOS** force a mode that only local button clears?

---

## Product options (no APPLY until you pick + OEM confirm)

| Option | Note |
|--------|------|
| **Park Path B auto-Record** | HQ live capture only; no DeviceControl Record on SOS — no SD fail-safe fight |
| **OEM-confirmed next cmd/order** | Exact XML + timing from vendor — then one APPLY |
| **Keep Path B + accept SD until dock** | Document as known device behavior |

**Recommendation:** **Park further CleanData/StopRecord timing APPLYs.** Next move is OEM answer or park Path B Record — not another 500ms gap.

---

## Do not without APPLY

Spam DeviceControl, `sip_txn`, UI/mute edits, invent new RecordCmd names.
