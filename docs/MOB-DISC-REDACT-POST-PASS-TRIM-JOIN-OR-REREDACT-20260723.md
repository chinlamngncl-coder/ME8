# MOB DISC — After download still has clear faces: trim, join, or second redact?

**Date:** 2026-07-23  
**Status:** PAPER — explain + recommend; **no code** until a named `MOB-APPLY`  
**Operator question:** Downloaded redacted video still has some unredacted parts — can we trim? join? load that redacted file and post-redact / trim again? Which is better?  
**Genre:** Evidence redact / export custody (not live video)

---

## Short answer (one recommendation)

**Do not join clips.**  
**Do not treat “fix the downloaded file in place” as the product path.**

**Best logic today (no new MOB):**

1. Go back to the **original** evidence.  
2. Mark the leftover faces (manual boxes; Auto again if useful + ✕ wrong yellows).  
3. **Save again** → new redacted draft → Finalize → Download.  

That is a **new clean redacted copy**. Original stays untouched. Custody stays simple.

**Trim** is for “I only need a time window of the incident,” not for fixing a missed face inside a long clip.  
**Join / splice** is wrong for evidence (seams, re-encode, broken chain of custody).

**Later product (if you want it):** `REDACT-SECOND-PASS-ON-EXPORT-V1` — **where to load** is the real design question; see `MOB-DISC-REDACT-SECOND-PASS-WHERE-TO-LOAD-20260723.md` (Prior exports → Second pass on that MP4).

---

## What you can do **today** (honest)

| Tool | Exists? | Good for leftover clear faces? |
|------|---------|--------------------------------|
| Re-open original → Redact → Save again | **Yes** | **Yes — preferred** |
| Auto + ✕ wrong yellow (preview→burn PASS) | **Yes** | Helps false Auto; not a magic fix for never-detected faces |
| Manual draw boxes on leftovers → Save | **Yes** | **Yes** for faces Auto still misses |
| Trim on original detail | **Yes** (trim export) | Only if you want a **shorter time range**; does **not** blur faces |
| Load downloaded redacted MP4 → Redact again | **Not a desk button today** | Would be useful later (second pass) |
| Join / stitch two videos | **No** | **Do not build** for this problem |

---

## Compare the three ideas

### A — Trim

**Meaning:** Cut start/end so only part of the timeline remains.

| When it helps | When it fails |
|---------------|---------------|
| Bad stretch is at the start/end and you don’t need that time | Clear face is in the **middle** of a needed scene |
| You want a short clip for court / share | Trim does **not** blur; it only shortens |

**Verdict:** Keep trim as **time scissors**. Not a substitute for redaction.

### B — Join / splice

**Meaning:** Glue pieces (e.g. “good redacted part + newly fixed part”).

| Why it feels attractive | Why it’s a bad evidence product |
|-------------------------|----------------------------------|
| Avoid re-processing the whole file | Re-encode seams, A/V drift, “was this edited?” challenges |
| | Custody / audit hard to explain |
| | Easy to get wrong on Windows/FFmpeg |

**Verdict:** **Reject** as the fix path. Media-editor job, not Fleet Evidence.

### C — Post-redact (second pass)

**Meaning:** Take the **already redacted** file (or the original again) and blur only what is still clear.

| Path | Pros | Cons |
|------|------|------|
| **C1 — Second Save from original** (today) | Clear custody; tools you already know | Re-runs full Auto/burn if you use face-follow again; longer wait on long clips |
| **C2 — Open redacted export as source** (future MOB) | Keep good blur; only paint leftovers | Needs build; must link parent export in audit |

**Verdict:** **C1 now.** Design **C2** only if C1 is too slow/painful in lab.

---

## Recommended operator playbook (plain)

1. Scrub the download. Note **when** the clear face appears (time).  
2. Open the **same original** evidence → Redact.  
3. Prefer **manual box** on that leftover (whole clip or tight time if the UI allows).  
4. Optional: Auto again for other faces; ✕ wrong yellows.  
5. Save → Finalize → Download **new** file. Keep or discard the old draft as you already do.  
6. Use **Trim** only if the finished story only needs e.g. 00:40–01:10 of the **original** (separate export), not to “erase” a face.

---

## If we build something later (single pick)

**Recommended future MOB name:** `REDACT-SECOND-PASS-ON-EXPORT-V1`

| Intent | Detail |
|--------|--------|
| From Prior / Redacted exports | “Second pass” opens that MP4 in Redact |
| Default tools | **Manual** boxes first (safest on already-blurred video) |
| Output | New export; meta notes `parentExportId` |
| Not in that MOB | Join/splice, in-place overwrite of Download |

**Do not bundle** with tracker upgrade or HTTPS.

---

## Risk pick (agent)

| Option | Risk | Pick |
|--------|------|------|
| Re-redact from original (C1) | Low — already works | **Do this now** |
| Trim only | Low but wrong tool for faces | Use only for time window |
| Join | High custody / quality | **No** |
| Second-pass on export (C2) | Med build | Later if you ask `MOB-APPLY REDACT-SECOND-PASS-ON-EXPORT-V1` |

---

## One line

**Missed faces → mark again on the original and Save a new redacted copy; trim only shortens time; never join; optional later: second pass on the redacted file.**
