/**
 * BWC FTP upload target (PDF §12). Matches device FTP screen: IP, port 21, User No., password.
 */

const fs = require('fs');
const path = require('path');
const { FtpSrv } = require('ftp-srv');
const { createFtpSrvLogger } = require('./ftpSrvLogger');

function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function cleanUploadDisplayName(filePath) {
    const base = path.basename(String(filePath || ''));
    return base.replace(/\.tmp$/i, '');
}

function startFtpServer(opts) {
    const {
        host,
        port,
        user,
        pass,
        rootDir,
        pasvMin = 20000,
        pasvMax = 20100,
        log,
        onFileUploaded,
        onListening,
    } = opts;

    const userTrim = String(user || '').trim();
    const passTrim = String(pass || '').trim();
    if (!userTrim || !passTrim) {
        log.ftp.warn('not started', { reason: 'FM_FTP_PASS is empty in .env — must match BWC password' });
        return null;
    }

    ensureDir(rootDir);

    const ftpServer = new FtpSrv({
        url: `ftp://0.0.0.0:${port}`,
        pasv_url: host,
        pasv_min: pasvMin,
        pasv_max: pasvMax,
        greeting: ['FleetBackend'],
        log: createFtpSrvLogger(log),
    });

    ftpServer.on('client', (connection) => {
        log.ftp.info('client connected', { peer: connection.ip });
    });

    ftpServer.on('login', ({ connection, username, password }, resolve, reject) => {
        const peer = connection.ip;
        if (username === userTrim && password === passTrim) {
            log.ftp.info('login ok', { user: username, peer });
            connection.on('STOR', (err, fileName) => {
                if (err) {
                    log.ftp.err('upload failed', { peer, message: err.message });
                    return;
                }
                const relative = String(fileName || '').replace(/\\/g, '/').replace(/^\/+/, '');
                const base = path.basename(relative);
                log.ftp.info('file uploaded', { peer, file: base });
                if (onFileUploaded) {
                    onFileUploaded({
                        fileName: cleanUploadDisplayName(base),
                        fullPath: path.join(rootDir, relative),
                        peer,
                    });
                }
            });
            return resolve({ root: rootDir });
        }
        log.ftp.warn('login rejected', { user: username, peer });
        return reject(new Error('Invalid credentials'));
    });

    ftpServer.on('client-error', ({ connection, context, error }) => {
        log.ftp.err('client error', {
            peer: connection && connection.ip,
            command: context && context.command,
            message: error && error.message,
        });
    });

    ftpServer.listen()
        .then(() => {
            log.ftp.info('listening', { host, port, user: userTrim, root: rootDir, pasvMin, pasvMax });
            if (onListening) onListening();
        })
        .catch((err) => {
            log.ftp.err('listen failed', {
                port,
                message: err.message,
                hint: port === 21
                    ? 'Run node as Administrator, OR set FM_FTP_PORT=2121 in .env and BWC FTP Port=2121'
                    : 'Check firewall and that no other app uses this port',
            });
        });

    return ftpServer;
}

async function stopFtpServer(ftpServer) {
    if (!ftpServer || typeof ftpServer.close !== 'function') return;
    try {
        await ftpServer.close();
    } catch (err) {
        if (ftpServer && typeof ftpServer.close === 'function') {
            try { ftpServer.close(); } catch (_) { /* ignore */ }
        }
        throw err;
    }
}

module.exports = {
    startFtpServer,
    stopFtpServer,
};
