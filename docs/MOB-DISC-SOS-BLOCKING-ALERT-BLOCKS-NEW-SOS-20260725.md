# MOB DISC — Blocking `alert()` can hide / delay new SOS while operator is away

**Date:** 2026-07-25  
**Status:** DISC — **LOCKED** · APPLY **PASS** 2026-07-25 → `MOB-APPLIED-SOS-OPEN-FOLDER-NO-BLOCKING-ALERT-V1-20260725.md`  
**Not Task 1.2:** Command injection fix is separate; this is **SOS UX / operator safety**.

---

## 1) “Like this?” — Server folder (admin)

**Yes.** That is the right control for Task **1.2** smoke:

- Modal **SOS Incident** → **Server folder (admin)**  
- Hits `POST /api/sos-incidents/open` → `explorer.exe` (no `cmd.exe`)  
- Then the UI may show a browser **OK** dialog with the path  

If Explorer opened and you got a success path dialog → **PASS for 1.2** when you say so.

(Encoding glitch `Acknowledged Â·` is a separate i18n/encoding nit — not this Disc’s APPLY.)

---

## 2) What you discovered (serious)

> If I don’t click OK on the message… when I press SOS it did not pop up.  
> What if the user forgets OK and walks away, and a BWC presses SOS?

### What is happening

After **Server folder (admin)** succeeds, the dashboard uses a **blocking browser dialog**:

```js
alert(dashboardTr('sos.alert.openedLocal', { path: data.path || '' }));
```

`window.alert()` **freezes that browser tab’s JavaScript** until someone clicks **OK**.

While frozen:

| Still may work | Often blocked / delayed |
|----------------|-------------------------|
| OS already opened Explorer (spawn already ran) | New **SOS UI** updates (strip, modal, sound hooks that run in JS) |
| Server still receives SOS | Toast / ledger refresh / map pin SOS chrome in that tab |

So if the operator leaves the tab with **OK** still open and a BWC presses SOS:

- **Backend / other clients** can still get the SOS (server is not frozen).  
- **That frozen tab** can look “dead” — no new SOS popup / strip update until OK is dismissed.  
- That is a **life-safety UX fail** for a single-operator desk.

This is **not** caused by the explorer spawn fix; it is the **`alert()` after open**.

---

## 3) Locked product ask (when we fix — after SEC Phase 1 or named APPLY)

Do **not** use blocking `alert()` for “opened folder” on SOS / storage paths that matter during live alarms.

| Prefer | Avoid |
|--------|--------|
| Non-blocking toast / status banner (AdminActionBus toast or existing SOS toast pattern) | `alert()` / `confirm()` on hot SOS paths |
| Optional short path copy in toast | Modal that freezes the whole tab |

Optional harden: if SOS arrives while a legacy dialog is up — still not fixable while `alert` holds the thread; **must remove `alert`**.

---

## 4) Recommended APPLY (one — **not now** unless you override)

**Queue:** Finish SEC Google five first (roadmap). Then:

**`SOS-OPEN-FOLDER-NO-BLOCKING-ALERT-V1`**

Scope:

1. Replace `alert(…openedLocal…)` after `openSosIncidentFolder` (and twin storage open if same risk) with non-blocking toast.  
2. Keep Explorer spawn as-is (1.2).  
3. Out: SEC 1.3–1.5, Turf, blueprint.

---

## 5) For right now (SEC 1.2)

| Question | Answer |
|----------|--------|
| Is Server folder (admin) the right 1.2 smoke? | **Yes** |
| Is the “forgot OK / next SOS silent” issue real? | **Yes — blocking `alert()`** |
| Fix in this SEC task? | **No** — separate MOB after Phase 1 (or say APPLY now if you override) |

Say **PASS** on 1.2 when Explorer smoke is good → we continue **Task 1.3 only**.  
Or say **`MOB-APPLY SOS-OPEN-FOLDER-NO-BLOCKING-ALERT-V1`** if you want that UX fix immediately (breaks Phase 1 order — your call).

Until APPLY — **zero code** for the alert fix.
