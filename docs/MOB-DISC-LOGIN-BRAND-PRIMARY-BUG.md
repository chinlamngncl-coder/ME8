# MOB DISC — Login showed “Brand Primary / Brand Accent”

**Status:** FIXED 2026-07-13 — bug, not a product rename  
**Search:** Brand Primary, Brand Accent, humanizeKey, login.brandPrimary  

---

## Plain answer

That text was **not** a new brand.  
It was a **broken translation**: missing English strings → the app turned the code key names into words:

| Code key | Broken screen text |
|----------|-------------------|
| `login.brandPrimary` | **Brand Primary** |
| `login.brandAccent` | **Brand Accent** |

Same class of bug as the old bell **Label**.

**Real product name remains Mobility Axiom** (Ubitron logo + Mobility + Axiom).

---

## Cause

Agent added `login.brand*` keys earlier; English pack lost those keys after the Axiom revert. Login page still pointed at the dead keys.

---

## Fix

- Login wordmark uses the same keys as the main app: `header.appNamePrimary` / `header.appNameAccent` → **Mobility** / **Axiom**
- Removed brittle `login.brand*` keys

---

## Rule (locked)

1. Do not invent extra brand i18n keys when `header.appName*` already exists.  
2. Never ship a login key that can humanize to nonsense (“Brand Primary”).  
3. Product face = **Mobility Axiom** unless user explicitly orders a rename.

---

## Related

- `MOB-DISC-BRAND-AXIOM-NOT-C2.md`  
- `MOB-DISC-MISSED-BELL-NO-LABEL.md` (same humanize trap)  
- `MOB-DISC-NO-SILENT-CHANGE.md`  
