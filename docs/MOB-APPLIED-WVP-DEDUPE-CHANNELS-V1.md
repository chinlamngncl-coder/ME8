# MOB-APPLIED: mob-wvp-dedupe-channels-v1

**Date:** 2026-07-17  
**Status:** APPLIED  

## Done

1. SQL: `DELETE FROM wvp_device_channel WHERE gb_device_id IS NULL OR gb_device_id = '';` → **DELETE 2**  
2. Now **1 channel per cam** (ids 2 and 4).  
3. `lib/wvpDbLanPatch.js` — delete empty-gb phantoms; UPDATE existing row; INSERT only if **no** row for `device_id`.

## Prove

`listChannels` → `total: 1` per device.  
`startPlay` no longer returns `TooManyResultsException`.

## One line

**Duplicate WVP channels removed — startPlay selectOne unblocked.**
