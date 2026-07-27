'use strict';

/**
 * MOB-APPLY 0-SEAMLESS-INSTALLER-AND-BOOT-LOCK
 * CLI flags for the 1-Pack entry (bin/me8-server.js).
 */

function parseArgv(argv) {
    const args = Array.isArray(argv) ? argv.slice() : process.argv.slice(2);
    const flags = {
        resetLicense: false,
        safeMode: false,
        help: false,
        unknown: [],
    };
    for (let i = 0; i < args.length; i++) {
        const a = String(args[i] || '');
        if (a === '--reset-license') flags.resetLicense = true;
        else if (a === '--safe-mode') flags.safeMode = true;
        else if (a === '--help' || a === '-h') flags.help = true;
        else if (a.startsWith('-')) flags.unknown.push(a);
    }
    return flags;
}

function printHelp() {
    const lines = [
        'ME8 1-Pack / seamless boot',
        '',
        '  me8-server                  Normal boot (Setup UI until license when boot-lock on)',
        '  me8-server --safe-mode      Setup UI only — no Video / DB / Analytics',
        '  me8-server --reset-license  Delete active license files, then Setup UI',
        '  me8-server --help           This text',
        '',
        'SETUP_PORT (default 13988) = HTTP Setup on 127.0.0.1 only (avoids SSL lockout).',
        'SETUP_HTTPS_PORT (default 13989) = HTTPS Setup on 127.0.0.1 when certs exist.',
        'Do not set SETUP_PORT to the same value as FM_HTTP_PORT (lab dashboard, often 3988).',
        'Remote config: SSH tunnel to SETUP_PORT (WAN ingress blocked by firewall helper).',
    ];
    console.log(lines.join('\n'));
}

module.exports = {
    parseArgv,
    printHelp,
};
