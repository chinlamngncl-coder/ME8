# vendor/zlmediakit — ZLM Media Engine (pack child process)

**MOB:** `mvp-zlm-in-pack`  
**Customer:** one install pack — **no Docker** for ZLM.

## What goes here

```
vendor/zlmediakit/MediaServer.exe   (Windows)
vendor/zlmediakit/config.ini        (shipped template — secret must match .env)
```

Optional DLLs from the same Windows build go in this folder too.

Binaries are **not** committed to git (see `.gitignore`).

## How to obtain (builder / office)

1. Preferred: place a known-good **Windows** `MediaServer.exe` build here (compile from ZLMediaKit, or a trusted Windows release from the project’s binary issue list).
2. Or run:

```powershell
.\scripts\INSTALL-ZLM-PACK.ps1 -SourceDir "D:\path\to\windows\zlm\build"
```

That copies `MediaServer.exe` (+ nearby `*.dll`) into this folder and writes `config.ini` if missing.

**Note:** The Docker image used in lab is **Linux** — you cannot copy that binary into a Windows pack. Lab Docker stays builder-only.

## Enable in ME8

In `.env` (builder profile — not something the operator edits):

```
FM_ZLM_ENABLED=1
FM_ZLM_SPAWN=1
FM_ZLM_PACK=1
FM_ZLM_HTTP=http://127.0.0.1:8080
FM_ZLM_RTMP=rtmp://127.0.0.1:19350
FM_ZLM_SECRET=<same as config.ini [api] secret>
```

Fleet then starts `MediaServer.exe` as a child on boot when the binary is present. If the binary is missing, Fleet still runs — live wall uses the old path.

## License

ZLMediaKit is open-source (project license on GitHub). Confirm counsel before customer ship. Keep third-party notices in the pack.
