# MOB DISC — FR roster pin: emoji FAIL → ASCII / SVG only

**Date:** 2026-07-23  
**Status:** PAPER — L1 encoding MOB **FAIL** (operator). No APPLY until you name the fix.  
**Prior APPLY:** `FR-ROSTER-PIN-ICON-ENCODING-V1` (`\0001F4CC` → still garbage / wrong glyph — operator: “another icon. WTF”)

---

## What went wrong

Emoji in CSS `content:` is **not safe** on this lab pipeline (UTF-8 ↔ Windows save/serve).  
First rot showed `ðŸ“C`. Escape `\0001F4CC` still failed visually (`ĜCO` / junk).  

**Lesson:** Do **not** use 📌 / other emoji for FR roster chrome. Same class of bug as wall/dock encoding — emoji is the wrong tool here.

---

## Locked fix (when you APPLY)

**Phrase:** `MOB-APPLY FR-ROSTER-PIN-ICON-ASCII-V1`

| Do | Don’t |
|----|--------|
| `content: "PIN";` (or `"Pin"`) with small bold type **or** tiny **SVG data-URI** pin as `background-image` | Any emoji / `\1F4CC` / raw UTF-8 pictograph in CSS |
| Keep button `id`/`data-cam` / classes for JS | Change roster JS wiring |
| Ctrl+F5 verify | Bundle FR-dead diagnose in this MOB |

**Agent pick:** Prefer **`content: "PIN"`** — zero encoding risk, readable, matches “pin to tile” title. SVG only if you want a graphic after PIN text PASS.

---

## Stage reminder

- **L1 emoji encoding** → **FAIL** (this disc)  
- **Next:** `FR-ROSTER-PIN-ICON-ASCII-V1` → then L2 `FR-LIVE-DEAD-DIAGNOSE-V1`

---

## Agent must not

- Try another emoji “that might work”  
- Touch `video-wall.js` / map for this  
- Claim L1 PASS until operator sees clean **PIN** (or agreed SVG)
