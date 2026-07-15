# MOB DISC — FR ops freeze · suspect truth · grade change SOP

**Status:** DISC 2026-07-11 — **`mob-fr-go-ops-freeze-fix` APPLIED** · tiered alert → `MOB-DISC-FR-GRADE-TIERED-ALERT-URGENCY.md` · engine port → `MOB-DISC-FR-ENGINE-LAB-TO-PORT.md`  
**Trigger:** Jump to Operations on FR hit → **nothing clickable** (must refresh); suspect test unclear; cannot upgrade/downgrade watch grade  
**Search:** ops freeze, suspect alert, blacklist, grade change, snap ledger, backlog, toast dead  
**Related:** `MOB-DISC-FR-ALERT-GO-OPS-MAP.md`, `MOB-DISC-FR-ACK-REPORT.md`, `MOB-DISC-FR-BLACKLIST-DOSSIER.md`, `MOB-DISC-FR-SNAPSHOT-RAIL-THRESHOLD.md`

---

## Plain answer (three questions)

| # | You asked | Truth today |
|---|-----------|-------------|
| **1** | Ops jump — nothing works until refresh | **Real bug** — not “by design”. Likely **map tab race + toast buttons never wired** (see below). |
| **2** | Suspect test — no alert? What does FR do? | **Suspect DOES alert** same as blacklist if match ≥ threshold. Socket name `fr-blacklist-hit` is **misleading**. Non-matches go to **snap ledger** + rail — no chime. |
| **3** | Change suspect → blacklist / caught? | **Not in UI today.** API PATCH only toggles **enabled**. Grade change needs **new MOB + SOP**. |

---

## 1) Operations freeze — root cause (code-checked)

### What you saw

FR hit → auto **Operations** → map/dead shell → **no buttons, no map, no tabs** → hard refresh.

### Likely causes (stacked)

| # | Cause | Evidence |
|---|--------|----------|
| **A** | **Leaflet map not resized** after tab switch from Analytics | Ops `map` was hidden (0×0). Pan/zoom before `invalidateSize()` → **invisible pane eats all clicks** — classic Leaflet bug. |
| **B** | **`mob-fr-hit-go-ops` timing** | `showFrSnapOnMap` runs **same tick** as tab show — no `requestAnimationFrame` + `map.invalidateSize()` delay. |
| **C** | **Red toast buttons dead** | Toast DOM created **lazily** on first hit; `bindUi()` ran earlier → **Ack / Dismiss / Open detail never attached**. HQ bar buttons may still work — if those also fail, (A) is primary. |
| **D** | Toast looks like modal trap | Red card is **not** fullscreen — but if map is dead underneath, **feels** like Ack is mandatory. |

### Not the main blocker

| Ruled out | Why |
|-----------|-----|
| Full-screen `#fr-alarm-backdrop` | Not auto-opened on hit (current path) |
| `pointer-events: none` on body | Not set for FR alert |
| Ack required for navigation | **Not coded** — but broken map mimics trap |

### Locked fix MOBs (apply in order)

| # | MOB | Fix |
|---|-----|-----|
| **1** | **`mob-fr-go-ops-freeze-fix`** | After tab → Ops: `invalidateSize` then pan; lazy toast bind; **Go to map** | **APPLIED 2026-07-11** |
| **2** | **`mob-fr-toast-actions-bind`** | Idempotent `bindRedToastUi()` on every toast create; enable **Go to map** → `goOpsOnHit(current)` |
| **3** | **`mob-fr-hit-map-sos-parity`** | Circle + nearby line (separate DISC) |

### PASS after #1

| Step | PASS |
|------|------|
| Analytics → FR hit | Lands Ops; **map pans**; pins clickable |
| Toast Ack / Dismiss | Works **without** refresh |
| HQ bar Ack | Works |
| Tab bar | Switch Analytics ↔ Ops anytime — **no Ack** |

```text
MOB-APPLY mob-fr-go-ops-freeze-fix
```

---

## 2) Suspect vs blacklist — what FR actually does

### Naming confusion (important)

| Name in code | Meaning |
|--------------|---------|
| `fr-blacklist-hit` socket | **Any watchlist match** — poi, monitoring, **suspect**, blacklist |
| Watchlist tab | UI label for gallery (`storage/fr-blacklist/`) |
| `listStatus` | Grade on each person |

**Suspect is not a separate engine.** One gallery, one `matchProbe()`, one alert path.

### Alert path (all enabled grades)

```
BWC live (in watch set)
  → frLivePoller grab + embed
  → matchProbe (threshold default 75%, slider 70–99)
  → score ≥ threshold + enabled entry
       → fr-blacklist-hit → toast + HQ bar + chime + rail match card
  → score < threshold OR no face
       → fr-crop-tick (rail) + frSnapLedger (disk) — NO alert
```

### Your screenshot (`ss · 79.2%`)

That **is** a working alert — enrolled person **ss** matched. It does **not** prove **Leia** matched.

### Why Leia (suspect) may not alert

| Check | Action |
|-------|--------|
| **Watch running** | Start watch; Leia’s BWC must be in 32 set **and** one of 6 live slots (or probe queue when Act 2 ships) |
| **Same face as enroll photo** | Live score often **lower** than studio enroll — try threshold **72** temporarily |
| **Enabled** | Row must be **Active** not Disabled |
| **Face in frame** | Rail shows snaps — if empty or “no match %”, engine never saw a good face |
| **Wrong person on cam** | Match is 1:N — alerts **who** matched, not who you intended to test |

### What is kept when there is **no** alert (backlog)

