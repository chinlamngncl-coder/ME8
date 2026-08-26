# MOB-DISC — UI chrome: sentence case, acronyms, no Config, no &

**Date:** 2026-08-17  
**APPLY:** `MOB-APPLY UI-COPY-SENTENCE-CASE-V1`  
**Scope:** Operator-facing **headings, subtabs, section titles, card titles, field labels** (`en.json` + HTML fallbacks) + CSS that **forces uppercase** on those titles. Not officer-typed data, not Case IDs, not logs, not manuals.

Operator-locked chrome (do **not** “correct” to first-word-only / GOV.UK). Principal words capital; small words (`and`, `or`) stay lower; acronyms shout.

## Locked voice

| Kind | Rule | Example |
|---|---|---|
| Heading / tab / field label | Principal words capital | `Deployment Type` · `IP Assignment` · `Evidence and Docking` · `Command Wall` |
| Small words in the middle | Stay lower | `and` in `Evidence and Docking` · `Route and GPS` |
| Forbidden flattening | Never | `Command wall` · `Evidence and docking` · `IP assignment` |
| Acronyms | Stay shouted | FTP, GPS, SSO, BWC, SOS, NAS, USB, OIDC, HQ, IP |
| After a leading acronym | Capitalize the **next** word | `FTP Host (for docks)` · `IP Assignment` |
| Parenthetical | Lower unless a proper name | `(for docks)` |
| Card status sentence (not a label) | Full sentence OK | `Dashboard users, identity, and map groups` |
| Lazy stems | Ban in chrome | **Config** → Settings / the real noun. No “Unassigned”, no “Purge” in new copy |
| Ampersand **`&`** | **Do not use** in tabs/headings | `Route and GPS` not `Route & GPS` |

**Does proper software use `&`?** In nav, some products still do (short labels). For this product: **no**. Use **and**. Keep `&` only inside a legal name we do not own.

Status chips (Live, SOS) may stay short uppercase. Those are badges, not titles.

## Why copy-only fails

Settings (and some cards) use `text-transform: uppercase` on `h4` / section titles. If we only change the words, the screen still SHOUTS. APPLY must set those **title** rules to `text-transform: none` (scoped; do **not** retouch global `.enterprise-card label { display:block }`).

## APPLY does (agent, not a 70-key dump)

1. Evidence hub nav (pic 3): `Evidence and Docking` · `Docking Operations` · `Route and GPS`.  
2. Field labels like FTP Host (for docks).  
3. `en.json` + matching HTML fallbacks for headings/tabs/titles.  
4. Kill uppercase transform on chrome titles.  
5. Replace leftover **Config** in those chrome strings.

Operator PASS/FAIL on what they see after one hard refresh. No homework list.

## Out of scope this APPLY

Case File narrative human layout (`CASE-FILE-NARRATIVE-HUMAN-V1`). Tactical map. Firmware Gold video files.
