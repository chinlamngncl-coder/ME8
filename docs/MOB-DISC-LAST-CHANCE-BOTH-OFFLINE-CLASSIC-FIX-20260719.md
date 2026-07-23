# MOB DISC — Last chance · both offline · what broke · fix

**Date:** 2026-07-19  
**Status:** FIXED in `.env` — you rekey + restart  
**Ask:** Chin not on platform · kk connected · both offline on Ops · mess again

---

## Why (plain)

| Fact | Meaning |
|------|---------|
| Lab had `FM_LAB_WVP=1` + **presence paint** | Ops green was often **fake** |
| Cams talking **`:5060`** (WVP proxy) | REGISTER goes to WVP, **not** Fleet `:5062` |
| Ops online needs Fleet `register ok` when presence=0 | No Fleet REGISTER → **both grey** |
| Chin “not on platform” | Failed WVP marriage |
| kk “connected” on cam | Cam UI to WVP — **still** not Fleet online |

Agent mixed WVP picture mode with Ops dots. That broke trust.

---

## Fix applied (env)

`FM_LAB_WVP=0` · thin clear · **`FM_WVP_FLEET_PRESENCE=0`**  
→ real Fleet REGISTER only. No paint.

---

## BOTH cams — key this (classic)

| | |
|--|--|
| IP | `192.168.1.38` |
| Port | **`5062`** |
| Platform | `34020000002000000001` |
| Domain | `3402000000` |
| Password | `12345678` |

Same on **Chin and kk**. Save → reboot both.

---

## Next (you)

1. Key both cams table above  
2. `RESTART-FLEET.bat`  
3. Wait 1–2 min  
4. `localhost:3988` — both green?  
5. Say **`both-online`** or **`still-grey`**

WVP/ZLM picture = **later** named APPLY only after both-online.

**One line:** Presence+WVP mix made fake/missing online; classic env on; both cams → `192.168.1.38:5062` Fleet platform → restart → report.
