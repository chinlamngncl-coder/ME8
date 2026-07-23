# MOB DISC — Fleet VoiceAdapter WVP V1 (rules locked; one path)

**Type:** DISC only — **no code until you say go ahead / confirm APPLY**  
**Named work:** `MOB-APPLY-FLEET-VOICE-ADAPTER-WVP-V1`  
**Date:** 2026-07-20

---

## Rules this genre obeys (read once — locked)

1. **Zero change without APPLY** — this file is paper; code only after you confirm this plan is good (go ahead / APPLY).  
2. **One MOB at a time** — this MOB only. No bundling HTTPS, SOS, live, FR.  
3. **No park / no “give up” / no remarry menus** — agent does not offer abandon, rollback-as-product-choice, or alternate architectures as a buffet.  
4. **Agent decides the how** — one concrete plan below. Not three options for you to pick.  
5. **Off-limits (hard):** cold SOS + SIP proxy + event bus; live ZLM + invite lobotomy; FR / redaction / layout rewrite.  
6. **No 172.x as client server IP** — dashboard stays real LAN (e.g. `192.168.1.38`).  
7. **Firmware Gold live/pin cores** — not touched in this MOB.  
8. **Operator is not tech** — after APPLY: you restart/refresh once if told; pass/fail from ear + SOS still red; agent owns logs.

---

## Decided plan (only path — not a menu)

**Product:** Fleet UI stays Fleet. Desk PTT / Call / group that already use Fleet sockets keep working the same for the operator.

**Media:** For WVP-managed BWCs, UbitronC2 **VoiceAdapter** translates those sockets → WVP audio REST via existing `wvpLabClient` (JWT on Node). Browser does **not** call `:18080`.

**UI-direct (`fetch` broadcast) from yesterday:** treated as temporary probe. This APPLY **routes voice through Fleet sockets + adapter** so we do not keep button-by-button WVP fetches. Agent will remove or idle that bypass **as part of this same APPLY** so there is one voice path — not “optional revert later.”

**HTTPS:** **not** in this MOB. Mic-on-LAN-IP TLS is a later named APPLY. Lab can smoke VoiceAdapter on current `http://192.168.1.38:3988` (or localhost on the Fleet PC if mic needs secure context for a first proof).

**Inbound cold cam-PTT:** not this MOB. Desk→cam voice first.

---

## What APPLY will change (when you green-light)

| Area | Change |
|------|--------|
| `server.js` / small `lib/` voice adapter | WVP-managed: `ptt-start` / `ptt-stop` / `ptt-audio`, `start-bwc-call` / `end-bwc-call` / `call-audio` → adapter → WVP broadcast/talk |
| Frontend | Stop WVP-only `fetch` bypass; sockets again (minimal glue only — not layout rewrite) |
| 29201 | Stay skipped for WVP-managed (already gated) |
| SOS / proxy / ZLM live | **Zero** |

---

## Pass / fail after APPLY (your test)

1. Cold SOS still OK.  
2. Live open/stop still OK.  
3. Hold software PTT and/or Call — cam ear (and mic if browser allows).  
4. Agent reads log: adapter path, no Fleet video INVITE, no SOS regression.

If fail: agent fixes **this** voice adapter — does not offer “park voice” or “go back to classic SIP” as a product choice.

---

## Bottom line

- VoiceAdapter is the **one** voice architecture for WVP-homed cams — not endless one-by-one UI patches.  
- This DISC is the plan. **No code yet.**  
- When you say **go ahead** or **MOB-APPLY-FLEET-VOICE-ADAPTER-WVP-V1** again as execute — agent implements this path only.
