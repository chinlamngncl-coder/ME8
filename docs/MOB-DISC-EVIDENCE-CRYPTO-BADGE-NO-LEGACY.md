# MOB DISC — Evidence badge **“Plaintext (legacy)”** = forbidden UI junk

**Status:** APPLIED 2026-07-16 — `mob-evidence-crypto-badge-no-legacy-v1` → `docs/MOB-APPLIED-EVIDENCE-CRYPTO-BADGE-NO-LEGACY-V1.md`  
**Was:** FAIL / DISC locked 2026-07-16  

**Search:** `plaintext legacy`, `stupid words`, `crypto badge`, `no legacy UI`  
**Operator:** already ruled — do **not** put words like **legacy** on the product face. Screenshot: Status → gold chip **Plaintext (legacy)**.

---

## What that chip is

| Fact | Detail |
|------|--------|
| Meaning (internal) | File on disk is **not** MEV1 encrypted evidence — normal playable video bytes |
| Code | `cryptoStatus === 'plaintext'` → `tr('evidenceHub.cryptoPlaintext')` |
| String today | `public/locales/en.json` → `"Plaintext (legacy)"` |
| Render | `public/js/evidence-hub.js` → `cryptoStatusLabel()` |

**“Legacy” here is agent/dev slang** (“old unencrypted files”). It is **not** a customer word. It violates operator-facing naming discipline.

Same smell as OEM ban / no tech dump on UI: operator sees **stupid badge**, not a useful status.

---

## Locked rule (UI)

**Forbidden on Evidence Hub (and any operator UI):**

- `legacy`
- `Plaintext (legacy)`
- Similar: `deprecated`, `old path`, `compat mode` as badges

**Allowed idea (when APPLY):** plain status only, e.g.

| Internal `cryptoStatus` | Operator label (EN draft) |
|-------------------------|---------------------------|
| `encrypted` | **Encrypted** (keep AES only if already accepted — or just Encrypted) |
| `plaintext` | **Not encrypted** or **Standard** — pick one in APPLY, **no “legacy”** |
| `missing` | **File unavailable** (keep) |

Other locales that copied the same junk must match.

---

## Not this MOB

- Do not change crypto engine / encrypt-on-ingest  
- Do not baseline restore  
- Do not touch live / ZLM  

---

## Next (needs MOB-APPLY)

**`mob-evidence-crypto-badge-no-legacy-v1`**

- Rewrite `evidenceHub.cryptoPlaintext` (all locale packs that have it)  
- Drop “(legacy)” forever  
- Hard refresh Evidence detail — chip must not say legacy  

---

## One line

**“Plaintext (legacy)” is a forbidden UI string. File is just not encrypted. APPLY rename badge — no restore, no crypto rewrite.**
