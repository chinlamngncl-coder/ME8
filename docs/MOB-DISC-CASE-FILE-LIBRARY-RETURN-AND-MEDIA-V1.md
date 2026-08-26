# MOB-DISC — Case File: no ID memory, Library return, media on the report, tighter spacing

**Date:** 2026-08-17  
**APPLY:** `MOB-APPLY CASE-FILE-LIBRARY-RETURN-AND-MEDIA-V1`  
**Scope:** Case File detail + Evidence Library return-to-case. No Settings. Do not invent new case IDs. Do not wipe existing rows.

## What you saw (plain English)

Two different strings. Neither is something an officer should memorize.

| What is on screen | What it actually is | What it is **not** |
|---|---|---|
| **Incident ID** (`alarm-1786…` / `SO:alarm-…`) | The SOS (or weapon / face / plate) that **opened** this Case File | A Library file. Clicking it must **not** dump you into a file picker |
| **Evidence ID from library** | A Library file’s technical key | Something a human types from memory |

Today Linked evidence is a paste box + **Link evidence**. Pictures and video only appear **after** something is linked. SOS already has snapshot / HQ recording / dock recording as **Open** links in the fact list — they are not shown as media **on** the report. Spacing on this page is looser than Settings / Evidence cards.

Already in the product (do not rebuild): Library **Add to case** (`pendingLinkEvidenceId`); Case File video tiles **after** a file is linked; SOS fact **Open** links.

## Recommendation (one path)

1. **Incident ID is not a Library link.** Keep **Opened from SOS Alarm** (or Weapon / Face / Plate). That line is the click: open that alarm / Ops case. Hide the raw string from the operator story. Super-admin may still see a small copyable id — not as the story.
2. **Linked evidence:** **Choose from Library** (keep paste-ID as super-admin repair only). Opens Library **in return-to-case mode**. Pick a file → link it → jump back to this Case File. If they opened Library from that button and pick nothing: **Back to Case File** stays visible until they return.
3. **Media on the report:** SOS-linked Case Files show snapshot + HQ / dock clips **on the page** (same files as the fact-list Open links). Linked Library files keep thumbs / video. Empty only when there is truly no media.
4. **Spacing:** same density as Evidence / Settings cards. Tighten Case File detail gaps. Do not invent a new look.

## Operator PASS

1. No need to remember Incident ID or Evidence ID to work the case.  
2. Choose from Library → pick → back on the same Case File with the file linked.  
3. Leave Library without picking → Back to Case File still works.  
4. SOS Case File shows the snapshot / recordings on the report.  
5. Gaps look like Evidence / Settings, not a wide empty page.
