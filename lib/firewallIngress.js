'use strict';

/**
 * Host firewall ingress for 1-Pack:
 * - UDP 10000-20000 WebRTC media
 * - SETUP_PORT: block WAN; allow localhost only
 * - Dashboard HTTP/HTTPS: tier-aware (lan = RFC 1918 only)
 *
 * Best-effort: failures never crash boot (logged / returned).
 */

const { spawnSync } = require('child_process');

const RFC1918 = '10.0.0.0/8,172.16.0.0/12,192.168.0.0/16';

function setupPort() {
    const n = parseInt(process.env.SETUP_PORT || '13988', 10);
    return Number.isFinite(n) && n > 0 ? n : 13988;
}

function dashboardPorts() {
    return {
        http: parseInt(process.env.FM_HTTP_PORT || '3988', 10) || 3988,
        https: parseInt(process.env.FM_HTTPS_PORT || '4438', 10) || 4438,
    };
}

function normalizeTier(raw) {
    const t = String(raw || process.env.ME8_NETWORK_TIER || 'lan').trim().toLowerCase();
    if (['lan', 'wan', 'cloud', 'hybrid'].includes(t)) return t;
    return 'lan';
}

function run(bin, args) {
    try {
        const r = spawnSync(bin, args, { encoding: 'utf8', windowsHide: true });
        return {
            ok: r.status === 0,
            status: r.status,
            stdout: String(r.stdout || ''),
            stderr: String(r.stderr || ''),
        };
    } catch (err) {
        return {
            ok: false,
            status: -1,
            stdout: '',
            stderr: err && err.message ? err.message : String(err),
        };
    }
}

function stepOk(step) {
    return step.ok || /already exists|ME8|Skipping|exists|ok/i.test(step.stdout + step.stderr);
}

function applyWindowsDashboardRules(tier, ports) {
    const steps = [];
    const httpPort = ports.http;
    const httpsPort = ports.https;
    const removeCmd = "Get-NetFirewallRule -DisplayName 'ME8 Dashboard*' -ErrorAction SilentlyContinue | Remove-NetFirewallRule -ErrorAction SilentlyContinue";
    steps.push(run('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', removeCmd]));

    if (tier === 'lan') {
        const allowCmd = "New-NetFirewallRule -DisplayName 'ME8 Dashboard HTTP RFC1918' -Direction Inbound -Protocol TCP "
            + "-LocalPort " + httpPort + " -RemoteAddress " + RFC1918 + " -Action Allow -ErrorAction SilentlyContinue | Out-Null; "
            + "New-NetFirewallRule -DisplayName 'ME8 Dashboard HTTPS RFC1918' -Direction Inbound -Protocol TCP "
            + "-LocalPort " + httpsPort + " -RemoteAddress " + RFC1918 + " -Action Allow -ErrorAction SilentlyContinue | Out-Null; "
            + "New-NetFirewallRule -DisplayName 'ME8 Dashboard HTTP block WAN' -Direction Inbound -Protocol TCP "
            + "-LocalPort " + httpPort + " -Action Block -ErrorAction SilentlyContinue | Out-Null; "
            + "New-NetFirewallRule -DisplayName 'ME8 Dashboard HTTPS block WAN' -Direction Inbound -Protocol TCP "
            + "-LocalPort " + httpsPort + " -Action Block -ErrorAction SilentlyContinue | Out-Null; 'ok'";
        steps.push(run('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', allowCmd]));
    } else {
        const allowCmd = "New-NetFirewallRule -DisplayName 'ME8 Dashboard HTTP allow' -Direction Inbound -Protocol TCP "
            + "-LocalPort " + httpPort + " -Action Allow -ErrorAction SilentlyContinue | Out-Null; "
            + "New-NetFirewallRule -DisplayName 'ME8 Dashboard HTTPS allow' -Direction Inbound -Protocol TCP "
            + "-LocalPort " + httpsPort + " -Action Allow -ErrorAction SilentlyContinue | Out-Null; 'ok'";
        steps.push(run('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', allowCmd]));
    }
    return steps;
}

