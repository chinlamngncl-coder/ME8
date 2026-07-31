# MOB DISC — ANPR Live stuck Connecting (kk) — root cause locked

**Date:** 2026-07-31  
**Status:** DISC — **no code until** APPLY  
**Operator evidence (screenshot):**  
- kk checked · roster says **live** · meta **1/16 selected · 1/4 live**  
- Tile 1 = `34020000001329000009` · text **Connecting…** (forever)  
- Chin offline (irrelevant)  
**Not** an “kk offline” story. Agent was wrong to lead with that after this shot.

---

## What “1/4 live” / roster “live” actually means (bug)

In ANPR Live today, roster **live** = cam is **assigned to a tile slot**, not “video is playing.”

So the UI **lies**: meta/roster say live while the tile still says **Connecting…**. Face does not use that fake “live” label the same way.

---

## Root cause (code)

`public/js/anpr-live-watch.js` on `video-stream-ready`:

```js
if (data.wvpVideoHandoff && data.flvUrl) {
    attachFlv(...);   // only path
}
// NO else → no JSMpeg classic attach
```

**Face (`fr-live-watch.js`)** does:

1. If handoff + `flvUrl` → FLV attach  
2. **Else** → `attachPlayer` (JSMpeg on video WS)

So when ready event is classic (no FLV), or FLV attach never proves, **Face can still show video; ANPR Live sits on Connecting forever.**

Also: no signal/stall timer → Connecting never times out to **No video**.

Server path for `analytics-anpr` + WVP handoff is the same family as Face. The **client attach gap** is the product fail on this screenshot.

---

## What we will do (one MOB)

### `ANPR-LIVE-VIDEO-ATTACH-PARITY-V1`

| # | Fix |
|---|-----|
| 1 | Mirror Face: `video-stream-ready` → FLV if present, else **JSMpeg** `attachPlayer` |
| 2 | On prove fail / `video-stream-error` → tile **No video** (not endless Connecting) |
| 3 | Roster/meta: **live** only when tile has proven video (`is-live`), not merely slot occupied — or label **on tile** vs **Live** |
| 4 | Optional short Connecting timeout → retry once or show No video |
| 5 | Do not touch OCR / plate lists / Stop all / slot counts |

**PASS:** Select kk (online) → Start watch → tile shows moving video (same as Face for that cam). Roster must not say “live” while tile still says Connecting.

---

## APPLY

```
MOB-APPLY ANPR-LIVE-VIDEO-ATTACH-PARITY-V1
```

No code in this disc.
