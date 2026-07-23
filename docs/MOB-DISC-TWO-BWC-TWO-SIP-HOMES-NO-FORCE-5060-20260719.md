# MOB DISC — Two BWCs, two SIP homes (5060 vs 5062) · do NOT force one platform (NO APPLY)

**Status:** DISC only — 2026-07-19 · **no code for SIP / BWC rekey**  
**Subject:** `MOB-DISC-TWO-BWC-TWO-SIP-HOMES-NO-FORCE-5060`  
**Operator ask:** “I have 2 BWC — one 5060, one 5062, different platforms. Why only report 1? Do you want me to change the other to 5060?”

---

## Direct answer

**No. Do not change your other BWC to 5060 just because an agent “reported one cam.”**  
You are **not** required to put both devices on one port / one platform ID to make the desk “look clean.”

Two SIP homes on this lab PC is **intentional architecture** (messy to operate, but designed):

| Port | Owner on PC | What that BWC is married to |
|------|-------------|-----------------------------|
| **5060** | **WVP** (GB video SIP) | Live picture path → WVP startPlay → ZLM FLV |
| **5062** | **Fleet / ME8 Node** (YDT / telemetry / classic invite) | SOS pull, classic Fleet live, some PTT/GPS paths |

`.env` already says this:

- `FM_WVP_SIP_PORT=5060`
- `FM_GB28181_SIP_PORT=5062` (Fleet listen)

So **Chin on 5060 + kk on 5062** (or reverse) is a **lab split**, not “you misconfigured and must unify.”

---

## Why agents sound like there is “only one BWC”

Usually one of these — **not** “delete the second cam”:

1. **Log slice bias** — agent grepped one `camId` (e.g. only `…00009`) while proving ZLM-watch / Call. The other cam was simply not in that log window.
2. **Path bias** — ZLM/WVP path only “sees” cams registered on **WVP :5060**. Fleet-only cam on **:5062** won’t show as WVP-ZLM primary; agent talks about the one that has picture.
3. **Fleet online bias** — classic SOS/PTT “online” often needs REGISTER on **Fleet :5062**. A cam only on WVP :5060 can play ZLM yet look “half dead” for Call/PTT until watch-register / PTT channel is healthy.
4. **Bad past discs** — some older docs told “rekey both to 5062” or “keep both on 5060” for a **single** experiment. Those were **genre-specific**, not a forever rule to erase your second platform.

**None of that means you must re-point the second BWC to 5060 today.**

---

## What “works” depends on which home the cam is on

| Need | Cam on WVP **5060** | Cam on Fleet **5062** |
|------|---------------------|------------------------|
| Soft / ZLM wall picture | Natural home | Often weak / no WVP session |
| Classic Fleet INVITE live | Often 408 / wrong brain | Natural home |
| Cold SOS / Fleet contact | Weak unless mirrored | Stronger |
| Call/PTT after ZLM-watch APPLY | Needs watch ref + PTT online | Needs Fleet+PTT path |

**Dual-home lab cost:** you will see **asymmetric** behaviour between the two BWCs. That is the mess — not proof you must merge platforms.

---

## What we will not do in this DISC

- Dictate “change BWC X to 5060”
- Dictate “change BWC Y to 5062”
- Pretend one log line about one `camId` = only one device exists
- Uninstall / rename Windows services in this paper

---

## Related APPLY (separate — already ordered)

**`MOB-APPLY-ZLM-WATCH-NO-UNREGISTER-ON-REMOUNT`** = Call unlock race fix only (frontend watch ref).  
Does **not** require SIP rekey. Does **not** collapse your two platforms.

---

## If you ever want one platform (optional, later)

That is a **named architecture genre** (you choose), e.g. all cams → WVP 5060 **or** all → Fleet 5062 — **your** order, with a real MOB name.  
Until then: **keep both BWCs as they are.**

---

## Status

**DISC only for SIP/platform.**  
**Answer:** two BWCs / two ports is allowed; agents must stop implying “only one cam” or “move everything to 5060.”
