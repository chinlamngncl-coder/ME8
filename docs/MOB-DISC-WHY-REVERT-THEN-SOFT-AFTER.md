# MOB DISC — Why revert, then soft-after (not ping-pong for fun)

**Status:** LOCKED 2026-07-16  
**Search:** `why revert`, `fallback again`, `waste time`, `soft after ffmpeg`

---

## Baby picture

1. **Fleet invite first** → you get a picture (JSMpeg).  
2. **Then** try WVP-ZLM on top (soft).  
3. If ZLM works → you see ZLM (log: `live broker wvp-zlm primary`).  
4. If ZLM fails → **picture stays** (Fleet). No black wait.

That is **fail-open**.  
The failed MOB did step 2 **before** step 1 → black / hang → **revert**.

---

## Not a joke cycle

| Bad | Good |
|-----|------|
| Block invite for ZLM forever | Invite first |
| Hide FFmpeg soaks as “ZLM” | Log proof only |
| Park = abandon scale | Park invite-hold only; wire soft-after |

---

## One line

**Revert undid invite-hold. Soft-after puts ZLM back without stealing your picture.**
