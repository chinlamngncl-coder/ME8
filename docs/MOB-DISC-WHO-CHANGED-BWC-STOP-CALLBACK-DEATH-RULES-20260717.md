# MOB DISC — Who changed BWC-stop call-back · why patch if “revert to working fleet”

**Date:** 2026-07-17  
**Status:** DISC — paper only — **no code**  
**Ask:** Who changed it? Why patch if we are reverting to working fleet? If everything were normal, no patch needed — correct? Which agent cheated / broke death-sentence rules?

**Search:** `who changed dashboardActive`, `toilet vs SOS latch`, `death sentence`, `not Soft Open only`

---

## Short answers

| Question | Answer |
|----------|--------|
| Who put the call-back latch in? | **ME8 agent work under git author `ME8 <me8@local>`** — commit **`b1027dc` (2026-07-02)** — *not* a Soft Open invent tonight |
| Is it in “working fleet” / Gold / Pre-Gate-C? | **Yes.** Firmware Gold + Pre-Gate-C pack both still say: keep `dashboardActive` after BYE |
| So “revert to working fleet” removes auto call-back? | **No.** Revert alone **does not** fix toilet. That latch **is** in the old “working” tree |
| Why did we still need a patch? | Because **toilet design** (device end = end) and the **old SOS latch** (keep watching after BYE) were **never reconciled**. Tonight’s patch chooses toilet |
| Soft Open only culprit? | Soft Open **worsened** reopen fights; it did **not** invent keep-watching |
| Death-sentence cheat? | Soft Open freestyle + Hold To Talk smuggle = process fails. Keep-watching itself was an **old intentional tradeoff**, not a silent Soft Open edit |

---

## 1) Who changed it (git facts)

### A. Keep watching after BWC BYE (the call-back door)

| Field | Value |
|-------|--------|
| Commit | **`b1027dc`** |
| Date | **2026-07-02** 22:38 +08 |
| Author stamp | **`ME8 <me8@local>`** (lab agent commits — no human GitHub name) |
| Message | `mob-me8-operator-voice-unified: port OperatorUI + leak filter from Lab` |
| Code | `onRemoteBye`: leave session + **`dashboardActive` true** |
| Comment in tree | *“Keep session + dashboardActive so live-post-BYE SOS still sends startVideo:false.”* |

**Same comment still in:**

- Firmware Gold snapshot (`me8-firmware-gold-20260706` tree)  
- Pre-Gate-C baseline (`baseline/2026-07-14-pre-gate-c/lib/liveStreamPool.js`)

So: **not** “someone sneaked it in after Soft Open.” It was **baked into** the fleet you call working / Gold.

### B. “Stopped by BWC” overlay (UI label)

| Field | Value |
|-------|--------|
| Commit | **`ae7d644`** |
| Date | **2026-07-04** |
| Author | **`ME8 <me8@local>`** |
| Message | `Lock ME8 pin/video ops pass and complete six-locale i18n parity.` |
| What | `markBwcStoppedOverlay` — paints Stopped by BWC, kills players |
| Gap | Did **not** clear server watching → label said stop, pool still “watching” → later invite = **call-back** |

Toilet chrome was added **without** closing the latch from `b1027dc`. That mismatch is why your logic felt “all wrong.”

### C. Soft Open (Jul 17) — extra fight, not the origin

Named Soft Open MOBs (keepalive / reopen / storm) could **re-pull** video after stall or drop. That **violates** toilet (“device end = end”) and made call-back **worse** when Soft Open was on.

Tonight’s classic Chin path (`FM_LAB_WVP=0`) still showed call-back from **A+B** alone — log:

```
pool remote bye | dashboardActive: true
… ~4s …
pool invite sending
```

---

## 2) Why patch if “reverting to working fleet”?

**Your hope:** revert Soft Open / go classic → toilet works again → no patch.

**Fact:** “Working fleet” **Gold / Pre-Gate-C already keep watching after BYE.**  
Revert Soft Open ≠ delete `b1027dc` latch.

| Path | Soft Open reopen | Keep `dashboardActive` after BYE | Toilet safe without new patch? |
|------|------------------|-----------------------------------|--------------------------------|
| Soft Open ON | Can fight toilet | Yes (old) | **No** |
| Classic / Soft Open OFF | Off | Yes (old) | **Still no** — latch remains |
| Tonight’s APPLY | Off | Cleared on BYE | **Yes** (toilet wins) |

So: **not correct** that “if everything is by normal there won’t be such thing and we do not have to patch at all.”  
Normal/Gold **already had** the SOS-vs-toilet tradeoff. Patch was needed to **choose toilet** over the old SOS latch comment.

---

## 3) Was this “cheat / death sentence”?

Death sentence = no silent product change without **MOB-APPLY** / go-ahead; no freestyle; rules win.

| Item | Cheat? | Notes |
|------|--------|-------|
| `b1027dc` keep watching (Jul 2) | **Old intentional agent MOB** under author ME8 — SOS post-BYE design | Not Soft Open cheat; **conflicted** with toilet from day one |
| `ae7d644` overlay without clear watching (Jul 4) | Incomplete product — chrome without latch close | Agent unfinished logic, not a Jul-17 sneak |
| Soft Open keepalive/reopen (Jul 17) | **Yes — process fail class** | Reopen against device end fought locked toilet discs; freestyle Soft Open storm was what you ordered stopped |
| Hold To Talk re-smuggle `3c865d9` (Jul 11) | **Yes — Call lock ignored** | FR genre put back rejected Call hold |
| Arguing mute vs your screenshot | **Yes — process fail** | Should have been log + accept operator sight |

**Honest line:**  
There is **no single secret human** in git — stamps are **`ME8` / agent**. The keep-watching line is **agent-authored Jul 2**, still in Gold. Soft Open agents later **made toilet worse**. Death-sentence breaks = Soft Open freestyle + Hold smuggle + arguing; **not** “Gold never had call-back latch.”

---

## 4) What “normal” should have been (your design)

1. BWC stops → **Stopped by BWC**  
2. HQ **PTT** OK  
3. **No** auto invite  
4. Play / Call only when you decide  

Old “normal” code optimized **SOS after live BYE** (`startVideo:false` while still “watching”) and **sacrificed** toilet. That is why a patch was required even on classic fleet.

---

## Lock

- Do **not** claim Soft Open alone invented BWC call-back.  
- Do **not** claim Firmware Gold / Pre-Gate restore fixes toilet call-back — **they still keep `dashboardActive`**.  
- Tonight’s `MOB-APPLIED-BWC-STOP-NEVER-AUTO-CALLBACK` is the **first** clear choose-toilet over SOS latch.  
- Future Soft Open / reopen must **not** auto-invite against `device_bye` / Stopped by BWC without a named APPLY that you approve.

**Related:**  
`MOB-APPLIED-BWC-STOP-NEVER-AUTO-CALLBACK-20260717.md`  
`MOB-DISC-SOFTOPEN-STALL-PAUSE-RES-MULTI-SITE-20260717.md`  
`MOB-DISC-CALL-MUTE-VS-LIVE-MUTE-BWC-STOP-CALLBACK-20260717.md`
