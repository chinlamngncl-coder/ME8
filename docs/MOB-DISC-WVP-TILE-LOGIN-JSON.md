# MOB DISC — Logged in but test-wvp-tile still JSON / can’t play

**Status:** talk only — **no apply**  
**Date:** 2026-07-14  
**Search:** `test-wvp-tile JSON.parse`, `already logged in`

---

## What is NOT wrong

- Device ID `34020000001329000009` — fine  
- Platform ID — fine (kk already online on WVP; Play works **server-side**)  
- Your Fleet password login — not the GB problem  

So this is **not** “fix the cam again.”

---

## What the error really means

`JSON.parse: unexpected character…` = the browser asked for an **API** (`/api/lab/wvp/...`) and got **HTML** (almost always a **login page** or other HTML), then tried to read it as JSON.

That can happen **even when you feel logged in**, if:

1. **Two different hosts** — cookie does not follow you  
   - Login on `http://192.168.1.38:3988`  
   - Tile open on `http://127.0.0.1:3988` (or the reverse)  
   → browser treats them as different sites. Dashboard looks logged in on one; tile API on the other has **no** session → returns login HTML → JSON.parse blows up.

2. **Page open, then re-login in another tab** after Fleet restart — old tile tab still talking without a cookie that this server knows (sessions are in RAM; restart = old cookie dead).

3. **Hard-refresh never picked up** the clearer error text — still shows the cryptic Firefox line.

---

## Bench facts (read-only check)

| Check | Result |
|--------|--------|
| WVP Play for kk from Node | **Works** (FLV URL returned) |
| Fleet has WVP lab routes | **Yes** (log: `wvp lab routes enabled`) |
| Unauthenticated API | **401 JSON** (not HTML) |
| Unauthenticated `test-wvp-tile.html` | **Redirect to login.html** |
| Cookie | `fm_session` on `Path=/` — **bound to host** |

So: system path is OK; mismatch is almost certainly **browser host / session**, not GB IDs.

---

## What you should do (no apply)

1. Use **one host only**: `http://192.168.1.38:3988` (not 127.0.0.1).  
2. Close all Fleet tabs.  
3. Login again on that host.  
4. Open  
   `http://192.168.1.38:3988/test-wvp-tile.html`  
   (type it; don’t use an old 127 bookmark).  
5. Hard refresh (Ctrl+F5).  
6. Click Refresh devices → Play.

If the log then says **“Got login page…”** → still a cookie/host issue.  
If it lists `[ON] …0009` then Play fails with a **Chinese/English WVP message** → that is a real play error (we can fix next).  
If still cryptic JSON.parse → tell me whether the address bar is **192.168.1.38** or **127.0.0.1**.

---

## Later fix (when you say APPLY)

Make the lab page: show host + “session ok/fail” first; or serve the tile from inside the main dashboard so one cookie only. Not today.

---

## Forbidden for now

Do not change platform ID / device ID again for this error.  
Do not stuff this into the wall.
