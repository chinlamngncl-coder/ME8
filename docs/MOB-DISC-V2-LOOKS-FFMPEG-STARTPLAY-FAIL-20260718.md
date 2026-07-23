# MOB DISC — v2 looks like FFmpeg · need change port?

**Date:** 2026-07-18 ~12:30  
**Status:** DISC — log proof · **no rekey order in this disc**  
**Ask:** Looks like no change · open but FFmpeg · change port?

---

## Verdict

| Question | Answer |
|----------|--------|
| Is v2 “doing nothing”? | **No** — v2 **fail-open is working** |
| Why FFmpeg look? | WVP `startPlay` **failed** → keep Fleet/FFmpeg (by design) |
| Change Ops / Fleet port now? | **No** — do **not** flip Chin off `:5062` for this |
| Live dead? | **No** — invite + pool ran · picture path = classic |

---

## Log proof (your Chin open ~12:30)

| Time | Line |
|------|------|
| 12:30:05 | `invite requested` + `pool invite sending` → **Fleet live ON** |
| 12:30:18 / 12:30:29 | `wvp_startplay_failure` · `failopen:ffmpeg` · **`v2:true`** |
| | **No** `wvp-zlm primary` |

So: you see FFmpeg because WVP play did not succeed. That is **expected** until Chin is playable on WVP — not a v2 code miss.

---

## Port — plain

| Port | Role | Change now? |
|------|------|-------------|
| **5062** | Fleet online / classic INVITE (what works today) | **Keep** |
| **5060** | WVP GB (needed for real WVP→ZLM picture) | **Not yet** — named step later |
| Dashboard | `localhost:3988` | No change |

Changing Chin to **only** `:5060` right now risks merry-go-round offline again.  
v2 was built so we **don’t** do that to get picture.

---

## What “success” means today vs next

| Today (v2 PASS bar) | Next (ZLM picture) |
|---------------------|--------------------|
| Live opens · FFmpeg OK | WVP UI shows Chin **online** then `startPlay` works |
| Log has `v2` + `wvp_startplay_failure` | Log has `wvp-zlm primary` |

You are on the **today** row. Not stuck forever — blocked on **WVP owning Chin for play**.

---

## Concrete next (when you say APPLY — not now)

1. You open WVP UI: `http://localhost:18080` · admin/admin · is Chin listed **online**?  
   - **Yes** → say `wvp-ui-chin-online` → we dig startPlay error (not port flip first)  
   - **No** → next named MOB: dual-GB / WVP register path for Chin **without** killing Fleet `:5062` online  

Do **not** rekey on this disc alone.

---

**One line:** Looks like FFmpeg because v2 fail-open after `wvp_startplay_failure` — correct; do **not** change Fleet port now; next is prove Chin on WVP UI then named topology if offline there.
