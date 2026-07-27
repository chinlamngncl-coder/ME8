# MOB-DISC 3-NETWORK-TIER-AUTOMATION (2026-07-27)

**Status:** PLAN only — no code applied. Wait for `MOB-APPLY 3-NETWORK-TIER-AUTOMATION`.

## Goal
Enforce `ME8_NETWORK_TIER` (`lan` | `wan` | `cloud` | `hybrid`) at **full Fleet boot** (after license clears), without changing Setup UI behavior.

## Scan findings (primary boot path)

| Phase | File | What happens today |
|-------|------|--------------------|
| 1-Pack entry | `bin/me8-server.js` | `dotenv` loads `.env` → ACL → **`applyFirewallIngress()`** (always: WebRTC UDP + SETUP_PORT localhost) → license check → Setup-only **or** `require('server.js')` |
| Setup-only | `lib/setupOnlyServer.js` | Listen **`127.0.0.1`** only; `localhostHttpGate` always on; writes `ME8_NETWORK_TIER` |
| Full stack | `server.js` | HTTP/HTTPS listen **`0.0.0.0`**; `localhostHttpGate` enabled early; `trust proxy` from lab-security JSON (`applyLabSecurityRuntime`) |
| Firewall helper | `lib/firewallIngress.js` | **Not tier-aware** — Setup port localhost + WebRTC UDP only |
| HTTP gate | `lib/localhostHttpGate.js` | Plain HTTP blocked for non-loopback (HTTPS OK) |

**Injection point (recommended):** after dotenv in `bin/me8-server.js`, **before** `applyFirewallIngress()` and **before** `require('server.js')`, call a new module that sets env overrides from tier. Keep `node server.js` lab path unchanged unless env is already set.

## Tier behavior matrix (proposed)

| Tier | Dashboard bind | Plain HTTP from LAN/WAN | Trust proxy | Firewall (full stack ports) | Setup port |
|------|----------------|-------------------------|-------------|-----------------------------|------------|
| **lan** | `127.0.0.1` (or preferred LAN IP only if we add later — V1 = loopback for 1-Pack dashboard; see note) | Localhost HTTP OK; no WAN HTTP | Off | Allow HTTP/HTTPS on dashboard ports from **private** ranges only; WebRTC UDP open; SETUP stays localhost | Unchanged (localhost) |
| **wan** | `0.0.0.0` | HTTP gate **stays** (HTTPS for remote; localhost HTTP OK) | Off | Allow TCP `FM_HTTP_PORT` / `FM_HTTPS_PORT` from any; WebRTC UDP open; SETUP stays localhost | Unchanged |
| **cloud** | `0.0.0.0` | HTTP gate **stays** | **On** (`trust proxy` 1) — behind CDN/LB | Same as wan for app ports; WebRTC UDP open; SETUP localhost | Unchanged |
| **hybrid** | `0.0.0.0` | HTTP gate **stays** | **On** | Same as cloud for app ports; WebRTC UDP open; SETUP localhost | Unchanged |

**LAN note (honest):** Current Fleet binds `0.0.0.0`. For true LAN-only without binding only loopback, firewall must deny public remote IPs. V1 recommendation: **do not rewrite every `server.listen` in `server.js`**; instead set `process.env` knobs + tier-aware firewall. Optional later MOB: `FM_HTTP_BIND` if product wants literal bind address.

**SIP/PTT/media:** Out of scope for V1 tier automation (still `0.0.0.0` as today). Tier V1 = dashboard HTTP(S) + firewall + trust proxy only.

## Proposed new module

**File:** `lib/networkTierRuntime.js` (new)

