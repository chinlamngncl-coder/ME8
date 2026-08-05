# MOB DISC — Weapon engine: best MIT / Apache-2 only (2026-08-06)

**Status:** disc only. No code until APPLY below.  
**License lock:** **MIT or Apache-2.0 only.** No AGPL. No GPL. No “student MIT wrapper around AGPL YOLO.”

## Confirm: I understand

You want the Weapon plan, and only the **best** engine we can legally ship. Search EN + CN. MIT / Apache 2 only.

## Search result (honest)

Most GitHub “weapon YOLO” repos say MIT and then `pip install ultralytics`.  
**Ultralytics YOLOv8 / YOLO11 / YOLO26 = AGPL-3.0.** That would force Axiom open-source or a paid Ultralytics enterprise license. **Banned for us.**

Chinese write-ups (AIBase / OSCHINA) point the same way: **RF-DETR = Apache-2.0, 开源可商用.** YOLO11 on the same charts is marked AGPL.

### Banned (look good, wrong license)

| Thing | Why no |
|-------|--------|
| Ultralytics YOLOv8 / 11 / 26 | AGPL-3.0 |
| Most “YOLOv8 gun MIT” GitHubs | Wrapper is MIT; engine is AGPL |
| JoaoAssalim weapons+knives | GPL-3.0 (and YOLO) |
| YOLO-NAS official COCO weights | Architecture Apache; **Deci weights not commercial** |

### Best legal stack (winner)

| Piece | Pick | License | Why best |
|-------|------|---------|----------|
| Runtime | **Roboflow RF-DETR Nano** (`rfdetr`, Nano–Large only) | **Apache-2.0** | Real-time transformer, no NMS, commercial OK. XL/2XL = PML — **do not use**. |
| Weights | **[Subh775/Threat-Detection-RFDETR](https://huggingface.co/Subh775/Threat-Detection-RFDETR)** | **Apache-2.0** on HF | Fine-tuned RF-DETR Nano. Gun mAP@50 **~90–93%**, gun precision **~97%**. Also knife / grenade / explosive. ~50 ms/GPU still. |
| Fallback later | Train our own RF-DETR Nano on gun+knife stills | Apache-2.0 train + Apache runtime | If lab false-hits are bad |

Author note on that HF card: “research / not deployment gospel.” Still the **best Apache ready weights**. We gate with **2–3 frames** + human WEAPON alarm later. Not one lucky still.

**V1 classes we use:** **Gun + Knife** only. Explosive / grenade stay off until we prove they are not noisy on CCTV fire/glare.

No FR engine. No ANPR. No PP-OCR. No hardcoded cams.

## Product plan (locked order)

| # | Slice | Status |
|---|--------|--------|
| 0 | Weapon shell + Recent 16:9 boxes + already-live only | Done |
| 1 | Watch bar = FR small tabs | **PASS** |
| 2 | Roster green online + live names (no hardcode) | APPLY just landed — operator confirm |
| 3 | **Detect stills → fill Recent** (this engine) | Next after roster PASS |
| 4 | **WEAPON alarm + nearby** (not fake device SOS) | After detect PASS |
| 5 | Public notice / pack copy | After alarm PASS |

Locked ops rules stay:

- Already-live stills only. No 100-cam INVITE.
- Fixed cam first; BWC only if already streaming.
- Hit ≠ SOS button.

## Slice 3 (next code MOB)

New small **Weapon sidecar** (own port, not ANPR):

1. Node grabs stills from Weapon watch cams that are **already live** (same still idea as FR/ANPR).
2. Sidecar runs **RF-DETR Threat** Apache weights.
3. Gun/knife + multi-frame confirm → crop into Recent (newest on top).
4. Health pill = real OK / down.

No alarm radio in slice 3.

## One next APPLY (after roster PASS)

**`MOB-APPLY WEAPON-DETECT-STILLS-RECENT-V1`**
