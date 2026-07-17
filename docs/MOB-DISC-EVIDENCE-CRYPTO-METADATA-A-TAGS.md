# MOB DISC — `mob-evidence-crypto-metadata-A-tags`

**Status:** DISC only — **decision locked**. No code until `MOB-APPLY mob-evidence-crypto-metadata-A-tags`.  
**Parent genre:** `mob-evidence-crypto-metadata` (PNP domain C remainder).  
**Risk:** **2** — Evidence Hub + SQLite meta only.  
**Search:** `evidence tags`, `AES chip`, `catalog filter`, `crypto metadata A`

---

## What this MOB is (and is not)

| In scope (A) | Out of scope |
|--------------|--------------|
| User **tags** on evidence files | Rewrite `evidenceCrypto` / MEV1 |
| Catalog **filter by tag** | Encrypt timing / vault key changes |
| **At-rest crypto status** chip on detail (+ optional catalog column) | Secure-export rewrite |
| Audit on tag save (reuse `evidence.meta_update`) | Wall · PTT · SIP · SOS · VC |
| en locale keys (+ note other langs later) | Brochure / POC docs |

**AES encrypt/decrypt is already shipped.** Slice A makes tags + crypto **visible and searchable**. It does **not** add a second encryption layer.

---

## Today (baseline)

| Piece | State |
|-------|--------|
| `evidence_meta` | `notes`, SOS link, trim, dock — **no `tags` column** |
| Detail UI | Notes textarea + Save meta — **no tags field** |
| Catalog | List files — **no tag filter** |
| Crypto | Post-upload `encryptFileInPlace`; preview via `pipeDecrypted` — **no UI chip** |
| Audit | `evidence.meta_update` already exists |

---

## Target behaviour

### 1. Tags (S4-5 / S4-8 software slice)

- Field on Evidence detail (edit permission): free-text tags, **comma or space separated**, normalized to lowercase unique list.
- Stored on `evidence_meta` (preferred: new `tags_json TEXT` = JSON array; fallback acceptable if tightly scoped).
- `PATCH /api/evidence/detail/:fileId` accepts `tags` (array or string); `updateMeta` persists; audit unchanged event.
- Catalog: search box or chip filter — match any tag (AND optional later; **v1 = any-match / contains**).

**Limits (enterprise, keep stupid simple):**

- Max **12** tags per file  
- Max **32** chars per tag  
- Letters, digits, `-`, `_` only (reject junk)  
- Super-admin / `evidenceEdit` same as notes today  

### 2. Crypto status chip (no encrypt changes)

- Detail status row (and optional catalog badge):  
  - **Encrypted (AES-256)** if `evidenceCrypto.isEncryptedFile(path)`  
  - **Not encrypted** if file on disk without MEV1 header (UI: never say “legacy”)  
  - **Unavailable** if storage missing (same as today)  
- Exposed on `GET /api/evidence/detail/:fileId` as e.g. `cryptoStatus: 'encrypted' | 'plaintext' | 'missing'`  
- **Read-only** — no “Encrypt now” button in A (that would be slice B / ops MOB).

---

## Files expected (APPLY later)

| Area | Likely touch |
|------|----------------|
| DB | `lib/siteDb.js` — `evidence_meta.tags_json` + get/upsert |
| Logic | `lib/evidenceWorkflow.js` — `updateMeta` / `getDetail` |
| API | `server.js` — detail GET cryptoStatus; PATCH body already wired |
| UI | `public/js/evidence-hub.js` — tags input, filter, chip |
| i18n | `public/locales/en.json` first; other langs note for later batch |

**Forbidden:** `video-wall.js`, `ptt-rx.js`, `fleet-ui.js`, `pttServer.js`, `sipServer.js`, encrypt-on-upload path reorder.

---

## Risk to top-stable

| System | Impact of A |
|--------|-------------|
| Live wall / pool | **None** |
| PTT / SIP | **None** |
| SOS ingest / banner | **None** (encrypt still after snapshot) |
| Evidence preview / redact / trim | **None** if we only add meta + status read — **do not** touch decrypt stream |
| Catalog / detail | **Yes** — primary test surface |

Wrong IMPLEMENTATION (not intended): changing encrypt timing → evidence break. A’s written scope forbids that.

---

## Bench after APPLY (evidence-only)

1. `RESTART-FLEET.bat` → hard refresh  
2. Open one evidence file → see crypto chip  
3. Add tags → Save → reload → tags persist  
4. Catalog filter finds the file  
5. Preview still plays; open Redact once (smoke) — no crypto regression  
6. Super-admin audit shows meta update  

Reply **PASS** / **FAIL** (+ what broke). No wall Open All required for this MOB.

---

## Slice B (later, not this MOB)

Only if bench finds decrypt holes vs redact/trim: harden encrypt ↔ ffmpeg temp path. Still **no** wall/PTT. Separate MOB name when needed.

---

## Next

Reply: **`MOB-APPLY mob-evidence-crypto-metadata-A-tags`**
