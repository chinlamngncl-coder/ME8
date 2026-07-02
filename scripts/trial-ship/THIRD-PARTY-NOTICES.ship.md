# Third-Party Notices — Mobility Axiom

**Product:** Mobility Axiom (on-prem fleet platform)  
**Date:** 2026-06-27  

This product includes open-source software. Below are the primary components shipped or loaded at runtime. A full npm dependency tree is available via `npm ls` in the installation directory.

> **Not legal advice.** Have counsel review before customer contracts.  
> **FFmpeg:** Ships with `ffmpeg-static` (GPL). Enterprise deployments may use customer-installed FFmpeg per your support agreement.

---

## Server — direct npm dependencies

| Component | License | Copyright / source |
|-----------|---------|-------------------|
| express | MIT | OpenJS Foundation |
| socket.io | MIT | Socket.IO contributors |
| ws | MIT | ws contributors |
| dotenv | BSD-2-Clause | motdotla |
| xml2js | MIT | Leonidas-from-XIV |
| ftp-srv | MIT | Patrick Silva |
| livekit-server-sdk | Apache-2.0 | LiveKit, Inc. |
| node-llama-cpp | MIT | withcatai / llama.cpp authors |
| sip (kirm/sip.js) | MIT | Kirill Mikhailov |
| ffmpeg-static | GPL-3.0-or-later | FFmpeg project (bundled binary) |

---

## Browser / dashboard (loaded with UI)

| Component | License | Notes |
|-----------|---------|-------|
| Leaflet | BSD-2-Clause | Map UI |
| leaflet.markercluster | MIT | Map clustering |
| livekit-client | Apache-2.0 | Video conference |
| jsmpeg (PhobosLab) | MIT | Live video decode |
| Socket.IO client | MIT | Served by application |

---

## Map data

| Data | License | Attribution required |
|------|---------|----------------------|
| OpenStreetMap tiles | ODbL (data) | **Yes** — display “© OpenStreetMap contributors” on map |

---

## Local AI (Centre Summary — when bundled)

| Component | License | Notes |
|-----------|---------|-------|
| llama.cpp (via node-llama-cpp) | MIT | Inference runtime |
| Qwen2.5-3B-Instruct (GGUF) | Apache-2.0 | Alibaba Cloud — model weights in `vendor/llm/` when shipped |

**Model attribution:** This product may include Qwen2.5 model weights (Apache-2.0, Alibaba Cloud). Product name is Mobility Axiom, not “Qwen.”

---

## Optional runtime (customer environment)

| Component | License | Notes |
|-----------|---------|-------|
| LiveKit Server | Apache-2.0 | Separate process / Docker — video conference |
| FFmpeg (system install) | GPL or LGPL (build-dependent) | Optional enterprise Media Pack |
| Node.js | MIT | Runtime |

---

## Apache-2.0 notice (livekit-server-sdk / livekit-client)

Licensed under the Apache License, Version 2.0. You may obtain a copy at:  
https://www.apache.org/licenses/LICENSE-2.0

---

## MIT license (representative — express)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, subject to inclusion of the copyright notice and this permission notice in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.

*(Full MIT texts for each package are in `node_modules/<package>/LICENSE`.)*

---

## Contact

[Your company legal / support contact — fill before customer ship]
