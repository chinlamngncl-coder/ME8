# MOB DISC — Where Retention Categories UI lives (2026-08-09)

**Status:** LOCKED. **No code.** Operator: Admin → Retention categories — Settings or Evidence?

---

## Recommendation (one place)

**Put it in Evidence, as its own hub heading/nav** — Super admin only.

| Place | Verdict |
|-------|---------|
| **Evidence → Retention** (new nav, like Storage / Library / Redacted Exports) | **YES — primary** |
| Settings → Configuration only | Secondary link OK later; **not** the only home |
| Buried inside Library with no nav | **No** — too easy to miss |

---

## Why Evidence (not only Settings)

1. Retention is about **evidence files** (categories on clips) — same desk as Library / Storage / Redacted Exports.  
2. Axon calls it Admin, but ME8 already puts **Storage / dock paths** under **Evidence** for Super admin — same family.  
3. Operators already open Evidence for media; Super admin configures policy **next to** where files live.  
4. Settings stays for site-wide (SIP, users, license). Retention categories are **evidence policy**, not SIP config.

---

## What the UI looks like (when APPLY)

```text
Evidence hub nav (Super admin sees):
  Overview | Library | Cases | Case Files | Redacted Exports | Storage | Retention
                                                                      ↑
                                                         categories list
                                                         Add: name + days OR “Until manually deleted”
```

- Ordinary ops: **nav hidden** or read-only “view categories” if needed — **edit = Super admin**.  
- Assigning a category to a **file** = on Library / case bind detail (later), not on this admin page.

---

## APPLY name (when you want it)

Already on map: `EVIDENCE-RETENTION-CATEGORIES-V1`  
Scope: Evidence hub panel `#ev-panel-retention` + Super admin gate + store category defs (JSON/config under storage — not FTP).

Optional later: Settings page one-line “Open Evidence → Retention” link — **not required for v1**.

---

## One line

**Retention categories = Evidence hub heading (Super admin), beside Storage — not buried only in Settings.**
