# MOB DISC — Soft test ~00:33: still **not** WVP · resolution still FAIL

**Status:** LOCKED 2026-07-17 ~00:34  
**Search:** `resolution still changed`, `are you already using wvp`, `same tested`  
**Log:** `storage/fleet.log` ~ **2026-07-17 00:33**

---

## Are we already using WVP? **NO**

| Question | Answer |
|----------|--------|
| Wall soft path primary? | **`live broker zlm-relay primary`** (Plan B) |
| WVP Plan A primary? | **`wvp-zlm primary` = 0** — not used for picture |
| Did app try WVP first? | **Yes** — then `wvp_startplay_failure` → `after: wvp_miss` |

**Proof lines (chin/kk):**
```
live broker fallback | reason: wvp_startplay_failure
zlm relay … geometry: fixed-from-probe-v1 | outWidth:640 | outHeight:480
[mpeg2video] Invalid frame dimensions 0x0
live broker zlm-relay primary | after: wvp_miss
```

So: you are **not** watching WVP→ZLM device H.264.  
You are watching **Fleet pool MPEG → openh264 → side ZLM** overlay. Same brittle Plan B as before.

Media-online MOB made ZLM **status:true** in WVP — that only means “ZLM node available.”  
**startPlay still fails** for these cams → Plan A never becomes primary.

---

## Resolution still changed — expected on this path

| Fact | Detail |
|------|--------|
| Operator see | Resolution still flips / wrong |
| Log | Still **`0x0`** on mpeg2 decode after probe lock **640×480** |
| Fixed-output MOB | **Did not fix** panel res (already admitted) |
| Why | Plan B re-encodes JSMpeg mpeg pool — not device native FLV |

**Res PASS needs Plan A (`wvp-zlm primary`) or a real Plan B discardcorrupt MOB — not more hope.**

Do **not** claim res fixed while log shows `zlm-relay primary` + `0x0`.

---

## Plain map

| Layer | State now |
|-------|-----------|
| WVP Docker / ZLM keepalive | Online (media-online PASS) |
| Soft wall picture engine | Still **Plan B zlm-relay** |
| Device GB into WVP play | **Not** delivering wall primary |
| Command wall / FR check | Later — after true WVP path stable |

---

## Next (you pick — no auto code)

| Option | Named |
|--------|--------|
| Why startPlay fails now (not “no ZLM”) | Agent dig log msg + stack — paper or APPLY |
| Plan B harden (Google discardcorrupt) | `mob-zlm-relay-discardcorrupt-v1` |
| TCP Passive after Plan A plays | `mob-wvp-play-tcp-passive-v1` |

**No BWC 5060 change.** Soft open again only when you want next MOB.

---

## One line

**Not on WVP for wall yet — still zlm-relay + 0x0. Res still FAIL. Media-online ≠ wvp-zlm primary.**
