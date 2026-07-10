# MOB DISC — FR snap archive FTP · operator delete · dashboard auth

**Status:** DISC locked 2026-07-10 — **logic confirmed**; no APPLY yet  
**Search:** archive FTP, snap delete, SOP, operator FR, dashboard auth, permissions  
**Related:** `MOB-DISC-FR-SNAP-LEDGER-RETENTION-FTP-ZONES.md`, `MOB-DISC-ANALYTICS-LICENSE-HUB.md` (SA delegates rights)

---

## Did we get the logic? **Yes.**

Three linked rules:

| # | Rule |
|---|------|
| 1 | **Archive** hot snaps to **FTP/NAS** when full / by policy — then prune hot (not silent wipe) |
| 2 | **Operators may delete** snaps **without a heavy SOP** when **super admin grants** that right |
| 3 | Those rights must live in **dashboard auth** (Settings → Users permissions) — same pattern as evidence view/export |

License (`fr` feature) = site bought the module.  
**Auth permissions** = which operators may **use / delete / archive** FR snaps.

Today: FR APIs are mostly `requireDashboardAuth` + license; enroll is often **super-admin only**; **no** `frView` / `frSnapDelete` flags in `DEFAULT_PERMISSIONS`. That gap is what this disc closes.

---

## 1) Archive FTP (`mob-fr-snap-archive-ftp`)

### Intent

```
Hot ledger near warn/critical
  → pack oldest day/cam → FTP (or configured NAS path)
  → verify upload OK
  → then remove from hot
  → if FTP fail → keep hot + alert (no silent delete)
```

| Piece | Plan |
|-------|------|
| Config | Reuse **Settings FTP** / evidence path patterns where possible — one channel, not a secret second FTP |
| Layout | `/fr-snaps/YYYY-MM-DD/{camId}/…` + index fragment |
| Trigger | Auto at warn/critical **and/or** super-admin “Archive now” |
| Alert | HQ / health: archive OK / fail / full |
| Who runs auto | Server job (system) |
| Who configures FTP | **Super admin** only |

**Out of this MOB:** second-copy backup (`mob-fr-snap-archive-backup`), per-BWC zones.

---

## 2) Delete without heavy SOP (operator)

### Operator ask (locked)

> Allow user to **delete without SOP** if super admin allows FR to be used by operator.

| Meaning | Locked |
|---------|--------|
| **No dual-control / no second-approver SOP** for routine snap delete | Default when `frSnapDelete` is granted |
| **Not** “anyone logged in can wipe the ledger” | Must be an explicit permission |
| **Audit always** | `analytics.fr_snap_delete` with actor, snap id, camId |
| **Scope** | Operator only deletes snaps for cams in their **dispatch group** (same as fleet scope) unless `seeAllDispatchGroups` |
| Super admin | Always may delete / archive / configure |

“Without SOP” ≠ “without audit.” It means **no ceremony** beyond permission + click + log.

Optional later (not default): site policy “require note on delete” — checkbox, not dual admin.

---

## 3) Dashboard auth — must add FR permissions

Add to `lib/dashboardAuth.js` `DEFAULT_PERMISSIONS` + Users UI + API guards:

| Permission | Default (operator) | Meaning |
|------------|--------------------|---------|
| `frView` | **false** | See Analytics FR, snaps list, alarms (if licensed) |
| `frWatch` | **false** | Run live watch / slots |
| `frEnroll` | **false** | Enroll / edit watchlist (today often SA-only — can stay SA or grant) |
| `frSnapDelete` | **false** | Delete hot snap(s) — **no dual SOP** |
| `frSnapArchive` | **false** | Manual “send to archive / FTP” for selected range (optional; auto job is system) |

**Super admin:** all true (or bypass).  
**License off:** permissions irrelevant — module greyed.  
**License on + `frView` false:** operator does not see FR / gets 403 on FR APIs.

### API shape (when APPLY)

| Action | Gate |
|--------|------|
| List/get snaps, crop | license + `frView` (or SA) |
| Delete snap | license + `frSnapDelete` (or SA) + scope |
| Archive job config | SA |
| Manual archive trigger | SA or `frSnapArchive` |
| Enroll blacklist | license + `frEnroll` (or SA) |

Settings → Users: checkboxes under **Face recognition** (only shown when FR licensed, or always greyed with hint).

---

## Suggested APPLY order (one at a time)

| # | MOB | Intent |
|---|-----|--------|
| 1 | `mob-fr-auth-permissions` | Add `frView` / `frWatch` / `frEnroll` / `frSnapDelete` / `frSnapArchive` to dashboard auth + Users UI + API guards |
| 2 | `mob-fr-snap-delete` | DELETE API + UI for permitted operators (audit, no dual SOP) |
| 3 | `mob-fr-snap-archive-ftp` | Pack → FTP → prune; fail keeps hot + alert |

Do **not** ship archive FTP that only super admin can ever clear while operators drown in snaps — auth + delete first or same genre, **one MOB at a time**.

---

## What we will not do

| Bad | Why |
|-----|-----|
| Silent prune with no archive when FTP configured | Evidence loss |
| Any operator deletes without permission flag | Auth hole |
| Dual-admin SOP as mandatory for every delete | Rejected — SA grants `frSnapDelete` instead |
| Fake “FR allowed” only in UI with no server check | Must be dashboard auth + API |

---

## Bottom line

| Question | Answer |
|----------|--------|
| Archive to FTP when full? | **Yes** — `mob-fr-snap-archive-ftp` |
| Operator delete without heavy SOP? | **Yes — if SA grants `frSnapDelete`** + audit |
| Dashboard auth? | **Must** — new FR permission flags like evidence |

Reply e.g. `MOB-APPLY mob-fr-auth-permissions` first (recommended), or name another MOB when ready.
