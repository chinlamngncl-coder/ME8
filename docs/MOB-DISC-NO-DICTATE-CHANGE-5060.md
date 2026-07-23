# MOB DISC — Do **not** dictate changing Fleet SIP **5060**

**Status:** SUPERSEDED for dual-protocol genre (2026-07-17)  
**Date:** 2026-07-16  
**Search:** `do not change 5060`, `no dictate sip`, `keep fleet 5060`  
**Operator:** APPLY ZLM-before-invite. Will **not** change 5060. Stop dictating.

**Override:** User ordered Google dual-protocol → **`mob-fleet-sip-port-5062-v1` APPLIED** — Fleet **5062**, WVP GB **5060**. See `MOB-APPLIED-FLEET-SIP-PORT-5062-V1.md`.

---

## Locked

| Rule | Detail |
|------|--------|
| Fleet SIP **5060** | **Stays.** Operator lab / BWCs keep Fleet platform on 5060 |
| Agent must not | Tell operator to re-point BWC to WVP-only 5061 as a condition of progress |
| Agent must not | “You must change SIP or ZLM won’t work” as the default answer |
| Fix path | **Code** — WVP-ZLM play **before** Fleet FFmpeg INVITE so the cam is not busy on a second play (`mob-wvp-wall-zlm-before-ffmpeg-invite-v1`) |
| Honesty | If WVP play still fails after that, say the WVP error — do **not** convert it into a 5060 rewrite lecture |

WVP may still use its own SIP (**5061**) inside Docker. That is **server-side stack**, not “operator, change your BWC to 5061.”

---

## One line

**Keep 5060. Fix invite order in product code. Do not dictate BWC SIP changes.**
