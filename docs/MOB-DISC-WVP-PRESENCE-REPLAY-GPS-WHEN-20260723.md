# MOB DISC — Lock → Unlock pin gone — WHEN to APPLY

**Status:** DISC locked — **no APPLY** until you say the phrase  
**Date:** 2026-07-23  
**MOB name:** `WVP-PRESENCE-REPLAY-GPS-ON-ONLINE-V1`

---

## What is broken (plain English)

1. Pin is on the map (GPS known).  
2. You **Lock** the BWC → pin may go offline-style.  
3. You **Unlock** → BWC comes back **online via WVP presence**.  
4. Pin **stays gone** until a fresh GPS packet arrives.

**Lock does not wipe GPS.**  
Fleet **REGISTER** already replays last GPS to the map.  
**WVP “became online”** (used after unlock in this lab) **does not** — that is the bug.

Code fact (`server.js` `onBecameOnline`): clears offline-pin session, marks online, pushes roster — **no** `gps-update` / `maybeQueryGpsForDevice`.  
REGISTER path **does** replay `lastGpsByCam`.

---

## WHEN to do this MOB

| Do it now if… | Wait if… |
|---------------|----------|
| You care about **map pin after Lock→Unlock** | You are mid-PASS on another named MOB (one at a time) |
| Centre Summary / Settings UI work is done or parked | You only care about FR Verify / Snapshot today |
| Chin is online and had a pin **before** lock | Device never had GPS (nothing to replay) |

**Not blocked by:** FR ops checklist, Snapshot log proof, Fit pins.  
**Blocked by:** another open APPLY you have not finished testing.

### Recommended order (tonight’s remaining product bugs)

1. Centre Summary server fix — if still FAIL, finish that first (`CENTRE-SUMMARY-AWAIT-AUDIT-PG-V1` needs **restart + PASS**).  
2. **Then this:** `MOB-APPLY WVP-PRESENCE-REPLAY-GPS-ON-ONLINE-V1` ← **default next map fix**  
3. FR = your ops check (no code until ready-line + still FAIL)  
4. Snapshot = you click once; agent counts log (see Snapshot disc)

**You can jump here anytime** by saying the APPLY phrase — as long as no other MOB is half-applied.

---

## What APPLY will change (preview)

**In scope:** On WVP `onBecameOnline`, if `lastGpsByCam` exists → emit `gps-update`; else query GPS once.  
**Out of scope:** Changing Lock/Unlock SIP; Fit pins; FR; Snapshot.

**PASS (you):** Pin visible → Lock → Unlock → pin **comes back** without waiting forever for a new GPS.

---

## Phrase when ready

**`MOB-APPLY WVP-PRESENCE-REPLAY-GPS-ON-ONLINE-V1`**

Until then: disc only.
