/**
 * Operation map overlay — business logic (Phase A API).
 * Does not modify SOS, live video, PTT, or BWC pin engines.
 */
const operationStore = require('./operationStore');
const dashboardAuth = require('./dashboardAuth');

let getDispatchGroupColor = null;

async function init(opts) {
    await operationStore.init(opts && opts.storageDir);
    if (opts && typeof opts.getDispatchGroupColor === 'function') {
        getDispatchGroupColor = opts.getDispatchGroupColor;
    }
}

function actorName(session) {
    return (session && session.username) || 'system';
}

function perms(session) {
    return dashboardAuth.getPermissionsForSession(session);
}

function isSuper(session) {
    return session && session.role === 'super_admin';
}

function canView(session) {
    if (!session) return false;
    if (isSuper(session)) return true;
    const p = perms(session);
    return !!(p.overlayView || p.overlayEdit || p.overlayCloseOp);
}

function canEdit(session) {
    if (!session) return false;
    if (isSuper(session)) return true;
    return !!perms(session).overlayEdit;
}

function canClose(session) {
    if (!session) return false;
    if (isSuper(session)) return true;
    return !!perms(session).overlayCloseOp;
}

function resolveGroupColor(groupId) {
    if (!groupId || !getDispatchGroupColor) return null;
    return getDispatchGroupColor(groupId) || null;
}

function metaForUser(session) {
    const p = perms(session);
    return {
        ok: true,
        pinTypes: operationStore.PIN_TYPES_V1,
        maxPinsPerOperation: operationStore.MAX_PINS_PER_OPERATION,
        permissions: {
            view: canView(session),
            edit: canEdit(session),
            close: canClose(session),
            camera: !!(isSuper(session) || p.overlayCamera),
        },
    };
}

function filterOperationsForViewer(session, operations) {
    if (canEdit(session)) return operations;
    return operations.filter((op) => op.status === 'active');
}

function assertView(session) {
    if (!canView(session)) throw new Error('Operation overlay view permission required');
}

function assertEdit(session) {
    if (!canEdit(session)) throw new Error('Operation overlay edit permission required');
}

function assertClose(session) {
    if (!canClose(session)) throw new Error('Operation overlay close permission required');
}

function parseLatLon(body) {
    const lat = parseFloat(body && body.lat);
    const lon = parseFloat(body && body.lon);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
        throw new Error('Valid lat (-90..90) required');
    }
    if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
        throw new Error('Valid lon (-180..180) required');
    }
    return { lat, lon };
}

function normalizePinType(type) {
    const t = String(type || 'note').trim().toLowerCase();
    if (t === 'camera') {
        throw new Error('Camera overlay pins are not available until Phase C');
    }
    if (operationStore.PIN_TYPES_V1.indexOf(t) < 0) {
        throw new Error('Invalid pin type. Allowed: ' + operationStore.PIN_TYPES_V1.join(', '));
    }
    return t;
}

async function getOperationOrThrow(id) {
    const op = await operationStore.getOperation(id);
    if (!op) throw new Error('Operation not found');
    return op;
}

function assertOperationEditable(op) {
    if (op.status !== 'active' && op.status !== 'draft') {
        throw new Error('Operation is not editable (status: ' + op.status + ')');
    }
}

async function listOperations(session, query) {
    assertView(session);
    const status = query && query.status ? String(query.status).trim() : '';
    const all = await operationStore.listOperations(status ? { status } : {});
    return {
        ok: true,
        operations: filterOperationsForViewer(session, all),
    };
}

async function getOperation(session, id) {
    assertView(session);
    const op = await getOperationOrThrow(id);
    if (!canEdit(session) && op.status !== 'active') {
        throw new Error('Operation not visible');
    }
    const pins = await operationStore.listPins(id, {
        visibleOnly: !canEdit(session) || op.status === 'closed',
    });
    return { ok: true, operation: op, pins };
}

async function createOperation(session, body) {
    assertEdit(session);
    const title = String((body && body.title) || '').trim();
    if (!title) throw new Error('Title is required');
    const now = new Date().toISOString();
    const op = await operationStore.insertOperation({
        id: operationStore.newId('op'),
        title,
        status: 'draft',
        dispatchGroupId: body && body.dispatchGroupId ? String(body.dispatchGroupId).trim() : null,
        notes: body && body.notes ? String(body.notes).trim() : '',
        createdAt: now,
        updatedAt: now,
        createdBy: actorName(session),
    });
    return { ok: true, operation: op };
}

async function updateOperation(session, id, body) {
    assertEdit(session);
    const op = await getOperationOrThrow(id);
    if (op.status === 'closed' || op.status === 'archived') {
        throw new Error('Closed operation cannot be edited');
    }
    const patch = {};
    if (body && body.title != null) {
        const title = String(body.title).trim();
        if (!title) throw new Error('Title cannot be empty');
        patch.title = title;
    }
    if (body && body.notes != null) patch.notes = String(body.notes).trim();
    if (body && body.dispatchGroupId != null) {
        patch.dispatchGroupId = String(body.dispatchGroupId).trim() || null;
    }
    const updated = await operationStore.updateOperationRow(id, patch);
    return { ok: true, operation: updated };
}

