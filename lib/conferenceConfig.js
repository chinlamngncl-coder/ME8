/**
 * Video Conference deploy settings — storage file + .env + LiveKit docker yaml sync.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const envFile = require('./envFile');

let storageDir = null;
let baseDir = null;
let livekitYamlPath = null;
let envPath = null;

function init(opts) {
    storageDir = opts && opts.storageDir;
    baseDir = opts && opts.baseDir;
    if (baseDir) {
        envPath = path.join(baseDir, '.env');
        livekitYamlPath = path.join(baseDir, 'docker', 'livekit.yaml');
    }
}

function envSource() {
    const base = process.env;
    if (!envPath) return base;
    try {
        return Object.assign({}, base, envFile.readEnvFile(envPath));
    } catch (_) {
        return base;
    }
}

function settingsPath() {
    return path.join(storageDir || '.', 'conference-settings.json');
}

function siteHostFromEnv() {
    const env = envSource();
    return String(env.HOST || env.FM_GB28181_PUBLIC_HOST || '127.0.0.1').trim();
}

function envDefaults() {
    const env = envSource();
    const host = siteHostFromEnv();
    const apiUrl = String(env.FM_LIVEKIT_URL || 'http://127.0.0.1:7880').trim().replace(/\/$/, '');
    const publicWs = String(env.FM_LIVEKIT_PUBLIC_WS || env.FM_LIVEKIT_CLIENT_WS || '').trim()
        || ('ws://' + host + ':7880');
    return {
        deployMode: 'lan-docker',
        siteHost: host,
        apiUrl,
        publicWsUrl: publicWs.replace(/^http/i, 'ws').replace(/\/$/, ''),
        apiKey: String(env.FM_LIVEKIT_API_KEY || 'devkey').trim(),
        apiSecret: String(env.FM_LIVEKIT_API_SECRET || 'secret').trim(),
        iceNodeIp: host,
        turnUrl: String(env.FM_LIVEKIT_TURN_URL || '').trim(),
        edgeUrl: String(env.FM_LIVEKIT_EDGE_URL || '').trim(),
        proxyNote: String(env.FM_LIVEKIT_PROXY_NOTE || '').trim(),
        publicHttpPort: String(env.FM_LIVEKIT_PUBLIC_PORT || '7880').trim(),
        muteAllOnStart: false,
    };
}

function normalize(raw) {
    const base = envDefaults();
    const inCfg = raw || {};
    const mode = ['lan-docker', 'remote-mcu', 'livekit-cloud'].includes(inCfg.deployMode)
        ? inCfg.deployMode
        : base.deployMode;
    const siteHost = String(inCfg.siteHost || base.siteHost).trim() || base.siteHost;
    let apiUrl = String(inCfg.apiUrl || base.apiUrl).trim().replace(/\/$/, '');
    let publicWsUrl = String(inCfg.publicWsUrl || base.publicWsUrl).trim();
    publicWsUrl = publicWsUrl.replace(/^http/i, 'ws').replace(/\/$/, '');
    if (!publicWsUrl && siteHost) {
        publicWsUrl = 'ws://' + siteHost + ':7880';
    }
    if (mode === 'livekit-cloud' && !apiUrl) {
        apiUrl = base.apiUrl;
    }
    return {
        deployMode: mode,
        siteHost,
        apiUrl: apiUrl || base.apiUrl,
        publicWsUrl,
        apiKey: String(inCfg.apiKey || base.apiKey).trim() || base.apiKey,
        apiSecret: String(inCfg.apiSecret != null ? inCfg.apiSecret : base.apiSecret),
        iceNodeIp: String(inCfg.iceNodeIp || siteHost || base.iceNodeIp).trim(),
        turnUrl: String(inCfg.turnUrl != null ? inCfg.turnUrl : base.turnUrl).trim(),
        edgeUrl: String(inCfg.edgeUrl != null ? inCfg.edgeUrl : base.edgeUrl).trim(),
        proxyNote: String(inCfg.proxyNote != null ? inCfg.proxyNote : base.proxyNote).trim(),
        publicHttpPort: String(inCfg.publicHttpPort || base.publicHttpPort).trim() || '7880',
        muteAllOnStart: inCfg.muteAllOnStart != null ? !!inCfg.muteAllOnStart : !!base.muteAllOnStart,
        updatedAt: inCfg.updatedAt || null,
    };
}

function load() {
    const filePath = settingsPath();
    try {
        if (fs.existsSync(filePath)) {
            return normalize(JSON.parse(fs.readFileSync(filePath, 'utf8')));
        }
    } catch (_) { /* fall through */ }
    return normalize(null);
}