```js
'use strict';

function normalizeTier(raw) {
    const t = String(raw || process.env.ME8_NETWORK_TIER || 'lan').trim().toLowerCase();
    if (['lan', 'wan', 'cloud', 'hybrid'].includes(t)) return t;
    return 'lan';
}

/**
 * Apply env-side effects BEFORE firewall + server.js boot.
 * Does not write .env. Idempotent for one process.
 */
function applyNetworkTierRuntime(options) {
    const opts = options || {};
    const tier = normalizeTier(opts.tier);
    process.env.ME8_NETWORK_TIER = tier;

    if (tier === 'cloud' || tier === 'hybrid') {
        process.env.ME8_TRUST_PROXY = '1';
    } else {
        if (process.env.ME8_TRUST_PROXY == null || process.env.ME8_TRUST_PROXY === '') {
            process.env.ME8_TRUST_PROXY = '0';
        }
    }

    if (tier === 'lan') {
        process.env.ME8_DASHBOARD_BIND = process.env.ME8_DASHBOARD_BIND || '127.0.0.1';
    } else {
        process.env.ME8_DASHBOARD_BIND = process.env.ME8_DASHBOARD_BIND || '0.0.0.0';
    }

    return { tier: tier, trustProxy: process.env.ME8_TRUST_PROXY === '1', bind: process.env.ME8_DASHBOARD_BIND };
}

module.exports = { normalizeTier, applyNetworkTierRuntime };
```

## Target file patches (proposed blocks)

### 1) `bin/me8-server.js` — inject after dotenv / before firewall

```js
const { applyNetworkTierRuntime } = require('../lib/networkTierRuntime');
const { applyFirewallIngress } = require('../lib/firewallIngress');
// ...
const tierRuntime = applyNetworkTierRuntime();
console.log('[me8-server] Network tier:', tierRuntime.tier, 'bind=', tierRuntime.bind, 'trustProxy=', tierRuntime.trustProxy);
const fw = applyFirewallIngress({ tier: tierRuntime.tier });
```

### 2) `lib/firewallIngress.js` — accept `tier`, add dashboard port rules

```js
function applyFirewallIngress(options) {
    const opts = options || {};
    const tier = String(opts.tier || process.env.ME8_NETWORK_TIER || 'lan').toLowerCase();
    const port = setupPort();
    const httpPort = parseInt(process.env.FM_HTTP_PORT || '3988', 10) || 3988;
    const httpsPort = parseInt(process.env.FM_HTTPS_PORT || '4438', 10) || 4438;
    // keep existing SETUP + WebRTC rules
    // then:
    //   lan  → allow TCP http/https from Private (Windows RemoteAddress Private) / ufw from RFC1918
    //   wan|cloud|hybrid → allow TCP http/https from any
}
```

### 3) `server.js` — minimal hooks (two places)

**Trust proxy** — extend `applyLabSecurityRuntime` so cloud/hybrid env wins when set via 1-Pack:

```js
function applyLabSecurityRuntime() {
    const lab = labSecurity.load(STORAGE_DIR);
    const envTrust = String(process.env.ME8_TRUST_PROXY || '').trim();
    const trust = envTrust === '1' || envTrust === 'true' ? true
        : envTrust === '0' || envTrust === 'false' ? false
        : !!lab.trustProxy;
    app.set('trust proxy', trust ? 1 : false);
    return lab;
}
```

**Listen bind** — replace hard-coded `'0.0.0.0'` on dashboard HTTP/HTTPS only:

```js
const DASHBOARD_BIND = String(process.env.ME8_DASHBOARD_BIND || '0.0.0.0').trim() || '0.0.0.0';
server.listen(HTTP_PORT, DASHBOARD_BIND, () => { ... });
httpsServer.listen(dashboardTlsBoot.httpsPort, DASHBOARD_BIND, () => { ... });
```

Lab `node server.js` without `ME8_NETWORK_TIER` / `ME8_DASHBOARD_BIND` keeps today’s `0.0.0.0` + lab-security trust proxy.

### 4) Explicit non-goals (this MOB)

- Do **not** change Setup UI listen bind (stays `127.0.0.1`).
- Do **not** open SETUP_PORT to WAN for any tier.
- Do **not** rewrite SIP/PTT/ZLM bind in V1.
- Do **not** invent new tiers beyond lan/wan/cloud/hybrid.

## Risk pick (one path)

**Recommend:** env-first module + firewall tier rules + two surgical `server.js` hooks. Avoid rewriting `localhostHttpGate` (HTTPS remains the remote path; local HTTP lockout stays — matches Step 0 product intent).

## Apply cue

Wait for: `MOB-APPLY 3-NETWORK-TIER-AUTOMATION`
