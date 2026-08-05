# MOB DISC — UNIFIED AXIOM STREAM ENGINE (2026-08-02)

**Status:** APPLIED — await operator PASS  
**Name:** Unified Axiom FLV manager + soft-chase (32/64 ready)

## Done

| Item | Implementation |
|------|----------------|
| Singleton | `public/js/shared-flv-player.js` → `window.AxiomFlvManager` |
| Panels | Ops / FR / ANPR / Tactical / CW via `Me8LivePlayerFactory.attachFlvPrimary` → AxiomFlvManager |
| Soft-chase | 1s tick: &gt;0.5s → 1.05x; ≤0.2s → 1.0x; &gt;2.0s soft seek (no hard mpegts chase) |
| Dense grid | `gridCount > 16` → prefer `*_sub` / substream URL; `focusUpgrade` / `upgradeToMain()` for main |
| Visibility | IntersectionObserver + tab hidden → pause decode |
| Detach | pause → unload → detachMediaElement → destroy + timer cleanup |
| LIVE overlay | CSS hide corner/Live chrome on ANPR / FR / CW / watermark classes |
| Crop emit | Poller emits vehicle macro even when plate Unclear (rail 2–3s path) |

## Untouched

- CSS design tokens / layout hierarchy  
- AI sidecar models / CCPD pose geometry  
- Firmware Gold pin mirror / JSMpeg dual-pin path  

## PASS

1. Restart ME8 + hard refresh.  
2. ANPR / Ops / FR live tiles stay near real-time (no 8–10s creep over minutes).  
3. Switch tabs — no orphan decoders (detach runs).  
4. Vehicle past ANPR → **crop on rail** within ~2–3s (plate may be Unclear).  
