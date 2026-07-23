# MOB DISC — TRUST-PROXY-AND-HOST-V1 in plain English

**Date:** 2026-07-23  
**Status:** PAPER — explain only; **no APPLY yet**  
**Name:** `TRUST-PROXY-AND-HOST-V1` (Track C4)

---

## What it means (simple)

Today your Ops talks **straight** to Fleet:

`browser → https://192.168.1.38:4438 → Fleet`

**Trust proxy** is for later, when a customer puts a **front door** in front of Fleet:

`browser → https://ops.company.com (nginx / Caddy) → Fleet inside`

That front door terminates HTTPS and forwards the request. Fleet must be told:  
**“Believe the front door’s notes about who the visitor is and that this was HTTPS.”**

Those notes are headers like:
- **X-Forwarded-For** — real visitor IP (for login rate limits / audit)
- **X-Forwarded-Proto** — was it really `https`?
- **Host** — the public name people typed (`ops.company.com`), not the internal machine name

**HOST** in our plan = keep the **real LAN / public name** correct (never Docker `172.x`), so links and stream hosts stay right behind that front door.

---

## What it does (when APPLYed later)

| Job | Why |
|-----|-----|
| Turn on / document **trust proxy** safely | So login limits and “secure” checks work behind nginx |
| Make sure **Host / forwarded** headers are used only when the front door is trusted | If you trust random headers with no proxy → attackers can fake IPs |
| Align **HOST / stream host** for multi-PC or multi-site | Wrong host → wrong links / broken media |

It does **not** add a new video feature. It does **not** change Open All. It does **not** replace C1–C3.

---

## Do you need it **now** in lab?

**Usually no.**

Lab now: browser hits Fleet **directly** on `:4438`. C1–C3 already cover that.  
Trust proxy matters when you (or customer IT) put **nginx/Caddy** (or similar) in front and use a normal URL like `https://something` on port 443.

---

## When to APPLY

Say `MOB-APPLY TRUST-PROXY-AND-HOST-V1` when:
- You are wiring a real reverse proxy, **or**
- Ship/IT docs need the “behind nginx” path locked

Until then: **park C4**. TLS lab genre for your desk is done after C1–C3 PASS.

---

## One line

**Trust-proxy = teach Fleet to trust the https front door’s “who / https / hostname” notes; skip it until nginx/Caddy sits in front.**
