'use strict';
/**
 * ME8 lab / edge TLS terminator — reverse proxy to Fleet HTTP (default :3988).
 * Production: prefer nginx, Caddy, or IIS ARR; this script is for bench verify and small LAN sites.
 *
 * Env: FM_TLS_LISTEN_HOST, FM_TLS_LISTEN_PORT, FM_TLS_UPSTREAM, FM_TLS_CERT, FM_TLS_KEY
 */
const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');

const listenHost = process.env.FM_TLS_LISTEN_HOST || '0.0.0.0';
const listenPort = parseInt(process.env.FM_TLS_LISTEN_PORT || '3443', 10);
const upstreamRaw = process.env.FM_TLS_UPSTREAM || 'http://127.0.0.1:3988';
const upstreamUrl = new URL(upstreamRaw);
const upstreamHost = upstreamUrl.hostname || '127.0.0.1';
const upstreamPort = parseInt(upstreamUrl.port || '3988', 10);
const upstreamIsHttps = upstreamUrl.protocol === 'https:';

const appRoot = path.resolve(__dirname, '..', '..');
const defaultCert = path.join(appRoot, 'storage', 'tls', 'me8-dashboard.crt');
const defaultKey = path.join(appRoot, 'storage', 'tls', 'me8-dashboard.key');
const defaultPfx = path.join(appRoot, 'storage', 'tls', 'me8-dashboard.pfx');
const certPath = process.env.FM_TLS_CERT || defaultCert;
const keyPath = process.env.FM_TLS_KEY || defaultKey;
const pfxPath = process.env.FM_TLS_PFX || defaultPfx;

let tlsOptions;
if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    tlsOptions = {
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath),
    };
} else if (fs.existsSync(pfxPath)) {
    tlsOptions = { pfx: fs.readFileSync(pfxPath) };
    const passFile = path.join(appRoot, 'storage', 'tls', 'pfx-pass.txt');
    const pass = process.env.FM_TLS_PFX_PASS
        || (fs.existsSync(passFile) ? fs.readFileSync(passFile, 'utf8').trim() : '');
    if (pass) tlsOptions.passphrase = pass;
} else {
    console.error('TLS cert/key missing. Run .\\SETUP-TLS-DASHBOARD.ps1 first.');
    console.error('  cert:', certPath);
    console.error('  key:', keyPath);
    console.error('  pfx:', pfxPath);
    process.exit(1);
}

function forwardHeaders(req) {
    const out = Object.assign({}, req.headers);
    out['x-forwarded-proto'] = 'https';
    out['x-forwarded-host'] = req.headers.host || '';
    if (!out['x-forwarded-for']) {
        out['x-forwarded-for'] = req.socket.remoteAddress || '';
    }
    return out;
}

function proxyHttp(req, res) {
    const opts = {
        hostname: upstreamHost,
        port: upstreamPort,
        path: req.url,
        method: req.method,
        headers: forwardHeaders(req),
    };
    const lib = upstreamIsHttps ? https : http;
    const prox = lib.request(opts, function (pres) {
        res.writeHead(pres.statusCode || 502, pres.headers);
        pres.pipe(res);
    });
    prox.on('error', function (err) {
        res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('ME8 TLS proxy — upstream unreachable: ' + err.message);
    });
    req.pipe(prox);
}

function proxyUpgrade(req, socket, head) {
    const headers = forwardHeaders(req);
    const lines = [
        req.method + ' ' + req.url + ' HTTP/' + req.httpVersion,
    ];
    Object.keys(headers).forEach(function (k) {
        lines.push(k + ': ' + headers[k]);
    });
    lines.push('', '');
    const headerBuf = Buffer.from(lines.join('\r\n'), 'utf8');
    const conn = require('net').connect(upstreamPort, upstreamHost, function () {
        conn.write(headerBuf);
        if (head && head.length) conn.write(head);
        socket.pipe(conn);
        conn.pipe(socket);
    });
    conn.on('error', function () {
        try { socket.destroy(); } catch (_) { /* ignore */ }
    });
    socket.on('error', function () {
        try { conn.destroy(); } catch (_) { /* ignore */ }
    });
}

const server = https.createServer(tlsOptions, proxyHttp);
server.on('upgrade', proxyUpgrade);

server.listen(listenPort, listenHost, function () {
    console.log('ME8 TLS proxy listening on https://' + listenHost + ':' + listenPort);
    console.log('Upstream: ' + upstreamRaw);
    console.log('Press Ctrl+C to stop.');
});
