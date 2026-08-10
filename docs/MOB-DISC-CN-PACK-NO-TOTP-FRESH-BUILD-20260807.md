# MOB DISC — CN pack: no QR 2FA + force latest (weapons-era) build

**Date:** 2026-08-07  
**Status:** DISC only — wait for `MOB-APPLY`  
**Operator ask:** Installation works, but QR 2FA enroll blocks CN use → take 2FA off and repack; pack must be **latest** software (weapons-era), not an old blob.

---

## Got it?

| Ask | Understanding |
|-----|----------------|
| No QR / authenticator 2FA in CN | Yes — CN air-gap partners often cannot use phone authenticator QR |
| Repack without 2FA | Yes — ship env so enroll/login TOTP never triggers |
| Not an old pack | Yes — current CN zips reused **stale** `ship-build/protected/run.js` from **2026-07-31**; weapon/server sources on disk are **2026-08-07**. Packer only runs `build:ship` if `run.js` is **missing**, so “repack” kept shipping July blob |

---

## Can we turn off 2FA without issue?

**Yes, with the existing supported flag** (not a UI hack):

- Env: `FM_TOTP_SUSPENDED=1`
- Code (`lib/dashboardTotp.js`): when set → `userMustEnrollTotp` = false, `userRequiresTotpAtLogin` = false → no `/enroll-totp.html` QR gate, no login TOTP challenge
- Recovery-email hard gate also softens when TOTP is suspended (`authRecoveryEmail`)

**Today’s CN pack defaults are wrong for this ask:**

- `.env.deploy.example` → `FM_TOTP_SUSPENDED=0`
- `Set-DeployHostEnv.ps1` → forces `FM_TOTP_SUSPENDED=0`

So Setup **turns 2FA back on** even if someone hand-edited.

**Trade-off (honest):**  
Bench disc said “remove before customer ship” for *security* products that want authenticator. For **this CN air-gap pack**, operator **overrides**: no QR 2FA is a product requirement. Document in README/manual: dashboard password only; partner must use strong `global` password + LAN isolation.

**Not in scope of “off 2FA”:** first-login **must-change-password** (if still on) — separate from QR. Say if you also want that skipped.

---

## Latest software / weapons — current risk

```
ME8\ship-build\protected\run.js     LastWrite ~ 2026-07-31  ← what 1024 shipped
ME8\lib\weapon*.js / server.js      LastWrite ~ 2026-08-07  ← live tree
```

So **1024 is not “the latest with weapons”** in the Node bundle sense. License already flags `analyticsWeapon: true`, but the **bundled run.js is old** until we force rebuild.

**Also clear (unchanged policy):** turning on license weapon ≠ packing Python weapon sidecar into one-click. This APPLY = **fresh build:ship + no TOTP**. Sidecar one-click remains the other analytics disc unless you order that too.

---

## Proposed APPLY (when you say go)

**Name:** `MOB-APPLY cn-pack-no-totp-fresh-build`

1. CN templates only (do not change PH/KR trial trees unless asked):  
   - `.env.deploy.example` → `FM_TOTP_SUSPENDED=1`  
   - `Set-DeployHostEnv.ps1` → write `1` (or CN-only param; prefer CN pack copies its own deploy script so Lab default stays)  
2. `PACK-CN-AIRGAP-V2.ps1`: **always** `npm run build:ship` before stage copy (or `-ForceRebuild` default on) so run.js matches today’s tree  
3. Self-check: `FM_TOTP_SUSPENDED=1` in staged `.env.deploy.example`; run.js mtime ≥ pack day; optional string/feature smoke for weapon routes if present in bundle  
4. Keep prior P0: db migrations + SIP `protected/lib/*` + require smoke  
5. New zip on Desktop; discard 1024/0928/2307 for partner handoff  
6. Manual CN line: 中国离线包默认关闭仪表盘 QR 双因素；仅账号密码登录  

**Risk if we only flip TOTP without force rebuild:** partner still runs July runtime → “weapons/latest” ask fails.

---

## Reply to unlock

Say **`MOB-APPLY cn-pack-no-totp-fresh-build`** to execute.

---

**Ubitron · Mobility Axiom** — CN no-2FA + fresh build disc  
