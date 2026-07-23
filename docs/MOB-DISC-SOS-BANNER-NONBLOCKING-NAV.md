# MOB DISC — SOS banner non-blocking nav

**Status:** **APPLIED** 2026-07-13 — `mob-sos-banner-nonblocking-nav`  
**Trigger:** SOS on Analytics — felt stuck until ACK; could not freely use top tabs  
**Search:** SOS banner, stuck, acknowledge, switch tabs, nonblocking  

---

## Locked SOP

| Rule | Meaning |
|------|---------|
| ACK still required to **clear** SOS | Audit / ownership |
| Tabs always usable during SOS | Ops / Analytics / Evidence without finishing ACK first |
| Banner under header+nav | Strip does not bury the tab bar |

---

## What changed

| File | Change |
|------|--------|
| `public/index.html` | Move `#sos-banner` **under** `#app-top-nav`; ack dimmer starts below chrome; nav hint line |
| `public/js/dashboard-boot.js` | `body.sos-incident-active` while banner up |
| `public/locales/en.json` | `sos.banner.navHint` |

**Not changed:** SOS ledger / ACK payload / PTT / live wall logic.

---

## PASS check

1. Trigger SOS on **Analytics**  
2. Without ACK → click **Operations** (and back) — tabs work  
3. Hint visible: switch tabs anytime  
4. ACK still clears banner  

## Next (separate)

`mob-ops-map-resize-after-tab` — **APPLIED** 2026-07-13 — see `MOB-DISC-OPS-MAP-RESIZE-AFTER-TAB.md`
`mob-sos-banner-minimize` — optional collapse (not required for this MOB)
