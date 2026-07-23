# MOB DISC — Next after Settings skip · PTT visual alert

**Date:** 2026-07-23  
**Status:** PAPER — **no APPLY yet**  
**Operator:** Settings UI genre **SKIPPED** (not PASS). Do **not** reopen Settings theme/grid polish. Do **not** ask for Settings re-test.

---

## Closed / skip (this session)

| Item | Status |
|------|--------|
| Settings theme unify / visual overhaul / east-west grid | **SKIPPED** — leave tree as-is; not a ship blocker |
| TLS Track C1–C3 (HTTPS / WSS / same-origin media) | **PASS** (earlier) |
| Trust proxy UI polish | **PASS** (earlier); default OFF |

---

## Recommendation (one path)

**Next MOB:** `MOB-EXECUTE-PTT-VISUAL-ALERT-FULLSTACK-V1`

**Why this, not manuals/Tactical/FR:**  
TLS gate that parked this alert is cleared. Operator already asked for this earlier. It is **one functional genre** (tile pulse on talk), not more Settings CSS. Manuals/pack wait for ship language; Tactical waits for a named Tactical APPLY.

**Do not APPLY** until operator says exactly:

```text
MOB-APPLY PTT-VISUAL-ALERT-FULLSTACK-V1
```

(or `MOB-EXECUTE-PTT-VISUAL-ALERT-FULLSTACK-V1` — same meaning)

---

## Plain English — what it does

Dispatcher watches bodycam video **muted**. Officer presses **physical PTT**. Device does **not** send a clean SIP “button down” — it sends PTT audio UDP with header **`dwCMD == 130`**.

HQ must **see** that camera’s tile pulse (border / glow / mic cue) so they know to unmute. When packets stop (~1s), pulse clears.

---

## How (when APPLY)

| Layer | Job |
|-------|-----|
| Backend | Existing PTT UDP path: on `dwCMD == 130` → emit `ptt_state { deviceId, active: true }`; **~800ms debounce** with no more 130s → `active: false` |
| Frontend | Listen → add/remove class `ptt-incoming-alert` on that device’s wall/CW tile |
| CSS | High-visibility pulse only — no layout rewrite of Settings |

### Strict boundaries

- **Do not** break PTT audio routing or recording  
- **Do not** change SIP call / INVITE logic — passive listen on UDP `130` only  
- **Do not** touch Settings HTML/CSS as part of this MOB  
- **Do not** touch Firmware Gold pin/mirror cores unless named  
- One MOB only — no bundle with FR or Tactical  

### Verify (operator, after APPLY)

1. Hard refresh Ops wall (and Command Wall if used).  
2. Mute tile audio. Press PTT on a live BWC → **that** tile pulses.  
3. Release PTT → pulse clears within ~1s.  
4. Other tiles stay quiet. PTT hear/talk still works.

---

## Still later (not this MOB)

| Track | When |
|-------|------|
| Ship pack / manuals / i18n | When operator says ship / pack |
| Tactical Zone modules 1→4 | Only after named Tactical APPLY |
| FR L1 roster icon / L2 live diagnose | Separate named APPLY if FR still hurts |
| Settings UI | **Skipped — do not reopen** |

---

## Related

- Parked plan: `docs/MOB-DISC-ROADMAP-COMMIT-NOT-DONE-PTT-ALERT-PARKED-20260723.md` §3  
- Ship map: `docs/MOB-DISC-WHATS-LEFT-SHIP-READY-MAP-20260723.md`

---

## One line

**Settings polish abandoned (not PASS). Next disc ready: PTT tile pulse on `dwCMD 130` — apply only when you type `MOB-APPLY PTT-VISUAL-ALERT-FULLSTACK-V1`.**
