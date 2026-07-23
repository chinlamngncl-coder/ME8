# MOB DISC — Auto-agent WVP-ZLM damage · **ops already broken** · recovery way

**Status:** LOCKED 2026-07-16 — operator angry; days of soak wasted; live broken  
**Search:** `broke everything`, `auto agent`, `recovery`, `give up but broken`, `restore live`  
**Related:**  
- Fail: `docs/MOB-DISC-WVP-ZLM-FIRST-REGRESS-NO-VIDEO.md`  
- Park: `docs/MOB-DISC-WVP-ZLM-GIVE-UP-PARKED.md`  
**Brand / SIP:** Mobility Axiom stays · Fleet **5060 unchanged** · never sell FFmpeg as ZLM

---

## Situation (honest)

| Fact | Detail |
|------|--------|
| Wanted | WVP-ZLM on same Fleet UI |
| What happened | Auto/agent path chased ZLM with APPLYs that **deferred Fleet INVITE** while WVP `startPlay` was dead |
| Result | Panel + pin black · call/live feel dead · days of “soaks” were often **not ZLM** |
| Give up? | **Yes on WVP-ZLM for Fleet ops** (parked) |
| But | Tree is **already broken** — park alone does not heal live. **Must restore ops.** |

**Pass never happened:** `live broker wvp-zlm primary` count on failing nights = **0**.

---

## The way (recovery ladder — do in order)

Do **not** invent a new ZLM theory. Heal Fleet FFmpeg first.

### Step 1 — Surgical revert (preferred · keeps other MOBs)

**You type:**  
`MOB-APPLY revert-wvp-zlm-before-invite-ops-v1`

**Agent must:**

1. Remove wall/pin **ZLM-before-Fleet-INVITE** behavior from `public/js/video-wall.js`  
   - No `assignCamToSlot` forced `skipInvite` for ZLM  
   - No `tryWallZlmBeforeFfmpegInvite` / `tryPinZlmBeforeFfmpegInvite` as **primary** path  
   - Restore immediate `ensureInvite` / `requestStreamForCam` on live open (pre-regress)  
2. Soft ZLM overlay **after** FFmpeg is up may stay **off** for now (safer) — or only if it cannot delay invite  
3. Revert broker stop/retry only if it causes harm; otherwise leave (does not block invite)  
4. Cache bust `video-wall.js` (+ factory if needed)  
5. Restart Fleet service · operator hard refresh  
6. **Smoke (same night):** Open All or pin live → log must show `invite requested` within a few seconds · `pool rtp received` · picture on panel **and** pin  

**Pass for Step 1:** ops live works again on **FFmpeg**. Not ZLM. Say so.

### Step 2 — If Step 1 still black / weird

**You type:** `RUN RESTORE-ME8-PRE-GATE-C`  
(pre–Gate-C floor — before this ZLM ops thrash)  
Then restart Fleet · verify script · smoke live.

### Step 3 — Pin/video floor only if pin mirror still wrong after 1–2

**You type:** `RUN RESTORE-ME8-FIRMWARE-GOLD`  
(only pin/wall player floor — AI never auto-restores)

### Do **not** use as “good live”

- `me8-failed-live-v1` — shelf of known bad live  
- More WVP-ZLM “one more MOB” on ops without lab proof first  

---

## After ops is green — park rules (hard)

1. **WVP-ZLM on Fleet wall/pin = PARKED** (`MOB-DISC-WVP-ZLM-GIVE-UP-PARKED.md`).  
2. No soak sold as ZLM unless log has **`live broker wvp-zlm primary`**.  
3. Lab-only WVP work must **not** touch `assignCamToSlot` invite order / pin open path.  
4. Unpark only with a **new** named MOB after WVP `startPlay` works in a probe that does not block ops.  
5. Never dictate changing **5060**.

---

## What the auto-agent got wrong (so it stops)

| Mistake | Rule from now |
|---------|----------------|
| Deferred Fleet INVITE for a dead WVP play | **Ops invite first** until ZLM proven |
| Multi-retry probe = minutes black | Fail-open to FFmpeg in **&lt; ~2s**, or don’t probe on ops |
| Called FFmpeg soaks “ZLM” | Only `wvp-zlm primary` counts |
| Kept APPLY-ing ZLM while startPlay failed | Stop · disc · park · restore ops |
| Asked operator to re-point / change SIP | Forbidden |

---

## Operator one-screen

1. Live broken + ZLM give-up = both true.  
2. Way forward = **revert invite-defer** (Step 1), not more ZLM.  
3. Say: **`MOB-APPLY revert-wvp-zlm-before-invite-ops-v1`**  
4. If still dead → **`RUN RESTORE-ME8-PRE-GATE-C`**.  
5. ZLM stays parked until real primary log exists.

---

## One line

**Already broken · give up ZLM · restore Fleet invite now (revert MOB) · baseline only if revert fails · no more ops ZLM experiments.**
