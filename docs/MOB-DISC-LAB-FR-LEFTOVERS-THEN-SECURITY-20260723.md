# MOB DISC — Lab leftovers refresh (FR icon + FR dead + motion) → then security

**Date:** 2026-07-23  
**Status:** PAPER — **no APPLY** until you name a phrase  
**Operator update:** Redact PASS · Pin/VC PASS · Server Config PASS · FR icons garbage · FR not snapshotting / not matching · want better coverage when face moves · then cybersecurity

**Parent map:** `docs/MOB-DISC-WHATS-LEFT-SHIP-READY-MAP-20260723.md` (supersede §1 Lab leftovers with this file)

---

## Closed (do not reopen)

| Item | State |
|------|--------|
| Redact finish loop | **PASS** |
| Pin polish / VC ingress | **PASS** |
| Server Config short-copy / config UX | **PASS** |
| UI consolidation + global UI rollout | **PASS** |
| Call Groups / GPS pin / Snapshot once / Centre / wall listen / PTT mesh | **PASS** (earlier) |

---

## Lab leftovers — only FR genre remains

### Fault A — Strange icons (`ðŸ“C` / `ðŸ“Œ`)

**What it is:** Same UTF-8 mojibake as dock/wall icons — **not** a real FR feature glyph.  
**Where:** FR roster pin button CSS in `public/index.html`:

```css
.ax-fr-roster-pin-icon::before { content: "ðŸ“Œ"; … }
```

Intended emoji is **📌** (U+1F4CC). Mis-saved → garbage next to the checkbox.

**Fix MOB (UI-only, Ctrl+F5):**  
`MOB-APPLY FR-ROSTER-PIN-ICON-ENCODING-V1`  
→ `content: "\\1F4CC"` (or ASCII `PIN` / SVG) — no JS id changes.

### Fault B — FR not doing snapshot / not doing FR at all

**Separate from icons.** Icons don’t stop the engine; this is the live pipeline (watch set → grab JPEG → sidecar detect/match → Recent rail).

**Agent owns diagnosis after APPLY** (logs / health / sidecar). Operator: restart Fleet if asked, open Analytics → Face, check/watch cams, Ctrl+F5 once, say PASS/FAIL from what you see.

**Recommended first product MOB:**  
`MOB-APPLY FR-LIVE-DEAD-DIAGNOSE-V1`  
Prove why zero Recent / zero match (sidecar down? Seeta not ready? watch empty? grab failing under WVP? probe caps?). One next APPLY after proof — no freestyle stack.

### Fault C — “Missing movement and frames” (enhance when face moves)

**Only after Fault B PASS** (FR actually grabbing again).  
Enhancement = denser / smarter capture while walking (interval, best-of-window, motion gate) — **not** invent a new FR product.

**Candidate later:**  
`MOB-APPLY FR-MOTION-FRAME-COVERAGE-V1`  
(scope from diagnose: poll pace / rolling window / walk-side face — one named change after evidence)

Do **not** bundle A+B+C in one APPLY.

---

## Stage ladder (remind once when each stage done)

```
Stage L1  FR roster pin icon encoding     → PASS (ASCII PIN)
Stage L2  FR live dead diagnose + grab    → PASS 2026-07-23 (GRAB-ZLM)
Stage L2b FR hit toast on Analytics Face  → PASS 2026-07-23 (suppress)
Stage L3  FR motion/frame coverage        → optional if walking coverage still thin
Stage B1  mob-sec-evidence-upload-safe-name (S0)
Stage B2  LAB-DEFAULT-CREDS-AND-IMAGE-PIN-V1
Stage C   TLS/HTTPS/WSS genre
Stage D   Pre-ship + manuals
Stage E   Tactical Zone (Google modules)
```

**Agent reminder rule:** When operator says **PASS** on a stage, stamp APPLIED + one sentence: “Stage Lx PASS — next is …”. No daily nag; **once per completed stage**.

---

## Recommended next APPLY (single pick)

**Redact preview→burn:** PASS.  
**Second pass on export:** APPLIED — operator verify (Prior exports → Second pass).

---

## Agent must not

- Start S0 / TLS / Tactical while FR dead is still open (unless you override)  
- Bundle icon + diagnose + motion in one MOB  
- Touch `video-wall.js` / map for FR roster icon  
- Invent a second FR app
