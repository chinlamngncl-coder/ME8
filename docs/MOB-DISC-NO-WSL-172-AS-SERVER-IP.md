# MOB DISC — Never use WSL/Docker 172 as server IP

**Status:** LOCKED 2026-07-12 — user furious; agent / Start bat fault  
**Search:** 172, WSL, Docker NIC, wrong IP, PTT dead, server IP  
**APPLY:** `mob-no-172-wsl` (detection + manuals)

---

## Plain answer

**Never tell anyone to use `172.17`–`172.31` as the Mobility server address.**  
That is usually **WSL / Docker fake network**. Cameras and PTT die.  

**Use real Wi‑Fi or Ethernet** — on this lab PC: **`192.168.1.38`**.  
Same PC browser only: `127.0.0.1` is OK. Not for bodycams.

---

## What went wrong

1. Agent said “use 192…” after damage — but earlier paths / Start bat could **open 172**.  
2. Install/Start picked **first** IPv4 — WSL `172.17.x` often wins.  
3. That felt like “manuals telling 172.” Unacceptable.

---

## Locked rules

1. **Never** recommend `172.17`–`172.31` for dashboard, SIP, PTT, or VC.  
2. Auto-detect must **skip** WSL / Hyper-V / vEthernet / Docker / vgate.  
3. Prefer Wi‑Fi / Ethernet, especially `192.168.x.x` or `10.x.x.x`.  
4. If HOST in `.env` is bad 172, Start must **re-pick** real LAN (or localhost), not open 172.  
5. Manuals must say **never 172.17–172.31** in clear words (en/fil/ko done).

---

## Files fixed this APPLY

| File | Change |
|------|--------|
| `scripts/me8-ship/ph-kr-ship/Get-UbitronPreferredLanIPv4.ps1` | Safe LAN pick |
| `Install-Ubitron.bat` / `Start Ubitron.bat` | Use helper; refuse bad 172 open |
| `NEW-ME8-INSTALL.ps1` | Same helper |
| Installation / Migration guides en·fil·ko | Never-172 warning |
| Desktop `Mobility Test 2\` | Synced bats + manuals |

**Already shipped CLIENT zip** may still have old Start pick — next rebuild gets the fix. Lab + Desktop folder updated now.

---

## Agent speech

| Say | Never say |
|-----|-----------|
| `192.168.1.38` / real WLAN | “Try 172.17…” as the server |
| “Wrong door — virtual NIC” | “Login on 172 is fine for PTT” |

---

## Record

| Item | Result |
|------|--------|
| User | Never 172 again |
| Lab truth IP | 192.168.1.38 |
| Detection | Skips WSL 172 |
