# MOB-APPLIED SERVER-PHASE-LABELS-MEANING-ONLY-V1 (2026-07-27)

## Goal

Remove “Phase N ·” from Network & deployment nav and section headings. Meaning-only labels. Networking without “(Core)”.

## Labels

Identity · Networking · Access & Security · Storage & Devices · Resiliency · Diagnostics

## Changes

- `public/locales/en.json` — `server.phase.*` titles  
- `public/index.html` — fallback text + cache bust  

## Operator check

1. Hard refresh once  
2. Settings → Network & deployment  
3. Pills and section titles show meaning only — no “Phase 1/2/…”  

## Verify

```bash
node scripts/verify-server-phase-labels-meaning-only-v1.js
```
