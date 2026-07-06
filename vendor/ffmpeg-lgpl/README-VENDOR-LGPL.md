# vendor/ffmpeg-lgpl — Media Engine (LGPL Build)

## What goes here

Place the LGPL Windows FFmpeg binary here before building a customer package:

```
vendor/ffmpeg-lgpl/ffmpeg.exe
```

The binary is **not committed to git** (see `.gitignore`).  
It must be present before running `node server.js` or `scripts/verify-install.js`.

---

## How to obtain

Run the vendor download script (requires internet access — do this once at the office):

```powershell
.\scripts\download-ffmpeg-lgpl.ps1
```

The script downloads the official LGPL Windows build from [gyan.dev](https://www.gyan.dev/ffmpeg/builds/)
and places `ffmpeg.exe` in this folder.

---

## License

This build is the **LGPL** (Lesser GPL) variant — it does **not** include GPL-licensed components
(e.g. x264, x265, FDK-AAC). It is safe to bundle with commercial software.

License reference: [FFmpeg Legal](https://ffmpeg.org/legal.html)

Source: `https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip`  
Build type: `release-essentials` (LGPL-only codec set)

---

## Ship checklist

Before packing a customer delivery:

- [ ] `vendor/ffmpeg-lgpl/ffmpeg.exe` exists
- [ ] `node scripts/verify-install.js` passes
- [ ] `THIRD-PARTY-NOTICES.ship.md` lists FFmpeg with LGPL license
