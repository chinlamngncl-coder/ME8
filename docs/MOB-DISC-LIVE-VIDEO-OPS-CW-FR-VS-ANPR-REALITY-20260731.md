# MOB DISC — Live video reality: Ops / Command Wall / FR vs ANPR (not “primitive forever”)

**Date:** 2026-07-31  
**Status:** DISC — **no code**  
**Trigger:** Operator shot — ANPR Live kk **Connecting…** while roster says live. Then: “are we still stuck on FLV/JSMpeg? What do Ops and Command Wall use? Why struggle on ports / everything?”

---

## Straight answer (one screen)

| Surface | With `FM_WVP_VIDEO_HANDOFF=1` (lab default path) | Classic fallback |
|--------|--------------------------------------------------|------------------|
| **Ops map wall** | **FLV** via `Me8LivePlayerFactory.attachFlvPrimary` (mpegts.js on ZLM `:18088`) | JSMpeg still in tree for handoff **off** |
| **Command Wall** | **FLV** same factory — **PASS** (`COMMAND-WALL-FLV-HANDOFF-V1`) | JSMpeg if no handoff |
| **FR Live** | **FLV** same factory — **PASS** (`FR-LIVE-WATCH-FLV-HANDOFF-V1`, Chin + kk) | **JSMpeg** if ready has no `flvUrl` |
| **ANPR Live** | **FLV only** if ready has `flvUrl` | **None** → stuck **Connecting…** |

We are **not** “still only on primitive JSMpeg” for Ops / Command Wall / FR.  
Those surfaces already run the **WVP → ZLM FLV** product path.  
**ANPR Live is a half-copy of FR.** That is why *this* screen is struggling — not because the whole product went backwards.

---

## What the product actually uses now

### Server (handoff ON)

`start-video` → **no** Fleet SIP INVITE for picture → WVP `startPlay` → browser gets `video-stream-ready { wvpVideoHandoff, flvUrl }`.  
Picture pipe = **ZLM HTTP-FLV** (lab typically `:18088`). BWC register / SOS still on **WVP SIP `:5060`**.

### Browser

Shared attach: `public/js/live-player-factory.js` → `attachFlvPrimary` (mpegts).  
Ops wall / Command Wall / FR already call that on ready.  
JSMpeg remains as **classic / fallback / handoff-off** — not the primary ops path when handoff is on.

### Locked history (do not rewrite)

- Command Wall Connecting → Live: **PASS** FLV  
- FR Live Connecting → Live: **PASS** FLV (same bug class as ANPR has **now**)  
- WVP stays. Fleet stays. No “turn handoff off to fix lab.”

---

## FR vs ANPR — code check (why ANPR fails today)

**FR** (`fr-live-watch.js`) on `video-stream-ready`:

1. If `wvpVideoHandoff && flvUrl` → attach FLV  
2. **Else** → `attachPlayer` (JSMpeg)  
Plus prove / error / stall handling so Connecting does not mean forever with a fake “live” label.

**ANPR** (`anpr-live-watch.js`) on `video-stream-ready`:

1. If `wvpVideoHandoff && flvUrl` → `attachFlv`  
2. **Else → nothing**  
`attachLiveForSlot` with no cached FLV only sets **Connecting**.  
Roster “live” = cam **on a tile**, not proven picture.

So:

- Same **backend** family as FR (`surface: analytics-anpr` vs `analytics-fr`).  
- **Client attach parity was not finished** when ANPR Live shipped.  
- This is the **same class of bug** FR already fixed in July (`FR-LIVE-WATCH-FLV-HANDOFF-V1` disc: FR only had JSMpeg while wall had FLV → eternal Connecting). ANPR reintroduced a thinner version of that mistake.

**Operator check (no APPLY needed):** same cam kk on **Analytics → Face → Live** vs **ANPR → Live**. If Face shows picture and ANPR Connecting → attach gap confirmed, not “ports broken for the whole site.”

---

## Are we “struggling on FLV / JSMpeg”?

**Two eras coexist on purpose** (handoff migration, not chaos for its own sake):

| Era | Pipe | Player |
|-----|------|--------|
| Classic Fleet | SIP INVITE + MPEG-TS WS | JSMpeg canvas |
| WVP handoff | WVP + ZLM FLV URL | mpegts `<video>` |

Ops / CW / FR **already moved** primary picture to FLV under handoff.  
Struggle now is **not** “invent a third player.” Struggle is **every new surface must copy the proven attach contract** (FLV primary + clear fail state + honest live label). ANPR Live skipped that contract.

Latency / ZLM buffer tuning is **parked** separately (proxy ~8–10s lab; not this Connecting bug). Do not mix.

---

## Why it feels like “ports / everything” forever

Honest split — **do not blend**:

| Pain | What it is | Same as ANPR Connecting? |
|------|------------|---------------------------|
| **Many listeners** | Dashboard `:3988`/`:4438`, WVP `:5060`, ZLM `:18088`, PTT `:29201`, SIP/Fleet legacy | **No** — infra map; document defaults vs configurable |
| **Handoff migration** | Each UI (wall, CW, FR, pin, matrix, popout) needed its own FLV MOB | **Related genre** — ANPR is the next unfinished surface |
| **ANPR Connecting today** | Incomplete client attach vs FR | **This bug** — fix with one parity MOB |
| **ANPR OCR / lists** | Engine / crop / match — separate genre | **No** — do not bundle into video attach |
| **PTT / conference under handoff** | Still Fleet-shaped in places | **Other** harm list items — not this tile |

Feeling of “everything” comes from **one migration with many surfaces**, applied **one MOB at a time** (locked rule), plus **new features** (ANPR Live) that must **reuse** the already-PASS attach path instead of inventing a thinner one.

We are **not** stuck “pre-WVP forever.” We are stuck when a **new panel forgets FR/CW attach parity**.

---

## What the agent was doing wrong (own it)

1. Shipped ANPR Live UI + poller + lists **without** finishing FR-grade attach (FLV + fallback + honest live).  
2. After the Connecting shot, wasting oxygen on “is kk offline?” when the tile already showed start path + Connecting.  
3. Talking like the whole product is still primitive JSMpeg — **false** for Ops / CW / FR under handoff.

---

## What we will do next (one MOB — when you APPLY)

### `ANPR-LIVE-VIDEO-ATTACH-PARITY-V1`

Copy **FR** attach contract into ANPR Live only:

1. FLV on ready when `flvUrl` present (already partial)  
2. Else JSMpeg classic attach (FR `attachPlayer`)  
3. Error / prove fail → **No video**, not eternal Connecting  
4. Roster/meta **live** only when tile proven, not “slot occupied”  
5. No OCR, no lists, no port redesign, no turn handoff off

**PASS:** kk (or Chin) picture on ANPR Live same as Face Live for that cam.

Also: `docs/MOB-DISC-ANPR-LIVE-CONNECTING-STUCK-KK-20260731.md` — Connecting evidence + same root cause.

---

## APPLY

```
MOB-APPLY ANPR-LIVE-VIDEO-ATTACH-PARITY-V1
```

No code in this disc. No agent replace needed for this answer — the gap is named and bounded.
