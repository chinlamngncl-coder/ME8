# MOB DISC — Google pipeline fix (simple English)

**Date:** 2026-07-17  
**Status:** Paper only — discuss · **no APPLY yet**  
**Source:** Operator paste — Google “MEDIA PIPELINE FIX” (Plan A connect + Plan B 0x0)  
**Also:** Tonight’s log — Soft Open still Plan B · 640×480 · not real camera path

---

## What Google got right (plain)

1. **Brain must see media helper online** before wall can use the good path.  
2. **Passwords / names must match** between the two boxes.  
3. **Old “offline” memory** (Redis) can lie — wipe it if the brain still says media is dead.  
4. **Ask the camera for picture the reliable way** (TCP Passive) — not keep hoping on UDP.  
5. **Bad path (Plan B)** must not fake size with scale; drop junk packets and wait for a real header.  
6. **Win = wall shows camera’s own picture** (1080 / 4K as the camera sends). Then we stop living on the bad path.

---

## What Google got wrong for *our* lab (must not copy blind)

Google says point heartbeats at **`127.0.0.1`**.  

**We must not do that.** Our media helper and brain run in Docker on the same PC. Heartbeats already use the Docker name **`me8-wvp`**. Pointing at `127.0.0.1` was a past trap — helper talks to itself, brain stays blind.  

**Deploy answer for Google’s question:** same physical PC, separate Docker boxes — not two different offices.

---

## What we already did (so we stop redoing homework)

| Google ask | Our status |
|------------|------------|
| Heartbeats on | Already on · names match · not `127.0.0.1` |
| Same secret / same media id | Already matched |
| Media online once | Already proved green earlier (`media-online` MOB) |
| Plan B discard-junk + big wait + no scale | **Already applied tonight** |
| Soft Open still ugly | Log: still **bad path** · **640×480** · slow — Google Part 2 alone did **not** win |

So: more Plan B ffmpeg chasing = more rot. Success is **good path picture**, not a prettier fail-open.

---

## What I want to do (one road — not a menu)

**Goal:** Soft Open uses the **good path** (camera → WVP brain → media helper → wall). Log must say the good primary. Picture size follows the camera. Latency drops because we stop double-encoding.

### Step A — Prove the brain still sees media (quick, before play)

1. Wipe Redis memory for this lab stack.  
2. Restart brain, then media helper (order Google said).  
3. Check media list once: must be **online / green**.  
4. **Do not** change heartbeat URLs to `127.0.0.1`. Keep Docker name `me8-wvp`.  

If still not green → fix only “brain cannot see helper” (network / secret). **Stop Soft Open testing until green.**

### Step B — Make the camera answer the good play (the real missing piece)

Tonight’s fail is not “no ZLM name in English docs” alone — cams already show on WVP with LAN address, but **start play times out** (no picture).  

So the next real MOB is: **camera must answer WVP’s play ask**, using **TCP Passive** as Google says — not more register/IP loops, not more Plan B.

Named when you APPLY: **`mob-wvp-invite-rtp-answer-v1`** (with TCP Passive inside that work — not a separate toy first).

### Step C — Soft Open prove

1. Soft Open Chin / kk once.  
2. Pass only if log shows **good path primary** and panel looks sharp / not 10× late.  
3. If still bad path · 640×480 → honest FAIL · do not claim win.

### Step D — Leave Plan B alone for now

Discard-junk already in. It keeps Soft Open from hanging forever, but it **cannot** give true camera resolution. We do not keep twisting Plan B until good path works.

---

## Named MOB order (when you say APPLY — one at a time)

1. **`mob-wvp-media-online-reprove-v1`** (optional if green already — wipe Redis + prove media list green · no `127.0.0.1`)  
2. **`mob-wvp-invite-rtp-answer-v1`** ← **main** — TCP Passive + play until good path primary  
3. Only after that: drop Soft Open off Plan B for normal wall quality  

Revert whole rotten lane anytime: you type **`RUN RESTORE-ME8-PRE-GATE-C`** (`MOB-DISC-LIVE-STACK-REVERT-LATER.md`).

---

## What I will not do

- Blind copy Google’s `127.0.0.1` hooks  
- Another Plan B “maybe 4K” ffmpeg MOB  
- Pretend Soft Open tonight was the good path  
- Change Fleet phone port **5060**  
- Bundle five MOBs in one APPLY  

---

## One line for you

**Google’s checklist is useful, but our next win is: keep media green without 127.0.0.1, then make the camera answer WVP play (TCP) so Soft Open leaves the slow 640×480 fail path. Say MOB-APPLY for step A or jump to the play MOB when you want code.**
