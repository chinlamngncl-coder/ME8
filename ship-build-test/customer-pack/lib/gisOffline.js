'use strict';



const fs = require('fs');

const path = require('path');



const GIS_OFFLINE_ROOT = path.resolve(__dirname, '..', 'data', 'gis', 'offline');

const GIS_COUNTRY_PRESETS_FILE = path.join(GIS_OFFLINE_ROOT, 'country-presets.json');



function safeJoin(baseAbs, relPath) {

    if (!baseAbs || !relPath) return null;

    const base = path.resolve(baseAbs);

    const target = path.resolve(base, relPath);

    if (!target.startsWith(base + path.sep) && target !== base) return null;

    return target;

}



function listPmtilesFiles() {

    const out = [];

    try {

        if (!fs.existsSync(GIS_OFFLINE_ROOT)) return out;

        fs.readdirSync(GIS_OFFLINE_ROOT).forEach((name) => {

            if (name.toLowerCase().endsWith('.pmtiles')) out.push(name);

        });

        const pmtilesDir = path.join(GIS_OFFLINE_ROOT, 'pmtiles');

        if (fs.existsSync(pmtilesDir)) {

            fs.readdirSync(pmtilesDir).forEach((name) => {

                if (name.toLowerCase().endsWith('.pmtiles')) out.push(path.join('pmtiles', name));

            });

        }

    } catch (e) { /* ignore */ }

    return out.slice(0, 20);

}



function resolvePmtilesFile(preferred) {

    const files = listPmtilesFiles();

    if (!files.length) return null;

    if (preferred) {

        const want = String(preferred).replace(/[^a-zA-Z0-9._/-]/g, '');

        const hit = files.find((f) => f === want || path.basename(f) === want);

        if (hit) return hit;

    }

    return files[0];

}



function getOfflineCountryPresets(layerFiles) {

    try {

        if (!fs.existsSync(GIS_COUNTRY_PRESETS_FILE)) return {};

        const raw = JSON.parse(fs.readFileSync(GIS_COUNTRY_PRESETS_FILE, 'utf8'));

        if (!raw || typeof raw !== 'object') return {};

        const out = {};

        Object.keys(raw).forEach((code) => {

            const p = raw[code];

            if (!p || !Array.isArray(p.pos)) return;

            const layer = p.offlineLayer || '';

            if (layer && layerFiles && layerFiles.indexOf(layer) < 0) return;

            out[code] = {

                name: p.name || code,

                pos: p.pos,

                zoom: p.zoom != null ? p.zoom : 6,

                offlineLayer: layer,

            };

        });

        return out;

    } catch (e) {

        return {};

    }

}



function publicBaseFromReq(req) {

    const host = req.get('host') || 'localhost';

    const proto = req.get('x-forwarded-proto') || req.protocol || 'http';

    return `${proto}://${host}`;

}



function servePmtilesWithRange(req, res, absPath) {

    const stat = fs.statSync(absPath);

    const total = stat.size;

    res.setHeader('Accept-Ranges', 'bytes');

    res.setHeader('Content-Type', 'application/octet-stream');

    res.setHeader('Cache-Control', 'public, max-age=3600');

    const range = req.headers.range;

    if (range) {

        const m = /bytes=(\d+)-(\d*)/.exec(range);

        if (!m) {

            res.status(416).setHeader('Content-Range', `bytes */${total}`);

            return res.end();

        }

        const start = parseInt(m[1], 10);

        const end = m[2] ? parseInt(m[2], 10) : total - 1;

        if (Number.isNaN(start) || Number.isNaN(end) || start >= total || end >= total || start > end) {

            res.status(416).setHeader('Content-Range', `bytes */${total}`);

            return res.end();

        }

        res.status(206);

        res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);

        res.setHeader('Content-Length', String(end - start + 1));

        fs.createReadStream(absPath, { start, end }).pipe(res);

        return;

    }

    res.setHeader('Content-Length', String(total));

    fs.createReadStream(absPath).pipe(res);

}



