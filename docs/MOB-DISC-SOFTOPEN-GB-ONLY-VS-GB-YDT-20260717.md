# MOB DISC — Soft Open test: GB-only vs GB28181 + YDT?

**Date:** 2026-07-17  
**Type:** Paper disc only (no code)  
**Ask:** After Soft Open picture FAIL + auto-stop fix — use **only GB28181**, or keep **GB28181 + YDT**, or go on?

---

## Short answer

| Goal | Cam mode | Why |
|------|----------|-----|
| Fix Soft Open **picture** (black / Player error) | **GB28181 row to WVP `:5060` is enough** | Soft Open video = WVP GB INVITE → ZLM FLV. YDT does **not** paint the wall. |
| Product / ops long run | **Keep GB + YDT** (go on) | Buttons / GPS / stop-from-cam stay on Fleet YDT `:5062`. Already planned. |
| Do **not** drop YDT forever | — | Dropping YDT only to “simplify Soft Open” costs telemetry and cam Stop later. |

**Recommendation:** **Go on with GB + YDT** for the lab BWCs. Soft Open picture work does **not** require switching to GB-only. If you want one clean Soft Open prove, you may temporarily leave only the GB row online — optional, not required.

---

## What each pipe does (locked split)

```
BWC
 ├─ GB28181  → PC 192.168.1.38:5060  → host SIP proxy → WVP  → Soft Open / live picture
 └─ YDT      → PC 192.168.1.38:5062  → Fleet Node     → GPS / buttons / later stop bridge
```

| Pipe | Soft Open picture? | Stop live from dashboard? | Cam button / GPS? |
|------|--------------------|---------------------------|-------------------|
| GB28181 → WVP | **Yes** (this is the video) | Via WVP `stopPlay` (MOB 3 bridge) | Usually weak / missing |
| YDT → Fleet | **No** | Later M3 `mob-ydt-stop-bridges-wvp-v1` | **Yes** (planned) |

Locked discs:
- `MOB-DISC-GOOGLE-DUAL-PROTOCOL-GB-YDT-WAKEUP.md`
- `MOB-DISC-BWC-VENDOR-PRIVATE-VS-GB-ONLY.md` — product live language = **GB28181** (not vendor private SDK)
- `MOB-DISC-BWC-ONE-ROW-WVP-ZLM-WHAT-TO-KEY.md` — typing one server row for WVP when cam has one line

**GB-only (product sense)** = no vendor-private SDK stack.  
**GB + YDT** = still GB for video; YDT is the second protocol for telemetry — **not** “leave GB”.

---

## Soft Open status (today)

| Item | Status |
|------|--------|
| SIP / NAT (`200 OK`) | PASS |
| Broker FLV URL LAN `:18088` | PASS (log) |
| Picture | **FAIL** (player / empty media) |
| Auto-stop on player fail | Fixed (`mob-softopen-no-auto-stop-on-player-fail-v1`) |
| Stop → WVP BYE | APPLIED (only when you press Stop) |
| Ghost pin cleanup | APPLIED |

Next Soft Open work stays on **GB → WVP → FLV player**. YDT does not unblock black picture.

---

## When GB-only (temp) helps

Use **temporary GB-only** (YDT row off / not registered) **only if**:

- Dual mode confuses which cam is “online”
- You want one SIP registration story while proving Soft Open picture
- KK vs Chin online noise

Then put **YDT back on** after Soft Open picture PASS (or after you park Soft Open and return to dual-protocol M-list).

Do **not** treat temp GB-only as the new product default.

---

## When to go on (dual)

**Go on with GB + YDT** if:

- Chin GB already online on `:5060` and Soft Open reaches `wvp-zlm primary` (you already do)
- You still need GPS / hardware stop later
- You do not want to re-key cams twice

That is the default: **leave dual on, keep Soft Open debugging on the GB/WVP side.**

---

## Suggested next (no APPLY yet)

1. **Hard refresh** — confirm no auto-stop (last MOB).  
2. Soft Open **Chin** again — PASS = no auto BYE; picture still may FAIL.  
3. Picture FAIL → new MOB DISC / Google pack on **FLV empty media** (ZLM stream timeout / codec), still on GB→WVP — **not** a YDT change.  
4. Dual-protocol M3/M4 (YDT stop / telemetry) — **after** Soft Open picture is PASS or explicitly parked.

---

## One line

**Go on with GB + YDT; Soft Open picture is GB→WVP only — do not drop YDT to fix black video.**
