# MOB-APPLIED — mob-wvp-lab-jwt-auth

**Date:** 2026-07-14  
**Status:** APPLIED — proven: login JWT + 2 online devices

## Fix (`lib/wvpLabClient.js`)

1. Send WVP 2.7 `access-token` JWT (not Cookie-only)  
2. Read device/channel lists from `data.total` / `data.list`  
3. Map `onLine` → online; channelId fallback = deviceId  

## You

1. Restart Fleet  
2. Refresh → Lab WVP tiles (no red fail / no 请登录)  
3. Pick cams → Play A/B  
