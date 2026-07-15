# MOB DISC — Lab WVP tile must not ship to client

**Status:** LOCKED (with dashboard gate) — 2026-07-14  
**Search:** `test-wvp-tile ship`, `FM_LAB_WVP pack`, `me8-wvp-lab-tile`, `look stupid client`

**Worry:** If lab WVP chrome reaches a customer zip, the pack looks stupid / unfinished.

---

## Plain answer

Lab WVP proof is **lab only**. It must **not** show on a customer dashboard.

---

## Wired (after `mob-track-b1-tile-on-dashboard`)

| Item | Ship behavior |
|------|----------------|
| `#me8-wvp-lab-tile` on dashboard | CSS **default hide**; show only `body.fm-lab-wvp` when `FM_LAB_WVP=1` |
| `public/js/wvp-lab-tile.js` | **Removed** by pack scripts |
| `public/test-wvp-tile.html` | **Removed** by pack scripts |
| API `/api/lab/wvp/*` | Only live if `FM_LAB_WVP=1` |
| Lab docker WVP folder | Stripped from pack |

Customer `.env` / ship profile must **not** copy lab flags (`FM_LAB_WVP`, `FM_LAB_ZLM`). Normal ship does **not** ship desk `.env`.

---

## Ship gate line (pack time only — no daily nag)

When you say **ship / pack / packing checklist**, tick:

```
[ ] Lab pages gone: no test-wvp-tile.html, no test-zlm.html, no wvp-lab-tile.js in zip
[ ] No FM_LAB_WVP / FM_LAB_ZLM in customer env
[ ] No WVP lab panel on customer dashboard (flag off + JS stripped)
```

Remind then — not every chat.

---

## Related

- **PASS lock:** `docs/MOB-DISC-TRACK-B1-WVP-TILE-PASS.md`
- Applied: `docs/MOB-APPLIED-TRACK-B1-TILE-ON-DASHBOARD.md`  
- Earlier standalone page: `docs/MOB-APPLIED-TRACK-B1-ONE-TILE-WVP.md`
