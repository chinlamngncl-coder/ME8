# MOB DISC — Prevention who/how + “who programmed the storm without permission?”

**Date:** 2026-07-23  
**Status:** LOCKED — explains prevention; pairs with Cursor rule APPLY  
**Related:**  
- PASS fix: `MOB-APPLIED-DEVICE-CONTROL-SIP-NO-RETRANSMIT-STORM-V1-20260723.md`  
- Prevention checklist: `MOB-DISC-DEVICE-CONTROL-NEVER-RETRANSMIT-STORM-PREVENTION-20260723.md`  
- Cursor rule: `.cursor/rules/me8-device-control-once.mdc`

---

## Your questions (plain English)

### 1) How do we do prevention?

| Layer | What it is | Who enforces it |
|-------|------------|-----------------|
| **A. Code** | `lib/deviceControl.js` default = **`udp_once`** (one UDP datagram) | Runs in Fleet every Snapshot — **not** “hope the agent remembers” |
| **B. Cursor rule** | `.cursor/rules/me8-device-control-once.mdc` (`alwaysApply`) | **Cursor agent** reads this every chat — blocked from “helpfully” putting Timer-E back |
| **C. You** | Say **PASS/FAIL**; never set `FM_DEVICE_CONTROL_SIP_TXN=1` unless debugging | Operator gate |

So: **prevention is mostly code (A)**. The Cursor rule (B) stops a future agent from undoing A without your **MOB-APPLY**.

### 2) Is prevention done by the Cursor agent?

**Partly.**

- **Stopping the storm on the wire** = **Fleet code** (`udp_once`). That works even if Cursor is closed.
- **Stopping an agent from re-breaking it** = **Cursor rule + zero-change-without-APPLY**. That only applies when an agent edits the repo.

If no agent touches DeviceControl, the PASS fix stays.  
If an agent tries to “improve” SIP send without APPLY, the rule says **stop**.

### 3) Why was it programmed like this suddenly without my permission?

**It was not a secret MOB that said “make Snapshot fire 6 times.”**  
Nobody got your APPLY to invent Timer E.

| What people fear | What is true |
|------------------|--------------|
| Agent suddenly rewrote Snapshot to multi-fire | **No** — one click still one `sendDeviceControl` call |
| Someone turned on a “burst” feature without APPLY | **No** |
| sip.js retransmit appeared overnight as new product code | **No** — **library default** for UDP non-INVITE (`sip.send` → Timer E → ~32s → 408) |

**Honest timeline:**

1. Old DeviceControl used normal **`sip.send(MESSAGE)`** — standard SIP client transaction (RFC-style retransmit). That pattern existed **long before** tonight; it was never a named “please storm the shutter” APPLY.
2. Under lab stress (cam slow/no 200, contact via **`wvp_register_peer`**), Timer E copies hit the BWC hard → you felt **6 shots**. Log still showed **1× sent** — that is why it looked “sudden” and unfair.
3. **ACK TRACE** (you APPLIED) proved timeout + late **408**.  
4. **NO-RETRANSMIT** (you APPLIED) changed default to **`udp_once`**.  
5. You **PASS**’d 1 click → 1 shot.  
6. **Cursor rule** (this APPLY) locks agents from putting the old path back.

So the “without permission” feeling is fair as **pain** — the storm was real — but the root was **pre-existing stack behavior**, not a rogue agent redesign of icons/Snapshot overnight. What **did** need your permission (and got it) was the **fix** and this **rule**.

---

## What the Cursor rule forbids (forever unless you APPLY otherwise)

- Reverting DeviceControl to `sip_txn` / `sip.send` for “reliability”
- Shipping or recommending `FM_DEVICE_CONTROL_SIP_TXN=1` for normal use
- Parallel TakePicture MESSAGE paths outside `deviceControl.js`

---

## What you do as operator

Nothing fancy: if Snapshot ever multi-fires again, say the time. Agent checks `mode` in the log.  
You do **not** need to manage SIP timers.

---

## APPLY phrase (this MOB)

**`MOB-APPLY DEVICE-CONTROL-ONCE-CURSOR-RULE-V1`** → creates/updates `.cursor/rules/me8-device-control-once.mdc`
