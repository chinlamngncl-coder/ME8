# MOB DISC — Live panel not muted (operator evidence + log/code)

**Date:** 2026-07-17  
**Status:** DISC — paper only — **no mute code in this MOB**  
**Operator:** Click Live → open Chin panel → speaker shows **unmuted** (screenshot 23:40:26). Design = mute except SOS. Do not argue with operator sight.

**Search:** `live panel unmute`, `defaultAudioMuted sticky`, `🔊 pin`

---

## Operator evidence (accepted)

Screenshot Chin pin ~`2026-07-17 23:40:26`: live video up, speaker control shows **listen / unmuted** (🔊), not muted. Call not required for that chrome.

Fleet audio mute state is **browser-side** — not written to `fleet.log`. Log still shows Chin live invite at that time:

```
23:40:23 pool invite sending | camId …0008
```

---

## Code cause (not argument)

| Design | Code |
|--------|------|
| New live → **muted** except SOS | `defaultAudioMutedForNewStream` |
| Bug | Only sets mute if `!camAudioMuted.has(id)` — **sticky** prior unmute (Call / SOS / Listen) survives next Live open |
| Call path | `onBwcCallState` → `setCamAudioMuted(camId, false)` — leaves map as unmuted |
| SOS path | `unmuteAudioForSosCam` — same sticky |

So: open Live after any prior unmute → panel can show **🔊** without you clicking Listen. Matches what you see.

---

## Not fixed in this MOB

Mute restore needs a **named APPLY** (e.g. always re-apply mute on new stream unless SOS).  
Tonight’s code APPLY is **BWC stop no auto call-back only**.

---

## Lock

Operator sight + sticky `camAudioMuted` = accepted fail. Next mute APPLY only when you name it.
