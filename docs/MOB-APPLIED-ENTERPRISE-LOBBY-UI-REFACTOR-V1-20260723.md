# MOB-APPLIED — ENTERPRISE-LOBBY-UI-REFACTOR-V1

**Date:** 2026-07-23  
**APPLY:** `MOB-EXECUTE-ENTERPRISE-LOBBY-UI-REFACTOR-V1`  
**Scope:** Video Conference **Live** lobby layout only (CSS/HTML structure + roster render). Join Room routing unchanged.

## What changed

1. **Two-column grid** (`2fr 1fr`, gap 24px) below Live / Recordings / Settings:
   - **Left:** room cards + Join Room + Host Tools
   - **Right:** Active Personnel side panel
2. **Room cards** replace pill buttons — name + Active (green) / Idle (grey) badge; selected elevation.
3. **Join Room** (`#vc-enter-room`) stays the same handler (`enterRoom` → `joinRoom`); only placement/styling.
4. **Active Personnel:** dispatch groups as accordion; officers as flex rows (dot · name · truncated ID); **Who can join** operators accordion with host **Invite** → existing `/guest` API.
5. In-meeting: side panel hides; stage still full-width (unchanged meeting path).

## Files

| File | Change |
|------|--------|
| `public/index.html` | Lobby dashboard markup + CSS |
| `public/js/conference-hub.js` | Room cards + personnel roster + invite bind |
| `public/js/vc-lazy.js` | cache bust hub |
| `public/locales/*.json` | `personnelTitle`, `whoCanJoin`, `invite`, `inviteFailed` |

**Cache:** `vc-lazy.js?v=20260723-enterprise-lobby-ui-v1` → hub `?v=20260723-enterprise-lobby-ui-v1`

## Not touched

- Join / start / token / LiveKit connect logic
- Global top nav / dark palette tokens
- Recordings / Settings panels (except shared CSS namespace)

## Operator verify

1. **Ctrl+F5** → Video Conference → **Live**
2. Expect side-by-side: room cards left, personnel right
3. Select a room → **Join Room** still joins (same as before)
4. Host: open **Who can join** → **Invite** when room is Active

**PASS / FAIL:** _(operator)_
