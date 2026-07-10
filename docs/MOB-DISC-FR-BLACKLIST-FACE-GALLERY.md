# MOB DISC — Enrolled face should show in Blacklist (gallery)

**Status:** Applied `mob-fr-blacklist-thumb` 2026-07-10  
**Date:** 2026-07-10  
**Search:** `blacklist thumb`, `enrolled face`, `photoUrl`, `watchlist gallery`  
**Related:** enroll soft-quality · live alarm (`photoUrl` already on hit)

---

## What you see now (correct vs missing)

| Layer | Today |
|-------|--------|
| Enroll success | Name lands in the **text table** (name · ID · time · Active) |
| Photo on disk | **Yes** — `storage/fr-blacklist/photos/{id}.jpg` |
| Photo API | **Yes** — `GET /api/analytics/fr/blacklist/:id/photo` (any logged-in dashboard user with FR license) |
| Alarm popup | **Shows** enrolled photo vs live crop when a match fires |
| Blacklist tab UI | **No thumbnail** — text rows only |

So enroll **did** keep the face. Super Admin is the right place to **add/remove**. What’s missing is the **gallery column** operators expect after “Added to blacklist.”

---

## How people outside do it (industry)

Watchlist / blacklist / “persons of interest” UIs almost always look like this:

1. **Row = face + identity** — small mugshot (48–72 px) left of name; click opens full enroll photo.
2. **Enroll confirm** — after save, show the **same crop/photo** next to “enrolled” (not only a toast).
3. **Alarm / hit** — side-by-side: **enrolled gallery face** | **live crop** (we already do this).
4. **Who enrolls** — usually **admin / investigator** only; operators **view** thumbs + search (we already gate POST/PATCH/DELETE to super admin).
5. **Optional later** — face-only crop thumb (tight box) vs full ID scan; multi-photo per person; “last seen” from live hits.

They do **not** leave a successful enroll as name-only rows — that feels like “did it really take?”

---

## Recommendation (Ubitron)

**One small UI MOB** — no new enroll engine work.

| Item | Lock |
|------|------|
| **MOB name** | `mob-fr-blacklist-thumb` |
| **What** | Add a **Face** column: `<img src="/api/analytics/fr/blacklist/{id}/photo">` (broken-image placeholder if missing) |
| **Where** | Blacklist table only (`analytics-hub.js` + thin CSS in `index.html`) |
| **After enroll** | Refresh list (already) so new row shows thumb immediately |
| **Click** | Optional: lightbox / new tab full photo — nice-to-have in same MOB or follow-up |
| **Not in this MOB** | Face-crop-only thumb, multi-photo, operator enroll rights |

**Why this first:** Backend already stores + serves photos; alarm already uses them. Gap is **trust UI** on the Blacklist tab.

---

## Role note (Super Admin page)

| Action | Who |
|--------|-----|
| Enroll / disable / remove | Super admin (current) — keep |
| See list + thumbs | Any FR-licensed dashboard user — keep API as-is |
| Live watch + alarm | Operators on Analytics Live |

No need to move enroll out of Super Admin for v1. Gallery thumbs make the Super Admin Blacklist tab feel complete.

---

## Out of scope (later)

- FTP inbox auto-enroll gallery
- Person track on map with last-hit face
- Tight face-crop thumb at enroll time (sidecar crop file)

---

## Bottom line

| Question | Answer |
|----------|--------|
| Should enrolled face show? | **Yes** — industry standard |
| Is the face lost? | **No** — on disk + alarm can show it |
| What’s wrong? | ~~Table didn’t render photo~~ → **Face column** + click opens full enroll photo |
| Applied | **`mob-fr-blacklist-thumb`** 2026-07-10 |
