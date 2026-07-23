# MOB DISC — Can we Soft Open test GB-only? · YDT vs SOS-while-video (parked)

**Date:** 2026-07-17  
**Status:** DISC only — no code  
**Operator:** Do not want YDT — vendor controls device; when video is up cannot stop / press SOS. Wanted SOS press → software trigger while BWC video still on — failed / parked. Ask: **can we test with only GB?**

---

## Short answers

| Question | Answer |
|----------|--------|
| Soft Open **picture** soak / stability — GB-only? | **Yes.** Soft Open video is **GB28181 → WVP → ZLM FLV**. YDT does not paint the wall. |
| Drop YDT forever for product? | **Not recommended** if you still need GPS / hardware buttons / cam-side stop later — unless you replace that pipe (companion / other). |
| SOS while video is up (GB alone)? | **Already proven weak.** Physical button often **does not** show as GB SIP XML on Fleet during live (`MOB-DISC-BWC-VIDEO-BUTTON-GB-REPORT-TEST-20260715.md`). That is why dual YDT / companion were on the table. |
| “We failed and parked” SOS-while-live | Correct memory: **companion F4 SOS** parked; **YDT button→Fleet→WVP stop / SOS** was planned (M3/M4), not finished as product-grade “press SOS during Soft Open.” |

---

## Two different problems (do not mix)

```
A) Soft Open picture / stall / pin / zombie UI
   → GB → WVP → mpegts on dashboard
   → YDT irrelevant

B) Wearer presses SOS / Stop while cam is already streaming video
   → Vendor often owns the button while its video app/session is up
   → GB MESSAGE Alarm often missing
   → Needs YDT telemetry, companion Accessibility, or vendor cooperation
```

Soft Open UI MOBs (keepalive, click-lock, zombie, generation) fix **A**.  
They do **not** fix **B**.

---

## Why YDT was in the dual-protocol plan

Locked split (still true for Soft Open picture):

```
BWC
 ├─ GB28181  → :5060 → WVP  → Soft Open / live picture
 └─ YDT      → :5062 → Fleet → GPS / hardware buttons / planned stop+SOS bridge
```

Google / our wake-up disc: video SIP marriage = WVP; buttons/GPS should not compete on the same SIP as video.

Your lab pain (“vendor controlled — video up → cannot SOS / stop”) is exactly why **GB-only Soft Open** is fine for **picture testing**, but also why **GB-only is a bad long-term answer for SOS-while-live** unless a sidecar (companion) or vendor fix exists.

---

## Can you test Soft Open with only GB? — how

**Yes — for Soft Open picture / soak / UI stability.**

| Step | What |
|------|------|
| 1 | On BWC: leave **GB28181** to lab `192.168.1.38:5060` (WVP path) |
| 2 | Turn **off / do not register YDT** for this Soft Open soak (or leave YDT row empty) |
| 3 | Soft Open Chin (+ KK if both GB online) |
| 4 | Expect: wall/pin picture path = WVP ZLM only; Fleet may show thinner GPS / “offline” noise — ignore for Soft Open PASS |

**Optional:** after Soft Open picture PASS, re-enable YDT only when you resume the **SOS / button / GPS** genre — not mid Soft Open UI soak.

---

## SOS while video still on BWC — honest status

| Approach | Status | Notes |
|----------|--------|-------|
| Hope GB Alarm MESSAGE during live | **FAIL / weak** | Log test: no button XML on Fleet during video |
| Dual YDT → Fleet → SOS / stopPlay | **Planned, not product-done** | M3/M4 in dual-protocol disc; Soft Open Stop from **dashboard** already bridges WVP |
| Companion APK F4 Accessibility → HTTP SOS | **Parked** | F4 proof planned; audio second SIP parked; vendor may still eat keys |
| Software Soft Open “fake SOS” | Wrong | Soft Open is HQ view; SOS must come from device/wearer path |

Wanted behavior: **press SOS on cam → Axiom SOS banner/ledger even while video LED is on.**  
That is **not** a Soft Open mpegts bug. It is a **device event path** problem.

---

## Recommendation (lock for next work)

1. **Soft Open stability genre (now):** test **GB-only** if you want fewer moving parts. Valid.  
2. **Do not delete YDT from the product story** until SOS-while-live has a **named** replacement (YDT prove PASS, or companion PASS, or vendor doc).  
3. **SOS-while-live genre (later):** one named MOB to **re-prove** what happens on YDT-only vs GB-only when video is up — paper result first, then APPLY.  
4. Soft Open HQ **Stop** stays software-side WVP `stopPlay` (already); that is **not** the same as wearer SOS.

---

## You decide

Reply e.g.:

- `GB-only Soft Open soak` — you re-key / disable YDT and we treat Soft Open PASS on picture only  
- `MOB DISC sos-while-live-ydt-reprove` — paper test plan for SOS button with video up (YDT on vs off)  
- Keep dual GB+YDT as today and ignore GPS noise during Soft Open

---

## One line

**Yes — Soft Open can be tested GB-only (picture path); SOS-while-video still needs YDT or companion — that genre failed/parked and is not fixed by Soft Open player MOBs.**
