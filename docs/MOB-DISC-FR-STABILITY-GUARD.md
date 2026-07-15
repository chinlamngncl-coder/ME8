# MOB DISC — FR stability guard · no regression on core fleet

**Status:** DISC locked 2026-07-11 — **operator directive**  
**Rule:** Months of stable VC · PTT · SOS · live wall · map pin · command wall — **do not break**.  
**Search:** stability, no regression, risk first, locked files, rollback  
**Related:** `MOB-DISC-FR-GENRE-ROADMAP-UI-ENGINE-ALERT.md`, `BASELINE-ME8-POC-DEMO.md`, workspace `mob-c2-locked-files.mdc`

---

## Operator directive (locked)

> If you see or feel **any risk** to current stable functions — **say first**. MOB DISC before APPLY when unsure. No silent behaviour changes on core fleet.

**Agent must:**

| # | Before APPLY |
|---|----------------|
| 1 | Name **files touched** and **files NOT touched** |
| 2 | Rate risk: **none / low / medium / high** |
| 3 | List **what could break** if wrong |
| 4 | Give **rollback** (RESTORE or one-line revert) |
| 5 | If **medium+** on core paths → **STOP** — MOB DISC only until operator says MOB-APPLY |

**One MOB at a time · PASS/FAIL between each · no stacking.**

---

## Core fleet — DO NOT TOUCH (unless operator names file)

| Surface | Files | Why locked |
|---------|-------|------------|
| Live video / wall | `video-wall.js`, `fleet-ui.js` | Broken 4+ times |
| PTT RX / fleet UI | `ptt-rx.js` | Same |
| SIP / PTT server | `sipServer.js`, `pttServer.js` | Registration, invite, pool |
| Live audio / SOS pipe | `psG711Audio.js`, `jsmpeg.min.js` | SOS / live decode |
| Server live pool | `server.js` pool / invite paths | 8-cap, multi-admin |
| Baseline snapshots | `baseline/**/*` | Restore truth |

**FR work stays in:** `fr-alarm.js`, `fr-live-watch.js`, `analytics-hub.js`, `index.html` (FR CSS/cache), `en.json`, `lib/frLivePoller.js`, `fr-sidecar/` — **only when MOB names them**.

---

## Risk tiers (FR genre)

| Tier | Meaning | Examples | APPLY? |
|------|---------|----------|--------|
| **0 — Cosmetic** | CSS, i18n, layout shell, no runtime path change | Roster density, drawer placeholder | OK after DISC |
| **1 — FR-only additive** | New UI; old code path still runs | Drawer **alongside** modal | OK + checkpoint |
| **2 — FR behaviour swap** | Same feature, different UX path | Drawer **replaces** auto-modal | **Flag operator first** |
| **3 — Server / pool / SIP** | Touches live stream count, invite, probe | `probe-queue-32`, headless grab | DISC + bench + checkpoint |
| **4 — Core fleet** | VC, wall, PTT, SOS, map live pin | Any locked file | **Forbidden** unless operator names file |

---

## Checkpoint SOP (after any MOB ≥ tier 1)

**Mini (FR panel only):**

1. Hard refresh  
2. Start watch → 1 cam live → stop  
3. If alarm MOB: trigger or mock hit → Ack  
4. Quick glance: map clickable, wall unchanged  

**Full (tier 3+ or user says full):**

`RESTART-FLEET.bat` → hard refresh → one cam live → stop → Open All lite → stop all  

Reply **CHECKPOINT PASS** or **CHECKPOINT FAIL**.

---

## Risk register — recent + upcoming MOBs

### Already APPLIED — review honestly

| MOB | Tier | Core fleet touched? | Risk note |
|-----|------|---------------------|-----------|
| `mob-fr-watch-roster-table` | 1 | No | Roster UI only; watch emit unchanged |
| `mob-fr-6tile-grid-ui` | 1 | No | `LIVE_SLOTS` 4→6 in `fr-live-watch.js` only — **more live invites** (still ≤8 cap) |
| **`mob-fr-rail-alert-shell`** | **2** | **No** | **Behaviour swap** — see below |

