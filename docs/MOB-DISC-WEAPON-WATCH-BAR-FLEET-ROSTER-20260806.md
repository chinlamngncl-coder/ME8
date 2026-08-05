# MOB DISC — Weapon watch bar + live fleet roster (2026-08-06)

**Status:** disc only. No code until APPLY below.  
**Scope:** Weapon Live Watch chrome + roster online only. No detect engine. No hardcoded cams.

## Confirm: I understand

1. Weapon **Start watch / Stop video / Stop all / Clear** have the **same dull problem** FR had. Fix **the same way as FR**.
2. Your **BWC is missing** on Weapon. Do **not** hardcode Chin / kk / any camId. Different BWCs will be online. Hardcode = forbidden.

Detect stills MOB waits until this PASSes.

## 1) Watch bar — copy FR exactly

FR now:

- Small class: `ax-hub-nav-btn ax-hub-nav-sub-btn`
- Start watch + `active` = **Live Watch** blue
- Stop / Stop all / Clear = **Load video** dark pill
- Disabled = no click, **opacity 1** (no fade)

Weapon still uses `.btn.btn-action` / `.btn.btn-ghost` → dull ghost buttons.

Same classes + same no-fade on `#ax-wd-watch-start`, `#ax-wd-watch-stop`, `#ax-wd-watch-stop-all`, `#ax-wd-roster-clear`. Same ids. Same clicks.

## 2) Why BWC is missing (not hardcode)

Weapon roster already loads **`/api/fleet`** (whole fleet, not a name list). **No camId is hardcoded today.**

Bug: Weapon then asks `GlobalDevicePresence.isOnline(id)`. If presence does not know that id yet, it returns **false** and **wipes** fleet online. Default filter is **Online** → empty. FR Live still shows them because FR uses fleet `d.online` and does not wipe.

Also Weapon does not subscribe to presence updates the way ANPR does.

### Locked fix

- Roster = **whatever is in fleet right now**. Online / offline from the same live data as FR. No Chin. No kk. No sample ids.
- Online rule: **never** treat “presence unknown” as offline if fleet says online. Presence may **turn on** a cam; it must not **erase** a known-online cam.
- Filter Online still means online only — after the flag is honest.
- Already-live rule for **video start** stays (no silent INVITE). Roster must still **list** online cams that are not yet streaming.

## Out of scope

Weapon detect / alarm / nearby. FR chrome. ANPR roster.

## One next APPLY

**`MOB-APPLY WEAPON-WATCH-BAR-FLEET-ROSTER-V1`**
