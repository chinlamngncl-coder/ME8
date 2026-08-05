# MOB DISC — Do we need Weapon detection? Fixed cam vs BWC, weight (2026-08-05)

**Status:** disc only. No code until you type an APPLY line below.  
**Related:** `MOB-DISC-WEAPON-LIVE-AUTO-ALARM-NEARBY-BATTERY-20260805.md` (battery / no fake SOS). This disc decides **keep or skip** and **fixed cam first**.  
**Scope:** product lock. FR/ANPR engines unchanged.

## Confirm: I understand

You want a real decision before building Weapons:

1. Is it **useful**, or skip?
2. We also have **fixed cameras**. Use those, not only BWC?
3. Same idea as **FR / ANPR** live?
4. Did we already **send fixed-cam streams into analytics**?
5. Is it **very heavy** in the end?

## Web / industry (plain)

Gun/knife AI is sold mainly for **fixed CCTV** (gate, lobby, school, parking, RTCC) — watch many views a human cannot stare at. Vendors (e.g. ROC, IntelliSee-class) look for a **drawn / brandished** gun in the picture, then HQ checks before dispatch.

Lab papers quote high scores; **real cameras are worse** (dark, angle, phone/keys/wallet look like a gun). Schools have had false hits (e.g. snack bag as a firearm). Best practice: **multi-frame + human ack**, not auto-lockdown on one still.

**BWC chest cam** is a weak primary use: holster, partner’s belt, officer’s own hands all day → noise. Industry does **not** treat “every patrol BWC always scans for guns” as the main product.

## ME8 facts (what we already have)

| | FR / ANPR live today | Weapon (not built) |
|--|----------------------|--------------------|
| Who | Fleet cam that is **already live** (WVP/ZLM FLV) | Same pipe |
| How | Server **stills**, not 100 browser players | Same |
| BWC vs fixed | **No BWC-only filter** — any live `camId` in roster | Same |
| Fixed cam special ingest? | **No separate “send IPC to analytics” job** | Do not invent one |
| Battery | Only if that cam is already streaming | Fixed = wall power. BWC = don’t force live |

So: if a **fixed cam is live** on Ops / wall / FR / ANPR, FR and ANPR **can already sample it**. We did not build a second analytics stream. Weapon should use that **same** still-grab.

## Is it useful for Axiom?

**Yes — keep the module**, but aim it right:

- **Primary:** selected **fixed** cams (gate, lobby, armory, car park). Stable view, no BWC battery, real “HQ sees a gun on site cam” story.
- **Secondary:** **BWC already live** only (same as last disc). Holster noise. No 100-cam invite.
- **Skip always-on patrol BWC weapon scan.** You already said skip that burn.

Without Weapons, FR finds faces and ANPR finds plates. A **visible gun on a site camera** has no module. That gap is worth filling for enterprise / command, if we do not pretend BWC holster AI is magic.

## Heavy?

| Load | Verdict |
|------|---------|
| Same still rate as FR/ANPR (~1–3 FPS) on **N armed / already-live** cams | **Medium** server CPU (one YOLO-class model). Same family as FR/ANPR live. |
| All fixed + all BWC 24/7 high FPS | **Heavy** — don’t. |
| Fixed cams only, armed list, 1–2 FPS, 2–3 frames confirm | **Sensible.** No extra BWC battery. |

Not heavier than a second ANPR-like sidecar if we stay scoped.

## Locked product

1. **Keep** Weapon detection (licensed tab, like FR/ANPR).
2. **Fixed cams first.** Roster = online fleet (BWC **and** IPC). Operator arms / watches like FR.
3. Same live path: **already streaming → server stills → sidecar → HQ WEAPON alarm** (not fake SOS). Nearby radio only for **BWC with GPS**; fixed cam = map pin / site label.
4. No new “analytics-only” stream. No silent INVITE of the whole fleet.
5. Public notice after weapons PASS stays (older pack disc).

## One next APPLY

**`MOB-APPLY WEAPON-LIVE-WATCH-SHELL-V1`**

Unlock Weapon tab (if licensed). Live roster + Recent like FR/ANPR (fixed + BWC online). Poll **already-live** only. Engine can be stub first; real detect + alarm next.

## Operator pass (after that APPLY)

Analytics → Weapon opens. Online fixed cam and BWC can be listed. No extra live on cams that were idle. FR/ANPR unchanged.
