'use strict';
const fs = require('fs');
const path = require('path');

const required = [
    'leaflet/leaflet.css',
    'leaflet/leaflet.js',
    'leaflet/images/marker-icon.png',
    'markercluster/MarkerCluster.css',
    'markercluster/MarkerCluster.Default.css',
    'markercluster/leaflet.markercluster.js',
    'livekit-client.umd.min.js',
    'jsmpeg.min.js',
];

const root = path.join(__dirname, '..', 'public', 'vendor');
let ok = true;
required.forEach((rel) => {
    const p = path.join(root, rel);
    if (!fs.existsSync(p)) {
        console.error('MISSING', rel);
        ok = false;
    }
});
if (!ok) process.exit(1);
console.log('vendor dashboard verify OK (' + required.length + ' files)');
