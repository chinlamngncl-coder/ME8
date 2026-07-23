'use strict';

/**
 * DASHBOARD-HTTPS-LAN-V1 — create lab self-signed cert + key for Ops HTTPS.
 * Prefer OpenSSL when present; else Windows PowerShell New-SelfSignedCertificate.
 * SAN includes localhost, 127.0.0.1, and preferred LAN IPv4 (never 172.17–172.31).
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const dashboardTls = require('../lib/dashboardTls');

const root = path.join(__dirname, '..');
const { certPath, keyPath } = dashboardTls.resolvePaths(root);
const force = process.argv.includes('--force') || process.argv.includes('-f');

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
    if (!force && fs.existsSync(certPath) && fs.existsSync(keyPath)) {
        console.log('[ok] lab TLS certs already present');
        console.log('  cert:', certPath);
        console.log('  key:', keyPath);
        console.log('  use --force to regenerate (needed if LAN IP changed)');
        return;
    }
    const san = buildSanList();
    console.log('[ensure] generating lab dashboard TLS cert');
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
}

try {
    main();
} catch (err) {
    console.error('[fail]', err && err.message ? err.message : err);
    process.exit(1);
}