#### `mob-fr-rail-alert-shell` — risks you should know

| What stayed the same (low risk) | What changed (flagged) |
|--------------------------------|------------------------|
| HQ red bar on every page | **Blocking `#fr-alarm-backdrop` modal no longer auto-opens** on hit |
| Ack / Dismiss / Field / Standby PTT **same socket events** | Alert is **bottom-right drawer** — easier to miss vs old full-screen |
| Chime, `flashCam`, crop rail push, queue | Match rail card click → drawer (was lightbox for active hit) |
| `video-wall.js`, PTT, SOS, SIP **not edited** | Drawer on map/wall page may overlap UI (non-blocking but new) |

**If this feels wrong in test:** one revert MOB restores auto-modal on hit while keeping rail overlay:

```text
MOB-APPLY mob-fr-rail-alert-shell-revert-modal   # DISC first — drawer + modal both, or modal primary
```

**Rollback now:** `git checkout` / baseline restore for `fr-alarm.js` + `index.html` cache line only — **does not** affect VC/PTT/SOS.

---

### Upcoming — pre-flagged risk

| MOB | Tier | Risk |
|-----|------|------|
| `mob-fr-alert-drawer-shell` | 1 | Layout only — low if no modal retire |
| `mob-fr-red-toast-shell` | 1 | New toast — low |
| `mob-fr-roster-compact-density` | 0 | CSS only |
| `mob-fr-watch-pause-resume` | 2 | Stop/pause semantics — must not break **Stop watch** |
| `mob-fr-tile-status-hints` | 1 | Tile text only in `fr-live-watch.js` |
| `mob-fr-watch-set-server-sync` | 3 | Server payload — probe load |
| `mob-fr-probe-queue-32` | 3 | **Snap load on all 32** — CPU/ffmpeg pressure |
| `mob-fr-rail-snap-to-live` | 3 | **7th live stream** possible — pool cap |
| `mob-fr-alarm-modal-retire` | 2 | Removes fallback modal — operator sign-off required |

---

## STOP — agent must not APPLY without explicit OK

| Condition | Action |
|-----------|--------|
| MOB touches locked file | STOP · ask operator |
| MOB changes `server.js` live pool / SIP | DISC + tier 3 checkpoint |
| MOB retires working UX with no fallback | DISC + operator chooses A/B |
| Operator says “months to stable — no break” | **This doc wins** — risk paragraph in every APPLY reply |
| CHECKPOINT FAIL on core path | **One fix or RESTORE** — no next MOB |

---

## Safe FR island (where we can move fast)

```
Analytics → Face recognition panel only
  fr-live-watch.js   — 6 tiles, roster, rotate
  fr-alarm.js        — rail, drawer, HQ bar
  analytics-hub.js   — tabs, verify, watchlist
  index.html         — FR CSS + cache bust
  en.json            — copy only
```

**Failure here must not take down:** Command wall live, map pins, PTT hold-to-talk, SOS banner, Settings server config.

---

## APPLY reply template (agent)

Every MOB-APPLY reply includes:

```text
Stability: [tier 0–4] · Core fleet files: none | list
Could break: …
Rollback: …
```

If tier ≥ 2: **“Confirm OK to keep this behaviour?”** before next MOB in same genre.

---

## Bottom line

| You said | We do |
|----------|--------|
| Months stable — don’t break | Locked files sacred; FR island only |
| See risk → tell me first | Tier + register in DISC; STOP at tier 3+ / core |
| MOB DISC | **This doc** + per-MOB notes in genre roadmap |

**Current honest flag:** `mob-fr-rail-alert-shell` is **tier 2** (drawer instead of auto-modal). Core fleet **untouched**. Test Ack + map click on hit; reply PASS/FAIL.

**No further APPLY** until you PASS or ask revert.
