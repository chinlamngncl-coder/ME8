# MOB DISC — Google “stamp creep / modify_stamp=1” — worth a try? Plan

**Date:** 2026-07-15  
**Operator paste:** BWC timestamp mismatch → creeping latency → fix `modify_stamp=1` + `lowLatency=1`  
**Status:** DISCUSSION only — **no APPLY** until hour BYE soak ends + you name a MOB  
**Stack to tune (if ever):** modern `docker/wvp/zlm-modern/config.ini` only — **not** Fleet wall ZLM  

**Siblings:**  
- `MOB-DISC-WVP-LAB-LIVE-EDGE-DRAG.md` (drag = live edge)  
- `MOB-DISC-WVP-STAMP-TUNE-FAIL.md` (fossil FAIL)  
- `MOB-DISC-WVP-ZLM-CONFIG-GOOGLE-CHECK.md` (earlier Google triage)

---

## Verdict in one breath

**Worth a careful try on modern ZLM — yes, as a one-knob prove.**  
**Worth believing the whole essay as “the only truth” — no.**

Two creeps can look the same on glass:

| Creep | What you already proved |
|-------|-------------------------|
| **Player live-edge** | Drag bar to end → ~**2–3 s**; without drag → late. Auto chase is **off**. |
| **ZLM stamp / RTP clock** | Log floods `Stamp expired is abnormal`; Google’s story fits **part** of that |

Google fixes **ZLM arrival-time stamping**. It does **not** replace a Lab **live-edge nudge** if the HTML5 playhead still walks left.

---

## Score the Google text (agree / half / reject)

| Claim | Our take |
|-------|----------|
| Creep is **common** on GB28181 BWC + ZLM | **Agree** — we see creep + stamp spam |
| Always / almost always **camera PTS vs server clock** | **Half** — often true in ZLM lore; on our tiles **browser buffer** is proven by **drag** |
| ZLM buffers “future” stamps → queue grows | **Plausible** — matches `modify_stamp` docs |
| WVP↔ZLM NTP conflict is the usual cause | **Weak** — hooks are HTTP; less central than RTP stamp mode |
| `modify_stamp=1` = **single most effective** kill | **Useful candidate** — **not free**; we already **hurt** once on fossil |
| Add `lowLatency=1` in the same breath | **Caution** — second knob; can glitch H.264 multi-slice; **do not bundle** first prove |
| CBR / disable local record if still creeps | **Later cam dig** — only after ZLM+player measured |
| Smooth-late vs stutter diagnostic | **Keep** — good operator question |

### What ZLM itself says (modern ini comments)

```text
modify_stamp=
  1 = system timestamp on receive (with smoothing)   ← Google wants this
  2 = relative increments + jump/back correct          ← we are HERE now
```

So Google is asking: **2 → 1** on modern (not invent a missing key).

### Lab history (do not forget)

| When | Change | Result |
|------|--------|--------|
| Fossil overnight | `modifyStamp` **0 → 1** (+ other timeouts) | **FAIL** ~2 min: **A lag spike**, B stop/play |
| Modern now | `modify_stamp=**2**`, `lowLatency=**0**` | Creep + stamp warnings; path after drag ~2–3 s |

Fossil FAIL ≠ automatic modern FAIL (different binary + starting from **2** not **0**), but it proves: **stamp rewrite can make lag worse.** Plan must be abort-able in minutes.

---

## Diagnostic (answer while soaking — no APPLY)

When it gets late **without** dragging:

| Feel | More like |
|------|-----------|
| **Smooth but late** (Google clock story) | Stamp / steady buffer growth |
| **Stutter then catch-up** | Loss / reorder / radio |
| **Bar left of right end; drag fixes instantly** | **Player live-edge** (must stay on plan regardless of stamp) |

If after a future stamp MOB, drag is still required every few minutes → stamp alone did not finish the job → add live-edge nudge MOB.

---

## Plan (phased — one MOB at a time)

### Phase 0 — now (this hour)

- Finish **BYE / stability** soak (screensaver off preferred).  
- Optionally note: smooth-late vs stutter; how often you must drag.  
- **Do not** change `config.ini` mid-soak.

### Phase 1 — paper measure (named)

**`mob-wvp-latency-measure`** (ops only)

1. Drag both tiles to live → hand ≈ 2–3 s (baseline path).  
2. No drag 15 min → note lag + whether bar left edge.  
3. Tile log `via=` (ws-flv / direct / proxy).

PASS gate for Phase 2: written samples (not vibes).

### Phase 2 — Google stamp on **modern** only (first real try)

**`mob-wvp-modern-modify-stamp-1`**

| | |
|--|--|
| File | `docker/wvp/zlm-modern/config.ini` only |
| Change | **`modify_stamp` 2 → 1** only |
| **Not** in this MOB | `lowLatency`, mpegts chasing, Fleet `me8-zlm`, wall |
| Recreate | `me8-wvp-zlm` (compose recreate) — Fleet restart **not** required |
| Abort | Any tile like fossil FAIL within **5 min** (big lag jump / death reopen storm) → **revert to 2** same day |

**PASS:** after drag baseline, **15–30 min** without babysitting bar; felt lag stays near **&lt; ~5 s** (or you set number).  
**FAIL:** worse than today, or stability dies → revert; do **not** add lowLatency on top of a FAIL.

### Phase 3 — only if Phase 2 PASS but still a bit soft

**`mob-wvp-modern-lowlatency-1`**

- `[rtp]` and/or `[rtsp]` `lowLatency` **0 → 1** (confirm which sections our play path uses).  
- Short soak; watch **glitch/花屏**.  
- Abort on garbage picture.

### Phase 4 — player creep (likely still needed)

**`mob-wvp-lab-live-edge-nudge`**

- Soft seek to buffered end when lag &gt; N s.  
- **Not** Gate-B full `liveBufferLatencyChasing` stash recipe unless separately scoped.

### Phase 5 — cam (if still creeeps after 2–4)

CBR / local-record-while-stream / GOP — only with measure proving A≠B gap or residual after live-edge.

---

## What we will **not** do from this Google paste

- Bundle stamp + lowLatency + CBR + chasing in one APPLY  
- Touch Track A / wall / Firmware Gold for this  
- Declare “NTP between WVP and ZLM” as first MOB without evidence  
- Re-run fossil stamp story and call it modern prove  

---

## Honest expectation

| Outcome | Meaning |
|---------|---------|
| Stamp=1 stops **ZLM** stamp spam + creep, bar still walks | Still need **live-edge nudge** |
| Stamp=1 makes A **worse** (fossil echo) | Revert; go player nudge + cam |
| Stamp=1 + no drag for 30 min | Google essay earned its try |

---

## One line

**Google’s stamp story is worth a careful modern-only `modify_stamp 2→1` prove after this soak — not both knobs at once, not mid-hour, and not instead of fixing Lab live-edge drag creep.**
