# MOB-DISC — Settings: field gap, Identity card, SSO chip, Test health, toggles

**Date:** 2026-08-17  
**APPLY:** `MOB-APPLY SETTINGS-GAP-TOGGLE-SSO-V1`  
**Scope:** `#server-setup-panel` only. Reuse existing `.ss-perm-slider`. No Evidence. No Tactical map. No APIs. Do **not** change `.enterprise-card label` globally.

Keep **USER-DRAWER-MASTER-ALL-V1** as a **separate** APPLY (one ALL above Operations / Tactical / Evidence). Not this MOB.

## 1) Pic 1 — TYPE ON BWC stuck under Alt SIP password

Grey card `#server-setup-panel .ss-type-on-bwc-card` sits immediately under the protocol grid.  
APPLY: `margin-top: 24px` (keep current side/bottom). Do not change SIP fields.

## 2) Pic 2 vs Pic 3 — Identity “box in a box”

`#ss-phase-identity.enterprise-card` is a large padded shell around two fields (huge empty well). LAN hostname (pic 3) hugs content.

APPLY: Infrastructure phase cards (`#ss-phase-identity` and siblings that look empty) — **content-sized padding** (`padding: 16px 20px` or match LAN section). **No min-height** that leaves a black hole under Tenant name. Label→input gap stays **6–8px** (not glued, not a second inner box).

## 3) SSO chip — still a gap before S

Not the locale string. Likely padding / letter-spacing / leftover text node.

APPLY (chip only `#ss-dash-sub-lab`):
- `padding: 7px 12px` both sides; `text-indent: 0`; `letter-spacing: 0`
- Button inner HTML exactly `SSO / Identity` (no newline/space before S)
- After i18n, `textContent = textContent.trim()`

## 4) Pic 4 — Test site health stuck to the token box

`#lab-probe-health` sits under Metrics bearer token with ~0 margin.

APPLY: `#ss-panel-lab .evidence-toolbar` (and that button) `margin-top: 16px`. Same for **Test SSO connection** under Auto-provision if it is glued.

## 5) Pics 6–10 — ticks → same slider as Users drawer

Same control already used for user permissions: hidden checkbox + `<span class="ss-perm-slider">`.

**HTML only** (keep every `id`):
- Alerts & Voice: `label.ss-voice-check`
- Alert tones: `#ss-hq-tone-enabled` and sibling tone checks
- Enable scheduled verification
- SSO: `#lab-oidc-enabled`, `#lab-local-login`, `#lab-oidc-auto-provision`
- Monitoring: `#lab-trust-proxy`, `#lab-metrics-enabled`

Pattern:
```html
<label class="ss-lab-check ss-perm-check">
  <input type="checkbox" id="…">
  <span class="ss-perm-slider" aria-hidden="true"></span>
  <span>…existing words…</span>
</label>
```

**CSS:** copy the drawer slider rules onto  
`#server-setup-panel .ss-voice-check .ss-perm-slider`  
and `#ss-panel-lab .ss-lab-check .ss-perm-slider`  
(already exists for `#ss-section-production`). Do not invent a second switch.

Keep IDs and `checked` defaults. JS that reads `.checked` stays valid.

## Out of scope

Evidence hub, Tactical, user-drawer **master ALL**, backend.

## Operator PASS

1. Protocol: gap between Alt SIP password and TYPE ON BWC.  
2. Identity card hugs the two fields (like hostname).  
3. SSO / Identity chip: **S** flush, same as Site security.  
4. Test site health not touching the token box.  
5. Voice / tones / SSO / Monitoring / scheduled verification = blue sliders, not square ticks.
