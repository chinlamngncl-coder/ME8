# GLOBAL ENGLISH STRINGS AUDIT

**MOB:** `GLOBAL-UI-COPY-EXTRACTION-AND-FIX-V1`
**Date:** 2026-08-26
**Status:** EXTRACT ONLY — do **not** bulk-apply the Proposed column until operator approves.

## Immediate fixes already applied (this MOB)

| Key | Applied text |
|-----|--------------|
| `evidenceHub.navPackageVerify` / `packageVerifyTitle` | Evidence Verification |
| `evidenceHub.packageVerifyServerTitle` | Server Verification |
| `evidenceHub.packageVerifyIdPh` | Enter Package ID |
| `evidenceRetention.modeManual` / `untilManual` | Indefinite (Manual) |
| `evidenceHub.redactedExportsEmpty` / `EmptyZero` | No redacted files found. To create one, select a clip in the Evidence Library and click Redact. |

## How to approve

1. Review **Proposed Enterprise Fix**.
2. Mark rows to change or leave.
3. Then: `MOB-APPLY GLOBAL-ENGLISH-STRINGS-APPLY-V1` (approved rows only).

## Legend

- `— (OK / review)` = heuristic kept current text; still review.
- `(keep empty — teach strip off)` = intentional empty.
- `[SHORTEN…]` = empty/hint too long; needs human rewrite.

## A. `public/locales/en.json` (3361 strings)

| Key | Current Text | Proposed Enterprise Fix |
|-----|--------------|-------------------------|
| `app.documentTitle` | Mobility Axiom | — (OK / review) |
| `audio.gutterAria` | Live audio volume | Live Audio Volume |
| `audio.listenLive` | Listen to live audio | Listen to Live Audio |
| `audio.listenPanel` | Listen to this panel | Listen to This Panel |
| `audio.liveVolume` | Live audio volume | Live Audio Volume |
| `audio.muteLive` | Mute live audio | Mute Live Audio |
| `audio.mutePanel` | Mute this panel | Mute This Panel |
| `audio.panelMutedHint` | Audio (starts muted when live) | Audio (Starts Muted When Live) |
| `auditTrail.apply` | Apply | — (OK / review) |
| `auditTrail.clear` | Clear | — (OK / review) |
| `auditTrail.colAction` | Action | — (OK / review) |
| `auditTrail.colCategory` | Category | — (OK / review) |
| `auditTrail.colIp` | IP | — (OK / review) |
| `auditTrail.colRole` | Role | — (OK / review) |
| `auditTrail.colSummary` | Summary | — (OK / review) |
| `auditTrail.colTarget` | Target | — (OK / review) |
| `auditTrail.colTime` | Time | — (OK / review) |
| `auditTrail.colUser` | User | — (OK / review) |
| `auditTrail.detailRaw` | Stored detail | Stored Detail |
| `auditTrail.detailTitle` | Event Detail | — (OK / review) |
| `auditTrail.empty` | No audit events match your filters. | No Audit Events Match Your Filters. |
| `auditTrail.exportCsv` | Export CSV | — (OK / review) |
| `auditTrail.exportDenied` | Audit export permission required. | Audit Export Permission Required. |
| `auditTrail.filterAction` | Action | — (OK / review) |
| `auditTrail.filterAllActions` | All actions | All Actions |
| `auditTrail.filterAllCategories` | All categories | All Categories |
| `auditTrail.filterCategory` | Category | — (OK / review) |
| `auditTrail.filterFrom` | From | — (OK / review) |
| `auditTrail.filterSearch` | Search | — (OK / review) |
| `auditTrail.filterSearchPh` | Target, action, details... | Target, Action, Details... |
| `auditTrail.filterTo` | To | — (OK / review) |
| `auditTrail.filterUser` | User | — (OK / review) |
| `auditTrail.filterUserPh` | Username | — (OK / review) |
| `auditTrail.intro` |  | (keep empty — teach strip off) |
| `auditTrail.introKillSwitch` | Reboot, shutdown, and approval actions. Default range is the last 30 days. | — (OK / review) |
| `auditTrail.navAllEvents` | All events | All Events |
| `auditTrail.loading` | Loading audit trail... | Loading Audit Trail... |
| `auditTrail.next` | Next | — (OK / review) |
| `auditTrail.noDetail` | No extra detail recorded. | No Extra Detail Recorded. |
| `auditTrail.noPerm` | Audit trail access is not granted for your account. | — (OK / review) |
| `auditTrail.pageOf` | Page {page} of {pages} | — (OK / review) |
| `auditTrail.prev` | Previous | — (OK / review) |
| `auditTrail.presetKillSwitch` | Kill switch report | Kill Switch Report |
| `auditTrail.presetKillSwitchActive` | Kill switch report (last 30 days) | Kill Switch Report (Last 30 Days) |
| `auditTrail.presetGeofence` | Geofence report | Geofence Report |
| `auditTrail.presetGeofenceActive` | Geofence report (last 30 days) | Geofence Report (Last 30 Days) |
| `auditTrail.titleGeofenceReport` | Geofence report | Geofence Report |
| `auditTrail.introGeofenceReport` | Geofence saves, clears, breaches, and re-entries. Default range is the last 30 days - adjust dates or export CSV for compliance review. | — (OK / review) |
| `auditTrail.reportType` | Report type | Report Type |
| `auditTrail.settingsShortcut` | Audit Trail (Kill Switch / Geofencing) | — (OK / review) |
| `auditTrail.presetBannerKillSwitch` | Scope: BWC reboot, shutdown, approvals, denials, and cancellations. Default date range: last 30 days. | — (OK / review) |
| `auditTrail.presetBannerGeofence` | Scope: geofence saves, clears, breaches, and re-entries. Default date range: last 30 days. | — (OK / review) |
| `auditTrail.summaryKillSwitch` | Kill switch report - showing {from}-{to} of {total} events · {store} total in store | — (OK / review) |
| `auditTrail.summaryGeofence` | Geofence report - showing {from}-{to} of {total} events · {store} total in store | — (OK / review) |
| `auditTrail.refresh` | Refresh | — (OK / review) |
| `auditTrail.summary` | Showing {from}-{to} of {total} matching · {store} total in store | — (OK / review) |
| `auditTrail.title` | Audit Trail | — (OK / review) |
| `auditTrail.titleKillSwitch` | Kill switch report | Kill Switch Report |
| `bwc.addRow` | + Add row | + Add Row |
| `bwc.alert.importFailed` | Import failed: {msg} | Import Failed: {msg} |
| `bwc.alert.imported` | Imported {n} BWC(s). Map groups set pin colours. | — (OK / review) |
| `bwc.col.deviceId` | Device ID | — (OK / review) |
| `bwc.col.mapGroup` | Map group | Map Group |
| `bwc.col.nickname` | Officer | — (OK / review) |
| `bwc.col.protocol` | Protocol | — (OK / review) |
| `bwc.col.pttAudioCmd` | PTT audio (HQ->BWC) | PTT Audio (HQ->BWC) |
| `bwc.col.pttDownlink` | HQ hold PTT | HQ Hold PTT |
| `bwc.col.userName` | User | — (OK / review) |
| `bwc.col.pipSecondary` | Assign PIP / Rear Camera | — (OK / review) |
| `bwc.pip.none` | (None) | — (OK / review) |
| `bwc.downloadTemplate` | Download template (CSV) | Download Template (CSV) |
| `bwc.error.csvEmpty` | No device IDs found in CSV | No Device Ids Found in CSV |
| `bwc.error.csvNoDeviceId` | CSV must have a Device ID column | — (OK / review) |
| `bwc.error.needDeviceId` | Add at least one device ID | Add at Least One Device ID |
| `bwc.error.saveFailed` | Could not save BWC list: {msg} | Could Not Save BWC List: {msg} |
| `bwc.exportCsv` | Export CSV | — (OK / review) |
| `bwc.field.deviceId` | Device ID (from BWC) | — (OK / review) |
| `bwc.field.mapGroup` | Map group | Map Group |
| `bwc.field.nickname` | Nickname | — (OK / review) |
| `bwc.field.password` | Password | — (OK / review) |
| `bwc.field.protocol` | Protocol | — (OK / review) |
| `bwc.field.userName` | User name | User Name |
| `bwc.hint` |  | (keep empty — teach strip off) |
| `bwc.importCsv` | Import CSV | — (OK / review) |
| `bwc.placeholder.deviceId` | Long SIP ID - set on the camera, not changed here | — (OK / review) |
| `bwc.placeholder.mapGroup` | e.g. North patrol - same group = same pin colour | — (OK / review) |
| `bwc.placeholder.nickname` | e.g. Officer Lee - shown on map and devices list | — (OK / review) |
| `bwc.rowTitle` | BWC {n} | — (OK / review) |
| `bwc.title` | All BWCs | — (OK / review) |
| `call.end` | End Voice Call | — (OK / review) |
| `call.liveVideo` | ▶ Live video | ▶ Live Video |
| `call.mapCall` | 📞 Call | — (OK / review) |
| `call.stopLive` | ■ Stop live | ■ Stop Live |
| `call.talkToName` | Call {name} (tap) | Call {name} (Tap) |
| `call.title` | Call BWC (Voice Intercom) | — (OK / review) |
| `call.voiceBlockedLive` | Stop live video to use phone. While live: Listen (speaker), hold PTT to talk. | — (OK / review) |
| `call.voiceMap` | ☎ Voice | — (OK / review) |
| `call.voiceOnly` | Voice call (no video) | Voice Call (No Video) |
| `call.whenLive` | Call BWC (when live) | Call BWC (When Live) |
| `caseFiles.addToCase` | Add to case file | Add to Case File |
| `caseFiles.back` | Back to case files | Back to Case Files |
| `caseFiles.colEvidence` | Evidence | — (OK / review) |
| `caseFiles.colId` | Case ID | — (OK / review) |
| `caseFiles.colManage` | Manage | — (OK / review) |
| `caseFiles.colOfficer` | Officer | — (OK / review) |
| `caseFiles.colStatus` | Status | — (OK / review) |
| `caseFiles.colTitle` | Title |  |
| `caseFiles.colUpdated` | Updated | — (OK / review) |
| `caseFiles.createFirstConfirm` | No case files yet. Create one and link this evidence? | — (OK / review) |
| `caseFiles.deleteCase` | Delete | — (OK / review) |
| `caseFiles.deleteConfirm` | Delete case file \"{title}\" ({id})? This cannot be undone. | — (OK / review) |
| `caseFiles.deleteDone` | Case file deleted. Evidence files on storage were not removed. | — (OK / review) |
| `caseFiles.deleteEvidenceKept` | Linked evidence files ({count}) stay in the Evidence Library and on server storage - only this case record and links are removed. | — (OK / review) |
| `caseFiles.deleteModalTitle` | Delete Case File | — (OK / review) |
| `caseFiles.device` | Device / BWC | — (OK / review) |
| `caseFiles.evidenceIdPlaceholder` | Evidence ID from library | Evidence ID from Library |
| `caseFiles.fieldReport` | Field report | Field Report |
| `caseFiles.filterPeriod` | Period | — (OK / review) |
| `caseFiles.filterSearch` | Search | — (OK / review) |
| `caseFiles.filterSearchPh` | Title, officer, case ID... | , Officer, Case ID... |
| `caseFiles.filterStatus` | Status | — (OK / review) |
| `caseFiles.fromSos` | Create from SOS | — (OK / review) |
| `caseFiles.hint` | Write the report and link Library evidence. | — (OK / review) |
| `caseFiles.hintSos` | Ack does not open a Case File. Use Create from SOS when needed. | — (OK / review) |
| `caseFiles.linkDone` | Evidence linked to case file. | Evidence Linked to Case File. |
| `caseFiles.linkEvidence` | Link evidence | Link Evidence |
| `caseFiles.linkedEvidence` | Linked evidence | Linked Evidence |
| `caseFiles.listCount` | case file(s) | Case file(s) |
| `caseFiles.missingEvidence` | Missing from index | Missing from Index |
| `caseFiles.narrative` | Narrative | — (OK / review) |
| `caseFiles.newCase` | New case file | New Case File |
| `caseFiles.newTitleDefault` | Untitled case file | Untitled Case File |
| `caseFiles.newTitlePrompt` | Case file title: | Case File Title: |
| `caseFiles.noCases` | No case files yet. | No Case Files Yet. |
| `caseFiles.noCasesStart` | Use New case file or Create from SOS above to start. | — (OK / review) |
| `caseFiles.noLinkedEvidence` | No evidence linked yet. | No Evidence Linked Yet. |
| `caseFiles.noSosLink` | No SOS link | No SOS Link |
| `caseFiles.officer` | Officer | — (OK / review) |
| `caseFiles.openEvidence` | Open in library | Open in Library |
| `caseFiles.period3Months` | Last 3 months | Last 3 Months |
| `caseFiles.period4Weeks` | Last 4 weeks | Last 4 Weeks |
| `caseFiles.period6Months` | Last 6 months | Last 6 Months |
| `caseFiles.periodAll` | All time | All Time |
| `caseFiles.periodMonth` | This month | This Month |
| `caseFiles.periodWeek` | This week | This Week |
| `caseFiles.periodYear` | Last 12 months | Last 12 Months |
| `caseFiles.save` | Save field report | Save Field Report |
| `caseFiles.saved` | Field report saved. | Field Report Saved. |
| `caseFiles.selectCasePrompt` | Enter case ID to link this evidence: | — (OK / review) |
| `caseFiles.sosLink` | SOS incident | SOS Incident |
| `caseFiles.sosPrompt` | SOS incident ID: | SOS Incident ID: |
| `caseFiles.status` | Status | — (OK / review) |
| `caseFiles.statusAll` | All | — (OK / review) |
| `caseFiles.statusClosed` | Closed | — (OK / review) |
| `caseFiles.statusOpen` | Open | — (OK / review) |
| `caseFiles.title` | Title |  |
| `caseFiles.unlink` | Unlink | — (OK / review) |
| `caseFiles.updated` | Updated | — (OK / review) |
| `centre.activity.action` | Action | — (OK / review) |
| `centre.activity.empty` | No recent activity. | No Recent Activity. |
| `centre.activity.name` | Name | — (OK / review) |
| `centre.activity.target` | Target | — (OK / review) |
| `centre.activity.time` | Time | — (OK / review) |
| `centre.activity.title` | Recent Activity | — (OK / review) |
| `centre.activity.user` | User | — (OK / review) |
| `centre.chart.title` | SOS Trend | — (OK / review) |
| `centre.error.auth` | Super admin login required. | Super Admin Login Required. |
| `centre.error.load` | Failed to load summary. | Failed to Load Summary. |
| `centre.error.loadFailedSub` | Load failed - try Refresh or check permissions. | — (OK / review) |
| `centre.exportChart` | Download chart PNG | Download Chart PNG |
| `centre.exportCsv` | Download CSV | — (OK / review) |
| `centre.kpi.capacity` | Site capacity | Site Capacity |
| `centre.kpi.month` | This Month | — (OK / review) |
| `centre.kpi.offline` | Offline | — (OK / review) |
| `centre.kpi.online` | Online BWC | — (OK / review) |
| `centre.kpi.openSos` | Open SOS | — (OK / review) |
| `centre.kpi.registered` | Registered | — (OK / review) |
| `centre.kpi.sosWeek` | SOS This Week | — (OK / review) |
| `centre.kpi.storage` | Storage Used | — (OK / review) |
| `centre.liveViewers.title` | Live Viewers | — (OK / review) |
| `centre.kpi.today` | Today | — (OK / review) |
| `centre.kpi.uptime` | Server Uptime | — (OK / review) |
| `centre.llm.ask` | Ask | — (OK / review) |
| `centre.llm.checking` | Checking... | — (OK / review) |
| `centre.llm.downloading` | Downloading assistant components (one-time) | Downloading Assistant Components (one-time) |
| `centre.llm.failed` | Could not get an answer. Try again. | — (OK / review) |
| `centre.llm.installing` | Preparing assistant from your install | Preparing Assistant from Your Install |
| `centre.llm.installingPct` | Preparing assistant from your install - {pct}% | — (OK / review) |
| `centre.llm.downloadingPct` | Downloading assistant components - {pct}% | Downloading Assistant Components - {pct}% |
| `centre.llm.loading` | Loading AI into memory... | Loading AI Into Memory... |
| `centre.llm.modelMissing` | AI model not installed | AI Model Not Installed |
| `centre.llm.offline` | Offline | — (OK / review) |
| `centre.llm.online` | Online | — (OK / review) |
| `centre.llm.placeholder` | Ask about devices, SOS, or storage... | Ask About Devices, SOS, or Storage... |
| `centre.llm.preparing` | Preparing AI | — (OK / review) |
| `centre.llm.q1` | How many devices are online right now? | — (OK / review) |
| `centre.llm.q2` | Summarise SOS activity this week. | Summarise SOS Activity This Week. |
| `centre.llm.q3` | Is anything I should worry about? | Is Anything I Should Worry About? |
| `centre.llm.ready` | Online | — (OK / review) |
| `centre.llm.title` | AI Assistant | — (OK / review) |
| `centre.llm.welcome` | Ask about devices online, open SOS alarms, trends, or storage. | — (OK / review) |
| `centre.llm.willDownload` | AI is included with your install - starting up... | — (OK / review) |
| `centre.loading` | Loading centre data... | Loading Centre Data... |
| `centre.nav.dashboard` | ← Dashboard | — (OK / review) |
| `centre.period.daily` | Daily | — (OK / review) |
| `centre.period.monthly` | Monthly | — (OK / review) |
| `centre.period.selectMonth` | Select Month | — (OK / review) |
| `centre.period.weekly` | Weekly | — (OK / review) |
| `centre.period.yearly` | Yearly | — (OK / review) |
| `centre.refresh` | Refresh | — (OK / review) |
| `centre.ring.deviceOnline` | Device online | Device Online |
| `centre.ring.fleetOnline` | Mobility online | Mobility Online |
| `centre.storage.area` | Area | — (OK / review) |
| `centre.storage.share` | Share | — (OK / review) |
| `centre.storage.size` | Size | — (OK / review) |
| `centre.storage.title` | Storage Breakdown | — (OK / review) |
| `centre.svc.active` | Active | — (OK / review) |
| `centre.svc.devices` | Device Link | — (OK / review) |
| `centre.svc.down` | Down | — (OK / review) |
| `centre.svc.fleet` | Mobility link | Mobility Link |
| `centre.svc.ptt` | PTT | — (OK / review) |
| `centre.svc.sip` | SIP listener | SIP Listener |
| `centre.svc.title` | System Health | — (OK / review) |
| `centre.title` | Centre Summary | — (OK / review) |
| `centre.updated` | Updated | — (OK / review) |
| `centre.viewLocal` | View local | View Local |
| `cloud.access.title` | Public Access and Topology | — (OK / review) |
| `cloud.arch.available` | Available | — (OK / review) |
| `cloud.arch.centralConsole` | Central operations console | Central Operations Console |
| `cloud.arch.centralConsoleNote` | Multi-site operations console for system-wide visibility across deployments | — (OK / review) |
| `cloud.arch.dedicatedSite` | Dedicated site deployment | Dedicated Site Deployment |
| `cloud.arch.dedicatedSiteNote` | One organization per server - sovereign data boundary, standard for dispatch and public safety | — (OK / review) |
| `cloud.arch.featureTiers` | Feature tier enforcement | Feature Tier Enforcement |
| `cloud.arch.featureTiersNote` | License entitlements control PTT, evidence, and live capture per organization | — (OK / review) |
| `cloud.arch.planned` | Optional | — (OK / review) |
| `cloud.arch.sharedPlatform` | Shared multi-organization platform | Shared multi-organization Platform |
| `cloud.arch.sharedPlatformNote` | Hosted platform serving multiple independent organizations on one URL | — (OK / review) |
| `cloud.arch.storageQuotas` | Per-organization storage quotas | Per-organization Storage Quotas |
| `cloud.arch.storageQuotasNote` | Central enforcement of per-organization evidence storage limits | — (OK / review) |
| `cloud.arch.title` | Platform Capabilities | — (OK / review) |
| `cloud.arch.verification` | Online entitlement verification | Online Entitlement Verification |
| `cloud.arch.verificationNote` | Available when a verification endpoint is configured | — (OK / review) |
| `cloud.entitlement.active` | Entitlement active | Entitlement Active |
| `cloud.entitlement.cameras` | Body-worn cameras | Body-worn Cameras |
| `cloud.entitlement.installNote` | Install a signed platform entitlement file on this server | — (OK / review) |
| `cloud.entitlement.none` | No organization entitlement loaded | No Organization Entitlement Loaded |
| `cloud.entitlement.operators` | Operator accounts | Operator Accounts |
| `cloud.entitlement.optional` | Entitlement optional | Entitlement Optional |
| `cloud.entitlement.reference` | Entitlement reference | Entitlement Reference |
| `cloud.entitlement.required` | Entitlement required | Entitlement Required |
| `cloud.entitlement.validUntil` | Valid until | Valid Until |
| `cloud.firewall.hint` | Ports for cloud security groups and edge firewalls. Align with Server SIP and media settings. | — (OK / review) |
| `cloud.firewall.note` | Notes | — (OK / review) |
| `cloud.firewall.port` | Port | — (OK / review) |
| `cloud.firewall.service` | Service | — (OK / review) |
| `cloud.firewall.title` | Inbound Services Checklist | — (OK / review) |
| `cloud.intro` |  | (keep empty — teach strip off) |
| `cloud.loadFailed` | Could not load cloud deployment settings | Could Not Load Cloud Deployment Settings |
| `cloud.notes.placeholder` | Handover contact, maintenance window, deployment notes... | Handover Contact, Maintenance Window, Deployment Notes... |
| `cloud.notes.title` | Deployment Notes | — (OK / review) |
| `cloud.ops.checkin` | Site check-in service | Site check-in Service |
| `cloud.ops.checkinHint` | (configure as verification endpoint on each site) | — (OK / review) |
| `cloud.ops.hint` | Vendor toolkit commands run from your operations network, not on customer servers. | — (OK / review) |
| `cloud.ops.noc` | NOC site poll | NOC Site Poll |
| `cloud.ops.portal` | Operations portal | Operations Portal |
| `cloud.ops.registry` | Customer registry template | Customer Registry Template |
| `cloud.ops.title` | Vendor Operations Toolkit | — (OK / review) |
| `cloud.program.p1title` | Dedicated Site Deployment | — (OK / review) |
| `cloud.program.p2title` | Central Operations Verification | — (OK / review) |
| `cloud.program.p3title` | Shared Multi-Organization Platform | — (OK / review) |
| `cloud.program.phase` | Phase | — (OK / review) |
| `cloud.program.proposalLanguage` | Customer proposal summary: | Customer Proposal Summary: |
| `cloud.program.title` | Deployment Options | — (OK / review) |
| `cloud.readiness.title` | Site Configuration Status | — (OK / review) |
| `cloud.save` | Save cloud deployment settings | Save Cloud Deployment Settings |
| `cloud.saveFailed` | Save failed | Save Failed |
| `cloud.saved` | Saved. Restart Mobility if the operator URL or public address changed. | — (OK / review) |
| `cloud.saving` | Saving... | — (OK / review) |
| `cloud.site.contact` | Operations contact email | Operations Contact Email |
| `cloud.site.organization` | Organization name | Organization Name |
| `cloud.site.reference` | Site reference | Site Reference |
| `cloud.site.region` | Region / territory | Region / Territory |
| `cloud.site.title` | Site Identity | — (OK / review) |
| `cloud.verification.complete` | Verification complete | Verification Complete |
| `cloud.verification.enable` | Enable scheduled verification | Enable Scheduled Verification |
| `cloud.verification.endpoint` | Endpoint | — (OK / review) |
| `cloud.verification.failed` | Verification failed | Verification Failed |
| `cloud.verification.hint` |  | (keep empty — teach strip off) |
| `cloud.verification.interval` | Check interval (hours) | Check Interval (Hours) |
| `cloud.verification.lastCheck` | Last check | Last Check |
| `cloud.verification.lastSuccess` | Last success | Last Success |
| `cloud.verification.never` | Awaiting first verification | Awaiting First Verification |
| `cloud.verification.notConfigured` | Not configured - enable scheduled verification and set a verification endpoint. | — (OK / review) |
| `cloud.verification.revoked` | Suspended by verification service | Suspended by Verification Service |
| `cloud.verification.runNow` | Run verification now | Run Verification Now |
| `cloud.verification.running` | Running verification... | Running Verification... |
| `cloud.verification.title` | Central Entitlement Verification | — (OK / review) |
| `cloud.verification.token` | Verification token | Verification Token |
| `cloud.verification.tokenPlaceholder` | Verification service access token | Verification Service Access Token |
| `cloud.verification.tokenSaved` | Saved - leave blank to keep | Saved - Leave Blank to Keep |
| `cloud.verification.url` | Verification endpoint | Verification Endpoint |
| `commandWall.clearWall` | Clear Wall | — (OK / review) |
| `commandWall.clickSpotlight` | Click to enlarge | Click to Enlarge |
| `commandWall.devices` | Devices | — (OK / review) |
| `commandWall.exitSpotlight` | Back to grid | Back to Grid |
| `commandWall.layout` | Layout | — (OK / review) |
| `commandWall.layout1` | 1 | — (OK / review) |
| `commandWall.layout16` | 16 | — (OK / review) |
| `commandWall.layout32` | 32 | — (OK / review) |
| `commandWall.layout4` | 4 | — (OK / review) |
| `commandWall.layout9` | 9 | — (OK / review) |
| `commandWall.layoutFocus` | 1+7 | — (OK / review) |
| `commandWall.loadingRoster` | Loading roster... | Loading Roster... |
| `commandWall.meta` | Drag Devices from the Roster Into Any Panel | — (OK / review) |
| `commandWall.metaPoll` | {online} Online · {slots} Panels · Poll {sec}s | — (OK / review) |
| `commandWall.metaPopout` | Drag devices from the roster into any panel · auto-starts live | — (OK / review) |
| `commandWall.metaRotate` | {online} Online · {slots} Panels · Rotate {sec}s | — (OK / review) |
| `commandWall.metaRotatePaused` |  · paused |  · Paused |
| `commandWall.metaSlots` | {online} Online · {slots} Panels | — (OK / review) |
| `commandWall.pageTitle` | Command Wall - Mobility Axiom | — (OK / review) |
| `commandWall.panel` | Panel {n} | — (OK / review) |
| `commandWall.poll` | Poll | — (OK / review) |
| `commandWall.pollOff` | Off | — (OK / review) |
| `commandWall.pollSec` | {n}s | — (OK / review) |
| `commandWall.pttCommDismiss` | Close PTT comm | Close PTT Comm |
| `commandWall.rotate` | Rotate | — (OK / review) |
| `commandWall.rotateOff` | Off | — (OK / review) |
| `commandWall.rotatePause` | Pause | — (OK / review) |
| `commandWall.rotatePauseHint` | Pause deck rotation | Pause Deck Rotation |
| `commandWall.rotateResume` | Resume | — (OK / review) |
| `commandWall.rotateSec` | {n}s | — (OK / review) |
| `commandWall.tabDisplayRoom` | Control room | Control Room |
| `commandWall.tabLive` | Video wall | Video Wall |
| `commandWall.title` | Command Wall | — (OK / review) |
| `common.cancel` | Cancel | — (OK / review) |
| `common.close` | Close | — (OK / review) |
| `common.delete` | Delete | — (OK / review) |
| `common.continue` | Continue | — (OK / review) |
| `common.edit` | Edit | — (OK / review) |
| `common.exclude` | Exclude | — (OK / review) |
| `common.filterText` | Filter text... | Filter Text... |
| `common.hidePassword` | Hide | — (OK / review) |
| `common.include` | Include | — (OK / review) |
| `common.loading` | Loading... | — (OK / review) |
| `common.next` | Next | — (OK / review) |
| `common.no` | No | — (OK / review) |
| `common.off` | Off | — (OK / review) |
| `common.offline` | Offline | — (OK / review) |
| `common.on` | On | — (OK / review) |
| `common.online` | Online | — (OK / review) |
| `common.password` | Password | — (OK / review) |
| `common.previous` | Previous | — (OK / review) |
| `common.save` | Save | — (OK / review) |
| `common.saving` | Saving... | — (OK / review) |
| `common.verifying` | Verifying... | — (OK / review) |
| `common.showPassword` | Show | — (OK / review) |
| `common.username` | Username | — (OK / review) |
| `common.yes` | Yes | — (OK / review) |
| `conference.allowSpeak` | Allow speak | Allow Speak |
| `conference.bwcAdd` | Add BWC Live Share | — (OK / review) |
| `conference.bwcAddBtn` | Add to Room | — (OK / review) |
| `conference.bwcHead` | Body Cameras (BWC) | — (OK / review) |
| `conference.bwcIngressUnavailable` | Live body-camera share needs the conference service on this server. Ask your IT administrator to start it, then try again. | — (OK / review) |
| `conference.bwcMaxReached` | Maximum {max} BWC shares in this room | — (OK / review) |
| `conference.bwcNoOnline` | No body cameras online - phones and PC join with Join Room below. | — (OK / review) |
| `conference.bwcOnlineOne` | {count} body camera online - select it and tap Add to Room | — (OK / review) |
| `conference.bwcRemove` | Remove BWC Share | — (OK / review) |
| `conference.bwcShare` | BWC Live Share | — (OK / review) |
| `conference.clientNotLoaded` | Video client failed to load - refresh the page | — (OK / review) |
| `conference.connecting` | Connecting to room... | Connecting to Room... |
| `conference.denySpeak` | Deny | — (OK / review) |
| `conference.endRoom` | End Room | — (OK / review) |
| `conference.enterRoom` | Join Room | — (OK / review) |
| `conference.featureBwcIngress` | BWC Ingress | — (OK / review) |
| `conference.featureOfflineEdge` | Offline Edge MCU | — (OK / review) |
| `conference.featureRecording` | Server Recording | — (OK / review) |
| `conference.featureTurn` | TURN Relay | — (OK / review) |
| `conference.floorActionFailed` | Floor action failed | Floor Action Failed |
| `conference.floorAlwaysSpeak` | Host / admin | Host / Admin |
| `conference.floorMutedAll` | Floor: everyone muted | Floor: Everyone Muted |
| `conference.hostTools` | Host Tools | — (OK / review) |
| `conference.joinRoom` | Join with camera | Join with Camera |
| `conference.layoutBadgeBwc` | BWC live | BWC Live |
| `conference.layoutBadgeDocument` | Document | — (OK / review) |
| `conference.layoutBadgeImage` | Image | — (OK / review) |
| `conference.layoutBadgeScreen` | Screen | — (OK / review) |
| `conference.layoutBadgeVideo` | Video | — (OK / review) |
| `conference.layoutBwcConnecting` | Connecting BWC feed... | Connecting BWC Feed... |
| `conference.layoutBwcFailed` | BWC feed failed to connect | BWC Feed Failed to Connect |
| `conference.layoutDocumentOnly` | Please choose a PDF or image document | — (OK / review) |
| `conference.layoutDragHint` | Drag to reorder or drop on shared pane | — (OK / review) |
| `conference.layoutDropShare` | Drop a participant here or share screen, video, document, or image | — (OK / review) |
| `conference.layoutExpand` | Enlarge Share | — (OK / review) |
| `conference.layoutGalleryOnly` | Gallery only | Gallery Only |
| `conference.layoutGalleryPane` | Participants | — (OK / review) |
| `conference.layoutHint` | Briefing keeps BWCs on the main stage; extra participants rotate in the strip. | — (OK / review) |
| `conference.layoutImageOnly` | Please choose an image file | Please Choose an Image File |
| `conference.layoutJoinFirst` | Join the room first | Join the Room First |
| `conference.layoutOverflow` | +{n} more participants (pin or enlarge share to focus) | — (OK / review) |
| `conference.layoutPin` | Spotlight this feed | Spotlight This Feed |
| `conference.layoutPollHeader` | Participants ({visible} of {total}) ⟳ | — (OK / review) |
| `conference.layoutShareDocument` | Share document | Share Document |
| `conference.layoutShareImage` | Share image | Share Image |
| `conference.layoutShareScreen` | Share screen | Share Screen |
| `conference.layoutShareToolbar` | Share | — (OK / review) |
| `conference.layoutShareVideo` | Share video | Share Video |
| `conference.layoutSharedDocument` | Shared document | Shared Document |
| `conference.layoutSharedImage` | Shared image | Shared Image |
| `conference.layoutSharedPane` | Shared content | Shared Content |
| `conference.layoutSharedVideo` | Shared video | Shared Video |
| `conference.layoutShrink` | Exit enlarge | Exit Enlarge |
| `conference.layoutToolbar` | Layout | — (OK / review) |
| `conference.layoutVideoOnly` | Please choose a video file | Please Choose a Video File |
| `conference.layoutWaiting` | Select a room and tap Join Room. | — (OK / review) |
| `conference.emptyStageTitle` | ROOM ACTIVE | ROOM Active |
| `conference.emptyStageBody` | Waiting for participants or BWC streams... | Waiting for Participants or BWC Streams... |
| `conference.leaveRoom` | Leave | — (OK / review) |
| `conference.loading` | Loading... | — (OK / review) |
| `conference.lobbyHint` |  | (keep empty — teach strip off) |
| `conference.personnelTitle` | Active Personnel | — (OK / review) |
| `conference.whoCanJoin` | Who can join | Who Can Join |
| `conference.invite` | Invite | — (OK / review) |
| `conference.inviteFailed` | Invite failed | Invite Failed |
| `conference.marketingBlurb` | Secure multi-party video for dispatch - field phones on mobile networks, server recording, and live body-camera sharing. | — (OK / review) |
| `conference.mcuOff` | Not configured | Not Configured |
| `conference.mcuReady` | Connected | — (OK / review) |
| `conference.mcuStatus` | MCU status | MCU Status |
| `conference.mcuUrl` | WebRTC URL | Webrtc URL |
| `conference.micMuted` | Microphone muted | Microphone Muted |
| `conference.muteAll` | Mute All | — (OK / review) |
| `conference.muteAllDone` | Everyone muted (host can still speak). | Everyone Muted (Host Can Still Speak). |
| `conference.muteAllFailed` | Could not mute everyone. | Could Not Mute Everyone. |
| `conference.noPerm` | Video Conference Access Is Not Granted for Your Account. | — (OK / review) |
| `conference.notConfigured` | Not configured | Not Configured |
| `conference.offline` | Offline | — (OK / review) |
| `conference.online` | Online | — (OK / review) |
| `conference.pickBwc` | Select an Online BWC | — (OK / review) |
| `conference.dockCam` | Cam | — (OK / review) |
| `conference.dockCamOff` | Cam off | Cam Off |
| `conference.dockMic` | Mic | — (OK / review) |
| `conference.dockMicOff` | Mic off | Mic Off |
| `conference.missionFocus` | Focus | — (OK / review) |
| `conference.missionGallery` | Gallery | — (OK / review) |
| `conference.missionDual` | Dual | — (OK / review) |
| `conference.missionOperations` | Operations | — (OK / review) |
| `conference.missionSpeaker` | Speaker | — (OK / review) |
| `conference.pipToggle` | PiP | Pip |
| `conference.play` | Play | — (OK / review) |
| `conference.recBy` | Recorded by | — (OK / review) |
| `conference.recDelete` | Delete | — (OK / review) |
| `conference.recDeleteConfirm` | Delete this recording file from the server? | — (OK / review) |
| `conference.recRoom` | Room | — (OK / review) |
| `conference.recStarted` | Started | — (OK / review) |
| `conference.recordStart` | Record | — (OK / review) |
| `conference.recordStop` | Stop record | Stop Record |
| `conference.recordingOn` | Recording in progress | Recording in Progress |
| `conference.recordingsEmptyTitle` | No Conference Recordings Found | — (OK / review) |
| `conference.recordingsEmptySub` | Join a video room and use 'Record' in the Host Tools. Recordings are stored locally on this server and will be permanently removed if deleted. | [SHORTEN to max 2 sentences — operator review] |
| `conference.recordingsEmptyFilterTitle` | No Matching Recordings | — (OK / review) |
| `conference.recordingsEmptyFilterSub` | Try clearing search or status filters. | Try Clearing Search or Status Filters. |
| `conference.recStatus` | Status | — (OK / review) |
| `conference.recActions` | Actions | — (OK / review) |
| `conference.recPushConfirm` | Copy selected conference recordings into the Evidence Library? | — (OK / review) |
| `conference.recPushDone` | Pushed recordings to Evidence. | Pushed Recordings to Evidence. |
| `conference.recBulkPurgeConfirm` | Permanently delete the selected conference recordings? This cannot be undone. | — (OK / review) |
| `conference.recordingsEmpty` | No recordings yet. Join a room, then use Record in Host Tools. | — (OK / review) |
| `conference.recordingsPathHint` | Recordings are stored on this server. Delete permanently removes the file. | — (OK / review) |
| `conference.requestFailed` | Request failed - try again or ask your administrator to restart Mobility. | — (OK / review) |
| `conference.requestSpeak` | Request to speak | Request to Speak |
| `conference.revokeSpeak` | Revoke | — (OK / review) |
| `conference.room1` | Room 1 | — (OK / review) |
| `conference.room2` | Room 2 | — (OK / review) |
| `conference.room3` | Room 3 | — (OK / review) |
| `conference.roomActive` | Active | — (OK / review) |
| `conference.roomIdle` | Idle | — (OK / review) |
| `conference.roomNotOpen` | Room is not open yet - ask a host to start it. | — (OK / review) |
| `conference.roomOpenHint` | Room is open - tap Join Room to enter with your camera. | — (OK / review) |
| `conference.rosterEmpty` | No officers in lobby yet. | No Officers in Lobby Yet. |
| `conference.rosterHint` | Officers in the room are highlighted. Mobile joins appear when they tap Join Room on the app. | — (OK / review) |
| `conference.rosterInRoom` | In room | In Room |
| `conference.rosterTitle` | Who Can Join | — (OK / review) |
| `conference.serverNotReady` | Conference is unavailable. Ask your administrator to restart Mobility, then refresh this page. | — (OK / review) |
| `conference.settingsApiKey` | API key | API Key |
| `conference.settingsApiSecret` | API secret | API Secret |
| `conference.settingsApiUrl` | Video API URL (server-side) | — (OK / review) |
| `conference.settingsClientUrl` | Client video URL | Client Video URL |
| `conference.settingsCredentialsServerNote` | Video service credentials are configured on the server by your IT administrator. Operators only set addresses phones can reach. | — (OK / review) |
| `conference.settingsDeployMode` | Deploy mode | Deploy Mode |
| `conference.settingsDetectFail` | Open Mobility using your server LAN IP (not localhost), then try again. | — (OK / review) |
| `conference.settingsDetectHost` | Use this browser address | Use This Browser Address |
| `conference.settingsEdge` | Offline edge URL (optional) | Offline Edge URL (Optional) |
| `conference.settingsFirewall` | Firewall ports | Firewall Ports |
| `conference.settingsFormIntro` | Set your site address and phone video URL below, then tap Test connection and Save. | — (OK / review) |
| `conference.settingsFormIntroLan` | Set your LAN address and phone video URL below. API credentials stay on the server - you do not need to enter them. | — (OK / review) |
| `conference.settingsIceIp` | Media node IP | Media Node IP |
| `conference.settingsMcuLabel` | Video Engine | — (OK / review) |
| `conference.settingsMcuName` | Video conference service | Video Conference Service |
| `conference.settingsModeCloud` | Cloud video service | Cloud Video Service |
| `conference.settingsModeCloudHint` | Use your cloud project URL and API keys. Set the public secure WebSocket URL from your provider dashboard. | — (OK / review) |
| `conference.settingsModeLanDocker` | On this server | On This Server |
| `conference.settingsModeLanHint` | Phones on your LAN or VPN must reach this server. Set site host and media IP to that address - not 127.0.0.1. | — (OK / review) |
| `conference.settingsModeRemote` | Remote video server | Remote Video Server |
| `conference.settingsModeRemoteHint` | Video runs on another host. Set the API URL to that server; the phone URL must be what browsers and phones can reach. | — (OK / review) |
| `conference.settingsMuteAllOnStart` | Start meetings muted | Start Meetings Muted |
| `conference.settingsMuteAllOnStartHint` | When enabled, opening Room 1, 2, or 3 applies mute-all automatically. Host and super admins can still speak; others request the floor. | — (OK / review) |
| `conference.settingsProxyNote` | Proxy / NAT notes (optional) | Proxy / NAT Notes (Optional) |
| `conference.settingsPublicPort` | Signaling port | Signaling Port |
| `conference.settingsPublicWs` | Phone / browser video URL | Phone / Browser Video URL |
| `conference.settingsPublicWsHint` | WebSocket URL for field phones and browsers - e.g. ws://192.168.1.38:7880 | — (OK / review) |
| `conference.settingsReadonly` | View only - ask a conference host or super admin to change these settings. | — (OK / review) |
| `conference.settingsReady.clientUrl` | Phone / browser URL (not localhost) | Phone / Browser URL (Not Localhost) |
| `conference.settingsReady.iceIp` | Media node IP set | Media Node IP Set |
| `conference.settingsReady.mcu` | Video service reachable | Video Service Reachable |
| `conference.settingsReady.turn` | TURN relay configured | TURN Relay Configured |
| `conference.settingsReady.wss` | Secure WSS for internet clients | Secure WSS for Internet Clients |
| `conference.settingsReadyInternetNo` | Internet joins need WSS, public media path or TURN, and open firewall UDP | — (OK / review) |
| `conference.settingsReadyInternetOk` | Ready for internet joins (home / LTE) | — (OK / review) |
| `conference.settingsReadyLanNo` | Complete the items above for LAN / VPN joins | — (OK / review) |
| `conference.settingsReadyLanOk` | Ready for LAN / VPN joins | Ready for LAN / VPN Joins |
| `conference.settingsReadyTitle` | Join Readiness | — (OK / review) |
| `conference.settingsRestartNote` | After saving, restart Mobility if phones still show the old video address. | — (OK / review) |
| `conference.settingsSave` | Save settings | Save Settings |
| `conference.settingsSaved` | Video conference settings saved. | Video Conference Settings Saved. |
| `conference.settingsSiteHost` | Site host (LAN IP or DNS) | Site Host (LAN IP or DNS) |
| `conference.settingsSiteHostHint` | Address phones and remote browsers use to reach Mobility - not 127.0.0.1. | — (OK / review) |
| `conference.settingsStatus` | Current status | Current Status |
| `conference.settingsTest` | Test connection | Test Connection |
| `conference.settingsTestFail` | Connection test failed | Connection Test Failed |
| `conference.settingsTestOk` | Video service reachable and API keys accepted. | — (OK / review) |
| `conference.settingsTitle` | Conference Service | — (OK / review) |
| `conference.settingsTurn` | TURN relay URL (optional) | TURN Relay URL (Optional) |
| `conference.setupDoc` | Deployment Guide | — (OK / review) |
| `conference.setupHint` | Video conference is not set up on this server yet. Ask your IT administrator to configure the conference service. | — (OK / review) |
| `conference.setupOpenSettings` | Open Settings | — (OK / review) |
| `conference.setupPublicUrl` | Field phones cannot use localhost - set your LAN WebRTC URL before they join. | — (OK / review) |
| `conference.setupRequired` | Video conference MCU is not configured on this server. | — (OK / review) |
| `conference.speakNotAllowed` | Host has not allowed you to speak yet - tap Request to speak | — (OK / review) |
| `conference.speakRequested` | Speak request sent - waiting for host | — (OK / review) |
| `conference.startRoom` | Start room | Start Room |
| `conference.tabLive` | Live | — (OK / review) |
| `conference.tabLobby` | Lobby | — (OK / review) |
| `conference.tabRecordings` | Recordings | — (OK / review) |
| `conference.tabSettings` | Settings | — (OK / review) |
| `conference.toggleMic` | Toggle microphone | Toggle Microphone |
| `conference.viewBriefing` | Briefing | — (OK / review) |
| `conference.viewFocus` | Focus | — (OK / review) |
| `conference.viewGallery` | Gallery | — (OK / review) |
| `conference.viewSideBySide` | Side-by-side | — (OK / review) |
| `conference.viewSpeaker` | Speaker | — (OK / review) |
| `conference.viewTwoUp` | 2-up | — (OK / review) |
| `conference.you` | You | — (OK / review) |
| `displayRoom.autoScreens` | Place windows on extended displays automatically | Place Windows on Extended Displays Automatically |
| `displayRoom.autoScreensHint` | When checked, Chrome may ask to manage windows on other screens. If place fails, drag the window manually and press F11. | — (OK / review) |
| `displayRoom.autoScreensUnsupported` | This browser cannot auto-place windows. Leave the box unchecked and drag each window to the correct monitor, then F11. | — (OK / review) |
| `displayRoom.placeFailNoApi` | {monitor} window opened - this browser cannot auto-place. Drag it to the correct monitor and press F11. | — (OK / review) |
| `displayRoom.placeFailNoApiLaunch` | Windows opened - this browser cannot auto-place. Drag each to monitors 2-4 and press F11. | — (OK / review) |
| `displayRoom.placeFailDenied` | {monitor} window opened - screen permission denied or unavailable. Allow window management if prompted, or drag manually and press F11. | — (OK / review) |
| `displayRoom.placeFailNoScreen` | {monitor} window opened - no matching extended display. Connect/extend the monitor, or drag manually and press F11. | — (OK / review) |
| `displayRoom.placeFailClosed` | {monitor} window closed before it could be placed. | — (OK / review) |
| `displayRoom.placeFailManual` | {monitor} window opened - could not move it automatically. Drag to the correct monitor and press F11. | — (OK / review) |
| `displayRoom.groupsHint` |  | (keep empty — teach strip off) |
| `displayRoom.groupsLabel` | TV Wall - Dispatch Groups | — (OK / review) |
| `displayRoom.intro` |  | (keep empty — teach strip off) |
| `displayRoom.launchAll` | Open all monitors | Open All Monitors |
| `displayRoom.launchOk` | Windows opened - drag each to displays 2-4 and press F11. | — (OK / review) |
| `displayRoom.launchOkManual` | Monitor windows opened (empty wall) - drag to displays 2-4 if needed, then F11. Drag devices to go live. | — (OK / review) |
| `displayRoom.launchOkPlaced` | Placed {n} window(s) on extended displays. Press F11 on each for fullscreen. | — (OK / review) |
| `displayRoom.launchWarn` |  | (keep empty — teach strip off) |
| `displayRoom.launching` | Opening monitor windows... | Opening Monitor Windows... |
| `displayRoom.monitor1Hint` | Operations - map, SOS, PTT, devices | Operations - Map, SOS, PTT, Devices |
| `displayRoom.monitor1Num` | Monitor 1 | — (OK / review) |
| `displayRoom.monitor1Title` | Operator Desk | — (OK / review) |
| `displayRoom.monitor2Hint` | Live multi-panel video wall - opens in a new window on monitor 2. | — (OK / review) |
| `displayRoom.monitor2Num` | Monitor 2 | — (OK / review) |
| `displayRoom.monitor2Title` | Wall Monitor | — (OK / review) |
| `displayRoom.monitor3Hint` | Map mirror - opens in a new window on monitor 3. | — (OK / review) |
| `displayRoom.monitor3HintAnalytics` | Face watch pop-out - FR watch tiles; map stays on Operations. | — (OK / review) |
| `displayRoom.monitor3Num` | Monitor 3 | — (OK / review) |
| `displayRoom.monitor3Title` | Map Monitor | — (OK / review) |
| `displayRoom.monitor3TitleAnalytics` | Face watch monitor | Face Watch Monitor |
| `displayRoom.monitor4Hint` | Centre summary status board - opens in a new window on monitor 4. | — (OK / review) |
| `displayRoom.monitor4Num` | Monitor 4 | — (OK / review) |
| `displayRoom.monitor4Title` | Status Board | — (OK / review) |
| `displayRoom.noGroups` | No dispatch groups - create them under Server -> Map groups. | — (OK / review) |
| `displayRoom.openCentre` | Open on monitor 4 | Open on Monitor 4 |
| `displayRoom.openAnalytics` | Open face watch on monitor 3 | Open Face Watch on Monitor 3 |
| `displayRoom.openMap` | Open map on monitor 3 | Open Map on Monitor 3 |
| `displayRoom.openOps` | Use this window for Operations | Use This Window for Operations |
| `displayRoom.openWall` | Open video wall | Open Video Wall |
| `displayRoom.openWallMonitor2` | Open video wall on monitor 2 | Open Video Wall on Monitor 2 |
| `displayRoom.showWall` | Use Video wall tab (this window) | Use Video Wall Tab (This Window) |
| `displayRoom.wallInTabFail` | Could not open Video wall. Use the Video wall tab above, or reload. | — (OK / review) |
| `displayRoom.wallInTabOk` | Use the Video wall tab above for a same-window preview. | — (OK / review) |
| `displayRoom.opsHint` | Operations active on this workstation. | Operations Active on This Workstation. |
| `displayRoom.popupBlocked` | Pop-up blocked for {list}. Use the blocked-pop-up icon in the address bar, choose Always allow for this site, then click again. | — (OK / review) |
| `displayRoom.popupOpenedWall` | Empty video wall opened - drag devices from the roster to go live. Close the window to clear this message. | — (OK / review) |
| `displayRoom.popupOpenedPlaced` | {monitor} window placed on extended display - press F11 for fullscreen. | — (OK / review) |
| `displayRoom.popupOpenedAnalytics` | Face watch window opened - check the taskbar or move it to monitor 3. | — (OK / review) |
| `displayRoom.popupOpenedMap` | Map window opened - check the taskbar or move it to monitor 3. | — (OK / review) |
| `displayRoom.popupOpenedCentre` | Status board window opened - check the taskbar or move it to monitor 4. | — (OK / review) |
| `displayRoom.presetSosDesc` |  | (keep empty — teach strip off) |
| `displayRoom.presetSosTitle` | Open Monitors | — (OK / review) |
| `displayRoom.selectGroup` | Select at least one dispatch group for the TV wall. | — (OK / review) |
| `displayRoom.step1` | Windows -> Display -> Extend these displays (HDMI/USB-C adapters as needed). | — (OK / review) |
| `displayRoom.step2` | Click Open all monitors (or each monitor button), drag windows to displays 2-4, then F11. Drag devices onto the wall to go live. | — (OK / review) |
| `displayRoom.step3` | Keep monitor 1 on Operations - all SOS acknowledge and PTT control stays there. | — (OK / review) |
| `displayRoom.step4` | Allow pop-ups if the browser blocks new windows. | — (OK / review) |
| `displayRoom.streamNote` |  | (keep empty — teach strip off) |
| `errors.accountExpired` | This account has expired. Contact your administrator. | — (OK / review) |
| `errors.accountNotActive` | This account is not active yet. Check your sign-in from date. | — (OK / review) |
| `errors.auditExportRequired` | Audit export permission is required. | Audit Export Permission Is Required. |
| `errors.auditRequired` | Audit trail access is required. | Audit Trail Access Is Required. |
| `errors.camIdRequired` | Camera selection is required. | Camera Selection Is Required. |
| `errors.caseFileNotFound` | Case file not found. | Case File Not Found. |
| `errors.deviceIdRequired` | Device ID is required. | Device ID Is Required. |
| `errors.deviceNotFound` | Device not found. | Device Not Found. |
| `errors.dockAdminRequired` | Dock administration permission is required. | Dock Administration Permission Is Required. |
| `errors.evidenceDownloadRequired` | Evidence download permission is required. | Evidence Download Permission Is Required. |
| `errors.evidenceFileNotFound` | Evidence file not found. | Evidence File Not Found. |
| `errors.evidenceViewRequired` | Evidence access permission is required. | Evidence Access Permission Is Required. |
| `errors.generic` | Something went wrong. Try again or contact your IT administrator. | — (OK / review) |
| `errors.geofenceClearRequired` | Provide geofence data or clear the existing geofence. | — (OK / review) |
| `errors.geofenceNotPermitted` | Geofence control is not permitted for your account. | — (OK / review) |
| `errors.groupNoDevices` | This group has no devices with IDs. | — (OK / review) |
| `errors.groupNotFound` | Group not found. | Group Not Found. |
| `errors.incidentNotFound` | Incident folder not found. | Incident Folder Not Found. |
| `errors.incorrectPin` | Incorrect PIN. | — (OK / review) |
| `errors.invalidGeofence` | Geofence data is not valid. | Geofence Data Is Not Valid. |
| `errors.mapControlRequired` | Map remote control permission is required. | Map Remote Control Permission Is Required. |
| `errors.noGeofence` | No geofence is set for this device. | — (OK / review) |
| `errors.operationOverlayCloseRequired` | Operation overlay close permission is required. | Operation Overlay Close Permission Is Required. |
| `errors.operationOverlayEditRequired` | Operation overlay edit permission is required. | Operation Overlay Edit Permission Is Required. |
| `errors.operationOverlayRequired` | Operation overlay access is required. | Operation Overlay Access Is Required. |
| `errors.orgSignInRequired` | Local sign-in is disabled. Use your organization account. | — (OK / review) |
| `auth.passwordPolicy.hint` | Min {min} characters · upper, lower, number, symbol · type example: {example} | — (OK / review) |
| `errors.passwordChangeRequired` | Change your password before using the dashboard. | — (OK / review) |
| `errors.totpEnrollRequired` | Set up your authenticator before using the dashboard. | — (OK / review) |
| `errors.passwordConfirmRequired` | Enter your password to confirm this change. | — (OK / review) |
| `errors.passwordWrong` | Wrong password. Try again. | — (OK / review) |
| `errors.permissionDenied` | You do not have permission for this action. | — (OK / review) |
| `errors.pttDisabled` | Push-to-talk is not enabled on this server. | — (OK / review) |
| `errors.pttNeedTwoUnits` | Select at least two online units for group push-to-talk. | — (OK / review) |
| `errors.pttSelectUnits` | Select a map group or at least two online units. | — (OK / review) |
| `errors.pttUnitBusy` | This unit is already on the push-to-talk team. | — (OK / review) |
| `errors.runbookNotFound` | Runbook not found. | Runbook Not Found. |
| `errors.signInFailed` | Invalid user or password. | Invalid User or Password. |
| `errors.storageMountNotFound` | Mount folder not found on this server. Ask IT to connect shared storage first. | — (OK / review) |
| `errors.storageNasRequired` | Shared storage path is required when using network archive. | — (OK / review) |
| `errors.superAdminPasswordRequired` | Your super admin password is required. | Your Super Admin Password Is Required. |
| `errors.unauthorized` | Sign in required. | Sign in Required. |
| `errors.usbWindowsOnly` | USB maintenance requires Windows on the dispatch PC. | — (OK / review) |
| `errors.userNotFound` | User not found. | User Not Found. |
| `errors.userExists` | That username is already in use. Pick another name or edit the existing row. | — (OK / review) |
| `errors.licenseOperatorLimit` | License limit reached for Operators. | License Limit Reached for Operators. |
| `errors.licenseSuperAdminLimit` | License limit reached for Super Admins. | License Limit Reached for Super Admins. |
| `evidence.archiveLocal` | Local server disk | Local Server Disk |
| `evidence.archiveNas` | NAS / SAN mount | NAS / SAN Mount |
| `evidence.archiveNetwork` | IP SAN / NAS (network mount) | IP SAN / NAS (Network Mount) |
| `evidence.archivePrimary` | Primary archive | Primary Archive |
| `evidence.catalogErrorBusy` | The evidence index is in use. Wait a moment and try again. | — (OK / review) |
| `evidence.catalogErrorDamaged` | The evidence index on this server could not be read. Contact your IT administrator to restore from backup or rebuild the index from archived files. | — (OK / review) |
| `evidence.catalogErrorGeneric` | The evidence index could not be accessed. Contact your IT administrator. | — (OK / review) |
| `evidence.catalogErrorNotReady` | The evidence index is still starting. Refresh in a moment. | — (OK / review) |
| `evidence.catalogErrorUnavailable` | The evidence index is not available. Contact your IT administrator. | — (OK / review) |
| `evidence.colFile` | File | — (OK / review) |
| `evidence.colId` | Evidence ID | — (OK / review) |
| `evidence.colOfficer` | Officer | — (OK / review) |
| `evidence.colSource` | Source | — (OK / review) |
| `evidence.colUploaded` | Uploaded | — (OK / review) |
| `evidence.dockFtpTarget` | Dock FTP Target (IT Reference) | — (OK / review) |
| `evidence.dockTitle` | Evidence Management | — (OK / review) |
| `evidence.installerNote` | Ask IT to mount shared storage on this server, set the path above, then point dock uploads to the same folder. | — (OK / review) |
| `evidence.installerNoteSan` | Ask IT to mount the SAN volume on this server, then enter the folder path. | — (OK / review) |
| `evidence.liveCaptureActive` | Active live capture folder | Active Live Capture Folder |
| `evidence.liveCaptureAutoOnSos` | Auto-record server video on SOS alarm | Auto-record Server Video on SOS Alarm |
| `evidence.liveCaptureEnabled` | Enable server live capture | Enable Server Live Capture |
| `evidence.liveCapturePath` | Live capture folder | Live Capture Folder |
| `evidence.nasMountHint` | Before use: mount shared NAS storage on this Windows/Linux host, then point FTP upload or live capture at that mount. | — (OK / review) |
| `evidence.nasMountPath` | Mount path on this server | Mount Path on This Server |
| `evidence.pathMissing` | Folder missing on server | Folder Missing on Server |
| `evidence.pathValid` | Folder OK | — (OK / review) |
| `evidence.pathsHint` | Set folders for dock FTP and live capture on this server. | — (OK / review) |
| `evidence.pathsTitle` | Evidence Storage Paths | — (OK / review) |
| `evidence.refresh` | Refresh | — (OK / review) |
| `evidence.savePaths` | Save storage | Save Storage |
| `evidence.sosServerRecordTitle` | BWC (SOS Recording on Server) | — (OK / review) |
| `evidence.storageAdminRequired` | Super admin required to change storage. | Super Admin Required to Change Storage. |
| `evidence.storageApplyRecommended` | Apply SAN paths | Apply SAN Paths |
| `evidence.storageBrowse` | Browse... | — (OK / review) |
| `evidence.storageBrowseRoots` | Select a disk or folder | Select a Disk or Folder |
| `evidence.storageBrowseSelect` | Use this folder | Use This Folder |
| `evidence.storageBrowseTitle` | Browse Server Folder | — (OK / review) |
| `evidence.storageBrowseUp` | Up | — (OK / review) |
| `evidence.storageCatalogHint` |  | (keep empty — teach strip off) |
| `evidence.storageCatalogPath` | Stored on this server (evidence index) | Stored on This Server (Evidence Index) |
| `evidence.storageCatalogTitle` | Evidence Index | — (OK / review) |
| `evidence.storageFlowArchive` | Video archive | Video Archive |
| `evidence.storageFlowCatalog` | Evidence index | Evidence Index |
| `evidence.storageFlowDock` | Dock / BWC | — (OK / review) |
| `evidence.storageFlowFtp` | FTP upload | FTP Upload |
| `evidence.storageFtpStatus` | FTP folder | FTP Folder |
| `evidence.storageIngestTitle` | Upload Paths | — (OK / review) |
| `evidence.storageMountStatus` | Mount status | Mount Status |
| `evidence.storageOpenFtp` | Open FTP folder | Open FTP Folder |
| `evidence.storageRecFtp` | Recommended FTP folder | Recommended FTP Folder |
| `evidence.storageRecLive` | Recommended live capture | Recommended Live Capture |
| `evidence.storageSanHint` | Enter the folder after IT mounts the SAN volume on this server. | — (OK / review) |
| `evidence.storageSanTitle` | IP SAN / NAS Mount | — (OK / review) |
| `evidence.storageSaved` | Storage settings saved. | Storage Settings Saved. |
| `evidence.ftpCredentialsTitle` | FTP Upload Service | — (OK / review) |
| `evidence.ftpCredentialsHint` | Same FTP username and password on each camera and dock. | — (OK / review) |
| `evidence.ftpEnabled` | Enable FTP ingest | Enable FTP Ingest |
| `evidence.ftpPassword` | FTP password | FTP Password |
| `evidence.ftpPasswordPlaceholder` | Leave blank to keep current password | Leave Blank to Keep Current Password |
| `evidence.ftpPasswordStatus` | Password status | Password Status |
| `evidence.ftpPasswordSet` | Configured | — (OK / review) |
| `evidence.ftpPasswordMissing` | Not set | Not Set |
| `evidence.ftpServiceStarting` | Enabled - check listen | Enabled - Check Listen |
| `evidence.ftpServiceNeedsPassword` | Password required | Password Required |
| `evidence.ftpSave` | Save FTP settings | Save FTP Settings |
| `evidence.ftpSaved` | FTP settings saved. | FTP Settings Saved. |
| `evidence.ftpSavedRestarted` | FTP settings saved and service restarted. | FTP Settings Saved and Service Restarted. |
| `smtp.title` | Outbound Email (SMTP) | — (OK / review) |
| `smtp.hint` | Outbound mail for password reset and recovery. Password is stored in the server vault only. | — (OK / review) |
| `smtp.host` | SMTP host | SMTP Host |
| `smtp.port` | Port | — (OK / review) |
| `smtp.secure` | Security | — (OK / review) |
| `smtp.secureStarttls` | STARTTLS (587) | Starttls (587) |
| `smtp.secureSsl` | SSL/TLS (465) | — (OK / review) |
| `smtp.secureNone` | None (plain) | None (Plain) |
| `smtp.fromName` | From display name | From Display Name |
| `smtp.fromEmail` | From email address | From Email Address |
| `smtp.user` | Username (optional) | Username (Optional) |
| `smtp.password` | SMTP password | SMTP Password |
| `smtp.passwordPlaceholder` | Leave blank to keep current password | Leave Blank to Keep Current Password |
| `smtp.passwordStatus` | Password | — (OK / review) |
| `smtp.passwordSet` | Configured | — (OK / review) |
| `smtp.passwordMissing` | Not set | Not Set |
| `smtp.lastTestStatus` | Last test | Last Test |
| `smtp.lastTestNever` | Never tested | Never Tested |
| `smtp.lastTestOk` | OK at {time} | — (OK / review) |
| `smtp.lastTestFail` | Failed at {time} | — (OK / review) |
| `smtp.testTo` | Send test email to | Send Test Email to |
| `smtp.testToRequired` | Enter a test recipient email address. | Enter a Test Recipient Email Address. |
| `smtp.save` | Save SMTP settings | Save SMTP Settings |
| `smtp.sendTest` | Send test email | Send Test Email |
| `smtp.saved` | SMTP settings saved. | SMTP Settings Saved. |
| `smtp.saveFailed` | Could not save SMTP settings. | Could Not Save SMTP Settings. |
| `smtp.sendingTest` | Sending test email... | Sending Test Email... |
| `smtp.testSent` | Test email sent to {to}. | Test Email Sent to {to}. |
| `smtp.testFailed` | Test email failed. | Test Email Failed. |
| `smtp.adminRequired` | Super admin access is required to change SMTP settings. | — (OK / review) |
| `recoveryEmail.title` | Recovery Email | — (OK / review) |
| `recoveryEmail.documentTitle` | Recovery Email - Mobility Axiom | — (OK / review) |
| `recoveryEmail.setupHint` | Add an email for password reset and lost-authenticator recovery. We send a one-time link to verify it. | — (OK / review) |
| `recoveryEmail.myAccountHint` | Used for password reset and authenticator recovery. Changing it requires re-verification. | — (OK / review) |
| `recoveryEmail.address` | Recovery email address | Recovery Email Address |
| `recoveryEmail.sendVerify` | Send verification email | Send Verification Email |
| `recoveryEmail.resend` | Resend verification email | Resend Verification Email |
| `recoveryEmail.continueDashboard` | Continue to dashboard | Continue to Dashboard |
| `recoveryEmail.sendFailed` | Could not send verification email. | Could Not Send Verification Email. |
| `recoveryEmail.sent` | Verification email sent to {email}. Open the link within 30 minutes. | — (OK / review) |
| `recoveryEmail.resent` | Verification email sent again to {email}. | Verification Email Sent Again to {email}. |
| `recoveryEmail.pendingHint` | Check your inbox at {email} and open the verification link. | — (OK / review) |
| `recoveryEmail.smtpRequired` | Outbound email is not configured yet. A super admin must set up SMTP under Settings -> Server Config -> Dashboard Authentication. | — (OK / review) |
| `recoveryEmail.verifiedBadge` | Verified | — (OK / review) |
| `recoveryEmail.verifiedAt` | {email} is verified for recovery. | {email} Is Verified for Recovery. |
| `recoveryEmail.verifiedStatus` | Verified: {email} | — (OK / review) |
| `recoveryEmail.pendingStatus` | Pending verification: {email} | Pending Verification: {email} |
| `recoveryEmail.notSet` | Not set - add an email and send verification. | — (OK / review) |
| `recoveryEmail.verifyTitle` | Verify Recovery Email | — (OK / review) |
| `recoveryEmail.verifyDocumentTitle` | Verify Recovery Email - Mobility Axiom | — (OK / review) |
| `recoveryEmail.verifyWorking` | Verifying... | — (OK / review) |
| `recoveryEmail.verifyInvalid` | This verification link is invalid or expired. | — (OK / review) |
| `recoveryEmail.verifySuccess` | Recovery email verified: {email}. You can sign in to the dashboard. | — (OK / review) |
| `recoveryEmail.verifyServerError` | Could not reach the server. Try again later. | — (OK / review) |
| `recoveryEmail.backToSignIn` | Back to sign in | Back to Sign in |
| `recoveryEmail.continueSignIn` | Continue to sign in | Continue to Sign in |
| `errors.recoveryEmailRequired` | Recovery email verification is required before using the dashboard. | — (OK / review) |
| `evidence.storageScanCatalog` | Scan FTP for evidence | Scan FTP for Evidence |
| `evidence.storageScanDone` | FTP scan indexed {n} file(s) in the evidence index. | — (OK / review) |
| `evidence.storageStatusMissing` | Not found | Not Found |
| `evidence.storageStatusMounted` | Mounted | — (OK / review) |
| `evidence.storageStatusOk` | Ready | — (OK / review) |
| `evidence.storageStatusReadOnly` | Read-only | — (OK / review) |
| `evidence.storageTestDone` | Path test complete - see status badges. | — (OK / review) |
| `evidence.storageTestPaths` | Test paths | Test Paths |
| `evidence.storageTierHint` |  | (keep empty — teach strip off) |
| `evidence.storageTierLocalHint` | Default - local folder on this server | — (OK / review) |
| `evidence.storageTierNetworkHint` | Shared storage mounted by IT - SAN, NAS, or network drive | — (OK / review) |
| `evidence.storageTierTitle` | Where Is Video Stored? | — (OK / review) |
| `evidence.storageUseDefault` | Use default | Use Default |
| `evidence.transcriptsHint` | Speech-to-text for recorded SOS voice and video appears here and in incident detail - not on the live Operations map. | — (OK / review) |
| `evidence.transcriptsNotAvailable` | Speech-to-text is not enabled on this server. There are no transcripts to view. | — (OK / review) |
| `evidence.transcriptsTitle` | Incident Transcripts | — (OK / review) |
| `evidence.transcriptsView` | View transcripts | View Transcripts |
| `evidenceHub.address` | Address | — (OK / review) |
| `evidenceHub.alertDocksOffline` | {count} docking site(s) report offline. | {count} Docking site(s) Report Offline. |
| `evidenceHub.alertPendingExports` | {count} export request(s) awaiting approval. | {count} Export request(s) Awaiting Approval. |
| `evidenceHub.alertReviewExports` | Review | — (OK / review) |
| `evidenceHub.approvalsDisabledNote` | Secure export is disabled on this server. Operators cannot queue protected exports until it is enabled. | — (OK / review) |
| `evidenceHub.approvalsEmptyTitle` | Export Approvals Inbox | — (OK / review) |
| `evidenceHub.approvalsFlowLine` | Operators request secure export from Evidence Library -> you approve or deny here with your password -> share the unlock code once, separately from the file. | — (OK / review) |
| `evidenceHub.approvalsHint` | Review export requests and confirm with your password. Share the unlock code in person. | — (OK / review) |
| `evidenceHub.approvalsNoRecent` | No approved or denied export requests yet. | — (OK / review) |
| `evidenceHub.approvalsPendingMeta` | {n} awaiting review | {n} Awaiting Review |
| `evidenceHub.approvalsPendingTitle` | Pending Review | — (OK / review) |
| `evidenceHub.approvalsQueueClear` | No pending export requests | No Pending Export Requests |
| `evidenceHub.clearQueue` | Clear Queue | — (OK / review) |
| `evidenceHub.clearQueueConfirm` | Are you sure you want to clear these records? This cannot be undone. | — (OK / review) |
| `evidenceHub.clearQueueDone` | Cleared {n} due delete(s) | Cleared {n} Due delete(s) |
| `evidenceHub.searchActive` | Search: {q} | — (OK / review) |
| `evidenceHub.approvalsRailTitle` | Export Queue | — (OK / review) |
| `evidenceHub.approvalsRecentTitle` | Recent Decisions | — (OK / review) |
| `evidenceHub.approvalsReviewed` | Reviewed | — (OK / review) |
| `evidenceHub.approvalsStep1` | An operator opens Evidence Library, selects a file, and chooses Request secure export. | — (OK / review) |
| `evidenceHub.approvalsStep2` | The request appears here for super-admin review. Approve or deny with your password. | — (OK / review) |
| `evidenceHub.approvalsStep3` | If approved, copy the unlock code once and share it separately from the encrypted file. | — (OK / review) |
| `evidenceHub.approvalsSuperNote` | Super administrators can also download protected files directly from the library without a queue request. | — (OK / review) |
| `evidenceHub.approve` | Approve export | Approve Export |
| `evidenceHub.approvedMsg` | Export approved.\n\nUnlock code (copy now - shown once):\n{unlockCode}\n\nDownload available until: {expires}\nShare the unlock code with the requester separately from the file. | — (OK / review) |
| `evidenceHub.archiveOk` | Healthy | — (OK / review) |
| `evidenceHub.archiveWarn` | Attention | — (OK / review) |
| `evidenceHub.attachPhoto` | Attach captured photo | Attach Captured Photo |
| `evidenceHub.backCatalog` | Back to library | Back to Library |
| `evidenceHub.bayEmpty` | Empty | — (OK / review) |
| `evidenceHub.bayN` | Bay {n} | — (OK / review) |
| `evidenceHub.bayPreset` | Bay layout | Bay Layout |
| `evidenceHub.branchCode` | Branch / station code | Branch / Station Code |
| `evidenceHub.caseFilesRailTitle` | Case Context | — (OK / review) |
| `evidenceHub.catalogEmptyLead` | No indexed evidence files yet. | No Indexed Evidence Files Yet. |
| `evidenceHub.catalogEmptyNote` | Live SOS server capture also adds files when enabled on this server. | — (OK / review) |
| `evidenceHub.catalogEmptyStep1` | Body-worn cameras upload video when placed in a registered docking station. | — (OK / review) |
| `evidenceHub.catalogEmptyStep2` | Files land in the FTP ingest folder configured in Storage. | — (OK / review) |
| `evidenceHub.catalogEmptyStep3` | Super administrators can run Scan FTP in Storage to index existing files. | — (OK / review) |
| `evidenceHub.catalogEmptyTitle` | Evidence Library | — (OK / review) |
| `evidenceHub.catalogEmptyUnavailableLead` | The evidence index on this server could not be read. | — (OK / review) |
| `evidenceHub.catalogEmptyUnavailableNote` | Open Storage to check paths, restore from backup, or run Scan FTP to rebuild the index. | — (OK / review) |
| `evidenceHub.catalogRailTitle` | Library Context | — (OK / review) |
| `evidenceHub.catalogUnavailableShort` | Unavailable | — (OK / review) |
| `evidenceHub.catalogUnavailableTitle` | Evidence Index Unavailable | — (OK / review) |
| `evidenceHub.city` | City | — (OK / review) |
| `evidenceHub.colDetail` | Detail | — (OK / review) |
| `evidenceHub.colStatus` | Status | — (OK / review) |
| `evidenceHub.country` | Country | — (OK / review) |
| `evidenceHub.custodyEmpty` | No custody events recorded for this file yet. | — (OK / review) |
| `evidenceHub.custodyEmptyUnavailable` | No custody events could be read for this file. | — (OK / review) |
| `evidenceHub.custodyMissingNote` | This file is missing from server storage. Opening the record logs that it is missing. | — (OK / review) |
| `evidenceHub.custodyTitle` | Custody Trail | — (OK / review) |
| `evidenceHub.custodyUnavailable` | The server audit database could not be read, so custody history is unavailable until IT restores mobility.db from backup or repairs the audit table. | — (OK / review) |
| `evidenceHub.detailLoadFailed` | This evidence record could not be opened. Refresh and try again. If it keeps failing, contact your IT administrator. | — (OK / review) |
| `evidenceHub.deny` | Deny | — (OK / review) |
| `evidenceHub.denyReasonPrompt` | Reason for denial (optional): | Reason for Denial (Optional): |
| `evidenceHub.dockColBays` | Bays in use | Bays in Use |
| `evidenceHub.dockColInBay` | BWCs in bay | BWCs in Bay |
| `evidenceHub.dockColLastSignIn` | Last sign-in | — (OK / review) |
| `evidenceHub.dockColLink` | Station link | Station Link |
| `evidenceHub.dockColLocation` | Location | — (OK / review) |
| `evidenceHub.dockColModel` | Model | — (OK / review) |
| `evidenceHub.dockColSite` | Site | — (OK / review) |
| `evidenceHub.dockColStatus` | Status | — (OK / review) |
| `evidenceHub.dockColUploading` | Uploading | — (OK / review) |
| `evidenceHub.dockFleetSummary` | {up} site(s) online · {down} offline · {bays} of {total} bays occupied | — (OK / review) |
| `evidenceHub.dockFleetTitle` | Docking Stations and Body Cameras | — (OK / review) |
| `evidenceHub.dockFormProduct` | Station model | Station Model |
| `evidenceHub.dockLinkOffline` | Offline | — (OK / review) |
| `evidenceHub.dockLinkOnline` | Online | — (OK / review) |
| `evidenceHub.dockLinkPending` | Pending link | Pending Link |
| `evidenceHub.dockManageLink` | Manage | — (OK / review) |
| `evidenceHub.dockModelDesk` | Desk 8-bay | — (OK / review) |
| `evidenceHub.dockModelWall` | Wall 8-24 bay | Wall 8-24 Bay |
| `evidenceHub.dockName` | Display name | Display Name |
| `evidenceHub.dockProductDDS10` | Desk station (UB-DDS10, 8-bay) | Desk Station (UB-DDS10, 8-bay) |
| `evidenceHub.dockProductGeneric` | Other / not set | Other / Not Set |
| `evidenceHub.dockProductWMDS` | Wall station (UB-WMDS, up to 24-bay) | Wall Station (UB-WMDS, Up to 24-bay) |
| `evidenceHub.dockStatusOffline` | Offline | — (OK / review) |
| `evidenceHub.dockStatusOnline` | Online | — (OK / review) |
| `evidenceHub.dockUploadActive` | {n} active | {n} Active |
| `evidenceHub.dockUploading` | {n} uploading | {n} Uploading |
| `evidenceHub.download` | Download | — (OK / review) |
| `evidenceHub.editDock` | Edit dock | Edit Dock |
| `evidenceHub.exportTrim` | Export trimmed clip | Export Trimmed Clip |
| `evidenceHub.fileId` | Evidence ID | — (OK / review) |
| `evidenceHub.ftpSub` | FTP subfolder | FTP Subfolder |
| `evidenceHub.hostIp` | Dock IP (optional) | Dock IP (Optional) |
| `evidenceHub.indexUnavailableShort` | Unavailable | — (OK / review) |
| `evidenceHub.indexUnavailableTitle` | Evidence Index Unavailable | — (OK / review) |
| `evidenceHub.kpiArchive` | Archive Health | — (OK / review) |
| `evidenceHub.kpiBaysOccupied` | Units in dock bays | Units in Dock Bays |
| `evidenceHub.kpiBwcOnline` | Body cameras online | Body Cameras Online |
| `evidenceHub.kpiDockSitesUp` | Dock sites online | Dock Sites Online |
| `evidenceHub.kpiDocks` | Docking Stations | — (OK / review) |
| `evidenceHub.kpiFiles` | Evidence Files | — (OK / review) |
| `evidenceHub.kpiPendingExports` | Pending Exports | — (OK / review) |
| `evidenceHub.kpiSdk` | Dock connection | Dock Connection |
| `evidenceHub.libraryExportQueueLink` | export queue | Export Queue |
| `evidenceHub.linkSos` | Link SOS incident | Link SOS Incident |
| `evidenceHub.loading` | Loading... | — (OK / review) |
| `evidenceHub.myExports` | My Export Requests | — (OK / review) |
| `evidenceHub.missingBody` | This evidence file is no longer present in server storage. Contact your administrator to check transfer, archive, or deletion history. | — (OK / review) |
| `evidenceHub.missingTitle` | File Missing from Storage | — (OK / review) |
| `evidenceHub.navApprovals` | Export Approvals | — (OK / review) |
| `evidenceHub.navCaseFiles` | Cases | — (OK / review) |
| `evidenceHub.navInvestigationHolds` | Investigation Holds | — (OK / review) |
| `evidenceHub.navCatalog` | Evidence Library | — (OK / review) |
| `evidenceHub.navRedactedExports` | Redacted Exports | — (OK / review) |
| `evidenceHub.navDocks` | Docking Stations | — (OK / review) |
| `evidenceHub.navOverview` | Overview | — (OK / review) |
| `evidenceHub.navRouteTrace` | Route and GPS | — (OK / review) |
| `evidenceHub.navPackageVerify` | Evidence Verification | — (OK / review) |
| `evidenceHub.navSettings` | Storage | — (OK / review) |
| `evidenceHub.packageVerifyTitle` | Evidence Verification | — (OK / review) |
| `evidenceHub.packageVerifyHint` | Verify a package by ID on the server, or hash a local ZIP and compare the expected SHA-256. | — (OK / review) |
| `evidenceHub.packageVerifyServerTitle` | Server Verification | — (OK / review) |
| `evidenceHub.packageVerifyLocalTitle` | Local File Verification | — (OK / review) |
| `evidenceHub.packageVerifyIdLabel` | Package ID | — (OK / review) |
| `evidenceHub.packageVerifyIdPh` | Enter Package ID | — (OK / review) |
| `evidenceHub.packageVerifyFileLabel` | Package File | — (OK / review) |
| `evidenceHub.packageVerifyExpectedLabel` | Expected SHA-256 | — (OK / review) |
| `evidenceHub.packageVerifyExpectedPh` | Paste Expected Hash | — (OK / review) |
| `evidenceHub.packageVerifyRun` | Verify | — (OK / review) |
| `evidenceHub.packageVerifyNeedId` | Enter a Package ID. | — (OK / review) |
| `evidenceHub.packageVerifyNeedFile` | Choose a package file. | Choose a Package File. |
| `evidenceHub.packageVerifyBadExpected` | Enter a valid SHA-256 hash. | Enter a Valid SHA-256 Hash. |
| `evidenceHub.packageVerifyFail` | Verification failed. | Verification Failed. |
| `evidenceHub.packageVerifyMatch` | Hash matches. | Hash Matches. |
| `evidenceHub.packageVerifyMismatch` | Hash does not match. | Hash Does Not Match. |
| `evidenceHub.packageVerifyComputed` | Computed SHA-256 | — (OK / review) |
| `evidenceHub.packageVerifyNoCrypto` | This browser cannot hash files. | This Browser Cannot Hash Files. |
| `evidenceHub.packageVerifyLargeWarn` | Large file - hashing may take a moment. | Large File - Hashing May Take a Moment. |
| `evidenceHub.packageVerifyHashOnly` | Hash computed - paste Expected SHA-256 to compare. | Hash Computed - Paste Expected SHA-256 to Compare. |
| `evidenceHub.redactedExportsHint` |  | (keep empty — teach strip off) |
| `evidenceHub.redactedExportsSearchPh` | File name, officer, device, export ID... | File Name, Officer, Device, Export ID... |
| `evidenceHub.redactedExportsStatusPending` | Draft / note pending | Draft / Note Pending |
| `evidenceHub.redactedExportsColFile` | Redacted File | — (OK / review) |
| `evidenceHub.redactedExportsColSource` | Source | — (OK / review) |
| `evidenceHub.redactedExportsColWhen` | When | — (OK / review) |
| `evidenceHub.redactedExportsEmpty` | No redacted files found. To create one, select a clip in the Evidence Library and click Redact. | — (OK / review) |
| `evidenceHub.redactedExportsEmptyZero` | No redacted files found. To create one, select a clip in the Evidence Library and click Redact. | — (OK / review) |
| `evidenceHub.redactedExportsLoadFail` | Could not load redacted exports. | Could Not Load Redacted Exports. |
| `evidenceHub.redactedExportsPageLabel` | Page {page} of {pages} · {total} export(s) | — (OK / review) |
| `evidenceHub.redactedExportsOpenSource` | Open source | Open Source |
| `evidenceHub.redactedExportsMeta` | {total} export(s) | — (OK / review) |
| `evidenceHub.holdsHint` |  | (keep empty — teach strip off) |
| `evidenceHub.holdsMeta` | {count} hold(s) | — (OK / review) |
| `evidenceHub.holdsEmpty` | No investigation holds yet. Use Keep on an FR snap or map pin to save one here. | — (OK / review) |
| `evidenceHub.holdsLoadFail` | Could not load investigation holds. | Could Not Load Investigation Holds. |
| `evidenceHub.holdsNotLicensed` | Face recognition is not licensed on this server. | — (OK / review) |
| `evidenceHub.holdsOpen` | Open | — (OK / review) |
| `evidenceHub.holdsCopyId` | Copy ID | — (OK / review) |
| `evidenceHub.holdsCopied` | Copied | — (OK / review) |
| `evidenceHub.holdsPreview` | Hold preview | Hold Preview |
| `evidenceHub.holdsScore` | Score | — (OK / review) |
| `evidenceHub.holdsFolderHint` | Server folder (IT): {folder} | Server Folder (IT): {folder} |
| `evidenceHub.holdsFilterStatus` | Show | — (OK / review) |
| `evidenceHub.holdsFilterOpen` | Open | — (OK / review) |
| `evidenceHub.holdsFilterCleared` | Cleared | — (OK / review) |
| `evidenceHub.holdsFilterDiscarded` | Discarded | — (OK / review) |
| `evidenceHub.holdsFilterAll` | All | — (OK / review) |
| `evidenceHub.holdsStatusOpen` | Open | — (OK / review) |
| `evidenceHub.holdsStatusCleared` | Cleared | — (OK / review) |
| `evidenceHub.holdsStatusDiscarded` | Discarded | — (OK / review) |
| `evidenceHub.holdsStatusLinked` | Linked | — (OK / review) |
| `evidenceHub.holdsClear` | Clear | — (OK / review) |
| `evidenceHub.holdsDiscard` | Discard | — (OK / review) |
| `evidenceHub.holdsClearTitle` | Clear Investigation Hold | — (OK / review) |
| `evidenceHub.holdsClearReason` | Reason | — (OK / review) |
| `evidenceHub.holdsClearReasonPick` | Select a reason | Select a Reason |
| `evidenceHub.holdsClearNote` | Note (optional) | Note (Optional) |
| `evidenceHub.holdsClearSubmit` | Clear hold | Clear Hold |
| `evidenceHub.holdsDiscardConfirm` | Discard this hold? It will leave the Open list but stays on the server for audit. | — (OK / review) |
| `evidenceHub.holdsEmptyOpen` | No active investigation holds. Flag a Face Recognition capture or pin a map event to create a hold. | — (OK / review) |
| `evidenceHub.holdsEmptyOpenTitle` | No Active Investigation Holds | — (OK / review) |
| `evidenceHub.holdsEmptyOpenSub` | Keep a Face Recognition capture to create a hold. | — (OK / review) |
| `evidenceHub.holdsEmptyCleared` | No cleared holds in this view. | No Cleared Holds in This View. |
| `evidenceHub.holdsEmptyClearedTitle` | No Cleared Holds | — (OK / review) |
| `evidenceHub.holdsEmptyClearedSub` | Cleared holds for this filter will appear here. | — (OK / review) |
| `evidenceHub.holdsEmptyDiscarded` | No discarded holds in this view. | No Discarded Holds in This View. |
| `evidenceHub.holdsEmptyDiscardedTitle` | No Discarded Holds | — (OK / review) |
| `evidenceHub.holdsEmptyDiscardedSub` | Discarded holds for this filter will appear here. | — (OK / review) |
| `evidenceHub.holdsEmptyAll` | No investigation holds yet. | No Investigation Holds Yet. |
| `evidenceHub.holdsEmptyAllTitle` | No Investigation Holds Yet | — (OK / review) |
| `evidenceHub.holdsReasonFalsePositive` | False positive | False Positive |
| `evidenceHub.holdsReasonKnownCleared` | Known / cleared | Known / Cleared |
| `evidenceHub.holdsReasonDuplicate` | Duplicate | — (OK / review) |
| `evidenceHub.holdsReasonOther` | Other | — (OK / review) |
| `evidenceHub.holdsDispositionFail` | Could not update hold. | Could Not Update Hold. |
| `evidenceHub.noAttachments` | No photo attachments yet. | No Photo Attachments Yet. |
| `evidenceHub.noDockPerm` | Dock administration is not granted for your account. | — (OK / review) |
| `evidenceHub.noDocks` | No docking stations configured. Register a new docking station to begin ingesting evidence. | — (OK / review) |
| `evidenceHub.noPendingExports` | No export requests awaiting review. | No Export Requests Awaiting Review. |
| `evidenceHub.noSosLink` | No SOS link | No SOS Link |
| `evidenceHub.noViewPerm` | Evidence access is not granted for your account. | — (OK / review) |
| `evidenceHub.notes` | Case notes | Case Notes |
| `evidenceHub.tags` | Tags | — (OK / review) |
| `evidenceHub.tagsExample` | e.g. blue-shirt, vehicle | — (OK / review) |
| `evidenceHub.tagsPlaceholder` | blue-shirt, vehicle | blue-shirt, Vehicle |
| `evidenceHub.tagFilter` | Tag | — (OK / review) |
| `evidenceHub.tagFilterPlaceholder` | Filter by tag... | Filter by Tag... |
| `evidenceHub.tagFilterActive` | tag filter: {tag} | Tag Filter: {tag} |
| `evidenceHub.pagePrev` | Previous | — (OK / review) |
| `evidenceHub.pageNext` | Next | — (OK / review) |
| `evidenceHub.pageLabel` | Page {page} of {pages} · {total} Files | — (OK / review) |
| `evidenceHub.statusActive` | Active | — (OK / review) |
| `evidenceHub.statusArchived` | Archived | — (OK / review) |
| `evidenceHub.archive` | Archive (off active list) | Archive (Off Active List) |
| `evidenceHub.restore` | Restore to library | Restore to Library |
| `evidenceHub.archiveConfirm` | Remove from active library? File is kept in archive and can be restored. | — (OK / review) |
| `evidenceHub.archivedBadge` | Archived | — (OK / review) |
| `evidenceHub.cryptoEncrypted` | Encrypted (AES-256) | — (OK / review) |
| `evidenceHub.cryptoPlaintext` | Not encrypted | Not Encrypted |
| `evidenceHub.cryptoMissing` | File unavailable | File Unavailable |
| `evidenceHub.open` | Open | — (OK / review) |
| `evidenceHub.openDocks` | Open Docking Stations | — (OK / review) |
| `evidenceHub.openExportApprovals` | Export Approvals | — (OK / review) |
| `evidenceHub.openLibrary` | Open Evidence Library | — (OK / review) |
| `evidenceHub.openPreview` | Open Preview | — (OK / review) |
| `evidenceHub.openRedact` | Redact video | Redact Video |
| `evidenceHub.redactSecondPass` | Second pass | Second Pass |
| `evidenceHub.redactSecondPassTitle` | Second Pass - Already Redacted Copy | — (OK / review) |
| `evidenceHub.redactSecondPassHint` | Draw boxes on leftover faces, then Save. Creates a new export; the previous file stays. | — (OK / review) |
| `evidenceHub.openStorage` | Storage Settings | — (OK / review) |
| `evidenceHub.overviewGuidanceAdmin` | Priority evidence retrieval: {library} search first · unindexed media: {storage}, Scan FTP · export release: {exportQueue}. | — (OK / review) |
| `evidenceHub.overviewGuidanceKicker` | Operational guidance | Operational Guidance |
| `evidenceHub.overviewGuidanceOperator` | Priority evidence retrieval: search {library} first. If the recording is not listed or export is pending approval, contact a super administrator on duty. | — (OK / review) |
| `evidenceHub.overviewHint` |  | (keep empty — teach strip off) |
| `evidenceHub.overviewRecoveryAdmin` | Evidence index unavailable - open {storage}, restore from backup, or run Scan FTP to rebuild from archived files. | — (OK / review) |
| `evidenceHub.overviewRecoveryKicker` | Recovery steps | Recovery Steps |
| `evidenceHub.preset24` | 24-bay wall (6×4) | 24-bay Wall (6×4) |
| `evidenceHub.preset8` | 8-bay rack | 8-bay Rack |
| `evidenceHub.presetSingle` | Single (1 bay) | Single (1 Bay) |
| `evidenceHub.priorExports` | Prior exports | Prior Exports |
| `evidenceHub.priorExportsHint` | Download the finished file, or open Second pass to blur more. | — (OK / review) |
| `evidenceHub.exportSectionFinalized` | Finalized - ready to download | Finalized - Ready to Download |
| `evidenceHub.exportSectionPending` | Still need Finalize | Still Need Finalize |
| `evidenceHub.exportPendingHidden` | + {n} older pending (not shown). Use Clean drafts - do not Save again. | — (OK / review) |
| `evidenceHub.exportBurnedAt` | Burned {t} | — (OK / review) |
| `evidenceHub.exportCreatedAt` | Created {t} | — (OK / review) |
| `evidenceHub.trimType` | Trim | — (OK / review) |
| `evidenceHub.exportSectionTrims` | Trim copies | Trim Copies |
| `evidenceHub.exportRemoveTrim` | Remove | — (OK / review) |
| `evidenceHub.exportRemoveTrimConfirm` | Remove this trim copy from the server? Download it first if you still need it. Original library recording stays. This cannot be undone. You will be asked for your password. | — (OK / review) |
| `evidenceHub.exportRemoveTrimPasswordPrompt` | Your password to remove this trim copy: | — (OK / review) |
| `evidenceHub.exportClearTrimsN` | Clear trims ({n}) | Clear Trims ({n}) |
| `evidenceHub.exportClearTrimsConfirm` | Clear ALL trim copies for this clip from the server? Download first if you still need them. Original library recording stays. This cannot be undone. You will be asked for your password. | — (OK / review) |
| `evidenceHub.exportClearTrimsPasswordPrompt` | Your password to clear trim copies for this clip: | — (OK / review) |
| `evidenceHub.exportTrimNeedPassword` | Enter your account password to remove trim copies. | — (OK / review) |
| `evidenceHub.exportTrimCleanupFailed` | Could not remove trim copies. Restart the server, hard-refresh, then try again. Original recording was not deleted. | — (OK / review) |
| `evidenceHub.exportRemoveDraft` | Remove | — (OK / review) |
| `evidenceHub.exportRemoveDraftConfirm` | Remove this draft redacted copy? File is deleted. Original recording stays. Finalized copies are not touched. | — (OK / review) |
| `evidenceHub.exportRemoveFinalized` | Remove | — (OK / review) |
| `evidenceHub.exportRemoveFinalizedConfirm` | Remove this Finalized redacted copy? Download for this copy goes away. Original library recording stays. This cannot be undone. You will be asked for your password. | — (OK / review) |
| `evidenceHub.exportRemoveFinalizedPasswordPrompt` | Your password to remove this Finalized redacted copy: | — (OK / review) |
| `evidenceHub.exportCleanDrafts` | Clean drafts | Clean Drafts |
| `evidenceHub.exportCleanDraftsN` | Clean drafts ({n}) | Clean Drafts ({n}) |
| `evidenceHub.exportCleanDraftsConfirm` | Remove ALL draft / Note pending redacted copies for this clip? Finalized downloads stay. Original recording stays. This cannot be undone. | — (OK / review) |
| `evidenceHub.exportClearFinalized` | Clear finalized | Clear Finalized |
| `evidenceHub.exportClearFinalizedN` | Clear finalized ({n}) | Clear Finalized ({n}) |
| `evidenceHub.exportClearFinalizedConfirm` | Clear ALL Finalized redacted downloads for this clip? Original library recording stays. This cannot be undone. You will be asked for your password. | — (OK / review) |
| `evidenceHub.exportClearFinalizedPasswordPrompt` | Your password to clear Finalized redacted copies for this clip: | — (OK / review) |
| `evidenceHub.exportFinalizedNeedPassword` | Enter your account password to destroy Finalized redacted copies. | — (OK / review) |
| `evidenceHub.exportClearFinalizedNeedConfirm` | Enter your account password to clear Finalized redacted copies for this clip. | — (OK / review) |
| `evidenceHub.exportCleanupNeedRestart` | Restart the server, hard-refresh (Ctrl+F5), then try again. | — (OK / review) |
| `evidenceHub.exportCleanupNeedSuperAdmin` | Clean drafts / Remove draft needs a Super admin account. | — (OK / review) |
| `evidenceHub.exportCleanupFailed` | Could not clean drafts. Restart the server, hard-refresh, then try again. Finalized downloads were not removed. | — (OK / review) |
| `evidenceHub.exportFinalizedCleanupFailed` | Could not clear Finalized redacted copies. Restart the server, hard-refresh, then try again. Original recording was not deleted. | — (OK / review) |
| `evidenceHub.province` | Province / state | Province / State |
| `evidenceHub.railHintApprovals` | Pending exports and archive health. Approve requests in the main panel. | — (OK / review) |
| `evidenceHub.railHintCaseFiles` | Link evidence from the library. Index health reflects catalog availability. | — (OK / review) |
| `evidenceHub.railHintCatalog` | Index and device snapshot. Open Storage to change archive paths. | — (OK / review) |
| `evidenceHub.reason` | Reason | — (OK / review) |
| `evidenceHub.redactHelp` | Mark areas to blur on the video, then save a redacted copy. The original recording is not changed. | — (OK / review) |
| `evidenceHub.redactTitle` | Redact Video | — (OK / review) |
| `evidenceHub.redactBack` | Back to evidence | Back to Evidence |
| `evidenceHub.redactHint` | Pause the video, drag on the picture to mark blur areas, then set how long each area stays blurred and save. | — (OK / review) |
| `evidenceHub.redactPause` | Pause / play | Pause / Play |
| `evidenceHub.redactUndo` | Undo last area | Undo Last Area |
| `evidenceHub.redactSave` | Save redacted copy (on server) | Save Redacted Copy (on Server) |
| `evidenceHub.redactSaving` | Saving redacted copy... | Saving Redacted Copy... |
| `evidenceHub.redactNoRegions` | Mark at least one blur area before saving. | — (OK / review) |
| `evidenceHub.redactNeedReason` | Choose a redaction reason before saving. | Choose a Redaction Reason Before Saving. |
| `evidenceHub.redactRegionLine` | #{n} · {t0}-{t1}s · {w}×{h} | — (OK / review) |
| `evidenceHub.redactRegionTag` | #{n} · {w}×{h} | — (OK / review) |
| `evidenceHub.redactAutoPreviewTag` | Preview #{n} · ~{t}s | — (OK / review) |
| `evidenceHub.redactSpanLabel` | Blur This Box | — (OK / review) |
| `evidenceHub.redactSpanWhole` | On the whole video | On the Whole Video |
| `evidenceHub.redactSpanFrom` | From this moment to the end | From This Moment to the End |
| `evidenceHub.redactSpanWindow` | Only around this moment (~2 s) | Only Around This Moment (~2 S) |
| `evidenceHub.redactSpanHint` | Scrub to the face first, then draw. Dropdown = how long the blur stays - not cutting the file. | — (OK / review) |
| `evidenceHub.redactAutoFace` | Auto face-follow | — (OK / review) |
| `evidenceHub.redactAutoFaceRunning` | Detecting faces... | Detecting Faces... |
| `evidenceHub.redactAutoFaceDone` | {n} face area(s) added - review, adjust, or delete before saving. | — (OK / review) |
| `evidenceHub.redactAutoFaceFollowDone` | {n} face preview(s) on the picture - look, delete bad ones if needed, then Save. Save blurs faces through the clip (you do not type Start/End). Draw a box only for plates or extra. | — (OK / review) |
| `evidenceHub.redactAutoFaceNone` | No faces detected automatically - draw the areas manually. | — (OK / review) |
| `evidenceHub.redactFaceFollowSaving` | Saving face-follow redacted copy... | Saving face-follow Redacted Copy... |
| `evidenceHub.redactSaveProgress` | Still working - {t} elapsed. Long clips can take several minutes. | — (OK / review) |
| `evidenceHub.redactSaveCancelled` | Save cancelled. You can try again or adjust areas. | — (OK / review) |
| `evidenceHub.redactSaveTimeout` | Save timed out after 12 minutes. Try a shorter clip or fewer areas, then Save again. | — (OK / review) |
| `evidenceHub.redactSaveReady` | Redacted copy saved on the server. Original unchanged. Next: Finalize and Register - Download appears on the next screen. | — (OK / review) |
| `evidenceHub.redactWhereDownload` | After Finalize you get a Download button on this screen. Or: Prior exports -> Finalized -> Download. | — (OK / review) |
| `evidenceHub.redactWhereDownloadShort` | Download appears right after Finalize. | Download Appears Right After Finalize. |
| `evidenceHub.redactDownloadAfterFinalize` | Download after Finalize | Download After Finalize |
| `evidenceHub.redactDoneReady` | Finalized - Download redacted copy | Finalized - Download Redacted Copy |
| `evidenceHub.redactDoneHint` | File is registered. Click Download now, or open Prior exports. Source date in the file name is the original clip, not today’s burn. | — (OK / review) |
| `evidenceHub.redactDoneAlreadyFinalizedReady` | This redacted copy is already Finalized. | This Redacted Copy Is Already Finalized. |
| `evidenceHub.redactDoneAlreadyFinalizedHint` | Use Download or Open Prior exports. Need more blur? Prior exports -> Second pass on that file - do not Finalize again. | — (OK / review) |
| `evidenceHub.redactDoneDownload` | Download redacted copy | Download Redacted Copy |
| `evidenceHub.redactPendingBanner` | Redacted copy waiting - finish Finalize (do not Save again). | — (OK / review) |
| `evidenceHub.redactPendingCount` | {n} drafts waiting | {n} Drafts Waiting |
| `evidenceHub.redactFinishFinalize` | Finalize | — (OK / review) |
| `evidenceHub.redactDismissPending` | Hide for now | Hide for Now |
| `evidenceHub.redactDismissPendingHint` | Hide for now does not delete drafts. Use Clean drafts to remove them. | — (OK / review) |
| `evidenceHub.redactOpenPriorExports` | Open Prior exports | Open Prior Exports |
| `evidenceHub.redactLeaveWhileSaving` | Burn still running. Leave anyway? Check Prior exports in a minute - do not Save again yet. | — (OK / review) |
| `evidenceHub.redactResumeOrBurnAgain` | A redacted copy is already waiting. OK = Finish Finalize. Cancel = burn a new copy (creates another file). | — (OK / review) |
| `evidenceHub.redactResumePending` | A redacted copy is waiting to Finalize. OK = Finish Finalize now. Cancel = open mark tools again. | — (OK / review) |
| `evidenceHub.redactFinalizeNeedSuperAdmin` | Finalize needs a super-admin account. Save draft note, then ask a super-admin - or Open Prior exports. | — (OK / review) |
| `evidenceHub.redactFinalizeNeedNote` | Add a visible description or incident note before Finalize. | — (OK / review) |
| `evidenceHub.redactSaveNoExport` | Save finished but no export was returned. Close and check Prior exports, or try Save once more. | — (OK / review) |
| `evidenceHub.redactStart` | Start (s) | Start (S) |
| `evidenceHub.redactEnd` | End (s) | End (S) |
| `evidenceHub.redactWholeClip` | Whole clip | Whole Clip |
| `evidenceHub.redactDraftHint` | Fill details now (before or while Save runs). You do not wait for burn to finish to type these. | — (OK / review) |
| `evidenceHub.redactNoteTitle` | Redaction Description | — (OK / review) |
| `evidenceHub.redactNoteHint` | Describe what remains visible after blur - not identity guesses. | — (OK / review) |
| `evidenceHub.redactReason` | Redaction reason | Redaction Reason |
| `evidenceHub.redactReasonFace` | Face | — (OK / review) |
| `evidenceHub.redactReasonChild` | Child | — (OK / review) |
| `evidenceHub.redactReasonBystander` | Bystander | — (OK / review) |
| `evidenceHub.redactReasonPlate` | Plate / number | Plate / Number |
| `evidenceHub.redactReasonOther` | Other | — (OK / review) |
| `evidenceHub.redactVisible` | Visible description | Visible Description |
| `evidenceHub.redactVisiblePh` | e.g. blue shirt, black cap | — (OK / review) |
| `evidenceHub.redactIncident` | Incident note | Incident Note |
| `evidenceHub.redactIncidentPh` | e.g. approached patrol car from the left | — (OK / review) |
| `evidenceHub.redactSaveNote` | Save draft note | Save Draft Note |
| `evidenceHub.redactFinalize` | Finalize and Register | — (OK / review) |
| `evidenceHub.redactFinalized` | Finalized | — (OK / review) |
| `evidenceHub.redactDraft` | Draft | — (OK / review) |
| `evidenceHub.redactPendingNote` | Note pending | Note Pending |
| `evidenceHub.redactType` | Redacted | — (OK / review) |
| `evidenceHub.redactEditNote` | Finalize | — (OK / review) |
| `evidenceHub.registerDock` | Register Docking Station | — (OK / review) |
| `evidenceHub.navUnassignedEvidence` | Unassigned Evidence | — (OK / review) |
| `evidenceHub.docksEmptyTitle` | No Docking Stations Configured | — (OK / review) |
| `evidenceHub.docksEmptySub` | Register a new docking station to begin ingesting evidence. | — (OK / review) |
| `evidenceHub.previewKindImage` | image | Image |
| `evidenceHub.previewKindVideo` | video | Video |
| `evidenceHub.previewLockedBody` | This {kind} is hidden by default. Open preview only when needed. | — (OK / review) |
| `evidenceHub.previewLockedTitle` | Controlled Preview | — (OK / review) |
| `evidenceHub.requestSecure` | Request protected export | Request Protected Export |
| `evidenceHub.requestedBy` | Requested by | — (OK / review) |
| `evidenceHub.routeTraceHint` |  | (keep empty — teach strip off) |
| `evidenceHub.saveFailed` | Could not save changes. | Could Not Save Changes. |
| `evidenceHub.saveMeta` | Save case info | Save Case Info |
| `evidenceHub.saveMetaNoChanges` | No changes to save. | No Changes to Save. |
| `evidenceHub.saved` | Saved. | — (OK / review) |
| `evidenceHub.sdkPending` | Station link pending - live bay status, uploads, and sign-in appear when the docking station is connected to this site. | — (OK / review) |
| `evidenceHub.secureReasonPrompt` | Reason for this export (optional): | Reason for This Export (Optional): |
| `evidenceHub.secureRequested` | Your request was submitted ({id}). A super admin will review it. | — (OK / review) |
| `evidenceHub.site` | Site name | Site Name |
| `evidenceHub.size` | Size | — (OK / review) |
| `evidenceHub.statusApproved` | Approved | — (OK / review) |
| `evidenceHub.statusAwaiting` | Awaiting approval | Awaiting Approval |
| `evidenceHub.statusAvailable` | Available | — (OK / review) |
| `evidenceHub.statusDenied` | Denied | — (OK / review) |
| `evidenceHub.statusDownloaded` | Downloaded | — (OK / review) |
| `evidenceHub.statusMissing` | Missing from storage | Missing from Storage |
| `evidenceHub.statusRepaired` | Index repaired | Index Repaired |
| `evidenceHub.storageArchive` | Primary archive | Primary Archive |
| `evidenceHub.storageBackupBtn` | Backup index now | Backup Index Now |
| `evidenceHub.storageBackupDone` | Backup saved. | Backup Saved. |
| `evidenceHub.storageBackups` | Index backups | Index Backups |
| `evidenceHub.storageCatalog` | Evidence index | Evidence Index |
| `evidenceHub.storageDbSize` | Index size | Index Size |
| `evidenceHub.storageEvidenceBytes` | Indexed evidence size | Indexed Evidence Size |
| `evidenceHub.storageFtpPath` | FTP upload folder | FTP Upload Folder |
| `evidenceHub.storageMaintBtn` | Optimize index | Optimize Index |
| `evidenceHub.storageMaintDone` | Maintenance complete. | Maintenance Complete. |
| `evidenceHub.storageMissing` | Missing | — (OK / review) |
| `evidenceHub.storageNasPath` | NAS mount | NAS Mount |
| `evidenceHub.storageNotSet` | Not configured | Not Configured |
| `evidenceHub.storageNote` | Recorded video stays on local disk or shared storage. This server holds the evidence index, audit trail, and device list. | — (OK / review) |
| `evidenceHub.storageOk` | OK | — (OK / review) |
| `evidenceHub.storageRailHint` | Live ingest and index health. Save or test paths on the left to update archive settings. | — (OK / review) |
| `evidenceHub.storageRailOnline` | online | Online |
| `evidenceHub.storageRailTitle` | System Status | — (OK / review) |
| `evidenceHub.storageTitle` | Storage and Database Health | — (OK / review) |
| `evidenceHub.trimEnd` | Trim end (sec) | Trim End (Sec) |
| `evidenceHub.trimExport` | Trim and Export | — (OK / review) |
| `evidenceHub.trimStart` | Trim start (sec) | Trim Start (Sec) |
| `evidenceHub.trimHint` | Set In/Out times to create a trimmed clip; the original recording is unchanged. | — (OK / review) |
| `evidenceHub.trimUsePlayhead` | Use playhead | Use Playhead |
| `evidenceHub.trimUsePlayheadTitle` | Copy the video's current time into this box | Copy the video's Current Time Into This Box |
| `evidenceHub.trimStartShort` | In | — (OK / review) |
| `evidenceHub.trimEndShort` | Out | — (OK / review) |
| `evidenceHub.trimEndAuto` | end of clip | End of Clip |
| `evidenceHub.trimSet` | Set | — (OK / review) |
| `evidenceHub.trimLen` | Clip length: {len}s | Clip Length: {len}s |
| `evidenceHub.trimLenToEnd` | Clip length: In -> end of clip | — (OK / review) |
| `evidenceHub.trimLenInvalid` | Out must be after In | Out Must Be After in |
| `evidenceHub.trimLenTooShort` | Clip must be at least {min}s | Clip Must Be at Least {min}s |
| `evidenceHub.trimOpenVideoFirst` | Open the video preview and scrub to the moment first, then use the playhead. | — (OK / review) |
| `evidenceHub.unavailable` | Unavailable | — (OK / review) |
| `missedActivity.title` | Missed Activity | — (OK / review) |
| `missedActivity.bellText` | Alerts | — (OK / review) |
| `missedActivity.empty` | No missed activity. All clear. | — (OK / review) |
| `missedActivity.sos` | SOS alert | SOS Alert |
| `missedActivity.fall` | Fall alert | Fall Alert |
| `missedActivity.sosTag` | SOS | — (OK / review) |
| `missedActivity.fallTag` | FALL | — (OK / review) |
| `missedActivity.ptt` | Missed PTT | — (OK / review) |
| `missedActivity.pttTag` | PTT | — (OK / review) |
| `missedActivity.unknownCam` | Unknown device | Unknown Device |
| `missedActivity.justNow` | just now | Just Now |
| `missedActivity.ago` | ago | Ago |
| `missedActivity.minShort` | m | M |
| `missedActivity.hrShort` | h | H |
| `missedActivity.dayShort` | d | D |
| `missedActivity.detailTitle` | Missed Detail | — (OK / review) |
| `missedActivity.back` | Back to list | Back to List |
| `missedActivity.fieldDevice` | Device | — (OK / review) |
| `missedActivity.fieldCamId` | Camera ID | — (OK / review) |
| `missedActivity.fieldWhen` | When | — (OK / review) |
| `missedActivity.fieldNote` | Note | — (OK / review) |
| `missedActivity.openOps` | Open on Operations | — (OK / review) |
| `missedActivity.closeDetail` | Close detail | Close Detail |
| `missedActivity.pttDetail` | Field PTT ended before an operator engaged the banner. | — (OK / review) |
| `missedActivity.fallDetail` | Fall alert recorded while you were away. | — (OK / review) |
| `missedActivity.sosDetail` | SOS recorded while you were away. | SOS Recorded While You Were Away. |
| `firmware.cancel` | Cancel | — (OK / review) |
| `firmware.col.deviceId` | Device ID | — (OK / review) |
| `firmware.col.group` | Map group | Map Group |
| `firmware.col.model` | Model | — (OK / review) |
| `firmware.col.officer` | Officer | — (OK / review) |
| `firmware.col.online` | Online | — (OK / review) |
| `firmware.col.profile` | Camera model | Camera Model |
| `firmware.col.protocol` | Method | — (OK / review) |
| `firmware.col.status` | Status | — (OK / review) |
| `firmware.col.target` | Target version | Target Version |
| `firmware.col.vendor` | Vendor | — (OK / review) |
| `firmware.col.version` | Firmware version | Firmware Version |
| `firmware.dock.note` |  | (keep empty — teach strip off) |
| `firmware.dock.title` | Docking Station Upgrades | — (OK / review) |
| `firmware.fleet.empty` | No cameras registered yet - add BWCs on the BWCs tab. | — (OK / review) |
| `firmware.fleet.hint` |  | (keep empty — teach strip off) |
| `firmware.fleet.noProfile` | Contact vendor | Contact Vendor |
| `firmware.fleet.title` | Mobility Firmware Status | — (OK / review) |
| `firmware.fleet.unknown` | Awaiting report | Awaiting Report |
| `firmware.hint` |  | (keep empty — teach strip off) |
| `firmware.kpi.online` | Online | — (OK / review) |
| `firmware.kpi.profiles` | Camera models | Camera Models |
| `firmware.kpi.ready` | OTA enabled | OTA Enabled |
| `firmware.kpi.registered` | Registered | — (OK / review) |
| `firmware.kpi.reported` | Version known | Version Known |
| `firmware.loadFailed` | Could not load firmware status. | Could Not Load Firmware Status. |
| `firmware.pause` | Pause Upgrade | — (OK / review) |
| `firmware.phases.title` | How Upgrades Work | — (OK / review) |
| `firmware.profiles.empty` | No models registered yet. Contact your BWC vendor to enable firmware OTA for your cameras. | — (OK / review) |
| `firmware.profiles.hint` |  | (keep empty — teach strip off) |
| `firmware.profiles.title` | Supported Camera Models | — (OK / review) |
| `firmware.refresh` | Refresh Mobility status | Refresh Mobility Status |
| `firmware.status.ready` | OTA enabled | OTA Enabled |
| `firmware.status.registered` | Registered | — (OK / review) |
| `firmware.step` | Step {n} | — (OK / review) |
| `firmware.title` | Firmware OTA | — (OK / review) |
| `firmware.upgrade` | Upgrade OTA | — (OK / review) |
| `firmware.versions.label` | Firmware Versions in Mobility: | — (OK / review) |
| `firmware.versions.none` | No version data yet - ensure cameras are online and reporting status. | — (OK / review) |
| `fleet.addNicknameHint` | Add nickname in Server Config -> BWCs | — (OK / review) |
| `fleet.bwc` | BWC | — (OK / review) |
| `fleet.bwcShort` | BWC #{suffix} | — (OK / review) |
| `fleet.bwcWithId` | BWC {id} | BWC {iD} |
| `fleet.clearMapPins` | Clear map pins | Clear Map Pins |
| `fleet.clearMapPinsConfirm` | Clear all map pins? This closes pin popups and removes markers from the map. | — (OK / review) |
| `fleet.clearMapPinsNoPerm` | Clear map pins requires super admin or permission from Dashboard Authentication. | — (OK / review) |
| `fleet.colDevice` | Device | — (OK / review) |
| `fleet.colPin` | PIN | — (OK / review) |
| `fleet.colPinTitle` | Live PIN on Map | — (OK / review) |
| `fleet.colPtt` | PTT | — (OK / review) |
| `fleet.colPttTitle` | Hold to Talk (1:1, No Video) | — (OK / review) |
| `fleet.colStatus` | Status | — (OK / review) |
| `fleet.colVoice` | Call | — (OK / review) |
| `fleet.colVoiceTitle` | Tap to Voice Call (No Video) | — (OK / review) |
| `fleet.emptyNoMatch` | No match | No Match |
| `fleet.emptyNone` | No devices yet | No Devices Yet |
| `fleet.filterAll` | All | — (OK / review) |
| `fleet.filterAria` | Filter devices | Filter Devices |
| `fleet.filterOffline` | Offline only | Offline Only |
| `fleet.filterOnline` | Online only | Online Only |
| `fleet.groupUngrouped` | Ungrouped | — (OK / review) |
| `fleet.hidePanel` | Hide device panel | Hide Device Panel |
| `fleet.openAll` | Open All (Up to 8) | — (OK / review) |
| `fleet.circle.selectAria` | User circle | User Circle |
| `fleet.circle.open` | Open Circle | — (OK / review) |
| `fleet.circle.save` | Save selection | Save Selection |
| `fleet.circle.add` | Add to circle | Add to Circle |
| `fleet.circle.delete` | Delete | — (OK / review) |
| `fleet.circle.none` | No circles yet | No Circles Yet |
| `fleet.circle.namePrompt` | Circle name | Circle Name |
| `fleet.circle.nameDefault` | Circle {n} | — (OK / review) |
| `fleet.circle.needSelection` | Select pins first (checkbox column). | Select Pins First (Checkbox Column). |
| `fleet.circle.needCircle` | Pick or save a circle first. | Pick or Save a Circle First. |
| `fleet.circle.saved` | Saved “{name}” ({n}). | — (OK / review) |
| `fleet.circle.added` | Added {added} -> “{name}” now {n}. | Added {added} -> “{name}” Now {n}. |
| `fleet.circle.deleted` | Deleted “{name}”. | — (OK / review) |
| `fleet.circle.deleteConfirm` | Delete circle “{name}”? | Delete Circle “{name}”? |
| `fleet.circle.empty` | Circle has no devices. | Circle Has No Devices. |
| `fleet.circle.noneOnline` | No online devices in this circle. | No Online Devices in This Circle. |
| `fleet.circle.openedWallFull` | Opened {opened} of {total} - wall full | — (OK / review) |
| `fleet.circle.openedOffline` | Opened {opened} of {total} ({offline} offline skipped) | — (OK / review) |
| `fleet.circle.openedOk` | Opened {opened} | — (OK / review) |
| `fleet.circle.meta` | {name} · {n} | — (OK / review) |
| `fleet.pttTalkOnly` | Talk to {name} only (hold) | Talk to {name} Only (Hold) |
| `fleet.searchAria` | Search devices by name or ID | Search Devices by Name or ID |
| `fleet.searchClear` | Clear search | Clear Search |
| `fleet.searchHint` | Filters as you type | Filters as You Type |
| `fleet.searchPlaceholder` | Search Name or ID... | — (OK / review) |
| `fleet.showPanel` | Show device panel | Show Device Panel |
| `fleet.statusOffline` | Device Offline | — (OK / review) |
| `fleet.warmChromeBanner` | Reconnecting... showing last known locations ({n}) | — (OK / review) |
| `fleet.statusOnline` | Online | — (OK / review) |
| `fleet.statusPtt` | 🎙 PTT | — (OK / review) |
| `fleet.statusPttLinger` | 🎙 PTT (recent) | 🎙 PTT (Recent) |
| `fleet.summary` | {online} online · {total} devices | {online} Online · {total} Devices |
| `fleet.summaryScroll` | {online} online · {total} devices · scroll list | — (OK / review) |
| `fleet.title` | Devices | — (OK / review) |
| `fleet.rosterPopout` | Pop out roster | Pop Out Roster |
| `fleet.rosterPopoutMin` | Minimize | — (OK / review) |
| `fleet.voiceTalk` | Call {name} (tap) | Call {name} (Tap) |
| `geofence.clear.clearing` | Clearing... | — (OK / review) |
| `geofence.clear.empty` | No BWCs match this filter. | No BWCs Match This Filter. |
| `geofence.clear.hint` |  | (keep empty — teach strip off) |
| `geofence.clear.noSavedHint` | No saved geofence on any registered BWC - use Set geofencing first, then Save. | — (OK / review) |
| `geofence.draw.dragCentre` | Drag centre | Drag Centre |
| `geofence.draw.dragResize` | Drag to resize | Drag to Resize |
| `geofence.draw.hint` |  | (keep empty — teach strip off) |
| `geofence.draw.save` | Save geofence | Save Geofence |
| `geofence.error.badCredentials` | Wrong username or password. | Wrong Username or Password. |
| `geofence.error.needCredentials` | Enter username and password (same as dashboard sign-in). | — (OK / review) |
| `geofence.error.needCredentialsShort` | Enter username and password. | Enter Username and Password. |
| `geofence.error.noGeofence` | That BWC has no saved geofence. Use Set geofencing first. | — (OK / review) |
| `geofence.error.notPermitted` | This account is not allowed to set or clear geofences. | — (OK / review) |
| `geofence.error.save` | Could not save geofence: {msg} | Could Not Save Geofence: {msg} |
| `geofence.error.selectBwc` | Select a BWC from the list. | Select a BWC from the List. |
| `geofence.error.selectGeofenced` | Select a BWC that has a saved geofence (Geofenced tag). | — (OK / review) |
| `geofence.filter.allBwcs` | All registered BWCs | All Registered BWCs |
| `geofence.filter.allRegistered` | All registered | All Registered |
| `geofence.filter.aria` | Filter BWC list | Filter BWC List |
| `geofence.filter.geofencedOnly` | With geofence only | With Geofence Only |
| `geofence.filter.show` | Show | — (OK / review) |
| `geofence.set.checking` | Checking... | — (OK / review) |
| `geofence.set.drawOnMap` | Draw on map | Draw on Map |
| `geofence.set.empty` | No BWCs match this filter. Add devices in Server Config -> BWCs. | — (OK / review) |
| `geofence.set.hint` |  | (keep empty — teach strip off) |
| `geofence.tag.geofenced` | Geofenced | — (OK / review) |
| `geofence.tag.noGeofence` | No geofence | No Geofence |
| `geofence.tag.offline` | Offline | — (OK / review) |
| `geofence.tag.online` | Online | — (OK / review) |
| `geofence.toast.breach` | Geofence breach · {name} | Geofence Breach · {name} |
| `geofence.toast.centreMoved` | Centre moved - drag white dot for size or Save | — (OK / review) |
| `geofence.toast.centrePlaced` | Centre placed - drag orange/white dots | Centre Placed - Drag Orange/White Dots |
| `geofence.toast.cleared` | Geofencing cleared · {name} | Geofencing Cleared · {name} |
| `geofence.toast.drawStart` | Geofence for {name}: drag orange centre · white edge for size | — (OK / review) |
| `geofence.toast.radiusSet` | Radius {n} m - click Save geofence | — (OK / review) |
| `geofence.toast.reentered` | {name} re-entered geofence | {name} re-entered Geofence |
| `geofence.toast.saved` | Geofence saved · {name} | Geofence Saved · {name} |
| `groups.add` | Add group | Add Group |
| `groups.addMember` | + Add member | + Add Member |
| `groups.color` | PIN Colour | — (OK / review) |
| `groups.colorHint` | Click a swatch or the colour square. Pins update when you press Save group. | — (OK / review) |
| `groups.csvColorHint` | CSV colour: name, 1-10, or hex. Leave blank for automatic colour. | — (OK / review) |
| `groups.dashUserOptional` | Dashboard user (optional) | Dashboard User (Optional) |
| `groups.delete` | Delete | — (OK / review) |
| `groups.deleteConfirm` | Delete group \"{name}\"? | Delete Group "{name}"? |
| `groups.deviceId` | Device ID | — (OK / review) |
| `groups.downloadCsv` | Download CSV template | Download CSV Template |
| `groups.editorTitle` | Edit Group | — (OK / review) |
| `groups.empty` | No groups yet - add one or import CSV. | — (OK / review) |
| `groups.hint` |  | (keep empty — teach strip off) |
| `groups.importCsv` | Upload CSV | — (OK / review) |
| `groups.imported` | Imported {n} row(s). | — (OK / review) |
| `groups.members` | members | Members |
| `groups.membersEmpty` | No members yet - click + Add member or choose a BWC in the row dropdown. | — (OK / review) |
| `groups.name` | Group name | Group Name |
| `groups.nameRequired` | Group name is required. | Group Name Is Required. |
| `groups.newGroupTitle` | New Group | — (OK / review) |
| `groups.nickname` | Nickname | — (OK / review) |
| `groups.offline` | Offline | — (OK / review) |
| `groups.online` | Online | — (OK / review) |
| `groups.pickBwc` | Pick registered BWC... | Pick Registered BWC... |
| `groups.saveGroup` | Save group | Save Group |
| `groups.saved` | Group saved. | Group Saved. |
| `groups.steps` | 1. Name and pin colour · 2. Add members · 3. Save group | — (OK / review) |
| `groups.title` | Dispatch Groups | — (OK / review) |
| `groups.view` | View | — (OK / review) |
| `groups.viewHint` | Members in this group (map pin colour matches the dot). | — (OK / review) |
| `header.appName` | Mobility Axiom | — (OK / review) |
| `header.appNameAccent` | Axiom | — (OK / review) |
| `header.appNamePrimary` | Mobility | — (OK / review) |
| `header.productTag` | Command and Control | — (OK / review) |
| `header.signedIn` | Signed in | — (OK / review) |
| `lab.intro` |  | (keep empty — teach strip off) |
| `lab.proxyHint` |  | (keep empty — teach strip off) |
| `lab.savedRestart` | Saved. Restart Mobility if proxy trust settings changed. | — (OK / review) |
| `lab.save` | Save Identity and Monitoring | — (OK / review) |
| `lab.section.oidc` | Single sign-on (OIDC) | — (OK / review) |
| `lab.section.monitoring` | Monitoring | — (OK / review) |
| `lab.section.notes` | Notes | — (OK / review) |
| `lab.oidc.enable` | Enable OIDC on the operator sign-in page | — (OK / review) |
| `lab.oidc.localLogin` | Keep local sign-in (emergency access) | Keep Local sign-in (Emergency Access) |
| `lab.oidc.issuer` | Issuer URL | — (OK / review) |
| `lab.oidc.clientId` | Client ID | — (OK / review) |
| `lab.oidc.clientSecret` | Client secret | Client Secret |
| `lab.oidc.scopes` | Scopes | — (OK / review) |
| `lab.oidc.adminGroups` | Admin groups (comma-separated) | Admin Groups (comma-separated) |
| `lab.oidc.operatorGroups` | Operator groups (comma-separated) | Operator Groups (comma-separated) |
| `lab.oidc.autoProvision` | Auto-provision new SSO users as operators | Auto-provision New SSO Users as Operators |
| `lab.oidc.test` | Test SSO connection | Test SSO Connection |
| `lab.metrics.enable` | Allow operations monitoring (metrics endpoint) | Allow Operations Monitoring (Metrics Endpoint) |
| `lab.metrics.token` | Metrics bearer token | Metrics Bearer Token |
| `lab.audit.token` | Audit export token (optional) | Audit Export Token (Optional) |
| `lab.health.test` | Test site health | Test Site Health |
| `lab.notes.placeholder` | Site, bid reference, SSO realm notes... | Site, Bid Reference, SSO Realm Notes... |
| `lang.en` | English | — (OK / review) |
| `lang.fil` | Filipino | — (OK / review) |
| `lang.id` | Indonesian | — (OK / review) |
| `lang.ko` | 한국어 | — (OK / review) |
| `lang.label` | Language | — (OK / review) |
| `lang.th` | Thai | — (OK / review) |
| `lang.zh` | 中文（简体） | — (OK / review) |
| `live.camera` | Camera | — (OK / review) |
| `live.documentTitle` | Live Video - Mobility Axiom | — (OK / review) |
| `live.duplicateSurfaceWarn` | Camera {camId} is live on Operations and the video wall in this window. For control rooms, use different cameras on each screen when possible. | — (OK / review) |
| `live.error.disconnected` | Disconnected from server | Disconnected from Server |
| `live.error.missingCamId` | Missing camId in URL | Missing Camid in URL |
| `live.playerFailed` | Player failed: {msg} | Player Failed: {msg} |
| `live.ready` | Ready | — (OK / review) |
| `live.starting` | Starting... | — (OK / review) |
| `live.unknownCamera` | Unknown | — (OK / review) |
| `login.documentTitle` | Sign in - Mobility Axiom | — (OK / review) |
| `login.errorInvalid` | Invalid sign-in. Try again. | — (OK / review) |
| `login.errorServer` | Could not reach server. | Could Not Reach Server. |
| `login.password` | Password | — (OK / review) |
| `login.showPassword` | Show | — (OK / review) |
| `login.hidePassword` | Hide | — (OK / review) |
| `login.signingIn` | Signing in... | — (OK / review) |
| `login.submit` | Sign in | — (OK / review) |
| `login.title` | Mobility Axiom | — (OK / review) |
| `login.totpBack` | Back | — (OK / review) |
| `login.totpCode` | Authenticator code | Authenticator Code |
| `login.totpError` | Invalid authenticator code. Try again. | — (OK / review) |
| `login.totpHint` | Enter the 6-digit code from your authenticator app. | — (OK / review) |
| `login.totpBackupHint` | Or enter a one-time backup code. | Or Enter a one-time Backup Code. |
| `login.totpSubmit` | Verify and sign in | Verify and Sign in |
| `login.totpVerifying` | Verifying... | — (OK / review) |
| `login.user` | User | — (OK / review) |
| `login.hintPassword` | First install uses global123. After you change it, use your new password only. | — (OK / review) |
| `totpEnroll.backupHint` | Save these backup codes once. Each works one time if you lose your phone. | — (OK / review) |
| `totpEnroll.code` | 6-digit code | 6-digit Code |
| `totpEnroll.confirm` | Confirm and enable | Confirm and Enable |
| `totpEnroll.documentTitle` | Authenticator Setup - Mobility Axiom | — (OK / review) |
| `totpEnroll.error` | Could not complete setup. Check your password and code. | — (OK / review) |
| `totpEnroll.finish` | Continue to dashboard | Continue to Dashboard |
| `totpEnroll.manualSecret` | Manual key: | Manual Key: |
| `totpEnroll.password` | Your password | Your Password |
| `totpEnroll.scanHint` | Scan this QR in your authenticator app, then enter the 6-digit code. | — (OK / review) |
| `totpEnroll.start` | Show QR code | Show QR Code |
| `totpEnroll.startHint` | Use an authenticator app. Codes work offline. | — (OK / review) |
| `totpEnroll.title` | Set Up Authenticator | — (OK / review) |
| `mustChangePassword.confirm` | Confirm new password | Confirm New Password |
| `mustChangePassword.current` | Current password | Current Password |
| `mustChangePassword.documentTitle` | Change Password - Mobility Axiom | — (OK / review) |
| `mustChangePassword.error` | Could not change password. Check your entries. | — (OK / review) |
| `mustChangePassword.errorServer` | Could not reach server. | Could Not Reach Server. |
| `mustChangePassword.exampleHint` | Rules: at least 12 characters, with upper case, lower case, a number, and a symbol. Example you can type: Ab12cd34!@#$ | — (OK / review) |
| `mustChangePassword.hint` | First change uses the install password global123. Choose a new password that meets the rules. | — (OK / review) |
| `mustChangePassword.logout` | Sign out | Sign Out |
| `mustChangePassword.new` | New password | New Password |
| `mustChangePassword.pasteHint` | Do not paste into password fields - type the new password. | — (OK / review) |
| `mustChangePassword.saving` | Saving... | — (OK / review) |
| `mustChangePassword.submit` | Save and continue | Save and Continue |
| `mustChangePassword.title` | Change Your Password | — (OK / review) |
| `map.autoFacePlate` | Face Recognition / ANPR | — (OK / review) |
| `map.bringToFront` | Bring to front | Bring to Front |
| `map.clearGeofencing` | Clear geofencing | Clear Geofencing |
| `map.clusterNext` | Next | — (OK / review) |
| `map.clusterPrev` | Previous | — (OK / review) |
| `map.comingSoon` | Unavailable | — (OK / review) |
| `map.country.cn` | China - East/South ops | China - East/South Ops |
| `map.country.id` | Indonesia (Jakarta) | — (OK / review) |
| `map.country.kr` | Korea (Seoul) | — (OK / review) |
| `map.country.label` | Map Region | — (OK / review) |
| `map.country.ph` | Philippines (Manila) | — (OK / review) |
| `map.country.sg` | Singapore | — (OK / review) |
| `map.country.th` | Thailand (Bangkok) | — (OK / review) |
| `map.country.za` | South Africa - JHB · CPT | — (OK / review) |
| `map.fitPins` | Fit pins | Fit Pins |
| `map.fitPinsTitle` | Zoom map to show all pinned devices (or all on map if none pinned) | — (OK / review) |
| `map.placeSearch.placeholder` | City, address, country... | City, Address, Country... |
| `map.placeSearch.aria` | Search place | Search Place |
| `map.placeSearch.button` | Go | — (OK / review) |
| `map.placeSearch.buttonTitle` | Search Place and Fly Map | — (OK / review) |
| `map.placeSearch.searching` | Searching... | — (OK / review) |
| `map.placeSearch.noResults` | No places found. | No Places Found. |
| `map.placeSearch.offline` | Place search needs internet - pan/zoom manually or use Fit pins. | — (OK / review) |
| `map.placeSearch.failed` | Search failed. Try again. | — (OK / review) |
| `map.placeSearch.rateLimited` | Too many searches - wait a moment. | — (OK / review) |
| `map.placeSearch.queryTooShort` | Enter at least 2 characters. | Enter at Least 2 Characters. |
| `map.placeSearch.queryTooLong` | Search text is too long. | Search Text Is Too Long. |
| `map.offline.packMissing` | Offline map pack missing - ask IT to install the offline map package. | — (OK / review) |
| `map.offline.pmtiles3d` | 3D buildings | 3d Buildings |
| `map.offline.pmtiles3dTitle` | Toggle offline PMTiles 3D building overlay (synced with map) | Toggle Offline Pmtiles 3d Building Overlay (Synced with Map) |
| `map.offline.pmtilesAttr` | OpenStreetMap · Protomaps (offline PMTiles) | Openstreetmap · Protomaps (Offline Pmtiles) |
| `map.offline.tilesAttr` | OpenStreetMap · offline tiles (local) | Openstreetmap · Offline Tiles (Local) |
| `map.attribution.offline` | © <a href=\"https://www.openstreetmap.org/copyright\" target=\"_blank\" rel=\"noopener noreferrer\">OpenStreetMap</a> contributors · Carto · offline tiles (local) | — (OK / review) |
| `map.attribution.online` | © <a href=\"https://www.openstreetmap.org/copyright\" target=\"_blank\" rel=\"noopener noreferrer\">OpenStreetMap</a> · <a href=\"https://openmaptiles.org/\" target=\"_blank\" rel=\"noopener noreferrer\">OpenMapTiles</a> | — (OK / review) |
| `map.geofencePermDenied` | Geofencing permission not granted for your account. | — (OK / review) |
| `map.gpsPending` | Awaiting GPS: {names} - enable GPS on BWC | — (OK / review) |
| `map.legend.aria` | Map pin colours | Map PIN Colours |
| `map.legend.geofenceOut` | Outside geofence | Outside Geofence |
| `map.legend.groups` | Map groups | Map Groups |
| `map.legend.offlineLast` | Offline (last location) | Offline (Last Location) |
| `map.legend.sosAlarm` | SOS alarm | SOS Alarm |
| `map.permBox` | Permission | — (OK / review) |
| `map.permDenied` | Remote control permission not granted for your account. | — (OK / review) |
| `map.permGrantSteps` | Ask your super admin to open Server Config -> Dashboard Authentication, set your row, and click Save. | — (OK / review) |
| `map.permHint` | Remote control permission not granted. Click Permission for how to get access. | — (OK / review) |
| `map.pin.bwcOffline` | BWC Offline | — (OK / review) |
| `map.pin.expand` | Expand | — (OK / review) |
| `map.pin.fall` | Fall | — (OK / review) |
| `map.pin.geofenceOut` | OUT | — (OK / review) |
| `map.pin.livePlaceholder` | ▶ Live video | ▶ Live Video |
| `map.pin.minimize` | Minimize | — (OK / review) |
| `map.pin.offline` | Offline | — (OK / review) |
| `map.pin.online` | Online | — (OK / review) |
| `map.pin.patrol` | Patrol | — (OK / review) |
| `map.pin.recBoth` | ● REC | — (OK / review) |
| `map.pin.recSd` | ● REC | — (OK / review) |
| `map.pin.recServer` | ● SRV REC | — (OK / review) |
| `map.pin.sos` | SOS | — (OK / review) |
| `map.pin.wallBadge` | Pin closed | PIN Closed |
| `map.pin.wallStillLive` | Pin closed - video still live on wall | — (OK / review) |
| `map.pinStackHint` | Stacked | — (OK / review) |
| `map.popoutBarTitle` | Mobility Axiom - Map | — (OK / review) |
| `map.popoutMirrorHint` | Display only | Display Only |
| `map.popoutMirrorVideoHint` | Live video on main console | Live Video on Main Console |
| `map.popoutTv` | Wall Map | — (OK / review) |
| `map.radiusMetres` | Radius (metres) | Radius (Metres) |
| `map.resetLayout` | Reset layout | Reset Layout |
| `map.serverRecordStarted` | Server recording started: {file} | Server Recording Started: {file} |
| `map.serverRecordStopped` | Server recording saved. Evidence ID: {id} | — (OK / review) |
| `map.serverRecordStoppedPending` | Server recording stopped. File is being finalized. | — (OK / review) |
| `map.confirmLock` | Lock BWC {id}? The officer cannot use the device until unlock. | — (OK / review) |
| `map.confirmUnlock` | Unlock BWC {id}? | Unlock BWC {iD}? |
| `map.confirmReboot1` | Reboot BWC {id}? Live video and recording will stop. | — (OK / review) |
| `map.confirmReboot2` | Confirm reboot - the device will restart now. | — (OK / review) |
| `map.confirmShutdown1` | Shut down BWC {id}? The device will power off. | — (OK / review) |
| `map.confirmShutdown2` | Confirm shut down - power on again at the device. | — (OK / review) |
| `map.killSwitchDenied` | Shut down and reboot require the device kill switch permission. | — (OK / review) |
| `map.killSwitch.reasonTitle` | Operational Reason Required | — (OK / review) |
| `map.killSwitch.reasonHint` | Reason required (min 10 characters). | Reason Required (Min 10 Characters). |
| `map.killSwitch.reasonLabel` | Operational Reason | — (OK / review) |
| `map.killSwitch.reasonMinHint` | {count} / {min} minimum | {count} / {min} Minimum |
| `map.killSwitch.incidentLabel` | Ticket / Incident Ref | — (OK / review) |
| `map.killSwitch.incidentPh` | e.g. INC-20481 | — (OK / review) |
| `map.killSwitch.incidentToggle` | + Add ticket reference (optional) | + Add Ticket Reference (Optional) |
| `map.killSwitch.incidentHide` | Hide ticket reference | Hide Ticket Reference |
| `map.killSwitch.reasonTooShort` | Enter at least {min} characters explaining this action. | — (OK / review) |
| `map.killSwitch.submit` | Send command | Send Command |
| `map.killSwitch.titleLock` | Lock device - reason required | Lock Device - Reason Required |
| `map.killSwitch.titleReboot` | Reboot device - reason required | Reboot Device - Reason Required |
| `map.killSwitch.titleShutdown` | Shut down device - reason required | Shut Down Device - Reason Required |
| `map.killSwitch.fourEyesTitle` | Kill Switch - Awaiting Supervisor Approval | — (OK / review) |
| `map.killSwitch.fourEyesReasonHint` | Reboot and shut down need a kill switch approver. Enter a reason (minimum 10 characters). Ticket reference is optional. | — (OK / review) |
| `map.killSwitch.fourEyesRequested` | Kill switch request submitted. A supervisor with Kill Switch Approver must approve within 5 minutes. | — (OK / review) |
| `map.killSwitch.fourEyesApproved` | Kill switch approved and command sent. | Kill Switch Approved and Command Sent. |
| `map.killSwitch.fourEyesCancelled` | Kill switch request cancelled. | Kill Switch Request Cancelled. |
| `map.killSwitch.fourEyesDenied` | Kill switch request was denied. | Kill Switch Request Was Denied. |
| `map.killSwitch.overrideExecuted` | Command executed and logged (Super Admin Override). | — (OK / review) |
| `map.killSwitch.approve` | Approve | — (OK / review) |
| `map.killSwitch.confirmApprove` | Approve this kill switch command and send it to the BWC now? | — (OK / review) |
| `map.killSwitch.confirmCancel` | Cancel your pending kill switch request? | Cancel Your Pending Kill Switch Request? |
| `map.killSwitch.requestedBy` | Requested by {user} | — (OK / review) |
| `map.killSwitch.expiresIn` | Expires in {time} | — (OK / review) |
| `map.lockDevice` | Lock device | Lock Device |
| `map.unlockDevice` | Unlock | — (OK / review) |
| `map.rebootDevice` | Reboot | — (OK / review) |
| `map.shutdownDevice` | Shut down | Shut Down |
| `map.setGeofencing` | Set geofencing | Set Geofencing |
| `map.snapshot` | Snapshot | — (OK / review) |
| `map.soon` | Soon | — (OK / review) |
| `map.startSdRecord` | Start SD record | Start SD Record |
| `map.startServerRecord` | Record to server | Record to Server |
| `map.stopSdRecord` | Stop SD record | Stop SD Record |
| `map.stopServerRecord` | Stop server record | Stop Server Record |
| `map.telemetry.audioRec` | Audio rec | Audio Rec |
| `map.telemetry.battery` | Battery | — (OK / review) |
| `map.telemetry.call` | Call | — (OK / review) |
| `map.telemetry.callActive` | Active | — (OK / review) |
| `map.telemetry.callIdle` | Idle | — (OK / review) |
| `map.telemetry.deviceTime` | Device time | Device Time |
| `map.telemetry.heartbeat` | Heartbeat | — (OK / review) |
| `map.telemetry.sdRecord` | SD record | SD Record |
| `map.telemetry.signal` | Signal | — (OK / review) |
| `map.telemetry.status` | Status | — (OK / review) |
| `map.telemetry.title` | Device Status | — (OK / review) |
| `map.telemetry.volume` | Volume | — (OK / review) |
| `map.toolbar.noOnline` | No BWCs online | No BWCs Online |
| `map.toolbar.selectBwc` | Select BWC... | — (OK / review) |
| `map.toolbar.selectBwcAria` | BWC online | BWC Online |
| `map.toolbar.selectBwcTitle` | Select online BWC, then use Snapshot or SD record | Select Online BWC, Then Use Snapshot or SD Record |
| `map.toolbar.selectFirst` | Select an online BWC from the list first. | — (OK / review) |
| `map.toolbar.thenActions` | Then use actions | Then Use Actions |
| `matrix.documentTitle` | Video Matrix - Mobility Axiom | — (OK / review) |
| `matrix.meta` | {n} Panel(S) | — (OK / review) |
| `matrix.noVideo` | No live video on this panel | No Live Video on This Panel |
| `matrix.openerClosed` | Dashboard window closed - close this matrix. | — (OK / review) |
| `matrix.title` | Video Matrix | — (OK / review) |
| `messages.chatOnlineAria` | Online BWCs | — (OK / review) |
| `messages.chatThreadsAria` | Open chats | Open Chats |
| `messages.clearConfirm` | Clear messages for this BWC? This cannot be undone. | — (OK / review) |
| `messages.clearFailed` | Could not clear messages. Restart the Axiom server and try again. | — (OK / review) |
| `messages.clearThread` | Clear thread | Clear Thread |
| `messages.cleared` | Messages cleared. | Messages Cleared. |
| `messages.device` | Device | — (OK / review) |
| `messages.emptyThread` | No messages yet | No Messages Yet |
| `messages.fromBwc` | Message from BWC | — (OK / review) |
| `messages.noOnline` | No BWC online | No BWC Online |
| `messages.onlinePick` | Online | — (OK / review) |
| `messages.pickAlert` | Select a BWC above to send a message | — (OK / review) |
| `messages.pickThread` | Message from BWC | — (OK / review) |
| `messages.placeholder` | Message to BWC... | — (OK / review) |
| `messages.retentionHint` |  | (keep empty — teach strip off) |
| `messages.send` | Send | — (OK / review) |
| `messages.title` | Messages | — (OK / review) |
| `messages.you` | You | — (OK / review) |
| `nav.auditTrail` | Audit Trail | — (OK / review) |
| `nav.analytics` | Analytics | — (OK / review) |
| `nav.tactical` | Tactical | — (OK / review) |
| `nav.centreSummary` | Centre Summary | — (OK / review) |
| `nav.commandWall` | Command Wall | — (OK / review) |
| `nav.cadRms` | CAD/RMS | — (OK / review) |
| `cad.upsellTitle` | Advanced CAD/RMS Integration | — (OK / review) |
| `cad.upsellBody` | Unlock enterprise-grade Computer-Aided Dispatch and Records Management System capabilities. Seamlessly integrate your operational workflows, dispatch routing, and incident reporting directly into the Mobility Axiom platform. | — (OK / review) |
| `cad.upsellAction` | Contact Sales / Admin to Upgrade | — (OK / review) |
| `nav.evidenceDocking` | Evidence and Docking | — (OK / review) |
| `nav.operations` | Operations | — (OK / review) |
| `nav.server` | Server | — (OK / review) |
| `nav.settings` | Settings | — (OK / review) |
| `tactical.drawCircle` | Circle | — (OK / review) |
| `tactical.zoneCircle` | Zone circle | Zone Circle |
| `tactical.drawDelete` | Delete | — (OK / review) |
| `tactical.drawEdit` | Edit | — (OK / review) |
| `tactical.drawPolygon` | Polygon | — (OK / review) |
| `tactical.drawTitle` | Draw | — (OK / review) |
| `tactical.prepareTitle` | PREPARE | Prepare |
| `tactical.prepareHint` | Floor plan · place pins · link cams | — (OK / review) |
| `tactical.bpTitle` | Floor Plan | — (OK / review) |
| `tactical.bpHint` | JPEG / PNG / WebP · max 25 MB | — (OK / review) |
| `tactical.bpName` | Plan name | Plan Name |
| `tactical.bpChoose` | Choose file | Choose File |
| `tactical.bpUpload` | Upload | — (OK / review) |
| `tactical.bpSelect` | Saved plans | Saved Plans |
| `tactical.bpShow` | Show on map | Show on Map |
| `tactical.bpHide` | Hide plan | Hide Plan |
| `tactical.bpClear` | Clear from map | Clear from Map |
| `tactical.bpCleared` | Plan cleared from map | Plan Cleared from Map |
| `tactical.bpRemove` | Remove plan | Remove Plan |
| `tactical.bpRemoveConfirm` | Remove “{name}” from this site? This cannot be undone. | — (OK / review) |
| `tactical.bpRemoving` | Removing plan... | Removing Plan... |
| `tactical.bpRemoved` | Plan removed | Plan Removed |
| `tactical.bpRemoveFail` | Could not remove plan | Could Not Remove Plan |
| `tactical.bpNeedRestart` | Restart Axiom, hard-refresh (Ctrl+F5), then try again. | — (OK / review) |
| `tactical.bpSessionExpired` | Session expired - sign in again | Session Expired - Sign in Again |
| `tactical.bpForbidden` | Super Admin required for floor plans | Super Admin Required for Floor Plans |
| `tactical.bpCatalogBusy` | Catalog not ready - wait a moment and try again | — (OK / review) |
| `tactical.bpUploading` | Uploading... | — (OK / review) |
| `tactical.bpUploadOk` | Uploaded - showing on map | Uploaded - Showing on Map |
| `tactical.bpUploadFail` | Upload failed | Upload Failed |
| `tactical.bpNeedSelect` | Pick a saved plan first | Pick a Saved Plan First |
| `tactical.bpShown` | Plan on map | Plan on Map |
| `tactical.bpShowFail` | Could not show plan | Could Not Show Plan |
| `tactical.bpHidden` | Plan hidden | Plan Hidden |
| `tactical.bpListFail` | Could not load plans | Could Not Load Plans |
| `tactical.bpAdjust` | Adjust | — (OK / review) |
| `tactical.bpAdjustHint` | Drag plan · pull corners to size · Save placement | — (OK / review) |
| `tactical.bpAdjustOff` | Adjust off | Adjust Off |
| `tactical.bpOpacity` | Opacity | — (OK / review) |
| `tactical.bpSavePlace` | Save placement | Save Placement |
| `tactical.bpSaving` | Saving placement... | Saving Placement... |
| `tactical.bpSaved` | Placement saved | Placement Saved |
| `tactical.bpSaveFail` | Could not save placement | Could Not Save Placement |
| `tactical.bpNeedOnMap` | Show a plan on the map first | — (OK / review) |
| `tactical.bpShownPlaced` | Plan on map (saved place) | Plan on Map (Saved Place) |
| `tactical.operateTitle` | OPERATE | Operate |
| `tactical.operateHint` | During ops · select zone · pin video in zone (max 8) | — (OK / review) |
| `tactical.arOpenSplit` | Overwatch (AR) | — (OK / review) |
| `tactical.arClose` | Close Overwatch | — (OK / review) |
| `tactical.arCamera` | Overview Camera | — (OK / review) |
| `tactical.arPreset` | Saved View | — (OK / review) |
| `tactical.arLockPreset` | Use This View | — (OK / review) |
| `tactical.arStartLive` | Live | — (OK / review) |
| `tactical.arStatusIdle` | Overwatch idle - use a saved view to show markers | — (OK / review) |
| `tactical.arStatusUnlocked` | Camera moved - markers hidden | Camera Moved - Markers Hidden |
| `tactical.arStatusConnecting` | Connecting live... | Connecting Live... |
| `tactical.arStatusNoPlayer` | Live video player unavailable | Live Video Player Unavailable |
| `tactical.arStatusLockedLive` | Live + view locked - markers on | — (OK / review) |
| `tactical.arStatusLiveNeedLock` | Live - press Use This View to show markers | — (OK / review) |
| `tactical.arStatusFail` | Video unavailable | Video Unavailable |
| `tactical.arStatusNoPresets` | No saved views on this camera | No Saved Views on This Camera |
| `tactical.arNoCam` | No Overview Cameras | — (OK / review) |
| `tactical.arCurrentView` | Current View | — (OK / review) |
| `tactical.arPromote` | Promote | — (OK / review) |
| `tactical.arStatusCurrentView` | No saved PTZ views - Current View available | — (OK / review) |
| `tactical.arStatusSwitching` | Switching saved view... | Switching Saved View... |
| `tactical.arStatusPromoting` | Switching focus... | Switching Focus... |
| `tactical.arStatusPickPreset` | Pick a camera and saved view first | — (OK / review) |
| `tactical.arStatusLocked` | Using {name} - markers on ({n}) | Using {name} - Markers on ({n}) |
| `tactical.arStatusGotoFail` | Could not go to saved view | Could Not Go to Saved View |
| `tactical.arStatusCamChanged` | Camera changed - use a saved view again | — (OK / review) |
| `tactical.arStatusPresetChanged` | Saved View changed - press Use This View | — (OK / review) |
| `tactical.arBubble` | Live | — (OK / review) |
| `tactical.owAzimuth` | Heading | — (OK / review) |
| `tactical.owFov` | FOV | — (OK / review) |
| `tactical.owSaveView` | Save View | — (OK / review) |
| `tactical.owViewName` | View Name | — (OK / review) |
| `tactical.owManualBanner` | Manual Control Active - Overlays Suspended. Select a View to restore. | — (OK / review) |
| `tactical.grabCircle` | Select zone | Select Zone |
| `tactical.openGrabbed` | Open cameras | Open Cameras |
| `tactical.openGrabbedHint` | Open POIs / BWC in the select zone on pins (max 8; stacked GPS fans L/R/T/B) | — (OK / review) |
| `tactical.grabPrev` | Prev | — (OK / review) |
| `tactical.grabNext` | Next | — (OK / review) |
| `tactical.bannerIdle` | Idle - drag map to move | Idle - Drag Map to Move |
| `tactical.bannerPlace` | PREPARE - click map to place pin | — (OK / review) |
| `tactical.bannerGrab` | OPERATE - drag on map to draw a select zone | — (OK / review) |
| `tactical.bannerZoneDraw` | ZONES - draw on map | ZONES - Draw on Map |
| `tactical.bannerZoneEdit` | ZONES - edit shape | ZONES - Edit Shape |
| `tactical.bannerZoneDelete` | ZONES - click shape to delete | ZONES - Click Shape to Delete |
| `tactical.grabReady` | Select zone ready - tap Open cameras | — (OK / review) |
| `tactical.incidentId` | Incident ID | — (OK / review) |
| `tactical.incidentTitle` | Incident | — (OK / review) |
| `tactical.noZones` | No zones | No Zones |
| `tactical.saveZone` | Save zone | Save Zone |
| `tactical.openInCircle` | Open in circle | Open in Circle |
| `tactical.openInCircleHint` | Draw a circle, then open POIs / cams inside (max 8) | — (OK / review) |
| `tactical.circleNeedCircle` | Draw a select zone first (OPERATE -> Select zone) | — (OK / review) |
| `tactical.poiSelectedHint` | Selected: {name} · drag pin to move · Delete to remove · link: {link} | — (OK / review) |
| `tactical.poiDragPinHint` | Drag pin to move | Drag PIN to Move |
| `tactical.poiPopupPinHint` | Drag the map pin to change place · this bar moves video only | — (OK / review) |
| `tactical.poiRowHint` | drag pin to move | Drag PIN to Move |
| `tactical.poiDeleteShort` | Delete | — (OK / review) |
| `tactical.poiDeleteConfirm` | Remove {name} from the map? | Remove {name} from the Map? |
| `tactical.poiStatusDragging` | Dragging POI - drop to save place | — (OK / review) |
| `tactical.poiKindsHint` | BWC pins follow GPS · prepared / fixed pins stay until you drag or delete | — (OK / review) |
| `tactical.poiStop` | Stop | — (OK / review) |
| `tactical.circleNeedModule` | POI module not loaded | POI Module Not Loaded |
| `tactical.circleNoneIn` | Nothing in this circle - place POIs or check cam GPS | — (OK / review) |
| `tactical.circleNoneOnline` | No online cams in circle | No Online Cams in Circle |
| `tactical.circleOpenedOk` | Opened {opened} | — (OK / review) |
| `tactical.circleOpenedWallFull` | Opened {opened} of {total} - wall full | — (OK / review) |
| `tactical.circleOpenedOffline` | Opened {opened} ({offline} offline skipped) | Opened {opened} ({offline} Offline Skipped) |
| `tactical.circleOpenedPinsOk` | Opened {opened} on pins | Opened {opened} on Pins |
| `tactical.circleOpenedPinsCap` | Opened {opened} on pins (cap {cap}) | Opened {opened} on Pins (Cap {cap}) |
| `tactical.circleOpenedPinsSpider` | Opened {opened} on pins (GPS near - fanned L/R/T/B) | — (OK / review) |
| `tactical.circleOpenedPinsCycle` | Opened {opened} on pins · {total} in zone - use Prev/Next | — (OK / review) |
| `tactical.grabCycleLabel` | {from}-{to} of {total} on PINs | {from}-{to} of {total} on Pins |
| `tactical.grabCycleMoved` | Pin page {page} of {pages} | PIN Page {page} of {pages} |
| `tactical.poiDragHint` | Drag to move video | Drag to Move Video |
| `tactical.pinMountCount` | {bwc} BWC · {poi} POI on map | — (OK / review) |
| `tactical.pinMountEmpty` | No GPS units on map - check BWC GPS or Place POI | — (OK / review) |
| `tactical.pinMountEmptyMap` | No GPS units - Place POI or wait for BWC GPS | — (OK / review) |
| `tactical.pinMountOpsButEmpty` | Ops has {n} GPS pins - Tactical mount failed (see console) | — (OK / review) |
| `tactical.pinMountError` | Pin mount error - see console | PIN Mount Error - See Console |
| `tactical.statusDeleting` | Deleting | — (OK / review) |
| `tactical.statusDeleted` | Deleted | — (OK / review) |
| `tactical.statusDrawing` | Drawing | — (OK / review) |
| `tactical.statusEditing` | Editing | — (OK / review) |
| `tactical.statusIdle` | Idle - drag map to move | Idle - Drag Map to Move |
| `tactical.statusNeedIncident` | Need incident | Need Incident |
| `tactical.statusNeedShape` | Need shape | Need Shape |
| `tactical.statusReadySave` | Ready to save | Ready to Save |
| `tactical.statusSaved` | Saved | — (OK / review) |
| `tactical.kindCircle` | Circle | — (OK / review) |
| `tactical.kindPolygon` | Polygon | — (OK / review) |
| `tactical.kindShape` | Shape | — (OK / review) |
| `tactical.zonesTitle` | Zones | — (OK / review) |
| `nav.techAdmin` | Tech Admin | — (OK / review) |
| `nav.videoConference` | Video Conference | — (OK / review) |
| `analytics.gateTitle` | Analytics Modules Not Licensed | — (OK / review) |
| `analytics.gateBody` | Face recognition, ANPR, and weapon detection are optional modules. Contact your administrator to enable them on this server. | — (OK / review) |
| `analytics.popoutBarTitle` | Mobility Axiom - Face Watch | — (OK / review) |
| `analytics.popoutDeskHint` | Map and dispatch stay on the Operations dashboard | — (OK / review) |
| `analytics.navFace` | Face Recognition | — (OK / review) |
| `analytics.fr.subLive` | Live Watch | — (OK / review) |
| `analytics.navVerify` | Verify 1:1 | — (OK / review) |
| `analytics.navBlacklist` | Watchlist | — (OK / review) |
| `analytics.navWatchlist` | Watchlist | — (OK / review) |
| `analytics.navAnpr` | ANPR | — (OK / review) |
| `analytics.navWeapon` | Weapon Detection | — (OK / review) |
| `analytics.fr.railExpandHint` | Open high-resolution inspect | Open high-resolution Inspect |
| `analytics.moduleNotLicensed` | Module not licensed | Module Not Licensed |
| `analytics.fr.layoutHint` | 6 live tiles · up to 32 in watch set · rotate ~20s (all selected get scanned) | — (OK / review) |
| `analytics.fr.threshold` | Match threshold | Match Threshold |
| `analytics.fr.loadVideo` | Load video (offline) | Load Video (Offline) |
| `analytics.fr.offlineDropHint` | Upload a video to scan faces offline. Preview plays here. | — (OK / review) |
| `analytics.fr.offlineCancel` | Cancel | — (OK / review) |
| `analytics.fr.offlineUploading` | Uploading video... | Uploading Video... |
| `analytics.fr.offlineWorking` | Processing video... | Processing Video... |
| `analytics.fr.offlineDone` | Offline video done. | Offline Video Done. |
| `analytics.fr.offlineCancelled` | Offline video cancelled. | Offline Video Cancelled. |
| `analytics.fr.offlineFail` | Offline video failed. | Offline Video Failed. |
| `analytics.fr.tileIdle` | Waiting | — (OK / review) |
| `analytics.fr.tileIdleHint` | Select officers/cameras and Start watch | Select Officers/Cameras and Start Watch |
| `analytics.fr.tileWaiting` | Waiting for slot | Waiting for Slot |
| `analytics.fr.tileConnecting` | Connecting... | — (OK / review) |
| `analytics.fr.tileOffline` | BWC offline | BWC Offline |
| `analytics.fr.tileNoSignal` | No video signal | No Video Signal |
| `analytics.fr.tileSignalLost` | Signal lost - retrying... | Signal Lost - Retrying... |
| `analytics.fr.tileStreamError` | Stream error | Stream Error |
| `analytics.fr.tileInviteFailed` | Could not start live | Could Not Start Live |
| `analytics.fr.tileLiveCap` | Server live limit - pause other views | — (OK / review) |
| `analytics.fr.tilePlayerError` | Player unavailable | Player Unavailable |
| `analytics.fr.tileSosBadge` | SOS | — (OK / review) |
| `analytics.fr.tileFallBadge` | FALL | — (OK / review) |
| `analytics.fr.tileSosBadgeTitle` | SOS Alert on This BWC | — (OK / review) |
| `analytics.fr.tileFallBadgeTitle` | Fall Alert on This BWC | — (OK / review) |
| `analytics.fr.tileError` | Stream error | Stream Error |
| `analytics.fr.watchStub` | Select up to 32 online BWCs. Only 4 show live at a time (saves decode). Face scan runs on the live tiles; rotate brings every selected BWC onto a tile so all get scanned over time - not only the first 4. | — (OK / review) |
| `analytics.fr.watchStart` | Start watch | Start Watch |
| `analytics.fr.watchStop` | Stop video | Stop Video |
| `analytics.fr.stopVideo` | Stop video | Stop Video |
| `analytics.fr.stopVideoNeedFocus` | Click a live tile first, then Stop video | — (OK / review) |
| `analytics.fr.stopVideoSlotSelected` | Selected slot {n} - {name}. Press Stop video. | — (OK / review) |
| `analytics.fr.stopAll` | Stop all | Stop All |
| `analytics.fr.stopAllConfirm` | Stop all video and clear the watch set? | — (OK / review) |
| `analytics.fr.tileStop` | Stop this tile | Stop This Tile |
| `analytics.fr.watchMeta` | {n} selected · {live} live | {n} Selected · {live} Live |
| `analytics.fr.rosterMeta` | {n}/{max} selected · {live}/{slots} live | {n}/{max} Selected · {live}/{slots} Live |
| `analytics.fr.rosterTitle` | Watch Roster | — (OK / review) |
| `analytics.fr.rosterSearch` | Search officers... | Search Officers... |
| `analytics.fr.rosterFilterAll` | All | — (OK / review) |
| `analytics.fr.rosterFilterOnline` | Online | — (OK / review) |
| `analytics.fr.rosterFilterSelected` | In watch | In Watch |
| `analytics.fr.rosterFilterOffline` | Offline | — (OK / review) |
| `analytics.fr.groupOnline` | {online}/{total} online | {online}/{total} Online |
| `analytics.fr.groupInWatch` | {n} in watch | {n} in Watch |
| `analytics.fr.rosterExpandGroup` | Expand group | Expand Group |
| `analytics.fr.rosterCollapseGroup` | Collapse group | Collapse Group |
| `analytics.fr.watchSetFull` | Watch set full (32 max) | Watch Set Full (32 Max) |
| `analytics.fr.rosterColWatchShort` | W | — (OK / review) |
| `analytics.fr.rosterColPinShort` | P | — (OK / review) |
| `analytics.fr.rosterColStatusShort` | St | — (OK / review) |
| `analytics.fr.tileBadge` | Live {n} | — (OK / review) |
| `analytics.fr.rotateBadge` | Rotate | — (OK / review) |
| `analytics.fr.clearWatch` | Clear | — (OK / review) |
| `analytics.fr.clearWatchConfirm` | Stop video and clear all selected BWCs? | — (OK / review) |
| `analytics.fr.rosterGroups` | groups | Groups |
| `analytics.fr.rosterNoFleet` | No BWCs registered. | No BWCs Registered. |
| `analytics.fr.rosterNoMatch` | No BWCs match this filter. | No BWCs Match This Filter. |
| `analytics.fr.rosterColWatch` | Watch | — (OK / review) |
| `analytics.fr.rosterColPin` | Pin | PIN |
| `analytics.fr.rosterColStatus` | St | — (OK / review) |
| `analytics.fr.rosterColName` | Officer / BWC | — (OK / review) |
| `analytics.fr.rosterColTile` | Tile | — (OK / review) |
| `analytics.fr.rosterFocus` | Focus | — (OK / review) |
| `analytics.fr.watchCap` | Max 32 · 6 live · rotate 20s | — (OK / review) |
| `analytics.fr.watchEmpty` | No online BWCs right now. | No Online BWCs Right Now. |
| `analytics.fr.pin` | Pin | PIN |
| `analytics.fr.unpin` | Unpin | — (OK / review) |
| `analytics.fr.pinHint` | Pin to a live tile (skip rotate) | — (OK / review) |
| `analytics.fr.snapshot` | Snapshot | — (OK / review) |
| `analytics.fr.snapshotGrid` | Snapshot (8) | — (OK / review) |
| `analytics.fr.snapshotGrid16` | Snapshot (16) | — (OK / review) |
| `analytics.fr.snapshotRecent` | Recent | — (OK / review) |
| `analytics.fr.matchesShort` | Known subjects | Known Subjects |
| `analytics.fr.subjectMatches` | Known subjects | Known Subjects |
| `analytics.fr.subjectMatchesSub` | Watchlist · threshold met · not all alerts | — (OK / review) |
| `analytics.fr.subjectMatchesOverflow` | +{n} | — (OK / review) |
| `analytics.fr.snapMetaBwc` | {name} · {cam} | — (OK / review) |
| `analytics.fr.snapMetaTime` | Time: {time} | — (OK / review) |
| `analytics.fr.snapMetaScore` | Match: {score}% | — (OK / review) |
| `analytics.fr.snapNoGps` | No GPS | — (OK / review) |
| `analytics.fr.snapGpsAt` | GPS {time} | — (OK / review) |
| `analytics.fr.snapCopyLoc` | Copy location | Copy Location |
| `analytics.fr.snapShowMap` | Show on map | Show on Map |
| `analytics.fr.snapMapPinTag` | FR snap | FR Snap |
| `analytics.fr.snapPlayFromHere` | Play from here | Play from Here |
| `analytics.fr.snapPlayBadge` | Play | — (OK / review) |
| `analytics.fr.snapPlayTitle` | Play · {name} @ {t}s | — (OK / review) |
| `analytics.fr.snapPlayGone` | Video no longer available. Load the file again. | — (OK / review) |
| `analytics.fr.snapKeep` | Keep | — (OK / review) |
| `analytics.fr.snapKeeping` | Saving for investigation... | Saving for Investigation... |
| `analytics.fr.snapKeptFolderHint` | Saved to Investigation holds (Evidence tab). | Saved to Investigation Holds (Evidence Tab). |
| `analytics.fr.snapKeptOk` | Snapshot kept | Snapshot Kept |
| `analytics.fr.snapKeepFail` | Nothing to keep | Nothing to Keep |
| `analytics.fr.snapKeepNoCrop` | No face crop for this pin - open the snap again to Keep | — (OK / review) |
| `analytics.fr.snapKeepCropGone` | Crop expired - open the snap again, then Keep | — (OK / review) |
| `analytics.fr.snapKeepSaveFail` | Could not save investigation hold | Could Not Save Investigation Hold |
| `analytics.fr.snapKeepNotLicensed` | Face recognition is not licensed - cannot Keep | — (OK / review) |
| `analytics.fr.snapKeptTitle` | Kept Snapshot | — (OK / review) |
| `analytics.fr.snapKeptTitleNamed` | Kept · {name} | — (OK / review) |
| `analytics.fr.snapFloatTitle` | Snapshot | — (OK / review) |
| `analytics.fr.snapFloatTitleNamed` | Snapshot · {name} | — (OK / review) |
| `analytics.fr.snapMinimize` | Minimize | — (OK / review) |
| `analytics.fr.snapExpand` | Expand | — (OK / review) |
| `analytics.fr.snapCopyOk` | Location copied | Location Copied |
| `analytics.fr.snapCopyFail` | Copy failed | Copy Failed |
| `analytics.fr.snapMapFail` | Could not open map | Could Not Open Map |
| `analytics.fr.railMatchBadge` | MATCH | — (OK / review) |
| `analytics.fr.alertDrawerTitle` | Face Match Alert | — (OK / review) |
| `analytics.fr.alertDrawerExpand` | Expand | — (OK / review) |
| `analytics.fr.alertDrawerContract` | Contract | — (OK / review) |
| `analytics.fr.alertDrawerVideoToggle` | Live preview | Live Preview |
| `analytics.fr.alertDrawerVideoSource` | BWC | — (OK / review) |
| `analytics.fr.alertDrawerVideoPh` | Live video placeholder | Live Video Placeholder |
| `analytics.fr.alertDrawerVideoHint` | Live stream connects in a later update | — (OK / review) |
| `analytics.fr.alertDrawerFieldSnap` | Field snap | Field Snap |
| `analytics.fr.alertDrawerWatchlist` | Watchlist | — (OK / review) |
| `analytics.fr.alertDrawerNoPhoto` | No photo | No Photo |
| `analytics.fr.alertDrawerMetaName` | Name | — (OK / review) |
| `analytics.fr.alertDrawerMetaScore` | Match | — (OK / review) |
| `analytics.fr.alertDrawerMetaBwc` | BWC | — (OK / review) |
| `analytics.fr.alertDrawerMetaTime` | Time | — (OK / review) |
| `analytics.fr.alertDrawerMetaGps` | GPS | — (OK / review) |
| `analytics.fr.alertDrawerGoMap` | Go to map | Go to Map |
| `analytics.fr.alertDrawerMap` | Go to map | Go to Map |
| `analytics.fr.previewDrawerLab` | Preview alert (lab) | Preview Alert (Lab) |
| `analytics.fr.previewToastLab` | Preview alert | Preview Alert |
| `analytics.fr.previewDrawerLabHint` | Layout preview only - not a real match | — (OK / review) |
| `analytics.fr.popoutGoOpsDesk` | Switched Operations on main dashboard | Switched Operations on Main Dashboard |
| `analytics.fr.popoutGoOpsNoDesk` | Open Operations on the main dashboard to view the map. | — (OK / review) |
| `analytics.fr.redToastTitle` | Face Match | — (OK / review) |
| `analytics.fr.redToastLine1` | {name} · {score}% | — (OK / review) |
| `analytics.fr.redToastLine2` | BWC {device} · {cam} | — (OK / review) |
| `analytics.fr.redToastGoMap` | Go to map | Go to Map |
| `analytics.fr.mapNoLocation` | No location for this unit | No Location for This Unit |
| `analytics.fr.mapLastKnownPosition` | Showing last known position | Showing Last Known Position |
| `analytics.fr.redToastShowLive` | Show live | Show Live |
| `analytics.fr.redToastShowLiveHint` | Live promote connects in Act 3 | Live Promote Connects in Act 3 |
| `analytics.fr.redToastOpenDetail` | Open detail | Open Detail |
| `analytics.fr.redToastMinimize` | Minimize to bar | Minimize to Bar |
| `analytics.fr.alertDrawerMeta` | {name} · {score}% · {cam} | — (OK / review) |
| `analytics.fr.blacklist` | Watchlist | — (OK / review) |
| `analytics.fr.blacklistStub` | Open the Watchlist tab to enroll ID photos. | — (OK / review) |
| `analytics.fr.watchlist` | Watchlist | — (OK / review) |
| `analytics.fr.watchlistStub` | Open the Watchlist tab to enroll ID photos. | — (OK / review) |
| `analytics.fr.alarmTitle` | Face Match | — (OK / review) |
| `analytics.fr.alarmAck` | Ack | — (OK / review) |
| `analytics.fr.alarmField` | Alert field | Alert Field |
| `analytics.fr.alarmFieldOk` | Field alert sent | Field Alert Sent |
| `analytics.fr.alarmFieldFail` | Field alert failed - BWC not on PTT or no SIP contact | — (OK / review) |
| `analytics.fr.alarmFieldCooldown` | Wait a few seconds before alerting again | — (OK / review) |
| `analytics.fr.alarmDismiss` | Dismiss | — (OK / review) |
| `analytics.fr.standbyPttTeam` | Standby PTT team | Standby PTT Team |
| `analytics.fr.standbyPttTeamTitle` | Push catching unit and nearby online BWCs to one PTT group (audio only) | — (OK / review) |
| `analytics.fr.standbyPttTeamOnBtn` | Standby PTT · ON | Standby PTT · on |
| `analytics.fr.standbyPttTeamOn` | Standby PTT ON - {n} unit(s): {names}. Hold PTT on map or wall. | — (OK / review) |
| `analytics.fr.standbyPttTeamOk` | Standby PTT ON - {names} ({n} units). Hold PTT to talk. | — (OK / review) |
| `analytics.fr.standbyPttPushing` | Pushing standby PTT team... | Pushing Standby PTT Team... |
| `analytics.fr.standbyPttFail` | Standby PTT push failed. | Standby PTT Push Failed. |
| `analytics.fr.standbyPttFailHint` | Is PTT enabled on server? | Is PTT Enabled on Server? |
| `analytics.fr.standbyPttNoHit` | No active FR hit. | No Active FR Hit. |
| `analytics.fr.standbyPttNoNearby` | No online nearby units within 500 m. | — (OK / review) |
| `analytics.fr.standbyPttNearestConfirm` | No unit inside 500 m. Push standby PTT to nearest ({name}, {dist} m GPS)? | — (OK / review) |
| `analytics.fr.hqBarLabel` | FR Hit | — (OK / review) |
| `analytics.fr.hqBarGoMap` | Go to map | Go to Map |
| `analytics.fr.hqBarOpen` | Open detail | Open Detail |
| `analytics.fr.hqBarText` | {name} · {cam} · {score}% | — (OK / review) |
| `voiceAlerts.phrase.frMatch` | Face match {name}, {score} percent | Face Match {name}, {score} Percent |
| `analytics.verify.hint` |  | (keep empty — teach strip off) |
| `analytics.verify.photoA` | Photo A | Photo a |
| `analytics.verify.photoB` | Photo B | — (OK / review) |
| `analytics.verify.run` | Run verify | Run Verify |
| `analytics.verify.clear` | Clear and Start Over | — (OK / review) |
| `analytics.verify.dropHint` | Select a photo to preview | Select a Photo to Preview |
| `analytics.verify.scoreLabel` | Match Score | — (OK / review) |
| `analytics.verify.scoreIdle` | Awaiting verify | Awaiting Verify |
| `analytics.verify.checking` | Checking FR Engine... | — (OK / review) |
| `analytics.verify.engineChecking` | Checking FR Engine... | — (OK / review) |
| `analytics.verify.serviceOk` | FR Engine - OK | — (OK / review) |
| `analytics.verify.engineOk` | FR Engine - OK | — (OK / review) |
| `analytics.verify.serviceDown` | Face matching is not available. Ask your administrator to start the face recognition service. | — (OK / review) |
| `analytics.verify.engineDown` | FR Engine - Not available | FR Engine - Not Available |
| `analytics.verify.notLicensed` | Face recognition is not licensed on this server. | — (OK / review) |
| `analytics.verify.engineNotLicensed` | FR Engine - Not licensed | FR Engine - Not Licensed |
| `analytics.verify.needTwo` | Select two photos to compare. | Select Two Photos to Compare. |
| `analytics.verify.running` | Comparing photos... | Comparing Photos... |
| `analytics.verify.match` | Match | — (OK / review) |
| `analytics.verify.nomatch` | No match | No Match |
| `analytics.verify.noFace` | No face found in one or both photos. Use a clear, front-facing picture. | — (OK / review) |
| `analytics.verify.qualityLow` | Photo quality is too low for a reliable check. Try a sharper, well-lit image. | — (OK / review) |
| `analytics.verify.busy` | Face matching is busy. Wait a moment and try again. | — (OK / review) |
| `analytics.verify.badFile` | Use a JPEG/PNG ID photo, or Add recent snapshots from BWC. | — (OK / review) |
| `analytics.verify.timeout` | Face matching took too long. Try again with smaller photos. | — (OK / review) |
| `analytics.verify.failed` | Face matching could not complete this check. Try again or contact your administrator. | — (OK / review) |
| `analytics.verify.network` | Could not reach the server. Check your connection and try again. | — (OK / review) |
| `analytics.bl.hint` | Enroll people on the Watchlist from a clear ID photo. Face matching must be running. | — (OK / review) |
| `analytics.bl.qualityHint` | Use a clear, front-facing ID photo with the face filling most of the frame. | — (OK / review) |
| `analytics.bl.name` | Display name | Display Name |
| `analytics.bl.idNumber` | ID / case ref (optional) | ID / Case Ref (Optional) |
| `analytics.bl.grade` | Watch grade | Watch Grade |
| `analytics.bl.gradePoi` | Person of interest | Person of Interest |
| `analytics.bl.gradeMonitoring` | On monitoring | On Monitoring |
| `analytics.bl.gradeSuspect` | Suspect | — (OK / review) |
| `analytics.bl.gradeBlacklist` | Blacklist | — (OK / review) |
| `analytics.bl.reason` | Reason | — (OK / review) |
| `analytics.bl.reasonTheft` | Theft | — (OK / review) |
| `analytics.bl.reasonAssault` | Assault / violence | Assault / Violence |
| `analytics.bl.reasonTrespass` | Trespass / banned | Trespass / Banned |
| `analytics.bl.reasonFraud` | Fraud | — (OK / review) |
| `analytics.bl.reasonSuspicious` | Suspicious behaviour | Suspicious Behaviour |
| `analytics.bl.reasonInvestigation` | Open investigation | Open Investigation |
| `analytics.bl.reasonOther` | Other | — (OK / review) |
| `analytics.bl.reasonOtherLabel` | Other Reason | — (OK / review) |
| `analytics.bl.needReasonOther` | Enter a short reason when Other is selected. | — (OK / review) |
| `analytics.bl.lastSeen` | Last seen (optional) | Last Seen (Optional) |
| `analytics.bl.lastSeenPh` | e.g. Gate B · 2026-07-09 | — (OK / review) |
| `analytics.bl.lastIncident` | Last incident (optional) | Last Incident (Optional) |
| `analytics.bl.lastIncidentPh` | e.g. Attempted entry without pass | — (OK / review) |
| `analytics.bl.notes` | Notes (optional) | Notes (Optional) |
| `analytics.bl.notesPh` | What operators should know... | What Operators Should Know... |
| `analytics.bl.photo` | Photo | — (OK / review) |
| `analytics.bl.cropOpen` | Crop and Check | — (OK / review) |
| `analytics.bl.cropTitle` | Crop Face for Watchlist | — (OK / review) |
| `analytics.bl.cropHint` | Frame one face. Green meters match our enroll rules. Built-in tool only - no third-party crop library. | — (OK / review) |
| `analytics.bl.cropCancel` | Cancel | — (OK / review) |
| `analytics.bl.cropFull` | Use full image | Use Full Image |
| `analytics.bl.cropCheck` | Check with face service | Check with Face Service |
| `analytics.bl.cropUse` | Use this crop | Use This Crop |
| `analytics.bl.cropChecking` | Checking with face service... | Checking with Face Service... |
| `analytics.bl.cropPass` | Passes enroll checks. | Passes Enroll Checks. |
| `analytics.bl.cropReady` | Drag the frame onto the face, then Check or Use this crop. | — (OK / review) |
| `analytics.bl.cropReadyPreview` | Crop ready for enroll | Crop Ready for Enroll |
| `analytics.bl.cropFirst` | Crop and Check the face first, then Add to watchlist. | — (OK / review) |
| `analytics.bl.cropNeedFile` | Choose a photo first. | Choose a Photo First. |
| `analytics.bl.cropNeedFace` | Enlarge the frame so the face area is at least 160 px. | — (OK / review) |
| `analytics.bl.cropExportFail` | Could not build crop image. | Could Not Build Crop Image. |
| `analytics.bl.cropFallback` | Crop tool unavailable - using full image. | — (OK / review) |
| `analytics.bl.meterFace` | Face frame (px) | Face Frame (Px) |
| `analytics.bl.meterImage` | Enroll image short side | Enroll Image Short Side |
| `analytics.bl.meterSharp` | Sharpness (approx) | Sharpness (Approx) |
| `analytics.bl.meterLuma` | Lighting (approx) | Lighting (Approx) |
| `analytics.bl.meterNote` | Approx meters are local. “Check with face service” uses the same gate as enroll. | — (OK / review) |
| `analytics.bl.enroll` | Add to watchlist | Add to Watchlist |
| `analytics.bl.enrolling` | Enrolling... | — (OK / review) |
| `analytics.bl.enrolled` | Added to watchlist. | Added to Watchlist. |
| `analytics.bl.searchPh` | Search name or ID... | Search Name or ID... |
| `analytics.bl.filterAll` | All grades | All Grades |
| `analytics.bl.refresh` | Refresh | — (OK / review) |
| `analytics.bl.migrate` | Re-embed gallery | Re-embed Gallery |
| `analytics.bl.migrating` | Re-embedding watchlist... | Re-embedding Watchlist... |
| `analytics.bl.matchDebug` | Score vs last snap | Score Vs Last Snap |
| `analytics.bl.matchDebugNeedEntry` | Open a watchlist person first. | Open a Watchlist Person First. |
| `analytics.bl.matchDebugRunning` | Checking... | — (OK / review) |
| `analytics.bl.matchDebugPlain` | Match: {pct}% · need {bar}% · {result} | — (OK / review) |
| `analytics.bl.matchDebugPass` | pass | Pass |
| `analytics.bl.matchDebugFail` | fail | Fail |
| `analytics.bl.matchDebugNoSnap` | No live face snap yet. Start watch, get a face on Recent, then try again. | — (OK / review) |
| `analytics.bl.matchDebugNoPrint` | This person has no face fingerprint yet. Use Re-embed gallery, then try again. | — (OK / review) |
| `analytics.bl.matchDebugLine` | Match: {pct}% · need {bar}% · {pass} | — (OK / review) |
| `analytics.bl.matchDebugFresh` | Match: {pct}% · need 70% · fail | — (OK / review) |
| `analytics.bl.matchDebugFreshErr` | Could not re-check enroll photo | Could Not re-check Enroll Photo |
| `analytics.bl.matchDebugCrop` |  | (keep empty — teach strip off) |
| `analytics.bl.migrateConfirm` | Re-embed all watchlist faces for the current FR engine? A backup of the gallery index is saved first. Photos are unchanged. Failures keep their old vectors. | — (OK / review) |
| `analytics.bl.migrateDone` | Gallery re-embed done: {migrated} updated, {skipped} skipped, {failed} failed (engine {engine}). | — (OK / review) |
| `analytics.bl.migrateFail` | Gallery re-embed failed. Check that the face service is running. | — (OK / review) |
| `analytics.bl.count` | {count} / {max} active | {count} / {max} Active |
| `analytics.bl.colFace` | Face | — (OK / review) |
| `analytics.bl.colName` | Name | — (OK / review) |
| `analytics.bl.colGrade` | Grade | — (OK / review) |
| `analytics.bl.colReason` | Reason | — (OK / review) |
| `analytics.bl.colId` | ID | — (OK / review) |
| `analytics.bl.colWhen` | Enrolled | — (OK / review) |
| `analytics.bl.colStatus` | Status | — (OK / review) |
| `analytics.bl.openPhoto` | Open enrolled photo | Open Enrolled Photo |
| `analytics.bl.closeDetail` | Close | — (OK / review) |
| `analytics.bl.enrolledBy` | Enrolled by | — (OK / review) |
| `analytics.bl.loading` | Loading... | — (OK / review) |
| `analytics.bl.empty` | No watchlist entries yet. | No Watchlist Entries Yet. |
| `analytics.bl.active` | Active | — (OK / review) |
| `analytics.bl.disabled` | Disabled | — (OK / review) |
| `analytics.bl.enable` | Enable | — (OK / review) |
| `analytics.bl.disable` | Disable | — (OK / review) |
| `analytics.bl.remove` | Remove | — (OK / review) |
| `analytics.bl.confirmRemove` | Remove this person from the watchlist? | Remove This Person from the Watchlist? |
| `analytics.bl.removed` | Removed from watchlist. | Removed from Watchlist. |
| `analytics.bl.needName` | Enter a display name. | Enter a Display Name. |
| `analytics.bl.multiFace` | More than one face was found. Use a photo with only one person, or crop to a single face. | — (OK / review) |
| `analytics.bl.faceTooSmall` | The face in this photo is too small. Crop closer so the face fills more of the picture, then try again. | — (OK / review) |
| `analytics.bl.imageTooSmall` | This photo is too low-resolution. Use a clearer, larger photo (at least about 480×480 pixels). | — (OK / review) |
| `analytics.bl.qualityBlur` | This photo looks too blurry for a reliable enroll. Use a sharper picture. | — (OK / review) |
| `analytics.bl.qualityLighting` | This photo is too dark or too bright on the face. Use a clearer, evenly lit picture. | — (OK / review) |
| `analytics.bl.full` | Watchlist is full. Disable or remove an entry before adding another. | — (OK / review) |
| `analytics.bl.notFound` | That watchlist entry was not found. | That Watchlist Entry Was Not Found. |
| `analytics.anprComing` | ANPR module - coming when licensed. | ANPR Module - Coming When Licensed. |
| `analytics.anpr.hint` |  | (keep empty — teach strip off) |
| `analytics.anpr.photoLabel` | Photo | — (OK / review) |
| `analytics.anpr.dropHint` | Select a photo to preview | Select a Photo to Preview |
| `analytics.anpr.resultLabel` | Plate Read | — (OK / review) |
| `analytics.anpr.plateIdle` | Awaiting read | Awaiting Read |
| `analytics.anpr.crop` | Crop | — (OK / review) |
| `analytics.anpr.read` | Read plate | Read Plate |
| `analytics.anpr.clear` | Clear and Start Over | — (OK / review) |
| `analytics.anpr.checking` | Checking ANPR Engine... | — (OK / review) |
| `analytics.anpr.engineChecking` | Checking ANPR Engine... | — (OK / review) |
| `analytics.anpr.serviceOk` | ANPR Engine - OK | — (OK / review) |
| `analytics.anpr.engineOk` | ANPR Engine - OK | — (OK / review) |
| `analytics.anpr.notLicensed` | ANPR is not licensed on this server. | — (OK / review) |
| `analytics.anpr.engineNotLicensed` | ANPR Engine - Not licensed | ANPR Engine - Not Licensed |
| `analytics.anpr.serviceDown` | Plate reading is not available. Ask your administrator to check the ANPR service. | — (OK / review) |
| `analytics.anpr.engineDown` | ANPR Engine - Not available | ANPR Engine - Not Available |
| `analytics.anpr.subSnapshot` | Snapshot | — (OK / review) |
| `analytics.anpr.subLists` | Plate Lists | — (OK / review) |
| `analytics.anpr.subLive` | Live | — (OK / review) |
| `analytics.anpr.subOffline` | Offline Match | — (OK / review) |
| `analytics.anpr.offlineModeVideo` | Offline Video | — (OK / review) |
| `analytics.anpr.offlineModeImage` | Image Investigation | — (OK / review) |
| `analytics.anpr.imageInvestHint` |  | (keep empty — teach strip off) |
| `analytics.anpr.imageManualUpload` | Local Evidence Upload | — (OK / review) |
| `analytics.anpr.imageDropHint` | Drag and drop an image file here, or click to browse | — (OK / review) |
| `analytics.anpr.imageRunScan` | Analyze Image | — (OK / review) |
| `analytics.anpr.imageClear` | Reset | — (OK / review) |
| `analytics.anpr.imageScanning` | Scanning... | — (OK / review) |
| `analytics.anpr.imageSelectFirst` | Select an image to enable analysis | Select an Image to Enable Analysis |
| `analytics.anpr.imageScanResult` | Scan result | Scan Result |
| `analytics.anpr.imageFtpInbox` | Pending Device Uploads (FTP) | — (OK / review) |
| `analytics.anpr.imageFtpRefresh` | Refresh | — (OK / review) |
| `analytics.anpr.imageFtpHint` | Select a pending file from docking stations to begin analysis. | — (OK / review) |
| `analytics.anpr.imageFtpEmpty` | No inbox files yet | No Inbox Files Yet |
| `analytics.anpr.imageFtpLoading` | Loading inbox... | Loading Inbox... |
| `analytics.anpr.imageFtpStub` | FTP inbox API not ready yet | FTP Inbox API Not Ready Yet |
| `analytics.anpr.subHistory` | Search and History | — (OK / review) |
| `analytics.anpr.uploadVideo` | Upload Video | — (OK / review) |
| `analytics.anpr.pipToggle` | Show / hide PIP | Show / Hide PIP |
| `analytics.anpr.pipSwap` | Swap main / PIP | Swap Main / PIP |
| `analytics.anpr.offlineHit` | Plate matched | Plate Matched |
| `analytics.anpr.liveStopSlot` | Stop Stream | — (OK / review) |
| `analytics.anpr.histMacroAlt` | Vehicle macro crop | Vehicle Macro Crop |
| `analytics.anpr.histPlateQ` | Plate Search | — (OK / review) |
| `analytics.anpr.histVtype` | Vehicle Type | — (OK / review) |
| `analytics.anpr.histCam` | Camera ID | — (OK / review) |
| `analytics.anpr.histFrom` | From | — (OK / review) |
| `analytics.anpr.histTo` | To | — (OK / review) |
| `analytics.anpr.liveHint` |  | (keep empty — teach strip off) |
| `analytics.anpr.liveStart` | Start watch | Start Watch |
| `analytics.anpr.liveStop` | Stop | — (OK / review) |
| `analytics.anpr.liveStopAll` | Stop all | Stop All |
| `analytics.anpr.liveStopAllConfirm` | Stop all video and clear the watch set? | — (OK / review) |
| `analytics.anpr.liveSearchPh` | Search BWC... | — (OK / review) |
| `analytics.anpr.liveStillEmpty` | Last plate still appears here | Last Plate Still Appears Here |
| `analytics.anpr.liveDetailPlate` | Plate | — (OK / review) |
| `analytics.anpr.liveDetailConf` | Confidence | — (OK / review) |
| `analytics.anpr.liveDetailList` | List | — (OK / review) |
| `analytics.anpr.liveDetailCam` | Camera | — (OK / review) |
| `analytics.anpr.liveDetailWhen` | When | — (OK / review) |
| `analytics.anpr.liveAck` | Acknowledge | — (OK / review) |
| `analytics.anpr.liveMeta` | {n}/{max} selected · {live}/{slots} live | {n}/{max} Selected · {live}/{slots} Live |
| `analytics.anpr.tileIdleHint` | Select BWCs and Start watch | Select BWCs and Start Watch |
| `analytics.anpr.liveRailTitle` | Recent Plates | — (OK / review) |
| `analytics.anpr.liveRailExpandHint` | Click to expand | Click to Expand |
| `analytics.anpr.liveRailNoText` | Plate... | — (OK / review) |
| `analytics.anpr.liveSnapTitle` | Vehicle Snap | — (OK / review) |
| `analytics.anpr.liveWatchFull` | Watch set full (16 max) | Watch Set Full (16 Max) |
| `analytics.anpr.liveNoBwc` | No BWC devices | No BWC Devices |
| `analytics.anpr.liveNoListHit` | No list match | No List Match |
| `analytics.anpr.listsHint` |  | (keep empty — teach strip off) |
| `analytics.anpr.lists.plate` | Plate number | Plate Number |
| `analytics.anpr.lists.label` | Label (Optional) | (Optional) |
| `analytics.anpr.lists.grade` | List grade | List Grade |
| `analytics.anpr.lists.gradeSuspicious` | Suspicious | — (OK / review) |
| `analytics.anpr.lists.gradeWanted` | Wanted | — (OK / review) |
| `analytics.anpr.lists.gradeBlacklist` | Blacklist | — (OK / review) |
| `analytics.anpr.lists.enroll` | Add to plate list | Add to Plate List |
| `analytics.anpr.lists.searchPh` | Search plate or label... | Search Plate or Label... |
| `analytics.anpr.lists.colPlate` | Plate | — (OK / review) |
| `analytics.anpr.lists.colLabel` | Label |  |
| `analytics.anpr.lists.loading` | Loading... | — (OK / review) |
| `analytics.anpr.lists.empty` | No plates on this list yet. | No Plates on This List Yet. |
| `analytics.anpr.lists.count` | {n} plates | {n} Plates |
| `analytics.anpr.lists.enrolled` | Plate added to list. | Plate Added to List. |
| `analytics.anpr.lists.removed` | Plate removed. | Plate Removed. |
| `analytics.anpr.lists.removeTitle` | Remove from Plate List? | — (OK / review) |
| `analytics.anpr.lists.needPlate` | Enter a plate number. | Enter a Plate Number. |
| `analytics.anpr.lists.plateExists` | That plate is already on a list. | — (OK / review) |
| `analytics.anpr.lists.full` | Plate list is full. Remove an entry before adding another. | — (OK / review) |
| `analytics.anpr.lists.hit` | List hit: {grade}{label} | List Hit: {grade}{label} |
| `analytics.anpr.lists.noHit` | Not on plate list | Not on Plate List |
| `analytics.anpr.needImage` | Choose a photo first, then crop the plate. | — (OK / review) |
| `analytics.anpr.noPlate` | No plate found in this photo. Crop tighter on the number plate and try again. | — (OK / review) |
| `analytics.anpr.formatReject` | No reliable plate read - the text did not match a valid plate format. Re-crop or try again. | — (OK / review) |
| `analytics.anpr.qualityLow` | No reliable plate read - confidence too low. Re-crop closer to the plate and try again. | — (OK / review) |
| `analytics.anpr.badFile` | Use a JPEG or PNG photo of the plate. | — (OK / review) |
| `analytics.anpr.timeout` | Plate reading took too long. Try again with a smaller crop. | — (OK / review) |
| `analytics.anpr.busy` | Plate reading is busy. Wait a moment and try again. | — (OK / review) |
| `analytics.anpr.failed` | Plate reading could not complete. Try again or contact your administrator. | — (OK / review) |
| `analytics.anpr.reading` | Reading plate... | Reading Plate... |
| `analytics.anpr.confidence` | Confidence | — (OK / review) |
| `analytics.anpr.lowConfNote` | Low confidence - confirm the characters manually. | — (OK / review) |
| `analytics.anpr.cropTitle` | Crop Plate | — (OK / review) |
| `analytics.anpr.cropHint` | Drag the frame onto the number plate, then use this crop. | — (OK / review) |
| `analytics.anpr.cropCancel` | Cancel | — (OK / review) |
| `analytics.anpr.cropFull` | Use full image | Use Full Image |
| `analytics.anpr.cropUse` | Use this crop | Use This Crop |
| `analytics.anpr.cropReady` | Drag the frame onto the plate, then Use this crop. | — (OK / review) |
| `analytics.anpr.cropFullReady` | Using full image. | Using Full Image. |
| `analytics.anpr.cropTooSmall` | Enlarge the frame onto the plate. | Enlarge the Frame Onto the Plate. |
| `analytics.anpr.cropExportFail` | Could not build crop image. | Could Not Build Crop Image. |
| `analytics.anpr.cropFallback` | Crop tool unavailable - using full image. | — (OK / review) |
| `analytics.anpr.cropReadyPreview` | Crop ready - click Read plate. | Crop Ready - Click Read Plate. |
| `analytics.weaponComing` | Weapon detection - coming when licensed. | Weapon Detection - Coming When Licensed. |
| `analytics.weapon.engineChecking` | Checking Weapon Engine... | — (OK / review) |
| `analytics.weapon.engineNotLicensed` | Weapon Engine - Not licensed | Weapon Engine - Not Licensed |
| `analytics.weapon.engineNotReady` | Weapon Engine - Not ready | Weapon Engine - Not Ready |
| `analytics.weapon.engineOk` | Weapon Engine - OK | — (OK / review) |
| `analytics.weapon.tileIdle` | Select cameras and Start watch | Select Cameras and Start Watch |
| `analytics.weapon.tileNotLive` | Not live - open on Ops first | — (OK / review) |
| `analytics.weapon.tileConnecting` | Connecting... | — (OK / review) |
| `analytics.weapon.tileOffline` | Camera offline | Camera Offline |
| `analytics.weapon.tilePlayerError` | Player unavailable | Player Unavailable |
| `analytics.weapon.railTitle` | Recent | — (OK / review) |
| `analytics.weapon.railEmpty` | Awaiting detections | Awaiting Detections |
| `analytics.weapon.rosterSearch` | Search cameras... | Search Cameras... |
| `analytics.weapon.rosterNoFleet` | No cameras registered. | No Cameras Registered. |
| `analytics.weapon.rosterNoMatch` | No cameras match this filter. | No Cameras Match This Filter. |
| `ops.cwAwareness.connecting` | connecting | Connecting |
| `ops.cwAwareness.live` | Command Wall live: {list} | Command Wall Live: {list} |
| `ops.cwAwareness.open` | Open Command Wall -> | — (OK / review) |
| `ptt.audioCmd.auto` | Auto | — (OK / review) |
| `ptt.audioCmd.legacy` | Legacy (cmd 4) | Legacy (Cmd 4) |
| `ptt.audioCmd.modern` | Modern (cmd 130) | Modern (Cmd 130) |
| `ptt.banner` | 🎙 Officer PTT - {name} (click for comm pin) | — (OK / review) |
| `ptt.bannerDuringLive` | 🎙 {name} - field PTT (Hold 🎙 to reply) | — (OK / review) |
| `ptt.bannerLinger` | 🎙 Field PTT - {name} (click for comm pin · Hold 🎙 to reply) | — (OK / review) |
| `ptt.commHint` | Click banner or device row to open comm pin - Hold 🎙 to reply | — (OK / review) |
| `ptt.commHintCw` | Hold the button below to talk back on PTT | — (OK / review) |
| `ptt.commLinger` | Transmission ended - Hold 🎙 below to reply | — (OK / review) |
| `ptt.commReceiving` | Officer transmitting - listen on speakers | Officer Transmitting - Listen on Speakers |
| `ptt.commReply` | Hold 🎙 on this pin to reply | — (OK / review) |
| `ptt.commTitle` | PTT Comm | — (OK / review) |
| `ptt.disabledDuringCall` | PTT disabled during voice call | PTT Disabled During Voice Call |
| `ptt.downlink.auto` | Auto | — (OK / review) |
| `ptt.downlink.ptt` | PTT | — (OK / review) |
| `ptt.downlink.voice` | Voice call | Voice Call |
| `ptt.error.micBlocked` | Microphone blocked | Microphone Blocked |
| `ptt.error.micUnavailable` | PTT mic unavailable | PTT Mic Unavailable |
| `ptt.excludeFromGroup` | Exclude from group PTT | Exclude from Group PTT |
| `ptt.fallbackVoiceHold` | Hold 🎙 to talk via voice call - {name} | — (OK / review) |
| `ptt.fieldBadge` | 🎙 Field PTT | — (OK / review) |
| `call.groupBox.active` | Live · {connected}/{total} | — (OK / review) |
| `call.groupBox.calling` | Calling · {n} | — (OK / review) |
| `call.groupBox.end` | End | — (OK / review) |
| `call.groupBox.ended` | Ended. | — (OK / review) |
| `call.groupBox.failed` | Failed. | — (OK / review) |
| `call.groupBox.hint` |  | (keep empty — teach strip off) |
| `call.groupBox.join` | Join call group | Join Call Group |
| `call.groupBox.live` | Live · HQ + {n} | — (OK / review) |
| `call.groupBox.membersHint` |  | (keep empty — teach strip off) |
| `call.groupBox.membersLabel` | Members | — (OK / review) |
| `call.groupBox.notOnNet` | Not in this call group. | Not in This Call Group. |
| `call.groupBox.otherOp` | Another operator. | Another Operator. |
| `call.groupBox.pickNeedTwo` | Need 2+ ({n}) | — (OK / review) |
| `call.groupBox.pickNeedTwoAlert` | Select at least 2. | Select at Least 2. |
| `call.groupBox.pickReady` | {n} selected | {n} Selected |
| `call.groupBox.pinnedReady` | {n} selected | {n} Selected |
| `call.groupBox.select` | - Select call group - | - Select Call Group - |
| `call.groupBox.sosBusy` | End SOS call first. | End SOS Call First. |
| `call.groupBox.title` | Call Groups | — (OK / review) |
| `call.groupSelectAria` | Map group for Call | Map Group for Call |
| `ptt.groupBox.active` | HQ + {n} | — (OK / review) |
| `ptt.groupBox.failed` | PTT group failed. | PTT Group Failed. |
| `ptt.groupBox.fieldHint` |  | (keep empty — teach strip off) |
| `ptt.groupBox.hint` |  | (keep empty — teach strip off) |
| `ptt.groupBox.holdTalk` | Hold Group PTT | — (OK / review) |
| `ptt.groupBox.join` | Join group PTT | Join Group PTT |
| `ptt.groupBox.membersHint` |  | (keep empty — teach strip off) |
| `ptt.groupBox.membersLabel` | Members | — (OK / review) |
| `ptt.groupBox.pickFirst` | Select group or 2+ units. | Select Group or 2+ Units. |
| `ptt.groupBox.pickNeedOne` | Need 2+ ({n}) | — (OK / review) |
| `ptt.groupBox.pickNeedOneAlert` | Select at least 2. | Select at Least 2. |
| `ptt.groupBox.pickNeedTwo` | Need 2+ ({n}) | — (OK / review) |
| `ptt.groupBox.pickNeedTwoAlert` | Select at least 2. | Select at Least 2. |
| `ptt.groupBox.pickReady` | {n} selected | {n} Selected |
| `ptt.groupBox.pinnedNeedMore` | Select 2+ units. | Select 2+ Units. |
| `ptt.groupBox.pinnedReady` | {n} selected | {n} Selected |
| `ptt.groupBox.quickName` | Quick PTT ({n}) | — (OK / review) |
| `ptt.groupBox.radioNet` | HQ + {n} | — (OK / review) |
| `ptt.groupBox.select` | - Select PTT group - | - Select PTT Group - |
| `ptt.groupBox.title` | PTT Groups | — (OK / review) |
| `ptt.groupBox.ungroup` | Ungroup all | Ungroup All |
| `ptt.groupBox.ungroupFailed` | Ungroup failed. | Ungroup Failed. |
| `ptt.groupBox.ungrouped` | Ungrouped. | — (OK / review) |
| `ptt.groupSelectAria` | Map group for PTT | Map Group for PTT |
| `ptt.groupTalking` | Group PTT - {n} units (release to stop) | — (OK / review) |
| `ptt.holdTalk` | Hold to talk to BWC (PTT) | Hold to Talk to BWC (PTT) |
| `ptt.includeInGroup` | Include in group PTT | Include in Group PTT |
| `ptt.label` | PTT | — (OK / review) |
| `ptt.mapLabel` | 🎙 PTT | — (OK / review) |
| `ptt.notOnChannel` | BWC not on PTT channel yet | BWC Not on PTT Channel Yet |
| `ptt.talking` | Talking to BWC (release to stop) | Talking to BWC (Release to Stop) |
| `ptt.tapToWake` | Hold to wake PTT channel - {name} | — (OK / review) |
| `ptt.wakeFailed` | BWC not on PTT channel yet - try again or press PTT on the BWC | — (OK / review) |
| `ptt.wakingChannel` | Connecting PTT channel... keep holding | — (OK / review) |
| `resilience.health` | This node | This Node |
| `resilience.hint` | Single-node today. Set peer URL when a second site node is deployed. | — (OK / review) |
| `resilience.nodeId` | Site identifier | Site Identifier |
| `resilience.peerDown` | Unreachable | — (OK / review) |
| `resilience.peerOk` | Reachable | — (OK / review) |
| `resilience.peerStatus` | Peer | — (OK / review) |
| `resilience.peerUrl` | Peer site address | Peer Site Address |
| `resilience.save` | Save site pairing | Save Site Pairing |
| `resilience.saved` | Site pairing settings saved. | Site Pairing Settings Saved. |
| `resilience.title` | Site Resilience | — (OK / review) |
| `role.operator` | Operator | — (OK / review) |
| `role.superAdmin` | Super admin | Super Admin |
| `server.alert.addUserFailed` | Could not add user: {msg} | Could Not Add User: {msg} |
| `server.alert.importFailed` | Import failed: {msg} | Import Failed: {msg} |
| `server.alert.imported` | Imported {n} BWC(s). | — (OK / review) |
| `server.alert.passwordFailed` | Could not update password: {msg} | Could Not Update Password: {msg} |
| `server.alert.passwordUpdated` | Password updated. | Password Updated. |
| `server.alert.resetFailed` | Could not reset password: {msg} | Could Not Reset Password: {msg} |
| `server.alert.roleFailed` | Could not update role: {msg} | Could Not Update Role: {msg} |
| `server.alert.saveFailed` | Could not save: {msg} | Could Not Save: {msg} |
| `server.alert.saved` | Changes saved. Restart Mobility so cameras and operators use the new details. | — (OK / review) |
| `server.alert.userCreated` | User {name} created. | User {name} Created. |
| `server.alert.userExists` | User {name} already exists - check the table below. | — (OK / review) |
| `server.backToSettings` | Back to Settings | — (OK / review) |
| `server.bindHost` | SIP listen address | SIP Listen Address |
| `server.bindHostHint` | 0.0.0.0 listens on all interfaces. Use a specific LAN IP only with multiple NICs. | — (OK / review) |
| `server.bwcDevices` | BWC devices | BWC Devices |
| `server.bwcGroupHint` |  | (keep empty — teach strip off) |
| `server.bwcRegister` | Device registration address | Device Registration Address |
| `server.bwcRegisterHint` | IPv4 for each BWC SIP screen (devices cannot use hostnames). | — (OK / review) |
| `server.bwcSipIp` | Device registration IP | Device Registration IP |
| `server.bwcSipServer` | Device registration IPv4 | Device Registration IPv4 |
| `server.bwcTabHint` |  | (keep empty — teach strip off) |
| `server.checklist.deviceCount` | {n} in list (BWCs) | {n} in List (BWCs) |
| `server.checklist.host` | Host | — (OK / review) |
| `server.checklist.media` | Media | — (OK / review) |
| `server.checklist.messageServer` | Message server | Message Server |
| `server.checklist.more` | +{n} more... | +{n} More... |
| `server.checklist.none` | None yet - open Server Config -> BWCs and add device IDs | — (OK / review) |
| `server.checklist.password` | Password | — (OK / review) |
| `server.secrets.configured` | Configured (not shown) | Configured (Not Shown) |
| `server.secrets.notSet` | Not set | Not Set |
| `server.secrets.pendingSave` | Unsaved change | Unsaved Change |
| `server.secrets.passwordPlaceholder` | Type new password to set or change | — (OK / review) |
| `server.checklist.path` | Path | — (OK / review) |
| `server.checklist.port` | Port | — (OK / review) |
| `server.checklist.protocol` | Protocol | — (OK / review) |
| `server.checklist.realm` | Realm | — (OK / review) |
| `server.checklist.rtspTransport` | RTSP transport | RTSP Transport |
| `server.checklist.rtspUrl` | RTSP URL | — (OK / review) |
| `server.checklist.serverId` | Server ID | — (OK / review) |
| `server.checklist.sipPort` | SIP port | SIP Port |
| `server.checklist.sipServer` | SIP server | SIP Server |
| `server.checklist.user` | User | — (OK / review) |
| `server.checklist.yourBwcs` | Your BWCs | — (OK / review) |
| `server.configBtn` | Server Config | — (OK / review) |
| `server.configTitle` | Server Config | — (OK / review) |
| `server.copyOperatorUrl` | Copy URL | — (OK / review) |
| `server.copyOperatorUrl.done` | Operator portal URL copied. | Operator Portal URL Copied. |
| `server.copyOperatorUrl.empty` | Set an Operator portal URL first. | Set an Operator Portal URL First. |
| `server.copyOperatorUrl.failed` | Could not copy URL. Select the field and copy manually. | — (OK / review) |
| `server.customerLogin` | Operator portal | Operator Portal |
| `server.dashSub.addAccount` | Add New Admin / Operator | — (OK / review) |
| `server.dashSub.groups` | Groups | — (OK / review) |
| `server.dashSub.mapGroups` | Map Groups | — (OK / review) |
| `server.dashSub.ssoIdentity` | SSO / Identity | — (OK / review) |
| `server.fleetSub.wireless` | Wireless | — (OK / review) |
| `server.fleetSub.fixedCameras` | Fixed Cameras | — (OK / review) |
| `server.fleetSub.docks` | Docking Stations | — (OK / review) |
| `server.fleetSub.firmware` | Firmware | — (OK / review) |
| `server.fleetSub.usb` | USB | — (OK / review) |
| `server.dashSub.myAccount` | My Account | — (OK / review) |
| `server.dashSub.operators` | Operators | — (OK / review) |
| `server.dashSub.siteSecurity` | Site Security | — (OK / review) |
| `server.dashSub.usersAuthority` | Users and Authority | — (OK / review) |
| `server.dashboardPort` | Dashboard port | Dashboard Port |
| `server.deployment` | Deployment | — (OK / review) |
| `server.deploymentHint.cloud` | Set Device registration IPv4 to the public address BWCs dial, and Operator portal URL to the HTTPS hostname staff use. | — (OK / review) |
| `server.deploymentHint.hybrid` | Operator portal URL is the cloud HTTPS bookmark; Device registration IPv4 is what on-site BWCs reach. | — (OK / review) |
| `server.deploymentHint.lab` | Lab: one PC on a test LAN. Portal URL and device IP may share the same host for simplicity - still keep the two fields separate. | — (OK / review) |
| `server.deploymentHint.lan` | Match static IP, subnet, gateway, and DNS to the host OS; BWCs use Device registration IPv4. | — (OK / review) |
| `server.ssl.title` | SSL Configuration | — (OK / review) |
| `server.ssl.hint` | Upload the site certificate (.crt) and private key (.key) for on-prem HTTPS. | — (OK / review) |
| `server.ssl.certLabel` | Certificate (.Crt) | — (OK / review) |
| `server.ssl.keyLabel` | Private Key (.Key) | — (OK / review) |
| `server.ssl.selected` | Selected: {cert} / {key} (upload save comes in a later MOB) | — (OK / review) |
| `server.deploymentMode` | Deployment type | Deployment Type |
| `server.diagnostics.hint` | System Root PIN required. Dashboard login password cannot open this tab. | — (OK / review) |
| `server.dock.activeFolder` | Active folder | Active Folder |
| `server.dock.envNote` | Dock uploads use FTP on this server. If Stopped, ask IT to enable FTP. | — (OK / review) |
| `server.dock.hint` | Docking stations and BWCs upload video over FTP to this server. Use the same server IP and FTP password as configured on each device. | — (OK / review) |
| `server.dock.host` | FTP host (for docks) | FTP Host (for Docks) |
| `server.dock.pasv` | Passive data ports | Passive Data Ports |
| `server.dock.port` | FTP port | FTP Port |
| `server.dock.running` | Running | — (OK / review) |
| `server.dock.saveFolder` | Save upload folder | Save Upload Folder |
| `server.dock.savedRestart` | Upload folder saved. Restart Mobility for docks to use the new location. | — (OK / review) |
| `server.dock.status` | FTP service | FTP Service |
| `server.dock.stopped` | Stopped - contact your IT administrator to enable dock uploads | — (OK / review) |
| `server.dock.uploadFolder` | FTP upload folder | FTP Upload Folder |
| `server.dock.uploadFolderHint` | Folder on this server where docks drop video. Use the default or a path on shared storage. Restart Mobility after changing. | — (OK / review) |
| `server.dock.uploadFolderPlaceholder` | Default location (leave blank) | Default Location (Leave Blank) |
| `server.dock.user` | FTP username | FTP Username |
| `server.dockStorageHint` |  | (keep empty — teach strip off) |
| `server.dockStorageOpen` | Open Evidence -> Storage | — (OK / review) |
| `server.dockStorageTitle` | Dock and Evidence Storage | — (OK / review) |
| `server.error.hostRequired` | Device registration IPv4 is required. | Device Registration IPv4 Is Required. |
| `server.error.ipv4Only` | Device registration must be IPv4 only (digits and dots). Body-worn keypads cannot enter hostnames.\n\nUse Operator portal URL for staff HTTPS bookmarks. | — (OK / review) |
| `server.gate.failed` | Incorrect password | Incorrect Password |
| `server.gate.hint` | Please enter your CURRENT login password to authorize this change. | — (OK / review) |
| `server.gate.password` | Password | — (OK / review) |
| `server.gate.required` | Password is required | Password Is Required |
| `server.gate.title` | Security Verification | — (OK / review) |
| `server.gate.verifying` | Verifying... | — (OK / review) |
| `server.hostPlaceholder` | 192.168.1.50 | — (OK / review) |
| `server.importBwcCsv` | Import BWC CSV | — (OK / review) |
| `server.ipv4OnlyHint` | Dynamic-SIM BWCs cannot type hostnames - digits and dots only. Your cloud/LAN/VPN fixed IP goes here. | — (OK / review) |
| `server.lan.dhcp` | DHCP (record assigned address) | DHCP (Record Assigned Address) |
| `server.lan.dns1` | Primary DNS | — (OK / review) |
| `server.lan.dns2` | Secondary DNS | — (OK / review) |
| `server.lan.gateway` | Default gateway | Default Gateway |
| `server.lan.hint` | Match the host OS address, or record the DHCP address assigned to this server. | — (OK / review) |
| `server.lan.hostname` | Server hostname (optional) | Server Hostname (Optional) |
| `server.lan.ipMode` | IP assignment | IP Assignment |
| `server.lan.serverIp` | Server IP Address | — (OK / review) |
| `server.lan.static` | Static IPv4 | — (OK / review) |
| `server.lan.subnet` | Subnet mask | Subnet Mask |
| `server.lan.title` | LAN Network | — (OK / review) |
| `server.layoutExpand` | Expand view | Expand View |
| `server.layoutHintAdmin` | Full admin view - best for operators, BWCs, and permissions. | — (OK / review) |
| `server.layoutHintCompact` | Network and deployment tab - LAN, SIP, and operator URL. Expand for wider forms. | — (OK / review) |
| `server.layoutHintWide` | Wide view - more room for tables and lists. | — (OK / review) |
| `server.layoutStandard` | Standard view | Standard View |
| `server.loadingDevices` | Loading device list... | Loading Device List... |
| `server.mode.cloud` | Cloud / VPS | — (OK / review) |
| `server.mode.hybrid` | Hybrid (cloud ops + site LAN) | Hybrid (Cloud Ops + Site LAN) |
| `server.mode.lab` | Lab | — (OK / review) |
| `server.mode.lan` | LAN server | LAN Server |
| `server.myAccount.hint` |  | (keep empty — teach strip off) |
| `server.nav.maintenance` | Maintenance | — (OK / review) |
| `server.nav.section.storage` | Storage | — (OK / review) |
| `server.network.cloudFixed` | Cloud - Public Fixed IPv4 | — (OK / review) |
| `server.network.lanStatic` | LAN - Static Private IPv4 | — (OK / review) |
| `server.network.vpn` | VPN - Site VPN Endpoint IPv4 | — (OK / review) |
| `server.networkAccess` | Camera network profile | Camera Network Profile |
| `server.networkAddresses` | Network addresses | Network Addresses |
| `server.networkHint.cloud` | Use your cloud VPS public IPv4. Port-forward SIP (5060) and UDP media to this server. Give renters that IP for every BWC. | — (OK / review) |
| `server.networkHint.lan` | Use static LAN IPv4 (e.g. 192.168.x.x). BWCs on the same network enter this IP on the SIP screen. | — (OK / review) |
| `server.networkHint.vpn` | Use the VPN gateway or tunnel endpoint IPv4 that SIM cameras reach. Still IP-only on the BWC - no DNS. | — (OK / review) |
| `server.onvif.password` | ONVIF Password | — (OK / review) |
| `server.onvif.path` | Device Path | — (OK / review) |
| `server.onvif.port` | ONVIF Port | — (OK / review) |
| `server.onvif.rtspTransport` | RTSP Transport | — (OK / review) |
| `server.onvif.rtspUrl` | RTSP Live URL (from Dock / VMS) | — (OK / review) |
| `server.onvif.user` | ONVIF User | — (OK / review) |
| `server.openAllBwcs` | BWCs (Names and Map Groups) | — (OK / review) |
| `server.openVideoWall` | Assign wall panels... | Assign Wall Panels... |
| `server.openVideoWallHint` |  | (keep empty — teach strip off) |
| `server.operatorDeviceSplit` | Portal URL and device registration stay independent. | — (OK / review) |
| `server.operatorSection` | Operator portal | Operator Portal |
| `server.operatorSectionHint` |  | (keep empty — teach strip off) |
| `server.operatorUrl` | Operator portal URL | Operator Portal URL |
| `server.operatorUrlPlaceholder` | e.g. https://dispatch.customer.com | — (OK / review) |
| `server.productionAccess` | Reverse proxy | Reverse Proxy |
| `server.productionAccess.loadFailed` | Could not load reverse proxy settings. Restart the server or contact your IT administrator. | — (OK / review) |
| `server.productionAccess.saved` | Saved. | — (OK / review) |
| `server.productionAccess.savedOn` | Saved - Trust reverse proxy is ON. | — (OK / review) |
| `server.productionAccess.savedOff` | Saved - Trust reverse proxy is OFF. | — (OK / review) |
| `server.productionAccess.saveFailed` | Save failed. Check you are signed in as super admin, then try again. | — (OK / review) |
| `server.productionAccessHint` | Turn on only when HTTPS terminates at a reverse proxy in front of this server. | — (OK / review) |
| `server.saveProductionAccess` | Save | — (OK / review) |
| `server.tlsBadge.empty` | URL not set | URL Not Set |
| `server.tlsBadge.http` | HTTP | — (OK / review) |
| `server.tlsBadge.https` | HTTPS | — (OK / review) |
| `server.trustReverseProxy` | Trust reverse proxy - ON only if HTTPS stops at nginx/Caddy in front of this server | — (OK / review) |
| `server.trustReverseProxyHelp` | Off = browsers reach this server directly. On = nginx/Caddy (or similar) is in front. | — (OK / review) |
| `server.proxyReadiness.passProxy` | PASS (proxy) - HTTPS portal + Trust reverse proxy ON. | — (OK / review) |
| `server.proxyReadiness.passDirect` | PASS (direct) - Ops HTTPS without a front door; Trust reverse proxy OFF. | — (OK / review) |
| `server.proxyReadiness.passDirectOff` | PASS (direct) - Trust reverse proxy OFF (no front door). | — (OK / review) |
| `server.proxyReadiness.warnNeedTrust` | Check - HTTPS company URL looks like a front door. Turn Trust reverse proxy ON, then Save. | — (OK / review) |
| `server.proxyReadiness.warnTrustHttp` | Check - Trust is ON but Operator portal URL is not https://. Fix the portal URL or turn Trust OFF. | — (OK / review) |
| `server.proxyReadiness.warnHttps` | Check - set Operator portal URL to https:// for cloud/hybrid. | — (OK / review) |
| `server.proxyReadiness.passLabel` | PASS | — (OK / review) |
| `server.proxyReadiness.warnLabel` | CHECK | — (OK / review) |
| `server.password.changeHint` |  | (keep empty — teach strip off) |
| `server.password.changeSummary` | Change my password | Change My Password |
| `server.password.confirm` | Confirm new password | Confirm New Password |
| `server.password.current` | Current password | Current Password |
| `server.password.new` | New password | New Password |
| `server.password.update` | Update password | Update Password |
| `server.preview.rtspUnset` | (set RTSP URL) | (Set RTSP URL) |
| `server.prompt.newPassword` | New password for this user (min 12 · e.g. Ab12cd34!@#$): | — (OK / review) |
| `server.protocol` | Protocol (same on every BWC) | Protocol (Same on Every BWC) |
| `server.readonlyBanner` | Operator view - Server Config is read-only. Ask a super admin to change deployment or SIP. | — (OK / review) |
| `server.restartNote` | After saving network or SIP changes in Server Config, restart Mobility so cameras and operators pick up the new details. | — (OK / review) |
| `server.rtspPlaceholder` | rtsp://user:pass@192.168.1.50:554/stream1 | RTSP://user:pass@192.168.1.50:554/Stream1 |
| `server.save` | Save changes | Save Changes |
| `server.saveBwcList` | Save BWC list | Save BWC List |
| `server.setupHint` |  | (keep empty — teach strip off) |
| `server.legalNotices` | Legal Notices | — (OK / review) |
| `server.helpAbout` | Help and About | — (OK / review) |
| `server.helpAbout.product` | Mobility Axiom | — (OK / review) |
| `server.helpAbout.versionLabel` | Build | — (OK / review) |
| `server.helpAbout.versionUnknown` | Unavailable | — (OK / review) |
| `server.helpAbout.helpTitle` | Help | — (OK / review) |
| `server.helpAbout.helpSettings` | Settings - Network, BWCs, Users, Storage. | — (OK / review) |
| `server.helpAbout.helpEvidence` | Evidence - FTP Ingest and Archive Paths. | — (OK / review) |
| `server.helpAbout.helpAnalytics` | Analytics -> Verify 1:1 - Compare Two Photos. | — (OK / review) |
| `server.helpAbout.helpOps` | Operations - Live Video, PTT, SOS. | — (OK / review) |
| `server.helpAbout.legalTitle` | Legal | — (OK / review) |
| `server.helpAbout.legalBody` | Open-source Notices. | — (OK / review) |
| `server.helpAbout.licenseNoteBody` | License: Settings -> System Status. | — (OK / review) |
| `server.signOut` | Sign Out | — (OK / review) |
| `server.signedIn` | Signed In | Signed in |
| `server.sip.mediaTransport` | Media transport | Media Transport |
| `server.sip.password` | SIP register password | SIP Register Password |
| `server.sip.passwordAlt` | Alt SIP password | Alt SIP Password |
| `server.sip.platformId` | Platform / server ID | Platform / Server ID |
| `server.sip.port` | SIP port | SIP Port |
| `server.sip.realm` | Realm | — (OK / review) |
| `server.siteTimezone` | Site timezone | Site Timezone |
| `server.siteTimezoneHint` | Current site time: {sample} | Current Site Time: {sample} |
| `server.siteTimezoneIntro` |  | (keep empty — teach strip off) |
| `server.siteTimezoneSelect` | Timezone | — (OK / review) |
| `server.sizingCalcDownload` | Capacity Planning Worksheet (CSV) | — (OK / review) |
| `server.sizingCalcHint` | Estimates bandwidth, storage, and VM requirements for deployment planning. Import the CSV into your spreadsheet application. | — (OK / review) |
| `server.summary.empty` | No BWCs in list yet - open Server Config -> BWCs or import CSV. | — (OK / review) |
| `server.summary.loadError` | Open Server Config -> BWCs to add cameras (names and map groups). | — (OK / review) |
| `server.summary.registered` | {all} BWC(s) registered · {wall} on video wall · online units appear in Devices when connected | — (OK / review) |
| `server.tab.advanced` | Advanced | — (OK / review) |
| `server.tab.bwc` | BWCs | — (OK / review) |
| `server.tab.cloud` | Cloud Deployment | — (OK / review) |
| `server.tab.dashboard` | Dashboard Authentication | — (OK / review) |
| `server.tab.diagnostics` | Diagnostics | — (OK / review) |
| `server.tab.docking` | Docking | — (OK / review) |
| `server.tab.firmware` | Firmware OTA | — (OK / review) |
| `server.tab.groups` | Map Groups | — (OK / review) |
| `server.tab.lab` | Identity | — (OK / review) |
| `server.tab.server` | Network and Deployment | — (OK / review) |
| `server.phase.identity` | Identity | — (OK / review) |
| `server.phase.identityHint` |  | (keep empty — teach strip off) |
| `server.phase.networking` | Networking | — (OK / review) |
| `server.phase.networkingHint` |  | (keep empty — teach strip off) |
| `server.phase.access` | Access and Security | — (OK / review) |
| `server.phase.accessHint` |  | (keep empty — teach strip off) |
| `server.phase.storage` | Storage and Devices | — (OK / review) |
| `server.phase.storageHint` |  | (keep empty — teach strip off) |
| `server.phase.resiliency` | Resiliency | — (OK / review) |
| `server.phase.diagnostics` | Diagnostics | — (OK / review) |
| `server.phase.diagnosticsHint` |  | (keep empty — teach strip off) |
| `server.tab.usbMaint` | USB Maintenance | — (OK / review) |
| `server.tab.infrastructure` | System Infrastructure | — (OK / review) |
| `server.tab.fleet` | Fleet Management | — (OK / review) |
| `server.tab.security` | Users and Security | — (OK / review) |
| `server.tab.diagnosticsReadiness` | Diagnostics and Readiness | — (OK / review) |
| `server.techGate.hint` | System Root PIN - not your login password. Set under Settings -> Server Config -> Users and Security. | — (OK / review) |
| `server.techGate.pinLabel` | System Root PIN | — (OK / review) |
| `server.techGate.title` | System Root Access | — (OK / review) |
| `server.tenantName` | Tenant / customer name (optional) | Tenant / Customer Name (Optional) |
| `server.tenantPlaceholder` | e.g. Acme Security | — (OK / review) |
| `server.title` | Server | — (OK / review) |
| `server.transport.tcp` | TCP | — (OK / review) |
| `server.transport.udp` | UDP | — (OK / review) |
| `server.typeOnBwc` | Type on BWC | — (OK / review) |
| `server.typeOnBwcHint` | Enter these values on each BWC SIP screen. | — (OK / review) |
| `server.tz.bangkok` | Bangkok (Asia/Bangkok) | — (OK / review) |
| `server.tz.jakarta` | Jakarta (Asia/Jakarta) | — (OK / review) |
| `server.tz.kolkata` | India (Asia/Kolkata) | — (OK / review) |
| `server.tz.manila` | Manila (Asia/Manila) | — (OK / review) |
| `server.tz.seoul` | Seoul (Asia/Seoul) | — (OK / review) |
| `server.tz.singapore` | Singapore (Asia/Singapore) | — (OK / review) |
| `server.tz.sydney` | Sydney (Australia/Sydney) | — (OK / review) |
| `server.tz.tokyo` | Tokyo (Asia/Tokyo) | — (OK / review) |
| `server.tz.utc` | UTC | — (OK / review) |
| `server.users.add` | Save account | Save Account |
| `server.users.adminConfirm` | Your password (to confirm) | Your Password (to Confirm) |
| `server.users.colActions` | Actions | — (OK / review) |
| `server.users.colAuditExport` | Audit Export | — (OK / review) |
| `server.users.colAuditView` | Audit View | — (OK / review) |
| `server.users.colConferenceBwc` | VC BWC Share | — (OK / review) |
| `server.users.colConferenceCross` | VC Cross-Group | — (OK / review) |
| `server.users.colConferenceHost` | VC Host | — (OK / review) |
| `server.users.colConferenceJoin` | VC Join | — (OK / review) |
| `server.users.colConferenceRecord` | VC Record | — (OK / review) |
| `server.users.colConferenceView` | VC View | — (OK / review) |
| `server.users.colDispatchGroups` | Dispatch groups | Dispatch Groups |
| `server.users.colDockAdmin` | Dock Admin | — (OK / review) |
| `server.users.colEvidence` | Evidence Download | — (OK / review) |
| `server.users.colEvidenceEdit` | Evidence Edit | — (OK / review) |
| `server.users.colEvidenceExport` | Evidence Export | — (OK / review) |
| `server.users.colEvidenceView` | Evidence View | — (OK / review) |
| `server.users.colExpiry` | Evidence Until | — (OK / review) |
| `server.users.colClearMapPins` | Clear map pins | Clear Map Pins |
| `server.users.colGeofence` | Geofencing | — (OK / review) |
| `server.users.colRemoteControl` | Remote Control | — (OK / review) |
| `server.users.colKillSwitch` | Kill Switch Approver | — (OK / review) |
| `server.users.colOverlayView` | Overlay View | — (OK / review) |
| `server.users.colOverlayEdit` | Overlay Edit | — (OK / review) |
| `server.users.colTacticalView` | Tactical View | — (OK / review) |
| `server.users.colBlueprintManage` | Blueprint Upload | — (OK / review) |
| `server.users.colRole` | Role | — (OK / review) |
| `server.users.addNewAdminOperator` | Add New Admin / Operator | — (OK / review) |
| `server.users.colSignInExpiry` | Sign-in Until | — (OK / review) |
| `server.users.colSignInFrom` | Sign-in From | Sign-in from |
| `server.users.colUser` | User | — (OK / review) |
| `server.users.contactNote` | Contact note (optional) | Contact Note (Optional) |
| `server.users.displayName` | Display name (optional) | Display Name (Optional) |
| `server.users.loginUsername` | Login username | Login Username |
| `server.users.usernameRequired` | Login username is required. | Login Username Is Required. |
| `server.users.expiryHint` | Leave blank for no expiry | Leave Blank for No Expiry |
| `server.users.newPassword` | New password (min 12) | New Password (Min 12) |
| `server.users.newRole` | Account type | Account Type |
| `server.users.newUsername` | New username | New Username |
| `server.users.noGroupsYet` | Create dispatch groups first | Create Dispatch Groups First |
| `server.users.password` | Password (min 12) | Password (Min 12) |
| `server.users.passwordBothRequired` | Enter the new password and your password to confirm. | — (OK / review) |
| `server.users.permAll` | All | — (OK / review) |
| `server.users.permHint` |  | (keep empty — teach strip off) |
| `server.users.remove` | Remove | — (OK / review) |
| `server.users.removeConfirm` | Remove account \"{name}\"? They will not be able to sign in. | — (OK / review) |
| `server.users.removeFailed` | Could not remove account: {msg} | Could Not Remove Account: {msg} |
| `server.users.removed` | Account {name} was removed. | Account {name} Was Removed. |
| `server.users.saveRow` | Save | — (OK / review) |
| `server.users.saved` | Permissions saved for {name}. | Permissions Saved for {name}. |
| `server.users.dispatchAssignLabel` | Station Groups | — (OK / review) |
| `server.users.jumpToMapGroups` | Map groups | Map Groups |
| `server.users.seeAllGroups` | See all dispatch groups | See All Dispatch Groups |
| `server.users.setPassword` | Set password | Set Password |
| `server.users.setPasswordHint` | Enter a new password for this operator. Confirm with your own super admin password. | — (OK / review) |
| `server.users.superAdminCount` | Super admin accounts: {count} of {max}. Keep at least two active for shift coverage. | — (OK / review) |
| `server.users.title` | Dashboard Users | — (OK / review) |
| `server.users.unsavedHint` | Unsaved changes - click Save on the row. | — (OK / review) |
| `server.wan.ddns` | DDNS hostname (optional) | DDNS Hostname (Optional) |
| `server.wan.hint` | Set public reachability to match your router, cloud firewall, or VPN. | — (OK / review) |
| `server.wan.publicIp` | Public WAN IPv4 | — (OK / review) |
| `server.wan.routerGw` | Edge router / NAT gateway | Edge Router / NAT Gateway |
| `server.wan.title` | WAN / Internet | — (OK / review) |
| `server.wan.vpnEndpoint` | VPN Endpoint IPv4 (Hybrid) | — (OK / review) |
| `settingsHub.card.assets` | Assets | — (OK / review) |
| `settingsHub.card.config` | Configuration | — (OK / review) |
| `settingsHub.card.faults` | Alarms and System Health | — (OK / review) |
| `settingsHub.card.alarms` | Alarms and System Health | — (OK / review) |
| `settingsHub.card.fleet` | Fleet and Devices | — (OK / review) |
| `settingsHub.card.infrastructure` | System Infrastructure | — (OK / review) |
| `settingsHub.card.security` | Users and Security | — (OK / review) |
| `settingsHub.card.firmware` | Firmware | — (OK / review) |
| `settingsHub.card.maintenance` | Maintenance | — (OK / review) |
| `settingsHub.card.monitor` | Monitoring | — (OK / review) |
| `settingsHub.card.onboarding` | Onboarding | — (OK / review) |
| `settingsHub.lifecycleLead` | Register cameras, manage assets, and open Server Config or other admin pages. Status refreshes each time you open Settings. | — (OK / review) |
| `settingsHub.lifecycleTitle` | Device Lifecycle | — (OK / review) |
| `settingsHub.openCentre` | Centre summary | Centre Summary |
| `settingsHub.openDiagnostics` | Diagnostics | — (OK / review) |
| `settingsHub.openInventory` | View inventory | View Inventory |
| `settingsHub.openManage` | Manage | — (OK / review) |
| `settingsHub.openStorage` | Open storage | Open Storage |
| `settingsHub.status.assets` | {count} body-worn cameras in registry | {count} body-worn Cameras in Registry |
| `settingsHub.status.configGeneric` | Deployment and network - open Server Config | — (OK / review) |
| `settingsHub.status.configMode` | Deployment: {mode} | — (OK / review) |
| `settingsHub.status.faultsCentre` | SOS trends and system health in Centre Summary | — (OK / review) |
| `settingsHub.status.faultsOps` | Live SOS and alarms on the Operations map | — (OK / review) |
| `settingsHub.status.firmwarePlanning` | Inventory and planning - remote push not enabled yet | — (OK / review) |
| `settingsHub.status.maintenanceFtpOff` | Dock FTP is stopped - contact IT to enable uploads | — (OK / review) |
| `settingsHub.status.maintenanceFtpOn` | Dock FTP running - evidence paths under Storage | — (OK / review) |
| `settingsHub.status.monitorAdmin` | Engineer diagnostics and platform health | Engineer Diagnostics and Platform Health |
| `settingsHub.status.monitorOps` | Device status on Operations | Device Status on Operations |
| `settingsHub.status.onboarding` | {registered} registered · {online} online now | {registered} Registered · {online} Online Now |
| `settingsHub.status.fleet` | {registered} registered · {online} online now | {registered} Registered · {online} Online Now |
| `settingsHub.status.security` | Dashboard users, identity, and map groups | Dashboard Users, Identity, and Map Groups |
| `settingsHub.strip.fleet` | Devices | — (OK / review) |
| `settingsHub.strip.fleetVal` | {online} / {total} online | {online} / {total} Online |
| `settingsHub.strip.ftp` | Dock FTP | — (OK / review) |
| `settingsHub.strip.license` | License | — (OK / review) |
| `settingsHub.strip.licenseIssue` | Check required | Check Required |
| `settingsHub.strip.licenseOk` | Valid | — (OK / review) |
| `settingsHub.strip.uptime` | Axiom status | Axiom Status |
| `settingsHub.strip.degraded` | Not OK | — (OK / review) |
| `settingsHub.strip.degradedShort` | Not OK - {reason} | — (OK / review) |
| `settingsHub.strip.reason.http` | Dashboard | — (OK / review) |
| `settingsHub.strip.reason.sip` | Cameras / signaling | Cameras / Signaling |
| `settingsHub.strip.reason.ptt` | Push-to-talk | — (OK / review) |
| `settingsHub.strip.reason.pool` | Live video | Live Video |
| `adminAction.opening` | Opening... | — (OK / review) |
| `adminAction.wait` | Please wait - finishing the current step. | — (OK / review) |
| `adminAction.loadingConfig` | Loading configuration... | Loading Configuration... |
| `adminAction.adminRequired` | Super admin access is required for this action. | — (OK / review) |
| `adminAction.toolsLoading` | Admin tools are still loading - try again in a moment. | — (OK / review) |
| `adminAction.diagnosticsSteps` | Step 2 of 2: enter the System Root PIN. | — (OK / review) |
| `adminAction.diagnosticsStep1` | Step 1 of 2: enter your login password. | — (OK / review) |
| `sos.ack.camera` | Camera | — (OK / review) |
| `sos.ack.captureLabel` | Live Video Capture (from This Screen) | — (OK / review) |
| `sos.ack.helpersEmpty` | No other online units - acknowledge without a response team. | — (OK / review) |
| `sos.ack.helpersHint` |  | (keep empty — teach strip off) |
| `sos.ack.helpersLabel` | Units Involved in Response | — (OK / review) |
| `sos.ack.includeSnapshot` | Save this picture with the incident report | — (OK / review) |
| `sos.ack.noVideo` | No live video on screen - report will be saved without a picture. | — (OK / review) |
| `sos.ack.notePlaceholder` | Brief description of the incident... | Brief Description of the Incident... |
| `sos.ack.previewAlt` | Live video preview | Live Video Preview |
| `sos.ack.recapture` | Capture again | Capture Again |
| `sos.ack.submitClose` | Submit and Close | — (OK / review) |
| `sos.ack.title` | SOS Acknowledgement | — (OK / review) |
| `sos.ack.whatHappened` | What happened? | What Happened? |
| `sos.acknowledge` | Acknowledge | — (OK / review) |
| `sos.alert.openFolderFailed` | Could not open incident folder. | Could Not Open Incident Folder. |
| `sos.alert.openFolderManual` | Could not open folder on this PC. Ask IT to open the incident folder on the server. | — (OK / review) |
| `sos.alert.openedLocal` | Opened on this PC. The incident report should open in your browser. | — (OK / review) |
| `sos.banner.distress` | OFFICER IN DISTRESS | Officer in Distress |
| `sos.banner.fall` | FALL ALERT | — (OK / review) |
| `sos.banner.liveHint` |  | (keep empty — teach strip off) |
| `sos.banner.navHint` |  | (keep empty — teach strip off) |
| `sos.banner.pttTeam` | PTT team | PTT Team |
| `sos.banner.pttTeamTitle` | Push PTT group to alarm officer + nearby units | Push PTT Group to Alarm Officer + Nearby Units |
| `sos.chart.alarmCount` | {n} alarm(s) | — (OK / review) |
| `sos.chart.noData` | No data | No Data |
| `sos.clearList` | Clear list | Clear List |
| `sos.confirm.clearList` | Clear the SOS list on this screen?\n\nSaved incident folders on this PC are kept. | — (OK / review) |
| `sos.detail.camera` | Camera | — (OK / review) |
| `sos.detail.downloadRecording` | Download MP4 | Download Mp4 |
| `sos.detail.noNote` | (No note entered) | (No Note Entered) |
| `sos.detail.noReport` | Report file not found for this incident. Try Reload list or open the server folder. | — (OK / review) |
| `sos.detail.notAcknowledged` | This alarm has not been acknowledged yet. | — (OK / review) |
| `sos.detail.noteLabel` | Acknowledgement Note | — (OK / review) |
| `sos.detail.openFolder` | Server folder (admin) | Server Folder (Admin) |
| `sos.detail.openNewTab` | Open in new tab | Open in New Tab |
| `sos.detail.operator` | Operator | — (OK / review) |
| `sos.detail.recordingLabel` | Server Recording | — (OK / review) |
| `sos.detail.reportFrameTitle` | SOS Incident Report | — (OK / review) |
| `sos.detail.statusAck` | Acknowledged | — (OK / review) |
| `sos.detail.statusOpen` | Open | — (OK / review) |
| `sos.detail.title` | SOS Incident | — (OK / review) |
| `sos.detail.watchRecording` | Watch full screen | Watch Full Screen |
| `sos.downloadCsv` | Download CSV | — (OK / review) |
| `sos.empty` | No SOS alarms yet | No SOS Alarms Yet |
| `sos.error.clearList` | Could not clear list. | Could Not Clear List. |
| `sos.hint` | Last 7 days | Last 7 Days |
| `sos.ledger.clickView` | Click to view full record | Click to View Full Record |
| `sos.ledger.emptyWindow` | No SOS in last {n} days | No SOS in Last {n} Days |
| `sos.ledger.hasRecording` | video saved | Video Saved |
| `sos.ledger.hintAck` | Tap to view report | Tap to View Report |
| `sos.ledger.hintOpen` | Tap to view · not acknowledged | Tap to View · Not Acknowledged |
| `sos.ledger.loadFailed` | Could not load log | Could Not Load Log |
| `sos.ledger.metaEmpty` | Nothing in last {n} days | Nothing in Last {n} Days |
| `sos.ledger.olderInFolder` | older saved in incident folder | Older Saved in Incident Folder |
| `sos.ledger.serverError` | Could not load - check server is running | — (OK / review) |
| `sos.ledger.summary` | {shown} shown ({days} days) · {open} need acknowledge | — (OK / review) |
| `sos.ledger.tagAck` | ACK | — (OK / review) |
| `sos.ledger.tagFall` | FALL | — (OK / review) |
| `sos.ledger.tagOpen` | OPEN | — (OK / review) |
| `sos.ledger.tagSos` | SOS | — (OK / review) |
| `sos.ledger.updated` | Updated {time} | — (OK / review) |
| `sos.ledger.updating` | Updating... | — (OK / review) |
| `sos.loading` | Loading... | — (OK / review) |
| `sos.openFiles` | Open incident files | Open Incident Files |
| `sos.pin.hint` | Full incident notes are protected. Enter the incident PIN from your administrator. | — (OK / review) |
| `sos.pin.incorrect` | Incorrect PIN | — (OK / review) |
| `sos.pin.label` | PIN | — (OK / review) |
| `sos.pin.title` | SOS Log - Enter PIN | — (OK / review) |
| `sos.pin.unlock` | Unlock | — (OK / review) |
| `sos.pin.verifyFailed` | Could not verify PIN | Could Not Verify PIN |
| `sos.reloadList` | Reload list | Reload List |
| `sos.response.distanceM` | {m} m | {m} M |
| `sos.response.nearby` | {n} of {max} within {radius} m: {names} | — (OK / review) |
| `sos.response.noGps` | Waiting for officer GPS - adjust radius when location appears | — (OK / review) |
| `sos.response.noneNearby` | No other online units within {radius} m | — (OK / review) |
| `sos.response.radiusAria` | Response radius metres | Response Radius Metres |
| `sos.response.radiusLabel` | Response Radius | — (OK / review) |
| `sos.response.scanning` | Scanning for nearby units... | Scanning for Nearby Units... |
| `sos.title` | SOS Log | — (OK / review) |
| `storage.alert.openFailed` | Could not open folder. | Could Not Open Folder. |
| `storage.alert.openManual` | Could not open folder on this PC. Ask IT to open it on the server. | — (OK / review) |
| `storage.alert.openedLocal` | Opened on this PC. Open the date folder for incident files. | — (OK / review) |
| `storage.all` | All storage | All Storage |
| `storage.error.loadPath` | Could not load path | Could Not Load Path |
| `storage.facePlate` | Face / plate | Face / Plate |
| `storage.ftpHint` | FTP | — (OK / review) |
| `storage.ftpUploads` | FTP uploads | FTP Uploads |
| `storage.hint` | FTP uploads folder on this PC | FTP Uploads Folder on This PC |
| `storage.loading` | Loading... | — (OK / review) |
| `storage.title` | Storage | — (OK / review) |
| `tech.verifying` | Verifying... | — (OK / review) |
| `tech.authFailed` | Authentication failed. | Authentication Failed. |
| `tech.authRequired` | Sign in again to continue. | Sign in Again to Continue. |
| `tech.invalidPin` | The System Root PIN is not correct. | — (OK / review) |
| `tech.lockedOut` | Too many attempts. Wait 15 minutes and try again. | — (OK / review) |
| `tech.loadFailed` | Could not load diagnostics. Try again or contact your IT administrator. | — (OK / review) |
| `tech.notConfigured` | Engineer diagnostics is not available on this server. Contact your Ubitron support team or IT administrator to enable access. | — (OK / review) |
| `tech.pinRequired` | System Root PIN required. | System Root PIN Required. |
| `tech.provision.failed` | Could not save the System Root PIN. Try again. | — (OK / review) |
| `tech.provision.hint` | Choose a PIN (12+ characters), different from login. Super admin only. | — (OK / review) |
| `tech.provision.pinConfirmLabel` | Confirm System Root PIN | — (OK / review) |
| `tech.provision.pinLabel` | New System Root PIN | — (OK / review) |
| `tech.provision.pinMismatch` | The PIN entries do not match. | The PIN Entries Do Not Match. |
| `tech.provision.pinTooShort` | The System Root PIN must be at least 12 characters. | — (OK / review) |
| `tech.provision.saved` | System Root PIN saved. Use it on Diagnostics Step 2. | — (OK / review) |
| `tech.provision.title` | Set System Root PIN | — (OK / review) |
| `tech.health.title` | Platform Health | — (OK / review) |
| `tech.health.uptime` | Uptime | — (OK / review) |
| `tech.health.uptimeValue` | {min} minutes | {min} Minutes |
| `tech.health.sip` | Device signaling | Device Signaling |
| `tech.health.ptt` | Push-to-talk | — (OK / review) |
| `tech.health.devices` | Body-worn cameras | Body-worn Cameras |
| `tech.health.devicesValue` | {online} of {total} online | {online} of {total} Online |
| `tech.health.live` | Live video sessions | Live Video Sessions |
| `tech.health.memory` | Server memory | Server Memory |
| `tech.health.memoryValue` | {mb} MB in use | {mb} MB in Use |
| `tech.health.license` | License | — (OK / review) |
| `tech.health.licenseValid` | Active | — (OK / review) |
| `tech.health.licenseMissing` | Not active - contact Ubitron support | Not Active - Contact Ubitron Support |
| `tech.health.frEngine` | FR engine | FR Engine |
| `tech.health.frOk` | OK | — (OK / review) |
| `tech.health.frDown` | Down | — (OK / review) |
| `tech.health.frOff` | Off | — (OK / review) |
| `tech.health.ok` | Running | — (OK / review) |
| `tech.health.down` | Not running | Not Running |
| `tech.liveViewers.title` | Live Viewer Telemetry | — (OK / review) |
| `tech.liveViewers.summary` | {active} of {max} distinct live cameras (pool sessions) | — (OK / review) |
| `tech.liveViewers.empty` | No active live viewers. | No Active Live Viewers. |
| `tech.liveViewers.loadFailed` | Could not load live viewer data. | Could Not Load Live Viewer Data. |
| `tech.liveViewers.colCam` | Camera | — (OK / review) |
| `tech.liveViewers.colPool` | Pool | — (OK / review) |
| `tech.liveViewers.colWs` | WS clients | WS Clients |
| `tech.liveViewers.colOps` | Ops refs | Ops Refs |
| `tech.liveViewers.colWall` | Wall refs | Wall Refs |
| `tech.liveViewers.colSockets` | Sockets | — (OK / review) |
| `tech.liveViewers.colWatchers` | Watchers | — (OK / review) |
| `tech.liveViewers.poolStreaming` | Streaming | — (OK / review) |
| `tech.liveViewers.poolActive` | Session | — (OK / review) |
| `tech.liveViewers.poolOff` | Off | — (OK / review) |
| `tech.liveViewers.opsShort` | Ops | — (OK / review) |
| `tech.liveViewers.wallShort` | Wall | — (OK / review) |
| `tech.liveViewers.anon` | (anonymous) | (Anonymous) |
| `tech.activity.title` | Activity Recording | — (OK / review) |
| `tech.activity.note` |  | (keep empty — teach strip off) |
| `tech.activity.traceOn` | Detailed recording: On | Detailed Recording: on |
| `tech.activity.traceOff` | Detailed recording: Off | Detailed Recording: Off |
| `tech.runbook.title` | Guided Checks | — (OK / review) |
| `tech.runbook.severity` | Priority: {level} | — (OK / review) |
| `tech.runbook.symptoms` | What you may see | What You May See |
| `tech.runbook.steps` | What to do | What to Do |
| `tech.runbook.step` | Step {n} | — (OK / review) |
| `tech.runbook.check` | Confirm | — (OK / review) |
| `usbMaint.adbMissing` | Device connection tool not available - contact your IT administrator. | — (OK / review) |
| `usbMaint.adbReady` | Device connection ready | Device Connection Ready |
| `usbMaint.adminPasswordPrompt` | Your super admin password to confirm: | Your Super Admin Password to Confirm: |
| `usbMaint.clearConfigured` | Clear-media command configured | Clear-media Command Configured |
| `usbMaint.clearMedia` | Clear media | Clear Media |
| `usbMaint.clearNotConfigured` | Automatic media wipe is not enabled on this server. | — (OK / review) |
| `usbMaint.clearNotConfiguredDetail` | To clear camera storage from this PC:\n\n1. Connect the BWC by USB (Refresh USB must show the device).\n2. Ask your IT administrator to enable automated wipe for your camera model.\n\nUntil then, use Open BWC tool to delete files with the vendor utility. | — (OK / review) |
| `usbMaint.confirmClear` | Clear media on this device? This cannot be undone. | — (OK / review) |
| `usbMaint.deviceInfo` | Device info | Device Info |
| `usbMaint.done` | Done. | — (OK / review) |
| `usbMaint.fixConnection` | Check the USB cable and accept any trust prompt on the camera. | — (OK / review) |
| `usbMaint.hint` | Connect the body-worn camera by USB to this PC, then refresh. | — (OK / review) |
| `usbMaint.launchTool` | Open BWC tool (vendor) | Open BWC Tool (Vendor) |
| `usbMaint.launchToolConfirm` | Open the vendor maintenance tool on this PC? Use it to delete media until automated wipe is enabled. | — (OK / review) |
| `usbMaint.noDevices` | No camera connected - plug in the BWC and accept any trust prompt on the device. | — (OK / review) |
| `usbMaint.pickDevice` | Connect and select a USB device first. | — (OK / review) |
| `usbMaint.refresh` | Refresh USB | — (OK / review) |
| `usbMaint.scanning` | Scanning USB... | — (OK / review) |
| `usbMaint.title` | USB Maintenance (Command Room) | — (OK / review) |
| `usbMaint.toolLaunched` | Vendor tool launched on this PC. | Vendor Tool Launched on This PC. |
| `usbMaint.toolReady` | Vendor tool on disk | Vendor Tool on Disk |
| `usbMaint.unsupportedPlatform` | USB maintenance requires Windows (this server: {platform}) | — (OK / review) |
| `usbMaint.working` | Running... | — (OK / review) |
| `video.autoRotate` | Auto-rotate | — (OK / review) |
| `video.config` | Assign panels | Assign Panels |
| `video.configTitle` | Assign Cameras to Panels | — (OK / review) |
| `video.connecting` | Connecting... | — (OK / review) |
| `video.fieldPtt` | 🎙 Field PTT | — (OK / review) |
| `video.idle` | Idle | — (OK / review) |
| `video.listenWhenLive` | Listen when live | Listen When Live |
| `video.live` | Live | — (OK / review) |
| `video.matrix.hint` | Select wall panels (1-6). The pop-out arranges them in a standard grid (up to 1080p). | — (OK / review) |
| `video.matrix.hintCw` | Select Command Wall panels (1-16 or up to 32). The pop-out mirrors live video - no extra streams. | — (OK / review) |
| `video.matrix.noneSelected` | Select at least one panel. | Select at Least One Panel. |
| `video.matrix.open` | Pop out video matrix | Pop Out Video Matrix |
| `video.matrix.openBtn` | Open matrix | Open Matrix |
| `video.matrix.title` | Pop Out Video Matrix | — (OK / review) |
| `video.panel` | Panel {n} | — (OK / review) |
| `video.panelLabel` | Panel {n} · {name} | — (OK / review) |
| `video.panelLabelRotateAll` | Panel {n} · all online (rotate) | Panel {n} · All Online (Rotate) |
| `video.panelLabelRotateGroup` | Panel {n} · {group} (rotate) | Panel {n} · {group} (Rotate) |
| `video.panelLabelRotateList` | Panel {n} · custom list (rotate) | Panel {n} · Custom List (Rotate) |
| `video.panelLabelRotateOverflow` | Panel {n} · poll extras (rotate) | Panel {n} · Poll Extras (Rotate) |
| `video.play` | Play | — (OK / review) |
| `video.playerError` | Player error | Player Error |
| `video.popout` | Vid Popout | — (OK / review) |
| `video.popoutMatrix` | Pop out | Pop Out |
| `video.rotateHint` | Panels set to rotate will cycle through online BWCs on the interval you configured. | — (OK / review) |
| `video.voiceHintToast` | {name} - voice on live | {name} - Voice on Live |
| `video.voiceHintListen` | Listen | — (OK / review) |
| `video.voiceHintCall` | Call | — (OK / review) |
| `video.voiceHintDismiss` | Dismiss | — (OK / review) |
| `video.rotatePanels` | Auto-rotate panels | Auto-rotate Panels |
| `video.selectDevice` | Select a device | Select a Device |
| `video.signalLost` | Video signal lost | Video Signal Lost |
| `video.setIdInConfig` | Set ID in Config | — (OK / review) |
| `video.stop` | Stop | — (OK / review) |
| `video.stopped` | Stopped - press ▶ | Stopped - Press ▶ |
| `video.stoppedOnDevice` | Stopped by BWC | — (OK / review) |
| `video.stoppedShort` | Stopped | — (OK / review) |
| `video.stream.live` | Live streaming.... | Live Streaming.... |
| `video.stream.sos` | SOS live video | SOS Live Video |
| `video.title` | Live Video | — (OK / review) |
| `video.wall.alert.importFailed` | Import failed: {msg} | Import Failed: {msg} |
| `video.wall.alert.imported` | Imported {n} panel assignment(s). | Imported {n} Panel assignment(s). |
| `video.wall.allHint` | Cycles through every online BWC registered on the BWCs tab - for large Mobility (hundreds or thousands). | — (OK / review) |
| `video.wall.device` | Device | — (OK / review) |
| `video.wall.deviceId` | Device ID | — (OK / review) |
| `video.wall.deviceList` | Device ID List (One per Line) | Device ID List (One Per Line) |
| `video.wall.downloadTemplate` | Download Wall Template (CSV) | — (OK / review) |
| `video.wall.enterIdManually` | Enter ID Manually | — (OK / review) |
| `video.wall.error.csvEmpty` | Empty CSV file | Empty CSV File |
| `video.wall.error.csvNoDeviceId` | CSV must have a Device ID column | — (OK / review) |
| `video.wall.error.csvNoIds` | No device IDs found in CSV | No Device Ids Found in CSV |
| `video.wall.error.save` | Could not save channel setup: {msg} | Could Not Save Channel Setup: {msg} |
| `video.wall.exportCsv` | Export Wall CSV | — (OK / review) |
| `video.wall.fixedHint` | Paste the device ID from the BWCs tab. Use this for one dedicated panel. | — (OK / review) |
| `video.wall.groupHint` | Rotates through online BWCs in this map group (e.g. yellow patrol, north sector). Set map group on each row in Server Config -> BWCs. | — (OK / review) |
| `video.wall.hint` | Six live panels. Assign a fixed camera or a rotation per panel. | — (OK / review) |
| `video.wall.hintNoDevice` | Choose a source mode and configure this panel. | — (OK / review) |
| `video.wall.hintRotate` | {n} online in queue · every {sec}s | — (OK / review) |
| `video.wall.hintUnknownId` | {id} - add this ID in Server Config -> BWCs. | — (OK / review) |
| `video.wall.importCsv` | Import Wall CSV | — (OK / review) |
| `video.wall.listHint` | Paste device IDs one per line - BWC 7, 8, 9... up to thousands. Only online units play. | — (OK / review) |
| `video.wall.listPlaceholder` | 34020000001329000008\n34020000001329000009\n... | — (OK / review) |
| `video.wall.manualId` | Or Type Device ID | — (OK / review) |
| `video.wall.mapGroup` | Map Group: {group} | — (OK / review) |
| `video.wall.mapGroupPick` | Map Group | — (OK / review) |
| `video.wall.mode.all` | Rotate All Online BWCs | — (OK / review) |
| `video.wall.mode.fixed` | Single BWC (Fixed) | — (OK / review) |
| `video.wall.mode.group` | Rotate Map Group | — (OK / review) |
| `video.wall.mode.list` | Rotate Custom ID List | — (OK / review) |
| `video.wall.mode.none` | None | — (OK / review) |
| `video.wall.mode.overflow` | Poll extra BWCs (not on panels 1-4) | — (OK / review) |
| `video.wall.overflowHint` | Rotates through online BWCs that are not assigned to fixed panels 1-4. Use for panels 5-6 when you have more than four units. | — (OK / review) |
| `video.wall.none` | - None - | — (OK / review) |
| `video.wall.panelRow` | Wall Panel {n} | — (OK / review) |
| `video.wall.pickGroup` | Select Map Group... | — (OK / review) |
| `video.wall.placeholder.deviceId` | Device ID | — (OK / review) |
| `video.wall.placeholder.notInList` | Device ID not in list | Device ID Not in List |
| `video.wall.rotateSec` | Rotate Every (Seconds) | — (OK / review) |
| `video.wall.sourceMode` | Panel Source | — (OK / review) |
| `video.wall.title` | Video Wall Panels | — (OK / review) |
| `view.popoutAriaCentreSummary` | Pop out Centre Summary | Pop Out Centre Summary |
| `view.popoutAriaCommandWall` | Pop out Command Wall | Pop Out Command Wall |
| `view.popoutTitle` | Pop Out to Another Monitor or TV Wall | — (OK / review) |
| `voiceAlerts.config.adminRequired` | Super admin required to save voice settings. | — (OK / review) |
| `voiceAlerts.config.autoSpeak` | Auto-speak on new alerts | Auto-speak on New Alerts |
| `voiceAlerts.config.enabled` | Enable voice alerts | Enable Voice Alerts |
| `voiceAlerts.config.hint` | Browser speech for control-room alerts. Click the page once if the browser blocks audio. | — (OK / review) |
| `voiceAlerts.config.pitch` | Pitch | — (OK / review) |
| `voiceAlerts.config.rate` | Speech rate | Speech Rate |
| `voiceAlerts.config.save` | Save voice settings | Save Voice Settings |
| `voiceAlerts.config.saved` | Voice alert settings saved. | Voice Alert Settings Saved. |
| `voiceAlerts.config.speakFall` | Speak fall alarms | Speak Fall Alarms |
| `voiceAlerts.config.speakGeofence` | Speak geofence breaches | Speak Geofence Breaches |
| `voiceAlerts.config.speakRecStart` | Speak when SD recording starts on device | — (OK / review) |
| `voiceAlerts.config.speakRecStop` | Speak when SD recording stops on device | — (OK / review) |
| `voiceAlerts.config.speakSos` | Speak SOS alarms | Speak SOS Alarms |
| `voiceAlerts.config.test` | Test speak | Test Speak |
| `voiceAlerts.config.title` | Alerts and Voice | — (OK / review) |
| `voiceAlerts.config.voiceDefault` | Browser default | Browser Default |
| `voiceAlerts.config.voiceLang` | Voice language | Voice Language |
| `voiceAlerts.config.volume` | Volume | — (OK / review) |
| `voiceAlerts.header.muteTitle` | Mute Voice Alerts (This Session) | — (OK / review) |
| `voiceAlerts.header.repeat` | Repeat | — (OK / review) |
| `voiceAlerts.header.repeatTitle` | Repeat Last Voice Alert | — (OK / review) |
| `voiceAlerts.header.unmuteTitle` | Unmute Voice Alerts | — (OK / review) |
| `voiceAlerts.phrase.fall` | Fall alert, {name}. | Fall Alert, {name}. |
| `voiceAlerts.phrase.fallAlert` | Fall alert. | Fall Alert. |
| `voiceAlerts.phrase.geofence` | Geofence breach, {name}. | Geofence Breach, {name}. |
| `voiceAlerts.phrase.recStart` | {name} started recording on device. | {name} Started Recording on Device. |
| `voiceAlerts.phrase.recStop` | {name} stopped device recording. | {name} Stopped Device Recording. |
| `voiceAlerts.phrase.sos` | Officer in distress, {name}. | Officer in Distress, {name}. |
| `voiceAlerts.phrase.sosAlert` | Officer in distress alert. | Officer in Distress Alert. |
| `voiceAlerts.phrase.test` | Mobility Axiom voice alert test. | Mobility Axiom Voice Alert Test. |
| `server.users.newPasswordMin` | New password (min {min}) | New Password (Min {min}) |
| `server.users.passwordMin` | Password (min {min}) | Password (Min {min}) |
| `server.users.scopeCorporate` | All stations | All Stations |
| `server.users.scopeStation` | Assigned only | Assigned Only |
| `server.users.scopeCorporateHint` | Sees all dispatch groups on map, devices, and SOS ledger. | — (OK / review) |
| `server.users.scopeStationHint` | Only assigned dispatch groups on map, devices, and SOS ledger. | — (OK / review) |
| `server.users.hierarchyAssignHint` | Assign dispatch groups below, or check See all dispatch groups. | — (OK / review) |
| `server.users.hierarchyIntro` | Stations: All stations see every group. Assigned only is limited to the groups you tick. | — (OK / review) |
| `server.users.filterSearch` | Search | — (OK / review) |
| `server.users.filterSearchPh` | Username, name, group... | Username, Name, Group... |
| `server.users.filterRole` | Role | — (OK / review) |
| `server.users.filterRoleAll` | All roles | All Roles |
| `server.users.filterScope` | Stations | — (OK / review) |
| `server.users.filterScopeAll` | All | — (OK / review) |
| `server.users.filterEmpty` | No users match this filter. | No Users Match This Filter. |
| `server.readiness.title` | System Readiness | — (OK / review) |
| `server.readiness.hint` |  | (keep empty — teach strip off) |
| `server.readiness.refresh` | Refresh | — (OK / review) |
| `server.readiness.loadFailed` | Could not load readiness checklist. Restart the server or contact your IT administrator. | — (OK / review) |
| `server.readiness.score` | ready | Ready |
| `server.readiness.fix` | Open | — (OK / review) |
| `server.readiness.operatorUrl.label` | Operator Portal URL | — (OK / review) |
| `server.readiness.operatorUrl.ok` | Portal URL is set. | Portal URL Is Set. |
| `server.readiness.operatorUrl.missing` | Set the operator portal URL (bookmark for dispatch staff). | — (OK / review) |
| `server.readiness.operatorUrl.missingRemote` | Cloud/hybrid requires an operator portal URL. | Cloud/Hybrid Requires an Operator Portal URL. |
| `server.readiness.operatorUrl.httpWarn` | Use https:// for cloud/hybrid production access. | Use HTTPS:// for Cloud/Hybrid Production Access. |
| `server.readiness.deviceIp.label` | Device Registration IPv4 | — (OK / review) |
| `server.readiness.deviceIp.ok` | Valid IPv4 for BWC SIP registration. | Valid IPv4 for BWC SIP Registration. |
| `server.readiness.deviceIp.missing` | Set device registration IPv4 (no hostnames). | Set Device Registration IPv4 (No Hostnames). |
| `server.readiness.license.label` | Platform License | — (OK / review) |
| `server.readiness.license.ok` | License optional on this install. | License Optional on This Install. |
| `server.readiness.license.valid` | Valid platform license installed. | Valid Platform License Installed. |
| `server.readiness.license.optionalLab` | No license file - OK for lab; required for rental/customer ship. | — (OK / review) |
| `server.readiness.license.invalid` | License file present but invalid or expired. | — (OK / review) |
| `server.readiness.license.missing` | Platform license required - add storage/platform-license.json. | Platform License Required - Add Storage/platform-license.json. |
| `server.readiness.dispatchGroups.label` | Dispatch Groups | — (OK / review) |
| `server.readiness.dispatchGroups.ok` | {count} dispatch group(s) configured. | {count} Dispatch group(s) Configured. |
| `server.readiness.dispatchGroups.none` | Create at least one dispatch group for map and SOS scope. | — (OK / review) |
| `server.readiness.operators.label` | Station-scoped Operators | — (OK / review) |
| `server.readiness.operators.ok` | {operators} operator account(s); {assigned} with assigned groups only. | — (OK / review) |
| `server.readiness.operators.onlySuperAdmin` | Only super admin accounts - add operators for station-scoped desks. | — (OK / review) |
| `server.readiness.operators.noAssigned` | No operators with assigned groups - assign groups or use See all dispatch groups. | — (OK / review) |
| `server.readiness.storage.label` | Evidence Ingest Folder | — (OK / review) |
| `server.readiness.storage.ok` | FTP/evidence ingest folder exists and is writable. | — (OK / review) |
| `server.readiness.storage.fail` | Evidence ingest folder missing or not writable - open Evidence -> Storage. | — (OK / review) |
| `server.readiness.production.label` | HTTPS / Reverse Proxy | — (OK / review) |
| `server.readiness.production.ok` | Production access settings look OK for this deployment mode. | — (OK / review) |
| `server.readiness.production.passProxy` | PASS (proxy) - HTTPS portal + Trust reverse proxy ON. | — (OK / review) |
| `server.readiness.production.passDirect` | PASS (direct) - Ops HTTPS without front door; Trust reverse proxy OFF. | — (OK / review) |
| `server.readiness.production.passDirectOff` | PASS (direct) - Trust reverse proxy OFF. | — (OK / review) |
| `server.readiness.production.needTrustBehindProxy` | CHECK - HTTPS portal looks like nginx/Caddy in front; turn Trust reverse proxy ON. | — (OK / review) |
| `server.readiness.production.trustOnWithoutHttps` | CHECK - Trust is ON but portal URL is not https://. | — (OK / review) |
| `server.readiness.production.trustProxy` | HTTPS portal URL set - enable Trust reverse proxy behind nginx/IIS/Caddy. | — (OK / review) |
| `server.readiness.production.https` | Cloud/hybrid should use https:// on the operator portal URL. | — (OK / review) |
| `server.readiness.production.trustProxyLan` | HTTPS portal with direct app port - enable Trust reverse proxy if TLS terminates in front. | — (OK / review) |
| `server.readiness.topology.label` | Deployment Topology | — (OK / review) |
| `server.readiness.topology.ok` | Deployment mode: {mode}. | Deployment Mode: {mode}. |
| `server.readiness.topology.lab` | Lab mode - set LAN, cloud, or hybrid before production. | — (OK / review) |
| `server.commandDisplays.title` | Control Room | — (OK / review) |
| `server.commandDisplays.hint` |  | (keep empty — teach strip off) |
| `server.commandDisplays.open` | Configure monitors | Configure Monitors |
| `tech.adminPin.title` | System Root PIN | — (OK / review) |
| `tech.adminPin.hint` | Separate from login. Required for Diagnostics. Confirm with your login password to change it. | — (OK / review) |
| `tech.adminPin.setBtn` | Set / reset PIN | Set / Reset PIN |
| `tech.adminPin.resetBtn` | Reset PIN | — (OK / review) |
| `tech.adminPin.statusSet` | Status: PIN is set on this server. | — (OK / review) |
| `tech.adminPin.statusNotSet` | Status: not set yet - set a PIN before opening Diagnostics. | — (OK / review) |
| `tech.adminPin.statusUnknown` | Status: could not check. | Status: Could Not Check. |
| `tech.adminPin.forgotLink` | Forgot PIN? Set / reset (super admin) | — (OK / review) |
| `tech.provision.pinSameAsLogin` | System Root PIN cannot be the same as your login password. Choose a different PIN. | — (OK / review) |
| `authAudit.checklist.title` | Auth and Audit - Before Ship | — (OK / review) |
| `authAudit.checklist.hint` | Amber while testing is OK. Customer ship needs green. Click a row to open settings. | — (OK / review) |
| `authAudit.checklist.score` | ready | Ready |
| `authAudit.checklist.loadFailed` | Could not load auth checklist. Restart the server or try again. | — (OK / review) |
| `authAudit.checklist.totp.label` | Authenticator (TOTP) | — (OK / review) |
| `authAudit.checklist.totp.benchSuspended` | Bench: TOTP paused (FM_TOTP_SUSPENDED). Remove this flag before customer ship. | — (OK / review) |
| `authAudit.checklist.totp.shipReady` | TOTP is on and this super admin has enrolled an authenticator. | — (OK / review) |
| `authAudit.checklist.totp.enrollNeeded` | TOTP is on for ship - enroll authenticator for this super admin (My account / first login). | — (OK / review) |
| `authAudit.checklist.smtp.label` | Outbound Email (SMTP) | — (OK / review) |
| `authAudit.checklist.smtp.ok` | SMTP host and from-address are set. | SMTP Host and from-address Are Set. |
| `authAudit.checklist.smtp.missing` | Set SMTP under Dashboard Authentication (needed for recovery / reset email). | — (OK / review) |
| `authAudit.checklist.recovery.label` | Recovery Email | — (OK / review) |
| `authAudit.checklist.recovery.ok` | Verified recovery email on this super admin account. | — (OK / review) |
| `authAudit.checklist.recovery.pending` | Verification email sent - open the link to finish. | — (OK / review) |
| `authAudit.checklist.recovery.unverified` | Recovery email saved but not verified yet. | — (OK / review) |
| `authAudit.checklist.recovery.missing` | Add and verify a recovery email (My account). | — (OK / review) |
| `authAudit.checklist.techPin.label` | System Root PIN | — (OK / review) |
| `authAudit.checklist.techPin.ok` | System Root PIN is set (Diagnostics). | System Root PIN Is Set (Diagnostics). |
| `authAudit.checklist.techPin.missing` | Set System Root PIN on this page (must differ from login). | — (OK / review) |
| `authAudit.checklist.audit.label` | Audit Trail | — (OK / review) |
| `authAudit.checklist.audit.ok` | Audit trail and CSV export are available - open to confirm. | — (OK / review) |
| `healthPlain.ok` | System OK | — (OK / review) |
| `healthPlain.serverLost` | CRITICAL SYSTEM ALERT: MAIN SERVER CONNECTION LOST. RECONNECTING... | — (OK / review) |
| `healthPlain.notOk` | System not OK | System Not OK |
| `healthPlain.notOkReason` | System not OK - {reason} | System Not OK - {reason} |
| `healthPlain.okTitle` | Dashboard, Cameras, Talk, and Live Video Look Ready. | — (OK / review) |
| `healthPlain.notOkTitle` | Something core is down. Check Settings or restart lab Start. | — (OK / review) |
| `healthPlain.stripLabel` | System | — (OK / review) |
| `healthPlain.reason.http` | Dashboard | — (OK / review) |
| `healthPlain.reason.sip` | Cameras / signaling | Cameras / Signaling |
| `healthPlain.reason.ptt` | Push-to-talk | — (OK / review) |
| `healthPlain.reason.pool` | Live video | Live Video |
| `evidence.frStorageTitle` | Face Recognition Storage | — (OK / review) |
| `evidence.frStorageHint` |  | (keep empty — teach strip off) |
| `evidence.frStorageRoot` | Storage Path | — (OK / review) |
| `evidence.frStorageConfigured` | Active Path | — (OK / review) |
| `evidence.frStorageRestart` | Restart Mobility once to activate this workspace. Existing FR data will be copied safely; the old copy remains for rollback. | — (OK / review) |
| `evidence.frStorageSavedRestart` | Storage saved. Restart Mobility once to activate the new FR workspace. | — (OK / review) |
| `evidenceHub.importForensic` | Import forensic file | Import Forensic File |
| `evidenceHub.importChecking` | Checking signature and integrity... | Checking Signature and Integrity... |
| `evidenceHub.importAccepted` | Forensic evidence admitted and hashed. | Forensic Evidence Admitted and Hashed. |
| `evidenceHub.hashLegacyPending` | Legacy file - scan storage to calculate | — (OK / review) |
| `evidence.integrityMismatch` | Integrity warning: {n} evidence file(s) no longer match their SHA-256. | — (OK / review) |
| `evidence.integrityUnverified` | Scan complete: {indexed} indexed; {n} legacy or missing file(s) could not be verified. | — (OK / review) |
| `evidence.integrityPassed` | Scan complete: {indexed} indexed; {n} evidence file(s) passed integrity verification. | — (OK / review) |
| `tactical.poiTitle` | AR POIS | — (OK / review) |
| `tactical.poiHint` | Map pins linked to a Fixed Camera | — (OK / review) |
| `tactical.poiPlace` | Place POI | — (OK / review) |
| `tactical.poiDelete` | Delete POI | — (OK / review) |
| `tactical.poiName` | POI Name | — (OK / review) |
| `tactical.poiFixedCam` | Linked Fixed Camera | — (OK / review) |
| `tactical.poiFixedNone` | None | — (OK / review) |
| `tactical.poiOpen` | Open Live | — (OK / review) |
| `tactical.poiNone` | No POIs | No Pois |
| `tactical.poiDefaultName` | POI {n} | — (OK / review) |
| `tactical.poiStatusPlace` | Click map to place POI | Click Map to Place POI |
| `tactical.poiStatusPlaced` | POI placed | POI Placed |
| `tactical.poiStatusMoved` | POI moved | POI Moved |
| `tactical.poiStatusDeleted` | POI deleted | POI Deleted |
| `tactical.poiStatusNeedPoi` | Select a POI | — (OK / review) |
| `tactical.poiStatusOpening` | Opening linked cam... | Opening Linked Cam... |
| `tactical.poiStatusWall` | Opened on video wall (panel 9+) | Opened on Video Wall (Panel 9+) |
| `tactical.poiStatusBwc` | Opened {n} BWC on wall | Opened {n} BWC on Wall |
| `tactical.poiStatusNoLink` | Link a Fixed Camera first | Link a Fixed Camera First |
| `tactical.poiStatusConnecting` | Connecting... | — (OK / review) |
| `tactical.poiStatusLive` | Live | — (OK / review) |
| `tactical.poiStatusFail` | Video unavailable | Video Unavailable |
| `tactical.poiStatusNoPlayer` | Live video player unavailable | Live Video Player Unavailable |
| `conference.exitFocus` | Exit Focus | — (OK / review) |
| `conference.exitFocusHint` | Back to Speaker (Esc) | — (OK / review) |
| `conference.layoutFocusTile` | Focus | — (OK / review) |
| `conference.layoutWaitingVideo` | Waiting for video... | Waiting for Video... |
| `conference.layoutWaitingPeople` | Waiting for participants... | Waiting for Participants... |
| `conference.bwcAdding` | Adding {name}... | — (OK / review) |
| `conference.bwcAddOk` | LIVE · {name} | — (OK / review) |
| `conference.bwcAddFailed` | Failed: {name} | — (OK / review) |
| `conference.fixedAdding` | Adding {name}... | — (OK / review) |
| `conference.fixedAddOk` | LIVE · {name} | — (OK / review) |
| `conference.fixedAddFailed` | Failed: {name} | — (OK / review) |
| `analytics.weapon.lbTitle` | Weapon Detection | — (OK / review) |
| `analytics.weapon.engineWarming` | Weapon Engine - Warming... | — (OK / review) |
| `analytics.weapon.lbZoomHint` | Hover to magnify | Hover to Magnify |
| `analytics.weapon.toastTitle` | Weapon Detection | — (OK / review) |
| `analytics.weapon.hqBarLabel` | WEAPON | Weapon |
| `analytics.weapon.hqOpenWeapon` | Open Weapon | — (OK / review) |
| `analytics.weapon.hqShowMap` | Show on map | Show on Map |
| `analytics.weapon.recentEmpty` | No detections yet | No Detections Yet |
| `analytics.weapon.magnify` | Magnify | — (OK / review) |
| `analytics.weapon.hqHistory` | History | — (OK / review) |
| `analytics.weapon.historyTitle` | Weapon Alert History | — (OK / review) |
| `analytics.weapon.historyHint` | Ack’d or overflow hits - open to review again | — (OK / review) |
| `analytics.weapon.historyEmpty` | No closed alerts yet | No Closed Alerts Yet |
| `analytics.weapon.historyOpen` | Open | — (OK / review) |
| `analytics.weapon.caseOpen` | Case | — (OK / review) |
| `analytics.weapon.caseBack` | Back | — (OK / review) |
| `analytics.weapon.caseAddon` | Add-on note | Add-on Note |
| `analytics.weapon.caseAddonPh` | Type note... | Type Note... |
| `analytics.weapon.caseSave` | Save add-on | — (OK / review) |
| `analytics.weapon.caseNotes` | Notes | — (OK / review) |
| `analytics.weapon.caseNotesEmpty` | No add-on notes yet | No add-on Notes Yet |
| `analytics.weapon.caseAudit` | Touch log | Touch Log |
| `analytics.weapon.caseGateAdmin` | You can edit or delete past notes. | — (OK / review) |
| `analytics.weapon.caseGateOps` | Add notes only. Edit or delete needs a Super admin. | — (OK / review) |
| `analytics.weapon.caseGateDenied` | Super admin only. | Super Admin Only. |
| `analytics.weapon.caseEditNote` | Edit | — (OK / review) |
| `analytics.weapon.caseDeleteNote` | Delete | — (OK / review) |
| `analytics.weapon.caseEditPrompt` | Edit note (Super admin) | Edit Note (Super Admin) |
| `analytics.weapon.caseDeleteConfirm` | Delete this note? (Super admin) | — (OK / review) |
| `sos.detail.groundMissing` | No dock/ground clip linked yet. | No Dock/Ground Clip Linked Yet. |
| `sos.detail.groundRecording` | Ground recording (dock) | Ground Recording (Dock) |
| `sos.detail.hqMissing` | No HQ clip for this SOS. | No HQ Clip for This SOS. |
| `sos.detail.hqRecording` | HQ recording (live path) | HQ Recording (Live Path) |
| `sos.ledger.hasGround` | ground video | Ground Video |
| `sos.ledger.hasHq` | HQ video | HQ Video |
| `evidenceHub.navOpsCases` | Cases | — (OK / review) |
| `opsCases.hint` | SOS and analytics cases - notes and status. | — (OK / review) |
| `opsCases.filterFamily` | Family | — (OK / review) |
| `opsCases.familyAll` | All | — (OK / review) |
| `opsCases.familySos` | SOS | — (OK / review) |
| `opsCases.familyAnalytics` | Analytics | — (OK / review) |
| `opsCases.filterType` | Type | — (OK / review) |
| `opsCases.typeAll` | All | — (OK / review) |
| `opsCases.typeWeapon` | Weapon | — (OK / review) |
| `opsCases.filterAudit` | Audit | — (OK / review) |
| `opsCases.auditAll` | All statuses | All Statuses |
| `opsCases.auditAckOnly` | Ack only | Ack Only |
| `opsCases.auditAck24` | Ack only · 24h+ | Ack Only · 24h+ |
| `opsCases.auditAck7d` | Ack only · 7d+ | Ack Only · 7d+ |
| `opsCases.auditAck30d` | Ack only · 30d+ | Ack Only · 30d+ |
| `opsCases.filterDays` | Days | — (OK / review) |
| `opsCases.filterSearch` | Search | — (OK / review) |
| `opsCases.searchPh` | Case ID, camera, notes... | Case ID, Camera, Notes... |
| `opsCases.empty` | No cases in this period. | No Cases in This Period. |
| `opsCases.emptyHint` | Acknowledged SOS and analytics alerts appear here. | — (OK / review) |
| `opsCases.colId` | Case ID | — (OK / review) |
| `opsCases.colRev` | Rev | — (OK / review) |
| `opsCases.colStatus` | Status | — (OK / review) |
| `opsCases.colType` | Type | — (OK / review) |
| `opsCases.colKind` | Kind | — (OK / review) |
| `opsCases.colCamera` | Camera | — (OK / review) |
| `opsCases.colWhen` | When | — (OK / review) |
| `opsCases.colBy` | Closed by | — (OK / review) |
| `opsCases.back` | Back to list | Back to List |
| `opsCases.notesTitle` | Notes | — (OK / review) |
| `opsCases.addNote` | Add note | Add Note |
| `opsCases.saveNote` | Save note | Save Note |
| `opsCases.auditTitle` | Activity | — (OK / review) |
| `opsCases.statusAckOnly` | Ack only | Ack Only |
| `opsCases.statusHasNotes` | Has notes | Has Notes |
| `opsCases.statusAmended` | Amended | — (OK / review) |
| `opsCases.statusReviewed` | Reviewed | — (OK / review) |
| `opsCases.metaShown` | {n} shown | {n} Shown |
| `opsCases.loading` | Loading... | — (OK / review) |
| `opsCases.loadFailed` | Could not load cases | Could Not Load Cases |
| `opsCases.closed` | closed | Closed |
| `opsCases.by` | by | By |
| `opsCases.lastTouch` | Last activity | Last Activity |
| `opsCases.gateAdmin` | You can edit or delete past notes. | — (OK / review) |
| `opsCases.gateOps` | Add notes only. Edit or delete needs a Super admin. | — (OK / review) |
| `opsCases.notesEmpty` | No add-on notes yet | No add-on Notes Yet |
| `opsCases.edited` | edited | Edited |
| `opsCases.editPrompt` | Edit note | Edit Note |
| `opsCases.deleteConfirm` | Delete this note? | Delete This Note? |
| `opsCases.auditEmpty` | No touch log yet | No Touch Log Yet |
| `opsCases.editNote` | Edit | — (OK / review) |
| `opsCases.deleteNote` | Delete | — (OK / review) |
| `analytics.weapon.hqCases` | Cases | — (OK / review) |
| `bwc.col.serial` | Serial | — (OK / review) |
| `bwc.col.unitCode` | Unit | — (OK / review) |
| `bwc.field.serial` | Serial / asset tag | Serial / Asset Tag |
| `bwc.placeholder.serial` | Sticker on camera (dock folder name) | Sticker on Camera (Dock Folder Name) |
| `bwc.hint.serial` | Camera serial / asset tag - used for dock uploads. Must be unique. | — (OK / review) |
| `bwc.error.serialDuplicate` | Serial already used on another camera | Serial Already Used on Another Camera |
| `caseFiles.needNarrative` | Write the field report before saving. | Write the Field Report Before Saving. |
| `opsCases.deskHint` | Case desk: link Library clips, map, notes. | — (OK / review) |
| `opsCases.deskMedia` | Evidence media | Evidence Media |
| `opsCases.deskMediaEmpty` | No clip linked yet. Pick from Library below, or wait for SOS / dock auto-link. | — (OK / review) |
| `opsCases.deskMap` | Location | — (OK / review) |
| `opsCases.deskMapEmpty` | No GPS on this case yet. | No GPS on This Case Yet. |
| `opsCases.deskFieldCamera` | Camera | — (OK / review) |
| `opsCases.deskFieldType` | Type | — (OK / review) |
| `opsCases.deskFieldStatus` | Status | — (OK / review) |
| `opsCases.deskFieldTitle` | Title |  |
| `opsCases.deskLinkServerRec` | Server record | Server Record |
| `opsCases.deskLinkDeviceRec` | Device record | Device Record |
| `opsCases.deskLinkSos` | SOS id | SOS ID |
| `opsCases.bindLabel` | Link Library File | — (OK / review) |
| `opsCases.bindPh` | Evidence file id | Evidence File ID |
| `opsCases.bindBtn` | Link | — (OK / review) |
| `opsCases.playEvidence` | Play | — (OK / review) |
| `opsCases.unlinkEvidence` | Unlink | — (OK / review) |
| `opsCases.filterArchive` | List | — (OK / review) |
| `opsCases.archiveActive` | Active | — (OK / review) |
| `opsCases.archiveArchivedOnly` | Archived only | Archived Only |
| `opsCases.archiveAll` | All (active + archived) | All (Active + Archived) |
| `opsCases.statusArchived` | Archived | — (OK / review) |
| `opsCases.archiveBtn` | Archive (hide from list) | Archive (Hide from List) |
| `opsCases.unarchiveBtn` | Restore to active list | Restore to Active List |
| `opsCases.archiveConfirm` | Archive this case? It leaves the Active list but stays on disk (notes, links, audit). Library media is not deleted. | — (OK / review) |
| `opsCases.bulkArchive` | Bulk Archive | — (OK / review) |
| `opsCases.bulkArchiveConfirm` | Are you sure you want to archive the selected cases? They will be hidden from the Active list but can be restored later. | — (OK / review) |
| `opsCases.bulkArchiveNone` | No cases selected to archive. | No Cases Selected to Archive. |
| `opsCases.bulkArchiveDone` | Archived {ok}, failed {fail} | Archived {ok}, Failed {fail} |
| `opsCases.bulkPurge` | Bulk Archive | — (OK / review) |
| `opsCases.archiveNeedAdmin` | Super admin required to archive cases. | Super Admin Required to Archive Cases. |
| `opsCases.deskMapOpen` | Open location in Maps | Open Location in Maps |
| `opsCases.deskMapReset` | Reset view | Reset View |
| `opsCases.addNotePh` | Type a note for this case... | Type a Note for This Case... |
| `opsCases.continueCaseFile` | Continue as Case File | — (OK / review) |
| `opsCases.linkedCaseFile` | Linked Case File | — (OK / review) |
| `opsCases.openLinkedCaseFile` | Open | — (OK / review) |
| `caseFiles.linkedOpsCase` | Linked Ops Case | — (OK / review) |
| `opsCases.bindSearchLabel` | Search Library | — (OK / review) |
| `opsCases.bindSearchPh` | File name or camera... | File Name or Camera... |
| `opsCases.bindPickEmpty` | Select a Library file... | Select a Library File... |
| `opsCases.bindRefresh` | Refresh list | Refresh List |
| `opsCases.bindAdvanced` | Advanced: paste file id | Advanced: Paste File ID |
| `opsCases.bindIdLabel` | File ID (support only) | File ID (Support Only) |
| `opsCases.bindCamMatch` | (this camera) | (This Camera) |
| `opsCases.bindLoadFailed` | Could not load Library list | Could Not Load Library List |
| `opsCases.bindPickNeed` | Select a Library file (or use Advanced id). | — (OK / review) |
| `evidenceHub.navRetention` | Retention | — (OK / review) |
| `evidenceRetention.hint` | Categories control how long Library files are kept. | — (OK / review) |
| `evidenceRetention.listTitle` | Categories | — (OK / review) |
| `evidenceRetention.empty` | No categories yet. | No Categories Yet. |
| `evidenceRetention.colName` | Name | — (OK / review) |
| `evidenceRetention.colKeep` | Keep for | — (OK / review) |
| `evidenceRetention.colActions` | Actions | — (OK / review) |
| `evidenceRetention.addTitle` | Add Category | — (OK / review) |
| `evidenceRetention.editTitle` | Edit Category | — (OK / review) |
| `evidenceRetention.name` | Name | — (OK / review) |
| `evidenceRetention.namePh` | e.g. Standard, Incident, Until delete | — (OK / review) |
| `evidenceRetention.mode` | Retention | — (OK / review) |
| `evidenceRetention.modeDays` | Keep for N days | Keep for N Days |
| `evidenceRetention.modeManual` | Indefinite (Manual) | — (OK / review) |
| `evidenceRetention.days` | Days | — (OK / review) |
| `evidenceRetention.daysUnit` | days | Days |
| `evidenceRetention.untilManual` | Indefinite (Manual) | — (OK / review) |
| `evidenceRetention.save` | Save category | Save Category |
| `evidenceRetention.deleteConfirm` | Delete this retention category? | Delete This Retention Category? |
| `evidenceRetention.needAdmin` | Super admin required to edit retention categories. | — (OK / review) |
| `evidenceRetention.nameRequired` | Enter a category name. | Enter a Category Name. |
| `evidenceRetention.loadFailed` | Could not load categories | Could Not Load Categories |
| `evidenceHub.navDeleteQueue` | Deletion Queue | — (OK / review) |
| `evidenceDeleteQueue.hint` | Queued deletes stay recoverable for 7 days, then purge. | — (OK / review) |
| `evidenceDeleteQueue.emptyTitle` | Deletion Queue Is Empty | — (OK / review) |
| `evidenceDeleteQueue.empty` | No files are currently scheduled for permanent removal. | — (OK / review) |
| `evidenceDeleteQueue.colFile` | File | — (OK / review) |
| `evidenceDeleteQueue.colCamera` | Camera | — (OK / review) |
| `evidenceDeleteQueue.colQueued` | Queued | — (OK / review) |
| `evidenceDeleteQueue.colPurge` | Purge after | Purge After |
| `evidenceDeleteQueue.colBy` | By | — (OK / review) |
| `evidenceDeleteQueue.colActions` | Actions | — (OK / review) |
| `evidenceDeleteQueue.restore` | Restore | — (OK / review) |
| `evidenceDeleteQueue.purgeDue` | Purge due now | Purge Due Now |
| `evidenceDeleteQueue.purgeConfirm` | Permanently delete files whose 7-day wait is over? | — (OK / review) |
| `evidenceDeleteQueue.purgeDone` | Purged | — (OK / review) |
| `evidenceDeleteQueue.window` | Purge after | Purge After |
| `evidenceDeleteQueue.loadFailed` | Could not load queue | Could Not Load Queue |
| `evidenceDeleteQueue.badge` | Queued for deletion | Queued for Deletion |
| `evidenceDeleteQueue.detailHint` | Queued for deletion. Purge after | — (OK / review) |
| `evidenceDeleteQueue.deleteBtn` | Delete (7-day queue) | Delete (7-day Queue) |
| `evidenceDeleteQueue.confirm` | Queue this file for deletion? It stays recoverable for 7 days, then is permanently removed. | — (OK / review) |
| `evidenceDeleteQueue.restoreConfirm` | Restore this file to the Library? | Restore This File to the Library? |
| `evidenceHub.redactNeedsLicense` | Redaction license required | Redaction License Required |
| `dockIdentity.done` | Mark complete | Mark Complete |
| `dockIdentity.remind` | Remind later | Remind Later |
| `dockIdentity.title` | Missing Camera Serials | — (OK / review) |
| `dockIdentity.introLead` | To ensure dock uploads route correctly: | To Ensure Dock Uploads Route Correctly: |
| `dockIdentity.step1` | Read the asset sticker on each body camera. | — (OK / review) |
| `dockIdentity.step2` | Go to Settings -> BWCs and enter the matching serial number. | — (OK / review) |
| `dockIdentity.step3` | Ensure dock/FTP uploads land in folders named by that serial. | — (OK / review) |
| `dockIdentity.openBwc` | Open BWCs | — (OK / review) |
| `dockIdentity.whereSerial` | Settings -> BWCs -> Serial column (after Officer) | — (OK / review) |
| `hqAlertAudio.hint` | Desk beeps for Weapon, Face, Plate, and SOS. Turn off Enable alert tones to silence them. | — (OK / review) |
| `hqAlertAudio.title` | Alert Tones | — (OK / review) |
| `hqAlertAudio.enabled` | Enable alert tones | Enable Alert Tones |
| `hqAlertAudio.weapon` | Weapon tones | Weapon Tones |
| `hqAlertAudio.fr` | Face match tones | Face Match Tones |
| `hqAlertAudio.anpr` | Plate hit tones | Plate Hit Tones |
| `hqAlertAudio.sos` | SOS / fall tones | SOS / Fall Tones |
| `hqAlertAudio.test` | Test tone | Test Tone |
| `hqAlertAudio.save` | Save alert tones | Save Alert Tones |
| `hqAlertAudio.saved` | Alert tones saved | Alert Tones Saved |
| `hqAlertAudio.sosPreset` | SOS tone | SOS Tone |
| `hqAlertAudio.analyticsPreset` | Analytics tone | Analytics Tone |
| `hqAlertAudio.holdSec` | Hold after speak | Hold After Speak |
| `hqAlertAudio.hold5` | 5 seconds | 5 Seconds |
| `hqAlertAudio.hold8` | 8 seconds (recommended) | 8 Seconds (Recommended) |
| `hqAlertAudio.hold10` | 10 seconds | 10 Seconds |
| `hqAlertAudio.presetUrgent` | Urgent (default SOS) | Urgent (Default SOS) |
| `hqAlertAudio.presetClassic` | Classic | — (OK / review) |
| `hqAlertAudio.presetPulse` | Pulse | — (OK / review) |
| `hqAlertAudio.presetSoft` | Soft | — (OK / review) |
| `hqAlertAudio.preview` | Preview | — (OK / review) |
| `hqAlertAudio.previewSos` | Preview SOS | — (OK / review) |
| `hqAlertAudio.previewAnalytics` | Preview analytics | Preview Analytics |
| `hqAlertAudio.customTitle` | Custom Tone | — (OK / review) |
| `hqAlertAudio.customHint` | Default uses the preset above. Custom uses an uploaded clip (mp3/wav/ogg/webm, max 500 KB). Preview does not save - use Save alert tones. | — (OK / review) |
| `hqAlertAudio.customSos` | SOS | — (OK / review) |
| `hqAlertAudio.customAnalytics` | Analytics | — (OK / review) |
| `hqAlertAudio.modeDefault` | Default | — (OK / review) |
| `hqAlertAudio.modeCustom` | Custom | — (OK / review) |
| `hqAlertAudio.clearCustom` | Clear | — (OK / review) |
| `hqAlertAudio.pendingSave` | pending save | Pending Save |
| `hqAlertAudio.willClear` | Will clear on save | Will Clear on Save |
| `hqAlertAudio.customOnServer` | Custom file on server | Custom File on Server |
| `hqAlertAudio.fileTooLarge` | Tone file too large (max 500 KB) | — (OK / review) |
| `tactical.accIncidentFloor` | Incident and Floor Plan | — (OK / review) |
| `tactical.accPoi` | Points of Interest (POI) | — (OK / review) |
| `tactical.accZonesOps` | Zones and Operations | — (OK / review) |

## B. Hardcoded `tr(key, fallback)` in `public/js` that differ from en.json or lack keys (259)

| File | Key | Hardcoded Fallback | Proposed Enterprise Fix |
|------|-----|--------------------|-------------------------|
| `public/js/analytics-hub.js` | `analytics.verify.engineChecking` | Checking FR Engine\\u2026 | — (OK / review) |
| `public/js/analytics-hub.js` | `analytics.verify.engineNotLicensed` | FR Engine \\u2014 Not licensed | FR Engine \U2014 Not Licensed |
| `public/js/analytics-hub.js` | `analytics.verify.engineOk` | FR Engine \\u2014 OK | FR Engine \U2014 OK |
| `public/js/analytics-hub.js` | `analytics.verify.engineDown` | FR Engine \\u2014 Not available | FR Engine \U2014 Not Available |
| `public/js/analytics-hub.js` | `analytics.verify.engineDown` | FR Engine \\u2014 Not available | FR Engine \U2014 Not Available |
| `public/js/analytics-hub.js` | `analytics.weapon.engineChecking` | Checking Weapon Engine\\u2026 | — (OK / review) |
| `public/js/analytics-hub.js` | `analytics.weapon.engineNotLicensed` | Weapon Engine \\u2014 Not licensed | Weapon Engine \U2014 Not Licensed |
| `public/js/analytics-hub.js` | `analytics.weapon.engineOk` | Weapon Engine \\u2014 OK | Weapon Engine \U2014 OK |
| `public/js/analytics-hub.js` | `analytics.weapon.engineWarming` | Weapon Engine \\u2014 Warming\\u2026 | Weapon Engine \U2014 Warming\u2026 |
| `public/js/analytics-hub.js` | `analytics.weapon.engineNotReady` | Weapon Engine \\u2014 Not ready | Weapon Engine \U2014 Not Ready |
| `public/js/analytics-hub.js` | `analytics.weapon.engineNotReady` | Weapon Engine \\u2014 Not ready | Weapon Engine \U2014 Not Ready |
| `public/js/analytics-hub.js` | `analytics.anpr.lists.loading` | Loading\\u2026 | — (OK / review) |
| `public/js/analytics-hub.js` | `analytics.bl.statusOff` | Off | — (OK / review) |
| `public/js/analytics-hub.js` | `analytics.anpr.engineNotLicensed` | ANPR Engine \\u2014 Not licensed | ANPR Engine \U2014 Not Licensed |
| `public/js/analytics-hub.js` | `analytics.anpr.engineChecking` | Checking ANPR Engine\\u2026 | — (OK / review) |
| `public/js/analytics-hub.js` | `analytics.anpr.engineNotLicensed` | ANPR Engine \\u2014 Not licensed | ANPR Engine \U2014 Not Licensed |
| `public/js/analytics-hub.js` | `analytics.anpr.engineOk` | ANPR Engine \\u2014 OK | ANPR Engine \U2014 OK |
| `public/js/analytics-hub.js` | `analytics.anpr.engineDown` | ANPR Engine \\u2014 Not available | ANPR Engine \U2014 Not Available |
| `public/js/analytics-hub.js` | `analytics.anpr.engineDown` | ANPR Engine \\u2014 Not available | ANPR Engine \U2014 Not Available |
| `public/js/analytics-hub.js` | `analytics.anpr.plateIdle` | Awaiting analysis | Awaiting Analysis |
| `public/js/analytics-hub.js` | `analytics.anpr.reading` | Reading plate\\u2026 | — (OK / review) |
| `public/js/analytics-hub.js` | `analytics.anpr.cropFallback` | Crop tool unavailable \\u2014 using full image. | — (OK / review) |
| `public/js/analytics-hub.js` | `analytics.anpr.cropReadyPreview` | Crop ready \\u2014 click Read plate. | Crop Ready \U2014 Click Read Plate. |
| `public/js/analytics-hub.js` | `analytics.anpr.reading` | Reading plate\\u2026 | — (OK / review) |
| `public/js/analytics-hub.js` | `analytics.anpr.plateIdle` | Awaiting analysis | Awaiting Analysis |
| `public/js/analytics-hub.js` | `analytics.anpr.batchNoPlate` | No plate | No Plate |
| `public/js/analytics-hub.js` | `analytics.verify.engineNotLicensed` | FR Engine \\u2014 Not licensed | FR Engine \U2014 Not Licensed |
| `public/js/analytics-hub.js` | `analytics.verify.engineDown` | FR Engine \\u2014 Not available | FR Engine \U2014 Not Available |
| `public/js/analytics-hub.js` | `analytics.verify.engineDown` | FR Engine \\u2014 Not available | FR Engine \U2014 Not Available |
| `public/js/analytics-hub.js` | `analytics.bl.cropFallback` | Crop tool unavailable \\u2014 using full image. | — (OK / review) |
| `public/js/analytics-hub.js` | `analytics.bl.idNumber` | ID / case ref | ID / Case Ref |
| `public/js/analytics-hub.js` | `analytics.bl.lastSeen` | Last seen | Last Seen |
| `public/js/analytics-hub.js` | `analytics.bl.lastIncident` | Last incident | Last Incident |
| `public/js/analytics-hub.js` | `analytics.bl.notes` | Notes | — (OK / review) |
| `public/js/analytics-hub.js` | `analytics.verify.running` | Comparing photos\\u2026 | — (OK / review) |
| `public/js/analytics-hub.js` | `analytics.bl.loading` | Loading\\u2026 | — (OK / review) |
| `public/js/analytics-hub.js` | `analytics.bl.thresholdSaving` | Saving match threshold\\u2026 | Saving Match threshold\u2026 |
| `public/js/analytics-hub.js` | `analytics.bl.thresholdSaveFail` | Could not save threshold. | Could Not Save Threshold. |
| `public/js/analytics-hub.js` | `analytics.bl.enrollBwcNoSnap` | Choose a BWC snapshot first. | Choose a BWC Snapshot First. |
| `public/js/analytics-hub.js` | `analytics.bl.enrolling` | Enrolling\\u2026 | — (OK / review) |
| `public/js/anpr-history.js` | `analytics.anpr.unclear` | Unclear / Manual Review | — (OK / review) |
| `public/js/anpr-history.js` | `analytics.anpr.histEmpty` | No captures match these filters. | No Captures Match These Filters. |
| `public/js/anpr-history.js` | `analytics.anpr.histLoading` | Loading… | — (OK / review) |
| `public/js/anpr-history.js` | `analytics.anpr.histFail` | History unavailable | History Unavailable |
| `public/js/anpr-history.js` | `analytics.anpr.histCount` | Showing | — (OK / review) |
| `public/js/anpr-history.js` | `analytics.anpr.histEnd` | end | End |
| `public/js/anpr-history.js` | `analytics.anpr.histFail` | History unavailable | History Unavailable |
| `public/js/anpr-image-investigation.js` | `analytics.anpr.imageScanning` | Scanning… | — (OK / review) |
| `public/js/anpr-image-investigation.js` | `analytics.anpr.imageFtpLoading` | Loading inbox… | Loading Inbox… |
| `public/js/anpr-live-watch.js` | `analytics.fr.tileWaiting` | Waiting… | — (OK / review) |
| `public/js/anpr-live-watch.js` | `analytics.fr.tileConnecting` | Connecting\\u2026 | — (OK / review) |
| `public/js/anpr-live-watch.js` | `analytics.fr.tileSignalLost` | Signal lost \\u2014 retrying\\u2026 | Signal Lost \U2014 retrying\u2026 |
| `public/js/anpr-live-watch.js` | `analytics.fr.tileLiveCap` | Server live limit \\u2014 pause other views | — (OK / review) |
| `public/js/anpr-live-watch.js` | `analytics.fr.tileWaiting` | Waiting… | — (OK / review) |
| `public/js/anpr-live-watch.js` | `analytics.fr.tileConnecting` | Connecting\\u2026 | — (OK / review) |
| `public/js/anpr-live-watch.js` | `analytics.anpr.motionMoving` | Moving | — (OK / review) |
| `public/js/anpr-live-watch.js` | `analytics.anpr.motionStationary` | Stationary | — (OK / review) |
| `public/js/anpr-live-watch.js` | `analytics.anpr.motionStationary` | Stationary | — (OK / review) |
| `public/js/anpr-live-watch.js` | `analytics.anpr.mmrMismatch` | Registered vs visual mismatch | Registered Vs Visual Mismatch |
| `public/js/anpr-live-watch.js` | `analytics.anpr.liveRailNoText` | No plate | No Plate |
| `public/js/anpr-live-watch.js` | `analytics.anpr.liveRailExpandHint` | Open evidence | Open Evidence |
| `public/js/anpr-live-watch.js` | `analytics.anpr.liveRailNoText` | No plate | No Plate |
| `public/js/anpr-live-watch.js` | `analytics.anpr.liveRailExpandHint` | Open evidence | Open Evidence |
| `public/js/anpr-live-watch.js` | `analytics.anpr.liveRailExpandHint` | Open evidence | Open Evidence |
| `public/js/anpr-live-watch.js` | `analytics.anpr.downloadEvidence` | Download Evidence | — (OK / review) |
| `public/js/anpr-live-watch.js` | `analytics.anpr.lbZoomHint` | Hover image to enlarge | Hover Image to Enlarge |
| `public/js/anpr-live-watch.js` | `analytics.anpr.lbZoomHint` | Hover image to enlarge | Hover Image to Enlarge |
| `public/js/anpr-live-watch.js` | `analytics.anpr.lbZoomHint` | Hover image to enlarge | Hover Image to Enlarge |
| `public/js/anpr-live-watch.js` | `analytics.anpr.lbZoomHint` | Hover image to enlarge | Hover Image to Enlarge |
| `public/js/anpr-live-watch.js` | `analytics.anpr.copyLocation` | Copy location | Copy Location |
| `public/js/anpr-live-watch.js` | `analytics.anpr.downloadEvidence` | Download Evidence | — (OK / review) |
| `public/js/anpr-live-watch.js` | `analytics.anpr.copyLocation` | Copy location | Copy Location |
| `public/js/anpr-live-watch.js` | `analytics.anpr.liveSnapTitle` | Vehicle snap | Vehicle Snap |
| `public/js/anpr-live-watch.js` | `analytics.anpr.unclear` | Unclear / Manual Review | — (OK / review) |
| `public/js/anpr-live-watch.js` | `analytics.anpr.liveDetailMmr` | Vehicle | — (OK / review) |
| `public/js/anpr-live-watch.js` | `analytics.anpr.liveDetailGps` | Location | — (OK / review) |
| `public/js/anpr-live-watch.js` | `analytics.anpr.liveDetailGps` | Location | — (OK / review) |
| `public/js/anpr-live-watch.js` | `analytics.anpr.noLocation` | No GPS for this unit | No GPS for This Unit |
| `public/js/anpr-live-watch.js` | `analytics.anpr.engineOk` | ANPR Engine \\u2014 OK | ANPR Engine \U2014 OK |
| `public/js/anpr-live-watch.js` | `analytics.anpr.engineDown` | ANPR Engine \\u2014 Not available | ANPR Engine \U2014 Not Available |
| `public/js/anpr-live-watch.js` | `analytics.anpr.engineNotLicensed` | ANPR Engine \\u2014 Not licensed | ANPR Engine \U2014 Not Licensed |
| `public/js/anpr-live-watch.js` | `analytics.anpr.engineNotLicensed` | ANPR Engine \\u2014 Not licensed | ANPR Engine \U2014 Not Licensed |
| `public/js/anpr-offline-match.js` | `analytics.anpr.offlineCam` | Offline video | Offline Video |
| `public/js/anpr-offline-match.js` | `analytics.anpr.offlineMatching` | Matching... | — (OK / review) |
| `public/js/anpr-offline-match.js` | `analytics.anpr.offlineBadFile` | Use .mp4 or .avi video | Use .Mp4 or .Avi Video |
| `public/js/anpr-offline-match.js` | `analytics.anpr.offlineReady` | Video loaded — press play to analyze | — (OK / review) |
| `public/js/anpr-offline-match.js` | `analytics.anpr.offlineBadFile` | Use .mp4 or .avi video | Use .Mp4 or .Avi Video |
| `public/js/anpr-plate-cropper.js` | `analytics.anpr.cropTitle` | Crop plate | Crop Plate |
| `public/js/case-files-ui.js` | `caseFiles.exhibitAi` | AI report | AI Report |
| `public/js/case-files-ui.js` | `caseFiles.exhibitFr` | FR hit | FR Hit |
| `public/js/case-files-ui.js` | `caseFiles.exhibitAnpr` | ANPR hit | ANPR Hit |
| `public/js/case-files-ui.js` | `caseFiles.exhibitMedia` | Media | — (OK / review) |
| `public/js/case-files-ui.js` | `caseFiles.timelineTitle` | Chronological timeline and exhibits | Chronological Timeline and Exhibits |
| `public/js/case-files-ui.js` | `caseFiles.timelineEmpty` | No exhibits yet. | No Exhibits Yet. |
| `public/js/case-files-ui.js` | `caseFiles.exportPackage` | Export Case Package | — (OK / review) |
| `public/js/case-files-ui.js` | `caseFiles.addFromTriage` | Add from Triage | — (OK / review) |
| `public/js/conference-hub.js` | `conference.noOnlineInGroup` | No body cameras online | No Body Cameras Online |
| `public/js/conference-layout.js` | `conference.layoutDropShare` | Add BWC / fixed cameras for Operations | — (OK / review) |
| `public/js/conference-layout.js` | `conference.layoutWaitingVideo` | Waiting for video… | Waiting for Video… |
| `public/js/conference-layout.js` | `conference.layoutWaitingVideo` | Waiting for video… | Waiting for Video… |
| `public/js/conference-layout.js` | `conference.layoutWaitingPeople` | Waiting for participants… | Waiting for Participants… |
| `public/js/dock-identity-setup.js` | `dockIdentity.whereSerial` | Settings → BWCs → Serial column (after Officer) | — (OK / review) |
| `public/js/evidence-hub.js` | `caseFiles.addSelectedToIncident` | Add selected to incident | Add Selected to Incident |
| `public/js/evidence-hub.js` | `evidenceHub.pickFilesFirst` | Select one or more files first. | Select One or More Files First. |
| `public/js/evidence-hub.js` | `errors.generic` | Could not complete that action. | Could Not Complete That Action. |
| `public/js/evidence-retention-ui.js` | `evidenceRetention.untilManual` | Until manually deleted | Until Manually Deleted |
| `public/js/evidence-retention-ui.js` | `evidenceRetention.addTitle` | Add category | Add Category |
| `public/js/evidence-retention-ui.js` | `evidenceRetention.editTitle` | Edit category | Edit Category |
| `public/js/fr-alarm.js` | `analytics.fr.redToastTitle` | Face match | Face Match |
| `public/js/fr-alarm.js` | `analytics.fr.alarmField` | Alert BWC | — (OK / review) |
| `public/js/fr-alarm.js` | `analytics.fr.snapKeep` | Keep for Investigation | — (OK / review) |
| `public/js/fr-alarm.js` | `analytics.fr.previewDrawerLabHint` | Layout preview only \\u2014 not a real match | — (OK / review) |
| `public/js/fr-alarm.js` | `analytics.fr.previewDrawerLabHint` | Layout preview only \\u2014 not a real match | — (OK / review) |
| `public/js/fr-alarm.js` | `analytics.fr.redToastLine1` | {name} \\u00B7 {score}% | {name} \U00b7 {score}% |
| `public/js/fr-alarm.js` | `analytics.fr.redToastLine2` | BWC {device} \\u00B7 {cam} | BWC {device} \U00b7 {cam} |
| `public/js/fr-alarm.js` | `analytics.fr.previewDrawerLabHint` | Layout preview only \\u2014 not a real match | — (OK / review) |
| `public/js/fr-alarm.js` | `analytics.fr.blacklistPinStealPinned` | FR blacklist took a pinned live slot \\u2014 review wall panels. | — (OK / review) |
| `public/js/fr-alarm.js` | `analytics.fr.standbyPttTeamOnBtn` | Standby PTT \\u00B7 ON | Standby PTT \U00b7 on |
| `public/js/fr-alarm.js` | `analytics.fr.standbyPttTeam` | Alert PTT Group | — (OK / review) |
| `public/js/fr-alarm.js` | `analytics.fr.standbyPttTeamOn` | Standby PTT ON \\u2014 {n} unit(s): {names}. Hold PTT on map or wall. | — (OK / review) |
| `public/js/fr-alarm.js` | `analytics.fr.standbyPttTeamOk` | Standby PTT ON \\u2014 {names} ({n} units). Hold PTT to talk. | — (OK / review) |
| `public/js/fr-alarm.js` | `analytics.fr.previewDrawerLabHint` | Layout preview only \\u2014 not a real match | — (OK / review) |
| `public/js/fr-alarm.js` | `analytics.fr.standbyPttPushing` | Pushing standby PTT team\\u2026 | Pushing Standby PTT team\u2026 |
| `public/js/fr-alarm.js` | `analytics.fr.hqBarLabelPoi` | FR POI | — (OK / review) |
| `public/js/fr-alarm.js` | `analytics.fr.hqBarLabelMonitoring` | FR watch | FR Watch |
| `public/js/fr-alarm.js` | `analytics.fr.hqBarLabelSuspect` | FR suspect | FR Suspect |
| `public/js/fr-alarm.js` | `analytics.fr.hqBarLabel` | FR hit | FR Hit |
| `public/js/fr-alarm.js` | `analytics.fr.redToastTitlePoi` | Person of interest | Person of Interest |
| `public/js/fr-alarm.js` | `analytics.fr.redToastTitleMonitoring` | On monitoring | On Monitoring |
| `public/js/fr-alarm.js` | `analytics.fr.redToastTitleSuspect` | Suspect match | Suspect Match |
| `public/js/fr-alarm.js` | `analytics.fr.redToastTitle` | Face match | Face Match |
| `public/js/fr-alarm.js` | `analytics.fr.snapFloatTitleNamed` | Snapshot \\u00B7 {name} | Snapshot \U00b7 {name} |
| `public/js/fr-alarm.js` | `analytics.fr.snapMetaBwc` | {name} \\u00B7 {cam} | {name} \U00b7 {cam} |
| `public/js/fr-alarm.js` | `analytics.fr.snapDownloadEvidence` | Download Evidence | — (OK / review) |
| `public/js/fr-alarm.js` | `analytics.fr.snapDownloadNoCrop` | No face crop to download. | No Face Crop to Download. |
| `public/js/fr-alarm.js` | `analytics.fr.snapDownloading` | Downloading evidence\\u2026 | — (OK / review) |
| `public/js/fr-alarm.js` | `analytics.fr.snapDownloadFail` | Download failed. Try Keep, then open from Investigation holds. | — (OK / review) |
| `public/js/fr-alarm.js` | `analytics.fr.snapPlayTitle` | Play \\u00B7 {name} @ {t}s | Play \U00b7 {name} @ {t}s |
| `public/js/fr-alarm.js` | `analytics.fr.snapKeepNoCrop` | No face crop for this pin \\u2014 open the snap again to Keep | — (OK / review) |
| `public/js/fr-alarm.js` | `analytics.fr.snapKeeping` | Saving for investigation\\u2026 | — (OK / review) |
| `public/js/fr-alarm.js` | `analytics.fr.snapKeepNotLicensed` | Face recognition is not licensed \\u2014 cannot Keep | — (OK / review) |
| `public/js/fr-alarm.js` | `analytics.fr.snapKeepCropGone` | Crop expired \\u2014 open the snap again, then Keep | — (OK / review) |
| `public/js/fr-alarm.js` | `analytics.fr.alertDrawerTitle` | Face match alert | Face Match Alert |
| `public/js/fr-alarm.js` | `analytics.fr.alertDrawerFieldSnap` | Live Capture | — (OK / review) |
| `public/js/fr-alarm.js` | `analytics.fr.snapKeep` | Keep for Investigation | — (OK / review) |
| `public/js/fr-alarm.js` | `analytics.fr.alarmField` | Alert BWC | — (OK / review) |
| `public/js/fr-alarm.js` | `analytics.fr.standbyPttTeam` | Alert PTT Group | — (OK / review) |
| `public/js/fr-alarm.js` | `analytics.fr.snapMetaBwc` | {name} \\u00B7 {cam} | {name} \U00b7 {cam} |
| `public/js/fr-alarm.js` | `analytics.anpr.hqBarLabel` | ANPR hit | ANPR Hit |
| `public/js/fr-alarm.js` | `analytics.fr.hqBarLabel` | FR hit | FR Hit |
| `public/js/fr-alarm.js` | `analytics.fr.hqBarText` | {name} \\u00B7 {cam} \\u00B7 {score}% | {name} \U00b7 {cam} \U00b7 {score}% |
| `public/js/fr-alarm.js` | `analytics.anpr.alarmTitle` | Plate match | Plate Match |
| `public/js/fr-alarm.js` | `analytics.fr.alarmTitle` | Face match | Face Match |
| `public/js/fr-alarm.js` | `analytics.fr.snapKeepNoCrop` | No evidence crop to Keep | No Evidence Crop to Keep |
| `public/js/fr-alarm.js` | `analytics.fr.snapKeepNoCrop` | No evidence crop to Keep | No Evidence Crop to Keep |
| `public/js/fr-alarm.js` | `analytics.fr.previewDrawerLabHint` | Layout preview only \\u2014 not a real match | — (OK / review) |
| `public/js/fr-alarm.js` | `analytics.fr.previewDrawerLabHint` | Layout preview only \\u2014 not a real match | — (OK / review) |
| `public/js/fr-alarm.js` | `analytics.fr.previewDrawerLabHint` | Layout preview only \\u2014 not a real match | — (OK / review) |
| `public/js/fr-alarm.js` | `analytics.fr.alarmFieldFail` | Field alert failed \\u2014 BWC not on PTT or no SIP contact | — (OK / review) |
| `public/js/fr-alarm.js` | `analytics.fr.alarmFieldFail` | Field alert failed \\u2014 BWC not on PTT or no SIP contact | — (OK / review) |
| `public/js/fr-alarm.js` | `analytics.fr.previewDrawerLabHint` | Layout preview only \\u2014 not a real match | — (OK / review) |
| `public/js/fr-alarm.js` | `analytics.fr.previewDrawerLabHint` | Layout preview only \\u2014 not a real match | — (OK / review) |
| `public/js/fr-alarm.js` | `analytics.fr.previewDrawerLabHint` | Layout preview only \\u2014 not a real match | — (OK / review) |
| `public/js/fr-alarm.js` | `analytics.fr.previewDrawerLabHint` | Layout preview only \\u2014 not a real match | — (OK / review) |
| `public/js/fr-alarm.js` | `analytics.fr.previewDrawerLabHint` | Layout preview only \\u2014 not a real match | — (OK / review) |
| `public/js/fr-alarm.js` | `analytics.fr.previewDrawerLabHint` | Layout preview only \\u2014 not a real match | — (OK / review) |
| `public/js/fr-enroll-cropper.js` | `analytics.bl.cropTitle` | Crop face for watchlist | Crop Face for Watchlist |
| `public/js/fr-enroll-cropper.js` | `analytics.bl.cropHint` | Frame one face. Green meters match our enroll rules. No third-party crop library \\u2014 built-in tool only. | — (OK / review) |
| `public/js/fr-enroll-cropper.js` | `analytics.bl.cropChecking` | Checking with face service\\u2026 | Checking with Face service\u2026 |
| `public/js/fr-enroll-cropper.js` | `analytics.bl.faceTooSmall` | Face too small \\u2014 enlarge the frame. | — (OK / review) |
| `public/js/fr-enroll-cropper.js` | `analytics.bl.qualityBlur` | Too blurry. | Too Blurry. |
| `public/js/fr-enroll-cropper.js` | `analytics.bl.qualityLighting` | Lighting out of range. | Lighting Out of Range. |
| `public/js/fr-enroll-cropper.js` | `analytics.bl.multiFace` | More than one face \\u2014 tighten the crop. | — (OK / review) |
| `public/js/fr-enroll-cropper.js` | `analytics.verify.noFace` | No face found. | No Face Found. |
| `public/js/fr-enroll-cropper.js` | `analytics.verify.serviceDown` | Face matching is not available. | Face Matching Is Not Available. |
| `public/js/fr-enroll-cropper.js` | `analytics.verify.network` | Could not reach the server. | Could Not Reach the Server. |
| `public/js/fr-kept-ui.js` | `evidenceHub.holdsEmptyClearedTitle` | No cleared holds | No Cleared Holds |
| `public/js/fr-kept-ui.js` | `evidenceHub.holdsEmptyDiscardedTitle` | No discarded holds | No Discarded Holds |
| `public/js/fr-kept-ui.js` | `evidenceHub.holdsEmptyAllTitle` | No investigation holds yet | No Investigation Holds Yet |
| `public/js/fr-kept-ui.js` | `evidenceHub.holdsEmptyOpenTitle` | No active investigation holds | No Active Investigation Holds |
| `public/js/fr-kept-ui.js` | `evidenceHub.holdsClearReasonPick` | Select\\u2026 | — (OK / review) |
| `public/js/fr-kept-ui.js` | `evidenceHub.loading` | Loading\\u2026 | — (OK / review) |
| `public/js/fr-live-watch.js` | `analytics.fr.tileWaiting` | Waiting… | — (OK / review) |
| `public/js/fr-live-watch.js` | `analytics.fr.tileConnecting` | Connecting\\u2026 | — (OK / review) |
| `public/js/fr-live-watch.js` | `analytics.fr.tileSignalLost` | Signal lost \\u2014 retrying\\u2026 | Signal Lost \U2014 retrying\u2026 |
| `public/js/fr-live-watch.js` | `analytics.fr.tileLiveCap` | Server live limit \\u2014 pause other views | — (OK / review) |
| `public/js/fr-live-watch.js` | `analytics.fr.tileWaiting` | Waiting… | — (OK / review) |
| `public/js/fr-live-watch.js` | `analytics.fr.tileFallBadgeTitle` | Fall alert on this BWC | Fall Alert on This BWC |
| `public/js/fr-live-watch.js` | `analytics.fr.tileSosBadgeTitle` | SOS alert on this BWC | SOS Alert on This BWC |
| `public/js/fr-live-watch.js` | `analytics.fr.stopVideoSlotSelected` | Selected slot {n} — {name}. Press Stop video. | — (OK / review) |
| `public/js/fr-live-watch.js` | `analytics.fr.rosterMeta` | {n}/{max} selected \\u00B7 {live}/{slots} live | {n}/{max} Selected \U00b7 {live}/{slots} Live |
| `public/js/fr-live-watch.js` | `analytics.fr.pinHint` | Pin to a live tile | PIN to a Live Tile |
| `public/js/fr-live-watch.js` | `fleet.online` | Online | — (OK / review) |
| `public/js/fr-live-watch.js` | `fleet.offline` | Offline | — (OK / review) |
| `public/js/fr-live-watch.js` | `analytics.fr.rosterSearch` | Search officers\\u2026 | — (OK / review) |
| `public/js/fr-live-watch.js` | `analytics.fr.rosterMeta` | {n}/{max} selected \\u00B7 {live}/{slots} live | {n}/{max} Selected \U00b7 {live}/{slots} Live |
| `public/js/fr-offline-video.js` | `analytics.fr.offlineWorking` | Processing video\\u2026 | — (OK / review) |
| `public/js/fr-offline-video.js` | `analytics.fr.offlineUploading` | Uploading video\\u2026 | — (OK / review) |
| `public/js/maplibre-primary.js` | `map.attribution.offline` | © <a href= | © <a Href= |
| `public/js/maplibre-primary.js` | `map.attribution.online` | © <a href= | © <a Href= |
| `public/js/missed-activity.js` | `missedActivity.pttDetail` | Field PTT ended before an operator opened Alerts. | — (OK / review) |
| `public/js/missed-activity.js` | `missedActivity.wallNudge` | Operator Escalation | — (OK / review) |
| `public/js/missed-activity.js` | `missedActivity.wallNudgeTag` | ESCALATE | Escalate |
| `public/js/missed-activity.js` | `missedActivity.wallNudgeDetail` | Command Wall asked an admin to review this camera. | — (OK / review) |
| `public/js/missed-activity.js` | `missedActivity.wallNudgeAnpr` | ANPR Match | — (OK / review) |
| `public/js/missed-activity.js` | `missedActivity.wallNudgeWatchlist` | Watchlist Match | — (OK / review) |
| `public/js/missed-activity.js` | `missedActivity.wallNudgeSos` | SOS | — (OK / review) |
| `public/js/missed-activity.js` | `missedActivity.wallNudgeVms` | Camera Alarm | — (OK / review) |
| `public/js/missed-activity.js` | `missedActivity.wallNudgeGeneric` | Wall Alert | — (OK / review) |
| `public/js/missed-activity.js` | `missedActivity.wallOperator` | Operator | — (OK / review) |
| `public/js/missed-activity.js` | `missedActivity.title` | Alerts | — (OK / review) |
| `public/js/missed-activity.js` | `missedActivity.detailTitle` | Alert detail | Alert Detail |
| `public/js/missed-activity.js` | `missedActivity.openFocus` | Open Camera | — (OK / review) |
| `public/js/missed-activity.js` | `missedActivity.empty` | No alerts. All clear. | — (OK / review) |
| `public/js/ops-cases-ui.js` | `opsCases.statusOpen` | Open | — (OK / review) |
| `public/js/ops-cases-ui.js` | `opsCases.bindPickEmpty` | Select a Library file… | Select a Library File… |
| `public/js/ops-cases-ui.js` | `opsCases.gateAdmin` | Super admin: you may edit or delete past notes. | — (OK / review) |
| `public/js/ops-cases-ui.js` | `opsCases.gateOps` | Operators may add notes only. Edit/delete needs Super admin. | — (OK / review) |
| `public/js/route-trace.js` | `routeTrace.videoReady` | Video ready \\u2014 playback syncs with route scrubber. | — (OK / review) |
| `public/js/route-trace.js` | `routeTrace.noVideo` | No catalog video for this window. | No Catalog Video for This Window. |
| `public/js/route-trace.js` | `routeTrace.evidenceMatch` | Evidence: | — (OK / review) |
| `public/js/route-trace.js` | `routeTrace.noEvidenceAtPoint` | No catalog file near this point. | No Catalog File Near This Point. |
| `public/js/route-trace.js` | `routeTrace.points` | points | Points |
| `public/js/route-trace.js` | `routeTrace.evidenceFiles` | evidence file(s) | Evidence file(s) |
| `public/js/route-trace.js` | `routeTrace.selectBwc` | Select BWC\\u2026 | — (OK / review) |
| `public/js/route-trace.js` | `routeTrace.pickDevice` | Select a BWC. | — (OK / review) |
| `public/js/route-trace.js` | `routeTrace.loading` | Loading\\u2026 | — (OK / review) |
| `public/js/route-trace.js` | `routeTrace.pickDevice` | Select a BWC. | — (OK / review) |
| `public/js/route-trace.js` | `routeTrace.highResActive` | High-res GPS tracking active | High-res GPS Tracking Active |
| `public/js/route-trace.js` | `routeTrace.highResNote` | ~15 s fixes while active. | ~15 S Fixes While Active. |
| `public/js/system-health-plain.js` | `healthPlain.okTitle` | Dashboard, cameras, talk, and live video look ready. | Dashboard, Cameras, Talk, and Live Video Look Ready. |
| `public/js/system-health-plain.js` | `healthPlain.notOkReason` | System not OK \\u2014 {reason} | System Not OK \U2014 {reason} |
| `public/js/tactical-blueprint-ui.js` | `tactical.bpSessionExpired` | Session expired — sign in again | Session Expired — Sign in Again |
| `public/js/tactical-blueprint-ui.js` | `tactical.bpNeedRestart` | This action is not on the running server yet. Restart Axiom, hard-refresh (Ctrl+F5), then try again. | — (OK / review) |
| `public/js/tactical-blueprint-ui.js` | `tactical.bpCatalogBusy` | Catalog not ready — wait a moment and try again | — (OK / review) |
| `public/js/tactical-blueprint-ui.js` | `tactical.bpNeedRestart` | This action is not on the running server yet. Restart Axiom, hard-refresh (Ctrl+F5), then try again. | — (OK / review) |
| `public/js/tactical-blueprint-ui.js` | `tactical.bpSaving` | Saving placement… | Saving Placement… |
| `public/js/tactical-blueprint-ui.js` | `tactical.bpUploading` | Uploading… | — (OK / review) |
| `public/js/tactical-blueprint-ui.js` | `tactical.bpUploadOk` | Uploaded — show & adjust on map | — (OK / review) |
| `public/js/tactical-blueprint-ui.js` | `tactical.bpShown` | Plan on map — tap Adjust to place | — (OK / review) |
| `public/js/tactical-blueprint-ui.js` | `tactical.bpRemoving` | Removing plan… | Removing Plan… |
| `public/js/tactical-poi.js` | `tactical.pinMountOpsButEmpty` | Ops has {n} GPS pins — Tactical mount failed (see console) | — (OK / review) |
| `public/js/tactical-poi.js` | `tactical.pinMountEmptyMap` | No GPS units — Place POI or wait for BWC GPS | — (OK / review) |
| `public/js/tactical-poi.js` | `tactical.grabCycleLabel` | {from}–{to} of {total} on pins | {from}–{to} of {total} on Pins |
| `public/js/tactical-poi.js` | `tactical.circleNeedCircle` | Draw a select zone first (OPERATE → Select zone) | — (OK / review) |
| `public/js/tactical-poi.js` | `tactical.circleNoneIn` | Nothing in this circle — place POIs or check cam GPS | — (OK / review) |
| `public/js/tactical-poi.js` | `tactical.poiStatusConnecting` | Connecting… | — (OK / review) |
| `public/js/tactical-shell.js` | `tactical.grabReady` | Select zone ready — tap Open cameras | — (OK / review) |
| `public/js/tactical-shell.js` | `tactical.pinMountError` | Pin mount error — see console | PIN Mount Error — See Console |
| `public/js/weapon-alarm.js` | `analytics.weapon.toastTitle` | Weapon detection | Weapon Detection |
| `public/js/weapon-live-watch.js` | `analytics.weapon.tileConnecting` | Connecting\\u2026 | — (OK / review) |
| `public/js/weapon-live-watch.js` | `analytics.weapon.tileNotLive` | Not live \\u2014 open on Ops first | — (OK / review) |
| `public/js/weapon-live-watch.js` | `analytics.weapon.lbTitle` | Weapon detection | Weapon Detection |
| `public/js/weapon-live-watch.js` | `analytics.fr.clearWatchConfirm` | Stop video and clear all selected cameras? | — (OK / review) |
| `public/js/weapon-live-watch.js` | `analytics.fr.rotateBadge` | Queued | — (OK / review) |
| `public/js/weapon-live-watch.js` | `fleet.online` | Online | — (OK / review) |
| `public/js/weapon-live-watch.js` | `fleet.offline` | Offline | — (OK / review) |
| `public/js/weapon-live-watch.js` | `analytics.fr.rosterMeta` | {n}/{max} selected \\u00B7 {live}/{slots} live | {n}/{max} Selected \U00b7 {live}/{slots} Live |
| `public/js/weapon-live-watch.js` | `analytics.weapon.rosterSearch` | Search cameras\\u2026 | — (OK / review) |
