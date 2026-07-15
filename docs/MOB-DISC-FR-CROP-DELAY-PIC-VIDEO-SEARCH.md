# MOB DISC — Crop delay after BWC live · picture → video search challenge

**Status:** DISC only — **no APPLY**  
**Date:** 2026-07-13  
**Trigger:** (1) Call BWC / stream comes in — cropping takes a while to start. (2) Big challenge: have a pic → search video — blacklist → search → snapshot → play video? Same as picture↔picture?  
**Search:** crop delay, warm stream, picture search video, frOfflineVideo, 1:N gallery, evidence playback  
**Related:** `MOB-DISC-FR-OFFLINE-VIDEO-CROPS.md` · live poller · Verify 1:1 · blacklist enroll  

---

## Part A — Why cropping lags after you call the BWC

Not “FR is asleep for fun.” The chain has **gates**:

```
Call / Open live
  → SIP/invite + media path up
  → liveStreamPool marks cam streaming
  → Analytics FR must include cam (tile / watch / surface)
  → poller tick (FM_FR_POLL_SEC ≈ 2s)
  → grabJpeg from WS (needs real mpeg bytes — often fails while pipe is empty)
  → sidecar represent-probe (+ batch of 3 grabs)
  → face OK → crop → rail
```

| Delay source | What you feel |
|--------------|----------------|
| Stream warm-up | Video may show before WS has stable frames; grabs = EOF / “no stream data” |
| Poll interval | Up to ~2s between attempts after stream is “live” |
| Multi-grab window | 3 grabs × ~350ms + probe |
| Sidecar cold / ONNX | First probe after idle slower |
| No face / quality gate | Stream OK but no crop until a usable face |

**So:** “Stream visible” ≠ “ready to crop.” Cropping starts only when **pool streaming + bytes for grab + face passes gate**.

Lab already saw: `fr grab failed` / encoder EOF while UI looked live.

### Direction (later MOBs — not tonight)

| Idea | MOB sketch |
|------|------------|
| Don’t probe until first WS bytes, then collect window | **`mob-fr-grab-warm-gate` APPLIED 2026-07-13** — fixes EOF before encoder |
| Faster first crop after open (1 grab, then batch) | `mob-fr-first-crop-fast` |
| Operator toast: “Waiting for stream…” vs silent empty rail | `mob-fr-crop-warming-ui` |

---

## Part B — Picture → video search: is it the same as picture↔picture?

### Short answer

| Layer | Same as pic↔pic? |
|-------|------------------|
| **Face math** (embed + compare score) | **Yes** — same engine / gallery math |
| **Product job** | **No** — different *corpus* and *result shape* |

### What you already have

| Feature | Job | Result |
|---------|-----|--------|
| **Verify 1:1** | Pic A vs Pic B | Match % |
| **Blacklist enroll** | Pic → gallery vector | Stored identity |
| **Live watch** | Stream frames vs gallery | Live crops + hit |
| **Load offline video** | Upload one file → sample frames → crops (± match gallery) | Rail cards from *that file* |

### What you’re asking for (challenge)

```
Query photo (or blacklist person)
  → search corpus (evidence videos / vault / dock uploads / FR snap ledger / offline jobs)
  → hit = snapshot (frame) + score + time + which video
  → Play that video scrubbed to the hit time
```

That is **retrieval + playback**, not just **verify**.

```
┌─────────────┐     embed      ┌──────────────────┐
│ Query photo │ ─────────────► │ Same FR vector   │
└─────────────┘                └────────┬─────────┘
                                        │ 1:N score
     ┌──────────────────────────────────▼─────────────────────┐
     │ Corpus (this is the hard part)                         │
     │  • Evidence library videos (timecoded frames)          │
     │  • Past FR snap ledger                                 │
     │  • Offline-processed jobs                              │
     │  • (Optional) live-only = not “search history”)        │
     └──────────────────────────────────┬─────────────────────┘
                                        │
                          hits: { jpg, t, videoId, cam, score }
                                        │
                          UI: snapshot strip → Play @ t
```

