# MOB DISC — How to restart wvp-sip-lan-proxy (2026-07-19)

**Status:** DISC only — **no APPLY** · operator how-to  
**Subject:** Restart `wvp-sip-lan-proxy` after GB28181 bridge / Alarm changes

---

## What it is

Host Node process: `scripts/wvp-sip-lan-proxy.js`

```text
BWC GB SIP → PC :5060 → wvp-sip-lan-proxy → 127.0.0.1:15061 (WVP Docker)
```

Also mirrors Alarm / cold audio INVITE → ME8 HTTP (`/api/lab/wvp/device-alarm`, `device-ptt-rx`).

**Not** the same as restarting ME8 / Fleet (`RESTART-FLEET.bat`).  
**Not** Docker WVP/ZLM restart (usually leave those alone).

---

## Prerequisite (.env)

Proxy only runs if:

```text
WVP_SIP_PROXY_LISTEN=5060
WVP_SIP_PROXY_TARGET=127.0.0.1:15061
```

If `WVP_SIP_PROXY_LISTEN=0` → proxy is **disabled** (WVP binds :5060 directly). Restarting the script then does nothing useful — START will say DISABLED.

---

## Easy way (recommended)

In PowerShell from the ME8 folder:

```powershell
cd "C:\Users\user\Desktop\Enterprise Mobility\ME8"
powershell -ExecutionPolicy Bypass -File .\scripts\START-WVP-LAB.ps1 -RestartProxy
```

Or double-click **`START-WVP-LAB.bat`** if you only need “start if missing” — that may **leave** an already-running proxy alone.

For a real bounce after code change, you need **`-RestartProxy`**.

Expect:

```text
Ensuring SIP LAN proxy listen 5060 -> 127.0.0.1:15061...
  stopping SIP proxy pid …
OK - SIP proxy listening :5060
```

---

## Manual way (if script fails)

1. Stop old process:

```powershell
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -match 'wvp-sip-lan-proxy\.js' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
```

2. Start again (from ME8 root; set listen from your `.env`):

```powershell
cd "C:\Users\user\Desktop\Enterprise Mobility\ME8"
$env:WVP_SIP_PROXY_LISTEN = '5060'
$env:WVP_SIP_PROXY_TARGET = '127.0.0.1:15061'
Start-Process node -ArgumentList '.\scripts\wvp-sip-lan-proxy.js' -WorkingDirectory (Get-Location) -WindowStyle Hidden `
  -RedirectStandardOutput '.\storage\wvp-sip-lan-proxy.out.log' `
  -RedirectStandardError '.\storage\wvp-sip-lan-proxy.err.log'
```

---

## Prove it is up

| Check | Where |
|-------|--------|
| Log line `UDP listen 5060` / `alarmBridge` | `storage\wvp-sip-lan-proxy.out.log` |
| Errors | `storage\wvp-sip-lan-proxy.err.log` |
| Port listen | Task Manager / `Get-NetUDPEndpoint -LocalPort 5060` (UDP) |

Cold SOS bridge only works **after** this process is running with the new script on disk.

---

## Order with ME8

1. Restart ME8 (`RESTART-FLEET.bat`) if `server.js` changed.  
2. Restart **proxy** with `-RestartProxy` (this disc).  
3. Hard refresh Ops if needed.

Do **not** use 172.x as server IP. Lab LAN example stays your real Wi‑Fi IP (e.g. `192.168.1.38`).

---

## One line

**Bounce proxy:** `START-WVP-LAB.ps1 -RestartProxy` from ME8 root — not Fleet restart alone.
