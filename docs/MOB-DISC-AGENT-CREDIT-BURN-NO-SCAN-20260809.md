# MOB DISC — Agent credit burn / no drive-by scan (2026-08-09)

**Status:** LOCKED. Operator complaint: work looked small, credits burned; agent felt like it was scanning the codebase.  
**Wins over:** “be thorough”, helpful sprawl, parallel greps “just in case”.

---

## What actually happened (this session’s copy APPLY)

`OPS-CASE-UI-COPY-PLAIN-V1` was a **small** change:

- Rewrote 3 i18n strings + matching HTML fallbacks  
- Softened Cases load error so HTML/login pages don’t dump raw parse text  
- Cache-bust `ops-cases-ui.js`  
- Updated the jargon death-penalty disc  

That is **not** a big product rewrite. If credits jumped hard on that turn, the burn was **agent overhead** (extra greps, long context, re-reading files, chatter) — not “huge code delivered.”

---

## Death-penalty agent rules (credits)

1. **No autonomous codebase-wide scans** unless the user explicitly asks to search/scan/audit the whole tree.  
2. **No drive-by greps** “to be safe” across `public/`, `server.js`, docs when the APPLY names exact files/strings.  
3. **Token-lean patches only** — change the few lines that must change; never rewrite whole files.  
4. **One APPLY = one job** — no bundling extras, no “while I’m here” refactors.  
5. **Read only what the APPLY needs** — open the named string/file; stop.  
6. **Paper MOB DISC OK without APPLY** — short. Do not scan to write a disc.  
7. Existing rules still win: `token-lean.mdc`, `me8-token-lean-patches`, `me8-zero-change-without-apply`.

If unsure → ask one short question. Do **not** explore the repo to invent work.

---

## Operator-facing promise

- Small APPLY → small tool use → small reply.  
- Scanning / “map the codebase” only when you order it.  
- Credits are yours — agent must not burn them on curiosity.

---

## Reminder to agent (every session)

Acknowledge lean mode. Prefer: open known path → patch → done.  
Do not open Task explore agents, multi-file greps, or parallel “find everything” for a copy/string MOB.
