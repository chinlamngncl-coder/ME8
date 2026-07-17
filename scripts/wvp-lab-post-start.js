/**
 * Called by START-WVP-LAB.ps1 after SIP proxy start.
 * Avoids PowerShell parsing JS || / {} inside node -e strings.
 */
'use strict';

process.env.FM_LAB_WVP = process.env.FM_LAB_WVP || '1';
if (!process.env.FM_WVP_MIRROR_REGISTER) process.env.FM_WVP_MIRROR_REGISTER = '0';

const wvp = require('../lib/wvpLabClient');

async function main() {
    const sync = await wvp.syncLanSourceIps({ reason: 'start-wvp' });
    const skipped = (sync && sync.skipped && sync.skipped.length) ? sync.skipped.length : 0;
    console.log(JSON.stringify({
        ok: !!(sync && sync.ok),
        patched: sync && sync.patched,
        skipped: skipped,
    }));

    if (String(process.env.FM_WVP_MIRROR_REGISTER || '').trim() === '1') {
        const mirror = require('../lib/wvpRegisterMirror');
        const m = await mirror.mirrorAllFromContactCache();
        console.log(JSON.stringify({ ok: !!(m && m.ok), count: m && m.count }));
    } else {
        console.log('Mirror REGISTER skipped (FM_WVP_MIRROR_REGISTER=0) — BWC GB must register to WVP :5060');
    }

    const clear = await wvp.clearStaleDockerHostDevices();
    const patched = (clear && clear.patched && clear.patched.length) ? clear.patched.length : 0;
    const cleared = (clear && clear.cleared && clear.cleared.length) ? clear.cleared.length : 0;
    console.log(JSON.stringify({
        ok: !!(clear && clear.ok),
        patched: patched,
        cleared: cleared,
    }));
}

main().catch((err) => {
    console.error(err && err.message ? err.message : String(err));
    process.exitCode = 1;
});
