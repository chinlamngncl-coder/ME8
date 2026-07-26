# MOB DISC — Google PTT visual-alert suggestions · agent check

**Date:** 2026-07-23  
**Status:** PAPER — **no APPLY**  
**Context:** Operator **PASS** on `PTT-VISUAL-ALERT-FULLSTACK-V1`. Google sent three tactical suggestions. Agent checked live code + ran verify.  
**APPLIED:** `docs/MOB-APPLIED-PTT-VISUAL-ALERT-FULLSTACK-V1-20260723.md`

---

## One-screen verdict

| # | Google suggestion | Agent check | Agree? | Do now? |
|---|-------------------|-------------|--------|---------|
| **1** | Fallback matcher if `camId` ≠ wall DOM / SIP / ertId | Real risk **only if** IDs diverge; today emit + match are **exact same GB camId**; lab **PASS** | **Partial** | **No** unless FAIL with proof of ID mismatch |
| **2** | Pulse via GPU overlay (`opacity`/`transform`), not border/shadow on video box | Current CSS uses **outline + box-shadow + background keyframes** on the slot chrome — Google’s concern is **valid** | **Yes** | Optional polish MOB **if** high-density stutter; not required after PASS |
| **3** | Lock `npm run verify:ptt-visual-alert` in `package.json` | **Already present**; script runs **OK** | **Yes ask** — already done | **Nothing to APPLY** |

**Bottom line:** Do **not** reopen PTT visual alert for #1 or #3. Park #2 as optional CSS harden if walls get dense and stutter shows. No logic change tonight.

---

## What we actually ship (facts)

### Wire path

1. BWC PTT UDP → `lib/pttServer.js` (`dwCMD` 130) → server `emitPttRxState(camId, active)`  
2. Socket: `ptt-rx-state` **and** alias `ptt_state`  
3. UI: `ptt-rx.js` / wall → `pttRxActive` Set → `syncSlotPttRxUi` toggles `.ptt-incoming-alert`

### Critical detail Google slightly misread

```js
// server.js emitPttRxState
io.emit('ptt_state', { deviceId: camId || null, camId: camId || null, active: !!active });
```

`deviceId` and `camId` are **the same string** today — an **alias for listeners**, not two different ID spaces. Emitting both does **not** by itself fix SIP-vs-wall or ertId mismatches.

Wall match:

```js
const rxTalking = !!(camId && pttRxActive.has(camId));
```

Exact Set membership vs slot’s bound cam (`activeStreams` / `dataset.camId`). **No** suffix / police-number / ertId fallback.

### CSS today (Google #2 target)

```css
.video-slot.ptt-incoming-alert .video-slot-box,
.map-popup.ptt-incoming-alert,
#app-view-command-wall .cw-cell.ptt-incoming-alert {
  outline: 3px solid #facc15;
  box-shadow: …;
  animation: fleet-ptt-pulse 0.75s ease-in-out infinite; /* animates background */
}
```

`::after { content: 'PTT' }` badge is static (good). Pulse itself is **not** a compositing-only overlay.

### Verify (#3)

| Check | Result |
|-------|--------|
| `package.json` → `"verify:ptt-visual-alert"` | **Yes** → `node scripts/verify-ptt-visual-alert-fullstack.js` |
| Ran 2026-07-23 | **`[ok] verify-ptt-visual-alert-fullstack`** |
| Guards | debounce 800ms, dwCMD 130, both emits, wall/CW class, no `liveActive` suppress, cache bust |

---

## Suggestion 1 — ID fallback matcher

### Google claim

Mobile / secondary channels (`ertId`) may report different IDs than wall DOM → pulse miss → fallback to `deviceId` / police number.

### Agree where true

- Exact-string `Set.has` **can** miss if PTT uplink identity ≠ slot `camId`.  
- A **controlled** alias map (server resolves PTT identity → fleet `camId` once) is the right harden — not freestyle DOM guessing.

### Disagree / nuance

| Point | Why |
|-------|-----|
| Mixing **mobile video / ertId** into this MOB | Pulse is driven by **Fleet `:29201` PTT audio**, not LiveKit/mobile video track IDs. Different stack. |
| “Use `deviceId` field on `ptt_state`” | Today `deviceId === camId`. No extra info. |
| Loose match by “police number” / suffix in `video-wall.js` | Risk of **wrong tile** pulsing (similar IDs). Prefer server canonicalization. |
| Required now | Operator **PASS** on Chin/kk; no FAIL log of “PTT heard, wrong/no tile.” |

**Agent pick:** Keep as **watch item**. Reopen only with FAIL evidence (log: emit camId X, slot bound Y). Then MOB name e.g. `PTT-VISUAL-ALERT-ID-ALIAS-V1` — **server** maps aliases; UI stays exact match on canonical camId.

---

## Suggestion 2 — CSS GPU / no jank

### Agree

- Animating **box-shadow** + **outline** + **background** on the slot that owns `<video>` / canvas can cost more than an absolute overlay with `opacity` / `transform`.  
- High-density Command Wall / Open All is where this matters.

### Disagree as urgent

- Lab PASS; typical density small.  
- Existing fleet PTT chrome already used the same `fleet-ptt-pulse` pattern before this MOB.  
- Not a correctness bug.

**Agent pick:** Optional later  
`PTT-VISUAL-ALERT-CSS-COMPOSITOR-V1` — move pulse to `::before` overlay (`opacity` only); keep static outline or thin border; **do not** animate layout props on the video host.

Do **not** bundle with ID alias.

---

## Suggestion 3 — Verification script

### Agree with the ask

CI / future edits should not silently drop the emitter.

### Already done — disagree that work remains

- Script exists.  
- Wired in `package.json`.  
- Ran green after this check.

Optional later (only if CI genre opens): add this script to a CI job list — **not** a product MOB.

---

## Risk if we “just APPLY Google’s three”

| Action | Risk |
|--------|------|
| Loose DOM ID fallback now | False pulses; fights Firmware Gold / exact cam binding |
| CSS rewrite without stutter proof | Visual churn; cache bust; re-test tax for zero FAIL |
| Re-add verify script | No-op / noise |

---

## Locked recommendation

1. **Thank Google** — #2 is good craft; #3 already locked; #1 is conditional.  
2. **No APPLY** from this disc. Feature stays **PASS**.  
3. Reopen only if:  
   - pulse miss with ID mismatch in logs → alias MOB, or  
   - visible stutter on dense wall → CSS compositor MOB.

---

## Agent must not

- Freestyle `video-wall.js` ID fuzzy match without APPLY + FAIL proof  
- Touch PTT audio path / `pttServer.js` for “CSS polish”  
- Claim `deviceId` already solves dual-ID (it does not)

---

## One line

**Google #3 already done; #2 valid optional CSS harden; #1 only if real ID mismatch FAIL — do not reopen PASS pulse for theory.**
