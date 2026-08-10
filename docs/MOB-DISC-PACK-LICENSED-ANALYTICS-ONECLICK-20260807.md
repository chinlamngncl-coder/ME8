# MOB DISC — Pack must include licensed analytics (one-click, no extra services)

**Status:** LOCKED policy (disc only — no product code in this file)  
**Date:** 2026-08-07  
**Audience:** Ship desk + agents packing Mobility Axiom (CN / PH / KR / ME8)  
**Search:** `pack analytics`, `FR ANPR weapon pack`, `one-click modules`, `license features pack`

---

## Plain English (what the operator meant)

If the **license turns on** modules such as:

- Face recognition (FR)
- ANPR / plate reading
- Weapon (or other) analytics

…then those engines **must be inside the same delivery pack** and must **start with the one-click Setup / Start**.

**Users must not** be told to:

- Start a separate Python sidecar every day  
- Run a second “START-FR” / “START-ANPR” bat by hand forever  
- Install analytics later from another zip  

One pack → one click → app + licensed modules come up together.

---

## Rule (non-negotiable at pack time)

| If license / ship intent includes… | Pack must include… | Install must… |
|------------------------------------|--------------------|---------------|
| `analyticsFr` / FR | FR sidecar + deps (or documented bundled runtime) | Auto-start with Setup/Start (or Windows service) |
| `analyticsAnpr` / ANPR | ANPR sidecar + models as required | Same — one-click |
| `analyticsWeapon` / weapon | Weapon analytics stack if shipped | Same — one-click |
| Video Conference (`videoConference`) | LiveKit (or chosen VC stack) **only if** operator confirmed VC in pack | Same — one-click **or** explicit “VC not in this pack” |
| PTT / live / SOS only | Core + media — no analytics bloat | Setup starts core only |

**Alignment:** License feature flags ↔ zip contents ↔ Setup auto-start list.  
If license says ON and zip omits the engine → **pack FAIL** (do not ship).

---

## Mandatory confirm with operator BEFORE every pack

Agent / ship desk **must ask** (do not assume):

```
PACK MODULE GATE — confirm before zip:

1) License / entitlement for this zip:
   - max BWC / IPC
   - expiry
   - features ON: FR? ANPR? Weapon? VC? PTT? Redaction? CAD? Overwatch?

2) Analytics to PACK into this zip (operator answers YES/NO each):
   [ ] FR (face)
   [ ] ANPR (plates)
   [ ] Weapon (or other named analytics)
   [ ] None — ops core only

3) Video Conference in this zip?
   [ ] YES — bundle LiveKit/images + Setup starts it
   [ ] NO — omit LiveKit; UI may show VC but pack is ops-without-VC (state in README)

4) One-click requirement:
   Partner runs ONE Setup/Start only — no daily manual sidecar starts.
```

**Do not pack** until the operator answers **2** and **3**.  
If license has FR/ANPR/Weapon ON but operator says “none”, **stop and clarify** (license vs pack mismatch).

---

## Why past packs got laughed at (learn once)

| Failure | What partner saw |
|---------|------------------|
| License ON for analytics, engines not in zip | Feature exists in UI / entitlement but “doesn’t work” |
| Engines in zip but not auto-started | “Install again? Start another bat?” |
| VC images in one zip, missing in next “fixed” zip | Random size / random breakage |
| Agent packs without asking | Guessing → fix-after-fix |

This disc exists so packing **always** aligns: **license → contents → one-click start**.

---

## Definition of done (analytics-inclusive pack)

- [ ] Operator confirmed module list (gate above)  
- [ ] Zip contains every YES engine (binaries/models/images as required)  
- [ ] Setup/Start brings core + those engines without a second manual step  
- [ ] README (CN/EN) states what is included and what is not (e.g. “VC not in this pack”)  
- [ ] Post-pack self-check fails if a licensed-and-confirmed module folder/image is missing  
- [ ] No instruction: “please start FR sidecar yourself every morning”

---

## Relation to CN AirGap v2 (2026-08-06)

Example of correct honesty:

- License may list `analyticsFr` / `analyticsAnpr` / `videoConference` as **entitled**.  
- That pack’s Setup started **ops + WVP/ZLM/Postgres** and **did not** auto-start FR/ANPR sidecars or LiveKit.  
- Per **this disc**, that is only OK if the operator explicitly chose **ops pack without packing those engines**; otherwise next CN pack must either:  
  - pack + auto-start FR/ANPR (and/or VC), **or**  
  - ship a license that does not advertise those modules.

**Going forward:** every PACK MOB starts with the **PACK MODULE GATE** questions above.

---

## Agent behaviour

1. On `ship` / `pack` / `PACK-*` / `cn-airgap` / trial zip — print the gate and **wait**.  
2. Do not invent “optional later” analytics for customer packs.  
3. One MOB at a time after answers (e.g. `MOB-APPLY pack-include-fr-anpr`).  
4. Brand: Mobility Axiom / Ubitron — no banned OEM names in customer manuals.

---

## Related

- `ME8-INTERNAL/ship-desk/PRE-SHIP-GATE-CHECKLIST.md`  
- `docs/MOB-DISC-CN-ENTERPRISE-ZIP-83MB-HONESTY-20260731.md`  
- License feature flags in air-gap `license.lic` / `master_license.json`
