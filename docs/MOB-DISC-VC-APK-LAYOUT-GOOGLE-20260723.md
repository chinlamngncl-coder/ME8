# MOB DISC — MobilityConference APK layouts (for Google) · before next APK

**Date:** 2026-07-23  
**Updated:** 2026-07-24 — checklist **YES** from operator / Google consult  
**Status:** **APPLIED** as `VC-APK-MEETING-LAYOUT-CLIENT-V1` → see  
`MOB-APPLIED-VC-APK-MEETING-LAYOUT-CLIENT-V1-20260724.md` (APK **1.6.0**).  
This disc remains the locked checklist / architecture reference.

---

## Where the APK / source live

| Item | Path |
|------|------|
| **Lab / ship binary (current)** | `ME8\mobile-android\MobilityConference\MobilityConference-1.5.6.apk` (also `CN Trial…`, `Trial June…`) |
| **Source of truth for layout code** | `Lab-8BWC-v2\mobile-android\MobilityConference\` (Gradle `versionName = "1.5.6"`, `versionCode = 25`) |
| ME8 tree | Mostly **APK copy only** under `ME8\mobile-android\MobilityConference\` — **no full `app/src`** in ME8 today |
| Older labels | 1.0.0 / 1.1.0 under Lab + SaaS — superseded by **1.5.6** |

**Note:** You said “1.53 or something” — on disk the current branded build is **`MobilityConference-1.5.6`**.

**Package:** `com.mobilityaxiom.conference`  
**Stack:** Kotlin + LiveKit Android `2.9.0` + Fleet `/api/conference/...` join-token  

---

## How the APK is built today (process)

```
1) Open Lab-8BWC-v2\mobile-android\MobilityConference
2) Set MOBILITY_BASE_URL (optional) in gradle.properties / -P
3) ./gradlew.bat assembleDebug   (or Android Studio Build)
4) Output: app\build\outputs\apk\debug\MobilityConference-1.5.6.apk
5) Copy to ME8\mobile-android\MobilityConference\ + customer packs as needed
```

We do **not** invent a second conference app. Next layout MOB = same project, bump `versionName` / `versionCode`, keep LiveKit.

---

## Current APK screens (simple English)

### A. Lobby — `MainActivity` / `activity_main.xml`

```
[Logo] Mobility Conference
┌ Server URL + Save ─────────────┐
┌ Username / Password + Login ───┐
Room cards 1 · 2 · 3 (status dots)
[ Join room ]
status line
```

Simple, workable. Not the pain — **in-meeting** is.

### B. Meeting — `MeetingActivity` / `activity_meeting.xml`

```
┌ Title ……………………………… [Leave] ┐
│                                         │
│     VIDEO AREA (modes swapped in code)  │
│     + local PiP (You) bottom-right      │
│                                         │
├ Auto | Deploy | Gallery  (chip bar) ────┤
├ Mic · Flip · Share · More …… [Hang up] ┤
└─────────────────────────────────────────┘
```

**Chrome:** top title + leave; mid video; **3 layout chips**; bottom icon bar.  
**Not** the new desktop dock (Speaker · Operations · Focus).

---

## Current layout engine (what code actually does)

Kotlin enum (`MeetingActivity.LayoutScheme`) has **many** schemes:

`AUTO` · `DEPLOY` · `GALLERY` · `SPEAKER` · `SPOTLIGHT_TOP` · `FILMSTRIP` · `FOCUS` · `PIP`

**But the chip bar only exposes three:**

| Chip | Meaning in app |
|------|----------------|
| **Auto** | Picks gallery vs deploy-ish based on whether share/BWC is present |
| **Deploy** | Content/main ~68% top + strip grid below (`splitStageRoot`) |
| **Gallery** | Equal `GridLayout` of remotes (`remoteVideoGrid`) |

Extra schemes (`SPEAKER`, `FILMSTRIP`, `FOCUS`, …) exist in Kotlin / some XML hosts (`filmstripRoot`, `spotlightOverlay`) but are **not first-class chips** — easy to feel “simple and not so good.”

### Wireframes of what users see

**Gallery (equal wall)**

```
┌──────────┬──────────┐
│  Cam A   │  Cam B   │
├──────────┼──────────┤
│  Cam C   │  Cam D   │
└──────────┴──────────┘
     [You PiP]