function buildOfflineVectorStyle(base, pmtilesFile, tilesExists) {

    const pmtilesUrl = `pmtiles://${base}/api/gis/offline/pmtiles/${encodeURIComponent(pmtilesFile).replace(/%2F/g, '/')}`;

    const sources = {

        'fm-pmtiles': {

            type: 'vector',

            url: pmtilesUrl,

            attribution: 'OpenStreetMap · Protomaps (offline PMTiles)',

        },

    };

    const layers = [

        { id: 'bg-solid', type: 'background', paint: { 'background-color': '#0f172a' } },

    ];

    if (tilesExists) {

        sources['fm-offline-raster'] = {

            type: 'raster',

            tiles: [`${base}/api/gis/offline/tiles/{z}/{x}/{y}.png`],

            tileSize: 256,

            minzoom: 0,

            maxzoom: 20,

        };

        layers.push({

            id: 'bg-raster',

            type: 'raster',

            source: 'fm-offline-raster',

            paint: { 'raster-opacity': 0.92 },

        });

    }

    layers.push(

        {

            id: 'fm-3d-buildings',

            type: 'fill-extrusion',

            source: 'fm-pmtiles',

            'source-layer': 'buildings',

            minzoom: 11,

            paint: {

                'fill-extrusion-color': [

                    'interpolate', ['linear'],

                    ['coalesce', ['get', 'render_height'], ['get', 'height'], 0],

                    0, '#1e293b', 20, '#334155', 80, '#475569', 200, '#64748b',

                ],

                'fill-extrusion-height': [

                    'interpolate', ['linear'], ['zoom'],

                    11, 0, 14, ['coalesce', ['get', 'render_height'], ['get', 'height'], 12],

                ],

                'fill-extrusion-base': [

                    'coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0,

                ],

                'fill-extrusion-opacity': 0.84,

            },

        },

        {

            id: 'fm-3d-building-outline',

            type: 'line',

            source: 'fm-pmtiles',

            'source-layer': 'buildings',

            minzoom: 12,

            paint: { 'line-color': 'rgba(148,163,184,0.45)', 'line-width': 0.6 },

        }

    );

    return {

        version: 8,

        name: 'Mobility Axiom Offline (vector 3D)',

        sources,

        layers,

    };

}



