# MOB DISC — Watch bar = small Live Watch row (2026-08-05)

**Status:** disc only. No code until APPLY below.  
**Scope:** FR watch-bar chrome only. Same ids. Same clicks.

## Confirm: I understand

**Not** the big Face / ANPR / Weapon tabs.

Use the **small** row: Live Watch / Load video / Verify / Watchlist.

| Watch bar | Copy this small tab | Brightness |
|-----------|---------------------|------------|
| **Start watch** | **Live Watch** | Same blue. Same brightness. |
| **Stop video** | **Load video (offline)** | Same dark pill. Same brightness. |
| **Stop all** | **Load video (offline)** | Same. |
| **Clear** | **Load video (offline)** | Same. |

Small size is fine. Do **not** copy the big heading tabs.

## Why brightness is wrong now

Start watch / Stop / Clear still **fade to 45%** when disabled.  
Live Watch and Load video do **not** fade. So blue looks weaker, dark ones look dead.

## Locked APPLY

1. Keep small class: `ax-hub-nav-btn ax-hub-nav-sub-btn`
2. Start watch: also `active` — same as Live Watch
3. Stop video / Stop all / Clear: no `active` — same as Load video
4. Those four: disabled = no click, **opacity 1** (same brightness as Live Watch / Load video)
5. Nothing else.

## One next APPLY

**`MOB-APPLY FR-WATCH-BAR-L2-BRIGHT-MATCH-V1`**
