# MOB DISC — FR BWC online: lighter chrome (2026-08-05)

**Status:** APPLIED `FR-BWC-ONLINE-THIN-CHROME-V1` (2026-08-05).  
**Scope:** FR Live Watch BWC panel look only. No roster 5×6 logic, offline isolate, or storage.

## Confirm: I understand

The **BWC online** strip is hard to read. Dark ghost-button fills + card overlay sit on a dark panel. **Stop video / Stop all / Clear** and **0/32 · 0/6 · groups** disappear into the background.

Your idea: lighten the overlay **or** drop the fill and **box with thin lines**.

## Recommendation (one pick)

**Thin line boxes. No fill overlay.**

Why: lightening a dark fill on a dark panel still fights contrast. A 1px `#475569` outline around each ghost button + brighter label text (`#e2e8f0`) matches the rest of Axiom and keeps Start watch blue as the only solid block.

Will do only on `#ax-fr-watch-list`:

- Ghost buttons: transparent fill, thin border, clearer text.
- Status numbers: brighter, no dim overlay.
- Card: keep a thin outer line; **no box-shadow / no dark wash**.

## One next APPLY

**`MOB-APPLY FR-BWC-ONLINE-THIN-CHROME-V1`**

## Operator pass

Hard-refresh once. Stop video / Stop all / Clear / 0/32 text are easy to read. Start watch still blue. Roster 5×6 unchanged.
