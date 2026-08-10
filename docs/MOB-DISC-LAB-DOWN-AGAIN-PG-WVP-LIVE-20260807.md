# MOB DISC — Lab test software down again: PG + WVP (live cannot call) (2026-08-07)

**Status:** disc only. **No code / no `.env` edit in this turn.**  
**Operator:** Other agent repacked and messed up test software; bring it back; live still would not call even after earlier fix. Check.

---

## Current lab state (checked ~15:06 +08)

| Piece | State | Meaning |
|-------|--------|---------|
| `UbitronC2` | **PAUSED** | Crash-loop again |
| Startup error | `password authentication failed for user "mobility"` | Catalog URL ≠ Postgres volume password **again** |
| `mobility-postgres` | **Recreated** ~14:58 +08 (`Created` 06:58Z), healthy | Prior `ALTER USER` repair was **wiped** when volume/container was remade |
| `.env` `FM_CATALOG_DB_URL` | Long lab password (len 48) | Still the lab URL |
| Live PG accepts | **`change_me_pg`** (len 12) | Pack / `Set-DeployHostEnv.ps1` style password |
| `me8-wvp` | **Exited (1)** ~5h | WVP Java dead — MyBatis `Current database id is [null]` (DB not wired) |
| `me8-wvp-zlm` / redis / wvp-db | Up | Media edge up; **control plane WVP down** |
| `.env` live path | `FM_WVP_VIDEO_HANDOFF=1`, `FM_WVP_BASE=http://127.0.0.1:18080` | Soft-open / live **needs WVP** |
| SIP proxy env | `WVP_SIP_PROXY_TARGET=127.0.0.1:15061` | Log: **legacy/dead** — remapped in memory to **5061**, but useless while WVP is down |

Blank / dead dashboard again = **Fleet not running** (PAUSED), same class as before.

---

## Why “I brought it back” then live still failed / now dead again

### 1) Catalog auth repair was real — then undone

Earlier APPLY `FLEET-CATALOG-PG-AUTH-REPAIR-V1` set role password to match `.env` → `dashboard https listening` briefly.

Something after that (**repack / compose / deploy env**) **recreated** `mobility-postgres` with pack password **`change_me_pg`**.  
`.env` was **not** updated to match → crash-loop → **PAUSED** again.

So: not Weapon. Not “holdOnly.” **Env vs volume desync after another agent’s pack/compose on this lab.**

### 2) Live cannot call while `me8-wvp` is dead

With handoff **ON**, Ops live goes through WVP/ZLM.  
`me8-wvp` Exit + mapper/DB null → **no reliable INVITE / play URL** even if Fleet were up.

Secondary smell: `WVP_SIP_PROXY_TARGET=…:15061` is known legacy; proxy already falls back to 5061 in memory — **fix after WVP is up**, do not treat as only live bug.

### 3) CN / other-agent pack

Packer zip for partners ≠ safely re-running deploy compose against **this** lab’s existing volumes. Known residual: stale volume + new password (`MOB-DISC-CN-AIRGAP-PACK-STATUS…` item 4).  
**Likely:** other agent ran compose / `Set-DeployHostEnv` style password on lab → destroyed the temporary auth alignment. **Did not** require deleting Weapon code.

---

## Bring-back plan (one path — keep data, no Weapon revert)

**Do not** wipe `mobility_postgres` data volume unless you explicitly order destructive reset.

### MOB name (when you APPLY)

`MOB-APPLY LAB-FLEET-WVP-BRING-BACK-V1`

Exact scope only:

1. **Catalog:** `ALTER USER mobility` password = current `.env` `FM_CATALOG_DB_URL` password (keep your lab `.env`; do **not** rewrite to `change_me_pg` unless you say so). Prove `PG_OK` with `.env` URL.  
2. **Service:** clear PAUSED / restart `UbitronC2` as Admin → prove `dashboard listening` + `dashboard https listening`.  
3. **WVP:** bring `me8-wvp` back up (compose in `docker/wvp` — fix DB connectivity so mapper is not null). Prove `http://127.0.0.1:18080` responds.  
4. **SIP proxy env (lab only):** set `WVP_SIP_PROXY_TARGET=127.0.0.1:5061` if still `15061` (one-line `.env` lab fix — only inside this APPLY).  
5. **Stop.** No Weapon / ai_engine / fine-tune edits. No CN zip rebuild.

Operator after PASS: hard refresh `https://192.168.1.38:4438` → Open live on a cam → then Weapon test.

---

## Standing

- Mob disc ≠ fix. Say the APPLY above to repair.  
- Ban other agents from recreate-postgres / overwrite `.env` on this lab without a named APPLY.
