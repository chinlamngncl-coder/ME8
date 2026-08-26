'use strict';

/**
 * DASHBOARD-HTTPS-LAN-V1 + DASHBOARD-TLS-SAN-LAN-IP-V1
 * Lab self-signed cert + key for Ops HTTPS.
 * Prefer OpenSSL when present; else Windows PowerShell New-SelfSignedCertificate.
 * SAN includes localhost, 127.0.0.1, and preferred LAN IPv4 (never 172.17–172.31).
 * Auto-regenerates when existing cert is missing the current LAN IP (DHCP drift).
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const crypto = require('crypto');
const dashboardTls = require('../lib/dashboardTls');

const root = path.join(__dirname, '..');
const { certPath, keyPath } = dashboardTls.resolvePaths(root);
const force = process.argv.includes('--force') || process.argv.includes('-f');
const trustUser = process.argv.includes('--trust-user');

function isBadLanIp(ip) {
    if (!ip) return true;
    if (/^127\./.test(ip)) return true;
    if (/^169\.254\./.test(ip)) return true;
    if (/^172\.(1[7-9]|2[0-9]|3[0-1])\./.test(ip)) return true;
    return false;
}

function preferredLanIp() {
    const fromEnv = String(process.env.FM_HTTPS_LAN_IP || '').trim();
    if (fromEnv && /^\d+\.\d+\.\d+\.\d+$/.test(fromEnv) && !isBadLanIp(fromEnv)) {
        return fromEnv;
    }
    const hostEnv = String(process.env.HOST || '').trim();
    if (hostEnv && /^\d+\.\d+\.\d+\.\d+$/.test(hostEnv) && !isBadLanIp(hostEnv)) {
        return hostEnv;
    }
    const ps1 = path.join(root, 'scripts', 'Get-UbitronPreferredLanIPv4.ps1');
    if (fs.existsSync(ps1)) {
        const r = spawnSync(
            'powershell',
            ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1, '-Print'],
            { encoding: 'utf8', windowsHide: true }
        );
        const ip = String(r.stdout || '').trim().split(/\r?\n/).filter(Boolean).pop();
        if (ip && !isBadLanIp(ip)) return ip;
    }
    return null;
}

function extraHosts() {
    const raw = String(process.env.FM_HTTPS_EXTRA_HOSTS || '').trim();
    if (!raw) return [];
    return raw.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
}

function buildSanList() {
    const names = new Set(['localhost', '127.0.0.1']);
    const lan = preferredLanIp();
    if (lan) names.add(lan);
    for (const h of extraHosts()) {
        if (!isBadLanIp(h) || h === 'localhost' || h === '127.0.0.1') names.add(h);
        else if (!/^172\.(1[7-9]|2[0-9]|3[0-1])\./.test(h)) names.add(h);
    }
    return Array.from(names);
}

function ensureDir(filePath) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

/** @returns {Set<string>} */
function readExistingSanHosts() {
    const out = new Set();
    if (!fs.existsSync(certPath)) return out;
    try {
        const x509 = new crypto.X509Certificate(fs.readFileSync(certPath));
        const san = String(x509.subjectAltName || '');
        for (const part of san.split(',')) {
            const p = part.trim();
            const dns = /^DNS:(.+)$/i.exec(p);
            const ip = /^IP Address:(.+)$/i.exec(p);
            if (dns) out.add(dns[1].trim());
            if (ip) out.add(ip[1].trim());
        }
        const cn = /CN\s*=\s*([^,]+)/i.exec(String(x509.subject || ''));
        if (cn) out.add(cn[1].trim());
    } catch (_) {
        /* treat as empty → regen */
    }
    return out;
}

function certMissingLanSan(sanList) {
    const have = readExistingSanHosts();
    if (!have.size) return true;
    for (const h of sanList) {
        if (!have.has(h)) return true;
    }
    return false;
}

