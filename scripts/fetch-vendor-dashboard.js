'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');

const root = path.join(__dirname, '..', 'public', 'vendor');
const files = [
    ['https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', 'leaflet/leaflet.css'],
    ['https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', 'leaflet/leaflet.js'],
    ['https://unpkg.com/leaflet@1.9.4/dist/images/layers.png', 'leaflet/images/layers.png'],
    ['https://unpkg.com/leaflet@1.9.4/dist/images/layers-2x.png', 'leaflet/images/layers-2x.png'],
    ['https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png', 'leaflet/images/marker-icon.png'],
    ['https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png', 'leaflet/images/marker-icon-2x.png'],
    ['https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png', 'leaflet/images/marker-shadow.png'],
    ['https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css', 'markercluster/MarkerCluster.css'],
    ['https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css', 'markercluster/MarkerCluster.Default.css'],
    ['https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js', 'markercluster/leaflet.markercluster.js'],
    ['https://cdn.jsdelivr.net/npm/livekit-client@2.9.9/dist/livekit-client.umd.min.js', 'livekit-client.umd.min.js'],
];

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'ME8-vendor-fetch/1.0' } }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                fetchUrl(res.headers.location).then(resolve, reject);
                return;
            }
            if (res.statusCode !== 200) {
                reject(new Error(url + ' HTTP ' + res.statusCode));
                return;
            }
            const chunks = [];
            res.on('data', (c) => chunks.push(c));
            res.on('end', () => resolve(Buffer.concat(chunks)));
            res.on('error', reject);
        }).on('error', reject);
    });
}

(async () => {
    for (const [url, rel] of files) {
        const dest = path.join(root, rel);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        const buf = await fetchUrl(url);
        fs.writeFileSync(dest, buf);
        console.log('OK', rel, '(' + buf.length + ' bytes)');
    }
    console.log('vendor dashboard fetch complete');
})().catch((err) => {
    console.error('FAIL:', err.message);
    process.exit(1);
});