function applyWindows(port, tier) {
    const steps = [];
    const ports = dashboardPorts();

    steps.push(run('powershell', [
        '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command',
        "New-NetFirewallRule -DisplayName 'ME8 WebRTC UDP 10000-20000' -Direction Inbound "
        + "-Protocol UDP -LocalPort 10000-20000 -Action Allow -ErrorAction SilentlyContinue | Out-Null; "
        + "Get-NetFirewallRule -DisplayName 'ME8 WebRTC UDP 10000-20000' -ErrorAction SilentlyContinue | "
        + "Select-Object -ExpandProperty DisplayName",
    ]));

    steps.push(run('powershell', [
        '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command',
        `$n='ME8 Setup Port ${port}'; `
        + `Get-NetFirewallRule -DisplayName $n* -ErrorAction SilentlyContinue | Remove-NetFirewallRule -ErrorAction SilentlyContinue; `
        + `New-NetFirewallRule -DisplayName ($n+' localhost') -Direction Inbound -Protocol TCP -LocalPort ${port} `
        + `-RemoteAddress 127.0.0.1 -Action Allow -ErrorAction SilentlyContinue | Out-Null; `
        + `New-NetFirewallRule -DisplayName ($n+' block wan') -Direction Inbound -Protocol TCP -LocalPort ${port} `
        + `-Action Block -ErrorAction SilentlyContinue | Out-Null; 'ok'`,
    ]));

    steps.push.apply(steps, applyWindowsDashboardRules(tier, ports));

    return {
        ok: steps.every(stepOk),
        steps,
        platform: 'win32',
        setupPort: port,
        tier: tier,
    };
}

function applyLinuxDashboardRules(tier, ports) {
    const steps = [];
    const httpPort = String(ports.http);
    const httpsPort = String(ports.https);

    if (tier === 'lan') {
        steps.push(run('ufw', ['allow', 'from', '10.0.0.0/8', 'to', 'any', 'port', httpPort, 'proto', 'tcp', 'comment', 'ME8 Dashboard HTTP RFC1918']));
        steps.push(run('ufw', ['allow', 'from', '172.16.0.0/12', 'to', 'any', 'port', httpPort, 'proto', 'tcp', 'comment', 'ME8 Dashboard HTTP RFC1918']));
        steps.push(run('ufw', ['allow', 'from', '192.168.0.0/16', 'to', 'any', 'port', httpPort, 'proto', 'tcp', 'comment', 'ME8 Dashboard HTTP RFC1918']));
        steps.push(run('ufw', ['allow', 'from', '10.0.0.0/8', 'to', 'any', 'port', httpsPort, 'proto', 'tcp', 'comment', 'ME8 Dashboard HTTPS RFC1918']));
        steps.push(run('ufw', ['allow', 'from', '172.16.0.0/12', 'to', 'any', 'port', httpsPort, 'proto', 'tcp', 'comment', 'ME8 Dashboard HTTPS RFC1918']));
        steps.push(run('ufw', ['allow', 'from', '192.168.0.0/16', 'to', 'any', 'port', httpsPort, 'proto', 'tcp', 'comment', 'ME8 Dashboard HTTPS RFC1918']));
        steps.push(run('ufw', ['deny', httpPort + '/tcp', 'comment', 'ME8 Dashboard HTTP block WAN']));
        steps.push(run('ufw', ['deny', httpsPort + '/tcp', 'comment', 'ME8 Dashboard HTTPS block WAN']));
    } else {
        steps.push(run('ufw', ['allow', httpPort + '/tcp', 'comment', 'ME8 Dashboard HTTP']));
        steps.push(run('ufw', ['allow', httpsPort + '/tcp', 'comment', 'ME8 Dashboard HTTPS']));
    }
    return steps;
}

function applyLinux(port, tier) {
    const steps = [];
    const hasUfw = run('sh', ['-c', 'command -v ufw']).ok;
    if (!hasUfw) {
        return { ok: false, detail: 'ufw not found', platform: 'linux', setupPort: port, tier: tier, steps };
    }

    const ports = dashboardPorts();
    steps.push(run('ufw', ['allow', '10000:20000/udp', 'comment', 'ME8 WebRTC']));
    steps.push(run('ufw', ['deny', String(port) + '/tcp', 'comment', 'ME8 Setup block WAN']));
    steps.push(run('ufw', ['allow', 'from', '127.0.0.1', 'to', 'any', 'port', String(port), 'proto', 'tcp', 'comment', 'ME8 Setup localhost']));
    steps.push.apply(steps, applyLinuxDashboardRules(tier, ports));

    return {
        ok: steps.every(stepOk),
        steps,
        platform: 'linux',
        setupPort: port,
        tier: tier,
    };
}

function applyFirewallIngress(options) {
    const opts = options || {};
    const port = setupPort();
    const tier = normalizeTier(opts.tier);
    try {
        if (process.platform === 'win32') return applyWindows(port, tier);
        if (process.platform === 'linux') return applyLinux(port, tier);
        return { ok: false, detail: 'unsupported platform', platform: process.platform, setupPort: port, tier: tier };
    } catch (err) {
        return {
            ok: false,
            detail: err && err.message ? err.message : String(err),
            platform: process.platform,
            setupPort: port,
            tier: tier,
        };
    }
}

module.exports = {
    setupPort,
    dashboardPorts,
    normalizeTier,
    applyFirewallIngress,
};
