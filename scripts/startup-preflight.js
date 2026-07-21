#!/usr/bin/env node
'use strict';

const fs = require('fs');
const http = require('http');
const net = require('net');
const dgram = require('dgram');
const path = require('path');
const crypto = require('crypto');
const childProcess = require('child_process');
const { Client } = require('pg');

function argValue(name, fallback) {
    const index = process.argv.indexOf(name);
    return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const appRoot = path.resolve(argValue('--app-root', path.join(__dirname, '..')));
const storageRoot = path.resolve(argValue('--storage-root', path.join(appRoot, 'storage')));
const jsonOnly = process.argv.includes('--json');
const checks = [];

function record(name, ok, detail) {
    checks.push({ name, ok: !!ok, detail: detail || null });
    if (!ok) throw new Error(name + ': ' + (detail || 'failed'));
}

function parseEnvFile(filePath) {
    if (!fs.existsSync(filePath)) return {};
    const dotenv = require(path.join(appRoot, 'node_modules', 'dotenv'));
    return dotenv.parse(fs.readFileSync(filePath));
}

function portNumber(value, fallback, name) {
    const raw = value == null || value === '' ? fallback : value;
    const port = Number.parseInt(raw, 10);
    record(name, Number.isInteger(port) && port >= 1 && port <= 65535, 'value=' + raw);
    return port;
}

function testWriteLifecycle(dir) {
    fs.mkdirSync(dir, { recursive: true });
    const token = crypto.randomBytes(8).toString('hex');
    const first = path.join(dir, '.startup-write-' + token + '.tmp');
    const second = first + '.renamed';
    try {
        fs.writeFileSync(first, token, { flag: 'wx' });
        record('storage-write', fs.readFileSync(first, 'utf8') === token, dir);
        fs.renameSync(first, second);
        record('storage-rename', fs.existsSync(second), dir);
    } finally {
        try { fs.unlinkSync(first); } catch (_) { /* cleanup */ }
        try { fs.unlinkSync(second); } catch (_) { /* cleanup */ }
    }
}

async function testPostgresMigration(connectionString) {
    if (!connectionString) {
        throw new Error('database-configuration: FM_CATALOG_DB_URL is required');
    }
    const schemaName = 'me8_preflight_' + crypto.randomBytes(6).toString('hex');
    const client = new Client({
        connectionString,
        connectionTimeoutMillis: 5000,
        statement_timeout: 15000,
        application_name: 'mobility-axiom-startup-preflight',
    });
    await client.connect();
    try {
        await client.query('SELECT 1 AS ok');
        record('postgres-connectivity', true, 'PostgreSQL answered');
        await client.query('CREATE SCHEMA "' + schemaName + '"');
        await client.query('SET search_path TO "' + schemaName + '"');
        const migration = fs.readFileSync(
            path.join(appRoot, 'db', 'migrations', '001_catalog_primary.sql'),
            'utf8',
        );
        await client.query(migration);
        const version = await client.query('SELECT MAX(version) AS version FROM schema_migrations');
        record('database-migration-probe', Number(version.rows[0].version) === 1, 'schema version 1');
    } finally {
        try {
            await client.query('RESET search_path');
            await client.query('DROP SCHEMA IF EXISTS "' + schemaName + '" CASCADE');
        } finally {
            await client.end();
        }
    }
}

function listenTcp(server, host) {
    return new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, host, () => resolve(server.address().port));
    });
}

function listenUdp(socket, host) {
    return new Promise((resolve, reject) => {
        socket.once('error', reject);
        socket.bind(0, host, () => resolve(socket.address().port));
    });
}

