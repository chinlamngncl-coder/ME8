# MOB DISC — BWC identity at ship: serial map vs change GB ID + how we remind (2026-08-09)

**Status:** Design lock. **`BWC-SERIAL-ASSET-REGISTRY-V1` PARKED as immediate APPLY** until we confirm what *your* BWC menus allow. Still **priority reminder** for ship / dock genre — not forgotten.  
**Code:** none until you name APPLY after this plan.

---

## 1. Your doubt is correct

You do not yet know (and we must not invent) whether every Ubitron/OEM BWC lets the customer freely rewrite the **20-digit GB device ID** on the camera. That ID is the SIP/WVP identity. Wrong change = live / SOS / Fleet break.

So: **“Change device ID on every officer’s camera” is not the only way — and must not be the only way we ship.**

---

## 2. Two different “IDs” (do not mix)

| ID | Where it lives | Purpose | Change on ship? |
|----|----------------|---------|-----------------|
| **GB `deviceId`** | Camera SIP / GB28181 register | Live, SOS, PTT, WVP | Only if agency security protocol **requires** their own GB numbering **and** firmware menu supports it |
| **Serial / asset tag** | Sticker on camera + **Axiom Fleet field** | Dock FTP folders, Evidence key, inventory | **Yes — always.** No need to reflash GB |

**`BWC-SERIAL-ASSET-REGISTRY-V1` means:** add `serialNo` (asset) on the Fleet device row → map sticker → existing GB id.  
Dock folders use `UB8-0042`, software resolves to `340200…`. Officers never type 20 digits.

That is the **default path**. Changing GB on the camera is **optional / agency policy**, not our forced product rule.

---

## 3. Options for “how do we remind at ship?”

| Option | What | Verdict |
|--------|------|---------|
| **A. Manual only** (Config / Quick Guide “IMPORTANT”) | Print once; easy to skip | Necessary but **not enough** |
| **B. In-app first-use / Evidence FTP gate** | When Super admin opens Evidence/dock FTP (or Onboarding), show a **one-time checklist**: “Map each camera sticker serial in Fleet before relying on dock auto” | **Locked primary** |
| **C. Daily nag toast** | Every login | **Forbidden** (same class as SOS/TOTP nag rules) |
| **D. Force change GB ID before FTP saves** | Block FTP until GB rewritten | **Rejected** — we may not control BWC menu; breaks lab |

**Locked combo:** **A + B** — manuals mark it IMPORTANT **and** software shows a **dismissible first-setup checklist** (Super admin), not a forever popup.

---

## 4. What the in-app hint should say (product words)

When Super admin first opens **Evidence → Storage / Dock FTP** (or Settings → Onboarding) and any registered BWC has **empty serial**:

> **Dock evidence setup (once per site)**  
> 1. Read the **serial / asset sticker** on each body camera.  
> 2. In Fleet / BWC list, enter that serial on the matching device (live GB id stays as registered).  
> 3. Configure dock/FTP so uploads land under folders named by **that serial**.  
> 4. Optional: if your security protocol requires **your own GB device IDs**, follow the Configuration Manual BWC chapter — only after IT confirms the camera menu supports it.  

Buttons: **Open Fleet devices** · **I’ve done this** (ack → store `dockIdentitySetupAckAt`) · **Remind next login (Super admin only)**.

Not officer-facing. Not toast-on-SOS.

---

## 5. Manuals (ship pack) — IMPORTANT section

Already have Configuration Manual / User Manual paths under trial-ship. When we ship this genre, add a short **IMPORTANT — Camera identity for dock** box:

1. Sticker serial → Fleet field (required for auto dock match).  
2. GB device ID = network identity; only change if policy + firmware allow.  
3. FTP folder naming must match serials.  
4. Do not hand officers 20-digit numbers as their “name.”

Pack gather / pre-ship can list this under evidence/dock — **only at pack time**, no daily nag.

---

## 6. Priority reminder (so we don’t drop it)

| When | What agent must surface |
|------|-------------------------|
| Continuing SOS/dock genre | After `SOS-DUAL-MEDIA-UI` / before customer dock ship: **revisit this disc** |
| User says ship / pack / customer pack | Include “dock identity: serial map + Config IMPORTANT + first-use FTP checklist” in gather |
| User says `test session` (~12 Aug) | Lab can still PASS matchback with GB folders; serial is **ship hardening**, not blocker for Path B lab |

**APPLY status (2026-08-09):**  
1. ✅ `BWC-SERIAL-ASSET-REGISTRY-V1` — field + unique + UI edit  
2. ✅ `DOCK-KEY-RESOLVE-SERIAL-V1` — watch uses serial first  
3. ✅ `DOCK-IDENTITY-FIRST-SETUP-HINT-V1` — Evidence Storage checklist + ack (see APPLY disc)  
4. ⏳ Manual patch in Config Manual (same genre or ship)

---

## 7. Recommendation (one path)

1. **Do not** require rewriting GB device IDs to ship dock auto.  
2. **Do** serial/asset map in Axiom + FTP folders by serial.  
3. **Remind** via Config Manual IMPORTANT **plus** Super-admin first-use checklist on Evidence/FTP — **not** daily nag, **not** “change GB or else.”  
4. If a customer’s security protocol **forces** custom GB IDs: document as optional IT procedure after vendor menu is verified on **your** BWC model.

**Next product APPLY on SOS arc (recommended):** `MOB-APPLY SOS-DUAL-MEDIA-UI-V1`  
**Serial registry:** wait until you confirm BWC menu reality **or** say go on registry-only (no camera reflash).
