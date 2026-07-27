# MOB-APPLIED 4-CRYPTOGRAPHIC-LICENSE-GATEKEEPER-SECURE (2026-07-27)

## Goal
Strict Ed25519 boot gate with DOS size limit and no unhandled crash into Setup UI.

## Files
| File | Change |
|------|--------|
| `lib/licenseGatekeeper.js` | **New** — `readLicenseWithLimit`, `verifyEd25519Payload`, `evaluateBootLicense` wrapped in try/catch → `CRITICAL_CRASH` |
| `lib/licenseManager.js` | `fs.statSync` + 10KB cap before `readFileSync` |
| `bin/me8-server.js` | Blind `catch (_)` replaced with gatekeeper; FAIL logs code/message → Setup UI |
| `lib/setupOnlyServer.js` | `express.raw({ limit: '10kb' })` + 413 handler + route length check |

## Failsafe confirmation
- Unexpected exception in gate → `{ pass: false, code: 'CRITICAL_CRASH' }` — process continues to Setup
- File > 10KB → never fully trusted / rejected before parse
- Upload > 10KB → HTTP 413, nothing written to disk
