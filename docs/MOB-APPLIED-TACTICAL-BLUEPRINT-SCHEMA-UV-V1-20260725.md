# MOB-APPLIED — Phase 2 Task 2.1 Tactical blueprint schema

**Date:** 2026-07-25  
**Task:** Phase 2 **2.1** — Postgres `tactical_blueprints` / `tactical_pins`  
**Operator:** **PASS** (2026-07-25) — restart + BWC video OK  
**Disc:** `MOB-DISC-TACTICAL-BLUEPRINT-SCHEMA-UV-20260724.md`  
**APPLY name:** schema slice of `TACTICAL-BLUEPRINT-SCHEMA-UV-UPLOAD-V1` (upload = Task **2.2**)

## Delivered

| File | Role |
|------|------|
| `db/migrations/002_tactical_blueprint_uv.sql` | Tables + indexes + `schema_migrations` v2 |
| `lib/siteDb.js` | Runs `001` then `002` on catalog init; requires version ≥ 2 |

**Out of this task:** upload route, UV JS helpers, CRUD APIs → **Task 2.2**.

## SQL (summary)

- `tactical_blueprints` — UUID PK, name, `image_url`, width/height, MIME jpeg/png/webp, `byte_size` ≤ 5 MB, timestamps, `site_id`
- `tactical_pins` — UUID PK, nullable `blueprint_id` (NULL = global geo map), `device_id`, `lat`/`lng`, `uv_x`/`uv_y` ∈ [0,1], placement CHECK (geo **or** blueprint+UV)

**Verify:** `npm run verify:tactical-blueprint-schema`

## Operator smoke (plain)

1. Restart lab the usual way  
2. Open a BWC — **if video still works like before → PASS**

(Tables are created on catalog boot; you will not see a new UI yet.)

Say **PASS** or **FAIL**. Do **not** start Task 2.2 until PASS.