async function activateOperation(session, id) {
    assertEdit(session);
    const op = await getOperationOrThrow(id);
    if (op.status !== 'draft') throw new Error('Only draft operations can be activated');
    const now = new Date().toISOString();
    const updated = await operationStore.updateOperationRow(id, {
        status: 'active',
        activatedAt: now,
        activatedBy: actorName(session),
    });
    return { ok: true, operation: updated };
}

async function closeOperation(session, id) {
    assertClose(session);
    const op = await getOperationOrThrow(id);
    if (op.status !== 'active') throw new Error('Only active operations can be closed');
    const now = new Date().toISOString();
    await operationStore.hideAllPinsForOperation(id);
    const updated = await operationStore.updateOperationRow(id, {
        status: 'closed',
        closedAt: now,
        closedBy: actorName(session),
    });
    return { ok: true, operation: updated };
}

async function listOverlays(session, operationId) {
    assertView(session);
    const op = await getOperationOrThrow(operationId);
    if (!canEdit(session) && op.status !== 'active') {
        throw new Error('Operation not visible');
    }
    const pins = await operationStore.listPins(operationId, {
        visibleOnly: op.status === 'closed' || (!canEdit(session) && op.status === 'active'),
    });
    return { ok: true, operation: op, pins };
}

async function listActiveMapOverlays(session) {
    assertView(session);
    const pins = (await operationStore.listActiveVisiblePins()).map((pin) => {
        const color = pin.color || resolveGroupColor(pin.dispatchGroupId);
        return Object.assign({}, pin, { displayColor: color });
    });
    return { ok: true, pins };
}

async function createOverlay(session, operationId, body) {
    assertEdit(session);
    const op = await getOperationOrThrow(operationId);
    if (op.status !== 'active') {
        throw new Error('Pins can only be added while operation is active');
    }
    if (await operationStore.countPins(operationId) >= operationStore.MAX_PINS_PER_OPERATION) {
        throw new Error('Maximum pins per operation (' + operationStore.MAX_PINS_PER_OPERATION + ') reached');
    }
    const pinType = normalizePinType(body && body.pinType);
    const { lat, lon } = parseLatLon(body);
    const title = String((body && body.title) || '').trim();
    if (!title) throw new Error('Pin title is required');
    const groupId = body && body.dispatchGroupId
        ? String(body.dispatchGroupId).trim()
        : (pinType === 'rally' ? (op.dispatchGroupId || null) : null);
    let color = body && body.color ? String(body.color).trim() : null;
    if (pinType === 'rally' && !color && groupId) {
        color = resolveGroupColor(groupId);
    }
    const now = new Date().toISOString();
    const pin = await operationStore.insertPin({
        id: operationStore.newId('pin'),
        operationId,
        pinType,
        title,
        body: body && body.body ? String(body.body).trim() : '',
        lat,
        lon,
        linkUrl: body && body.linkUrl ? String(body.linkUrl).trim() : null,
        dispatchGroupId: groupId,
        color,
        visible: true,
        createdAt: now,
        updatedAt: now,
        createdBy: actorName(session),
    });
    return { ok: true, pin };
}

async function updateOverlay(session, pinId, body) {
    assertEdit(session);
    const pin = await operationStore.getPin(pinId);
    if (!pin) throw new Error('Overlay pin not found');
    const op = await getOperationOrThrow(pin.operationId);
    if (op.status !== 'active') throw new Error('Pins can only be edited while operation is active');
    const patch = {};
    if (body && body.title != null) {
        const title = String(body.title).trim();
        if (!title) throw new Error('Pin title cannot be empty');
        patch.title = title;
    }
    if (body && body.body != null) patch.body = String(body.body).trim();
    if (body && body.linkUrl != null) patch.linkUrl = String(body.linkUrl).trim() || null;
    if (body && body.pinType != null) patch.pinType = normalizePinType(body.pinType);
    if (body && body.lat != null && body.lon != null) {
        const coords = parseLatLon(body);
        patch.lat = coords.lat;
        patch.lon = coords.lon;
    }
    if (body && body.dispatchGroupId != null) {
        patch.dispatchGroupId = String(body.dispatchGroupId).trim() || null;
    }
    if (body && body.color != null) patch.color = String(body.color).trim() || null;
    if (patch.pinType === 'rally' || pin.pinType === 'rally') {
        const gid = patch.dispatchGroupId != null ? patch.dispatchGroupId : pin.dispatchGroupId;
        if (!patch.color && gid) patch.color = resolveGroupColor(gid);
    }
    const updated = await operationStore.updatePinRow(pinId, patch);
    return { ok: true, pin: updated };
}

async function deleteOverlay(session, pinId) {
    assertEdit(session);
    const pin = await operationStore.getPin(pinId);
    if (!pin) throw new Error('Overlay pin not found');
    const op = await getOperationOrThrow(pin.operationId);
    if (op.status !== 'active' && op.status !== 'draft') {
        throw new Error('Pin cannot be deleted after operation is closed');
    }
    await operationStore.deletePin(pinId);
    return { ok: true, deleted: pinId };
}

module.exports = {
    init,
    canView,
    canEdit,
    canClose,
    metaForUser,
    listOperations,
    getOperation,
    createOperation,
    updateOperation,
    activateOperation,
    closeOperation,
    listOverlays,
    listActiveMapOverlays,
    createOverlay,
    updateOverlay,
    deleteOverlay,
};
