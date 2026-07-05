# MOB DISC — what to ask Google next (ZLM)

**Date:** 2026-07-06  
**Search:** `ask google`, `ZLM next`, `what to ask`

---

## Where we are (plain English)

| Item | Status |
|------|--------|
| Live wall + map pins (Open All) | **Working** — Firmware Gold lock |
| ZLM backend try | **Failed** — touched live video engine → wall died in seconds → **reverted** |
| Dashboard UI | **Untouched** — must stay that way until backend is proven |
| Operator | **Designer** — no Docker, no `.env`, one install pack at ship |
| TOTP | **Off on bench** — back on before ship |

We still want **ZLM (H.264) primary + FFmpeg (MPEG1) fallback** — but only if it can be done **without breaking** what works today.

---

## Paste this to Google

Copy everything in the box below.

---

**Context**

We run ME8 — 8 body-worn cameras, Node dashboard, SIP/RTP from devices, today **FFmpeg → MPEG1 → JSMpeg** in the browser. Pin video **mirrors wall canvas** (one WebSocket per camera). This stack **passed checkpoint** and is frozen as “Firmware Gold.”

We tried “ZLM backend proof” per your decoupled plan: new `lib/zlm*` modules + hooks on **`liveStreamPool.js`** (even with ZLM disabled in env). Within seconds of Open All, wall showed **STOPPED BY BWC**. We **reverted** all pool/server hooks. UI was never edited.

**Hard constraints (non-negotiable)**

1. **Operator never installs Docker or a second product** — customer gets **one ME8 pack** (media runtime inside the pack).
2. **No UI changes** (`video-wall.js`, `index.html`, pins) until isolated backend proof on a **standalone test page** only.
3. **No edits to `liveStreamPool.js`** until you specify a safe integration boundary — our revert rule after this failure.
4. Bench operator is **not technical** — agent owns logs, env, restart; operator only pass/fail on what they see.

**Questions**

1. Given we **cannot** hook ZLM tee into `liveStreamPool` without regression, what is the **correct integration point** for ZLM ingest on a Node SIP/RTP stack that already runs per-camera FFmpeg? (Separate process? Sidecar **bundled in ship pack** not Docker-for-user? RTP duplicate listener? Something else?)

2. What is the **minimal proof-of-life** you will accept **before** any UI work — exact deliverables (log lines, test page URL, one cam ID), with **zero** changes to Firmware Gold files?

3. How should **FFmpeg fallback** switch when ZLM is down — same browser player or different? Who owns the decision in **backend only** (no `video-wall.js` branches yet)?

4. For **one-pack ship**: how should ZLM MediaServer ship (embedded binary in `vendor/`, Windows service, child process from `server.js`)? **No** operator-facing compose file.

5. What **must not** be done again (we suspect pool hooks and session-end callbacks during SIP re-INVITE) — please confirm failure mode.

**What we need back**

- Ordered steps (Step 1, 2, 3…) an agent can follow **one MOB at a time**
- Explicit **forbidden file list** until gate pass
- Clear **gate**: “operator sees video on test page only” before UI phase

---

## When Google answers

1. Agent saves answer → new MOB DISC file (e.g. `MOB-DISC-GOOGLE-ZLM-INTEGRATION.md`)
2. Links from `MOB-DISC-START-HERE.md`
3. **No code** until you say `MOB-APPLY` on a **named** step from Google’s list
4. If anything breaks live wall: `RUN RESTORE-ME8-FIRMWARE-GOLD`

---

## You do not need to ask Google about

- Pin mirror / Open All (already fixed — Firmware Gold)
- TOTP (bench suspended — ship checklist covers re-enable)
- Docker install steps for yourself (tell Google: **forbidden for operator**)

---

## Related

- `docs/MOB-DISC-ZLM-NOT-READY.md` — why we reverted  
- `docs/MOB-DISC-FIRMWARE-GOLD-PIN-MIRROR.md` — do not break  
- `docs/MOB-DISC-TOTP-SUSPENDED-BENCH.md` — login relief on bench
