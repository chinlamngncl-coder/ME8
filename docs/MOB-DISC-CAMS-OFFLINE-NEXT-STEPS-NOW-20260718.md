# MOB DISC — Cams offline · next steps NOW (no more flip-flop)

**Date:** 2026-07-18 ~01:16  
**Status:** Operator action path — paper only  
**Ask:** “Then what? Wait for god? No next step?”

**Prior apology stays:** `MOB-DISC-AGENT-FUCKUP-PLATFORM-FLIP-APOLOGY-20260718.md`  
This disc adds **what to do next** without inventing a third platform story.

---

## What log already proved

| Fact | Meaning |
|------|---------|
| Dashboard **UP** | Not a “Fleet dead” problem |
| No Fleet `register ok` since ~01:00 | Map stays grey |
| Proxy still patches WVP hosts | Cams are still talking **`:5060` / WVP** |
| Classic PASS | Chin was on Fleet **`:5062`** with Soft Open off |

So: server is fine. Cams are on the **wrong SIP door** for classic online (or stuck and not re-registering to Fleet).

---

## Next step (one fork — you look at Chin once)

Open **Chin** SIP / platform screen. Look at **Port** only. Then do **exactly one** branch.

### Branch A — Port shows **5062**

Cam is aimed at Fleet. Do **not** change platform id/password.

1. Power Chin off → 10s → on  
2. Wait 90 seconds  
3. Refresh `http://localhost:3988`  
4. Reply: **green** or **still grey**

If still grey after that → say so; next is log dig for REGISTER reject (auth), not another key lecture.

### Branch B — Port shows **5060** (or blank / 5061)

Cam is aimed at **WVP**, not Fleet. With `FM_WVP_FLEET_PRESENCE=0`, Ops will **stay grey**. That matches the log.

**For classic Ops online (tonight’s floor):** change **port only** to **`5062`**.  
IP stays **`192.168.1.38`**.  
**Do not** change platform/password unless the cam refuses to register after port+reboot (then we check log together).

1. Set port → **5062** · Save  
2. Reboot Chin  
3. Wait 90 seconds · refresh localhost Ops  
4. Reply: **green** or **still grey**

Same for kk after Chin is decided.

---

## What we are **not** doing now

| Stop | Why |
|------|-----|
| New WVP `440102` / `admin123` lecture | That is WVP video path — later APPLY |
| Ordering a full platform rewrite “because I said so” | Already burned you once |
| Restart WVP to fix Fleet dots | Wrong layer |
| Soft Open / `FM_LAB_WVP=1` | Frozen / not this fire |

---

## If both branches fail (you say still grey)

Then **one** of these — you pick:

| You say | Meaning |
|---------|---------|
| `check log register reject` | Agent reads Fleet log for 401/403/auth fail — **no** rekey order until proof |
| `MOB-APPLY presence-from-wvp-temp` | Paint online from WVP (lab crutch; not classic pure) |
| `RUN RESTORE-ME8-CLASSIC-PASS-20260718` | Nuclear floor restore (you type it) |

---

## You do in the next 3 minutes

1. Look at Chin **port**.  
2. Do **Branch A** or **Branch B** above.  
3. Tell me one word: **5062-green** / **5062-grey** / **was-5060-now-trying** / **still-grey**.

**One line:** Don’t wait for god — look at Chin port: 5062 → reboot only; 5060 → port to 5062 then reboot; report green/grey; no platform sermon.
