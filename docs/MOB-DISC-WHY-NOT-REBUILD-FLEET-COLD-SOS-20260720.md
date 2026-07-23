# MOB DISC — Why “cold SOS one-by-one” when Fleet SOS already worked? (2026-07-20)

**Type:** DISC only — no APPLY / no code  
**Your question (fair):** Cold SOS already works on Fleet, written beautifully. Why go through trouble again to test and patch one by one?

---

## Short answer

We are **not** trying to rewrite Fleet cold SOS from scratch.

Fleet SOS code is still there. What broke is **where the camera lives**.

| Then (classic Fleet gold) | Now (lab WVP live) |
|---------------------------|---------------------|
| Cam REGISTER / Alarm → Fleet SIP **:5062** | Cam REGISTER → WVP proxy **:5060** |
| Fleet hears Alarm → same beautiful `raiseDeviceAlarm` → `sos-alarm` | Fleet **never sees** that Alarm on :5062 |
| Live often Fleet INVITE | Live = WVP/ZLM picture (that’s why you kept WVP) |

So cold SOS “died” **not** because someone deleted the good Fleet SOS path.  
It died because the **cam stopped talking SOS to Fleet** when it was pointed at WVP for live.

Patching “one MOB at a time” is your **lab rule** (no silent creativity, one APPLY). It is **not** a claim that Fleet SOS was poorly written.

---

## Why it feels like “doing it all over again”

Because from the operator chair it feels like the same button.  
Under the hood it is a **different wire**:

```
BEFORE:  Chin SOS button → SIP Alarm → :5062 Fleet → dashboard  ✅ beautiful path
NOW:     Chin SOS button → SIP Alarm → :5060 WVP  → Fleet silent ❌
```

Live work pulled the cam onto **:5060**. Voice/SOS on Fleet stayed on **:5062**.  
That’s the split brain — same product face, two marriages.

---

## What we already have (so we should not rebuild Fleet SOS)

Already in ME8 (do not reinvent):

- Fleet `sip_alarm` / `deviceAlarm.raiseDeviceAlarm` → `sos-alarm` (the gold path)
- WVP webhook adapter → same `raiseDeviceAlarm` **if** Alarm is POSTed to ME8
- Invite lobotomy so SOS/live no longer starts useless Fleet video INVITE

What is **missing** is not “a new SOS product.” It is one of:

1. **Re-home cams to Fleet** for Alarm (classic) and accept live consequences, **or**  
2. **Bridge** WVP-path Alarm into the **existing** Fleet dashboard pipeline (proxy already tries; physical Alarm on wire was often missing), **or**  
3. **Dual register** / vendor companion — expensive / parked unless you order it  

None of those mean “rewrite SOS UI beautifully again.”

---

## Why not one giant “fix everything” APPLY?

Not because Fleet is bad — because:

1. Your rule: **one named MOB-APPLY**, test, then next (avoids breaking live again).  
2. Live just went PASS; bundling cold SOS+PTT+Call risks **undoing** that.  
3. Cold SOS and cold PTT may need **different** marriages (Alarm SIP vs PTT TCP 29201). One blob hides which wire failed.

If you prefer **one genre APPLY** (“make cold SOS work via bridge, touch only X”) — that’s fine. Still not “rebuild Fleet SOS.”

---

## Honest product choices (you pick; no code tonight)

| Choice | Meaning |
|--------|---------|
| **A. Classic Fleet for SOS** | Point Chin SIP back to Fleet **:5062** for Alarm (may hurt WVP-only live). Use existing Fleet SOS as-is. |
| **B. Keep WVP live, bridge Alarm** | Cam stays :5060; proxy/adapter feeds **existing** `raiseDeviceAlarm`. Prove physical Alarm appears on proxy. No new SOS banner invent. |
| **C. Park cold SOS** | Live stays; cold SOS stays Fleet-only knowledge until you remarrry. |

“One by one” only means: pick A or B and one APPLY — **reuse Fleet SOS**, don’t redesign it.

---

## Bottom line

**Why the trouble?** Because live migration moved the cam’s SIP home.  
**Why not rewrite Fleet SOS?** We shouldn’t — it’s already the target.  
**What next work really is:** remarrry or bridge the **wire**, then the same beautiful Fleet dashboard path lights up again.

Reply which wire you want: **`SOS: remarrry Fleet :5062`** or **`SOS: bridge stay WVP :5060`** or **`park`**.

**No code in this DISC.**
