# MOB DISC — Not giving up on WVP · what now · clear options

**Status:** LOCKED 2026-07-17 ~00:37  
**Search:** `giving up`, `what now`, `are you really`, `cursor coded correctly`, `options`  
**Facts:** ZLM media **online** PASS · wall still **`zlm-relay primary`** · startPlay still fails · res still FAIL on Plan B  
**5060:** Fleet stays — **not** operator BWC rewrite

---

## Straight answers

| Your question | Answer |
|---------------|--------|
| Giving up on WVP? | **No.** |
| Why stop / no option? | Agent fault — reported FAIL without a **menu**. Fixed by this disc. |
| Cursor coded wrong? | **Fail-open is intentional** (keep picture, don’t black wall). That is correct product behavior when startPlay dies. **Wrong** would be claiming “we’re on WVP” while log says `zlm-relay`. Coding path is OK; **Plan A still blocked after startPlay**. |
| Using WVP for wall picture now? | **No** — tries WVP first, fails, falls to Plan B. |

---

## What already worked (do not undo)

1. **Media-online** — WVP lists ZLM `status: true` (keepalive / same Docker network).  
2. Soft path still **tries WVP `startPlay` first** every open.  
3. Fail-open → Plan B so wall is not black.

**Gap:** `startPlay` still fails (~00:33 `wvp_startplay_failure`, message garbled `????` in log — likely device/channel offline on WVP, **not** “no ZLM” anymore). Until that clears → **no `wvp-zlm primary`** → native res not from Plan A.

---

## What now — pick **one** (you say MOB-APPLY)

### A — Dig startPlay (recommended next for Plan A)
**`mob-wvp-startplay-fail-decode-v1`**  
- Decode real WVP error (UTF-8), dump device/channel online from WVP API  
- One-screen: *why* startPlay fails **with ZLM online**  
- No BWC port change homework  
- Output: next named fix or honest “needs one-cam lab you approve”

### B — Plan B res harden (picture quality while Plan A blocked)
**`mob-zlm-relay-discardcorrupt-v1`**  
- Google’s discardcorrupt / bigger probe / **no hardcode scale**  
- Soft wall may stabilize res on Plan B  
- Does **not** equal WVP native

### C — Ask Google again (with new facts)
Paste: ZLM `status:true`, startPlay still fails (`????` / device offline class), wall = `zlm-relay`, want Plan A without rewriting Fleet 5060.  
Paper only until reply → then APPLY.

### D — Pause WVP genre / stay Fleet wall
No APPLY — keep fail-open; res stays known FAIL on Plan B until A or B.

### Later (after `wvp-zlm primary` once)
- `mob-wvp-play-tcp-passive-v1`  
- `mob-wvp-zlm-post-stable-wall-fr-check-v1` (command wall + FR — do not sacrifice)

---

## How to read progress (no confusion)

| Log line | Meaning |
|----------|---------|
| `live broker wvp-zlm primary` | **On WVP** for that cam — Plan A win |
| `live broker zlm-relay primary` | **Not WVP** — Plan B fail-open |
| `未找到可用的zlm` | Old blocker — **cleared** by media-online |
| `wvp_startplay_failure` + other msg | **Current** blocker — dig with option A |

---

## Agent rules (locked)

- Do **not** say “give up” or stop without **A/B/C/D**  
- Do **not** nag operator to change BWC to 5061  
- Do **not** claim WVP wall while log is `zlm-relay`  
- One MOB at a time after you APPLY  

---

## One line

**Not giving up. ZLM online; startPlay still fails → not on WVP wall yet. Pick A dig / B Plan-B res / C Google / D pause — say MOB-APPLY.**
