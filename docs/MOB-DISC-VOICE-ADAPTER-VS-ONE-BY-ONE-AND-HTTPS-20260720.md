# MOB DISC — VoiceAdapter ≠ one-by-one; what to APPLY first; HTTPS / real IP

**Type:** DISC only — **no APPLY / no code**  
**Date:** 2026-07-20  
**Asks:** Is VoiceAdapter the same as patching one-by-one? Last approach? What to APPLY to get voice up first? HTTPS so clients use LAN IP, not localhost.

---

## 1. VoiceAdapter vs one-by-one — not the same

| Approach | What you touch | Risk |
|----------|----------------|------|
| **UI one-by-one** (last APPLY) | Each button in dashboard (`PTT`, `Call`, group wake…) → own `fetch` / bypass | Easy to **miss** intercom, SOS team, pin PTT, command-wall, CallMic path, etc. |
| **Fleet VoiceAdapter (one backend gate)** | **One** place inside UbitronC2: “if WVP-managed cam → translate existing Fleet voice events to WVP audio” | Frontend / product surface stays Fleet. New voice entry points that already emit `ptt-start` / `start-bwc-call` / group get the adapter **for free** |

So: VoiceAdapter is **not** “patch Call, then patch PTT, then patch group.”  
It is **one last translation layer** under the sockets Fleet already has.

**Caveat (honest):** the **first** VoiceAdapter APPLY still has to implement the **media path once** (open talk + push mic + stop). That is one hard engineering job — not N UI jobs. After that, you do **not** keep rewriting buttons.

UI-direct from yesterday = probe / wrong long roadmap. Prefer **revert or idle** that UI bypass once VoiceAdapter owns voice (separate named APPLY if you want cleanup).

---

## 2. Is VoiceAdapter “the last”?

**For outbound desk→cam voice on WVP-homed BWCs: yes — that should be the last architecture.**

Not “last forever for the whole product”:
- Cold SOS / live ZLM already PASS — leave them  
- HTTPS is a **separate** ship/lab gate (below)  
- Cold **cam-button PTT** (device→desk) may still need inbound event later — different from desk PTT/Call  

But you should **stop** inventing new voice wiring styles after VoiceAdapter lands.

---

## 3. What to APPLY first (to get voice up)

**Goal:** operator holds PTT / taps Call on Chin → cam ear hears desk (and ideally mic uplink works).

### Recommended APPLY name (when you order it)

`MOB-APPLY-FLEET-VOICE-ADAPTER-WVP-V1`

**Scope (voice-first, one MOB):**

1. **Backend only (primary)**  
   - Keep existing sockets: `ptt-start` / `ptt-stop` / `ptt-audio`, `start-bwc-call` / `end-bwc-call` / `call-audio` (and group fan-out already using those).  
   - For WVP-managed cams: route those through one adapter → WVP audio APIs (broadcast/talk) via **server-side** `wvpLabClient` (same-origin already; no browser→18080).  
   - Do **not** require new per-button `fetch` in UI for this V1 if we restore Fleet socket path as the product API.

2. **UI**  
   - Prefer: **undo** UI-direct bypass for WVP (or leave idle) so dashboard talks Fleet sockets again → adapter.  
   - Do **not** add more button-specific WVP fetches.

3. **Off-limits**  
   - SOS / proxy / event bus  
   - Live lobotomy / ZLM  
   - FR / layouts  

4. **HTTPS** — **not inside the voice-first MOB** unless you explicitly bundle it. VoiceAdapter works on `http://192.168.1.38:3988` **today** for lab (browser mic may warn on insecure context — see §4).

**Operator smoke after that APPLY:** hard refresh → live (unchanged) → hold PTT → Call → confirm ear; cold SOS still PASS.

---

## 4. HTTPS / “no client uses localhost” — separate truth

| Concern | Fact |
|---------|------|
| Clients use LAN IP | Correct — lab is `http://192.168.1.38:3988`, never tell clients `localhost` / `127.0.0.1` for dashboard |
| Same-origin voice proxy | Browser calls **`http(s)://<LAN>:3988/api/lab/wvp/...`** — Node talks WVP on `127.0.0.1:18080` **on the server**. That server loopback is fine; **operators never open 18080** |
| Why HTTPS matters | Chrome treats **mic** as needing **secure context**: `https://` or `http://localhost`. On **`http://192.168.1.38`** mic/PTT/Call can be blocked or flaky even if REST broadcast start returns 200 |
| WSL 172.x | Still forbidden as “server IP” for clients |

So:

- **VoiceAdapter** = fix routing (Fleet → WVP audio).  
- **HTTPS on :3988 (or TLS terminator)** = fix **browser mic on real LAN IP** for every client PC.

### Suggested order

1. **`MOB-APPLY-FLEET-VOICE-ADAPTER-WVP-V1`** — get talk path working (server + sockets). Smoke on lab machine if needed.  
2. **`MOB-APPLY-DASHBOARD-HTTPS-LAN`** (name TBD) — certificate + HTTPS listen / reverse proxy so clients use `https://192.168.1.38:…` with mic allowed.  
   - Can be parallel discussion, but **don’t block** VoiceAdapter design on HTTPS pack details.  
   - If mic is dead on HTTP LAN **right now**, say so in smoke — we may need HTTPS **before** declaring voice PASS on a second PC.

**Do not** point browsers at WVP `localhost:18080`. Ever.

---

## 5. One-screen decision for you

| If you want… | Say |
|--------------|-----|
| Voice up first (Fleet sockets → one adapter; no more button surgery) | `MOB-APPLY-FLEET-VOICE-ADAPTER-WVP-V1` |
| Also clean yesterday’s UI-direct bypass | Include in that APPLY or follow with `MOB-APPLY-VOICE-UI-DIRECT-REVERT` |
| Mic works on every client via LAN IP | Separate: `MOB-APPLY-DASHBOARD-HTTPS-LAN` (after or beside voice) |
| Keep UI-direct forever | Not recommended (your own “miss functions” concern) |

---

## Bottom line

- VoiceAdapter is **one backend gate** — **not** endless one-by-one UI patches; it should be the **last voice architecture** for WVP-homed cams.  
- **Apply first for voice:** `MOB-APPLY-FLEET-VOICE-ADAPTER-WVP-V1`.  
- **HTTPS** is required for **real-IP client mics**, not for Node→WVP; treat as its own APPLY so we don’t mix TLS pack with adapter wiring.

**No code.** Reply with the APPLY phrase when ready.
