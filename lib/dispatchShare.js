'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const TTL_MS = 24 * 60 * 60 * 1000;

function shareRoot(storageDir) {
    return path.join(storageDir, 'dispatch-shares');
}

function tokenDir(storageDir, token) {
    const safe = String(token || '').replace(/[^a-f0-9]/gi, '');
    if (!safe || safe.length < 8) return null;
    const root = shareRoot(storageDir);
    const dir = path.join(root, safe);
    if (!dir.startsWith(root + path.sep)) return null;
    return dir;
}

function purgeExpired(storageDir, log) {
    const root = shareRoot(storageDir);
    if (!fs.existsSync(root)) return;
    const now = Date.now();
    try {
        fs.readdirSync(root).forEach((name) => {
            const metaPath = path.join(root, name, 'meta.json');
            try {
                if (!fs.existsSync(metaPath)) return;
                const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
                if (meta.expiresAt && meta.expiresAt < now) {
                    fs.rmSync(path.join(root, name), { recursive: true, force: true });
                }
            } catch (e) {
                if (log) log.web.warn('dispatch share purge skip', { name, err: e.message });
            }
        });
    } catch (e) {
        if (log) log.web.warn('dispatch share purge failed', { err: e.message });
    }
}

function createShare(storageDir, opts, log) {
    purgeExpired(storageDir, log);
    const token = crypto.randomBytes(8).toString('hex');
    const dir = tokenDir(storageDir, token);
    if (!dir) throw new Error('share token failed');
    fs.mkdirSync(dir, { recursive: true });

    const pngB64 = opts.mapPngBase64 || opts.mapJpegBase64 || opts.imageBase64;
    if (!pngB64) throw new Error('map image required');
    const imgBuf = Buffer.from(String(pngB64).replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const isJpeg = opts.mapJpegBase64 || (opts.mimeType === 'image/jpeg');
    const imgName = isJpeg ? 'map.jpg' : 'map.png';
    fs.writeFileSync(path.join(dir, imgName), imgBuf);

    const expiresAt = Date.now() + TTL_MS;
    const meta = {
        token,
        createdAt: Date.now(),
        expiresAt,
        alarmCamId: opts.alarmCamId || '',
        lat: opts.lat,
        lon: opts.lon,
        radiusM: opts.radiusM,
        team: Array.isArray(opts.team) ? opts.team : [],
        dispatchText: String(opts.dispatchText || '').slice(0, 4000),
        imageName: imgName,
    };
    fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2));
    return { token, expiresAt, imageName: imgName };
}

function loadShare(storageDir, token) {
    const dir = tokenDir(storageDir, token);
    if (!dir || !fs.existsSync(dir)) return null;
    const metaPath = path.join(dir, 'meta.json');
    if (!fs.existsSync(metaPath)) return null;
    let meta;
    try {
        meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    } catch (e) {
        return null;
    }
    if (meta.expiresAt && meta.expiresAt < Date.now()) {
        try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
        return null;
    }
    const imgPath = path.join(dir, meta.imageName || 'map.png');
    if (!fs.existsSync(imgPath)) return null;
    return { meta, imgPath, dir };
}

function publicShareUrl(req, token, publicBaseOverride) {
    if (publicBaseOverride) {
        return `${String(publicBaseOverride).replace(/\/$/, '')}/d/${token}`;
    }
    const host = req.get('host') || 'localhost';
    const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
    return `${proto}://${host}/d/${token}`;
}

function mapsNavigateUrl(lat, lon) {
    if (lat == null || lon == null || Number.isNaN(Number(lat)) || Number.isNaN(Number(lon))) {
        return '';
    }
    return `https://maps.google.com/?q=${Number(lat)},${Number(lon)}`;
}

function appendShareToDispatchText(text, shareUrl, lat, lon) {
    const lines = [String(text || '').trim()];
    const nav = mapsNavigateUrl(lat, lon);
    if (shareUrl) lines.push('', `Mobile map (full screen): ${shareUrl}`);
    if (nav) lines.push(`Navigate: ${nav}`);
    return lines.filter(Boolean).join('\n');
}

