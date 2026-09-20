# Lab only — USIP AES secrets (VideoTag wrap + file master)

## A1 — VideoTag wrap (SIP DeviceTag)

Env or `storage/secrets/usip-aes-wrap.json`:

- `FM_USIP_AES_WRAP_KEY` — 32 UTF-8 chars  
- `FM_USIP_AES_WRAP_IV` — 16 UTF-8 chars  

```json
{ "wrapKey": "<32-char from SDK §6.1>", "wrapIv": "<16-char from SDK>" }
```

## A2 — File master (`*-AES.*` / HDA1)

Env or `storage/secrets/usip-aes-file.json`:

- `FM_USIP_AES_FILE_MASTER` — master string from private `AES加密格式说明.md` (padded/truncated to 16 bytes UTF-8)

```json
{ "masterKey": "<string from AES format doc>" }
```

Never put real keys in manuals, ship packs, or chat.  
UI Play / Cancel / Export: see `MOB-DISC-AES-EVIDENCE-UI-CONTROLS-V1-20260919.md`.  
