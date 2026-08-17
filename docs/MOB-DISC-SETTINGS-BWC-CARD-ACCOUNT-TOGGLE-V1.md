# MOB-DISC — TYPE ON BWC meaning, My account 5-col, lab toggle gap

**Date:** 2026-08-17  
**APPLY:** `MOB-APPLY SETTINGS-BWC-CARD-ACCOUNT-TOGGLE-V1`  
**Scope:** `#server-setup-panel` only. Unify.css last for CSS that must stick. Tiny `fillBwcChecklist` change. No Evidence. No Fleet rebuild. No `.cursorrules` edit.

## 1) What the grey box is (locked product fact)

**TYPE ON BWC is a SIP type-in cheat sheet** — not a camera directory.

Installer/admin copies **one set of values** onto **each** BWC’s SIP screen: protocol, SIP server, port, server ID, realm, password (shown as Configured), message server, media.

That is why it sits under Protocol / Alt SIP password / Media transport. Change those fields → the cheat sheet updates.

**It is not** “how many BWCs, who they are, using what address.” Addresses are **one site SIP identity**. Every camera types the **same** server line. Chin vs kk is officer/device **name**, not a different SIP recipe.

**Hundreds of BWCs:** listing names here is the wrong object. Today JS already dumps names into the same `<dl>` as empty `<dt>` + `<dd>` (`slice(0, 6)` + “more”). That is why **kk** and **Chin** sit on different columns after the 4-col grid — they are leftover cells, not a name row. A long name list would also grow the Settings page. Names already live on **Fleet → BWC list**.

**Why it still sticks to Alt SIP password:** the card is a **child of the protocol form grid**. Grid gap beats `margin-top`. V2 margin never got a chance.

### Recommendation (one path — APPLY this)

1. **Move** `.ss-type-on-bwc-card` **out** of `#ss-panel-sip` form grid (after the protocol panels, still in Protocol / Infrastructure). Then `margin-top: 32px` + `padding-top` actually show.  
2. Cheat sheet = **SIP fields only** (the dt/dd recipe).  
3. **Your BWCs** = one count line only: `N registered`. **No names** in this card (Chin / kk / hundred-name dump gone). Open Fleet for names.  
4. Keep the 2×2 field grid so the grey card fills; no empty-dt name rows.

Do **not** turn this box into a scrollable roster. Do **not** duplicate Fleet.

## 2) My account — yes, own rights; 5 columns; no scroll

**Yes.** My account is **this signed-in operator’s** identity + control rights (remote, kill, evidence, VC, audit…). Every user sees **their** row, not everyone else’s.

V2 used **4** columns → leftover empty strip on the right. Operator wants **5**.

APPLY:
- `#server-setup-panel #ss-my-account-info.ss-my-perms { column-count: 5; column-width: auto; }` (unify last + the index.html rule).  
- Tighter pair gap so 21 fields fit **one viewport**.  
- When dash subtab is **My account**: `#ss-panel-scroll` overflow **hidden** (no scrollbar). Other Settings tabs keep fill-then-scroll (scroll only if content is taller than the leftover).

## 3) Pic 3 + 4 — first toggle words kissing the second switch

SSO Enable/Keep-local and Monitoring Trust/Metrics are `inline-flex` siblings with **no** end gap.

APPLY (lab panel only):
```css
#server-setup-panel #ss-panel-lab label.ss-lab-check {
  margin-inline-end: 32px !important;
  max-width: calc(50% - 16px);
}
```
Keep both on one row when they fit. Do not change Evidence toolbars.

## Out of scope

Evidence, Tactical, user-drawer master ALL, backend, `.cursorrules`.

## Operator PASS

1. Grey card: gap under Alt SIP password / Media transport; SIP values only; **one** count line; Chin/kk **not** in this box.  
2. My account: **5** columns, fills the card; **no** scrollbar on that tab.  
3. SSO + Monitoring: visible space between first label and second switch.
