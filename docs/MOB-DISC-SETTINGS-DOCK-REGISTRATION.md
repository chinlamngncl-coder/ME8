# MOB-DISC — Settings: dock registration (reuse Evidence form)

**Date:** 2026-08-17  
**APPLY:** `MOB-APPLY SETTINGS-DOCK-REGISTRATION`  
**Scope:** `#ss-panel-docks` + bind existing `#ev-dock-dialog` / `POST|PUT /api/docks`. No new API. No SHA-256. Do not remove Evidence Register or bay monitor.

## Locked

Settings → Fleet → Docking stations was only “Open Evidence → Storage”. Registration already lives in `#ev-dock-dialog` (name, branch, model, bay 1/8/24, optional IP).

APPLY:
1. `#ss-dock-register` opens that same dialog (`openDockForm`). Keep every `ev-dock-*` id.
2. `#ss-docks-list` shows registered docks (same `/api/docks` cache). Row click = edit in the same dialog.
3. Keep `#ss-fleet-docks-storage`. Keep Evidence `#ev-dock-add`.

Do **not** invent `/api/docking-stations` or a second form with duplicate ids.

## Locked 2026-08-17 — in-page (supersedes modal)

Settings forms stay **in-page**. Never a floating modal / overlay / nested grey card for dock register.

- `#ev-dock-dialog` lives inside `#ss-panel-docks`. Same 2-column `ss-east-west-grid enterprise-form-grid` and input tokens as Network (IP Assignment).
- **No full-bleed inputs.** Address and Case Notes are normal grid cells with the same max-width cap as Network. The page **may scroll**.
- Save = `btn-primary`. Cancel = outlined `btn-ghost`.
- Register hides list (`#ss-docks-list-view`); Cancel/Save restores it. Keep every `ev-dock-*` id. No new API.

