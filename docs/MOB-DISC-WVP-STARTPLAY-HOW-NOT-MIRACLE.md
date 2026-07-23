# MOB DISC — How WVP `startPlay` gets fixed (not miracle · not “wait for God”)

**Status:** LOCKED 2026-07-16  
**Search:** `when zlm`, `miracle startPlay`, `how not park forever`, `G2 G3 how`  
**Supersedes lazy line:** “the day startPlay works” with **no work plan**  
**Keep:** Fleet SIP **5060** — `docs/MOB-DISC-NO-DICTATE-CHANGE-5060.md`  
**Ops live now:** FFmpeg (revert done). ZLM not on wall/pin until bring-up PASS.

---

## Your question (fair)

“Not a date — when startPlay works” sounded like **hope**.  
No calendar. No angel on the PC. **Someone has to fix the broken link.**

This disc names **who does what** and **in what order**.

---

## What is broken (not fog)

| Layer | Status |
|-------|--------|
| Docker `me8-wvp` + `me8-wvp-zlm` | Often **up** |
| Fleet broker can call `startPlay` | Yes |
| WVP play → BWC media | **FAIL** — timeout / SSRC / createRTP junk |
| Log proof of ZLM | **0** × `live broker wvp-zlm primary` |
| Ops after bad APPLYs | Invite-defer hurt live — **reverted** |

So ZLM does not “wake up.” The **WVP→camera play path** is unfinished/broken. That is **agent/lab work**, not soak hope.

---

## How it gets fixed (work ladder — not park forever)

Ops stays on FFmpeg until **W5 PASS**. That is protect live, not “give up forever.”

### W1 — Preflight (agent, ~15 min, any time)

- Containers up; `:18080` HTTP OK  
- ZLM registered to WVP  
- `FM_LAB_WVP=1`  
- **No** Fleet live open on the test cam (no dual-invite fight)  
- Probe only: broker/`startPlay` — **do not** block ops invite  

### W2 — Stack bugs (agent code/config — named MOB when you open genre)

Fix what logs already show, **server-side**, 5060 untouched:

| Bug class | Work |
|-----------|------|
| `createRTP` / “stream already exists” / SSRC port=-1 | stopPlay cleanup, stream-id hygiene, ZLM RTP port range |
| MediaServer / stream host wrong | WVP↔ZLM LAN IP = real Wi‑Fi (`192.168.1.38`), never 172.x |
| Stale play sessions | Agent clears WVP play/RTP before retry |

Suggested MOB name when you say go:  
**`mob-wvp-startplay-stack-fix-v1`**

### W3 — Device reachability for **WVP play** (lab fact — not miracle)

WVP play is GB INVITE from **WVP SIP (lab 5061)**.  
Fleet live is INVITE from **Fleet 5060**.

If the cam only answers Fleet and never answers WVP → `消息超时未回复` forever.  
**Code invite-order cannot invent a second SIP brain on the cam.**

Allowed paths (**you choose**; agent does not dictate “all cams leave 5060”):

| Path | Meaning |
|------|---------|
| **A — One lab cam dual / second platform** | Only if firmware allows a second platform entry for WVP **5061** while Fleet stays **5060** for daily ops. **One cam for proof**, not a fleet rewrite. |
| **B — Temporary lab proof cam** | You pick **one** spare cam pointed at WVP for startPlay proof only — then back. Your call, not agent lecture. |
| **C — Architecture MOB (bigger)** | Later: pull media without asking cam to register twice (cascade / gateway). New named MOB — not tonight’s pretend. |

Agent **must not** say “change 5060 or ZLM won’t work” as the only answer.  
Agent **must** say: W2 stack fix first; W3 only if play still dies with stack clean.

### W4 — Lab proof (agent runs; you pass/fail picture)

With live Fleet invite **off** for that cam:

1. `startPlay` returns FLV (no timeout / SSRC fail)  
2. Log: **`live broker wvp-zlm primary`**  
3. Soft tile / mpegts shows real video  

**That is G2–G3 with a how attached.**

### W5 — Ops wire (new MOB only after W4)

**`mob-wvp-ops-zlm-failopen-v1`** (name when ready)

- Put ZLM on Fleet **without** multi-minute invite hold  
- Fail-open to FFmpeg in **&lt;2s** if startPlay dies  
- Pass = `wvp-zlm primary` when healthy; FFmpeg when not — never black ops  

---

## “When” in plain English

| Bad answer | Good answer |
|------------|-------------|
| Someday startPlay wakes up | After **W2** (and W3 if needed) **PASS**, proven by W4 |
| Park until God | Park **ops ZLM** until W4; **work continues** on W1–W3 when you open the genre |
| Calendar date | **Next session you say:** `MOB-APPLY mob-wvp-startplay-stack-fix-v1` (or “open WVP startPlay genre”) |

No date on the wall. **Date = when that MOB is run and W4 passes.**

---

## What agent owns vs you

| Agent | You |
|-------|-----|
| Docker / WVP / ZLM config, logs, SSRC/RTP cleanup, probes | Hard refresh; say pass/fail on picture |
| Named MOBs W2 / W5 | Optional: one lab cam for W3 path A/B if you want |
| Never dictate whole fleet off 5060 | Keep daily cams on Fleet 5060 |

---

## One line

**startPlay will not miraculously wake up. Agent fixes WVP/ZLM stack (W2), then proves play (W4); ops stays FFmpeg until then. Open genre with `MOB-APPLY mob-wvp-startplay-stack-fix-v1` — that is the “when.”**
