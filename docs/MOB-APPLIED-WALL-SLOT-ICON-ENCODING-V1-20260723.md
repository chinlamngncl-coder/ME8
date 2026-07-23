# MOB APPLIED — WALL-SLOT-ICON-ENCODING-V1

**Date:** 2026-07-23  
**Phrase:** `MOB-APPLY WALL-SLOT-ICON-ENCODING-V1`  
**Disc:** `docs/MOB-DISC-SNAPSHOT-143-ACK408-AND-WALL-ICON-MOJIBAKE-20260723.md`

## What changed

### `public/index.html`
Video panel slot builders (and map-pin mute in the same file) now use ASCII-safe escapes:

| Control | Was (mojibake) | Now |
|---------|----------------|-----|
| Play | `â–¶` | `\u25B6` (▶) |
| Listen | `ðŸ”‡` | `\uD83D\uDD07` (🔇) |
| Call | `ðŸ“ž` | `\uD83D\uDCDE` (📞) |
| Stop | `â– ` | `\u25A0` (■) |
| Map pin mute | same rot | `\uD83D\uDD07` |
| Wall collapse chevron | `â–¶` | `&#9654;` |

PTT label text unchanged. Vid Popout label unchanged (i18n).

### `public/js/video-wall.js`
Listen/mute toggle textContent hardened to the same `\u` escapes (won’t rot on UTF-8 save).

## Out of scope
Full `index.html` mojibake sweep (Settings copy, etc.). Snapshot SIP retransmit MOB.

## Operator verify
1. Ctrl+F5 (no Fleet restart required for UI-only).
2. Panels 1–5: Play = ▶, Stop = ■, listen = speaker/mute emoji (not `â–¶` / `ðŸ`).
3. PTT still appears only when that slot is live (unchanged).

**PASS** = icons look normal. **FAIL** = still garbage.