async function testIsolatedListeners() {
    const host = '127.0.0.1';
    const web = http.createServer((req, res) => {
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ ok: true }));
    });
    const ptt = net.createServer((socket) => socket.destroy());
    const sip = dgram.createSocket('udp4');
    try {
        const ports = await Promise.all([
            listenTcp(web, host),
            listenUdp(sip, host),
            listenTcp(ptt, host),
        ]);
        record('isolated-http-ready', ports[0] > 0, host + ':' + ports[0]);
        record('isolated-sip-ready', ports[1] > 0, host + ':' + ports[1]);
        record('isolated-ptt-ready', ports[2] > 0, host + ':' + ports[2]);
    } finally {
        await Promise.all([
            new Promise((resolve) => web.close(() => resolve())),
            new Promise((resolve) => ptt.close(() => resolve())),
            new Promise((resolve) => sip.close(() => resolve())),
        ]);
    }
}

async function main() {
    const nodeMajor = Number.parseInt(process.versions.node.split('.')[0], 10);
    record('node-version', nodeMajor >= 22, process.version);

    ['server.js', 'package.json', 'lib/siteDb.js', 'lib/platformHealth.js'].forEach((rel) => {
        record('required-file-' + rel, fs.existsSync(path.join(appRoot, rel)), rel);
    });
    record('media-engine', fs.existsSync(path.join(appRoot, 'vendor', 'ffmpeg-lgpl', 'ffmpeg.exe')),
        'vendor/ffmpeg-lgpl/ffmpeg.exe');

    const pkg = JSON.parse(fs.readFileSync(path.join(appRoot, 'package.json'), 'utf8'));
    Object.keys(pkg.dependencies || {}).forEach((name) => {
        record('dependency-' + name, !!require.resolve(name, { paths: [appRoot] }), name);
    });

    const syntax = childProcess.spawnSync(process.execPath, ['--check', path.join(appRoot, 'server.js')], {
        encoding: 'utf8',
        windowsHide: true,
    });
    record('server-syntax', syntax.status === 0, (syntax.stderr || syntax.stdout || '').trim() || 'valid');

    const env = Object.assign({}, process.env, parseEnvFile(path.join(appRoot, '.env')));
    record('catalog-mode', String(env.FM_CATALOG_MODE || '') === 'postgres_required',
        env.FM_CATALOG_MODE || 'missing');
    record('sqlite-fallback-disabled', String(env.FM_CATALOG_ALLOW_SQLITE_QUEUE || '0') !== '1',
        env.FM_CATALOG_ALLOW_SQLITE_QUEUE || '0');
    const settingsPath = path.join(storageRoot, 'server-settings.json');
    if (fs.existsSync(settingsPath)) {
        JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    }
    record('configuration-json', true, fs.existsSync(settingsPath) ? settingsPath : 'defaults');

    const httpPort = portNumber(env.FM_HTTP_PORT || env.PORT, 3988, 'http-port');
    const configuredPorts = [
        httpPort,
        portNumber(env.FM_VIDEO_WS_PORT, httpPort + 1, 'video-port'),
        portNumber(env.FM_AUDIO_WS_PORT, httpPort + 2, 'audio-port'),
        portNumber(env.FM_PTT_PORT, 29201, 'ptt-port'),
    ];
    const uniquePorts = new Set(configuredPorts);
    record('port-plan-unique', uniquePorts.size === configuredPorts.length, configuredPorts.join(','));

    testWriteLifecycle(storageRoot);
    await testPostgresMigration(env.FM_CATALOG_DB_URL || process.env.FM_CATALOG_DB_URL);
    await testIsolatedListeners();

    const report = {
        ok: true,
        appRoot,
        storageRoot,
        node: process.version,
        checks,
    };
    process.stdout.write(JSON.stringify(report, null, jsonOnly ? 0 : 2) + '\n');
}

main().catch((err) => {
    const report = {
        ok: false,
        appRoot,
        storageRoot,
        error: err && err.message ? err.message : String(err),
        checks,
    };
    process.stdout.write(JSON.stringify(report, null, jsonOnly ? 0 : 2) + '\n');
    process.exit(1);
});
