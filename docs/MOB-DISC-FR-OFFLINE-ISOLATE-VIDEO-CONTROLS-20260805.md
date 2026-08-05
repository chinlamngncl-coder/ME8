# MOB DISC — FR offline isolate + video controls + storage confirm (2026-08-05)

**Status:** APPLIED `FR-OFFLINE-ISOLATE-VIDEO-CONTROLS-V1` (2026-08-05).  
**Scope:** FR Analytics only. No roster 5×6 change, no hit→slot1, no ANPR, no sidecar.

## Confirm: I understand

Two teams can work at once: **Live Watch** vs **Load video (offline)**. They must not share snapshots / Known Subjects / alerts.

```
LIVE team                         OFFLINE team
KS + Recent + live alerts         own scan + own alerts only
never see offline crops           never write into live KS / Recent
```

Offline player must have **Play · Pause · Stop · drag/scrub line**. Rest of offline UI stays.

## Facts — Recent scroll + disk keep (your “did you make sure”)

| Ask | Honest answer |
|-----|----------------|
| Scroll if Recent **> 12** | **Yes, already on.** Desk = 12 (2×6). Extra slots append up to 1000. Rail `overflow-y: auto`. |
| Kept after refresh / other user | **JPEGs on disk — yes.** Path: `{FR_STORAGE_ROOT}/fr/{YYYY-MM-DD}/{username}/{bwc_name}/` with time in the filename. Live snaps use BWC display name + date. Super Admin FR locker / mapped drive (what you call FTP folder) is this root — not a separate FTP uploader. |
| On-screen Recent / KS after refresh or user change | **No.** Those 12 + 6 chips are a **live memory buffer**. Disk is kept; the rail does **not** reload the archive into the tiles. That would be a later named MOB. |
| Offline disk folder bug | Offline `saveJpeg('fr-offline')` currently falls into the **anpr/** tree (store only treats exact `'fr'` as FR). Files still exist; folder name is wrong. Fix in the APPLY below. |

## Now vs target (offline)

| Piece | Now | Target |
|-------|-----|--------|
| Incoming ticks | Tab firewall on `fr-crop-tick` + banners (live tab ignores offline ticks) | **Keep.** Also **split buffers**: live KS/Recent ≠ offline KS/Recent. Switching tabs must not leave the other team’s faces on screen. |
| Shared DOM | One `#ax-fr-hits-bar` + one `#ax-fr-crop-rail` for both subs | Live tab paints live buffer only. Offline tab paints offline buffer only (or hides live KS). |
| Offline video | `<video controls>` is in HTML + JS | **Must be usable:** Play, Pause, **Stop**, **scrub/drag line** — not clipped / invisible. Rest of UI unchanged. |

## One next APPLY

**`MOB-APPLY FR-OFFLINE-ISOLATE-VIDEO-CONTROLS-V1`**

Will do only:

1. Separate live vs offline crop + KS memory. Offline never writes live rails/alerts; live never writes offline rails. Tab switch shows the matching buffer only.
2. Offline `saveJpeg` → real **`fr/`** date / user / label folder (fix `fr-offline` → `fr`).
3. Offline player: visible Play / Pause / Stop + scrub bar (`controls` not clipped; Stop = pause + back to start).
4. **Do not touch** live 3×2, BWC 5×6 roster, Recent 12 live layout, firewall IDs beyond this split, hit→slot1.

## Operator pass (after APPLY)

Hard-refresh once.

- Live Watch: only live snaps / KS / alerts. Load a video on another session or after switch — live rails stay live-only.
- Offline: play / pause / stop / drag the timeline. Scan crops do not appear on the live KS / Recent of a live-tab session.
- Disk: new FR snaps still under date + user + BWC (or video file) name.
