# MOB DISC — 5061 plain: do **not** change BWC · start test now

**Status:** LOCKED 2026-07-17 ~00:29  
**Search:** `what does 5061 mean`, `change port on bwc`, `nagging`, `start our test`  
**Also:** `MOB-DISC-NO-DICTATE-CHANGE-5060.md` · `MOB-DISC-OPERATOR-PLAIN-WVP-5061-NOT-YOUR-JOB.md`

---

## Confirm (operator)

| Question | Answer |
|----------|--------|
| Do I need to change port on BWC? | **NO.** Keep Fleet SIP **5060**. |
| Is “cams must answer WVP SIP 5061” your homework? | **NO.** Agent lab fact — **not** a BWC rewrite order. |
| Can we start the test now? | **YES.** Soft open as usual (Open All / wall). Pass/fail from picture + agent log. |

---

## What “5061” means (one breath)

| Port | Who | Your job |
|------|-----|----------|
| **5060** | Fleet (daily Mobility Axiom / cams register here) | **Keep** |
| **5061** | WVP lab SIP on the **PC** (Docker maps host 5061 → WVP) | **Not yours** — agent/server |

“devicesOnline: 0 on WVP” = WVP’s own device list is empty because cams talk to **Fleet**, not because you forgot a button.  
Agent must **not** convert that into “go change every BWC to 5061.”

If Plan A still needs a **one-cam lab** register to WVP someday — that is a **named plan you choose**. Never silent fleet rewrite.

---

## Why agent kept saying it (and must stop)

After media-online, selfcheck still showed `devicesOnline: 0`. Agent repeated “5061” as the next blocker.  

**Wrong for you:** sounds like nagging homework.  
**Right for agent:** fix product / stack so soft path works **with cams on 5060**, or only ask for a **one-cam lab** if you explicitly agree.

**Locked:** Do not open every reply with “cams must answer 5061.”

---

## Start test now (plain)

1. Cams stay **5060** (no BWC port change).  
2. Soft open wall / Open All as usual.  
3. Agent checks log (you don’t hunt Docker):
   - Hope: **`live broker wvp-zlm primary`** (Plan A)  
   - Or fail-open: **`zlm-relay primary`** / Fleet picture (ops not black)  
   - Media-online PASS already: should **not** be stuck on **未找到可用的zlm** alone  
4. You say **pass/fail** from what you see.

No Fleet restart required just for “I changed BWC” — you didn’t. Restart only if agent says after a code MOB.

---

## One line

**Do not change BWC port. 5061 = WVP lab on PC, not your homework. Start soft-open test now on 5060.**
