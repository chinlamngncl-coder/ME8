# MOB-DISC — We are already on Fleet; not redoing SOS/PTT

**Date:** 2026-07-20  
**Status:** DISC only — **no code**  
**Your point:** “Why are we doing this again? It is all on Fleet already. Are we trying to redo everything? We use WVP/ZLM which is different — check how Fleet does it.”

---

## Direct answer

**Yes — you are already on Fleet.**

We are **not** rebuilding SOS, group PTT, Call, or the dashboard product.  
We are **not** inventing a second SOS team system.  
We are **not** replacing Fleet with WVP for voice.

**WVP/ZLM only changed the video pipe (and SOS alarm ingress on `:5060`).**  
Everything else — banner, team button, hold PTT, `:29201`, `ptt-start` / `ptt-audio`, HQ in team XML — is **the same Fleet code you already PASS’d.**

When logs say “SOS team button built a 2-unit team,” that is **proof the existing Fleet path ran**, not a proposal to build SOS team again.

---

## What “on Fleet” means in this tree

| Layer | Owner | Classic Jul 18 | Today (WVP on Fleet) |
|-------|--------|----------------|----------------------|
| Dashboard UI | Fleet | `public/index.html`, `video-wall.js`, `ptt-rx.js` | **Same** |
| SOS banner / acknowledge / team button | Fleet | `/api/sos-acknowledge`, `/api/sos-ptt-team` | **Same** |
| SOS team group XML + HQ row | Fleet | `lib/sosResponseTeam.js` | **Same** |
| Hold PTT / group fanout | Fleet | `ptt-start` → `ptt-audio` → `pttServer` `:29201` | **Same** |
| Call (phone button) | Fleet | `start-bwc-call` / intercom | **Same** |
| **Live video** | Was Fleet pool/JSMpeg | Classic invite | **WVP/ZLM handoff FLV** ← only big video change |
| **SOS alarm wire** | Fleet SIP | Fleet `:5062` register | **WVP `:5060` proxy → event bus → Fleet** ← ingress only |
| **PTT group MESSAGE delivery** | Fleet SIP MESSAGE to cam | Fleet `:5062` direct | **UDP relay to WVP register peer** ← transport shim only |

**Product face = Mobility Axiom / Fleet Ops.**  
**WVP = backend for live + GB register home**, not a new PTT product.

---

## How SOS group PTT works on Fleet (unchanged design)

This was built months ago and is still the flow:

```
1. SOS alarm → Fleet banner
2. Operator presses "PTT team" on banner
   → POST /api/sos-ptt-team
   → sosResponseTeam.pushPttGroupToTeam() for each BWC
   → SIP MESSAGE with team XML (alarm + helpers + HQ row)
3. UI sets global.activeSosPttTeam = [ …008, …009, … ]
4. Operator holds PTT on any team member
   → video-wall resolvePttTalkCamIds() → full team
   → socket.emit('ptt-start', { camIds: [...] })
5. Server fanout
   → ptt-audio → pttServer.sendPttAudioToDevice() per cam on :29201
```

**No WVP broadcast. No VoiceAdapter. No second UI.**

Files (all Fleet, pre-MVP):

- `lib/sosResponseTeam.js` — team XML, `pushPttGroupToTeam`
- `server.js` — `/api/sos-ptt-team`, `/api/sos-acknowledge`
- `public/index.html` — `applySosPttTeamResult`, `global.activeSosPttTeam`
- `public/js/video-wall.js` — `resolvePttTalkCamIds`, `beginPttTalk`

We did **not** add a parallel SOS team feature for WVP.

---

## What WVP/ZLM actually changed (small list)

Only these deltas sit on top of Fleet:

| Delta | Why | Touches product logic? |
|-------|-----|-------------------------|
| Live = handoff FLV not classic INVITE pool | Cams register WVP `:5060` | Video only |
| SOS alarm from WVP SIP proxy | Same alarm, different ingress | Event entry only |
| `wvpPttGroupRelay` + `fleetPttContact` | Cams ignore Fleet `:5062` MESSAGE; need `:5060` peer | **How** group XML is delivered, not **what** team means |
| `resolvePttCamId` + WVP lan map | 29201 TCP login must map IP → GB id when SIP home moved | Login mapping only |
| Group config dedupe | Handoff opened many duplicate pushes | Stability only |

**Classic Fleet semantics:** one team, hold PTT, fan to all online BWCs on `:29201`.  
**Today:** same semantics; two transport fixes so WVP-homed cams still open `:29201` and map to the right id.

---

## Why agent logs sounded like “redo”

Bad framing (agent noise):

- “Build a 2-unit team” → sounds like a new feature  
- “Next APPLY: team isolation” → sounds like redesign  
- “Per-target TX proof” → sounds like another architecture pass  

**Correct framing:**

- Fleet SOS team **already ran** (log: `sos ptt team (banner)`, `group:true`, both cam ids)  
- Remaining bugs = **wiring/stability on the existing Fleet path** under WVP-homed cams  
- Fix = **small targeted MOBs** on contact/map/dedupe/audio proof — **not** redo SOS/PTT product  

See also: `docs/MOB-DISC-BASELINE-LINK-NOT-REDO-PTT-20260720.md` — same rule.

---

## What we are NOT doing

| Forbidden | Why |
|-----------|-----|
| New SOS team product / second banner flow | Already on Fleet |
| WVP VoiceAdapter / broadcast for PTT | ARCH cancel |
| “Dual-reg proof” menus | Done in lab |
| Full classic restore to “fix voice” | Wipes WVP live/SOS unless you type RUN phrase |
| Rebuild grouping / HQ / dispatch from scratch | `sosResponseTeam.js` unchanged in spirit |

---

## Current status (honest, one screen)

| Item | Fleet path used? | Lab today |
|------|------------------|-----------|
| SOS cold / banner | Yes | PASS |
| Live wall + pin | Yes (Fleet UI + WVP FLV) | PASS |
| Soft PTT 1:1 | Yes (`ptt-start`) | PASS after camId map |
| SOS group PTT | Yes (same `ptt-start` + team) | Team push + `group:true` in log; **Chin ear / choppy** still open |
| Call button | Yes (`start-bwc-call`) | Separate from hold PTT |
| Hardware cold PTT | Yes (`rx from field`) | Still proving |

**Gaps are regression/fix on Fleet+WVP glue — not missing Fleet features.**

---

## If something still fails (right order)

1. **Confirm still Fleet path** — log must show `ptt-start` / `operator talk start`, not `voice call audio-only connected` for hold PTT  
2. **Confirm team list** — `group:true` and both GB ids in `camIds`  
3. **Only then** — tiny proof MOB (e.g. per-target TX bytes) if one cam still deaf  
4. **Never** — full SOS/PTT rewrite  

Optional named APPLYs (only if you want them):

- `MOB-APPLY-GROUP-PTT-PER-TARGET-TX-PROOF-V1` — log bytes per cam during group hold (diagnostic only)  
- `MOB-APPLY-LINK-PTT-FROM-CLASSIC-PASS-V1` — if ear quality still worse than Jul 18 floor (selective file link, keeps WVP video)

---

## One line

**You are on Fleet now.** WVP/ZLM only changed **how live video arrives** and **how group MESSAGE reaches a WVP-homed cam**; SOS team PTT is the **same Fleet feature** — we fix glue, we do **not** redo the product.
