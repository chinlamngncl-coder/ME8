# MOB DISC — Will the finished product be HTTPS? (plain English)

**Date:** 2026-07-23  
**Status:** PAPER — how ship works; no APPLY  

---

## Short answer

**Yes — the real customer product should be HTTPS** for the Ops webpage (and the sockets behind it).  

**Lab right now** still has both:
- HTTP `:3988` (old door — easy on this PC)
- HTTPS `:4438` (new door — for second PC / mic)

That dual setup is **lab training wheels**. It is **not** “forever change ports every day.”

---

## How it works (no jargon pile)

Think of three layers:

| Layer | What the user types | What it is |
|-------|---------------------|------------|
| **1. Webpage (Ops)** | `https://…` | Login, map, wall, buttons |
| **2. Live talk / sockets** | Same site, or secure sockets | Mic, listen, live signals |
| **3. Camera video pipe** | Prefer same `https://…` host | Picture from ZLM/WVP |

**Ship goal:** operator opens **one HTTPS address**. Browser is happy (mic works). No “insecure page” block.

**AES** (password zip for evidence later) is **not** the same as HTTPS. Different lock, different time.

---

## Will we keep changing ports forever?

**No.**

| Phase | Ports | Why |
|-------|-------|-----|
| **Lab now** | HTTP **3988** + HTTPS **4438** | Safe to test without breaking what already works |
| **After C2–C3 PASS** | Still may show both until you choose | Finish sockets + video under HTTPS |
| **Customer pack** | Prefer **one clear HTTPS entry** (often **443** behind a small reverse proxy, or one HTTPS port you document once) | IT opens firewall **once**; operators bookmark **one URL** |

So: lab uses an extra port (**4438**) so we do not fight Windows “need Admin for 443” every day.  
At ship, IT usually puts **HTTPS on 443** (normal web) in front of Fleet — **one URL**, ports stop being a daily topic.

Cameras (SIP / PTT / WVP) keep their **own** ports (5060, 29201, etc.). Those are device/network ports — **not** the same as “which URL do I type for Ops.” Operators still use the **one Ops HTTPS link**.

---

## What “finished lab → big product” means

1. Lab proves: HTTPS page → sockets → video all PASS.  
2. Pack docs say: “Open `https://your-server`” (and firewall list once).  
3. You do **not** run forever on “remember 3988 and 4438 and also 18088.” That is lab mess we clean toward **same-origin HTTPS**.

If something is still HTTP-only in a corner after pack, that is a **leftover bug / next MOB** — not the target design.

---

## What you do (operator)

- Lab: try `https://192.168.1.38:4438` when we ask; keep `http://localhost:3988` if needed.  
- Ship: customer gets **one HTTPS Ops URL** in the install guide — not a weekly port change hobby.

---

## One line

**Yes — the real product Ops face is HTTPS; lab keeps HTTP+extra HTTPS port while we finish; ship aims at one HTTPS URL, not endless port juggling.**
