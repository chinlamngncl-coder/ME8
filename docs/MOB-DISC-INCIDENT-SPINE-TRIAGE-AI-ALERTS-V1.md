# MOB DISC — Incident is the spine (triage, AI, alerts)

Locked 2026-08-18 as the officer story. Code only after named MOB-APPLY.

## Spine

Every clip, AI result, and alert ends on an **Incident report** (case file).  
Triage is the on-ramp. Incident is the destination. Not a pile of IDs. Not a lone `.txt`.

## Triage highway

| What the file is | Next |
|------------------|------|
| Already on an SOS / incident | **Open that incident** (already have Open active incident). |
| Not SOS, no incident yet | Officer **picks** an existing incident **or starts a new one**. This clip becomes the first exhibit. |
| Checking only | **Review** (look) or **Analyze** (AI). Then Link / New incident — do not leave the file orphan. |

Do not send non-SOS into a random other SOS. Do not make the officer memorize `CF-…`.

## Analyze → AI report

- **Export AI report** today downloads a `.txt`. That is a spare copy, not the record.
- Professional: generate → **attach the report to the incident** this clip is on (or pick/create incident first). Land **on that incident**. Download PDF/file stays as extra.
- After generate, officer does **not** restart Triage to find the file again. Back to analysis still works until they are done.

## Two alert channels — never mix

Live FR / live ANPR / live weapon **stay as they are**. Do not fire those HQ toasts from Triage Analyze. Do not auto-open incidents from Analyze. Do not duplicate a live hit into a second toast.

| Channel | What it is | Officer sees | Next |
|---------|------------|--------------|------|
| **Live** | Camera is watching now (existing FR / ANPR / weapon toast + queue) | One live toast + queue. Open / Ack / Map stay. | Open or create **that** incident from the live toast. |
| **Analyze** | Officer ran AI on a file in Triage / Library | Result **inside the Analyze panel** — one line: face / plate / weapon hit or clear. No jumping live toast. | Link / Start incident. Attach this file + the hit facts. |

Analyze toast = a result banner on that panel only. Not a second live alarm.

## Library → my Triage

Triage is the officer’s highway (name on the row). Dock/BWC “important” is not required.

If the clip sits in **Evidence Library** (untagged, extra snapshot, officer’s own folder): officer **selects one or several** → **Send to my triage**. Then Review / Analyze as usual.

Does not dump another officer’s files into this queue. Snapshots count.

## Already done analytics — do not touch (comparison only)

Live shout and offline matching **already exist**. Mentioned only so Triage Analyze can stay **calmer**. Do not rebuild them.

| What | Status | This MOB |
|------|--------|----------|
| Live FR / ANPR / weapon toast, chime, HQ bar | **Done. Keep.** | Do not edit `fr-alarm.js`, `weapon-alarm.js`, live ANPR watch. |
| Offline matching (hit on that page, no popup) | **Done. Keep.** | Do not edit `anpr-offline-match.js` / FR offline view. |
| Blacklist / suspect / monitoring selects | **Done. Keep.** | Do not rewrite list types. |
| **Triage Analyze** | Use Analyze we already have | **Only** a quiet result line on that panel + Open incident if already recorded. Do not call live toast. Do not open offline-match UI. |

This MOB is **Triage using existing Analyze**. Not a new analytics product. Not a second matcher.

If live already ran (toast → incident → text → close): Analyze of that clip = quiet line + Open incident. No second shout. No second incident.

## No double work / no merry-go-round

| Already happened | Do not do again |
|------------------|-----------------|
| Live toast + Ack/Close + text on an incident | Fire that live toast from Analyze |
| File already on an incident | Start a new incident for the same file |
| Analyze result shown | Jump the officer to Ops / HQ alarm bar |
| Officer left Analyze to pick an incident | Lose the file and make them hunt Triage again |

## Several exhibits — stay on the case (next MOB, not this one)

Do **not** send the officer out to Triage to hunt files. The case/report is the desk.

**Today:** Link is one file. Extra photo is one file. No multi-pick from Triage + Library while on the case.

**Next (after this APPLY PASSes):** `INCIDENT-MULTI-EXHIBIT-FROM-TRIAGE-LIBRARY-V1`

- Control name on the case: **Add from my files**
- Search this officer’s **Triage** and **Library** without leaving the case
- Tick **several** pics / videos / files → attach as exhibits
- A case is never assumed to have only one picture

## SOS dual backup — already done (check 2026-08-18)

Not mashed into one physical MP4. **One SOS / one case = one desk with two links.**

| Path | Status |
|------|--------|
| **A** HQ / software record while live exists (`attachServerRecording`) | Done |
| **B** SOS raise → one device **Record** (`udp_once`) so the belt keeps writing if RF dies | Done |
| **C** Dock ingest → match-back → `deviceRecordingEvidenceId` on the same SOS | Done |

If signal dies on site: BWC can keep recording; HQ software record may cut off. Dock later puts the ground file on the **same SOS**. Officer sees HQ clip + ground clip. Locked in `MOB-DISC-SOS-DUAL-RECORD-DOCK-MATCHBACK-20260809.md`. Do **not** reopen that as this MOB.

## This APPLY (Triage Analyze only) — APPLIED 2026-08-18

`MOB-APPLY ANALYZE-HIT-CALM-RECORD-V1`

Done: quiet record line on Analyze + Open incident if already linked. Several files attach to **one** incident (Library checkboxes, Triage selected, Add from Library / Add from Triage). Live and offline analytics not edited.

Cache: `?v=20260818-calm-record-v1`

## Triage Analyze vs offline matching — not linked (parked)

Triage Analyze **POSTs the same APIs** (`/api/analytics/fr/offline-video`, `/api/analytics/anpr/read`). It does **not** open FR Load video (offline) or ANPR offline match (`anpr-offline-match.js`). Hits stay in the Analyze modal only. Live / offline UIs were left untouched on purpose.

Park: do not wire that until a named APPLY. Do not invent a second matcher.

## Next APPLY — APPLIED 2026-08-18

`MOB-APPLY LIBRARY-SEND-TO-MY-TRIAGE-V1`

Library files are flagged onto this officer’s Triage (no copy, no second pile). Bulk Clear on a Library row removes the flag only — file stays in Library.

Parked (later, not live): Triage Analyze → existing FR offline **image and video**, ANPR **image and video**. Do not use live FR/ANPR to link that.

Cache: `?v=20260818-lib-triage-v1`
