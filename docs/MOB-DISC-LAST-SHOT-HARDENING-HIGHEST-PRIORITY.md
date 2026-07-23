# MOB DISC — LAST SHOT HARDENING = highest pre-ship priority

**Status:** LOCKED 2026-07-17 ~01:45  
**Source of truth (operator):** `C:\Users\user\Desktop\LAST SHOT HARDENING.docx`  
**Search:** `last shot`, `hardening`, `google wvp`, `keep wvp at a side`, `before ship`, `repeating afternoon`  
**Rule:** This doc + the DOCX outrank wake-up queues and side genres until live/ship ledger rows are cleared.  
**No code** until you `MOB-APPLY` a named row.  
**No ship/TOTP nag** — this is the hardening ledger you ordered.

---

## Understood

1. **LAST SHOT HARDENING.docx** = master pre-launch blueprint (Google + audit).  
2. Everything in it must be **recorded** and **solved one by one** before customer ship.  
3. Other “before ship” reminders stay on the desk — **this stays #1 priority**.  
4. Tonight’s Soft Open FAIL (Chin hang / kk STOPPED BY BWC) is the **same class as afternoon**: soft path parks on dead WVP while Plan B is weak — **do not repeat that loop**.

---

## What Google / the DOCX says about WVP + ZLM (honest map)

### A — “WVP kept at the side” (DOCX Part 1 #6)

| DOCX | ME8 truth now |
|------|----------------|
| `FM_LAB_WVP !== '1'` sequesters WVP | Soft broker **does** call WVP when flag=1, but wall still **fail-opens to Fleet pool** when startPlay dies |
| “Wall relies on liveStreamPool / FFmpeg” | **Still true for picture tonight** — log: `wvp_startplay_failure` / `receive_stream_timeout` → not `wvp-zlm primary` |
| “Strip lab gate, route players to WVP” | **Goal** — but **not** by hanging Soft Open on dead startPlay |

**Network IP / Docker class (our lab + Google thread, same genre):** WVP in Docker saw device host as **`172.x`** (SNAT). We applied proxy + register-mirror + SQL LAN patch. Rows can show LAN — **stream still times out**. So: IP stamp work ≠ Plan A picture. **Do not treat more register MOBs as the ops fix.**

### B — Plan A: WVP ↔ ZLM (DOCX Part 2)

| DOCX | ME8 |
|------|-----|
| Keepalive / hooks so WVP sees ZLM | **PASS** — `media_server/list` status true (`mob-wvp-zlm-media-online-v1`) |
| Hook URL `http://127.0.0.1:18080/...` | **Reject for our Docker ZLM** — inside `me8-wvp-zlm`, `127.0.0.1` is ZLM itself. Correct: `http://me8-wvp:18080/...` (already locked) |
| `mediaServerId` / secret match | Match on modern split (`me8-zlm-modern`) |
| TCP Passive on play | **Later MOB** — after INVITE/RTP actually answers |

### C — Plan B: fail-open FFmpeg → ZLM relay (DOCX Part 2)

| DOCX | ME8 |
|------|-----|
| Not `-c:v copy` into FLV/mpeg path | Agree — need transcode |
| `-fflags +genpts+discardcorrupt` before `-i` | **APPLIED** `mob-zlm-relay-discardcorrupt-v1` |
| Bigger analyze/probe · `-ignore_unknown` | **APPLIED** (same MOB) |
| `libopenh264` | Already direction / applied earlier |
| **No** hardcode `-vf scale` | **APPLIED** — scale removed; do not re-introduce |

**This is the Google fix we keep skipping while chasing WVP register.** Afternoon + tonight FAIL = soft waits on WVP, Plan B not hardened.

---

## DOCX Part 1 — six structural weak points (record only; order after live)

| # | DOCX bug | Pre-ship lane (named later) |
|---|----------|------------------------------|
| 1 | `readdirSync` / sync disk in hot path | `mob-ship-async-ftp-readdir-v1` |
| 2 | Swallow `uncaughtException` → zombie | `mob-ship-fatal-exit-on-uncaught-v1` |
| 3 | In-memory Maps block multi-node | Valkey / shared state genre (cluster) |
| 4 | Socket.io manual forEach GPS | Rooms genre |
| 5 | SQLite multi-writer trap | Postgres genre (cluster) |
| 6 | WVP behind lab gate | Product WVP path — **after** fail-open + Plan B harden |

Part 3 (Swarm / Valkey / SAN) = **scale genre after** single-node live PASS — not tonight’s Soft Open fix.

---

## Why we must not repeat afternoon

| Afternoon / tonight pattern | Wrong next move |
|----------------------------|-----------------|
| Soft tries WVP → `receive_stream_timeout` → wall stuck “Live streaming…” | Another WVP-only register/IP MOB while ops black |
| kk STOPPED BY BWC / start-stop | Ignore Plan B harden + stall truth |
| Google said discardcorrupt + openh264 | Keep “solving” Plan A SIP while Plan B still crashes/0x0 |

**Right next:** protect Fleet picture first, apply Google Plan B args, **then** WVP INVITE/RTP — not the reverse.

---

## Suggested next (one MOB — your APPLY)

### Now (highest — ops picture)

**`MOB-APPLY mob-live-broker-failopen-fast-v1`**

- Cap WVP soft try (~&lt;2s) → Fleet/zlm-relay immediately  
- Wall must not sit on “Live streaming…” for a full WVP timeout  
- Does **not** claim Plan A win  
- Does **not** strip `FM_LAB_WVP` yet (DOCX #6 later)

### Immediately after L1 PASS

**`MOB-APPLY mob-zlm-relay-discardcorrupt-v1`**  
= Google / DOCX Plan B packet filter (no scale hardcode).

### Then (Plan A stream — not register again)

**`mob-wvp-invite-rtp-answer-v1`**  
Why LAN host still `receive_stream_timeout` / `deviceOnline:false` at play.

### Then DOCX structural #1–#2 (single-node ship safety)

Async FTP readdir · fatal exit on uncaught.

### Cluster Valkey / Postgres / Swarm

Only after single-node live + ship-gate PASS — Part 3 of DOCX.

---

## Priority stack (locked)

1. **LAST SHOT HARDENING** live Plan A/B rows (fail-open → discardcorrupt → WVP RTP)  
2. DOCX structural #1–#2  
3. Redact handoff prove (already APPLIED — operator refresh)  
4. Other wake queues (companion / FR / security)  
5. Cluster Part 3  

---

## One line

**LAST SHOT HARDENING is #1 pre-ship. Google: WVP was lab-sided; hooks/ID (keepalive PASS); Plan B = discardcorrupt+openh264 still owed. Next APPLY = failopen-fast, not another afternoon WVP hang.**
