# MOB DISC — Pin popup balance: bigger type, thinner chrome gaps

**Status:** APPLIED — `MOB-APPLY-PIN-POPUP-BALANCE-TYPE` · 2026-07-19  
**Follows:** `MOB-APPLY-PIN-POPUP-SLIM-8` (PASS shape; polish)  
**Search:** pin popup type size, blue padding, chrome gap, readable dense  
**Boundary:** CSS chrome only in `public/index.html`; **no** pin video / mirror / ZLM / Call-PTT-Stop logic

---

## Balance concept (locked)

**Dense shell, readable type** — type up ~1–2px; Leaflet/head/bar/tel gaps down; video **118px** kept; one-line head kept.

---

## APPLIED targets

| Token | Was (SLIM-8) | Now |
|-------|--------------|-----|
| Title | 11px | **12px** |
| Short ID | 9px | **10px** |
| Badge | 8px | **9px** |
| Pin Leaflet content margin | 8×12 (global) | **4×8** (`.map-pin-popup-*` only) |
| Head margin-bottom | 4px | **2px** |
| − / × | 22 / 26 · top 8 | **20 / 22** · top **4** |
| Head padding-right | 70px | **60px** |
| Button label | 10px @ 28px tall | **11px** @ **28px** tall |
| Bar padding | 4px 0 0 | **2px 0 0** |
| Telemetry body / title | 8 / 7 | **9 / 8** |
| Tel margin/pad | 3 / 3 | **2 / 2** |
| Video height | 118px | **118 keep** |

**Operator:** hard refresh (Ctrl+F5) → 1 pin + 8-up visual PASS.

---

## One line

Bigger words + thinner blue shell; video and pin play path untouched.
