# MOB-APPLIED — GB-PRIVATE-EXTENSIONS-WITH-KILLSWITCH-V2

**Date:** 2026-07-23  
**Status:** **FAIL** (operator) → **ROLLED BACK** to `ec0296d`  
**Rollback APPLY:** `MOB-APPLY ROLLBACK-GB-PRIVATE-EXTENSIONS-V2-TO-CHECKPOINT`  
**Rollback record:** `MOB-APPLIED-ROLLBACK-GB-PRIVATE-EXTENSIONS-V2-20260723.md`

## Phase 1 — Checkpoint

```
ec0296d auto-backup: checkpoint before private SIP/UDP extensions
```

Rollback: restore that commit if private paths destabilize.

## Phase 2 — Kill switch

| Item | Value |
|------|--------|
| Env | `FM_ENABLE_PRIVATE_BWC_EXTENSIONS` |
| Default | **ON** (`1`) — keeps current SOS/PTT lab behavior |
| OFF | `0` / `false` / `off` — restart server |
| Module | `lib/privateBwcExtensions.js` |

**OFF does not touch** GB28181 INVITE / live video.

## Phase 3 — What the switch gates

When **ON** (existing product paths, now explicitly gated):

1. **SOS** — SIP MESSAGE `Notify` / `<CmdType>Alarm</CmdType>` (+ MANSCDP content-type check) → `raiseDeviceAlarm` → dashboard `sos-alarm` + alias `sos_alert`  
2. **PTT group** — register / `ReqGroupTalkList` / refresh → group MESSAGE (`status=1`, gtid/ip/port) so device PTT enables  
3. **PTT talk cue** — TCP PTT path `dwCMD` 130/4 → `ptt-rx-state` / `ptt_state` (~800ms idle clear)

When **OFF**: those three bypass; video/GB INVITE continues.

## Operator how to kill-switch

In `.env`:

```
FM_ENABLE_PRIVATE_BWC_EXTENSIONS=0
```

Restart Fleet server. Video should still work; proprietary SOS/PTT group/talk-cue paths stay quiet.

To restore: set `=1`, restart.

## Verify

```bash
npm run verify:private-bwc-ext
```

## Note

This MOB **gates** the private stack already in the tree (not a greenfield rewrite). INVITE/video paths were not rewritten.
