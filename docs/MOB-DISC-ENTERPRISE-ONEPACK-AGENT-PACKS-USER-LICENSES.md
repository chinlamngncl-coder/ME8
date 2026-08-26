# MOB DISC — Enterprise 1-pack: agent packs, user licenses

Locked 2026-08-18.

## Roles

- **You:** say when to pack; issue signed licenses (license-ui / generate-license) after HWID comes back; PASS/FAIL.
- **Installer:** opens Setup (localhost). Hardware ID is **shown automatically**. Sends that ID to Ubitron. Later **uploads** the `.lic` Ubitron sends back (or engineer places `storage/license.lic`). No npm. Same for temp / migration / new hardware.
- **Agent:** packs when told; at pack time prints pack-gather + leak inspect; does not tell client/installer to run print-hwid.

## Product

One folder of software for every client. Modules are all in the pack. License turns paid analytics on or off. Not a PH-KR trial zip.

## Working tree vs freeze

- **ME8** = only place we patch functions.
- **Axiom Enterprise Release** (sibling folder, when user APPLYs a snapshot) = freeze copy of ME8 at a named date, in case ME8 is wrecked. Not a second lab. Not where we keep coding.

## Pack command (when user says pack)

Agent runs `npm run build:ship` / `npm run build:1pack` → `me8-server.exe` + engines. Software reads `storage/license.lic`. Pack does not include the signed customer `.lic` until HWID is known (except lab/pre-issue).

## Manuals (soon)

**sales** / **tech** / **installer** — different books. Installer: Setup shows HWID → send to Ubitron → upload `.lic`. Sales: what is licensed. Tech: CLI print-hwid only if Setup is down.
