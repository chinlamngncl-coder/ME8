# MOB-DISC — Group PTT TX proof result (18:02 test)

**Date:** 2026-07-20  
**Status:** DISC only — proof MOB readout  
**MOB applied:** `MOB-APPLY-GROUP-PTT-PER-TARGET-TX-PROOF-V1`  
**Test window:** `storage/fleet.log` ~18:01:51–18:02:39 (kk SOS alarm)

---

## Direct answer

**Fleet is sending group PTT audio to both kk and Chin correctly.**

The proof logs show:
- SOS team built (`teamSize:2`, `pushed:2`)
- Hold became `group:true` with **both** cam ids
- **Every** proof sample for **both** targets: `ok:true`, `bytes:160`, `cmd:130`, `loggedIn:true`
- **Zero** `talk frame dropped` in the whole window

So this is **not**:
- wrong team selection
- HQ replacing Chin in fanout
- call/intercom path
- server failing to write to Chin

The remaining gap is **after** Fleet write — device playout and/or **Chin `:29201` TCP churn** during SOS+live.

---

## Timeline (18:01–18:02)

| Time | Event |
|------|--------|
| 18:01:51 | SOS alarm on kk `…009` |
| 18:01:57 | `sos ptt team (banner)` — `teamSize:2`, `pushed:2` |
| 18:01:57 | `group config sent` **team:true** → `…009` and `…008` |
| 18:02:02 | `operator talk start` — `group:true`, both ids |
| 18:02:03–04 | **TX proof seq 1, 25, 50** — **both** `…009` and `…008`, all `ok:true` |
| 18:02:04 | `operator talk stop` |
| 18:02:08–14 | `rx from field` Chin `…008` — **hardware PTT inbound works** |
| 18:02:19 | **`client disconnected` Chin** `192.168.1.139:50478` |
| 18:02:23 | Chin **reconnects** new socket `50488`, `login ok` `…008` |
| 18:02:27–28 | Second group hold — TX proof again **both** `ok:true` seq 1, 25 |
| 18:02:28 | `operator talk stop` |

---

## TX proof samples (both targets symmetric)

**First hold (~18:02:03):**

| cam | seq | ok | bytes | txIndex | peer | cmd |
|-----|-----|----|-------|---------|------|-----|
| …009 | 1 | true | 160 | 1 | .90:56808 | 130 |
| …008 | 1 | true | 160 | 1 | .139:50478 | 130 |
| …009 | 25 | true | 160 | 25 | .90:56808 | 130 |
| …008 | 25 | true | 160 | 25 | .139:50478 | 130 |
| …009 | 50 | true | 160 | 50 | .90:56808 | 130 |
| …008 | 50 | true | 160 | 50 | .139:50478 | 130 |

**Second hold (~18:02:28):** same pattern after Chin reconnect on `50488`.

No failed sends. No asymmetric byte counts. Same `downlinkAudioCmd:130` on both.

---

## What this rules out

| Hypothesis | Verdict |
|------------|---------|
| SOS team only targets HQ | **Ruled out** — fanout is both GB ids |
| Chin not in `ptt-start` list | **Ruled out** — `group:true` both ids |
| Server drops Chin frames | **Ruled out** — no `talk frame dropped` |
| Chin still ghost `UB-6A5G` | **Ruled out** — `login ok` → `…008` |
| Using call instead of PTT | **Ruled out** — `operator talk start` / `group ptt tx proof` only |

---

## What remains (real blockers)

### 1. Device playout under SOS/group state

Fleet writes frames; Chin may still not **play** them on speaker when:
- alarm unit is in SOS state
- team XML includes HQ + helper
- live video handoff is active on alarm cam

This matches operator report: HQ hears, Chin deaf — **despite symmetric server TX**.

### 2. Chin TCP churn during SOS+live

Chin dropped `:29201` **15s after first group hold** (`50478` → disconnect → `50488`).  
Likely live handoff + group refresh (`wvp-video-handoff`) still knocks PTT TCP on alarm/helper units.

That explains **choppy** ear even when `ok:true` — audio arrives in bursts around reconnects.

### 3. Hardware cold PTT — partial PASS

`rx from field started` for Chin `…008` at 18:02:08 — **cam → desk inbound works** in this test.

---

## Not redoing Fleet

Same Fleet path as classic:
- `/api/sos-ptt-team` → `pushPttGroupToTeam`
- `activeSosPttTeam` → `ptt-start` group
- `ptt-audio` → `sendPttAudioToDevice` per cam

WVP only changed **video** and **group MESSAGE delivery**. Proof confirms **Fleet fanout is correct**.

---

## Ranked next steps (only if you name APPLY)

| Priority | MOB | Purpose |
|----------|-----|---------|
| 1 | `MOB-APPLY-PTT-HOLD-SKIP-GROUP-REFRESH-DURING-TALK-V1` | Stop `schedulePttGroupRefreshForCam` while `pttTalkTargetsBySocket` active — reduce TCP drop mid-hold |
| 2 | `MOB-APPLY-SOS-TEAM-GTID-SNID-CLASSIC-LINK-V1` | Compare SOS team XML snid/gtid/devices vs Jul 18 classic-pass if Chin playout still deaf |
| 3 | Park proof logging | Remove or gate `group ptt tx proof` after next test pass |

**Do not:** rebuild SOS team product, WVP VoiceAdapter, or full classic restore unless you order it.

---

## One line

**PASS on server proof** — Fleet writes steady group PTT to both kk and Chin; Chin deaf/choppy is **device playout or TCP churn after write**, not missing Fleet fanout.
