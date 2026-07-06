# MOB-DISC-ZLM-GB28181-WVP

## What this is

When you win the tender, the system needs to handle hundreds of cameras at once.  
`wvp-GB28181-pro` is the software that manages all those camera connections and passes video to ZLM.  
This disc tracks the plan to set it up.

## Current state

- ZLM is running in Docker. Gate B passed (2026-07-06).
- wvp is not installed yet.

## What wvp does (plain English)

Each camera registers itself with wvp like checking in at a hotel front desk.  
wvp tells ZLM to start receiving that camera's video.  
The dashboard gets the stream URL from the broker as normal — nothing changes on screen.

## Files I will create (no existing files touched)

| File | What it is |
|---|---|
| `docker/wvp/docker-compose.wvp.yml` | Starts wvp + database + cache containers |
| `docker/wvp/wvp-config/application.yml` | wvp settings — points to ZLM |
| `docker/wvp/README-WVP-LAB.md` | How to start it and test one camera |

## Locked files — not touched

`sipServer.js`, `pttServer.js`, `server.js`, `video-wall.js` — none of these change.  
PTT keeps working on the existing stack.

## Status

PARKED — waiting for `MOB-APPLY mob-wvp-docker-scaffold`.  
ZLM Docker network confirmed: `me8-zlm_default` (2026-07-07).
