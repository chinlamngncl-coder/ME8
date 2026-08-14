# MOB DISC — SOS banner `Â·` rubbish + Ack still mutes — 2026-08-10

**Status:** LOCKED diagnose. **No code this turn.**  
**Read:** `.cursorrules` · mute-hold already APPLIED in `dashboard-boot.js` · zero change until new APPLY.

**Operator saw:** banner `OFFICER IN DISTRESS Â· kk Â· …` + pin `kk Â · … SOS` + **Nav Hint / Live Hint** lines + **mute on Ack** (red mute on pin).

---

## 1) Rubbish `Â·` — what / who

**Cause:** Mojibake. UTF-8 middle-dot / copyright bytes were corrupted; HTML still has a literal **`Â`** stuck in front of separators.

**Where (live `public/index.html`):**

| Spot | Bad text |
|------|----------|
| SOS banner `#sos-banner-text` | `Â&middot;` between prefix / cam / time |
| Pin popup title builder (inline script in `index.html`) | `Â\u00B7 ` before id + badge |
| Same pattern elsewhere | FR alarm meta, SOS ack/detail meta, fleet summary, groups steps, map attribution `Â©` / `Â&middot;`, etc. |

**Not** from mute-hold (that only touched `dashboard-boot.js`).  
`dashboard-boot.js` pin helpers already use clean `\u00B7`. The **pin title you see** is built from the **inline `index.html` copy** that has `Â\u00B7`.

**Who:** Corruption is **already in** prior commit `ae70193` (pre–mute-hold checkpoint) **and** `189b2eb`. So not “mute-hold broke the banner.” Likely an earlier **index.html save / re-encode** (UTF-8 file read as Latin-1, then saved) left `Â` before `&middot;` / `\u00B7`. Easy to miss until SOS banner is full-screen red.

**Fix shape (when APPLY):** strip literal `Â` before `&middot;` / `\u00B7` / fix `Â©` → `&copy;` or `©` in `index.html` only. Do **not** rewrite live/SOS logic.

**Suggested APPLY:** `SOS-UI-MIDDOT-MOJIBAKE-V1`

---

## 2) “Nav Hint” / “Live Hint”

HTML still has:

```html
<span id="sos-banner-nav-hint" data-i18n="sos.banner.navHint" hidden></span>
<span id="sos-banner-live-hint" data-i18n="sos.banner.liveHint" hidden></span>
```

`en.json` has those keys as **`""`** (UI-copy emptied teach text). Something still **paints** title-case leftovers (“Nav Hint” / “Live Hint”) so they show on the red strip.

**Fix shape:** keep `hidden`, clear textContent, stop i18n from un-hiding empty banner hints. Bundle with middot APPLY or tiny follow-up.

---

## 3) Auto-mute on Ack — why hold seemed to fail

**Mute-hold code is present** (`SOS_ACK_MUTE_HOLD_MS = 60000` → `scheduleMuteAckedCamLiveAudio`).

**Why you can still see mute right after Ack:**

1. **Hard refresh / cache** — confirm `dashboard-boot.js` loaded with the schedule (not old immediate mute).  
2. **Stronger:** after Ack, SOS is no longer “active” → `isSosCamForAudio` is false. `resyncPinVideoAfterSosAck` runs on Ack → pin/live path can treat stream as **new non-SOS** → `defaultAudioMutedForNewStream` → **mute now**, before the 60s timer.  
3. Pin **Audio rec: Off** is **device telemetry**, not the same as HQ speaker mute — but the red mute icon is HQ live audio.

So hold delays **only** `muteAckedCamLiveAudio`; it does **not** block **resync / default-mute** after SOS clears.

**Fix shape (when APPLY):** during mute-hold window, keep listen (e.g. skip default mute / re-unmute once after Ack resync until timer fires). Still no FLV/pin core rewrite.

**Suggested APPLY:** `SOS-ACK-MUTE-HOLD-RESPECT-V2` (after middot PASS or same session if you list both).

---

## Order (recommended)

1. `MOB-APPLY SOS-UI-MIDDOT-MOJIBAKE-V1` — strip `Â` rubbish + hide empty Nav/Live hint paint.  
2. Re-test SOS banner + pin title look clean.  
3. `MOB-APPLY SOS-ACK-MUTE-HOLD-RESPECT-V2` — Ack stay unmuted 60s even after pin resync.  
4. Later: `SOS-STOP-VIDEO-STOP-RECORD-V1` (separate disc).

---

## Not blaming firmware

Banner text is **our HTML/JS encoding**. Mute-on-Ack feel is **our audio default after SOS clear**, not BWC SD record.
