# MOB DISC — Rename toolbar “Matches” (not an alert list)

**Status:** **APPLIED 2026-07-13** — label **Known subjects** (operator chose this wording; MOB asked as `mob-fr-hits-rename-watchlist-hits`)  
**UI:** Far-right toolbar chips · `analytics.fr.matchesShort` = **Known subjects**  
**Note:** Cutover checkpoint still **FAIL** on live match — rename does not fix scoring.

---

## Why “Matches” feels wrong

| Problem | Detail |
|---------|--------|
| Sounds like **alerts** | Operators hear “match” = red toast / blacklist panic |
| Grades are mixed | POI / monitoring / suspect / blacklist can all land here |
| Quiet by design | Many rows are **not** interrupt alerts — just known-subject hits on desk |
| Forensic tone | “Match” overclaims; threshold met ≠ courtroom ID |

So: keep the **chips**; change the **name** to “watchlist / known-subject tray,” not “alert list.”

---

## Suggested words (pick one)

### Strong (recommended)

| Label | Tone | Fits because |
|-------|------|----------------|
| **Watchlist hits** | Ops / industry | Clear: gallery person cleared threshold; not “alarm” |
| **Subject hits** | Forensic / FR | Known subject vs unknown face; used in facial ID workflows |
| **Known subjects** | Soft / desk | Emphasizes *who*, not alarm urgency |
| **Watch hits** | Short | Same idea as Watchlist hits; fits toolbar |

### Also good

| Label | Tone | Note |
|-------|------|------|
| **Gallery hits** | Technical | Accurate (1:N gallery); a bit IT-ish for operators |
| **ID hits** | Short | Fast; can confuse with ID card / Verify 1:1 |
| **Listed** | Minimal | Very short; maybe too vague |
| **Subjects** | Minimal | Clean; less clear that score ≥ threshold |

### Avoid

| Label | Why not |
|-------|---------|
| **Matches** | Current — alert-shaped |
| **Alerts** / **Alarms** | Wrong for POI/monitoring; fights grade tiers |
| **Suspects** | Only one grade; mislabels POI / blacklist |
| **Hits** alone | Too slang / game-like without “watchlist/subject” |
| **Detections** | Any face — that’s **Recent**, not this strip |
| **Positive IDs** | Overclaims forensic certainty |

---

## Locked product meaning (name must fit)

> “Known watchlist person · score ≥ threshold · on-desk sticky chips · urgency by **grade**, not by this label.”

Recent = any face.  
This strip = **watchlist / known-subject** only.  
Red toast = blacklist (and soft path for suspect later) — **not** this title.

---

## Recommendation (agent pick if you say “just go”)

**1st:** **Watchlist hits** — clearest for operators  
**2nd:** **Subject hits** — better if you want forensic / investigation tone  
**Short toolbar:** **Watch hits** if space is tight  

Subtitle optional (usually hide): `Threshold met · not all alerts`

---

## MOB when you choose a word

```text
MOB-APPLY mob-fr-hits-rename-<slug>
```

Examples:

```text
MOB-APPLY mob-fr-hits-rename-watchlist-hits
MOB-APPLY mob-fr-hits-rename-subject-hits
MOB-APPLY mob-fr-hits-rename-watch-hits
```

Touches: `en.json` (+ other locales if present) · `index.html` aria-label · `fr-alarm.js` `tr(...)` fallback. No layout change.

---

## Bottom line

“Matches” → rename to a **watchlist/known-subject** phrase.  
Best defaults: **Watchlist hits** or **Subject hits**.  
Say which word (or APPLY with slug above).