function trustCertCurrentUserRoot() {
    if (process.platform !== 'win32' || !fs.existsSync(certPath)) return;
    const certEsc = certPath.replace(/'/g, "''");
    const script = `
$ErrorActionPreference = 'Stop'
$cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2('${certEsc}')
$store = New-Object System.Security.Cryptography.X509Certificates.X509Store('Root','CurrentUser')
$store.Open('ReadWrite')
$dup = $store.Certificates | Where-Object { $_.Thumbprint -eq $cert.Thumbprint }
if (-not $dup) { $store.Add($cert) | Out-Null; Write-Output 'trusted' } else { Write-Output 'already' }
$store.Close()
`;
    const r = spawnSync(
        'powershell',
        ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script],
        { encoding: 'utf8', windowsHide: true }
    );
    if (r.status !== 0) {
        console.warn('[warn] --trust-user failed:', (r.stderr || r.stdout || '').slice(0, 300));
        return;
    }
    console.log('[ok] trusted lab cert in CurrentUser Root (' + String(r.stdout || '').trim() + ')');
}

function printOperatorHint(sanList) {
    const lan = sanList.find((h) => /^\d+\.\d+\.\d+\.\d+$/.test(h) && !/^127\./.test(h));
    const httpsPort = parseInt(process.env.FM_HTTPS_PORT || '4438', 10) || 4438;
    console.log('[hint] Clients must NOT use localhost on another PC.');
    if (lan) {
        console.log('[hint] Open https://' + lan + ':' + httpsPort + ' — Accept cert once (Advanced → Continue), then mic/unmute.');
        console.log('[hint] Or: node scripts/ensure-lab-dashboard-tls-certs.js --trust-user  (this Windows user only)');
    } else {
        console.log('[hint] No LAN IP in SAN — set FM_HTTPS_LAN_IP=192.168.x.x then --force');
    }
}

function resolveOpenssl() {
    const fromPath = spawnSync('openssl', ['version'], { encoding: 'utf8', windowsHide: true });
    if (fromPath.status === 0) return 'openssl';
    const candidates = [
        'C:\\Program Files\\Git\\usr\\bin\\openssl.exe',
        'C:\\Program Files (x86)\\Git\\usr\\bin\\openssl.exe',
        path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Git', 'usr', 'bin', 'openssl.exe'),
    ];
    for (const c of candidates) {
        if (c && fs.existsSync(c)) {
            const r = spawnSync(c, ['version'], { encoding: 'utf8', windowsHide: true });
            if (r.status === 0) return c;
        }
    }
    return null;
}

function haveOpenssl() {
    return !!resolveOpenssl();
}

function generateWithOpenssl(sanList) {
    const openssl = resolveOpenssl();
    if (!openssl) throw new Error('openssl not found');
    ensureDir(certPath);
    const confPath = path.join(path.dirname(certPath), 'openssl-san.cnf');
    const dns = [];
    const ips = [];
    let i = 1;
    let j = 1;
    for (const h of sanList) {
        if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) {
            ips.push('IP.' + j + ' = ' + h);
            j += 1;
        } else {
            dns.push('DNS.' + i + ' = ' + h);
            i += 1;
        }
    }
    const conf = [
        '[req]',
        'default_bits = 2048',
        'prompt = no',
        'default_md = sha256',
        'distinguished_name = dn',
        'x509_extensions = v3_req',
        '',
        '[dn]',
        'CN = ME8 Lab Dashboard',
        'O = Ubitron Lab',
        '',
        '[v3_req]',
        'subjectAltName = @alt',
        'keyUsage = digitalSignature, keyEncipherment',
        'extendedKeyUsage = serverAuth',
        '',
        '[alt]',
        ...dns,
        ...ips,
        '',
    ].join('\n');
    fs.writeFileSync(confPath, conf, 'utf8');
    const r = spawnSync(
        openssl,
        [
            'req', '-x509', '-nodes', '-newkey', 'rsa:2048',
            '-keyout', keyPath,
            '-out', certPath,
            '-days', '825',
            '-config', confPath,
            '-extensions', 'v3_req',
        ],
        { encoding: 'utf8', windowsHide: true }
    );
    if (r.status !== 0) {
        throw new Error('openssl failed: ' + (r.stderr || r.stdout || r.status));
    }
}

