# MOB DISC — Whole-UI teach-strip Grep (TITLE-ONLY-V2) (2026-08-10)

**Status:** Grep OK. **Eye-check. No code until** `MOB-APPLY UI-COPY-PANEL-INTRO-TITLE-ONLY-V2`  
**Rule:** `.cursorrules` — **WHOLE SOFTWARE** title + controls; no permanent teach strip.  
**Action on APPLY:** add `hidden` to listed `<p class="setup-hint" data-i18n="…">` (keep `data-i18n`/`id`); clear matching `en.json` values to `""`. Words/visibility only.

**Already done (V1):** `evidenceHub.holdsHint` · `evidenceRetention.hint`

---

## HIDE on APPLY (permanent panel / section teach strips)

### Evidence
| Key |
|-----|
| `evidenceHub.overviewHint` |
| `evidenceHub.redactedExportsHint` |
| `opsCases.hint` |
| `caseFiles.hint` |
| `caseFiles.hintSos` |
| `evidenceHub.routeTraceHint` |
| `evidenceDeleteQueue.hint` |
| `evidence.storageTierHint` |
| `evidence.storageSanHint` |
| `evidence.installerNoteSan` |
| `evidence.ftpCredentialsHint` |
| `evidence.storageCatalogHint` |
| `evidence.frStorageHint` *(JS in evidence-storage-ui.js — hide/omit that `<p>`)* |

### Settings / Server / Cloud / Firmware / Groups / USB / Lab
| Key |
|-----|
| `server.setupHint` |
| `server.phase.identityHint` |
| `server.phase.networkingHint` |
| `server.lan.hint` |
| `server.wan.hint` |
| `server.bwcRegisterHint` |
| `server.bindHostHint` |
| `server.phase.accessHint` |
| `server.operatorSectionHint` |
| `server.productionAccessHint` |
| `server.trustReverseProxyHelp` |
| `server.ssl.hint` |
| `server.phase.storageHint` |
| `server.dockStorageHint` |
| `server.typeOnBwcHint` |
| `server.siteTimezoneIntro` |
| `server.commandDisplays.hint` |
| `resilience.hint` |
| `server.phase.diagnosticsHint` |
| `server.readiness.hint` |
| `server.users.permHint` |
| `server.users.hierarchyIntro` |
| `server.myAccount.hint` |
| `server.password.changeHint` |
| `recoveryEmail.myAccountHint` |
| `tech.adminPin.hint` |
| `smtp.hint` |
| `voiceAlerts.config.hint` |
| `hqAlertAudio.hint` |
| `groups.hint` |
| `groups.csvColorHint` |
| `firmware.hint` |
| `firmware.profiles.hint` |
| `firmware.fleet.hint` |
| `firmware.dock.note` |
| `server.bwcTabHint` |
| `server.bwcGroupHint` |
| `server.openVideoWallHint` |
| `server.diagnostics.hint` |
| `tech.activity.note` |
| `usbMaint.hint` |
| `lab.intro` |
| `lab.proxyHint` |
| `cloud.intro` |
| `cloud.verification.hint` |
| `cloud.firewall.hint` |

### Analytics / Conference
| Key |
|-----|
| `conference.lobbyHint` |
| `analytics.verify.hint` |
| `analytics.anpr.liveHint` |
| `analytics.anpr.imageInvestHint` |
| `analytics.anpr.hint` |
| `analytics.anpr.listsHint` |

**Count ~70** static teach strips in `index.html` (+ FR storage hint in JS).

---

### Same class (not always `setup-hint` — hide too)

| Key / node | Class |
|------------|--------|
| `auditTrail.intro` | `at-intro` |
| `displayRoom.intro` | `dr-intro` |
| `displayRoom.presetSosDesc` | `dr-preset-desc` |
| `displayRoom.groupsHint` | `dr-groups-hint` |
| `displayRoom.launchWarn` | `dr-launch-warn` |
| `displayRoom.streamNote` | `dr-note` |
| `bwc.hint` | `config-hint` |

Monitor card one-line labels (`displayRoom.monitor*Hint`) = **KEEP** (identify the monitor, not a page essay). Steps list on Display Room = setup wizard — **KEEP** unless you say hide.

---

## KEEP (not teach-strips)

| Kind | Examples |
|------|----------|
| **Empty / waiting** | `groups.membersEmpty` · `conference.layoutWaiting` · JS empties (`noDevices`, `profiles.empty`, …) |
| **Live status nodes** | `ss-*-status`, `usb-maint-status`, `lab-status`, readiness row details |
| **Field label** | `groups.color` (“Pin colour”) |
| **Modal step copy** | gate password / tech PIN / set-password dialogs (`server.gate.hint`, `tech.provision.hint`, …) |
| **Dock identity wizard** | once-per-site checklist (actionable setup, not every-page caption) — keep unless you say hide |
| **Dynamic deployment hint** | `#ss-deployment-hint` filled by mode |

---

## APPLY

```text
MOB-APPLY UI-COPY-PANEL-INTRO-TITLE-ONLY-V2
```

Agent: hide + clear **HIDE** list only; do not touch KEEP; no CSS/layout redesign; short APPLY disc.
