# MOB DISC — Bank B size wrong + SOS/PTT/ZLM fear (NO APPLY)

**Status:** DISC only — 2026-07-19 · **no code until named MOB-APPLY**  
**Subject:** `MOB-DISC-BANK-B-SIZE-AND-LIVE-REGRESS`  
**Tone:** Operator is right to be angry about **size**. Function claims need **symptoms + evidence** before another blind edit.

---

## 1) Bank B size — agent mistake (confirmed)

### What you wanted
- Bank B shows **3 boxes**.
- Each box should be the **same size as a Bank A panel** (the five-up height you already accepted).
- **Blank space under** the three — do not stretch to fill the rail.

### What was wrongly applied (`MOB-APPLY-PANEL-BANK-B-SIX-SIZE`)
- Sized bank B to **old 6-panel (1/6 rail)** height.
- That is **smaller** than Bank A’s **1/5** panels → **different box size**. That is the fuck-up.

### Correct geometry (for next APPLY only)

| Bank | Visible | Per-panel height target |
|------|---------|-------------------------|
| A (1–5) | 5 × flex share | ~**1/5** of `#video-wall-slots` (current) |
| B (6–8) | 3 panels | **Same as one Bank A panel** (~1/5), **not** 1/3 fill, **not** 1/6 old |

So bank B CSS should use ~**`(100% − gaps) / 5`**, not `/ 6`. Bottom stays blank (~2/5 of rail).

Suggested name: **`MOB-APPLY-PANEL-BANK-B-MATCH-A-SIZE`**  
(Replaces / corrects `PANEL-BANK-B-SIX-SIZE`.)

**No other layout freestyle in that MOB.**

---

## 2) “SOS / PTT / everything / WVP-ZLM destroyed?” — disc, not a blind revert

### Honest split

Today’s **bank UI MOBs** (5+3 tabs, bank hide off-screen, bank-B height CSS) were **layout + slot count**. They should **not** have removed PTT/SOS button binders (`bindSlotControls` still wires play/stop/call/PTT).

But the working tree also has **earlier, larger live-path changes** (not invented in the size MOB):

| Area | State in tree (summary) |
|------|-------------------------|
| Wall play | `mountWallZlmPrimary` first → else Fleet/JSMpeg fallback |
| Factory | Soft ZLM overlay; prove-timer path **removed**; `onProven` fires immediately; `hasAudio: false` |
| Banks | `SLOT_COUNT = 8`; `ensureBankVisibleForSlot` on every `assignCamToSlot` (auto-flips tab) |
| Last git tip on wall | `lab-classic-revert-genre` — while **uncommitted** wall still has ZLM-primary pieces |

So: if live/SOS/PTT feel broken, it may be **(A)** bank side-effects, **(B)** ZLM/broker/classic path already fragile from prior genre work, **(C)** lab runtime (WVP/ZLM/Fleet not up), **(D)** cache — **not** proven as “tabs alone deleted WVP.”

### Bank side-effects that *can* hurt ops (to verify, not assume)

1. **`ensureBankVisibleForSlot` on every assign** — SOS/play to a cam on the other bank **forces a tab flip**. Surprising, can look like “UI broke.”
2. **Hidden bank off-screen** (`left: -10000px`, fixed ~140px height) — players kept “alive,” but tiny off-screen stage can make hidden-bank video/decode look dead until you flip; PTT buttons on hidden bank are not clickable until visible (expected).
3. **`SLOT_COUNT` 6 → 8** — Open All / config / SOS slot pick now span 8; old saved `video-channels.json` with 6 rows is padded on save — usually OK, worth checking Config shows 8 panels.

### What would actually kill ZLM picture

- Broker returns non-`zlm` / no `flvUrl` → falls through to Fleet; if Fleet also fails → black / stuck.
- Factory always “proves” immediately without waiting for frames → UI says Live while video never paints.
- WVP/ZLM containers / FLV port not reachable from Ops PC (real LAN IP, not 172.x).
- Hard refresh missing new `?v=…` (less likely for HTML CSS; still check factory/wall cache).

### What would kill SOS / PTT specifically

Need your **exact** fail (pick one or more):

- SOS banner never shows?
- SOS shows but **no live** on wall/pin?
- PTT button **missing / grey**?
- PTT hold does nothing (no TX)?
- Call dead?
- Play on panel does nothing?

Without that, **do not** “revert three days of WVP” in one shotgun MOB.

---

## 3) Rules for next steps (so we don’t destroy again)

1. **One MOB at a time.**  
   - First: **size only** → `MOB-APPLY-PANEL-BANK-B-MATCH-A-SIZE`  
   - Second: only if you name it — **live/SOS/PTT diagnose** with your symptom list + optional log paste.
2. **No classic full revert** unless you explicitly order a named restore / RESTORE phrase.
3. **No cover / no 16:9 scroll** revive in the size MOB.
4. Agent does **not** touch Firmware Gold pin-mirror cores unless you name those files in APPLY.

---

## 4) Operator ask (short)

Please reply with:

1. **Size:** confirm fix target = bank B panels **same height as bank A**, blank below. (Yes/No)  
2. **Break:** what exactly fails now (SOS / PTT / Play / ZLM black / all)?  
3. After size APPLY: hard refresh once and re-check basics before we open a live-path MOB.

---

## Status

**DISC only.**  

- Size: agent wrong; correction APPLY name ready when you say it.  
- SOS/PTT/ZLM: **not** auto-reverted here; waiting for symptoms + named APPLY before any live-core edit.
