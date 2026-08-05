# MOB DISC — Weapon roster: online pip + names missing (2026-08-06)

**Status:** disc only. Watch-bar tabs = **PASS**. No code until APPLY below.  
**Scope:** Weapon roster row chrome only. No hardcode cams. No detect engine. No watch-bar change.

## Confirm: I understand

PP shows **4/4 online**, but the rows look empty: no name, no online, only a dash. Check why.

## What I see

| Piece | Truth |
|-------|--------|
| Group **4/4 online** | Fleet data is there. Cams are online. |
| Orange dot | Group colour only. |
| **No green online pip** | Weapon used class `ax-fr-roster-online`. CSS only paints **`ax-fr-roster-status.is-on`**. Wrong class → no green. |
| **No Chin / kk names** | Name cell uses FR CSS `max-width: 0`. FR rows have a **pin column**. Weapon skipped that column → name column collapses to nothing. |
| Dash **—** | Not online/offline. Means **not on a live tile yet**. Same as FR idle badge. |

Not a missing BWC. Not a hardcoded list. **Row HTML does not match FR CSS.**

## Locked fix

Copy FR row chrome on Weapon only:

1. Online pip = `ax-fr-roster-status is-on` / `is-off` (green / grey).
2. Keep an empty pin cell so the name column has width (no pin feature in this MOB).
3. Name + short id stay from live fleet (`d.name` / `d.id`). **No hardcoded names.**
4. Dash stays = not on a tile. Do not relabel it “online”.

## One next APPLY

**`MOB-APPLY WEAPON-ROSTER-STATUS-NAME-ROW-V1`**
