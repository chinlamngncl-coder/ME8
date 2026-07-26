/**
 * SaaS dual-mode flag for Settings UI (Step 2).
 * MOB-APPLY DYNAMIC-FRONTEND-UI-V1
 *
 * cloud_leased — Ubitron-hosted tenant; hide Server / Network / Inbound infra chrome
 * on_prem      — customer box; full infra + SSL upload scaffold
 */
'use strict';

const licenseManager = require('./licenseManager');

const MODES = new Set(['cloud_leased', 'on_prem']);

function normalizeMode(raw) {
    const s = String(raw || '').trim().toLowerCase().replace(/-/g, '_');
    if (s === 'cloudleased' || s === 'leased' || s === 'saas_cloud') return 'cloud_leased';
    if (s === 'onprem' || s === 'on_premise' || s === 'premises') return 'on_prem';
    if (MODES.has(s)) return s;
    return null;
}

/**
 * Resolve DEPLOYMENT_MODE for the running node.
 * Precedence: FM_DEPLOYMENT_MODE → license.lic payload → default on_prem (lab-safe).
 */
function resolveDeploymentMode(opts) {
    opts = opts || {};
    const fromEnv = normalizeMode(process.env.FM_DEPLOYMENT_MODE || process.env.DEPLOYMENT_MODE);
    if (fromEnv) return fromEnv;

    try {
        const st = typeof licenseManager.loadAndValidate === 'function'
            ? licenseManager.loadAndValidate()
            : { ok: false, payload: null };
        if (st && st.ok && st.payload) {
            const fromLic = normalizeMode(
                st.payload.deploymentMode
                || st.payload.deployment_mode
                || st.payload.DEPLOYMENT_MODE
                || st.payload.saasMode
            );
            if (fromLic) return fromLic;
        }
    } catch (_) { /* ignore */ }

    if (opts.settings && opts.settings.deployment) {
        /* settings.deployment.mode is lab|lan|cloud|hybrid — not the SaaS dual flag */
    }

    return 'on_prem';
}

function isCloudLeased(mode) {
    if (mode != null && String(mode).trim() !== '') {
        return normalizeMode(mode) === 'cloud_leased';
    }
    return resolveDeploymentMode() === 'cloud_leased';
}

function publicPayload(opts) {
    const mode = resolveDeploymentMode(opts);
    return {
        deploymentMode: mode,
        DEPLOYMENT_MODE: mode,
        isCloudLeased: mode === 'cloud_leased',
        isOnPrem: mode === 'on_prem',
    };
}

module.exports = {
    resolveDeploymentMode,
    isCloudLeased,
    publicPayload,
    normalizeMode,
    MODES,
};