function buildRadioExport(opts) {
    const {
        alarmCamId,
        lat,
        lon,
        radiusM,
        unitNames,
        shareUrl,
    } = opts;
    const nav = mapsNavigateUrl(lat, lon);
    const mapRef = shareUrl || nav || '';
    const alm = String(alarmCamId || '').slice(-6) || '—';
    const pos = (lat != null && lon != null)
        ? `${Number(lat).toFixed(5)},${Number(lon).toFixed(5)}`
        : '—';
    const units = (unitNames && unitNames.length) ? unitNames.join('+') : '—';
    return [
        'SOS ASSIST',
        `ALM:${alm}`,
        `POS:${pos}`,
        `RAD:${radiusM || '—'}m`,
        `UNT:${units}`,
        mapRef ? `MAP:${mapRef}` : '',
    ].filter(Boolean).join(' | ');
}

function renderMobilePage(share, shareUrl) {
    const meta = share.meta;
    const nav = mapsNavigateUrl(meta.lat, meta.lon);
    const imgUrl = `/d/${meta.token}/${meta.imageName || 'map.png'}`;
    const esc = (s) => String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    const pre = esc(meta.dispatchText || '').replace(/\n/g, '<br>');
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>SOS dispatch map</title>
<style>
*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,sans-serif;background:#0f172a;color:#e2e8f0;padding:12px}
h1{font-size:17px;margin:0 0 8px;color:#fecaca}
.meta{font-size:12px;color:#94a3b8;margin:0 0 10px;line-height:1.45}
img{width:100%;border-radius:10px;border:1px solid #334155;background:#1e293b;margin:0 0 12px}
.btn{display:block;width:100%;padding:14px;margin:8px 0;border-radius:10px;border:none;font-size:15px;font-weight:700;cursor:pointer;text-align:center;text-decoration:none}
.btn-nav{background:#2563eb;color:#fff}
.btn-nav:active{background:#1d4ed8}
.note{font-size:11px;color:#64748b;margin-top:14px;line-height:1.4}
.dispatch{font-size:12px;line-height:1.5;background:#1e293b;border:1px solid #334155;border-radius:8px;padding:10px;margin-top:10px;word-break:break-word}
</style>
</head>
<body>
<h1>SOS dispatch assist</h1>
<p class="meta">Alarm ${esc(String(meta.alarmCamId || '').slice(-8))} · ${esc(meta.radiusM)} m radius<br>Open on your phone for full map detail.</p>
<img src="${esc(imgUrl)}" alt="Dispatch map">
${nav ? `<a class="btn btn-nav" href="${esc(nav)}" rel="noopener">Open in Maps</a>` : ''}
${pre ? `<div class="dispatch">${pre}</div>` : ''}
<p class="note">LAN link · expires ${new Date(meta.expiresAt).toLocaleString()}<br>${esc(shareUrl)}</p>
</body>
</html>`;
}

function registerDispatchShareRoutes(app, storageDir, log) {
    app.get('/d/:token', (req, res) => {
        const share = loadShare(storageDir, req.params.token);
        if (!share) return res.status(404).send('Dispatch link expired or not found.');
        const shareUrl = publicShareUrl(req, share.meta.token);
        res.setHeader('Cache-Control', 'no-store');
        res.type('html').send(renderMobilePage(share, shareUrl));
    });

    app.get('/d/:token/:file', (req, res) => {
        const share = loadShare(storageDir, req.params.token);
        if (!share) return res.status(404).end();
        const want = String(req.params.file || '');
        const allowed = share.meta.imageName || 'map.png';
        if (want !== allowed && want !== 'map.png' && want !== 'map.jpg') return res.status(404).end();
        res.setHeader('Cache-Control', 'private, max-age=3600');
        if (allowed.endsWith('.jpg') || want.endsWith('.jpg')) {
            res.type('image/jpeg');
        } else {
            res.type('image/png');
        }
        fs.createReadStream(share.imgPath).pipe(res);
    });
}

module.exports = {
    createShare,
    loadShare,
    publicShareUrl,
    mapsNavigateUrl,
    appendShareToDispatchText,
    buildRadioExport,
    registerDispatchShareRoutes,
    purgeExpired,
};