**Logically same:** “Does this face appear?” via embeddings.  
**Not the same product:** pic↔pic is one comparison; **video search** needs an **indexed timeline of faces in video**, then **seek playback**.

---

## Industry analogy (plain)

| Mode | Like |
|------|------|
| Verify 1:1 | “Are these two the same person?” |
| Live / offline vs blacklist | “Is this face on the watchlist *right now / in this file*?” |
| Pic → video search | “Where in our **recorded** video did this face appear?” (Axon / BriefCam–class *search*, not live alarm) |

---

## Recommended product shape (phased)

### Phase 0 — Already close (teach / polish)

**Blacklist + Load video** already does: enroll → process video → snapshots on rail if match.  
Gap: result is crop cards, **not** “open the evidence player at 01:23.”

**Quick win MOB (later):** offline **any face crop** (not only match) carries `tSec` + “Play from here” — investigation, not alarm-only. See `MOB-DISC-FR-PLAY-AT-INVESTIGATION.md`.

### Phase 1 — `mob-fr-query-pic-search-snaps` (lab)

- Pick query photo **or** pick blacklist person  
- Search **FR snap ledger** (already face crops + cam + time + GPS)  
- Results = thumbs; Open / Keep / Show on map  
- **No full video yet** — uses what you already store  

Same math as 1:N; corpus = ledger not live.

### Phase 2 — `mob-fr-query-pic-search-evidence-video`

- Index evidence videos (background or on demand): sample → faces → vectors + `{fileId, tSec}`  
- Query pic → ranked hits → **snapshot + Play** (Evidence player / route-trace scrubber style)  
- Heavy: storage, CPU, retention, permissions  

### Phase 3 — Continuous “face DVR index” (fleet scale)

- While recording / ingest, write face index for later search  
- Big architecture — not a single MOB  

---

## Your proposed flow mapped

| Step you said | Maps to | Have today? |
|---------------|---------|-------------|
| Blacklist | Enroll gallery | Yes |
| Search | 1:N vs corpus | Live + offline file yes; **history video library** no |
| Got snapshot | Hit crop | Yes (rail / ledger) |
| Play the video | Seek player to `tSec` | **Partial** — offline doesn’t jump Evidence player yet |

So: **same face engine**, **missing search index + play-at-timecode UX**.

---

## Honest risks

| Risk | Note |
|------|------|
| “Search all dock video forever” | Expensive; need scope (case / cam / date) |
| Same as Verify? | No — don’t overload Verify 1:1 UI |
| Crop delay vs search | Separate problems; warm-gate helps live only |
| Privacy / audit | Video search = investigation feature → log who searched what |

---

## Suggested order when you want code

1. **`mob-fr-crop-warming-ui`** (+ optional warm-gate) — fix “why no crop after call” feel  
2. **`mob-fr-query-pic-search-snaps`** — pic/blacklist → search snap ledger (prove UX)  
3. **`mob-fr-offline-crop-play-at`** — Play from **any** offline crop (investigation), not hit-only — see play-at DISC  
4. **`mob-fr-query-pic-search-evidence-video`** — real vault video search (big)

---

## Answers in one line each

| Question | Answer |
|----------|--------|
| Why delay after BWC call? | Stream must warm + poll + grab bytes + face gate — UI live ≠ crop-ready |
| Pic → video search possible? | **Yes**, same embeddings |
| Same as picture search picture? | **Same math, different product** (corpus + timecode + play) |
| Blacklist → search → snap → play? | Right workflow; today you have enroll + offline crops; **play-at-hit** and **vault index** are the gaps |

---

## No code in this DISC

Reply which challenge to tackle first: **crop warm delay** or **pic→snap search** or **play-at offline hit**.
