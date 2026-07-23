# MOB DISC — Proxy restart NOT done · what next (2026-07-19)

**Status:** DISC only — **no code** until you say APPLY  
**You ran:** `START-WVP-LAB.ps1 -RestartProxy` → **red parse errors**  
**Question:** done? what next if done?

---

## Short answer

**Not done.** Proxy did **not** restart. Cold-SOS bridge in the proxy is **not** live from that command.

Two blockers:

| # | Blocker | Meaning |
|---|---------|---------|
| 1 | `START-WVP-LAB.ps1` line **151** parse error | PowerShell chokes on `(left running; use -RestartProxy…)` inside `Write-Host ("…" -f …)` — script never runs |
| 2 | `.env` has **`WVP_SIP_PROXY_LISTEN=0`** | Even a fixed script would print **DISABLED** and **not** start `wvp-sip-lan-proxy` (WVP owns `:5060` directly) |

No `wvp-sip-lan-proxy.js` Node process is running right now.

---

## What “done” would look like

1. Script runs without red errors.  
2. Log shows something like: `OK - SIP proxy listening :5060` **or** a clear DISABLED message if you intentionally keep listen=0.  
3. If listen=5060: `storage\wvp-sip-lan-proxy.out.log` has `UDP listen 5060` / `alarmBridge`.  
4. Then: ME8 already restarted (if `server.js` changed) → hard refresh Ops → test cold SOS / group PTT.

You are still before step 1.

---

## What next (pick one APPLY — paper until you say go)

### Option A — Fix bounce script only (smallest)

```text
MOB-APPLY-FIX-START-WVP-LAB-PS1-PARSE
```

Rewrite the bad `Write-Host` on line 151 (no nested `;` inside `-f` parens).  
Then re-run `-RestartProxy`.

**Still need:** if you want the Alarm bridge, `.env` must not stay at `WVP_SIP_PROXY_LISTEN=0`.

### Option B — Re-enable host SIP proxy + bounce (needed for proxy Alarm bridge)

```text
MOB-APPLY-WVP-SIP-PROXY-LISTEN-5060-RESTART
```

- Set `WVP_SIP_PROXY_LISTEN=5060` (and target `127.0.0.1:15061`)  
- Fix script parse if still broken  
- Restart proxy  

**Trade-off:** when listen=0, WVP binds `:5060` direct — that was a deliberate earlier choice. Turning proxy back on changes who owns `:5060`. Talk first if unsure.

### Option C — Stay listen=0 (no Node proxy)

Then **do not** chase proxy restart. Cold SOS via `wvp-sip-lan-proxy` **cannot** work. Next would be a different inbound path (WVP webhook / Fleet `:5062` home) — new DISC, not this bounce.

---

## Manual bounce (only after listen=5060 + script fixed)

Do **not** expect this to work while the `.ps1` is broken and listen=0.

After Option A/B APPLY:

```powershell
cd "C:\Users\user\Desktop\Enterprise Mobility\ME8"
powershell -ExecutionPolicy Bypass -File .\scripts\START-WVP-LAB.ps1 -RestartProxy -SkipDockerStart
```

---

## After proxy is really up — prove order

1. ME8 / Fleet already restarted if server changed.  
2. Proxy listening (or honest DISABLED).  
3. Hard refresh Ops.  
4. Test: ZLM live → Call unlock; cold SOS → banner; group PTT → server log `wvpBroadcast` / not silent drop.

---

## One line

**Not done — script parse fail + `WVP_SIP_PROXY_LISTEN=0`. Next: say APPLY A (fix script) and/or B (listen=5060), or C (drop proxy path).**
