# Third-Party Notices — Mobility Axiom



**Product:** Mobility Axiom (on-prem fleet platform)  

**Date:** 2026-07-07  



This product includes open-source software. The tables below list components for **license compliance**. Product manuals use Mobility Axiom names only; this file is the legal appendix for IT and contracts.



> **Not legal advice.** Have counsel review before customer contracts.  

> **Media tools:** The installer includes bundled FFmpeg-based media tools (GPL). Enterprise deployments may use customer-installed media tools per your support agreement.



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

| @webpod/ip | MIT | webpod contributors; maintained replacement for the abandoned `ip` package |

| livekit-server-sdk | Apache-2.0 | LiveKit, Inc. |

| node-llama-cpp | MIT | withcatai / llama.cpp authors |

| sip (kirm/sip.js) | MIT | Kirill Mikhailov |

| pg 8.22.0 (node-postgres) | MIT | Copyright (c) 2010 - 2021 Brian Carlson |
| pg dependency family (`pg-connection-string`, `pg-pool`, `pg-protocol`, `pg-types`, `pgpass`, `postgres-*`, `split2`, `xtend`) | MIT; `pg-int8` is ISC | Versions and license files are included with the packaged npm modules |
| ioredis | MIT | Zihua Li / Redis clients |
| Valkey 8 (optional Docker service) | BSD-3-Clause | Valkey project |

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



## Centre Summary assistant (when bundled)



| Component | License | Notes |

|-----------|---------|-------|

| llama.cpp (via node-llama-cpp) | MIT | Local inference runtime |

| Qwen2.5-1.5B-Instruct (GGUF) | Apache-2.0 | Model weights shipped in installer when Centre Summary is included |



**Attribution:** Centre Summary may include Apache-2.0 model weights (Alibaba Cloud). The product name is **Mobility Axiom**, not the upstream model brand.



---



## Optional runtime (customer environment)



| Component | License | Notes |

|-----------|---------|-------|

| LiveKit Server | Apache-2.0 | Separate process / Docker — video conference media |

| FFmpeg (system install) | GPL or LGPL (build-dependent) | Optional enterprise media pack |

| Node.js | MIT | Runtime |

| PostgreSQL 16.10 | PostgreSQL License | PostgreSQL Global Development Group |



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

## PostgreSQL 16.10 — PostgreSQL License

PostgreSQL Database Management System
Copyright (c) 1996-2025, PostgreSQL Global Development Group

Permission to use, copy, modify, and distribute this software and its documentation for any purpose, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and this paragraph and the following two paragraphs appear in all copies.

IN NO EVENT SHALL THE POSTGRESQL GLOBAL DEVELOPMENT GROUP BE LIABLE TO ANY PARTY FOR DIRECT, INDIRECT, SPECIAL, INCIDENTAL, OR CONSEQUENTIAL DAMAGES, INCLUDING LOST PROFITS, ARISING OUT OF THE USE OF THIS SOFTWARE AND ITS DOCUMENTATION, EVEN IF THE POSTGRESQL GLOBAL DEVELOPMENT GROUP HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

THE POSTGRESQL GLOBAL DEVELOPMENT GROUP SPECIFICALLY DISCLAIMS ANY WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE. THE SOFTWARE PROVIDED HEREUNDER IS ON AN "AS IS" BASIS, AND THE POSTGRESQL GLOBAL DEVELOPMENT GROUP HAS NO OBLIGATIONS TO PROVIDE MAINTENANCE, SUPPORT, UPDATES, ENHANCEMENTS, OR MODIFICATIONS.

---

## pg 8.22.0 (node-postgres) — MIT License

Copyright (c) 2010 - 2021 Brian Carlson

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.



---



## Contact



[Your company legal / support contact — fill before customer ship]


