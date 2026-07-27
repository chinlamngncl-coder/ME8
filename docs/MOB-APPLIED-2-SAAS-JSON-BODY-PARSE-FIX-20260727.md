# MOB-APPLIED 2-SAAS-JSON-BODY-PARSE-FIX (2026-07-27)

## Problem
Setup UI **Save deployment tier** returned `Invalid network tier` even when LAN / Cloud / Hybrid was selected.

## Cause
`express.raw({ type: [..., '*/*'] })` ran before `express.json()` and consumed `application/json` bodies as a Buffer. `req.body.tier` was therefore empty.

## Fix
In `lib/setupOnlyServer.js`, remove `'*/*'` from the raw parser types. License upload still uses `application/octet-stream` / `text/plain`. JSON tier POST reaches `express.json`.

## Untouched
- `POST /api/setup/license`
- `localhostHttpGate`
- Setup UI HTML card / options
