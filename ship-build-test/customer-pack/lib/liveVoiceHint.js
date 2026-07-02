/**
 * Sustained voice on live G711 stream → hint pulse for muted HQ listen.
 * Heuristic only — not field PTT, not SOS.
 */

const log = require('./fleetLog');

const RMS_MIN = 500;
const SUSTAIN_MS = 350;
const COOLDOWN_MS = 20000;
const HANG_MS = 700;
const FLOOR_MULT = 2.1;
const VOICE_DECAY_MULT = 0.35;
const PROBE_MS = parseInt(process.env.FM_LIVE_VOICE_HINT_PROBE_MS || '3000', 10);
const PROBE_ENABLED = process.env.FM_LIVE_VOICE_HINT_PROBE !== '0';

function pcmRms16le(pcmBuf) {
    const n = pcmBuf.length >> 1;
    if (!n) return 0;
    let sum = 0;
    for (let i = 0; i < n; i++) {
        const s = pcmBuf.readInt16LE(i * 2);
        sum += s * s;
    }
    return Math.sqrt(sum / n);
}

function frameMsFromPcm(pcmBuf) {
    return (pcmBuf.length / 2) / 8;
}

function createLiveVoiceHint(onHint) {
    const states = new Map();

    function clearCam(camId) {
        const id = camId ? String(camId).trim() : '';
        if (id) states.delete(id);
    }

    function feedPcm(camId, pcmBuf) {
        const id = camId ? String(camId).trim() : '';
        if (!id || !pcmBuf || !pcmBuf.length || typeof onHint !== 'function') return;

        const rms = pcmRms16le(pcmBuf);
        const frameMs = frameMsFromPcm(pcmBuf);
        let st = states.get(id);
        if (!st) {
            st = {
                voiceMs: 0,
                hangMs: 0,
                active: false,
                lastHintAt: 0,
                noiseSum: 0,
                noiseN: 0,
                lastProbeAt: 0,
                probePeakRms: 0,
                probeVoiceFrames: 0,
                probeCooldownBlocked: false,
            };
            states.set(id, st);
            if (PROBE_ENABLED) {
                log.media.info('live voice hint probe start', { camId: id });
            }
        }

        const floor = st.noiseN > 20 ? st.noiseSum / st.noiseN : 280;
        const threshold = Math.max(RMS_MIN, floor * FLOOR_MULT);

        if (PROBE_ENABLED) {
            if (rms > st.probePeakRms) st.probePeakRms = rms;
            if (rms >= threshold) st.probeVoiceFrames += 1;
        }

        if (rms < threshold * 0.5) {
            st.noiseSum += rms;
            st.noiseN = Math.min(st.noiseN + 1, 256);
        }

        if (rms >= threshold) {
            st.voiceMs += frameMs;
            st.hangMs = 0;
            if (!st.active && st.voiceMs >= SUSTAIN_MS) {
                const now = Date.now();
                if (now - st.lastHintAt >= COOLDOWN_MS) {
                    st.active = true;
                    st.lastHintAt = now;
                    st.probeCooldownBlocked = false;
                    onHint(id);
                } else if (PROBE_ENABLED && !st.probeCooldownBlocked) {
                    st.probeCooldownBlocked = true;
                    log.media.info('live voice hint probe cooldown', {
                        camId: id,
                        voiceMs: Math.round(st.voiceMs),
                        cooldownLeftMs: COOLDOWN_MS - (now - st.lastHintAt),
                    });
                }
            }
        } else if (st.active) {
            st.hangMs += frameMs;
            if (st.hangMs >= HANG_MS) {
                st.active = false;
                st.voiceMs = 0;
                st.hangMs = 0;
            }
        } else {
            st.voiceMs = Math.max(0, st.voiceMs - frameMs * VOICE_DECAY_MULT);
        }

        if (PROBE_ENABLED) {
            const now = Date.now();
            if (!st.lastProbeAt || now - st.lastProbeAt >= PROBE_MS) {
                st.lastProbeAt = now;
                const peak = st.probePeakRms;
                const peakThreshold = Math.max(RMS_MIN, floor * FLOOR_MULT);
                log.media.info('live voice hint probe', {
                    camId: id,
                    peakRms: Math.round(peak),
                    threshold: Math.round(peakThreshold),
                    floor: Math.round(floor),
                    voiceMs: Math.round(st.voiceMs),
                    sustainMs: SUSTAIN_MS,
                    voiceFrames: st.probeVoiceFrames,
                    over: peak >= peakThreshold,
                    cooldownLeftMs: st.lastHintAt
                        ? Math.max(0, COOLDOWN_MS - (now - st.lastHintAt))
                        : 0,
                });
                st.probePeakRms = 0;
                st.probeVoiceFrames = 0;
            }
        }
    }

    return { feedPcm, clearCam };
}

module.exports = { createLiveVoiceHint };
