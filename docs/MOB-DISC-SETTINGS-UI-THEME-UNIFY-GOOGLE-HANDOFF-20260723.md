# MOB DISC — Settings pages CSS untidy / theme unify (Google handoff)

**Date:** 2026-07-23  
**Status:** APPLIED — see `docs/MOB-APPLIED-SETTINGS-UI-THEME-UNIFY-V1-20260723.md`  
**Product:** Mobility Axiom (Ubitron) — Ops dashboard Settings  
**Operator ask:** Settings UI is untidy / not unified with theme; want Google to help clean CSS. Give the whole Settings CSS picture.

---

## Plain English

Settings works, but **looks messy**. Buttons, cards, grids, and fonts don’t match the rest of the design system (`global.css` enterprise theme).  

We want a **visual cleanup only** — same tabs, same fields, same Save behavior. Not a new Settings product.

---

## Where Settings lives (files)

| Area | Path | CSS today |
|------|------|-----------|
| Settings shell / Server Config / Lab / Cloud / users | `public/index.html` (huge panel `#server-setup-panel`, `#settings` tab) | **Thousands of lines of inline `<style>`** — many `.ss-*`, `.lab-*`, `.cd-*`, `.settings-hub-*` with **hardcoded** `#0f172a` / `#334155` / `#2563eb` |
| Behavior JS | `public/js/server-setup.js`, `settings-hub.js`, `lab-security.js`, … | Not visual |
| Design system (target) | `public/css/global.css` | Tokens + `.enterprise-*` + `.btn-primary` / cards / form grid |
| Cache | `global.css?v=…` and script `?v=` on index | Bump when CSS lands |

**Fact:** Global UI rollout put `enterprise-scope` on some panels and bridged buttons globally — Settings **still** carries a parallel homemade stylesheet inside `index.html`. That clash is why it feels untidy.

---

## Theme tokens Google must reuse (`global.css` `:root`)

Do **not** invent a new palette.

```
--bg-base: #0f172a
--bg-surface: #1e293b
--bg-elevated: #111827
--bg-input: #0f172a
--accent-blue: #2563eb
--accent-blue-hover: #1d4ed8
--text / --text-primary / --border-* (see file)
--radius-sm: 6px
--radius-md: 10px
--radius-lg: 12px
```

Components already defined (prefer these over one-off rules):

- `.enterprise-card` / `.enterprise-section-title`
- `.enterprise-form-grid` / `.enterprise-form-control`
- `.btn-primary` / `.btn-secondary` / `.btn-ghost` / `.btn-danger`
- `.enterprise-page-layout` / `--split`

---

## Settings surfaces to clean (scope checklist)

Treat as **one Settings genre** (can be one MOB or phased):

1. **Settings hub** (entry cards / aside status) — `.settings-hub-*`  
2. **Server Config network nav** — `#ss-network-section-nav`, `.ss-config-section`, `.ss-network-grid`  
3. **Reverse proxy / readiness** — `#ss-section-production`, `.ss-proxy-readiness`, site readiness rows  
4. **LAN / WAN / Operator portal / Device registration / Protocol** — forms + hints  
5. **BWCs / Users / Groups** tabs inside setup panel  
6. **Lab** panel — `.ss-tech-section`, monitors, OIDC  
7. **Cloud** panel — `.cd-*` entitlement / firewall tables  
8. **Modals / gates** — `.ss-gate-panel`, password reset dialogs  

**Out of scope for this cleanup (unless operator expands):**

- Map / video wall / Open All Ops chrome (Firmware Gold / density)  
- Evidence Hub redact (already had its own compact PASS)  
- Login / auth pages (already on `enterprise-auth`)  
- Changing field IDs, API routes, or trust-proxy **logic** (just polished)

---

## Why it looks untidy (diagnosis for Google)

1. **Duplicate systems** — inline `#hex` next to `var(--*)` from global.  
2. **Inconsistent control height** — some `padding: 4px`, some `8px`, some `min-height: 32px` from global `.btn`.  
3. **Mixed button recipes** — raw `<button style=…>`, `.btn.btn-action`, and bare `#334155` chips.  
4. **Nav pills** — network section buttons don’t match enterprise tab language.  
5. **Cards** — some `border-radius: 6px`, some `8px`, some `12px`; backgrounds `#0f172a` vs `#111827`.  
6. **Typography** — `10px` / `11px` / `12px` uppercase labels without shared `.enterprise-section-title`.  
7. **CSS location** — Settings rules buried in `index.html` (hard to maintain; ~300+ `.ss-` hits). Prefer extract to e.g. `public/css/settings-server.css` **after** visual match, or restyle in place then extract.

---

## Strict boundaries (do not break)

- **No** new Settings IA / rename tabs without a named APPLY.  
- **No** remove of `#ss-trust-proxy` or reverse-proxy polish copy.  
- **No** change to save/API behavior.  
- **No** Ops map / wall density freestyle.  
- **One** visual MOB at a time if risk is high — or one named “SETTINGS-UI-THEME-UNIFY-V1” with verify checklist.  
- Keep **Axiom** branding; OEM ban list still applies.

---

## Suggested APPLY name (when operator says go)

```text
MOB-APPLY SETTINGS-UI-THEME-UNIFY-V1
```

**Goal:** Settings pages look like the same product as Analytics / Evidence enterprise cards — tidy, same radii, same inputs, same buttons — without moving controls.

**Verify (operator):**

1. Hard refresh Settings.  
2. Walk Server Config sections (LAN → Reverse proxy → readiness).  
3. Lab + Cloud tabs still usable.  
4. Trust reverse proxy section still plain English + PASS/CHECK.  
5. Save still works.

---

## What to send Google (copy pack)

1. This disc.  
2. `public/css/global.css` (tokens + enterprise components).  
3. Settings HTML region: `#server-setup-panel` / settings hub in `public/index.html`.  
4. Screenshots of Settings (operator can paste).  
5. Reminder: **CSS/theme only**; logic already PASS for reverse proxy.

---

## One line

**Settings CSS is a leftover inline dark stew; unify it to `global.css` enterprise tokens/components — polish look only, keep every control and the reverse-proxy path.**
