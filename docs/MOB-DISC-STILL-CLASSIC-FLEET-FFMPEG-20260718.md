# MOB DISC — Still classic Fleet + FFmpeg (you are right)

**Date:** 2026-07-18 ~01:19  
**Status:** LOCK — operator correct  
**Ask:** Online + played video. Still classic Fleet FFmpeg? (Agent kept fucking the story.)

---

## Verdict

**YES. Classic Fleet. FFmpeg pool. Not Soft Open. Not WVP→ZLM primary.**

You are sure — and the log agrees.

---

## Proof (this play)

| Check | Result |
|-------|--------|
| `.env` `FM_LAB_WVP` | **`0`** |
| `.env` `FM_SOFTOPEN_WVP_ONLY` | **`0`** |
| `.env` `FM_WVP_FLEET_PRESENCE` | **`0`** |
| Chin register | `register ok` **01:17:38** → Fleet SIP |
| Live open Chin | `invite requested` + `pool invite sending` **01:18:17** |
| SIP | `invite accepted` **200** (Fleet pool path) |
| Broker | `live broker fallback` · `relay_inactive` = **not** WVP/ZLM primary |
| Log | **No** `wvp-zlm primary` on this play |

That is classic: Fleet INVITE → RTP → **FFmpeg** → wall/panel.  
WVP Docker can still be running in the background — **Ops live is not using it** while flags stay 0.

---

## About “fucking 5062”

Classic PASS floor was always **Fleet SIP `:5062`**.  
Agent burned you by mixing that with WVP `:5060` / platform flip-flops.  
**5062 for classic online was not a new invention tonight** — the mess was how it was said. Sorry for the waste; the path you are on now matches the PASS lock.

---

## Lock

- Stay here until a **named** thin WVP/ZLM APPLY.  
- Soft Open UI stays frozen.  
- Do not turn `FM_LAB_WVP=1` for daily Ops.

**One line:** Online + video = classic Fleet FFmpeg; flags off; broker fallback not WVP-ZLM primary — you were right.
