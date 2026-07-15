# MOB DISC — Tonight’s soak “break” vs Wi‑Fi (online check 00:50)

**Date:** 2026-07-15 ~00:50 (+08)  
**Operator:** Break while watching streaming TV; suspects Wi‑Fi restart/signal. Agent on same LAN as BWC. Can we conclude?  
**Status:** FACTS for **this soak** — discussion only  

---

## Clock (this soak)

| Event | Time |
|-------|------|
| Lab **开始点播** kk+chin | **00:15:32–35** (you said ~00:16) |
| Desk check now | **~00:50** |
| Agent / BWC / desk | Same LAN class (`192.168.1.x`, gateway `192.168.1.254` ping OK at check) |

---

## What the logs say for **this** run

| Looked for | Found after 00:15? |
|------------|---------------------|
| WVP `[收到bye]` / `[停止点播]` / `[发送BYE]` / 流注销 | **No** |
| ZLM 媒体**注销** / RTP `Server shutdown` / player `recv close` tear | **No** (only **注册** at start) |
| SIP at **00:32** | kk **注册成功** + chin **注册续订** (normal re-register) — **not** a media kill |

Streams still registered in ZLM from **00:15** through the check — **no mid-session platform tear** like last night’s 23:32.

So: if tiles went black / froze for a while while TV streamed, that lines up with **Wi‑Fi / client stall**, **not** another cam-BYE session teardown in WVP/ZLM.

---

## Can we “safely conclude”?

### For **tonight’s** felt break — **yes, Wi‑Fi/client is the best fit**

- Platform did **not** BYE / unregister media.  
- Heavy TV + BWC uplink + browser tiles on one AP = classic congestion / short radio hole → player freezes; reopen or wait recovers **without** WVP stop play.  
- Same-desk agent Wi‑Fi log did **not** show clean WLAN disconnect audit rows (often not logged) — absence of WLAN Event Viewer lines does **not** disprove a radio blip.

### For **last night’s ~23:32 mid break — do not rewrite as “only Wi‑Fi”**

That one **did** log cam **`[收到bye]`** + 媒体注销 + ~1 min hole + re-点播.  
Wi‑Fi *might* have pushed cams to tear/re-register, but the **log class is different**. Keep it as **SIP BYE class** until a soak with known bad Wi‑Fi reproduces **BYE**, not only a black tile.

---

## Product takeaway

| Symptom | Treat as |
|---------|----------|
| Black/freeze, **no** WVP BYE / no 媒体注销 | Network / player — auto-reopen + live-chase still help |
| WVP `[收到bye]` + 媒体注销 | Cam/SIP session — separate MOB |

Do **not** scrap `mob-wvp-lab-mpegts-live-chase` because of Wi‑Fi; chase helps both.  
Do **not** call last night’s BYE “solved by Wi‑Fi story” without a matching log.

Tonight soak for **BYE prove:** so far **clean of mid BYE** (~35 min in at check). Finish hour if you can; pause TV if you want a cleaner pass.

---

## One line

**Tonight’s break: logs say media never tore — Wi‑Fi/TV congestion is a safe conclusion for that feel; last night’s BYE mid-cut remains a different, logged SIP tear.**
