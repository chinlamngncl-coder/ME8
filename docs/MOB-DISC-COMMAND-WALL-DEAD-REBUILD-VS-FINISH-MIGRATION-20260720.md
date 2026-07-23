# MOB DISC — Command Wall dead, Evidence/FR, patch forever vs new Fleet?

**Date:** 2026-07-20  
**Status:** DISC only — no code  
**Operator:** Command Wall stuck **Connecting…** (Chin + kk, 16-grid). Evidence + FR exist. How long patch Fleet? Start new Fleet?

---

## 1. Why Command Wall fails (root cause — not mystery)

Your screenshot: slots **Connecting…** forever, devices **online** in roster.

| Step | Ops wall (partial fix) | Command Wall |
|------|------------------------|----------------|
| `start-video` + `FM_WVP_VIDEO_HANDOFF=1` | Server → WVP `startPlay`, **no Fleet INVITE** | **Same** |
| `video-stream-ready` | `{ wvpVideoHandoff, flvUrl }` | **Same** |
| Client player | `Me8LivePlayerFactory.attachFlvPrimary` | **`JSMpeg.Player(videoWsUrl)` only** |

Code proof — `command-wall.js` `attachPlayer`:

```javascript
const player = new JSMpeg.Player(videoWsUrl(camId), { canvas, ... });
```

`video-stream-ready` handler calls `attachPlayer(slot)` — **ignores `flvUrl` and `wvpVideoHandoff`**.

With handoff on there is **no MPEG-TS on `videoWsUrl`** → JSMpeg never decodes → **Connecting… forever**.

**Not** roster, not online, not WVP down — **Command Wall was never taught handoff FLV.** Ops wall got a partial MOB; Command Wall did not.

Same pattern: **`fr-live-watch.js`** — JSMpeg only → FR live tiles likely same stuck state under handoff.

---

## 2. Evidence and FR — are they “broken too”?

| Module | Depends on Fleet video WS? | Handoff impact |
|--------|---------------------------|----------------|
| **Evidence & Docking** | Catalog, upload, redact, custody | **Mostly OK** — not Command Wall player |
| **FR (Analytics)** | Alarm UI, ledger, standby PTT | **Mostly OK** |
| **FR live watch tiles** | JSMpeg like Command Wall | **Same break** if handoff on |
| **SOS ACL / cold SOS** | WVP `:5060` translator | **PASS** (separate pipe) |
| **PTT** | Fleet `:29201` | Own issues (login), not Command Wall |

So it’s **not** “whole product dead” — it’s **every surface still on JSMpeg** while backend skipped Fleet INVITE.

**Live video surfaces today:**

| Surface | Player under handoff |
|---------|---------------------|
| Ops wall (`video-wall.js`) | FLV ✓ (partial) |
| Map pin | Mirror from wall ⚠ |
| **Command Wall** | JSMpeg ❌ **Connecting forever** |
| **FR live watch** | JSMpeg ❌ |
| Conference | check separately — likely same class |

---

## 3. How long “patch Fleet”?

**Wrong framing:** endless one-line patches.  
**Right framing:** **one incomplete migration** — backend moved to WVP; **3+ frontends** still assume Fleet pool.

### Option A — Finish migration (recommended if WVP video stays)

| # | MOB (one at a time) | Unblocks |
|---|---------------------|----------|
| 1 | `FLV-WALL-LIFECYCLE-PARITY-V1` | Ops: Stopped by BWC, signal lost, stall |
| 2 | `COMMAND-WALL-FLV-HANDOFF-V1` | Command Wall Connecting → Live |
| 3 | `FR-LIVE-WATCH-FLV-HANDOFF-V1` | FR tiles (reuse same factory) |
| 4 | Pin / dock MOBs | Map pin picture + layout |

**Estimate:** 3–4 **named** APPLYs with operator PASS between — **not** months of daily patches if scoped and not bundled.

**Shared fix:** `Me8LivePlayerFactory.attachFlvPrimary` already exists — Command Wall + FR = **wire `flvUrl` on `video-stream-ready`**, same as ops wall (~one MOB each, not rewrite).

### Option B — Park handoff (fast lab floor)

Set **`FM_WVP_VIDEO_HANDOFF=0`**:

- Ops wall → Fleet INVITE + JSMpeg (Jul-18 behavior)
- Command Wall → **works again** (JSMpeg path live)
- WVP wall picture → parked
- SOS ACL / WVP register → can stay

**Hours, not weeks** — env flip + restart. No new Fleet.

### Option C — “New Fleet from scratch”

| Keep (years of work) | Throw away / re-do |
|----------------------|-------------------|
| Auth, roles, dispatch groups | All UI |
| SOS ACL translator PASS | Command Wall, Evidence, FR |
| Evidence AES, custody, redact | PTT server, SIP, roster |
| FR alarm, ledger, standby | Map pin dock, 8-pin layout |
| WVP proxy, docker, handoff backend | Every MOB DISC/APPLY history |

**Verdict:** **Slower, not faster** — 6–12+ months to reach today’s feature surface (Evidence, FR, Command Wall, SOS, PTT, map). You’d **re-hit** the same split (WVP video vs Fleet PTT) unless you redesign upfront.

**Do not start new Fleet** to fix Command Wall Connecting — that’s **one missing FLV handler**, not a rotten codebase.

---

## 4. Why this happened (honest)

Google handoff plan said **“frontend frozen”** + backend handoff. In practice:

- Backend: **all** `start-video` skips Fleet when handoff on (including `surface: command-wall`).
- Frontend: **only ops wall** got FLV UI; Command Wall / FR **frozen on JSMpeg** = guaranteed break.

That’s **half migration**, not “Fleet is unsalvageable.”

---

## 5. Give up?

| Give up on… | Recommendation |
|-------------|----------------|
| ME8 / Mobility Axiom | **No** |
| WVP handoff without finishing frontends | **Yes** — park or complete |
| Endless unstructured patches | **Yes** — MOB genre + PASS or handoff off |
| Rebuilding “new Fleet” now | **No** — wrong tool for this bug |

---

## 6. Practical recommendation (pick one path)

**Path 1 — Need Command Wall + ops wall this week (lab)**  
→ **`FM_WVP_VIDEO_HANDOFF=0`** until MOBs 1–2 pass. Command Wall lives on Fleet canvas.

**Path 2 — WVP picture is the goal**  
→ **`MOB-APPLY-COMMAND-WALL-FLV-HANDOFF-V1`** next (after or parallel lifecycle MOB). Same factory as ops wall. **~1 MOB, not new product.**

**Path 3 — “New Fleet”**  
→ Only if you explicitly drop Evidence, FR, SOS ACL, ship gates and accept **multi-quarter** rewrite. **Not faster** for Connecting bug.

---

## 7. One line

Command Wall fails because **handoff turned off Fleet INVITE but Command Wall still plays JSMpeg** — same as ops wall before FLV MOB; Evidence/FR core are fine; **don’t rebuild Fleet** — either **park handoff** for a working floor or **2–3 focused MOBs** (lifecycle + Command Wall + FR watch), not infinite patch or greenfield.
