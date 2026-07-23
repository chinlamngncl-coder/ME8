# MOB DISC — Still no video after WVP-primary-all (black / no light-up)

**Status:** DISC only — 2026-07-19 · no APPLY  
**Search:** idle no_active_stream, Invalid URL flvUrl, Open All black, thin removed but dark  
**Related APPLY:** `MOB-APPLY-WVP-PRIMARY-ALL-FINAL` (thin gate removed; multi ZLM allowed)

---

## Verdict

WVP `startPlay` works. Ops stays dark because the **clean** `tryWvpZlmPrimary` picks a **relative** `flvUrl`, then `new URL(flvUrl)` **throws**, catch returns `null`, broker reports **`engine: idle`**. Soft mpegts never mounts. Wall still also kicks **Fleet INVITE → 408** for JSMpeg — no picture either.

---

## Proof (lab)

| Step | Result |
|------|--------|
| `getDescriptor(…0008/0009)` | `engine: "idle"`, `reason: "no_active_stream"` |
| `startPlay` raw | `flvUrl` = `/api/lab/wvp/flv?labWvp=…` (relative) |
| | `directFlv` = `http://192.168.1.38:18088/rtp/….live.flv` (absolute) |
| Pick order in broker | `play.flvUrl \|\| play.directFlv \|\| …` → **relative wins** |
| Port rewrite | `new URL("/api/lab/…")` → **`Invalid URL`** → catch → `null` |
| Soft ZLM on wall | Needs `desc.engine === 'zlm' && desc.flvUrl` — never arrives |
| Fleet path | Still `invite failed status:408` (cams on WVP `:5060`, not Fleet) |

---

## Why Open All still dark

```
Click Open / Open All
  → Fleet start-video / INVITE ──► 408 (no Fleet REGISTER) ──► JSMpeg never lights
  → later scheduleWallZlmSoftUpgrade
       → fetch /api/live/playback
       → tryWvpZlmPrimary throws on relative flvUrl
       → idle ──► no mpegts overlay
```

Thin-list removal and multi-slot ZLM allow **did their jobs**. The **port-enforce block** from the earlier clean overwrite breaks every WVP primary when `flvUrl` is the proxy path.

Secondary: `index.html` still loads `video-wall.js?v=20260718-pin-dock-no-top-jam` — hard refresh needed for wall allow change; **broker bug is server-side** and already active after restart.

---

## Not the cause (this check)

- WVP registration / Platform Connected  
- Presence green paint  
- Soft Open thin allowlist (already removed)  
- `wallZlmSoftUpgradeAllowed` multi-block (already removed)

---

## Direction (needs named APPLY — not done)

Prefer **one** of:

| APPLY | Intent |
|-------|--------|
| A | Prefer absolute `directFlv` / `upstreamFlv` before relative `flvUrl`, then port-enforce only on absolute URLs |
| B | `new URL(flvUrl, 'http://192.168.1.38')` (or stream host) so relative proxy path survives |
| C | Skip port rewrite when URL has no host; pass relative `/api/lab/wvp/flv` through as-is |

Also separate: Ops Open still emits Fleet INVITE (408). Picture can work from WVP-only descriptor **without** Fleet invite if soft ZLM mounts first — but today soft upgrade waits until after JSMpeg attach path. That may need a later APPLY; **fix the URL throw first**.

**Anti-harassment:** any fix must not add SIP INVITE auto-retry loops.

**One line:** Broker returns idle because relative `flvUrl` + `new URL()` throws; WVP play is fine; Fleet INVITE 408 still leaves JSMpeg dark.
