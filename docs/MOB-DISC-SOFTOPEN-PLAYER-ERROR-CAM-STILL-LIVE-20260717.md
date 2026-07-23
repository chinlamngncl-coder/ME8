# MOB DISC — Soft Open FAIL: Player error · BWC still live

**Date:** 2026-07-17  
**Type:** Paper only — no code until named `MOB-APPLY`  
**Operator report:** Soft Open → panel **Player error** · BWC **not** stopped · cam **still playing**

**Update 2026-07-17:** Picture fix APPLIED — `mob-softopen-picture-mpegts-g711-v1` (mpegts `hasAudio:false` like lab tile). Re-test Soft Open Chin after hard refresh.

---

## Verdict (one screen)

This FAIL is **two facts glued together**, not one bug:

| # | What you see | Meaning | Status |
|---|--------------|---------|--------|
| A | Panel **Player error** · no picture | Browser never got playable FLV (or empty media) | **OPEN** — Soft Open picture still broken |
| B | BWC still live / recording | SIP session still up — no BYE | **EXPECTED** after `mob-softopen-no-auto-stop-on-player-fail-v1` |

We **removed** auto-stop on player fail because it BYE’d the cam in ~1s and made Soft Open useless.  
So: **Player error ≠ Stop.** Cam stays live until **you** press Stop (or we add a new, deliberate policy).

---

## What is working vs not

| Piece | State |
|-------|--------|
| SIP / NAT · cam `200 OK` | PASS (earlier) |
| Broker hands LAN FLV `192.168.1.38:18088` | PASS (log) |
| mpegts / picture on wall | **FAIL** → Player error |
| Auto BYE on player fail | **Off on purpose** (last MOB) |
| Stop live → WVP `stopPlay` bridge | APPLIED — only when Stop is pressed |

If you **did not** press Stop after Player error → cam still playing is **correct** for current rules.  
If you **did** press Stop and cam still playing → that is a **separate** FAIL of the stop bridge (say so next test).

---

## Why Player error while URL looks fine

Typical chain (already proven in lab logs):

1. Soft Open → WVP startPlay → `live broker wvp-zlm primary`
2. UI opens `http://192.168.1.38:18088/...` (or proxy fallback)
3. mpegts errors / prove timeout → **Player error**
4. UI cleans ghost chrome · **does not** call WVP stop

Likely causes for (3) — **not** YDT:

| Suspect | How to tell |
|---------|-------------|
| ZLM stream empty (SIP OK, no RTP/media) | ZLM / WVP log: stream timeout · `media presence online:false` |
| Browser cannot reach `:18088` | Other PC / firewall · open FLV URL in Chrome on the dashboard machine |
| CORS / mixed content | DevTools Network on FLV request |
| Codec / FLV header | mpegts ERROR in console |

**GB + YDT stays.** Picture path is GB→WVP only. Do not drop YDT to fix Player error.

---

## Three next directions (pick one — then MOB-APPLY)

### Option 1 — Fix picture (recommended next Soft Open genre)

**Name sketch:** `mob-wvp-zlm-empty-media-or-player-prove-v1` (exact name when we scope)

- Prove media on ZLM after SIP 200 (wait / poll tracks before telling UI “ok”)
- Or fix player URL / proxy if Network shows fail
- Goal: **Live** picture, not Player error

### Option 2 — Stop policy (only if you want cam off when picture dies)

**Name sketch:** `mob-softopen-bye-after-player-fail-delayed-v1`

- e.g. BYE only after N seconds of sustained player fail · **not** instant 1s
- Or: UI button “End session” always BYE; Player error leaves cam live (today)

Do **not** re-enable instant auto-stop — that was the 1s FAIL.

### Option 3 — Prove Stop bridge alone

1. Soft Open Chin (expect Player error for now)  
2. Press **Stop live** once  
3. Pass = cam leaves live + fleet.log `wvp softopen stop bridge done`  
4. Fail = cam still live after Stop → fix stop bridge, not picture

---

## Operator check (no APPLY)

After Player error:

1. Did you press **Stop live**?  
   - **No** → cam still playing = expected.  
   - **Yes** → tell agent “Stop pressed, cam still live” = stop-bridge FAIL.  
2. Optional: open browser console — any `[me8-zlm] soft play` / red mpegts errors?  
3. Keep **GB + YDT**; Soft Open test = **Chin** (KK offline OK).

---

## Locked related discs

- `MOB-DISC-SOFTOPEN-GB-ONLY-VS-GB-YDT-20260717.md` — go on dual; picture ≠ YDT  
- `MOB-APPLIED-SOFTOPEN-NO-AUTO-STOP-ON-PLAYER-FAIL-V1.md` — why no auto BYE  
- `MOB-APPLIED-WVP-SOFTOPEN-STOP-BRIDGE-V1.md` — Stop → WVP stop  
- `MOB-APPLIED-WVP-ZLM-FLV-PLAYER-ERROR-V1.md` — LAN FLV (picture still FAIL)

---

## One line

**Player error = no picture (open). BWC still live = no Stop / no auto-BYE (by design). Next = fix media/player, or press Stop to prove BYE — say which.**
