# MOB APPLIED — VC-APK-MEETING-LAYOUT-CLIENT-V1

**Date:** 2026-07-24  
**APPLY:** `MOB-APPLY VC-APK-MEETING-LAYOUT-CLIENT-V1`  
**Disc:** `MOB-DISC-VC-APK-LAYOUT-GOOGLE-20260723.md` (checklist YES)  
**Status:** APPLIED — operator PASS/FAIL pending  
**Version:** **1.6.0** (`versionCode` 26)

---

## What changed (Lab source of truth)

| Item | Before 1.5.6 | After 1.6.0 |
|------|--------------|-------------|
| Layout chips | Auto · Deploy · Gallery | **Speaker · Operations · Focus** |
| Default | Auto → Gallery wall | **Speaker + side filmstrip** |
| Share present | Auto → Deploy | Soft → **Operations** (unless user locked Focus) |
| Focus exit | Back left meeting | **Back / ← Speaker → Speaker** |
| Top Leave | Visible | Hidden (Leave on bottom dock only) |
| Stage badge | None | **LIVE** / **SHARING** |
| Operations split | 68/32 | **72/28** |

LiveKit join / tokens / floor / screen share **unchanged**.

## Files (Lab)

`Lab-8BWC-v2\mobile-android\MobilityConference\`

- `app/build.gradle.kts` — 1.6.0 / 26  
- `app/src/main/res/layout/activity_meeting.xml`  
- `app/src/main/res/values/strings.xml`  
- `app/src/main/java/.../MeetingActivity.kt`

## APK artifacts

| Path |
|------|
| `Lab-8BWC-v2\mobile-android\MobilityConference\app\build\outputs\apk\debug\MobilityConference-1.6.0.apk` |
| `Lab-8BWC-v2\mobile-android\MobilityConference\MobilityConference-1.6.0.apk` |
| `ME8\mobile-android\MobilityConference\MobilityConference-1.6.0.apk` |
| `ME8\mobile-android\MobilityConference\MobilityConference.apk` (same build) |

## Operator smoke

1. Uninstall old Conference APK if needed; install **1.6.0**.  
2. Join same room as desktop VC.  
3. **PASS look:** big speaker + side strip (not equal gallery); chips = Speaker / Operations / Focus; bottom Mic · Flip · Share · More · Leave; badge LIVE/SHARING.  
4. Share screen → Operations (content large + strip).  
5. Focus → one feed; phone Back → Speaker (does not leave).  
6. Leave from bottom dock.

Say **PASS** or **FAIL**.
