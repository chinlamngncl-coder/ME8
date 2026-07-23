# MOB-APPLIED: mob-wvp-hostaddress-real-lan-v1

**Date:** 2026-07-17  
**Status:** APPLIED  
**Paper:** `MOB-DISC-WVP-HEARTBEAT-HOSTADDRESS-FAIL-20260717.md`  
**Supersedes for hostAddress:** `mob-wvp-invite-rtp-answer-v1` (PC `:5060` as WVP host)

## Problem

WVP `hostAddress` was patched to **PC `192.168.1.38:5060`**. Soft Open / INVITE did not call the real BWC. Keepalive also aimed at the PC → flapping offline.

## Fix

`updateDeviceInviteRoute` / `syncLanSourceIps` set WVP `ip` + `hostAddress` to **remembered real LAN** from `storage/wvp-sip-lan-map.json` (Chin `.131`, kk `.132` + Contact port).

REGISTER still enters via host SIP proxy **5060**. Ports unchanged.

## Files

- `lib/wvpLabClient.js` — real-LAN invite route + sync skip `already_real_lan`

## Operator

1. Restart Fleet (loads new code; proxy sync will keep real LAN).  
2. Hard refresh.  
3. Soft Open Chin/kk — cam should ring/answer path.  
4. Confirm WVP device host shows `192.168.1.131:…` / `192.168.1.132:…`, **not** `192.168.1.38:5060`.

**Not a git commit** unless you ask.

## One line

**WVP calls the real BWC LAN IP — not the PC proxy address.**
