# MOB DISC — Why nothing works after Soft Open “off” (plain)

**Date:** 2026-07-17  
**Status:** DISC — honest — **no code until you APPLY**  
**You said:** Call still WVP (panel resolution changes). SOS / PTT / everything broken.

---

## Short answer

**You are right. Soft Open “off” did not give you classic Fleet back.**  
Env flags alone cannot fix this on your current cam wiring.

---

## What the log proves (tonight ~22:51)

When you opened live:

- `live broker wvp-zlm primary` for **both** Chin and kk  
- FLV host `192.168.1.38:18088` → **WVP→ZLM picture** (that’s why resolution looks like Soft Open/WVP)
- Stop still hits `wvp softopen stop bridge`
- PTT wake/group config **are sent**, but cams live on **WVP :5060**, not Fleet SIP **:5062**

So: **picture path = still WVP.** Not classic Fleet JSMpeg.

---

## Why (one picture)

```text
Your BWCs (one-row lab):
  Cam SIP → 192.168.1.38:5060 → WVP proxy → WVP
  Fleet SIP :5062  ← these cams do NOT register here

Soft Open “off” we did:
  FM_SOFTOPEN_WVP_ONLY=0  → only stops “skip Fleet INVITE” flag
  FM_LAB_WVP=1            → needed for online dots (presence)
  Same FM_LAB_WVP=1       → live broker STILL prefers wvp-zlm first

Soft Open UI storm files:
  video-wall / player / broker  → still DIRTY on disk (not restored yet)
```

**Online from WVP** and **classic Fleet live** fight each other on this one-row setup.

---

## What will **not** fix it by itself

- Changing Wi‑Fi IP / dashboard `:3988`  
- Hoping Soft Open flag alone restores SOS/PTT/classic call  
- Leaving Soft Open storm code in wall while testing “normal”

---

## Two real paths (you pick one APPLY)

### Path A — Stay one-row :5060 (WVP owns GB) — repair Soft Open mess first

Keep cams on **5060**. Undo Soft Open **UI storm** so wall/SOS/PTT chrome stop fighting. Picture may still be WVP until a later clean MVP.

```text
MOB-APPLY git-restore-softopen-storm-files-only
```

Then restart + refresh + TEST.

### Path B — Classic Fleet again (real SOS / PTT / Fleet live)

Cams must REGISTER to **Fleet SIP :5062** (BWC server port change on the cam — not agent freestyle).  
Then we can turn `FM_LAB_WVP=0` and presence comes from Fleet SIP again.

```text
MOB DISC bwc-rekey-fleet-sip-5062
```

(paper first — you confirm before any cam typing)

---

## Recommended now

**Path A tonight** (no cam rekey): paste  

```text
MOB-APPLY git-restore-softopen-storm-files-only
```

That was already step 5 on the cheat sheet — we delayed it; Soft Open storm code is still what’s hurting SOS/PTT feel while WVP still owns the call.

---

## One line

**Soft Open off ≠ classic Fleet; with cams on :5060 and FM_LAB_WVP=1, live is still WVP — next undo Soft Open storm files (Path A) or rekey cams to Fleet :5062 (Path B).**
