# MOB DISC — FR rail: threshold honesty, clean Snapshot UI, continuous snaps

**Status:** DISC locked 2026-07-10 — **`mob-fr-snapshot-rail-clean` + `mob-fr-snapshot-rolling` APPLIED**; threshold default still pending  
**Search:** `73.7%`, `no match`, `MATCH_MIN`, `FM_FR_POLL_SEC`, `BEST_FRAME`, crop rail, `watchlistStub`  
**Cue:** Rail card `Chin - 1 face - 73.7% - no match` · one card after ~5 s face-to-BWC · Watchlist stub box under rail  
**Related applied:** `mob-fr-best-frame-window`, `mob-fr-probe-quality-gate`, `mob-fr-crop-rail-8-compact`, **`mob-fr-snapshot-rail-clean`**, **`mob-fr-snapshot-rolling`**

---

## Your complaints (accepted)

1. **73.7% / no match** on an obvious face — is the threshold too high, or is DeepFace weak?  
2. **Rail copy is noise** — draw the crop box only (or a **Snapshot** header); no long meta line on the card.  
3. **Watchlist stub under the rail is useless** — take the box off; at most 1–2 small hint lines, no card.  
4. **Snapshots must roll** — face on BWC for ~5 s → only **one** rail card. Industry = continuous snaps while the face is there.

---

## 1) Threshold vs model — honest verdict

| Fact | Meaning |
|------|---------|
| Default alarm bar | **75%** (`FM_FR_MATCH_MIN` / slider; code floor **70**) |
| Your sample | **73.7%** → below 75 → **no match by design** (not a UI bug) |
| What “Chin” means on that card | **Device label** (BWC Chin), **not** “matched person = Chin” |
| Live score | Cosine similarity of Facenet embeddings × 100 (`frBlacklist.matchProbe`) — **not** DeepFace.verify’s distance→% map |
| Sidecar verify % map | Separate path; docs call it **provisional** |

**Verdict (both, not either/or):**

- **Threshold is a bit high for field BWC** for this sample — 73.7% is one click under the default alarm bar. Lowering the slider toward **70–72** would have fired an alarm *if* that score was against the enrolled person you care about.  
- **Facenet on BWC stills is not cloud-grade.** Same-person field scores often sit mid-70s when enroll was a clean ID and the live frame is angle/light/compression. A “very obvious” human face ≠ automatic 90%+ embedding match.  
- **Alarm must stay stricter than “any face.”** Crop rail can show faces without alarming; alarm only when score ≥ threshold. That split is correct product design.

**Do not** treat “no match at 73.7%” as proof DeepFace is broken. Treat it as: **calibrate threshold + enroll quality + expect BWC scores lower than studio ID photos.**

**Suggested product defaults (for APPLY discussion):**

| Knob | Today | Candidate |
|------|-------|-----------|
| Default match threshold | 75 | **72** (still ≥ code floor 70) — fewer “obvious miss” misses; watch false alarms |
| Rail shows non-matches | Yes | Keep (operator sees activity) |
| Alarm / chime | Only ≥ threshold | Keep |

---

## 2) UI — Snapshot rail + kill Watchlist stub

**Today**

- Crop card = thumbnail + meta: `Chin · 1 face · 73.7% · no match` (`fr-alarm.js` `pushCrop`)  
- Under rail: boxed **Watchlist** + stub *“Open the Watchlist tab…”* (`index.html` `.ax-fr-blacklist`)

**Locked UI rule**

| Element | Rule |
|---------|------|
| Rail header | **Snapshot** (one word) |
| Each snap | **Image only** (border box). No device/score/“no match” on the card. Optional: red border only when match ≥ threshold |
| Score / name | Alarm popup / chime only — not on every rail card |
| Watchlist stub box | **Remove** from Face live panel. Enrollment lives on Watchlist tab. Optional: one tiny hint line under Snapshot, no bordered card |

---

## 3) Why only one snap in ~5 seconds (root cause)

**By design after `mob-fr-best-frame-window`:**

```
every POLL_SEC (~4 s default FM_FR_POLL_SEC)
  → grab 3 stills (~350 ms apart)
  → pick sharpest
  → emit ONE fr-crop-tick to the rail
```

So ~5 s face-to-lens ≈ **one** rail card. That was anti-mush / anti-spam. It is **not** industry “rolling snapshot strip.”

Industry bodycam / VMS face strip usually:

- Keep **detecting on a short cadence** (sub-second to ~1 s)  
- **Append** crops to the strip while a face is present  
- Use best-frame / dedupe for **alarms**, not to starve the Snapshot rail

**Locked cadence rule**

| Path | Behavior |
|------|----------|
| **Snapshot rail** | Keep rolling — emit a crop whenever a usable face is seen (faster poll and/or emit each good grab, not only one winner per 4 s window) |
| **Alarm / blacklist hit** | Still best-frame + threshold + hit dedupe (`HIT_DEDUPE_MS`) — do not chime on every frame |

---

## Suggested APPLY order (one MOB at a time)

| # | MOB | Intent | Status |
|---|-----|--------|--------|
| 1 | `mob-fr-snapshot-rail-clean` | Header **Snapshot**; image-only cards; remove Watchlist stub box from Face panel | **APPLIED 2026-07-10** (`fr-alarm.js`, `index.html`, `en.json`) |
| 2 | `mob-fr-snapshot-rolling` | Faster continuous rail emits (tune `POLL_SEC` / emit good grabs; keep alarm best-frame + dedupe) | **APPLIED 2026-07-10** — default `FM_FR_POLL_SEC=2`; each good grab → `fr-crop-tick`; alarm still best-of-window + `HIT_DEDUPE_MS`. Set `FM_FR_ROLLING_RAIL=0` to revert rail to one card/window. |
| 3 | `mob-fr-match-default-72` | Default threshold **72** (slider still 70–99) — only if soak after (1)(2) still feels “obvious miss” | Pending |

Do **not** bundle with fleet ghost MOB.

---

## Bottom line

- **73.7% no match** = under **75%** bar + Facenet-on-BWC reality — not “UI forgot to match.”  
- **Rail text + Watchlist stub** = clutter; Snapshot box only.  
- **One snap / 5 s** = best-frame window working as coded; you want the **opposite for the strip** — rolling snaps, strict alarm.

Reply when ready, e.g.  
`MOB-APPLY mob-fr-snapshot-rail-clean`  
then  
`MOB-APPLY mob-fr-snapshot-rolling`
