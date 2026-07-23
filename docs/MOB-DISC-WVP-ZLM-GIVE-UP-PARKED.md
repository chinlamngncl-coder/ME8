# MOB DISC — WVP-ZLM on Fleet ops: **GIVE UP / PARKED** (superseded for soft-after)

**Status:** SUPERSEDED for ops wire — 2026-07-16  
**Superseded by:** `MOB-APPLY mob-wvp-zlm-soft-after-ffmpeg-failopen-v1`  
**Still locked:** never ZLM-**before**-Fleet-invite (that park stays)  
**Search:** `give up zlm`, `park wvp-zlm`, `zlm failed`, `ffmpeg stay`  
**Related FAIL:** `docs/MOB-DISC-WVP-ZLM-FIRST-REGRESS-NO-VIDEO.md`  
**5060:** unchanged — never dictate BWC SIP port change  
**Scale why:** `docs/MOB-DISC-WVP-ZLM-SCALE-NOT-FUN-NOT-AGENT-PARK.md`

---

## Decision (updated)

**Invite-hold / ZLM-before-invite:** still **forbidden** (that is what “park” meant).  
**Soft ZLM after Fleet picture (fail-open):** **re-opened** by soft-after APPLY — scale path, not abandon.

Ops may try WVP-ZLM **after** JSMpeg is up. Fail → stay Fleet.  
Do **not** block or defer Fleet INVITE for WVP probes.

---

## Why (facts, not hope)

| Claim | Fact |
|-------|------|
| ZLM on Fleet | **Never** proven — **0** × `live broker wvp-zlm primary` in failing sessions |
| What soaks showed | FFmpeg / pool RTP, sold as ZLM by mistake earlier |
| ZLM-first APPLYs | Held Fleet INVITE while WVP play failed → **black panel + pin** (regress) |
| WVP `startPlay` | Still fails (SSRC / timeout class) even when Fleet not busy |
| Operator SIP 5060 | **Stays** — not the fix knob |

Reordering invites cannot invent a working WVP play stack.

---

## What “give up” means (scope)

**Stopped / parked**

- Fleet wall ZLM-before-invite  
- Fleet pin ZLM-before-invite  
- Treating FFmpeg soaks as WVP-ZLM pass  
- Asking operator to “try ZLM again” / re-point cams / change 5060  

**Still allowed later (only with new MOB-APPLY + name)**

- Lab-only WVP tile / probe that does **not** block ops live  
- Fix WVP `startPlay` / ZLM RTP until log shows real `wvp-zlm primary`  
- Then a **new** named MOB to put ZLM on Fleet — not revive these failed ones

---

## Ops restore (if still on regress code)

If panel/pin still wait on ZLM probes:

**`MOB-APPLY revert-wvp-zlm-before-invite-ops-v1`**

→ strip ZLM-first defer-invite from wall/pin; immediate Fleet invite again.

If already reverted / FFmpeg invites immediately — no further ZLM live work until unpark MOB.

---

## Pass rule (unchanged when unparked someday)

Only **`live broker wvp-zlm primary`** = WVP-ZLM.  
Invite / pool RTP alone = FFmpeg.

---

## One line

**Give up WVP-ZLM on Fleet ops for now. Stay FFmpeg. Park until startPlay actually works. Revert APPLY if live still black.**
