# MOB DISC — FR engine health, KS roll/flash, roster filter flash (2026-08-05)

**Status:** APPLIED `FR-ENGINE-HEALTH-KS-FLASH-FILTER-V1` (2026-08-05).  
**Scope:** FR chrome only. ANPR / weapon / live engine unchanged.

## Confirm: I understand

Three small FR items:

1. ANPR shows **Engine** on every section. FR only shows it on **Verify 1:1**. Unify — especially Live Watch. Put it **just under the Live Watch tab**. Do not move tiles / KS / roster.
2. Known subjects: do hits **roll** FIFO? If unacked, can the chip **flash**? Repeat hits?
3. Roster filter **Online / In watch / Offline keeps flashing**. Space? Make the control wider?

## Honest answers

### 1) Engine health

ANPR badge sits on the subnav bar (`#ax-anpr-status`) for Live / Snapshot / Offline / History / Lists.

FR badge (`#ax-fr-sidecar-status`) lives **only inside Verify**. Health fetch already runs on FR, but the element is hidden on Live Watch.

**Fix:** one FR Engine pill, same wording as now (**FR Engine — OK**). Place it **under the FR tab row**, left — under **Live Watch**. Shows on Live / Offline / Verify / Watchlist. Remove the duplicate inside Verify so it does not appear twice. No other layout change.

### 2) Known subjects — roll + flash + repeats

**Now (6 desk chips):**

- New person/cam → chip goes to **slot 1 (left)**. Others shift right. Oldest drops off. Overflow `+N`. That is FIFO.
- Same person **+ same cam** again → **update that chip in place** (no second chip).

**Ack flash (new):** unacked match chip **pulses** until HQ **Ack** / **Dismiss**. Then pulse stops.

**Repeats:** same person+cam stays **one chip**, keeps flashing until ack. Does **not** spam 6 copies of the same face. Different cam → another chip (already).

### 3) Filter flash

Not the officer going online/offline in the label.

The roster **rebuilds the whole bar** (search + `<select>`) on every fleet refresh. Windows redraws the dropdown → looks like Online / In watch / Offline flashing. Width is also tight (`min-width: 118px`); **In watch** is longer than **Online**.

**Fix:** stop recreating the filter (only refresh the BWC list). Set a wider min-width so **In watch** / **Offline** fit (about **148px**). Do not change filter meanings.

## One next APPLY

**`MOB-APPLY FR-ENGINE-HEALTH-KS-FLASH-FILTER-V1`**

## Operator pass

Hard-refresh Analytics → FR.

- Live Watch (and other FR tabs): **FR Engine — OK** under the Live Watch tab. Verify has no second copy.
- New KS hit enters left; oldest drops right. Unacked chip flashes. Same face+cam does not fill the bar. Ack stops flash.
- Online / In watch / Offline no longer flicker. Dropdown wide enough to read **In watch**.
