# MOB DISC — WALL-AUDIO-PATH-V1 (next after map-pin genre PASS)

**Status:** APPLIED — see `MOB-APPLIED-WALL-AUDIO-PATH-V1-20260722.md`  
**Date:** 2026-07-22  
**Update 18:34:** Operator wall lab — **Call PASS**, **PTT PASS**, **unmute listen FAIL** (cannot hear BWC).  
**Trigger:** Operator PASS on `MAP-PIN-CLUSTER-CLICK-HANDS-OFF-V1` — map pin dock/cluster genre **done**. Move on.  
**Harm plan:** Phase **8** — `MOB-DISC-WVP-HARM-100-CONSOLIDATION-FIX-PLAN-20260720.md`  
**Keep:** WVP/ZLM handoff **ON**. Map pin PASS MOBs untouched.

---

## Genre closed (do not reopen)

| MOB | Status |
|-----|--------|
| `MAP-PIN-SINGLE-OPEN-OUTWARD-DOCK-V1` | **PASS** |
| `MAP-PIN-CLUSTER-CLICK-HANDS-OFF-V1` | **PASS** |
| `MAP-PIN-CLUSTER-BUBBLE-RESTORE-V1` | **FAIL** — superseded by hands-off |

Map pin **layout / cluster click** genre = **done**. Pin **video** mirror quirks stay on record but are **not** this MOB.

---

## Operator lab (2026-07-22) — locked facts

| Wall action | Result | Meaning |
|-------------|--------|---------|
| Live picture (FLV) | Works | Video handoff OK |
| **Call** | **PASS** — can call | Soft Call / `:29201` voice path **not** this bug |
| **PTT** | **PASS** — can PTT | Soft PTT path **not** this bug |
| **Unmute** (speaker / hear BWC) | **FAIL** — silent | **Wall listen PCM path only** |

**Plain English:** You can talk to the BWC (Call / PTT). You **cannot listen** by unmuting the wall. Two different pipes. This MOB fixes **listen only**. Do **not** bundle `PTT-29201` or Call redesign.

---

## Plain English — what is broken

Ops wall shows **picture** (FLV). **Speaker listen** (unmute a live cam) is **silent**.

| Why | Detail |
|-----|--------|
| FLV path | `attachFlvPrimary` sets **`hasAudio: false`** — BWC FLV carries **G.711 PCMA**; browser MSE cannot decode it (picture would die if we enable FLV audio) |
| Classic listen | Fleet **PCM WebSocket** (`port+2`) from PS/G.711 extract — still in `video-wall.js` (`startPcmAudio`) |
| Under handoff | Live video no longer feeds the same Fleet pool / `mediaSession` audio tee → **PCM listen may get nothing** while FLV paints |
| UI gate | `isAudioListenAllowed()` also requires `isStreamInvited(camId)` — under handoff, invite flag may be false → gain stays 0 even if WS is up |

**Product expectation (baseline):** live wall → unmute → **hear BWC mic**. Not invent a new player — **restore listen**. Call/PTT already work — leave them alone.

---

## What PASS looks like

| # | Test | Pass |
|---|------|------|
| 1 | **Ctrl+F5** — one cam Live on ops wall | ☐ |
| 2 | Unmute that cam → **hear field audio** (BWC mic) | ☐ |
| 3 | Mute → silent again | ☐ |
| 4 | Picture still Live (no black / no FLV audio experiment) | ☐ |
| 5 | **Call still works** (regression) | ☐ |
| 6 | **PTT still works** (regression) | ☐ |
| 7 | Pin cluster + Chin dock still OK | ☐ |

---

## Agent pick — one MOB

**Name:** `WALL-AUDIO-PATH-V1`

**Rule:** Keep FLV **video-only** (`hasAudio: false`). Restore **Fleet PCM listen** (or WVP-homed tee into the **same** PCM WS) + fix any handoff **unmute gate** so wall speaker works. **Do not touch Call / PTT.**

### In scope (migrate, don’t invent)

1. **Prove** on APPLY: unmute Live cam → does PCM WS get chunks? (`audio ws first chunk` in `mediaSession` / client WS frames).  
2. **If no PCM:** tee WVP/ZLM session G.711 into existing `broadcastAudioPcm` / audio WSS (`port+2`) — same client `startPcmAudio`.  
3. **If PCM arrives but silent:** fix `isAudioListenAllowed` / `isStreamInvited` under handoff + unmute → `startPcmAudio` + `applyLiveAudioGain`.  
4. **Do not** set mpegts `hasAudio: true`.  
5. **Do not** touch map pin dock/cluster PASS or Call/PTT stacks.

### Out of scope

- Soft PTT / Call “fix” → already PASS on wall today  
- VC BWC into conference → `CONFERENCE-BWC-INGRESS-WVP-HANDOFF-V1`  
- Field PTT mesh / group Join UI  
- Panel 16:9 polish  
- Reopening pin layout  

### Likely files (after diagnose)

- `lib/mediaSession.js` / WVP handoff bridge (PCM tee)  
- `public/js/video-wall.js` (`startPcmAudio`, `isAudioListenAllowed`, unmute)  
- Possibly WVP adapter — **only if** tee must start with startPlay  

Exact file list locked at APPLY after log proof (agent owns logs).

### Risk

**Medium** — server audio tee vs UI-only gate. Operator already proved Call/PTT OK → **narrow blast radius**. Prefer prove PCM empty vs invite-gate first. No FLV audio experiment.

---

## Order after this

| Phase | MOB | When |
|-------|-----|------|
| **8** | `WALL-AUDIO-PATH-V1` | **Next** |
| 9 | `CONFERENCE-BWC-INGRESS-WVP-HANDOFF-V1` | After wall listen PASS |
| 10 | `PTT-29201-WVP-HOMED-V1` | Only if Call/PTT regress or other cams fail — **not** required from today’s wall PASS |
| 11–12 | Field mesh / Join 1+ | After need proven |
| 13 | Panel polish | Last |

---

## APPLY phrase

**`MOB-APPLY WALL-AUDIO-PATH-V1`**

Until then: **disc only, no edits.**

---

## Agent must NOT

- Park / give up / “turn handoff off for audio”  
- Enable FLV `hasAudio: true` to “try”  
- Bundle PTT / Call “fixes” into this MOB (they already PASS)  
- Touch Chin/cluster PASS files without a named pin MOB  

## Agent must DO (on APPLY)

1. Diagnose PCM empty vs invite/unmute gate (one log pack)  
2. One surgical path → wall unmute hears BWC  
3. Re-verify Call + PTT still PASS  
4. `MOB-APPLIED-WALL-AUDIO-PATH-V1-….md` + operator verify table  
5. Cache bust if frontend touched  
