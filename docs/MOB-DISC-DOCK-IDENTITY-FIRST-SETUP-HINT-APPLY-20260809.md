# MOB DISC — DOCK-IDENTITY-FIRST-SETUP-HINT-V1 APPLY (2026-08-09)

**Status:** APPLIED.  
**APPLY:** `MOB-APPLY DOCK-IDENTITY-FIRST-SETUP-HINT-V1`

## Where Serial is (operator)

**Settings → BWCs** → table column **Serial** (after Officer). Sticker / asset tag. Save the BWC list after edit. Not on alerts.

## What landed

| Piece | Behavior |
|-------|----------|
| Evidence → Storage | Super admin only: checklist when any BWC has empty serial and not acked (or remind-next-login) |
| Open BWCs | Jumps to Settings → BWCs |
| I’ve done this | `dockIdentity.setupAckAt` in server settings |
| Remind next login | Hide this browser session; show again next login |
| Copy | Serial language only — no banned OEM product names |

## Files

- `lib/serverSettings.js` — `dockIdentity` normalize
- `server.js` — `GET/POST /api/dock-identity-setup`
- `public/js/dock-identity-setup.js`
- `public/index.html` — banner in `#ev-panel-settings`
- `public/js/evidence-hub.js` — `DockIdentitySetup.onShow` on Storage
- `public/css/global.css` — banner layout
- `public/locales/en.json` — `dockIdentity.*`

## Operator check

1. Restart Fleet once.
2. Super admin → Evidence → Storage.
3. If cameras lack Serial → checklist visible.
4. Open BWCs → Serial column; fill; Save.
5. I’ve done this → checklist gone.
