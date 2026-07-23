# MOB DISC — Soft Open: cam called, still black + ghost patch + can’t stop (2026-07-17 ~17:05)

**Status:** FAIL locked for **picture / UI / stop** · paper only · **no APPLY**  
**Operator screenshot:** Chin + kk pins show **Live streaming…** (black) · wall **Player error** · dark empty **patch** behind Chin pin · **Stop live** does not clear cam video feel.

---

## Plain English (what you saw)

| # | What you see | Meaning |
|---|--------------|---------|
| 1 | BWC “called” / busy with live | Soft Open **did** reach the cam |
| 2 | Pin + wall stay black · “Live streaming…” · **Player error** | Dashboard **did not show** the picture |
| 3 | Grey/black **patch** behind Chin pin | Broken / empty video box left on the map (ghost UI) |
| 4 | **Stop live** doesn’t feel like it turns cam off | UI stop may not tear down the **WVP** play session on the cam |

---

## What the log proves (honest)

### SIP path = PASS (NAT MOB worked)

Proxy (~17:04):

```
INVITE forwarded to BWC  → 192.168.1.131:59525   (Chin REGISTER peer — not :46133)
200 OK from cam → WVP
INVITE forwarded to BWC  → 192.168.1.132:41645   (kk)
200 OK from cam → WVP
```

Fleet:

```
live broker wvp-zlm primary   (Chin + kk)
```

So: **cam answered**, WVP said play OK and gave an FLV URL.  
**This is no longer “INVITE to wrong port.”**

### Picture on dashboard = FAIL

Operator: black + **Player error**.  
Server already claimed `wvp-zlm primary` — so the break is now:

**browser / Soft Open player attach** (mpegts / FLV overlay), **not** “cam silent.”

### Stop = half-broken

Dashboard did log `stop-video from dashboard` for Chin/kk.  
Later proxy also saw **BYE** + cam **200 OK** (session teardown from WVP side).  
But Soft Open is **WVP-only** now — if Stop live only clears Fleet/JSMpeg and **does not** always call WVP stop, the cam can stay in live until WVP BYE/timeout. Matches “I can’t off the video from BWC.”

---

## Three problems (name them)

| ID | Problem | Genre |
|----|---------|--------|
| A | Soft Open primary FLV not painting (Player error / black) | Live / Soft Open player |
| B | Ghost dark **patch** behind map pin | Pin UI (empty video host / overlay) |
| C | **Stop live** does not reliably stop WVP play on BWC | Soft Open stop / WVP BYE |

Do **not** mix these into one random code thrash. One MOB at a time after you APPLY.

---

## Ask Google (copy)

```
NAT INVITE fix PASS: Soft Open INVITE hits REGISTER peer; cam returns 200 OK; fleet.log shows live broker wvp-zlm primary (FLV URL returned).

Operator FAIL:
1) Dashboard pin + wall stay black / "Live streaming..." / "Player error" — no picture
2) Ghost empty dark rectangle behind map pin popup
3) Stop live does not reliably end BWC live (WVP Soft Open path)

Stack: Soft Open is WVP-only (no Fleet SIP INVITE). Player = soft ZLM/mpegts overlay on wall/pin.

Need named next MOB(s):
A) Why wvp-zlm primary FLV fails in browser Soft Open attach (Player error) while startPlay+200 OK succeeded?
B) Tear down ghost pin video host / overlay on fail and on Stop
C) Soft Open Stop live must call WVP stop/BYE so BWC leaves live

Do not change BWC server IP. One MOB at a time.
```

---

## What now (you)

1. Paste the Google block above (or this whole disc).  
2. Wait for **named** MOB(s).  
3. Say `MOB-APPLY …` one at a time.

**Optional hard stop on cam now:** power-cycle BWC or wait for session timeout — not a product fix.

---

## One line

**SIP/NAT PASS (200 OK + wvp-zlm primary) — picture still FAIL (Player error) + ghost pin patch + Stop may not kill WVP on cam.**
