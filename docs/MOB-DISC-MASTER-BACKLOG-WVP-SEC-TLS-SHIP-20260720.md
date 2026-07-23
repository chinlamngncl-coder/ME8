# MOB DISC — Master backlog: WVP finish + Google security + TLS/HTTPS + ship

**Date:** 2026-07-20  
**Status:** LOCKED consolidation — no park, no option menus  
**Operator:** We still have Google vulnerabilities, TLS/HTTPS, handovers before shipping.

---

## Truth

Shipping is **not** “WVP picture works once.”  
Three **parallel** bodies of work — all required before customer zip:

| Track | What | Ship without it? |
|-------|------|------------------|
| **A — WVP/Fleet video finish** | Ops wall lifecycle, Command Wall, FR tiles, pin, audio | **No** — product broken |
| **B — Google security four-pack** | S0–S3 in `MOB-DISC-SEC-HARDEN-BEFORE-SHIP.md` | **No** — gate locked |
| **C — TLS / HTTPS / WSS + handover** | Browser mic, no mixed content, customer IT docs | **No** for multi-PC / WAN |

Lab can run **A** while **B** waits for a security morning. **C** is ship-genre — design once, APPLY once.

---

## Track A — WVP video + Fleet functions (lab now)

Locked order — `me8-wvp-finish-no-park.mdc`:

| # | MOB | Delivers |
|---|-----|----------|
| A1 | `FLV-WALL-LIFECYCLE-PARITY-V1` | Stopped by BWC, signal lost, stall — **PASS** |
| A2 | `COMMAND-WALL-FLV-HANDOFF-V1` | Command Wall Live — **PASS** |
| A3 | `FR-LIVE-WATCH-FLV-HANDOFF-V1` | FR live tiles — **PASS** |
| A4 | `PANEL-POPOUT-LIVE-FLV-HANDOFF-V1` | Per-panel popout (`live.html`) — **PASS** |
| A5 | `VIDEO-MATRIX-POPOUT-FLV-LOCAL-ATTACH-V2` | Matrix popout picture — **PASS** |
| A5b | `POPOUT-CLOSE-SAFE-V1` | Close popout → wall + pin stay live — **PASS** |
| A5b-fix | `POPOUT-MATRIX-FLV-READY-ACCEPT-V1` | Matrix black after Close-safe — **PASS** |
| A6 | `PIN-FLV-MIRROR-HARDEN-V1` | Map pin from wall FLV — FAIL layout jump |
| A7 | `PIN-FOCUSED-OPEN-V1` | REJECT — killed baseline auto-open |
| A7b | `PIN-BASELINE-OPEN-RESTORE-V1` | Restore Gold pin open — **APPLIED** (test pending) |
| A6 | `PIN-FLV-MIRROR-HARDEN-V1` | Map pin video |
| A7 | `PIN-FOCUSED-OPEN-V1` | Pin layout |
| A8 | `WALL-AUDIO-PATH-V1` | Wall listen |
| A9 | `CONFERENCE-BWC-INGRESS-WVP-HANDOFF-V1` | VC **let BWC in** under WVP handoff (backend) |
| A10 | `PTT-29201-WVP-HOMED-V1` | Soft PTT / Call (`:29201` when WVP-homed) |
| A11 | `SOS-GROUP-FIELD-RX-RELAY-V1` | **Field PTT mesh** — BWC→BWC on SOS team + dispatch group |
| A12 | `PTT-GROUP-SELECT-1PLUS-V1` | Group Join rules (1+, cross-group) |
| A13 | Panel polish MOBs | Jul-19 sizing |

**Attach rule (A2–A5, A6):** `Me8LivePlayerFactory.attachFlvPrimary` + `object-fit: contain` — **no per-BWC resolution hardcoding**. Optional refactor: `LIVE-HANDOFF-SHARED-ATTACH-V1`.

**Evidence / FR non-video** can continue during A — not blocked.

---

## Track B — Google security (ship blocker — not done)

Verified open in tree — `MOB-DISC-SEC-GOOGLE-FOUR-FINDINGS-PLAN.md`:

| # | MOB | Risk if shipped open |
|---|-----|----------------------|
| **S0** | `mob-sec-evidence-upload-safe-name` | Path traversal via multer `originalname` (token leak = write outside FTP_ROOT) |
| **S1** | `mob-sec-uncaught-exit` | Process limps half-dead after fatal error |
| **S2** | `mob-sec-sip-crypto-random` | Weak `Math.random` SIP ids in `server.js` |
| **S3** | `mob-sec-login-rate-lru` | Login Map OOM under IP flood |

