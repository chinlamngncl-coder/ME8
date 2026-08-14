# STOP AND READ THIS WHEN YOU ARE READY TO PACKAGE FOR CLIENTS

**DO NOT** try to code the deployment yourself. Give Cursor the prompt below and let it do the work.

### 📋 COPY AND PASTE THIS TO CURSOR CHAT:
@___WHEN_READY_TO_SELL_OPEN_ME.md We are ready to package this software for enterprise deployment. Read the deployment plan below and execute Phase 1 and Phase 2. 
1. Write the script to generate the unified `core-engine` virtual environment and consolidate our PyTorch/YOLO dependencies.
2. Write the Master Orchestrator script that reads a dummy `license.lic` file and boots the corresponding Python analytics sidecars silently in the background.
Walk me through this step-by-step.

---

### THE DEPLOYMENT PLAN (For Cursor to Read)

**1. The Shared "Core Engine" (Environment Unification)**
Instead of shipping multiple isolated `.venv` folders, we will create a single, unified Python virtual environment named `core-engine`.
* Install PyTorch, OpenCV, PaddleOCR, YOLO, and all required dependencies into this single environment.
* Configure the ANPR, Facial Recognition (FR), and Weapon Detection scripts to all execute using `core-engine\Scripts\python.exe`.
* **Goal:** Shrink the total software footprint and guarantee that if the core engine is healthy, all three analytics are healthy.

**2. The Master Orchestrator (License Manager)**
Build a single Orchestrator script.
* On boot, it reads an encrypted `license.lic` file to determine which modules the client purchased.
* It dynamically spins up only the licensed modules (e.g., if `[ANPR: TRUE, FR: FALSE, WEAPON: TRUE]`, FR remains dormant).
* **Goal:** Ship the exact same codebase to every client, using the license key to dynamically unlock features.

**3. The Silent Windows Service Installer (Zero-Click Execution)**
Package the entire software suite into a professional Windows Installer (e.g., using Inno Setup).
* During installation, utilize NSSM (Non-Sucking Service Manager) to register the Master Orchestrator as a native Windows Background Service.
* **Goal:** The software starts automatically and invisibly the moment the client's PC turns on. Clients never see or click a `.bat` file.