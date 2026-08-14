# MOB-DISC Snapshot format_reject after static sidecar — 2026-08-13

**Status:** diagnosis / planning. **No APPLY.**  
**Operator symptom:** Snapshot → Read plate → *“No reliable plate read — the text did not match a valid plate format…”* (`anpr.format_reject`).  
**Photo:** clear PH plate **`NDC 5447`** (also already on Plate lists as `NDC5447` / Suspicious). Bumper also shows **`BGY 3-09118`**.  
**Bat log shown:** only `GET /health` + `GET /watch/events` **200** — no `POST /read` lines in the paste.

---

## Verdict (plain English)

1. **Sidecar is running.** Health + watch/events 200 means Phase-1 live-removal quieting worked. That is **not** the Snapshot failure.
2. **Snapshot OCR path is reaching Node and failing the plate-format gate** (UI code `anpr.format_reject`). The plate you can see with your eyes is fine; the **software did not accept the OCR string as LTO syntax** (`AAA 123` / `AAA 1234`).
3. **Most likely cause:** RapidOCR **merges every text line** on the crop into one string (`rapid_ocr_engine.py` joins all lines). This crop has **two** Latin strings (bumper fleet ID + real plate). Merged junk / wrong candidate (e.g. latching onto `BGY…`) fails the LTO emit gate → Node maps to format reject (or closely related syntax reject).
4. **Secondary check:** when you click **Read plate**, the ANPR bat **must** show `POST /read`. If it never does, Fleet is not calling the sidecar (wrong process / old Node). Your earlier failure mode after Node-compat fix is consistent with `/read` returning `ok:false` + format/syntax error — so look for `RAW OCR RESULT:` on the next try.

`NDC5447` alone **would** pass `^[A-Z]{3}\s?\d{3,4}$`. So this is not “lists broken” and not “Live 410 broke Snapshot.”

---

## What is working

| Piece | Status |
|-------|--------|
| Python bind `:8768` | OK |
| Stage-2 YOLO weights | READY in log |
| `/watch/events` empty 200 | OK (Live dead; poller quiet) |
| Plate lists UI | OK (`NDC5447` Suspicious) |
| Snapshot upload UI | OK (file + crop UI) |

---

## What is failing

| Piece | Status |
|-------|--------|
| Snapshot publish of `NDC 5447` | FAIL — format/syntax gate after OCR |
| Operator-visible OCR string | Unknown until bat shows `RAW OCR RESULT:` |

---

## Root cause (locked hypothesis)

**Blind multi-line OCR merge + bumper text on the same crop** → invalid / wrong plate candidate → `format_reject` / `syntax_reject` → Snapshot red banner.

Not: missing sidecar. Not: Live tab. Not: plate-list match (match only runs after `ok` + plate).

---

## Operator re-test (no code)

1. Restart `START-ANPR.bat`.  
2. Snapshot → crop **tight on the metal plate only** (exclude bumper `BGY…` if possible) → Read plate.  
3. Watch bat for: `POST /read` and `RAW OCR RESULT: …`.  
4. Tell agent that raw line (or screenshot of bat).

If tight crop **PASS** → confirms bumper/merge hypothesis.  
If tight crop still **FAIL** → need raw OCR string (different bug: empty OCR, blur gate, no vehicle, etc.).

---

## Recommended next APPLY (when ordered)

**Name:** `ANPR-RAPID-OCR-BEST-LTO-LINE-V1`  
**Scope:** `anpr-sidecar/rapid_ocr_engine.py` (+ tiny dual/pipeline only if needed). **Do not** touch Node / FR / WVP.

**Change:**

1. After RapidOCR lines, **do not** only `"".join` all lines.  
2. Prefer the **single line** (or candidate) that passes existing `validate_lto_plate_syntax` / PH finder (`NDC5447`).  
3. If several match, pick highest confidence.  
4. Keep merge only as last resort, then run PH finder on the merged string.  
5. Optional: map `syntax_reject` in Node `anprErrors` to the same operator format message (clarity only — separate tiny MOB if desired).

**Non-goals:** restore Live watch; new FTP tab; loosen LTO regex to accept bumper IDs.

---

## Related

- Compat APPLY done: `ANPR-STATIC-READ-NODE-COMPAT-V1` (ok/plate fields + events 200).  
- FTP library plan: `MOB-DISC-ANPR-FTP-SNAPSHOT-LIBRARY-PLAN-20260813.md` (unchanged).
