#!/usr/bin/env node
/**
 * Messaging WebSocket load helper — stresses activeCameraSockets path on staging.
 * Not a full SIP/SIP simulator. Use SIPp for REGISTER/GPS certificate load.
 *
 * Usage:
 *   node scripts/scale-load-msg-ws.js --host 127.0.0.1 --port 6000 --count 200
 */
'use strict';

const WebSocket = require('ws');

function parseArgs(argv) {
    const opts = { host: '127.0.0.1', port: 6000, count: 100, prefix: '340200000013200000' };
    for (let i = 2; i < argv.length; i += 1) {
        const a = argv[i];
        if (a === '--host' && argv[i + 1]) opts.host = argv[++i];
        else if (a === '--port' && argv[i + 1]) opts.port = parseInt(argv[++i], 10);
        else if (a === '--count' && argv[i + 1]) opts.count = parseInt(argv[++i], 10);
        else if (a === '--prefix' && argv[i + 1]) opts.prefix = argv[++i];
    }
    return opts;
}

function padCamId(prefix, n) {
    const tail = String(n).padStart(2, '0');
    return String(prefix).slice(0, 18) + tail;
}

function main() {
    const opts = parseArgs(process.argv);
    const urlBase = `ws://${opts.host}:${opts.port}`;
    let open = 0;
    let failed = 0;
    const sockets = [];

    console.log(`Connecting ${opts.count} msg WS clients to ${urlBase} ...`);

    for (let i = 0; i < opts.count; i += 1) {
        const camId = padCamId(opts.prefix, i + 1);
        const url = `${urlBase}/?user=${camId}`;
        try {
            const ws = new WebSocket(url, { perMessageDeflate: false });
            ws.on('open', () => { open += 1; });
            ws.on('error', () => { failed += 1; });
            ws.on('close', () => {
                const idx = sockets.indexOf(ws);
                if (idx >= 0) sockets.splice(idx, 1);
            });
            sockets.push(ws);
        } catch (err) {
            failed += 1;
        }
    }

    setTimeout(() => {
        console.log(JSON.stringify({
            requested: opts.count,
            open,
            failed,
            stillConnected: sockets.length,
        }, null, 2));
        sockets.forEach((ws) => { try { ws.close(); } catch (_) { /* ignore */ } });
        process.exit(failed > opts.count * 0.05 ? 1 : 0);
    }, 8000);
}

main();
