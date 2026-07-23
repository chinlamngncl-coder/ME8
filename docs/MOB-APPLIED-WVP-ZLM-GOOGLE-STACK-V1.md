# MOB-APPLIED: mob-wvp-zlm-google-stack-v1

**Date:** 2026-07-16  
**Status:** APPLIED  
**Trigger:** Operator — “just do it” + listen to Google  
**Related:** `docs/MOB-DISC-WVP-GOOGLE-FOUR-CHECKS-VS-FAILED-MOB.md`

---

## THE MOB NAME (so you know)

**`mob-wvp-zlm-google-stack-v1`**

That is what was applied. No more “mystery next.”

---

## Google checklist (done / honest)

| # | Google | Result |
|---|--------|--------|
| 3 | Secret / mediaServerId / hooks | **PASS** already (live selfcheck) |
| 4 | App → WVP API first | **Kept** (`startPlay` first) |
| 1 | Host net | **Not** forced on Windows Docker Desktop tonight (risky / different from Linux) |
| 2 | TCP Passive / 5060 rewrite | **Not** dumped on you — Fleet **5060 stays** |

**Blocker for true `wvp-zlm primary`:** WVP still shows **0 online** cams (stale Docker IP). GB `startPlay` cannot invent registration. Soft-after stays fail-open.

---

## What code does now (scale path without black panel)

1. Fleet INVITE + picture first (unchanged).  
2. Soft try **WVP-ZLM** (`wvp-zlm primary` if it works).  
3. If WVP play dead **and** Fleet already live → **Fleet→ZLM relay** soft overlay.  
4. Honest log if that works: **`live broker zlm-relay primary`** (not pretending WVP).  
5. If both miss → keep Fleet JSMpeg.

Also: wider WVP RTP **30000–30200**; FLV proxy on when `FM_LAB_WVP=1`.

---

## Operator (plain — one screen)

1. Restart **UbitronC2** once (new Node code).  
2. Hard refresh normal panel once.  
3. Open live like always.  
4. Wait a few seconds after picture.  
5. Tell me pass/fail.

I check log for:

- `live broker wvp-zlm primary` = real WVP path, **or**  
- `live broker zlm-relay primary` = ZLM media via Fleet relay (Google media plane), **or**  
- still neither = Fleet only  

No lab two-box. No SIP change.

---

## Files

- `lib/livePlaybackBroker.js` — `tryFleetZlmRelay` after WVP miss  
- `lib/zlmIngestLab.js` — FLV proxy when `FM_LAB_WVP=1`  
- `server.js` — FLV proxy routes when `FM_LAB_WVP=1`  
- `docker/wvp/docker-compose.wvp.yml` + `application-modern.yml` — RTP range  

---

## One line

**MOB = google-stack-v1. Hooks OK. WVP GB still offline. Soft path can use Fleet→ZLM; proof lines named above.**