function save(body) {
    const prev = load();
    const merged = normalize(Object.assign({}, prev, body || {}));
    if (body && body.apiSecret === '' && prev.apiSecret) {
        merged.apiSecret = prev.apiSecret;
    }
    if (body && (body.apiSecret === '********' || body.apiSecret === '••••••••')) {
        merged.apiSecret = prev.apiSecret;
    }
    if (body && (body.apiKey === '' || body.apiKey == null) && prev.apiKey) {
        merged.apiKey = prev.apiKey;
    }
    if (body && (body.apiUrl === '' || body.apiUrl == null) && prev.apiUrl) {
        merged.apiUrl = prev.apiUrl;
    }
    merged.updatedAt = new Date().toISOString();
    fs.mkdirSync(storageDir, { recursive: true });
    fs.writeFileSync(settingsPath(), JSON.stringify(merged, null, 2), 'utf8');
    applyToEnvAndDocker(merged);
    return merged;
}

function applyToEnvAndDocker(cfg) {
    cfg = normalize(cfg || load());
    if (!envPath) return cfg;
    envFile.setEnvVars(envPath, {
        HOST: cfg.siteHost,
        FM_LIVEKIT_URL: cfg.apiUrl,
        FM_LIVEKIT_PUBLIC_WS: cfg.publicWsUrl,
        FM_LIVEKIT_API_KEY: cfg.apiKey,
        FM_LIVEKIT_API_SECRET: cfg.apiSecret,
        FM_LIVEKIT_TURN_URL: cfg.turnUrl,
        FM_LIVEKIT_EDGE_URL: cfg.edgeUrl,
        FM_LIVEKIT_PUBLIC_PORT: cfg.publicHttpPort,
    });
    if (cfg.deployMode === 'lan-docker' && livekitYamlPath && fs.existsSync(livekitYamlPath)) {
        syncLivekitYaml(livekitYamlPath, cfg);
    }
    return cfg;
}

function isLocalHostRef(value) {
    const s = String(value || '').trim();
    if (!s) return true;
    if (/^(127\.0\.0\.1|localhost)$/i.test(s)) return true;
    return /\/\/(127\.0\.0\.1|localhost)(:|\/|$)/i.test(s);
}

function isPrivateIp(ip) {
    const s = String(ip || '').trim();
    if (!s || isLocalHostRef(s)) return true;
    if (/^192\.168\./.test(s)) return true;
    if (/^10\./.test(s)) return true;
    if (/^172\.(1[6-9]|2[0-9]|3[01])\./.test(s)) return true;
    return false;
}

function parseTurnUrl(turnUrl) {
    const raw = String(turnUrl || '').trim();
    if (!raw) return null;
    try {
        const normalized = raw.indexOf('://') >= 0 ? raw : 'turn://' + raw.replace(/^turns?:\/?\/?/i, '');
        const u = new URL(normalized.replace(/^turn:/i, 'turn://').replace(/^turns:/i, 'turns://'));
        const host = u.hostname;
        if (!host) return null;
        const tls = /^turns:/i.test(u.protocol);
        const port = u.port ? parseInt(u.port, 10) : (tls ? 5349 : 3478);
        return { host: host, port: port, tls: tls };
    } catch (_) {
        const m = raw.match(/^turns?:\/?\/?([^:/\s]+)(?::(\d+))?/i);
        if (!m) return null;
        return {
            host: m[1],
            port: m[2] ? parseInt(m[2], 10) : 3478,
            tls: /^turns:/i.test(raw),
        };
    }
}

