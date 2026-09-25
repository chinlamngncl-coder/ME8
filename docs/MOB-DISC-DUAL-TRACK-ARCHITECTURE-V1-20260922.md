# MOB DISC — Dual-Track Architecture V1

**Status:** PAPER LOCK — no product code until a named `MOB-APPLY` on **one** track.  
**Date:** 2026-09-22  
**Name:** `MOB-DISC-DUAL-TRACK-ARCHITECTURE-V1`

---

## Boundary (strict)

| Track | What it is | What it is not |
|-------|------------|----------------|
| **Track 1 — VMS Cockpit (greenfield)** | New standalone page(s) under e.g. `/public/cockpit/` or `/public/vms.html` | Not a rewrite of Axiom `index.html`; not CAD/RMS / Settings / VC DOM |
| **Track 2 — Axiom legacy maintenance** | Targeted fixes on existing Ops / Spatial / Evidence lifecycle | Not Workspaces chrome, not cockpit layout |

**Do not mix tracks in one APPLY.** One named `MOB-APPLY` → operator PASS → next.

---

## Track 1 — Standalone VMS Cockpit (greenfield)

- **Purpose:** High-density surveillance / SOC-style Digital Twin cockpit for bundling.
- **Shell:** Left device tree · Center spatial map + pin video · Right Action Bay (live / PTZ / AI).
- **Look:** Dark enterprise, data-dense (no consumer bloat).
- **Backend:** Existing WVP/ZLM + catalog/Postgres as needed.
- **Out of scope for v1 page:** CAD/RMS, Server Settings, Video Conference chrome.
- **Relation to Fleet:** Additive surface (like Command Wall popout pattern) — does **not** replace Evidence / SOS / PTT cores.

---

## Track 2 — Existing Axiom (legacy)

Keep top nav (Operations, Command Wall, Spatial Map, …). Demo-safe mechanics only:

| Fix | Intent |
|-----|--------|
| **A — View lifecycle / FLV** | Leave live tab → `AxiomFlvManager.detach()` (and drop claims); no “hide and leak” |
| **B — Spatial Dock escalation** | Mini Dock on map popup → move live `<video>` into right Live Preview **without** rebuild / socket drop |

---

## Locked rules for agents

1. Acknowledge this boundary before any APPLY.  
2. Never bundle Track 1 UI into Track 2 patches (or reverse).  
3. Code only after `MOB-APPLY <exact name>` for that track’s first MOB.  
4. Track 1 first MOB (when chosen) should be scaffold-only or one shell slice — not “whole cockpit in one APPLY.”

---

## Operator chooses first coding track

Ask: **Track 1 or Track 2 first?** Then name the first APPLY for that track only.
