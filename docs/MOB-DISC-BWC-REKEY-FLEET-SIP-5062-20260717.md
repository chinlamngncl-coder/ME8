# MOB DISC — BWC rekey to Fleet SIP **5062** · nothing works (cold SOS/PTT/live)

**Date:** 2026-07-17  
**Status:** DISC — paper only — **no BWC typing / no env change until you APPLY**  
**Ask:** Plan rekey + test. Right now **nothing** works: cold SOS, PTT, cold PTT, live wall, call.

---

## Honest status (now)

| Symptom | Why (lab fact) |
|---------|----------------|
| Live / call feels WVP or dead | Cams REGISTER only to **`:5060` → WVP**. Fleet never owns the video call |
| Cold SOS / SOS dead | SOS pull needs Fleet SIP contact — cams not on Fleet **`:5062`** |
| PTT / cold PTT dead or useless | PTT wake may send, but voice/session path expects Fleet-registered cam |
| “Online” may still show | Fake comfort: **WVP presence** paints online — not Fleet REGISTER |

Log still: contacts = `192.168.1.131` / `.132` via **5060 proxy**.  
Fleet listens **5062**. Soft Open UI storm files already restored (markers gone).  
**Root problem = SIP target on the cam, not dashboard IP.**

Dashboard stays: `http://192.168.1.38:3988`  
Server IP stays: **`192.168.1.38`** (never 172.x)

---

## What this MOB is about

**Path B:** Point Chin + kk SIP **server port** to Fleet **5062** so classic live / SOS / PTT can work again.

This **undoes** the Soft Open “one-row only 5060→WVP” setup for daily ops.

| Before (broken for classic) | After (goal) |
|-----------------------------|--------------|
| Cam SIP port **5060** → WVP | Cam SIP port **5062** → Fleet Node |
| Online from WVP poll | Online from real Fleet REGISTER |
| Live prefers WVP/ZLM | Live = classic Fleet INVITE / JSMpeg |

**Trade-off:** Soft Open / WVP GB picture on those cams stops until a later clean dual-path MVP. That is OK — you asked for functions first.

---

## What you type on each BWC (when APPLY says go)

Do **one cam first** (Chin), then kk.

| Field | Value |
|-------|--------|
| Server / SIP server IP | `192.168.1.38` |
| SIP / server **port** | **`5062`** (change from 5060) |
| Platform / device ID / password | **unchanged** (same as now) |
| Do **not** set | Any `172.x` address |

Save → reboot cam or re-register → wait until Fleet log shows REGISTER / online **from SIP**, not only “from wvp presence”.

---

## PC / env changes (agent does only after named APPLY — not yet)

After cams are on 5062 and you confirm REGISTER:

Suggested follow-up APPLY (separate):

```text
MOB-APPLY classic-fleet-after-bwc-5062
```

That APPLY would (proposed — not done now):

1. `FM_LAB_WVP=0`  
2. `FM_WVP_FLEET_PRESENCE=0`  
3. Keep `FM_SOFTOPEN_WVP_ONLY=0`  
4. Restart Fleet  
5. Leave WVP docker stopped **or** running but unused for these cams  

**Do not** do that env flip **before** cams rekey — you would lose the fake online and still have no Fleet REGISTER.

---

## Test plan (doesn’t work at all → prove step by step)

### Phase 0 — Before any cam change (baseline)

You already know: cold SOS, PTT, live, call = **FAIL**.  
Agent: after rekey we compare.

### Phase 1 — Rekey **Chin only** (`…0008`)

1. On Chin: SIP port **5062**, IP `192.168.1.38`.  
2. Save / reboot Chin.  
3. Wait up to **2 minutes**.  
4. Agent checks log for Chin REGISTER to Fleet **5062** (you say when cam saved).  
5. Dashboard: Chin online?  

| # | Test | Pass look |
|---|------|-----------|
| T1 | Chin online (real) | Online without only WVP presence |
| T2 | Live wall Chin | Picture via **Fleet** (not Soft Open resolution jump) |
| T3 | Stop live | Stops clean |
| T4 | Cold PTT Chin | You hear / cam reacts |
| T5 | PTT while idle | Works |
| T6 | Cold SOS Chin | Banner / ledger / map react |
| T7 | SOS while live (if T2 pass) | Not freeze whole desk |

**Stop if T1–T2 fail** — do not rekey kk yet. Tell agent FAIL + which T#.

### Phase 2 — Rekey **kk** (`…0009`) — only if Phase 1 PASS

Same table for kk. Then both:

| # | Test | Pass look |
|---|------|-----------|
| T8 | Both online | Both |
| T9 | Open both live | Both wall |
| T10 | PTT each | Both |
| T11 | Cold SOS each | Both |
| T12 | Redact still opens | Seeta UI still there (git keep) |

### Phase 3 — Env classic (only after Phase 2 PASS)

You paste: `MOB-APPLY classic-fleet-after-bwc-5062`  
Then re-run T8–T12 once.

---

## Order (you never guess)

| Step | You paste / do |
|------|----------------|
| 1 | Read this disc (now) |
| 2 | Say **go Chin** or `MOB-APPLY bwc-rekey-chin-5062-operator` when ready to type Chin |
| 3 | You type Chin → tell agent **Chin saved** |
| 4 | Agent checks log → you run T1–T7 → **PASS/FAIL** |
| 5 | If PASS → same for kk |
| 6 | If both PASS → `MOB-APPLY classic-fleet-after-bwc-5062` |

**Agent does not touch BWC menus.** You type. Agent owns log check + env APPLY after.

---

## Forbidden

- Rekey both cams before Chin proves T1–T2  
- Change server IP to 172.x  
- Gold / Pre-Gate wipe  
- Soft Open UI patches again  
- Turning `FM_LAB_WVP=0` before Fleet sees REGISTER on 5062  

---

## One line

**Nothing works because cams still SIP to WVP :5060 while Fleet is on :5062 — rekey one cam to 5062, prove live/SOS/PTT, then the other, then env classic; no freestyle.**
