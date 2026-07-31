# IT Administrator Manual — Mobility Axiom (ME8)

**Audience:** End-client IT staff  
**Product:** Mobility Axiom (Ubitron)  
**Purpose:** Self-resolve Setup PIN, port conflicts, and hardware clock failures using Glass Fortress logs.

---

## 1. Where to find logs

### Windows (service install)

| What | Where |
|------|--------|
| Service stdout | `storage\service-stdout.log` (under the ME8 install folder) |
| Service stderr | `storage\service-stderr.log` |
| Fleet app log | `storage\fleet.log` |
| Setup PIN at boot | Same stdout log — search for **`[ACTION REQUIRED] Setup Mode Active. Web UI PIN:`** |

### Linux (systemd)

```bash
journalctl -u me8-server -e
# or whatever unit name IT installed (see scripts/me8-ship/me8-server.service)
```

Search for: `[ACTION REQUIRED]`, `[GLASS-FORTRESS]`, `[sip-bridge]`, `[setup]`.

### Lab console

If ME8 was started in a console window (`node bin/me8-server.js` or `RESTART-FLEET.bat`), the PIN and Glass Fortress blocks print **in that window**.

---

## 2. Setup Mode PIN

When license is missing/invalid, or `--safe-mode` is used, ME8 opens **Setup only** (no video stack).

1. Open the Setup page on the **server itself**: `http://127.0.0.1:13988` (default; see log if port changed).
2. Read the **6-digit PIN** from the log line:
   ```text
   [ACTION REQUIRED] Setup Mode Active. Web UI PIN: 482917
   ```
3. Type that PIN in the Setup page field.
4. Upload `license.lic` and/or save network tier.

**Without the PIN, license upload and tier save are rejected (HTTP 401).**  
The PIN is **random each Setup boot** and is **not** stored in `.env`.

---

## 3. How to read Glass Fortress errors

Every serious fault is printed as three lines:

```text
[GLASS-FORTRESS]
[WHAT HAPPENED]  …
[WHY IT HAPPENED] …
[HOW TO FIX IT]   …
```

| Line | Meaning |
|------|---------|
| **WHAT** | Symptom (what failed) |
| **WHY** | Likely cause |
| **HOW** | Exact next step for IT |

Do not ignore the **HOW TO FIX IT** line — it is written for operators, not developers.

---

## 4. Port already in use (EADDRINUSE)

ME8 retries a busy listen port **5 times** (1 second apart). If it still fails, Glass Fortress tells you to find the conflicting process.

### Windows

```bat
netstat -ano | findstr :13988
netstat -ano | findstr :4438
netstat -ano | findstr :5060
```

Note the **PID** in the last column → Task Manager → Details → End task (or `taskkill /PID <pid> /F` if authorized).

### Linux

```bash
sudo lsof -i :13988
sudo ss -lptn 'sport = :13988'
```

Stop the conflicting service, then restart ME8.

**Common conflicts**

| Port | Typical owner |
|------|----------------|
| 13988 / 13989 | Another Setup / me8-server instance |
| 4438 / 3988 | Dashboard already running |
| 5060 | Old SIP bridge or another SIP app |
| 5061 | Docker WVP SIP publish |

---

## 5. Hardware clock invalid (CMOS / BIOS)

If the PC clock is **before 2026-01-01 UTC**, boot opens Setup with:

```text
HARDWARE_CLOCK_INVALID
```

This is **not** a license rollback and **not** a bad signature.

**Fix**

1. Enter BIOS/UEFI → set correct date and time (enable NTP in the OS after boot if available).
2. If the clock resets every power loss → **replace the CMOS battery**.
3. Restart ME8 / the Windows service.
4. Complete Setup (PIN + license) if still required.

---

## 6. SIP bridge (cameras register)

Cameras talk to the **server LAN IP** on the **SIP listen port**. A small bridge process forwards that traffic to Docker WVP on **127.0.0.1** (usually port **5061**).

- Bridge starts automatically with ME8 when licensed.
- Listen port is chosen in memory (does **not** rewrite `.env`):
  1. Settings UI `sip.sipPort` (`storage/server-settings.json`)
  2. Else `WVP_SIP_PROXY_LISTEN`
  3. Else `FM_GB28181_SIP_PORT`
  4. Else `5060`
- Target is always **`127.0.0.1:<port>`** (default port **5061**).
- If listen port **equals** target port, the bridge **refuses to start** (loop protection) and logs Glass Fortress.

If cameras will not register: confirm Docker WVP is up, bridge log shows `UDP listen`, and the BWC is pointed at the correct server IP + listen port.

---

## 7. Quick checklist

1. Service / process running?  
2. Logs show Glass Fortress? Follow **HOW TO FIX IT**.  
3. Setup Mode? Enter PIN from stdout / `service-stdout.log`.  
4. Clock before 2026? Fix BIOS first.  
5. Port busy? `netstat` / `lsof`, free the port, restart.  
6. Cameras offline? Docker WVP + SIP bridge listening + BWC IP/port match.

For license files and hardware ID issuance, contact your Ubitron license desk — IT does not generate private signing keys on the customer host.
