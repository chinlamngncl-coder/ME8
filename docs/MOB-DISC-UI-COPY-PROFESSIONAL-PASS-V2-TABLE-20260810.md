# MOB DISC — UI-COPY-PROFESSIONAL-PASS-V2 replace table (2026-08-10)

**Status:** Grep OK received. **Eye-check table below. No code until** `MOB-APPLY UI-COPY-PROFESSIONAL-PASS-V2`  
**Scope:** `en.json` keys with `hint` / `intro` / `Note` / `setupHint` and length ≥ 140 → **one enterprise sentence** each.  
**Hard lock:** words only; no CSS/DOM/scroll/UX; never blank; manuals untouched.  
**Industry:** `MOB-DISC-UI-COPY-ENTERPRISE-INDUSTRY-BEFORE-V2-20260810.md`

Grep count: **33** keys.

---

## Replace table (key → new line)

| Key | Proposed (enterprise) |
|-----|------------------------|
| `conference.layoutHint` | Briefing keeps BWCs on the main stage; extra participants rotate in the strip. |
| `bwc.hint` | Register each body-worn camera with a nickname and its device ID. |
| `evidenceHub.custodyMissingNote` | This file is missing from server storage. Opening the record logs that it is missing. |
| `analytics.bl.qualityHint` | Use a clear, front-facing ID photo with the face filling most of the frame. |
| `displayRoom.streamNote` | One live stream per camera is shared by all operators. |
| `server.deploymentHint.cloud` | Set Device registration IPv4 to the public address BWCs dial, and Operator portal URL to the HTTPS hostname staff use. |
| `evidenceHub.trimHint` | Set In/Out times to create a trimmed clip; the original recording is unchanged. |
| `firmware.dock.note` | Firmware can also be updated on the vendor dock at end of shift. |
| `cloud.intro` | Hosted and hybrid site profile, entitlements, access, and verification. |
| `evidence.ftpCredentialsHint` | Set FTP credentials for cameras and docks; use the same values on each device. |
| `evidence.pathsHint` | Set folders for dock FTP and live capture on this server. |
| `groups.csvColorHint` | CSV colour: name, number 1–10, or hex. Leave blank for automatic colour. |
| `firmware.hint` | View firmware versions. Over-the-air upgrades are supplied by your BWC vendor. |
| `server.dock.envNote` | Dock uploads use FTP on this server. If Stopped, ask IT to enable FTP. |
| `evidenceHub.priorExportsHint` | Download the finished file, or open Second pass to blur more. |
| `server.deploymentHint.lan` | Match static IP, subnet, gateway, and DNS to the host OS; BWCs use Device registration IPv4. |
| `evidenceHub.approvalsHint` | Review export requests and confirm with your password. Share the unlock code in person. |
| `login.hintPassword` | First install uses global123. After you change it, use your new password only. |
| `server.bwcTabHint` | One row per camera: device ID from the unit, nickname for the map and device list. |
| `evidence.frStorageHint` | Choose a local or NAS folder for face-recognition data managed by Mobility. |
| `analytics.bl.hint` | Enroll people on the Watchlist from a clear ID photo. Face matching must be running. |
| `tech.adminPin.hint` | Separate from login. Required for Diagnostics. Re-enter login password to change it. |
| `evidenceHub.redactSecondPassHint` | Draw boxes on leftover faces, then Save. Creates a new export; the previous file stays. |
| `video.wall.hint` | Six live panels. Assign a fixed camera or a rotation per panel. |
| `server.deploymentHint.hybrid` | Operator portal URL is the cloud HTTPS bookmark; Device registration IPv4 is what on-site BWCs reach. |
| `cloud.verification.hint` | When enabled, this site checks in with your verification service on a schedule. |
| `auditTrail.introKillSwitch` | Reboot, shutdown, and approval actions. Default range is the last 30 days. |
| `groups.hint` | Name teams, set pin colour, and add members. Saving updates map pins. |
| `mustChangePassword.hint` | First change uses the install password global123. Choose a new password that meets the rules. |
| `totpEnroll.startHint` | Use an authenticator app. Codes work offline. |
| `firmware.profiles.hint` | Models your vendor registered for over-the-air upgrade are listed here. |
| `tech.provision.hint` | Choose a PIN (12+ characters), different from login. Super admin only. |
| `server.ssl.hint` | Upload the site certificate (.crt) and private key (.key) for on-prem HTTPS. |

---

## Out of this Grep (already V1 or shorter)

Retention / Delete / dock buttons / LAB CONSOLE / I've done this — done in PASS-V1.  
Keys under 140 characters — leave unless a later pass finds bombs.

---

## APPLY

Eye-check the table. Then paste:

```text
MOB-APPLY UI-COPY-PROFESSIONAL-PASS-V2
```

Agent will: apply these 33 string values in `en.json` + mirror HTML defaults where those keys appear → **no** CSS/DOM/JS logic → short APPLY disc.
