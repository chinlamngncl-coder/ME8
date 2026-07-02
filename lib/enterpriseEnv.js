/**
 * Enterprise env profile (Valkey + Postgres) — parse only.
 * Not wired into server.js until mob-redis-client / mob-pg-adapter MOBs.
 */
const path = require('path');

const CATALOG_MODES = new Set(['postgres_required', 'sqlite_shadow', 'off']);

function trim(value) {
    return value != null ? String(value).trim() : '';
}

function parseBool(value, defaultValue) {
    if (value == null || String(value).trim() === '') return defaultValue;
    const v = String(value).trim().toLowerCase();
    if (v === '1' || v === 'true' || v === 'yes') return true;
    if (v === '0' || v === 'false' || v === 'no') return false;
    return defaultValue;
}

function parseIntBounded(value, fallback, min, max) {
    const n = parseInt(String(value || ''), 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
}

function normalizeCatalogMode(raw) {
    const mode = trim(raw).toLowerCase() || 'off';
    return CATALOG_MODES.has(mode) ? mode : null;
}

function redisConfigured(env) {
    return !!trim(env.FM_REDIS_URL);
}

function catalogConfigured(env) {
    return !!trim(env.FM_CATALOG_DB_URL);
}

function loadEnterpriseEnv(env, baseDir) {
    const source = env || process.env;
    const catalogMode = normalizeCatalogMode(source.FM_CATALOG_MODE) || 'off';
    const redisUrl = trim(source.FM_REDIS_URL);
    const catalogUrl = trim(source.FM_CATALOG_DB_URL);
    const root = baseDir || path.join(__dirname, '..');
    const walRel = trim(source.FM_CATALOG_WAL_PATH) || 'storage/catalog-sync-wal.jsonl';

    return {
        wired: false,
        redis: {
            url: redisUrl,
            enabled: !!redisUrl,
            connectTimeoutMs: parseIntBounded(source.FM_REDIS_CONNECT_TIMEOUT_MS, 5000, 1000, 60000),
            keyPrefix: trim(source.FM_REDIS_KEY_PREFIX) || 'me8:',
        },
        catalog: {
            dbUrl: catalogUrl,
            enabled: !!catalogUrl && catalogMode !== 'off',
            mode: catalogMode,
            allowSqliteQueue: parseBool(source.FM_CATALOG_ALLOW_SQLITE_QUEUE, false),
            walPath: path.isAbsolute(walRel) ? walRel : path.join(root, walRel),
        },
        stability: {
            cacheDebounce: parseBool(source.FM_USE_CACHE_DEBOUNCE, false),
            gpsDebounceMs: parseIntBounded(source.FM_GPS_CACHE_DEBOUNCE_MS, 2000, 250, 30000),
            contactDebounceMs: parseIntBounded(source.FM_CONTACT_CACHE_DEBOUNCE_MS, 2000, 250, 30000),
        },
    };
}

function validateEnterpriseEnv(env, baseDir) {
    const source = env || process.env;
    const errors = [];
    const config = loadEnterpriseEnv(source, baseDir);

    if (trim(source.FM_CATALOG_MODE) && !normalizeCatalogMode(source.FM_CATALOG_MODE)) {
        errors.push('FM_CATALOG_MODE must be postgres_required, sqlite_shadow, or off');
    }
    if (config.catalog.mode === 'postgres_required' && !config.catalog.dbUrl) {
        errors.push('FM_CATALOG_MODE=postgres_required requires FM_CATALOG_DB_URL');
    }
    if (config.catalog.allowSqliteQueue && config.catalog.mode === 'postgres_required') {
        // allowed — queue mode when PG down per doc 07
    }
    if (config.redis.url && !/^rediss?:\/\//i.test(config.redis.url)) {
        errors.push('FM_REDIS_URL must start with redis:// or rediss://');
    }
    if (config.catalog.dbUrl && !/^postgres(ql)?:\/\//i.test(config.catalog.dbUrl)) {
        errors.push('FM_CATALOG_DB_URL must start with postgresql:// or postgres://');
    }

    return { ok: errors.length === 0, errors, config };
}

function publicEnterpriseStatus(env, baseDir) {
    const v = validateEnterpriseEnv(env, baseDir);
    const c = v.config;
    return {
        wired: false,
        redisConfigured: c.redis.enabled,
        catalogConfigured: c.catalog.enabled,
        catalogMode: c.catalog.mode,
        allowSqliteQueue: c.catalog.allowSqliteQueue,
        cacheDebounce: c.stability.cacheDebounce,
        validationOk: v.ok,
        validationErrors: v.errors,
    };
}

module.exports = {
    CATALOG_MODES,
    loadEnterpriseEnv,
    validateEnterpriseEnv,
    publicEnterpriseStatus,
    redisConfigured,
    catalogConfigured,
};
