# MOB DISC — Ghost kill method hurt live / Open All / GPS after restart

**Status:** DISC locked 2026-07-10 — **operator FAIL on method** (live OK again after wait; record stands).  
**Repair:** `mob-fleet-boot-online-soften` **APPLIED** 2026-07-10 — boot no longer mass-offlines real BWCs.  
**Search:** `UB-6A5G`, `mob-fleet-no-ghost-12h-restart`, Open All, black, can't off, GPS 1–2 min, fallback  
**Related applied (harmful method):** `mob-fleet-no-ghost-12h-restart`  
**Related symptom:** `MOB-DISC-CHIN-BLACK-LIVE-INVITE-STUCK.md` (black + can't off — your words)

---

## Your report (accepted — record)

**Sequence**

1. Agent applied **`mob-fleet-no-ghost-12h-restart`** (take UB-6 off fleet / harden boot offline / reject `UB-*` as cam id).  
2. **Then** live / Open All hurt: Chin black “Live streaming…”, Stop felt dead (same class as your Jul 5 “black screen + can't off”).  
3. After **`RESTART-FLEET`**, software felt **retarded**: **~1–2 minutes** waiting for devices to confirm GPS / come back useful.  
4. Later: **OK again** after waiting.

**Locked judgment**

> Taking ghosts off the way we did is **hurting live and Open All**.  
> That method must be **on record as bad for ops**, even if the ghost goal was right.

Product goal (no hanging UB-6 in FR watch) stays valid.  
**This implementation** is not the right way.

---

## What that MOB actually did (so we don’t forget)

| Change | Intent | Why it can hurt live / restart feel |
|--------|--------|-------------------------------------|
| **Purge** `UB-6A5G` from `bwc-devices.json` | Remove junk registry row | OK alone if surgical; not the main live killer |
| **Boot: `markOffline` every fleet row** + clear `connectedCameraId` / siteDb online | No fake-online after restart | Forces **cold fleet**: every cam must re-REGISTER / re-presence before Open All / GPS feel “ready” → **1–2 min dead air** |
| **`isBwcCameraId` rejects `UB-*`**; PTT resolve never returns login string as camId | Stop ghost re-entry | Safe **if** SIP IP→cam map already exists; cold boot before map fills can delay PTT/session wiring |
| Never seed online from siteDb / contact cache | Honest online | Same cold-start tax — no warm “known online” handoff |

We did **not** edit `video-wall.js` in that MOB. Harm is still real: **server presence / boot policy** can make Open All and GPS feel broken even when wall JS is untouched.

---

## Proper ways (do ghosts without nuking live)

Goal unchanged: **UB-6 (model/login junk) must not hang in FR watch / active UI.**  
Do **not** achieve that by wiping all online + nuking warm restart.

### Way A — UI filter only (safest)

| Do | Don’t |
|----|--------|
| FR watch / ops chips: show only `online === true` **and** `isBwcCameraId(id)` | Delete registry rows mid-shift |
| Hide offline / non-GB ids from **active** lists | Boot-`markOffline` entire fleet |

Junk can stay in Settings registry for admin delete later. Live path untouched.

### Way B — Soft retire (admin / one-shot)

| Do | Don’t |
|----|--------|
| Mark row `retired: true` or move to `storage/bwc-devices-retired.json` | Auto-purge on every bootstrap |
| Operator or named MOB deletes one junk id when fleet is **idle** | Couple delete with boot online wipe |

### Way C — Boot honesty without cold massacre

| Do | Don’t |
|----|--------|
| Fix the **copy-mutation bug** only: clear fake online on **real** registry records for ids that were never SIP-live this process | `markOffline` **all** Chin/kk + wipe `connectedCameraId` every restart as a blunt hammer |
| Keep last GPS / contact cache for **real** GB ids so map/GPS return in seconds | Force 1–2 min “wait for GPS confirm” as normal |

### Way D — Never treat login as camId (narrow)

| Do | Don’t |
|----|--------|
| `resolvePttCamId`: IP map → else GB id → else **null** (already direction) | Bundle that with fleet-wide boot offline + file purge in **one** MOB |

One concern per MOB.

### Way E — 12h rule = display TTL (already partly done)

| Do | Don’t |
|----|--------|
| Offline pin TTL / hide stale chrome (prior pin TTL MOB) | Equate “hide from UI” with “purge registry + cold boot all” |

---

## Suggested repair order (when you say APPLY — one at a time)

| # | MOB (name) | Intent | Status |
|---|------------|--------|--------|
| 1 | `mob-fleet-boot-online-soften` | Undo blunt boot wipe: do **not** mass-`markOffline` every real cam + wipe siteDb online on every start; only clear **junk** ids | **APPLIED 2026-07-10** (`server.js` `seedFleetOnlineFromPersistedState`) |
| 2 | `mob-fr-watch-gb-online-only` | FR/active lists: GB id + online only (UB-6 never listed even if somehow present) | Pending |
| 3 | Keep or re-check junk row | `UB-6A5G` already purged — OK to leave out; do not re-add | Done |

**Do not** re-open Jul 5 destroy/reattach pin MOBs.

---

## Bottom line

| Item | Record |
|------|--------|
| Ghost goal | Still right |
| **`mob-fleet-no-ghost-12h-restart` method** | **Hurts live / Open All / post-restart GPS feel** — operator FAIL on method |
| Proper | Filter / soft retire / narrow PTT id rules — **not** cold-boot massacre + bundled purge |

Reply when ready, e.g. `MOB-APPLY mob-fleet-boot-online-soften` first.
