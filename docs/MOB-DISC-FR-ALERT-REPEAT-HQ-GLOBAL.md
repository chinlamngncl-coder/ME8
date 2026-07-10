# MOB DISC — FR alert: repeat for noisy field · HQ banner on all pages

**Status:** Field repeat + pace **APPLIED** · HQ bar **APPLIED** `mob-fr-hq-global-alert-bar` 2026-07-10  
**Search:** HQ global alarm, all pages, fr-hq-alert-bar, sticky strip  
**Related:** `MOB-DISC-FR-FIELD-ALERT-ONE-BEEP.md`, `MOB-DISC-FR-FIELD-ALERT-PTT-MSG.md`

---

## Field — **APPLIED**

| MOB | Status |
|-----|--------|
| `mob-fr-field-alert-repeat-10` | ~10 dual-beeps |
| `mob-fr-field-alert-pace-20ms` | 20 ms paced send |

---

## HQ — **APPLIED** `mob-fr-hq-global-alert-bar`

| Piece | Behavior |
|-------|----------|
| `#fr-hq-alert-bar` | Fixed top strip — **all shell pages** |
| Content | `FR hit — Name · cam · score%` (+N if queued) |
| Actions | **Open** (modal) · **Ack** · **Dismiss** |
| Until | Ack / Dismiss (bar stays if you leave FR page) |
| Files | `fr-alarm.js`, `index.html` CSS/markup, `en.json` |

Hard refresh after deploy (`?v=20260710-hq-bar`).
