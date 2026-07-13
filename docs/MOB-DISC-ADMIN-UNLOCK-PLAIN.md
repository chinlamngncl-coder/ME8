# MOB DISC — Admin unlock (paper plan only)

**Status:** DISC DONE 2026-07-12 — `mob-admin-unlock-disc` · **Build = PARKED** until you say `admin unlock build`  
**Search:** admin unlock, locked out, forgot password, recovery  
**APPLY name:** `mob-admin-unlock-disc`

---

## Plain answer

If the top admin forgets the password or loses the phone authenticator, today recovery is weak.  
**This MOB is paper only.** No product build yet.

---

## What we will build later (short)

| Step | What the user sees |
|------|--------------------|
| 1 | Login: **Forgot password?** |
| 2 | System emails a reset link (needs recovery email set up earlier) |
| 3 | Login: **Can’t use authenticator?** → code to that email |
| 4 | Second admin can reset another user in Settings (already partly there) |
| 5 | At install: print a sealed recovery kit (one-time codes) |

**Not allowed as the normal fix:** editing secret files on the server, restart tricks, empty Settings boxes.

---

## Order when we build

1. Require recovery email at first setup  
2. Forgot password on login  
3. Lost authenticator via email  
4. Print recovery kit  
5. Support unlock code only as last resort  

Detail design (longer): `docs/MOB-DISC-SUPER-ADMIN-RECOVERY.md`

---

## Record

| Item | Result |
|------|--------|
| Disc | Done |
| Code | Not started |
| Next | Say `MOB-APPLY admin unlock build` when ready |