function generateWithPowerShell(sanList) {
    ensureDir(certPath);
    const dnsNames = sanList.map((s) => "'" + String(s).replace(/'/g, "''") + "'").join(',');
    const certOut = certPath.replace(/'/g, "''");
    const keyOut = keyPath.replace(/'/g, "''");
    const script = `
$ErrorActionPreference = 'Stop'
$dns = @(${dnsNames})
$cert = New-SelfSignedCertificate -Subject 'CN=ME8 Lab Dashboard' -DnsName $dns -CertStoreLocation 'Cert:\\CurrentUser\\My' -KeyExportPolicy Exportable -KeySpec Signature -KeyLength 2048 -HashAlgorithm SHA256 -NotAfter (Get-Date).AddDays(825) -FriendlyName 'ME8 Lab Dashboard TLS'
$pwd = ConvertTo-SecureString -String 'me8-lab-tls-export' -Force -AsPlainText
$pfxPath = Join-Path $env:TEMP ('me8-lab-tls-' + [guid]::NewGuid().ToString() + '.pfx')
Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $pwd | Out-Null
$pfx = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($pfxPath, 'me8-lab-tls-export', [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::Exportable)
$certPem = "-----BEGIN CERTIFICATE-----\`n" + [Convert]::ToBase64String($pfx.RawData, [System.Base64FormattingOptions]::InsertLineBreaks) + "\`n-----END CERTIFICATE-----\`n"
[System.IO.File]::WriteAllText('${certOut}', $certPem)
$rsa = [System.Security.Cryptography.X509Certificates.RSACertificateExtensions]::GetRSAPrivateKey($pfx)
if (-not $rsa) { throw 'No RSA private key in lab cert' }
try {
  $pkcs8 = $rsa.ExportPkcs8PrivateKey()
} catch {
  $pkcs8 = $rsa.ExportRSAPrivateKey()
  $b64 = [Convert]::ToBase64String($pkcs8, [System.Base64FormattingOptions]::InsertLineBreaks)
  $keyPem = "-----BEGIN RSA PRIVATE KEY-----\`n$b64\`n-----END RSA PRIVATE KEY-----\`n"
  [System.IO.File]::WriteAllText('${keyOut}', $keyPem)
  Remove-Item -Force $pfxPath -ErrorAction SilentlyContinue
  Get-ChildItem Cert:\\CurrentUser\\My | Where-Object { $_.Thumbprint -eq $cert.Thumbprint } | Remove-Item -ErrorAction SilentlyContinue
  exit 0
}
$b64 = [Convert]::ToBase64String($pkcs8, [System.Base64FormattingOptions]::InsertLineBreaks)
$keyPem = "-----BEGIN PRIVATE KEY-----\`n$b64\`n-----END PRIVATE KEY-----\`n"
[System.IO.File]::WriteAllText('${keyOut}', $keyPem)
Remove-Item -Force $pfxPath -ErrorAction SilentlyContinue
Get-ChildItem Cert:\\CurrentUser\\My | Where-Object { $_.Thumbprint -eq $cert.Thumbprint } | Remove-Item -ErrorAction SilentlyContinue
`;
    const r = spawnSync(
        'powershell',
        ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script],
        { encoding: 'utf8', windowsHide: true }
    );
    if (r.status !== 0) {
        throw new Error('PowerShell cert failed: ' + (r.stderr || r.stdout || r.status));
    }
}

function main() {
    const san = buildSanList();
    const present = fs.existsSync(certPath) && fs.existsSync(keyPath);
    const drift = present && certMissingLanSan(san);
    if (!force && present && !drift) {
        console.log('[ok] lab TLS certs already present (SAN covers current hosts)');
        console.log('  cert:', certPath);
        console.log('  SAN:', Array.from(readExistingSanHosts()).join(', ') || san.join(', '));
        console.log('  use --force to regenerate; --trust-user to trust in this Windows profile');
        printOperatorHint(san);
        if (trustUser) trustCertCurrentUserRoot();
        return;
    }
    if (drift && !force) {
        console.log('[ensure] SAN drift — regenerating (missing host(s) vs', san.join(', ') + ')');
    } else {
        console.log('[ensure] generating lab dashboard TLS cert');
    }
    console.log('  SAN:', san.join(', '));
    if (haveOpenssl()) {
        generateWithOpenssl(san);
        console.log('[ok] openssl wrote cert + key');
    } else if (process.platform === 'win32') {
        generateWithPowerShell(san);
        console.log('[ok] PowerShell wrote cert + key');
    } else {
        throw new Error('Need openssl on PATH (or run on Windows for PowerShell fallback)');
    }
    if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
        throw new Error('cert/key missing after generate');
    }
    console.log('  cert:', certPath);
    console.log('  key:', keyPath);
    printOperatorHint(san);
    if (trustUser) trustCertCurrentUserRoot();
}

try {
    main();
} catch (err) {
    console.error('[fail]', err && err.message ? err.message : err);
    process.exit(1);
}
