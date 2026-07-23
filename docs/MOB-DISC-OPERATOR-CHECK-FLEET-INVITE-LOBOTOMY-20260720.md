# MOB DISC — How YOU check Fleet INVITE lobotomy (designer / no coding)

**Type:** DISC only — no APPLY / no code  
**For:** Operator (you). Not a coding task.  
**Related APPLY:** `MOB-APPLY-FLEET-INVITE-LOBOTOMY` (already applied; ME8 restarted)

---

## What “pass” means (plain language)

| Pass | Fail |
|------|------|
| Open Chin live → picture comes up as usual | Picture dead / stuck |
| Stop Chin → stops cleanly, no long hang | Stop feels stuck for many seconds |
| Agent/log shows lobotomy skip (no Fleet 408 fight) | Log still shows Fleet invite then 408 |

You do **not** read code. You only click the dashboard.  
Reading the log file is **optional for you** — usually you tell Cursor “I opened Chin and stopped — check log” and the agent checks.

---

## Before you start (30 seconds)

1. ME8 / UbitronC2 already running (we restarted after the APPLY).  
2. Browser: dashboard on your lab PC — e.g. `http://192.168.1.38:3988` (your real Wi‑Fi IP, **not** 172.x).  
3. Logged in as usual (`global` or your account).  
4. Chin **08** power on / on the map as usual.  
5. Do **not** need to press SOS or PTT for this check.

---

## Step-by-step (you)

### A) Hard refresh once

1. Open the Ops / map dashboard.  
2. Hard refresh the page once (Ctrl+F5 or Ctrl+Shift+R).  
3. Wait until fleet / pins look normal (~10–20 s is fine).

### B) Open Chin live

1. Open **Chin 08** pin (or Open live the way you normally do).  
2. Wait until **picture is up** (same as “live works as usual”).  
3. Leave it live ~5–10 seconds.  
4. Say out loud / note: **PASS live** or **FAIL live**.

You are **not** expected to open `fleet.log` yourself.

### C) Stop Chin

1. Press **Stop** on that Chin live (same Stop you always use).  
2. Watch the clock roughly:  
   - **Good:** picture/stop settles in a few seconds (normal).  
   - **Bad:** hangs a long time (feels like waiting ~10+ seconds for nothing).  
3. Note: **PASS stop** or **FAIL stop (hung)**.

### D) Tell Cursor one sentence

Copy something like:

> Chin 08: opened live → picture OK / not OK. Stop → clean / hung. Check lobotomy log.

That’s enough. Agent looks for:

- `invite skipped` … `wvp_fleet_invite_lobotomy`  
- **not** a new `invite requested` + `invite failed 408` for that open  
- on stop: `pool stop immediate` or quick `wvp stopPlay` (not long `pool stop deferred invite_in_flight`)

---

## What you should NOT do for this check

- Do not edit files  
- Do not restart Docker / WVP unless Cursor asks  
- Do not test cold SOS / cold PTT / Call for this check (separate genre)  
- Do not dig in `storage/fleet.log` unless you want to — agent can do it

---

## Optional: if YOU want to peek at the log (not required)

Only if you insist:

1. Ask Cursor: **“Check lobotomy for Chin 08 after my live+stop”**  
   OR open `storage/fleet.log` at the bottom and search the last few minutes for `lobotomy` / `408`.  
2. If you see `wvp_fleet_invite_lobotomy` near your open time → invite side PASS.  
3. If you see `invite failed` `408` right after that open → invite side FAIL (tell Cursor).

---

## Pass / fail card (fill mentally)

| Check | Result |
|-------|--------|
| Live picture | PASS / FAIL |
| Stop feels quick | PASS / FAIL |
| Agent confirms lobotomy in log | PASS / FAIL / pending |

**Whole check PASS** only if all three are PASS (or live+stop PASS and agent confirms log).

---

## After this check

- If PASS → invite race from last night is treated closed for WVP live/stop.  
- Cold PTT / cold SOS / pin PTT still separate — do not mix into this pass/fail.

**No code in this DISC. You only click Open → Stop → report.**