function registerGisOfflineRoutes(app) {

    app.get('/api/gis/offline/config', (req, res) => {

        const tilesRoot = safeJoin(GIS_OFFLINE_ROOT, path.join('tiles'));

        const layersRoot = safeJoin(GIS_OFFLINE_ROOT, path.join('layers'));

        const tilesExists = !!(tilesRoot && fs.existsSync(tilesRoot));

        const pmtilesFiles = listPmtilesFiles();

        const pmtilesFile = resolvePmtilesFile(req.query && req.query.pmtiles);

        const vectorPmtilesExists = pmtilesFiles.length > 0;

        let layerFiles = [];

        try {

            if (layersRoot && fs.existsSync(layersRoot)) {

                layerFiles = fs.readdirSync(layersRoot)

                    .filter((n) => n.toLowerCase().endsWith('.geojson'))

                    .slice(0, 200);

            }

        } catch (e) { /* ignore */ }

        const base = publicBaseFromReq(req);

        const vectorStyleUrl = pmtilesFile

            ? `${base}/api/gis/maplibre/style-offline-vector?file=${encodeURIComponent(pmtilesFile)}`

            : null;

        res.json({

            offlineRoot: GIS_OFFLINE_ROOT,

            tilesExists,

            layerFiles,

            pmtilesFiles,

            vectorPmtilesExists,

            vectorPmtilesFile: pmtilesFile,

            vectorPmtilesUrl: pmtilesFile

                ? `${base}/api/gis/offline/pmtiles/${pmtilesFile.split('/').map(encodeURIComponent).join('/')}`

                : null,

            vectorStyleUrl,

            countryPresets: getOfflineCountryPresets(layerFiles),

            tileUrlTemplate: `${base}/api/gis/offline/tiles/{z}/{x}/{y}.png`,

        });

    });



    app.get('/api/gis/maplibre/style-offline', (req, res) => {

        const base = publicBaseFromReq(req);

        const style = {

            version: 8,

            name: 'Mobility Axiom Offline (raster)',

            sources: {

                'fm-offline-raster': {

                    type: 'raster',

                    tiles: [`${base}/api/gis/offline/tiles/{z}/{x}/{y}.png`],

                    tileSize: 256,

                    minzoom: 0,

                    maxzoom: 20,

                    attribution: 'Offline tile pack (local LAN)',

                },

            },

            layers: [

                { id: 'bg-solid', type: 'background', paint: { 'background-color': '#0f172a' } },

                { id: 'bg-raster', type: 'raster', source: 'fm-offline-raster', paint: { 'raster-opacity': 1 } },

            ],

        };

        res.setHeader('Cache-Control', 'public, max-age=60');

        res.json(style);

    });



    app.get('/api/gis/maplibre/style-offline-vector', (req, res) => {

        const base = publicBaseFromReq(req);

        const pmtilesFile = resolvePmtilesFile(req.query && req.query.file);

        if (!pmtilesFile) {

            return res.status(404).json({ error: 'No .pmtiles file in data/gis/offline/' });

        }

        const tilesRoot = safeJoin(GIS_OFFLINE_ROOT, path.join('tiles'));

        const tilesExists = !!(tilesRoot && fs.existsSync(tilesRoot));

        const style = buildOfflineVectorStyle(base, pmtilesFile, tilesExists);

        res.setHeader('Cache-Control', 'public, max-age=60');

        res.json(style);

    });



    app.get('/api/gis/offline/tiles/:z/:x/:y.png', (req, res) => {

        const z = String(req.params.z);

        const x = String(req.params.x);

        const y = String(req.params.y);

        const rel = path.join('tiles', z, x, `${y}.png`);

        const abs = safeJoin(GIS_OFFLINE_ROOT, rel);

        if (!abs || !fs.existsSync(abs)) {

            return res.status(404).end();

        }

        res.setHeader('Content-Type', 'image/png');

        res.setHeader('Cache-Control', 'public, max-age=86400');

        fs.createReadStream(abs).pipe(res);

    });



    app.use('/api/gis/offline/pmtiles', (req, res, next) => {
        if (req.method !== 'GET') return next();
        const rel = decodeURIComponent(String(req.url || '').split('?')[0].replace(/^\//, ''));
        const fileName = rel.replace(/\\/g, '/').replace(/[^a-zA-Z0-9._/-]/g, '');
        if (!fileName.toLowerCase().endsWith('.pmtiles')) {
            return res.status(400).json({ error: 'File must be .pmtiles' });
        }
        const abs = safeJoin(GIS_OFFLINE_ROOT, fileName);
        if (!abs || !fs.existsSync(abs)) {
            return res.status(404).json({ error: 'PMTiles not found' });
        }
        try {
            servePmtilesWithRange(req, res, abs);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });



    app.get('/api/gis/offline/layers/:file', (req, res) => {

        const raw = decodeURIComponent(req.params.file || '');

        const fileName = raw.replace(/[^a-zA-Z0-9._-]/g, '');

        if (!fileName.toLowerCase().endsWith('.geojson')) {

            return res.status(400).json({ error: 'Layer must be .geojson' });

        }

        const abs = safeJoin(GIS_OFFLINE_ROOT, path.join('layers', fileName));

        if (!abs || !fs.existsSync(abs)) {

            return res.status(404).json({ error: 'Layer not found' });

        }

        res.setHeader('Content-Type', 'application/geo+json; charset=utf-8');

        fs.createReadStream(abs).pipe(res);

    });

}



module.exports = {

    GIS_OFFLINE_ROOT,

    registerGisOfflineRoutes,

    getOfflineCountryPresets,

    listPmtilesFiles,

};

