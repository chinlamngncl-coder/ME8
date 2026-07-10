# MOB DISC — Suggested apply order (UI tidy → video crops)

**Status:** Recommendation locked 2026-07-10 — wait for your MOB-APPLY  
**Search:** `faceplate stub`, `analytics last`, `offline video`, `investigation thumbs`  
**Parent:** `MOB-DISC-FR-VIDEO-CROP-NAV-STUB.md`  
**Note:** Pin fan (`mob-map-pin-fan-2`) is a **separate** track — finish its checkpoint before stacking FR/UI MOBs if still open.

---

## My suggestion (do this order)

```
①  mob-ui-hide-map-faceplate-stub     ← dead map “FR / ANPR” checkbox
②  mob-ui-nav-analytics-last          ← Analytics after Settings (rightmost)
—— short look / hard refresh ——
③  mob-fr-offline-video-crops         ← Load video → sample → face crops
④  mob-fr-investigation-thumbs        ← keep sub-threshold crops (optional, after ③)
```

**Do not** apply ③ until ①+② are done and you are happy with nav.  
**Do not** bundle ①+②+③ in one pass.

---

## Why this order

| Step | Why first / next |
|------|------------------|
| **① Stub hide** | Zero function risk. Removes fake “FR on map” that confuses operators. 30-second win. |
| **② Analytics last** | Cosmetic nav only. Same view IDs. Do while UI is “tidy” so training screenshots match. |
| **Pause** | Confirm Settings + Analytics + Lock/Reboot still fine. No FR soak needed. |
| **③ Offline video** | Real product work (ffmpeg + sidecar). Needs FR running. Higher risk — isolate from nav noise. |
| **④ Investigation thumbs** | Policy on top of crop pipeline. Cleaner **after** offline (and live) crops exist to store. Can ship ③ without ④ if you want alarms-only first. |

---

## Can we merge ① and ②?

| Option | Verdict |
|--------|---------|
| Two MOB-APPLYs | **Preferred** — one fix at a time (your rule) |
| One MOB both | Only if you explicitly say e.g. `MOB-APPLY mob-ui-analytics-chrome` covering both — still one genre, two file touches in `index.html` |

I suggest **two commands** unless you want one chrome MOB.

---

## What I would **not** do yet

| Park | Why |
|------|-----|
| Body / clothes attributes | Commercial / license later |
| Hide Analytics ANPR **sub-tab** | Optional; stub on **map** is the confusing one. Inner “ANPR coming” is fine until licensed |
| Offline video before UI tidy | Harder to tell “nav broke” vs “video MOB broke” |
| Investigation thumbs before any offline path | Less value; live already has crop rail |

---

## Risk summary

| MOB | Ops / live / PTT risk | Fallback |
|-----|----------------------|----------|
| ① Hide stub | **None** | Un-hide one HTML block |
| ② Nav last | **Very low** | Move button back |
| ③ Offline video | **Medium** | Disable button again; no SIP change if scoped to Analytics |
| ④ Investigation thumbs | **Low–Med** | Stop writing sub-threshold files |

---

## Practical next message from you

1. Finish pin-fan checkpoint if still pending (**PASS/FAIL**).  
2. Then: **`MOB-APPLY mob-ui-hide-map-faceplate-stub`**  
3. Then: **`MOB-APPLY mob-ui-nav-analytics-last`**  
4. Then we DISC/APPLY offline video when you are ready.

---

## Bottom line

**Yes — that apply order is what I recommend.**  
UI chrome first (safe), then offline video crops, then optional investigation thumbs. One MOB at a time.
