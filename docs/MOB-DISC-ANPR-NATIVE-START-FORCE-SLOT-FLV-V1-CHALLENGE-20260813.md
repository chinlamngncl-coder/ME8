# MOB-DISC ANPR-NATIVE-START-FORCE-SLOT-FLV-V1 — challenge + correct design (2026-08-13)

## Operator challenge (valid)

> Force FLV to slot? What if another BWC is registered and called in? Hardcoding? Cheating?

**Answer: the APPLY name was bad.** “Force slot FLV” sounds like pin one stream / hardcode / steal play. That is **rejected**.

This disc **renames intent** and locks what is allowed.

---

## What we will NOT do

| Forbidden | Why |
|-----------|-----|
| Hardcode one camId / one FLV URL | Breaks multi-BWC; lab cheat |
| Call WVP `ensurePlay` / `startPlay` from ANPR | Steals concurrent-stream base (locked) |
| Stuff cam A’s FLV into cam B’s slot | Cross-cam corruption |
| Single global “the” stream URL | Second BWC register/call-in wrong |
| Bypass license / watch set | Product gate stays |

---

## Real bug (not “need force”)

Native path today:

1. Browser **Start watch** → `emitWatchSlots()` → Node `setWatchSlots(socketId, camIds[])` — **IDs only**
2. Node `resolveFlv(camId)` — **read-only** from WVP active map
3. If map empty/cold → `skip watchStart … no_upstream_flv` → sidecar only sees `GET /watch/events`

Browser tile often **already has** that cam’s FLV (handoff into the tile). Node never receives it — only camId. Race / cold map ≠ “hardcode a URL.”

Paused browser video still does nothing for Python until `/watch/start` with **that cam’s** URL.

---

## Correct design (multi-BWC safe)

**Rename for APPLY (recommended):**  
`ANPR-NATIVE-START-PASS-CAM-FLV-MAP-V1`  
(Keep old name in history only; do not implement “force.”)

### Behavior

1. On **Start watch** / slot change / tile FLV attach: emit  
   `camIds` **plus** optional `flvByCam: { [camId]: upstreamFlvUrl }`  
   — only URLs the UI already got for **that** camId (per-tile / handoff cache).
2. Node `syncNativeWatches`:
   - Prefer `flvByCam[camId]` if present and non-empty
   - Else fall back to `resolveFlv(camId)` (unchanged read-only WVP map)
   - Still **one URL per camId**; union of sockets unchanged; MAX_CAMS unchanged
3. When cam B is selected / called into a slot later: its own FLV enters the map under **B’s** camId; A’s watch stays A’s URL.
4. Same cam + same URL → reuse (already applied); URL change → restart that cam only.
5. Unselected / cleared cam → `watchStop` that camId only.

### Multi-BWC / “called in”

- Roster select + rotate already drives which camIds are in the watch set.
- New BWC = new camId entry. No shared hardcode.
- Concurrent Ops wall / other modules: ANPR still **must not** start WVP play; it only **passes** a URL the tile already holds or the map already has.

---

## Risk pick

| Option | Verdict |
|--------|---------|
| A. Hardcode lab FLV / one cam | **FAIL** — cheat |
| B. ANPR calls ensurePlay | **FAIL** — base harm |
| C. Pass per-cam FLV map from UI + WVP fallback | **PASS** — recommended |
| D. Only retry Node resolveFlv forever | Weak — still fails if map never lists that cam while tile is live |

**Recommendation: C** under name `ANPR-NATIVE-START-PASS-CAM-FLV-MAP-V1`.

---

## Files (when APPLY)

- `public/js/anpr-live-watch.js` — emit `flvByCam` with slots (no WVP API)
- Socket / server bridge for setWatchSlots payload
- `lib/anprLivePoller.js` — accept map; prefer per-cam URL; no ensurePlay

No ingest bat. No square-crop change in this MOB.

---

## Operator PASS after APPLY

1. Start watch cam A → ANPR bat shows `/watch/start` for A  
2. Add / rotate cam B → start (or reuse) for B; A not replaced by B’s URL  
3. Ops / other live modules still OK (no ANPR ensurePlay)

---

## Next step

Say exactly:  
`MOB-APPLY ANPR-NATIVE-START-PASS-CAM-FLV-MAP-V1`  
(Do **not** APPLY the old FORCE name — that framing is rejected.)
