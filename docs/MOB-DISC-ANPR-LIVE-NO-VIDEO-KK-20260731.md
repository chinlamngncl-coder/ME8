# MOB DISC — ANPR Live: no video for kk

**Date:** 2026-07-31  
**Status:** DISC / diagnosis — **no code until** named APPLY  
**Operator:** Using **kk** on ANPR → Live — **no live** comes up  
**Parent:** `ANPR-LIVE-ZLM-WATCH-V1` · `ANPR-LIVE-STOP-ALL-AND-SLOTS-V1`

---

## Plain English

ANPR Live is **not** the same player path as Ops wall / Face yet. Two separate failure modes are likely for “kk not up.”

---

## Check first (operator — 30 seconds)

| # | Check | If fail |
|---|--------|---------|
| 1 | Roster line for kk says **online** (not **offline**) | Device not registered / SIP down — Face live will also fail. Fix BWC first. |
| 2 | Tile text | **Offline** = we blocked start. **Connecting…** forever = start sent, stream never attached. **Waiting** = never selected into a slot. |
| 3 | Same kk on **Analytics → Face → Start watch** | If Face **Live** works and ANPR does not → **ANPR client gap** (below). If Face also fails → WVP/kk/network, not ANPR UI. |

Earlier screenshot already showed **Chin offline / kk offline**. If that was still true when you pressed Start, ANPR Live **will not** play — by design it refuses offline cams.

---

## What the code does today (verified)

1. Select kk → **Start watch**  
2. Only **online** cams go into tiles (`fillInitialSlots` filters `deviceOnline`)  
3. Tile emits `start-video` with surface **`analytics-anpr`**  
4. Server (with `FM_WVP_VIDEO_HANDOFF=1`) → WVP `ensurePlay` → `video-stream-ready` + `flvUrl`  
5. Client attaches **only** via `Me8LivePlayerFactory.attachFlvPrimary`  

### Gaps vs Face (FR)

| Face (works in lab) | ANPR Live (now) |
|---------------------|-----------------|
| FLV handoff **or** JSMpeg classic fallback | **FLV only** — no JSMpeg fallback |
| Signal / stall timers → clear tile states | Weak — can sit on **Connecting…** |
| Same `start-video` + WVP path | Same server path **if** online + handoff OK |

So: if WVP handoff fails for kk, or ready event is missed, Face may still recover on classic path; **ANPR Live cannot**.

Lab history also had moments where **kk alone** WVP `startPlay` failed — that would show as Connecting / error on any surface until WVP is healthy.

---

## Most likely causes (ordered)

1. **kk still offline** in fleet at Start time → tile Offline / empty slot.  
2. **WVP handoff fail** for kk → `video-stream-error` or silent hang on Connecting; ANPR has no classic fallback.  
3. **Server not restarted** after Live MOBs → old JS/server without `analytics-anpr` surface (less likely if you see 4 tiles + Stop all).  
4. Duplicate-start suppress only if same surface already owned — uncommon for first ANPR open.

---

## Recommended fix (one MOB)

### `ANPR-LIVE-VIDEO-ATTACH-PARITY-V1`

| # | Change |
|---|--------|
| 1 | Mirror FR attach: on `video-stream-ready`, FLV if present; else **JSMpeg** classic player (same as Face) |
| 2 | On `video-stream-error`, show **No video** on that tile (not endless Connecting) |
| 3 | If selected cam is offline at Start, show clear **Offline** on tile + short hint (“kk is offline — register BWC first”) |
| 4 | Optional: when fleet flips kk to online while watching, auto-retry that slot once |
| 5 | Do **not** change plate OCR / lists |

**PASS:** kk online → Face Live works → same kk on ANPR Live → tile **Live** (picture moving).  
If Face fails too → not this MOB; fix WVP/kk first.

---

## APPLY line

```
MOB-APPLY ANPR-LIVE-VIDEO-ATTACH-PARITY-V1
```

**No code in this disc.** Tell us: tile said Offline, Connecting, or Waiting — that picks cause 1 vs 2.
