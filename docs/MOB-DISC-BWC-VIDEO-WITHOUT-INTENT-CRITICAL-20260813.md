# MOB-DISC CRITICAL: BWC must never stream without operator intent (2026-08-13)

## Severity (locked)

**Product-zero if BWC video is invited / kept alive when the operator is not watching.**  
Not a soft bug. Not “lab OK.” Ship block. Same class as silent DeviceControl storm.

## What you saw

1. Closed ANPR / refreshed Axiom.  
2. Stream / “call” feeling stopped about **~1 minute** later.  
3. Unsure **what** stopped it → also unsure **what started/kept** it.

## Log truth (already checked)

File: `storage/service-stdout.log`

| Time | Event |
|------|--------|
| 18:38 | **Video start** — `wvp video handoff start` + `surface=analytics-anpr` (ANPR Start watch) |
| 18:42:39 | `soft-stop scheduled` **graceMs=4000** |
| 18:42:43 | `hard-stop` |
| After | **No** new handoff start in that window |
| Ongoing | Every **~30s** `bwc activity sweep` + **DeviceStatus** (not Live Start watch) |

So:

- **Who started video:** ANPR Live (`start-video` → WVP handoff).  
- **Who stopped video in log:** Fleet soft→hard stop ~4s after watch slots cleared (Stop all / socket clear / refresh).  
- **Your ~1 min:** may be UI feel, WVP/ZLM linger, BWC UI lag, or DeviceStatus wake continuing after video stop — **must be measured next**, not guessed.

Refresh Axiom **does** drop the dashboard socket → can clear ANPR slots → soft-stop. Closing ANPR bat alone does **not** stop Fleet handoff if the browser tab still had watch on.

## Root product rule (must be 100%)

**No WVP `startPlay` / video INVITE / stream hold unless there is an active Live viewer ref for that cam on a dashboard surface the operator opened.**

When last viewer goes away (Stop all, tab close, refresh, navigate away):

1. Clear ANPR native watch immediately.  
2. Soft-stop → hard-stop with **short, documented** grace (today 4s in log — operator must not wait ~1 min wondering).  
3. **Never** re-INVITE because ANPR OCR, status sweep, PTT keepalive, or “FLV still open somewhere” without a viewer.

DeviceStatus sweep waking the cam ≠ video call, but if operators can’t tell them apart, sweep must be quiet when no Live viewers (`FLEET-BWC-STATUS-SWEEP-QUIET-V1`).

## Forbidden excuses

- “ANPR needs the stream in background”  
- “Refresh will sort it”  
- “Soft-stop is fine if it dies eventually”  
- “DeviceStatus isn’t a call so ignore operator panic”

## Risk pick — fix order (one APPLY at a time)

| # | APPLY | Why first |
|---|--------|-----------|
| **1** | `BWC-VIDEO-STOP-ON-LAST-VIEWER-HARD-V1` | Prove: last viewer gone → hard-stop ≤ grace; **no** re-handoff without new Start. Cover ANPR Stop all + refresh + tab close. |
| **2** | `FLEET-BWC-STATUS-SWEEP-QUIET-V1` | If cam still wakes with no Live open → quiet DeviceStatus when zero viewers. |
| **3** | `WVP-NO-REINVITE-WITHOUT-VIEWER-V1` | Only if log still shows INVITE/handoff with zero viewers after #1. |

**Recommendation now:** APPLY **#1** first. That is the death-penalty path (video without intent).

## Operator PASS for #1

1. Start watch kk → log: `handoff start` once.  
2. **Stop all** (no refresh) → hard-stop within grace; BWC leaves video.  
3. Refresh only (watch was on) → same stop; **no** new handoff until Start watch again.  
4. Idle 5+ minutes, no Live open → **zero** `wvp video handoff start` / video INVITE for that cam.  
5. FAIL if any handoff/INVITE with no Start watch.

## Next step

Say exactly:

`MOB-APPLY BWC-VIDEO-STOP-ON-LAST-VIEWER-HARD-V1`
