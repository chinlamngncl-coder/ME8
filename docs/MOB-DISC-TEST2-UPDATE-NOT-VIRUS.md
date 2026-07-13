# MOB DISC — Test 2 update vs lab “virus” port fight

**Status:** PARKED clarity for ship updates — **not a virus**  
**Date:** 2026-07-12  
**Search:** Test 2 update, client update, UbitronC2 service, dead meat, EADDRINUSE, trial update

---

## Plain answer

**Test 2 is not a virus.**  
What bit you today is **your lab PC**: Windows service **`UbitronC2`** (auto-start) still running, then you also ran **console** ME8 / Test 2 on the **same ports**. Two owners → death loop.

| Thing | Virus? | What it is |
|-------|--------|------------|
| Mobility Test 2 zip | No | Normal trial folder + Start bat |
| `UbitronC2` service on **your** ME8 lab | No | Enterprise auto-start (NSSM) — good for sites, hell if you also Start console |
| Two apps on 3988 | No | Operator mistake / missing stop step |

---

## Will clients be “dead meat” on update?

**Only if we update wrong.** Same rule as Migration-Guide:

### Safe client update (locked)

1. **Stop** old trial completely (`Start` window closed; if they have service: `net stop UbitronC2`).  
2. **Rename** old folder (keep as backup).  
3. Unzip **new** Test pack to a **new** folder.  
4. Install + Start **once**.  
5. Do **not** leave old and new both running.

### What Test 2 ship does today

- Customer path = **Install bat + Start bat** (console), not “secret install virus.”  
- Windows service install is a **separate lab/enterprise script** (`Install-UbitronC2-Service.ps1`) — **not** what every Trial Test 2 client must run.  
- Migration already says: stop old → rename → new folder; stop service if present.

### What would make clients suffer like you

| Bad move | Result |
|----------|--------|
| Start new pack while old still running | `EADDRINUSE` / weird login |
| Install Windows service **and** keep clicking Start bat | Same fight as your lab |
| Unzip new pack **on top of** old while running | Half update, locks, pain |
| Forget `net stop UbitronC2` when service was installed | Ports never free |

### What keeps us alive

| Rule | |
|------|--|
| One running copy only | Always |
| Update = stop → rename old → new folder | Always |
| Service sites | Stop/restart **service**, or uninstall service before console trial packs |
| Lab desk | Prefer console **or** service — never both |
| Ship note to client | Short kill/stop + Migration-Guide (already drafted) |

---

## Lab vs client (why you hurt more)

| Lab (you) | Trial client |
|-----------|----------------|
| ME8 service **Auto** + RESTART-FLEET + Test 2 smoke | Usually one Start bat |
| Elevated / Session 0 hard to kill | Close window + stop service is enough if they follow guide |
| Same PC = product + ship desk | One product folder |

---

## Future update MOB (when we ship Test 2 v2+)

Pack must include (or keep):

1. Clear **Stop** / kill note on README  
2. Migration-Guide step: stop service if any  
3. Prefer **new folder** every trial build  
4. Optional later: update script that stops service + ports, then swaps folder — **not** built yet; Migration steps are the SOP now

---

## Record

| Q | A |
|---|---|
| Is Test 2 a virus? | **No** |
| Why lab dead? | **Service + console** same ports |
| Client update deadly? | **No** if stop → rename → new install |
| Remember | One owner of 3988 |

---

## Related

- `docs/MOB-DISC-ME8-WINDOWS-SERVICE.md`  
- `docs/MOB-DISC-RESTART-EADDRINUSE-ZOMBIE.md`  
- `docs/MOB-DISC-LAB-VS-TEST2-PORT-MERRY-GO-ROUND.md`  
- Migration-Guide in Test 2 manuals  
