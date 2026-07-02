/**
 * Ubitron docking station adapter — stub until manufacturer SDK / Open API is wired.
 * Overview and dock panels read telemetry through this module only.
 */
const PRODUCT = Object.freeze({
    UB_DDS10: 'UB-DDS10',
    UB_WMDS: 'UB-WMDS',
});

function normalizeProductCode(raw) {
    const s = String(raw || '').trim().toUpperCase();
    if (s === 'UB-DDS10' || s === 'DDS10' || s === 'DESK') return PRODUCT.UB_DDS10;
    if (s === 'UB-WMDS' || s === 'WMDS' || s === 'WALL') return PRODUCT.UB_WMDS;
    return '';
}

function modelFromProduct(productCode) {
    if (productCode === PRODUCT.UB_DDS10) return 'desk';
    if (productCode === PRODUCT.UB_WMDS) return 'wall';
    return 'generic';
}

function resolveLinkState(dock) {
    if (!dock) return 'pending';
    if (dock.sdkConnected) return 'online';
    const stored = String(dock.linkState || '').toLowerCase();
    if (stored === 'online' || stored === 'offline' || stored === 'pending') return stored;
    if (String(dock.status || '').toLowerCase() === 'online') return 'online';
    return 'pending';
}

/** Live telemetry for one registered dock site. */
function getDockTelemetry(dock, layout) {
    const bays = (layout && layout.bays) ? layout.bays : [];
    let baysUploading = 0;
    let baysOccupied = 0;
    bays.forEach(function (b) {
        if (b.state && b.state !== 'empty') baysOccupied += 1;
        if (b.state === 'uploading') baysUploading += 1;
    });
    const productCode = normalizeProductCode(dock.productCode) || dock.productCode || '';
    return {
        productCode: productCode,
        model: dock.model || modelFromProduct(productCode),
        linkState: resolveLinkState(dock),
        siteOnline: resolveLinkState(dock) === 'online',
        sdkConnected: !!dock.sdkConnected,
        baysUploading: baysUploading,
        baysOccupied: baysOccupied,
        lastAuthOfficer: dock.lastAuthOfficer || null,
        lastAuthAt: dock.lastAuthAt || null,
        firmwareVersion: dock.firmwareVersion || null,
        source: dock.sdkConnected ? 'sdk' : 'manual',
    };
}

module.exports = {
    PRODUCT: PRODUCT,
    normalizeProductCode: normalizeProductCode,
    modelFromProduct: modelFromProduct,
    resolveLinkState: resolveLinkState,
    getDockTelemetry: getDockTelemetry,
};
