# MOB DISC — Header bell must not show “Label”

**Status:** **APPLIED 2026-07-12** — `mob-missed-bell-copy`  
**Search:** missed bell, Label, missedActivity.bellText, Alerts, humanizeKey  
**APPLY name:** `mob-missed-bell-copy`

---

## Plain answer

**“Label” next to the bell is dumb.** It was an engineer accident (i18n key `.label` → humanize → **Label**).

**Now:** caption = **Alerts** (ops word). Key = `missedActivity.bellText`. All locales have the strings. `tr()` ignores humanize leftovers.

Trial Test 2 CLIENT zip was **not** rebuilt (ship already handed off). ME8 lab gets the fix.

---

## Files

| File | Change |
|------|--------|
| `public/js/missed-activity.js` | `bellText` + safer `tr()` |
| `public/index.html` | default **Alerts** + cache-bust |
| `public/locales/{en,fil,ko,id,th,zh}.json` | `missedActivity.*` + `bellText` |

---

## Record

| Item | Result |
|------|--------|
| Caption | **Alerts** |
| Old key `.label` | Removed |
| Test 2 zip | Unchanged (by design) |
