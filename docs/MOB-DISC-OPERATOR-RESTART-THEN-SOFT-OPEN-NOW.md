# MOB DISC — Operator: restart then Soft Open now?

**Date:** 2026-07-17  
**Status:** Paper · do this now  
**With:** `MOB-DISC-BWC-ONE-ROW-WVP-ZLM-WHAT-TO-KEY.md` · `MOB-DISC-AFTER-5062-TEST-THEN-M2.md`

---

## Yes

Restart in this order, then Soft Open. No new MOB-APPLY until you report PASS/FAIL.

---

## Steps (you)

1. **Stop Fleet**  
2. **WVP lab up** — proxy listening **5060** (START-WVP-LAB if you use that)  
3. **Start Fleet** — log should show SIP **5062**  
4. **BWC** (if not already): one row → Wi‑Fi IP · port **5060** · platform `4401020049` · pwd `admin123`  
5. WVP device list: cam **online**  
6. Dashboard → **Soft Open** (Chin or kk)

Do **not** type 5062 on the BWC.

---

## Tell agent

- **PASS** — cam online + picture OK (or still Plan B / ugly — say what you see)  
- **FAIL** — cam offline / black / error text  

Then we pick M2 or fix key-in. No code until you say.

---

## One line

**Yes: Stop Fleet → WVP on 5060 → Start Fleet → Soft Open. Report PASS/FAIL.**