function syncLivekitYaml(yamlPath, cfg) {
    cfg = normalize(cfg || {});
    let yaml = fs.readFileSync(yamlPath, 'utf8');
    const ip = String(cfg.iceNodeIp || cfg.siteHost || '').trim();
    if (ip) {
        if (/^\s*node_ip:\s*.+$/m.test(yaml)) {
            yaml = yaml.replace(/^(\s*node_ip:\s*).+$/m, '$1' + ip);
        } else if (/^\s*use_external_ip:\s*.+$/m.test(yaml)) {
            yaml = yaml.replace(/^(\s*use_external_ip:\s*.+)$/m, '  node_ip: ' + ip + '\n$1');
        } else if (/^\s*port_range_end:\s*.+$/m.test(yaml)) {
            yaml = yaml.replace(/^(\s*port_range_end:\s*.+)$/m, '$1\n  node_ip: ' + ip);
        }
    }
    yaml = yaml.replace(/\n  turn_servers:\n(?:    -[\s\S]*?\n?)*/g, '');
    const turn = parseTurnUrl(cfg.turnUrl);
    if (turn) {
        const block = '\n  turn_servers:\n    - host: ' + turn.host
            + '\n      port: ' + turn.port
            + '\n      protocol: ' + (turn.tls ? 'tls' : 'udp');
        if (/^\s+use_external_ip:/m.test(yaml)) {
            yaml = yaml.replace(/^(\s+use_external_ip:\s*.+)$/m, '$1' + block);
        } else if (/^\s+node_ip:/m.test(yaml)) {
            yaml = yaml.replace(/^(\s+node_ip:\s*.+)$/m, '$1' + block);
        } else if (/^\s+port_range_end:/m.test(yaml)) {
            yaml = yaml.replace(/^(\s+port_range_end:\s*.+)$/m, '$1' + block);
        }
    }
    fs.writeFileSync(yamlPath, yaml, 'utf8');
}

function getRuntime() {
    return normalize(load());
}

function credentialsHiddenForDeployMode(mode) {
    return mode === 'lan-docker';
}

function publicView(cfg) {
    cfg = normalize(cfg || load());
    const hideServerCredentials = credentialsHiddenForDeployMode(cfg.deployMode);
    return {
        deployMode: cfg.deployMode,
        siteHost: cfg.siteHost,
        apiUrl: hideServerCredentials ? null : cfg.apiUrl,
        publicWsUrl: cfg.publicWsUrl,
        apiKey: hideServerCredentials ? null : cfg.apiKey,
        hasApiSecret: !!cfg.apiSecret,
        hideServerCredentials: hideServerCredentials,
        iceNodeIp: cfg.iceNodeIp,
        turnUrl: cfg.turnUrl || null,
        edgeUrl: cfg.edgeUrl || null,
        proxyNote: cfg.proxyNote || null,
        publicHttpPort: cfg.publicHttpPort,
        updatedAt: cfg.updatedAt,
        envPath: envPath || null,
        livekitYamlPath: livekitYamlPath || null,
        muteAllOnStart: !!cfg.muteAllOnStart,
    };
}

function httpProbe(urlStr, timeoutMs) {
    return new Promise(function (resolve) {
        let parsed;
        try {
            parsed = new URL(urlStr);
        } catch (err) {
            resolve({ ok: false, error: err.message });
            return;
        }
        const lib = parsed.protocol === 'https:' ? https : http;
        const req = lib.request({
            hostname: parsed.hostname,
            port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
            path: parsed.pathname || '/',
            method: 'GET',
            timeout: timeoutMs || 5000,
        }, function (res) {
            resolve({ ok: res.statusCode >= 200 && res.statusCode < 500, status: res.statusCode });
            res.resume();
        });
        req.on('timeout', function () {
            req.destroy();
            resolve({ ok: false, error: 'timeout' });
        });
        req.on('error', function (err) {
            resolve({ ok: false, error: err.message });
        });
        req.end();
    });
}

