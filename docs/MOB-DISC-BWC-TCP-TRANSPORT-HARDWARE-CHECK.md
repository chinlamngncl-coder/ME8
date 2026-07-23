# MOB DISC — BWC hardware: confirm TCP transport (Chin / kk)

**Date:** 2026-07-17  
**Status:** Operator hardware check — agent cannot open BWC web UI  
**Related software:** WVP `streamMode` = **TCP-PASSIVE** (lab)

---

## Why

Software asks the cam for **TCP** video into ZLM. If the BWC firmware is locked to **UDP only**, INVITE/handshake can fail even when Soft Open / channels are fixed.

---

## Do this on each cam (Chin and kk)

1. Open the **BWC web / settings UI** (vendor menu — not Axiom).  
2. Find **GB28181** or Video / Network / Stream settings.  
3. Look for: **Transport Protocol** · **Stream Protocol** · **RTP Protocol** · similar.  
4. If set to **UDP** → change to **TCP** (or **Auto / Both** if that exists).  
5. Save · reboot cam if the UI requires it.

---

## Do NOT change

| Field | Keep |
|-------|------|
| Server IP | PC `192.168.1.38` |
| Port | **5060** |
| Platform / domain / password | WVP values already set |

---

## Pass

Soft Open shows real video after channel dedupe + real LAN hostAddress, **and** BWC transport is TCP (or Auto).

---

## One line

**On the cam: GB stream transport = TCP (or Auto). Do not change server IP/port.**