| Store | Path | UI today |
|-------|------|----------|
| **Snap ledger** | `storage/fr-snap-ledger/` (`index.jsonl` + crops) | **API only** `GET /api/analytics/fr/snaps` |
| **Rolling rail** | Last 16 cards on Analytics | Ephemeral — shows score on click/lightbox |
| **Audit** | Server log on **hit** ack/dismiss/field alert | Admin export |
| **Hit history** | — | **Not built** (`mob-fr-ack-incident-record`) |

**There is no “suspect-only backlog”** — non-matches are **all grades combined** in snap ledger with `match: false`.

### Should grades alert differently? (future — not today)

| Grade | Proposed UX (locked for later MOB) |
|-------|-----------------------------------|
| `poi` / `monitoring` | Rail + ledger only — **no** red toast (silent watch) |
| `suspect` | **Amber** toast + HQ bar — investigate |
| `blacklist` | **Red** toast + chime — full alert |

**Today:** all grades = **red full alert**. Explains why suspect feels same as blacklist.

```text
MOB-APPLY mob-fr-grade-tiered-alert   # later — after freeze fix
```

---

## 3) Grade change — upgrade / downgrade / caught SOP

### Today

| Action | UI | API |
|--------|-----|-----|
| Enroll | Form with grade dropdown | `POST /api/analytics/fr/blacklist` |
| Disable | Button | `PATCH` `{ enabled: false }` |
| Remove | Button | `DELETE` |
| **Change grade** | **None** | **None** |
| **Mark caught** | **None** | **None** |

**You are right** — operators need **promote / demote / caught** without re-enroll.

### Locked grade ladder

```
poi → monitoring → suspect → blacklist
         ↓ demote          ↓ caught (terminal note)
```

| Transition | Operator meaning | System |
|------------|------------------|--------|
| **Upgrade** | More scrutiny (e.g. suspect → blacklist) | `listStatus` change + audit + optional re-alert policy |
| **Downgrade** | False alarm / cooling off | `listStatus` down + audit reason |
| **Caught** | Apprehended / resolved | `listStatus` → `monitoring` or disable + `lastIncident` + sighting report |
| **Disable** | Off watch | existing |

### Locked SOP (operator steps)

| Step | Action |
|------|--------|
| 1 | Open **Analytics → Watchlist** → click person name (detail drawer) |
| 2 | **Change grade** dropdown + **reason** (required on upgrade to blacklist) |
| 3 | Optional note: “caught at …” / “FP on rail snap …” |
| 4 | **Save** → audit `analytics.fr_watchlist_grade_change` |
| 5 | If upgrade to blacklist from suspect → optional “issue alert on next sighting” toggle (default on) |

**Who:** super-admin / FR manager role (same as enroll today).

**Not:** editing grade from FR toast mid-alert (v2 — “promote this hit to blacklist” quick action).

### MOB plan

| # | MOB | Delivers |
|---|-----|----------|
| **1** | **`mob-fr-watchlist-grade-patch`** | `frBlacklist.updateGrade(id, { listStatus, reasonCode, reasonOther, notes })` + `PATCH` body |
| **2** | **`mob-fr-watchlist-grade-ui`** | Detail drawer: grade dropdown, Save, audit toast |
| **3** | **`mob-fr-watchlist-caught-sop`** | **Caught** preset: disable or demote + `lastIncident` timestamp + link to sighting report MOB |
| **4** | **`mob-fr-toast-show-grade`** | Toast line: `Suspect · ss · 79%` (grade badge visible) |

```text
MOB-APPLY mob-fr-watchlist-grade-patch
MOB-APPLY mob-fr-watchlist-grade-ui
```

---

## Priority order (whole genre)

| Priority | MOB | Why |
|----------|-----|-----|
| **P0** | `mob-fr-go-ops-freeze-fix` | **Blocks all dispatch** — your refresh kill |
| **P1** | `mob-fr-hit-map-sos-parity` | Map useful after landing on Ops |
| **P2** | `mob-fr-snap-ledger-ui` | See non-match / suspect test backlog |
| **P3** | `mob-fr-watchlist-grade-ui` | Upgrade Leia suspect → blacklist |
| **P4** | `mob-fr-grade-tiered-alert` | Suspect amber vs blacklist red |
| **P5** | `mob-fr-ack-incident-record` | Durable hit history after Ack |

---

## FAQ

**Q: Is toast + PTT useless without map?**  
A: **Today yes** when Ops freezes or map has no incident overlay. **After P0 + map parity** — no.

**Q: Did FR “not work” for suspect?**  
A: Engine works for **all grades**. Test may have matched **ss** not **Leia**, or Leia never crossed threshold on live grabs. Check rail % and `storage/fr-snap-ledger/`.

**Q: Should we auto-open Ops?**  
A: **Yes** — keep `mob-fr-hit-go-ops` but **fix freeze** before more alert MOBs.

**Q: One tab for operational?**  
A: Use existing **Operations** tab — do not add a new tab. FR is an **overlay** on Ops map (same as SOS).

---

## Bottom line

| Issue | Verdict | Next APPLY |
|-------|---------|------------|
| Ops dead after hit | **Bug** | `mob-fr-go-ops-freeze-fix` |
| Suspect vs blacklist | **Same alert today**; tiered later | Test with ledger API + lower threshold |
| Grade change | **Missing** — needs MOB + SOP | `mob-fr-watchlist-grade-patch` |

Your feedback is correct: **shipping go-ops without map safe-init made dispatch worse, not better.** Fix freeze first, then map parity, then grade SOP.
