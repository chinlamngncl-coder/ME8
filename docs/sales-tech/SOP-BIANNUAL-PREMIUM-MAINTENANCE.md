# Ubitron Global: Mobility Axiom 
## Premium Bi-Annual System Maintenance & Health Audit (SOP)

**Service Tier:** Premium / Enterprise  
**Frequency:** Bi-Annual (Every 6 Months)  
**Objective:** Ensure zero-downtime operation, optimize video storage, enforce license compliance, and verify edge-device integrity across the Mobility Axiom platform.

---

### Phase 1: Storage & Evidence Management
*To prevent storage bottlenecks and ensure compliance with legal retention policies.*
- [ ] **NAS / SAN Health Check:** Verify the active status of all shared storage mounts and test read/write speeds.
- [ ] **Data Retention Audit:** Confirm automated purging scripts are correctly deleting video evidence older than the client's legal retention limit (e.g., 90/180 days).
- [ ] **Database Vacuum:** Clear orphaned case files, empty Incident folders, and unlinked POIs from the database to optimize query speeds.
- [ ] **FTP Docking Inbox:** Check the BWC FTP upload queue for stalled or corrupted video files and clear the backlog.

### Phase 2: Licensing & Capacity Optimization
*To prevent users from hitting "Capacity Full" errors during critical operations.*
- [ ] **Operator Seat Audit:** Review all active Operator and Super Admin accounts. Deactivate or delete departed employees to free up license seats.
- [ ] **Device License Sync:** Audit the total number of connected BWCs and Fixed Cameras against the client's current tier limits. 
- [ ] **Module Verification:** Test premium modules (AR Overwatch, PTT, Analytics) to ensure entitlement checks are validating correctly with the server.

### Phase 3: Edge Device & Hardware Integrity
*To ensure field operatives and control room staff have uninterrupted video feeds.*
- [ ] **BWC Firmware & Sync:** Dock a test BWC to verify it correctly pulls the latest firmware and accurately pushes GPS telemetry.
- [ ] **PTZ & Overwatch Calibration:** Open the Tactical Map AR Overwatch drawer. Verify that all saved FOV/PTZ presets perfectly align with physical camera positions. Recalibrate if the camera mount shifted.
- [ ] **Floor Plan Integrity:** Ensure uploaded blueprints (JPEG/PNG/WebP) are still rendering correctly and have not been corrupted.
- [ ] **Docking Station Physical Audit:** Inspect BWC docking pins for corrosion or debris that could interrupt FTP transfer or charging.
- [ ] **Camera Housing & Mounting:** Physically inspect exterior fixed cameras for weather ingress. Verify the integrity of top-down installation mounts and test motorized/mechanical extension arms on specialized industrial units.
- [ ] **UPS & PoE Switch Load Audit:** Inspect UPS battery backup health on core nodes and verify PoE wattage headroom on edge switches powering PTZ and thermal camera units.

### Phase 4: Network & Security Architecture
*To maintain strict access control and secure stream routing.*
- [ ] **Live Video (FLV) Latency Test:** Trigger a live stream from a fixed camera and a BWC simultaneously. Ensure latency remains sub-second over the local network.
- [ ] **Token / SSO Verification:** Rotate super-admin backup passwords and verify OIDC/SSO integrations are syncing correctly with the client's active directory.
- [ ] **Global Error Log Review:** Export the `server.js` error logs for the last 6 months. Identify and patch any recurring warning states.
- [ ] **Time Server (NTP) Synchronization:** Verify system time across all servers, BWCs, and fixed cameras aligns to within ±50ms to ensure the legal admissibility of video evidence timestamps.

### Phase 5: Disaster Recovery & Compliance
*To guarantee data survival during catastrophic failures and maintain public sector certifications.*
- [ ] **Disaster Recovery (DR) Test:** Execute a dry-run restoration of the PostgreSQL/core database from the latest backup to verify data integrity.
- [ ] **Hardware Verification & Certificates:** Audit hardware co-processors, local SDK frameworks, and SSL certificates to ensure ongoing compliance with necessary national security and public sector standards.
- [ ] **Offline Redundancy Check:** Verify that local-first, decentralized tracking systems and corporate accounting applications can fully operate while disconnected from the wider network.

---
**Sign-off:**
*Engineer Name:* ___________________________  
*Date Completed:* ___________________________  
*Client Authorization:* _______________________  
