# MOB DISC — Lab URL confusion: 4438 vs 3988 (restart prints HTTP only)

**Date:** 2026-07-30  
**Status:** **APPLIED** via `RESTART-HEALTH-PRINT-HTTPS-4438-V1` (2026-07-30) — awaiting operator PASS  
**Search:** 4438, 3988, FM_HTTPS, HEALTH PASS, UbitronC2 restart, Open dashboard  
**Operator:** Angry — “was fine this morning; can’t do 4438 anymore; restart only shows 3988; AI must have broken it.”  
**Related:** `MOB-DISC-RESTART-HEALTH-PRINT-HTTPS-4438-V1-APPLIED.md` · `MOB-DISC-HTTPS-PRODUCT-VS-LAB-PORTS-PLAIN-20260723.md`

---

## Plain English (locked facts)

1. **Lab bookmark = HTTPS `https://192.168.1.38:4438`.** HTTP `http://…:3988` is the other door on the **same** process.  
2. **Today’s Analytics MOB APPLYs did not touch HTTPS, ports, TLS, or the Windows service.** Files changed: analytics hub / FR alarm / CSS pills / docs only.  
3. **Checked 2026-07-30 ~23:29 after service restart:**  
   - `:3988` listening + HTTP `/api/health` **200**  
   - `:4438` listening + HTTPS `/api/health` **200** (localhost **and** `192.168.1.38`)  
   - `.env` still has `FM_HTTPS_ENABLED=1` · `FM_HTTPS_PORT=4438`  
4. So **4438 is not dead on the server** at check time. If the browser still fails, it is almost always: wrong scheme (`http://…:4438`), cert click-through, cache, or the restart window making you open **3988 only**.  
5. **Real product bug / confusion:** restart **HEALTH PASS** text prints **only** `http://localhost:3988` and `http://192.168.1.38:3988` — **no** `https://…:4438`. That trains the operator that 4438 is gone.

---

## Why it feels like “AI broke 4438”

| What you see | What it means |
|--------------|----------------|
| Restart window: Dashboard **:3988** only | Script omission — HTTPS still can be up |
| Browser “can’t load” `https://…:4438` | Cert warning, typed `http://`, or momentary refuse during restart |
| Morning worked / after restart confusing | Same two doors; message only advertises one |

**Not:** Analytics engine-health pill MOB killing TLS.

---

## Operator do now (no APPLY)

1. Open exactly: **`https://192.168.1.38:4438`** (must say **https**).  
2. If browser warns on lab cert → Advanced → continue (lab self-signed).  
3. Fallback if needed: `http://192.168.1.38:3988` — same app.  
4. If HTTPS still refuses: say what the browser shows (ERR_CONNECTION_REFUSED / CERT / blank). Do **not** open `:3000` / `:3888`.

---

## Recommended MOB (one path)

### `RESTART-HEALTH-PRINT-HTTPS-4438-V1`

| # | Change |
|---|--------|
| 1 | After HEALTH PASS, print **primary lab URL** first: `https://<LAN>:4438` (from `FM_HTTPS_PORT` when enabled) |
| 2 | Then print HTTP `:3988` as “HTTP fallback” |
| 3 | Never imply only 3988 exists when `FM_HTTPS_ENABLED=1` |

**Do not:** remove HTTP 3988 · change certs · rename Axiom · weekly port hobby.

---

## PASS / FAIL (after that MOB)

| Check | PASS |
|-------|------|
| Restart window | Shows **https://…:4438** as primary |
| Operator | Can bookmark one clear lab URL |

---

## Operator decide

When ready to fix the restart text:

- **`MOB-APPLY RESTART-HEALTH-PRINT-HTTPS-4438-V1`**

**No code in this disc.**

---

## Lock record

| Item | Decision |
|------|----------|
| Lab primary URL | **`https://192.168.1.38:4438`** |
| HTTP 3988 | Fallback, same process |
| Restart print HTTP-only | **Bug / confuse** — fix with named MOB |
| Today Analytics APPLYs broke 4438 | **No** (server still serves HTTPS at check) |
| Next after CW cover PASS | **`RESTART-HEALTH-PRINT-HTTPS-4438-V1` APPLIED** |
