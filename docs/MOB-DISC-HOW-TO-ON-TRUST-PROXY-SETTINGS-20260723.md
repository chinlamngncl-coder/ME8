# MOB DISC — How to turn Trust proxy ON (Settings + readiness)

**Date:** 2026-07-23  
**Status:** PAPER — how-to + readiness truth; C4 APPLY later if we polish  
**Operator ask:** “ON only when IT adds front door — **how** to ON? Settings? Get ready if readiness is weak.”

---

## How to turn ON today (already in Settings)

**Path:**

1. Open **Settings → Server Config** (server / network area).  
2. Open section **Reverse proxy** (`#ss-section-production`).  
3. Check **Trust reverse proxy (X-Forwarded-Proto / Host)**.  
4. Click **Save**.  
5. Restart Mobility if the front door is already live (UI hint already says so).

**Who:** user with server-manage rights (super admin path).

**Default:** OFF — leave OFF for direct `https://IP:4438` lab/customer.  
**ON:** only after IT puts nginx / Caddy / IIS **in front** and staff use that public HTTPS URL.

Also mirrored under **Lab → Monitoring** (same flag) — prefer **Server → Reverse proxy** as the real home.

---

## Readiness — do we have it?

**Yes, partly.**

| Piece | Exists? | What it does |
|-------|---------|----------------|
| Reverse proxy section + checkbox + Save | **Yes** | How you turn ON/OFF |
| Operator portal URL | **Yes** | What staff bookmark |
| Site readiness “HTTPS / reverse proxy” | **Yes** | Warns when HTTPS URL but trust proxy still OFF (cloud/hybrid/LAN cases) |
| Plain “IT: turn this ON when…” one-screen guide | **Weak** | Copy is still engineer-ish |
| Built-in Ops HTTPS (`:4438`) toggle in Settings | **No** | Still env/lab — separate from trust proxy |

So: **we are not empty.** Turning ON is Settings, not a secret.  
C4 should **not invent a new switch** — it should make this path **impossible to miss** and readiness **honest**.

---

## When IT adds the front door — operator checklist (plain)

1. IT installs nginx/Caddy → `https://ops.company.com` → Fleet.  
2. In Server Config → **Operator portal**, set URL to that `https://…` address.  
3. In **Reverse proxy**, tick **Trust reverse proxy** → **Save**.  
4. Restart if needed.  
5. Open Site readiness — item should go green / OK for that mode.  
6. Leave device registration IPv4 as the **camera** IP (not the fancy DNS), unless IT says otherwise.

If they **don’t** use a front door: leave Trust proxy **OFF**. Direct HTTPS still works.

---

## What C4 should fix when you APPLY (readiness ready)

So we never rely on “call engineer”:

1. **Plain labels** — e.g. “Turn ON only if HTTPS stops at nginx/Caddy in front of this server.”  
2. **Readiness line** — clear PASS/FAIL: HTTPS portal + trust ON when behind proxy; HTTPS direct lab without proxy = OK with trust OFF.  
3. **One help line** under the checkbox: where to click, when OFF vs ON.  
4. Confirm Save works and status text shows saved.  
5. Pack/IT one-pager points to this same Settings path (no `.env` for trust proxy).

---

## One line

**Turn ON in Settings → Server Config → Reverse proxy → check Trust reverse proxy → Save; readiness already warns — C4 makes that path obvious so IT never needs a miracle engineer.**
