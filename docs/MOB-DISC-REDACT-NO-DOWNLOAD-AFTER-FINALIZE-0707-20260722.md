# MOB DISC — No Download after Finalize · “stuck at 0707”

**Status:** APPLIED 2026-07-22 — see `MOB-APPLIED-REDACT-DOWNLOAD-AFTER-FINALIZE-VISIBLE-V1-20260722.md`  
**Mode:** Applied — `MOB-APPLY REDACT-DOWNLOAD-AFTER-FINALIZE-VISIBLE-V1`  
**Search:** `no download after finalize`, `disappear`, `stuck 0707`, `0707 data`  
**Trigger:** Operator: Finalize + Save done, still no Download; looks like data stuck on **0707**.

---

## Straight verdict (checked against live lab)

| Claim | Truth (agent verified 2026-07-22) |
|-------|-----------------------------------|
| File “disappeared” | **No.** Files are on disk under `storage\evidence-exports\EV-MRAR5LWM-93d1392f\` |
| Finalize did nothing | **No.** Postgres shows today’s top exports as **`finalized`** |
| “Stuck at 0707” | **Misleading.** `20260707223538-00N` is the **source clip name** (recorded 7 Jul). Redact **copies** from today are `EXP-20260722-…_20260707223538-00N_redacted_….mp4` |
| Why you see no Download | Product UX + visibility — not missing files |

### Live catalog sample (same evidence id)

| created_at (UTC) | status | export |
|------------------|--------|--------|
| 2026-07-22 06:03 | **finalized** | `EXP-20260722-8f9e9af3` … `…_redacted_9e9af3.mp4` |
| 2026-07-22 04:29 | **finalized** | `EXP-20260722-8444f502` … |
| 2026-07-22 03:57 | **finalized** | `EXP-20260722-4a19e0e4` … |
| older Jul 16 rows | many still `pending_note` | duplicates from Save-again pile |

So: **newest burns are Finalized in the database.** Download should be available for those rows. The product is failing to **make that obvious** (or the UI you are looking at is the wrong surface).

---

## Why “0707” feels stuck

```
Source library clip name:  20260707223538-00N.mp4   ← July 7 recording
Redacted export file name: …_20260707223538-00N_redacted_XXXXXX.mp4
Export id prefix today:    EXP-20260722-…            ← July 22 burn
```

Prior exports list shows the **export fileName**, which **embeds the source name**. It does **not** show “exported today” as a clear date column on the detail list. Operator reads “0707” and thinks the whole system is frozen on old data.

**Not** a Postgres freeze. **Not** Valkey. Naming UX.

---

## Why Download feels missing (root causes)

### R1 — Download is not on the Finalize form

After **Finalize & register**, Download lives only on:

- Same clip → **Prior exports** → row status **Finalized** → **Download** link  

There is **no** Download button on the note/Finalize screen itself. If Close / handoff fails to land you on that list (or you stay looking at the form / another tab), it feels like “Finalize then nothing.”

Earlier discs already named this gap (`mob-evidence-redact-download-on-finalize-v1` was optional follow). Still not shipped.

### R2 — Loop-break MOB made Download a tiny text link

`REDACT-FINALIZE-LOOP-BREAK-UI-V1` replaced fat blue **Download** buttons with compact `.ev-export-action` text links (to fix zig-zag).  

On a dense Prior exports list (many pending rows), that link is **easy to miss** — especially next to long `0707…` filenames. Looks like “Download disappeared.”

### R3 — Many pending rows bury the eye

Older **Note pending** rows still list **Finalize**. Newest Finalized rows are at the top (ORDER BY created_at DESC), but the screen still *looks* like a pending graveyard → operator hunts Finalize forever and never notices Finalized + Download.

### R4 — Wrong place to look

| Place | Redacted Download? |
|-------|-------------------|
| Browser Downloads folder | Only **after** you click Download |
| Finalize form | **No** |
| Bottom original Download on detail | **Removed** on purpose (original, not redacted) |
| Evidence → **Redacted exports** (status Finalized) | **Yes** — alternate path |
| Prior exports · Finalized row | **Yes** — primary path |

### R5 — Permission (less likely for your lab)

UI Download requires `perms.export` (`evidenceExport`). Super-admin role forces that true in `dashboardAuth.normalizePermissions`. API `canEvidenceExport` also allows super_admin.  

If you were on a **non–super-admin** account without export permission: Finalize button may be hidden, but if you somehow finalized as super-admin and then switched users — edge case. Primary issue for this report is **R1–R3**.

---

## What you can do **right now** (no APPLY)

1. Hard refresh (**Ctrl+F5**).  
2. Evidence → open the **same** source clip (`20260707223538-00N…`).  
3. Scroll **Prior exports** — look at the **top** rows.  
4. Status must say **Finalized** (green-ish chip) → click the small **Download** text on the **right**.  
5. Or: Evidence left nav → **Redacted exports** → status **Finalized** → Download.  
6. Ignore “0707” in the name — that is the source clip id; today’s burns start with `EXP-20260722-` on disk.

IT path (proof files exist):

`ME8\storage\evidence-exports\EV-MRAR5LWM-93d1392f\EXP-20260722-*_redacted_*.mp4`

---

## Recommended MOB (one APPLY)

**Name:** `REDACT-DOWNLOAD-AFTER-FINALIZE-VISIBLE-V1`

### Must fix

1. **On Finalize success:** stay one beat on a clear success strip:  
   **“Finalized — Download redacted copy”** + primary **Download** control (`export-stream` URL) + secondary “Open Prior exports”.  
   Do not rely on hunting a text link in a long list.  
2. **Prior exports:** restore a **visible** Download control for Finalized rows (compact `btn-ghost btn-sm` or underlined “Download” with min hit area — not invisible). Keep alignment tidy (meta left / actions right).  
3. **Show burn time** on each row (e.g. `createdAt` / finalize time) so “0707” source name is not mistaken for “stuck data.” Optional: show short export id `EXP-20260722-…`.  
4. **Pending pile:** collapse or filter “Note pending (N older)” so Finalized rows stay obvious.  
5. Cache bust.

### Out of scope

- Deleting old pending exports (separate cleanup MOB)  
- Renaming source clip files on disk  
- Restoring bottom “Download original” without an explicit MOB  

### Verify PASS

| # | Test | Pass |
|---|------|------|
| 1 | Finalize one draft → success screen shows **Download** immediately | ☐ |
| 2 | Click Download → file saves to PC | ☐ |
| 3 | Prior exports top Finalized row also has clear Download | ☐ |
| 4 | Row shows date/time so 0707 source name is not confused with stuck system | ☐ |

---

## Related

- Disk + Prior exports map: `MOB-DISC-REDACT-WHERE-IS-DOWNLOAD-BUTTON-20260722.md`  
- Loop break (tiny links): `MOB-APPLIED-REDACT-FINALIZE-LOOP-BREAK-UI-V1-20260722.md`  
- This disc: visibility after Finalize + 0707 naming confusion  

---

## Ask

When ready:  
**`MOB-APPLY REDACT-DOWNLOAD-AFTER-FINALIZE-VISIBLE-V1`**
