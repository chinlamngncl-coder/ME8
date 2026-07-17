# FR SeetaFace6 — Windows lab proof

**MOB:** `mob-fr-seeta-windows-lab-proof`  
**Port:** **8767** (onnx stays on **8766** until a later cutover MOB)  
**Goal:** Health OK + two photos → one **%** (need **70** for product bar)

## Operator steps (plain)

1. Open PowerShell in this folder and run:
   ```
   .\INSTALL-SEETA-LAB.ps1
   ```
   First run may download ~288MB models (slow). If download fails, put `*.csta` files into  
   `vendor\seetaFace6Python\seetaface\model\` by hand.

2. Start:
   ```
   START-SEETA-LAB.bat
   ```

3. Open **http://127.0.0.1:8767/health** — want `"ok": true`.

4. With Fleet up, open the test page on the **same LAN IP as the dashboard** (not 127.0.0.1), e.g.  
   `http://192.168.1.38:3988/test-seeta.html` — pick two photos of the **same** person → **Compare**.  
   Read the **percent**. Pass for this MOB = service runs + percent shows (clearing 70 is the *next* quality MOB).

## Optional: point Fleet at Seeta

**APPLIED** `mob-fr-seeta-sidecar-wire` (2026-07-14) — live default is Seeta.

```
FM_FR_ENGINE=seeta
FM_FR_SIDECAR_SEETA_PORT=8767
FM_FR_SIDECAR_AUTO=1
```

Restart Fleet. **Re-embed gallery** once (fingerprint size changed).

## Legal

SeetaFace6 **open** edition: vendor states free commercial/personal; LICENSE is BSD-style.  
Counsel before customer ship. Wrapper: community `seetaFace6Python` (ctypes).

## Not this MOB

- Live wall / Recent still use onnx until cutover  
- Blur reject / keyframe polish  
- DeepFace rollback  
