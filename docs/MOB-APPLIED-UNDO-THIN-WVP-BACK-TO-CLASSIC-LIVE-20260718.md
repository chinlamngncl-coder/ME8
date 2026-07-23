# MOB APPLIED — undo-thin-wvp-back-to-classic-live

**Date:** 2026-07-18  
**APPLY:** `MOB-APPLY undo-thin-wvp-back-to-classic-live`

---

## Were we already back?

**No.** Before this APPLY, `.env` still had `FM_LAB_WVP=1` + `FM_WVP_THIN_CAMS=…0008`.  
Paper discs proposed undo; env was **not** flipped until now.

---

## Rekey BWC?

**No — not for this MOB.**  
Chin was already **online** on Fleet `:5062`. Undo only turns lab WVP thin path off so Fleet INVITE works again.

Do **not** rekey unless after restart live is still dead — then say so (don’t flip platform “just in case”).

---

## What changed

| | |
|--|--|
| `FM_LAB_WVP` | `0` |
| `FM_WVP_THIN_CAMS` | empty |
| Soft Open-only / presence | stay `0` |
| Broker/server code | left in tree; **inert** when lab WVP=0 |

---

## You do

1. **`RESTART-FLEET.bat`**  
2. Wait ~15s  
3. **`http://localhost:3988`**  
4. Open Chin live  
5. Say **`classic-live-ok`** or **`still-dead`**

**One line:** Not already undone until this APPLY; no rekey; restart → test Chin live.
