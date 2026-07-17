/**
 * mob-wvp-fleet-register-mirror-v1 + mob-wvp-dedupe-channels-v1
 * SQL LAN host + at most one channel row per device (no phantom insert).
 */
'use strict';

const { execFileSync } = require('child_process');
const wvpSipLanMap = require('./wvpSipLanMap');

function sqlLiteral(s) {
    return "'" + String(s == null ? '' : s).replace(/'/g, "''") + "'";
}

function patchWvpDbLanAndChannel(deviceId, lanIp, lanPort, opts) {
    const did = String(deviceId || '').trim();
    const ip = String(lanIp || '').trim();
    const port = lanPort != null && Number.isFinite(Number(lanPort)) ? Number(lanPort) : 5060;
    if (!wvpSipLanMap.isBwcGbId(did) || !wvpSipLanMap.isLanIpv4(ip)) {
        return { ok: false, reason: 'bad_args' };
    }
    const hostAddress = ip + ':' + port;
    const streamMode = (opts && opts.streamMode) || 'TCP-PASSIVE';
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    /* mob-wvp-dedupe-channels-v1 — never insert a second channel; fix empty gb ids on existing row. */
    const sql = [
        'UPDATE wvp_device SET'
        + ' ip=' + sqlLiteral(ip)
        + ', host_address=' + sqlLiteral(hostAddress)
        + ', port=' + port
        + ', stream_mode=' + sqlLiteral(streamMode)
        + ', update_time=' + sqlLiteral(now)
        + ' WHERE device_id=' + sqlLiteral(did) + ';',
        'DELETE FROM wvp_device_channel'
        + ' WHERE device_id=' + sqlLiteral(did)
        + ' AND (gb_device_id IS NULL OR gb_device_id = \'\');',
        'UPDATE wvp_device_channel SET'
        + ' gb_device_id=' + sqlLiteral(did)
        + ', gb_name=COALESCE(NULLIF(gb_name, \'\'), NULLIF(name, \'\'), ' + sqlLiteral(did) + ')'
        + ', gb_status=' + sqlLiteral('ON')
        + ', status=' + sqlLiteral('ON')
        + ', update_time=' + sqlLiteral(now)
        + ' WHERE device_id=' + sqlLiteral(did)
        + ' AND id = ('
        + ' SELECT id FROM wvp_device_channel WHERE device_id=' + sqlLiteral(did)
        + ' ORDER BY id ASC LIMIT 1'
        + ' );',
        'INSERT INTO wvp_device_channel ('
        + 'device_id, name, status, create_time, update_time, has_audio, channel_type,'
        + ' gb_device_id, gb_name, gb_status, data_type, data_device_id'
        + ') SELECT d.device_id, d.device_id, ' + sqlLiteral('ON') + ', '
        + sqlLiteral(now) + ', ' + sqlLiteral(now) + ', true, 0, '
        + 'd.device_id, d.device_id, ' + sqlLiteral('ON') + ', 1, d.id '
        + 'FROM wvp_device d WHERE d.device_id=' + sqlLiteral(did)
        + ' AND NOT EXISTS (SELECT 1 FROM wvp_device_channel c WHERE c.device_id=' + sqlLiteral(did) + ');',
    ].join('\n');
    try {
        const out = execFileSync(
            'docker',
            ['exec', '-i', 'me8-wvp-db', 'psql', '-U', 'root', '-d', 'wvp2', '-v', 'ON_ERROR_STOP=1', '-c', sql],
            { encoding: 'utf8', timeout: 15000, windowsHide: true }
        );
        try {
            const keysOut = execFileSync(
                'docker',
                ['exec', 'me8-wvp-redis', 'redis-cli', '-a', 'root', '--no-auth-warning', 'KEYS', '*' + did + '*'],
                { encoding: 'utf8', timeout: 8000, windowsHide: true }
            );
            String(keysOut).split(/\r?\n/).map((k) => k.trim()).filter(Boolean).forEach((key) => {
                try {
                    execFileSync(
                        'docker',
                        ['exec', 'me8-wvp-redis', 'redis-cli', '-a', 'root', '--no-auth-warning', 'DEL', key],
                        { encoding: 'utf8', timeout: 5000, windowsHide: true }
                    );
                } catch (_) { /* ignore */ }
            });
        } catch (_) { /* redis optional */ }
        return { ok: true, hostAddress, sqlOut: String(out).slice(0, 200) };
    } catch (err) {
        return {
            ok: false,
            reason: 'sql_patch_failed',
            message: err && err.message ? String(err.message).slice(0, 160) : 'sql_fail',
        };
    }
}

module.exports = { patchWvpDbLanAndChannel };
