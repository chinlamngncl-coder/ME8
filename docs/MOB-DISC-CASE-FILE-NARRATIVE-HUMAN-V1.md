# MOB-DISC — Case File: human Narrative + stop calling Ops ID “Source”

**Date:** 2026-08-17  
**APPLY:** `MOB-APPLY CASE-FILE-NARRATIVE-HUMAN-V1`  
**Scope:** Case File detail (`public/js/case-files-ui.js` display) + SOS seed text (`lib/caseFiles.js` `stripHtml` / `readSosNarrative`). No Settings. No new IDs. Do not wipe existing case rows.

## What these are (plain English)

**Narrative** is meant to be the field report a human reads. For SOS it is **not** typed by the officer first. The server copies the SOS incident **HTML report**, then `stripHtml` deletes every tag and **smashes all spaces into one line**. That is why it looks like gibberish. The facts are in there (alarm type, BWC, time, map, ack note, recordings) — they were never laid out as lines.

**`s0:alarm-1786…` / `SO:alarm-…` is not an “Alarm ID” label the officer owns.**  
It is the **Ops Case technical key** stored as `opsCaseId`:

| Prefix | Meaning |
|---|---|
| `SO:` / SOS | Opened from an **SOS / fall** alarm |
| `WD:` | Opened from a **weapon** hit |
| `FR:` | Opened from a **face** hit |
| `AN:` | Opened from a **plate** hit |

`alarm-<number>` is the SOS incident id (time-based). The UI today prints **Source:** + that raw string. Operators cannot sit down and read it.

## Recommendation (one path)

1. **Stop labeling it Source.** Show: **Opened from SOS alarm** (or Weapon / Face / Plate). Put the technical id in a small **Incident ID** line only if super-admin needs it — not as the story.
2. **Narrative for SOS-linked files:** do **not** show the mashed HTML dump. Show a **labeled list** (one fact per row): Alarm type, Status, Officer, BWC, Alarm time, Location (with the Maps link as a real link), Acknowledgement note, Snapshot / HQ recording / Dock recording. Pull from SOS fields when `sosIncidentId` is set; otherwise keep the officer’s own narrative.
3. **Officer “What happened”** stays a real paragraph box (`white-space: pre-wrap`) — their words, with line breaks.
4. **Going forward:** `stripHtml` must turn `</p></h1></div>` into newlines (stop `.replace(/\s+/g, ' ')` on the whole report). Old mashed rows still need the structured SOS list in (2) because they have no newlines to restore.

Do **not** invent a new case ID scheme. Do **not** change CP- case IDs.

## Operator PASS

1. Case File opened from SOS: facts in rows, readable.  
2. No “Source: SO:alarm-…” as the human line — it says opened from SOS.  
3. Officer-typed narrative still saves and shows with line breaks.