```

Same problem as old desktop: feels like a tile wall, not a meeting.

**Deploy (ops / briefing)**

```
┌─────────────────────┐
│  Share / BWC main   │  ~68%
├──┬──┬──┬────────────┤
│A │B │C │… strip     │  ~32%
└──┴──┴──┴────────────┘
```

Useful for content — maps to web **Operations**.

**Filmstrip / Speaker (partially built, weak UX)**

XML has `filmstripRoot` (main + 112dp side strip) and spotlight overlay, but chips don’t clearly offer **Speaker** / **Focus** like the new desktop.

---

## Why it feels weak (honest)

| Issue | Detail |
|-------|--------|
| Chip names | Auto / Deploy / Gallery ≠ client language (Speaker / Operations / Focus) |
| Default | Gallery/Auto → equal tiles |
| Parity with desktop | Desktop V1 already locked 3 modes + bottom dock; APK still old chip language |
| Hidden schemes | Code richer than UI — confusing for operators and for Google review |
| Local “You” PiP | Always corner — OK, but competes with stage PiP / spotlight |
| No shared badge language | Desktop uses `LIVE ·` / `SHARING ·`; APK = small label on tile only |

---

## Proposed APK layout (agent recommendation — align with web)

**Do not rebuild LiveKit.** Same APK project. Layout/UX MOB later.

### Mission modes (match desktop)

| Mode | Mobile layout | Reuse |
|------|---------------|--------|
| **Speaker** (default) | Large active/pinned + vertical or bottom filmstrip | `filmstripRoot` / speaker path |
| **Operations** | Content 70–80% + strip | today’s **Deploy** |
| **Focus** | One stream full-bleed; Esc / back exits | `spotlightOverlay` + back |

**Remove from primary chrome:** Auto / Deploy / Gallery chips (or map Deploy→Operations, Gallery→advanced only).

### Meeting chrome (match desktop spirit)

```
┌─────────────────────────────────────┐
│         STAGE (full bleed)          │
│     badge: LIVE / SHARING           │
│     [You] small PiP                 │
├─────────────────────────────────────┤
│ Mic  Cam  Layout▾  Share  Leave     │  ← always-visible dock
└─────────────────────────────────────┘
```

- Layout control = **3** options only.  
- Top “Leave” can stay or fold into dock (one Leave is enough).  
- Keep floor / mute-all under **More** (already).

### Version bump (when built)

Suggest next: **`1.6.0`** (layout parity genre) — not a silent 1.5.7 micro unless Google prefers.

---

## How we would do the update (plan only)

| Step | Work | Touch |
|------|------|--------|
| 0 | Google + you **APK LAYOUT OK** | Paper |
| 1 | Copy/sync source into `ME8\mobile-android\MobilityConference\` if ME8 should own builds | Tree hygiene |
| 2 | `MOB-APPLY VC-APK-MEETING-LAYOUT-CLIENT-V1` | `activity_meeting.xml`, `MeetingActivity.kt`, strings, chips→3 modes |
| 3 | AssembleDebug → install on phone → PASS with desktop room | Device test |
| 4 | Copy APK to ME8 + trial folders; bump versionName | Ship artifact |

**Out of that APPLY:** new auth product, Tactical on phone, BWC companion, changing LiveKit server.

---

## Checklist for Google — **LOCKED YES** (2026-07-24)

| # | Question | OK? |
|---|----------|-----|
| 1 | Align mobile to same **3 modes** as desktop VC V1? | **YES** — Speaker · Operations · Focus |
| 2 | Default = **Speaker + filmstrip**, not Gallery wall? | **YES** |
| 3 | Rename Deploy → **Operations**; drop Auto as primary? | **YES** |
| 4 | Bottom dock Mic/Cam/Layout/Share/Leave? | **YES** |
| 5 | Next version **1.6.0** after layout PASS? | **YES** |
| 6 | Source of truth = Lab-8BWC-v2, sync APK to ME8? | **YES** |

**Verdict:** Architecture and roadmap are **sound**. Keep this file as **paper reference**.  
**Do not rebuild APK** until explicit: `MOB-APPLY VC-APK-MEETING-LAYOUT-CLIENT-V1`.

---

## Agent must not

- Rebuild APK from this disc  
- Change desktop VC again “for mobile” without APPLY  
- Invent a second conference package ID  
- Bundle Tactical / companion into this APK  

---

## One line

**APK layout checklist = all YES; paper locked; build only after named APPLY for MobilityConference 1.6.0 layout parity.**
