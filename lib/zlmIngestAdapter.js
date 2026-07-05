/**
 * ZLM ingest — openRtpServer, RTP forward, stream lookup (mob-me8-zlm-ingest-bridge).
 */
'use strict';

const dgram = require('dgram');
const http = require('http');
const https = require('https');
const zlmSidecar = require('./zlmSidecar');

const DEFAULT_VHOST = '__defaultVhost__';
const APP_NAME = 'live';
const forwardSockets = new Map();

function streamIdForCam(camId) {
    const safe = String(camId || '').trim().replace(/[^\w.-]/g, '_');
    return DEFAULT_VHOST + '/' + APP_NAME + '/' + safe;
}

function buildApiUrl(api, params) {
    const cfg = zlmSidecar.readConfig();
    const base = cfg.httpUrl.replace(/\/+$/, '');
    const u = new URL(base + '/index/api/' + api);
    if (cfg.secret) u.searchParams.set('secret', cfg.secret);
    const p = params || {};
    Object.keys(p).forEach(function (k) {
        if (p[k] != null && p[k] !== '') u.searchParams.set(k, String(p[k]));
    });
    return u.toString();
}

function httpGetJson(url, timeoutMs) {
    return new Promise(function (resolve, reject) {
        let parsed;
        try { parsed = new URL(url); } catch (e) { reject(e); return; }
        const lib = parsed.protocol === 'https:' ? https : http;
        const req = lib.request(parsed, { method: 'GET', timeout: timeoutMs || 5000 }, function (res) {
            let body = '';
            res.on('data', function (c) { body += c; });
            res.on('end', function () {
                try { resolve({ status: res.statusCode, json: JSON.parse(body) }); }
                catch (e) { reject(new Error('Invalid ZLM API JSON')); }
            });
        });
        req.on('timeout', function () { req.destroy(); reject(new Error('ZLM API timeout')); });
        req.on('error', reject);
        req.end();
    });
}

async function apiCall(api, params) {
    const url = buildApiUrl(api, params);
    const { status, json } = await httpGetJson(url);
    if (status < 200 || status >= 300) {
        throw new Error('ZLM API HTTP ' + status);
    }
    if (json && json.code != null && json.code !== 0) {
        throw new Error(json.msg || ('ZLM API code ' + json.code));
    }
    return json;
}

async function openRtpServer(camId) {
    const streamId = streamIdForCam(camId);
    const json = await apiCall('openRtpServer', {
        port: 0,
        tcp_mode: 0,
        stream_id: streamId,
    });
    const port = json && (json.port != null ? json.port : json.data && json.data.port);
    if (!port) throw new Error('openRtpServer missing port');
    return {
        camId: String(camId),
        streamId: streamId,
        port: parseInt(port, 10),
    };
}

async function closeRtpServer(streamId) {
    if (!streamId) return;
    try {
        await apiCall('closeRtpServer', { stream_id: streamId });
    } catch (_) { /* ignore */ }
}

function getForwardSocket(zlmPort) {
    let sock = forwardSockets.get(zlmPort);
    if (!sock) {
        sock = dgram.createSocket('udp4');
        forwardSockets.set(zlmPort, sock);
    }
    return sock;
}

function forwardRtp(zlmPort, msg, srcAddress, srcPort) {
    if (!zlmPort || !msg || !msg.length) return;
    const sock = getForwardSocket(zlmPort);
    sock.send(msg, zlmPort, '127.0.0.1', function (err) {
        if (err) { /* logged at router */ }
    });
}

function releaseForwardSocket(zlmPort) {
    const sock = forwardSockets.get(zlmPort);
    if (!sock) return;
    try { sock.close(); } catch (_) { /* ignore */ }
    forwardSockets.delete(zlmPort);
}

function flvPlayUrl(camId) {
    const cfg = zlmSidecar.readConfig();
    const safe = String(camId || '').trim().replace(/[^\w.-]/g, '_');
    return cfg.httpUrl.replace(/\/+$/, '') + '/' + APP_NAME + '/' + safe + '.live.flv';
}

async function getMediaEntry(camId) {
    const safe = String(camId || '').trim().replace(/[^\w.-]/g, '_');
    const json = await apiCall('getMediaList', {});
    const list = (json && json.data) || [];
    if (!Array.isArray(list)) return null;
    return list.find(function (row) {
        return row && (row.stream === safe || row.stream === safe + '.live' || String(row.stream || '').indexOf(safe) >= 0);
    }) || null;
}

module.exports = {
    streamIdForCam,
    openRtpServer,
    closeRtpServer,
    forwardRtp,
    releaseForwardSocket,
    flvPlayUrl,
    getMediaEntry,
    apiCall,
};