async function testConnection(cfg) {
    cfg = normalize(cfg || load());
    const signaling = await httpProbe(cfg.apiUrl, 6000);
    let tokenOk = false;
    let tokenError = null;
    if (signaling.ok && cfg.apiKey && cfg.apiSecret) {
        try {
            const { AccessToken } = require('livekit-server-sdk');
            const at = new AccessToken(cfg.apiKey, cfg.apiSecret, {
                identity: 'mobility-probe',
                name: 'probe',
            });
            at.addGrant({
                roomJoin: true,
                room: 'mobility-probe',
                canPublish: false,
                canSubscribe: true,
            });
            const tok = await at.toJwt();
            tokenOk = typeof tok === 'string' && tok.length > 20;
        } catch (err) {
            tokenError = err.message;
        }
    }
    return {
        ok: signaling.ok && tokenOk,
        signaling,
        tokenOk,
        tokenError,
        publicWsUrl: cfg.publicWsUrl,
        iceNodeIp: cfg.iceNodeIp,
        deployMode: cfg.deployMode,
        restartRequired: true,
        remoteReadiness: remoteReadiness(cfg, signaling.ok && tokenOk),
    };
}

function remoteReadiness(cfg, mcuRunning) {
    cfg = normalize(cfg || {});
    const ws = cfg.publicWsUrl || '';
    const isWss = /^wss:/i.test(ws);
    const localWs = isLocalHostRef(ws);
    const iceIp = cfg.iceNodeIp || cfg.siteHost || '';
    const privateIce = isPrivateIp(iceIp);
    const hasTurn = !!parseTurnUrl(cfg.turnUrl);
    const items = [
        {
            id: 'mcu',
            ok: !!mcuRunning,
            level: 'required',
        },
        {
            id: 'clientUrl',
            ok: !!ws && !localWs,
            level: 'required',
        },
        {
            id: 'iceIp',
            ok: !!iceIp && !isLocalHostRef(iceIp),
            level: 'required',
        },
        {
            id: 'wss',
            ok: isWss,
            level: cfg.deployMode === 'livekit-cloud' ? 'required' : 'recommended',
        },
        {
            id: 'turn',
            ok: hasTurn,
            level: 'recommended',
        },
    ];
    const lanOk = !!mcuRunning && !!ws && !localWs && !!iceIp && !isLocalHostRef(iceIp);
    const internetOk = lanOk && isWss && (!privateIce || hasTurn);
    return {
        items: items,
        lanOk: lanOk,
        internetOk: internetOk,
        deployMode: cfg.deployMode,
    };
}

function firewallRows(cfg) {
    cfg = normalize(cfg || load());
    if (!cfg.apiUrl) return [];
    const port = cfg.publicHttpPort || '7880';
    return [
        {
            service: 'Video Conference signaling',
            port: port,
            protocol: 'tcp',
            direction: 'inbound',
            audience: 'Operators + phones',
            note: 'WebSocket — ' + (cfg.publicWsUrl || ('ws://' + cfg.siteHost + ':' + port)),
            required: true,
        },
        {
            service: 'Video Conference media (WebRTC)',
            port: port + ' TCP, 51000–51100 UDP',
            protocol: 'tcp+udp',
            direction: 'inbound',
            audience: 'Operators + phones',
            note: 'ICE node IP: ' + (cfg.iceNodeIp || cfg.siteHost) + '. Open on server firewall/NAT.',
            required: true,
        },
    ];
}

function deployHints(mode) {
    const hints = {
        'lan-docker': 'Video service runs in Docker on this server. Set site host and media IP to your LAN address. Phones use the same network or VPN.',
        'remote-mcu': 'Video runs on another host. Set the API URL to that server; the phone URL must match what browsers and phones can reach.',
        'livekit-cloud': 'Use your cloud project URL and API keys. Set the public secure WebSocket (WSS) URL from your provider dashboard.',
    };
    return hints[mode] || hints['lan-docker'];
}

module.exports = {
    init,
    load,
    save,
    normalize,
    getRuntime,
    publicView,
    applyToEnvAndDocker,
    syncLivekitYaml,
    testConnection,
    firewallRows,
    deployHints,
    envDefaults,
    remoteReadiness,
    credentialsHiddenForDeployMode,
    parseTurnUrl,
    isLocalHostRef,
};