**Order:** S0 → S1 → S2 → S3. One APPLY each. PASS between.

**Ship rule (locked):** customer zip **FAIL** if S0 open; prefer all four PASS.

---

## Track C — TLS / HTTPS / WSS + network handover (ship blocker — not done)

From `MOB-DISC-EVALUATE-HTTPS-WSS-ROUTING-20260719.md` — **facts today:**

| Item | Today | Ship need |
|------|-------|-----------|
| Dashboard TLS | **HTTP `:3988` only** | HTTPS on real LAN IP / domain |
| Browser mic (PTT/Call) | Works on `localhost`; **blocked/flaky on `http://192.168.x.x`** | **Secure context** |
| Video WS `:3989` / audio `:3989+2` | Hardcoded **`ws://`** | **`wss://`** or same-origin proxy |
| ZLM FLV `:18088` | Direct LAN hack for lab | **Same-origin proxy** — browser never needs raw ZLM on WAN |
| Reverse proxy in tree | **None** (no nginx TLS config) | Terminator + routing APPLY |

**Planned genre (names TBD on APPLY):**

| # | MOB area | Job |
|---|----------|-----|
| C1 | `DASHBOARD-HTTPS-LAN-V1` | TLS for Ops / Command Wall entry |
| C2 | `WSS-VIDEO-AUDIO-SOCKETS-V1` | Upgrade Socket.IO + PCM/video WS behind TLS |
| C3 | `SAME-ORIGIN-MEDIA-PROXY-V1` | FLV/ZLM via dashboard host (no mixed content) |
| C4 | `TRUST-PROXY-AND-HOST-V1` | `HOST` / X-Forwarded-For / multi-site (`MOB-DISC-SOFTOPEN-STALL-PAUSE-RES-MULTI-SITE`) |

**Handover docs (pack time):** `ME8-SECURITY-BASELINE.md`, `ME8-SMOKE-CHECKLIST.md`, `VERIFY-ME8-FRESH.ps1`, PRE-SHIP GATE (Node 22+, multer, root bats, signed license, factory hint gate, desk smoke).

---

## Master order (risk analysis — single path)

**Why not security first?** S0 is ship-critical but doesn’t unblock Command Wall today — operator needs **A1–A2** to work the product **now**.  
**Why not HTTPS before lifecycle?** HTTPS doesn’t fix Connecting… or Stopped by BWC.  
**Why security before ship?** S0 is CWE-class; no customer zip.  
**Why HTTPS before ship?** Second PC / customer site mic and mixed-content fail without C.

| Phase | Track | When |
|-------|-------|------|
| **Now → lab PASS** | A1 → A2 → A3 → A4 | Operator daily work |
| **Before first pack** | B: S0 → S1 → S2 → S3 | Security morning (focused) |
| **Before first pack** | C1 → C4 | After A2 PASS (need stable players to test WSS) |
| **Pack moment** | Pre-ship gate + VERIFY + handover docs | Last |

**Do not** mix tracks in one MOB bundle.

---

## What is NOT “still to do” for ship (already done / parallel)

- SOS ACL cold PASS (keep regression-tested)  
- Auth, TOTP, password rules (`ME8-SECURITY-BASELINE` §2)  
- WVP/ZLM docker base, `:5060` proxy  
- Dashboard connect warm  
- Evidence/FR **non-live** features  

---

## Operator: what to do

1. **Continue lab on Track A** — next: **`MOB-APPLY FLV-WALL-LIFECYCLE-PARITY-V1`**.  
2. **Schedule one security session** before pack — start **`MOB-APPLY mob-sec-evidence-upload-safe-name`**.  
3. **Schedule HTTPS genre** after Command Wall PASS — not tonight mixed with A1.  
4. **Do not ship** until B S0–S3 PASS + C HTTPS/WSS PASS + pre-ship gate + VERIFY.

Agent: recommend **only the next MOB in the master order** — no park, no menus.

---

## One line

**Yes — Google vulns, TLS/HTTPS/WSS, and WVP handovers are all still open; ship needs Track B + C on top of Track A; fix A1 first for lab, B before zip, C before customer LAN mic and WAN.**
