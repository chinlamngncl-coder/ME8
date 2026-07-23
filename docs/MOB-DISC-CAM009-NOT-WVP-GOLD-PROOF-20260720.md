# MOB DISC — Correction: cam 009 Alarm ≠ prove old Fleet :5062 (2026-07-20)

**Type:** DISC only  
**Operator:** “that alarm is registered with 5062. it should be using old fleet.”

---

## Correction to prior handoff

Prior disc counted **01:01:44 cam 009** as “WVP Master-Gateway physical Alarm PASS.”

Operator intent: **cam 009 SIP home = Fleet :5062 (old / gold stack)** — so that press should **not** count as a WVP-home (:5060) cold-SOS proof.

**Accept for matrix:** treat **WVP cold SOS** as **Chin 008 only** until 009 is confirmed on :5060 in the cam menu.

---

## Wire fact (honest — do not ignore)

Tonight’s **banner for 009** did **not** arrive via classic Fleet SIP Alarm handler.

| Marker | Classic Fleet :5062 | What 01:01 log shows |
|--------|---------------------|----------------------|
| `source` | `sip_alarm` | **`wvp_sip_proxy`** |
| Ingress | Fleet SIP listen **5062** | HTTP from **wvp-sip-lan-proxy :5060** → `/api/lab/wvp/events` |
| Live after | Fleet INVITE path | Proxy **INVITE Via :5060** → WVP; peer `192.168.1.140` |
| Presence | Fleet REGISTER contact | **`device online from wvp presence`** + proxy REGISTER |

So: if the **cam menu** still says server port **5062**, that conflicts with the **packet path** that raised the banner (**hit :5060 proxy**). Either:

1. Menu vs actual destination mismatch / dual path / stale belief, or  
2. Cam was briefly talking **5060** while you expect it to stay Fleet-only.

**Not proven:** Alarm MESSAGE landed on Fleet Node :5062 as `sip_alarm` at 01:01 — **no such line**.

---

## Revised test matrix (operator-aligned)

| Cam | Intended home | Use for |
|-----|---------------|---------|
| **008** | WVP / proxy **:5060** | Live + cold SOS + Call/PTT under Master-Gateway |
| **009** | Old Fleet **:5062** (your call) | Gold SOS/PTT baseline — **do not** score WVP bus from 009 |

**008 tonight:** physical SOS presses → proxy **REGISTER only**, no Alarm → WVP cold SOS still fail for the cam under test.

---

## Google note (replace prior “009 PASS”)

Do **not** cite 009 01:01 as “WVP cold SOS works.”  
Cite only: event bus accepts Alarm when proxy sees it; **WVP-under-test cam 008** still silent on Alarm wire.

If lab wants 009 true Fleet gold: confirm cam SIP port **5062**, confirm Fleet `sip_alarm` on press, and stop counting `wvp_sip_proxy` for that unit.

**No code.**
