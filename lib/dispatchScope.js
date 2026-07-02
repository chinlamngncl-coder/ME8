/**
 * Dispatch visibility — which BWCs / groups a dashboard user may see.
 * Super admin: always all. Operator: assigned dispatch groups only (or legacy / see-all flag).
 */
const dashboardAuth = require('./dashboardAuth');

function normalizeGroupIds(raw, groups) {
    if (!Array.isArray(raw)) return [];
    const valid = new Set((groups || []).map((g) => g.id));
    return raw.map((id) => String(id || '').trim()).filter((id) => id && valid.has(id));
}

function deviceIdsForGroupIds(groups, groupIds) {
    const out = new Set();
    const idSet = new Set(groupIds || []);
    (groups || []).forEach((g) => {
        if (!idSet.has(g.id)) return;
        (g.members || []).forEach((m) => {
            if (m && m.deviceId) out.add(String(m.deviceId).trim());
        });
    });
    return out;
}

function scopeForUser(user, groups) {
    if (!user) {
        return { seeAll: false, groupIds: [], deviceIds: new Set() };
    }
    if (dashboardAuth.normalizeRole(user.role) === 'super_admin') {
        return { seeAll: true, groupIds: null, deviceIds: null };
    }
    const perms = dashboardAuth.permissionsForUser(user);
    if (perms.seeAllDispatchGroups) {
        return { seeAll: true, groupIds: null, deviceIds: null };
    }
    if (user.assignedGroupIds === undefined || user.assignedGroupIds === null) {
        return { seeAll: true, groupIds: null, deviceIds: null };
    }
    const groupIds = normalizeGroupIds(user.assignedGroupIds, groups);
    return {
        seeAll: false,
        groupIds,
        deviceIds: deviceIdsForGroupIds(groups, groupIds),
    };
}

function userFromSession(session) {
    if (!session || !session.userId) return null;
    return dashboardAuth.findUserById(session.userId);
}

function userCanAccessDevice(user, camId, groups) {
    if (!camId) return false;
    const id = String(camId).trim();
    const scope = scopeForUser(user, groups);
    if (scope.seeAll) return true;
    return scope.deviceIds.has(id);
}

function sessionCanAccessDevice(session, camId, groups) {
    return userCanAccessDevice(userFromSession(session), camId, groups);
}

function filterFleetForUser(fleet, user, groups) {
    const scope = scopeForUser(user, groups);
    if (scope.seeAll) return fleet || [];
    return (fleet || []).filter((d) => d && d.id && scope.deviceIds.has(String(d.id)));
}

function filterFleetForSession(session, fleet, groups) {
    return filterFleetForUser(fleet, userFromSession(session), groups);
}

function filterGroupsForUser(groups, user) {
    const scope = scopeForUser(user, groups);
    if (scope.seeAll) return groups || [];
    const set = new Set(scope.groupIds);
    return (groups || []).filter((g) => g && set.has(g.id));
}

function filterMapDevicesForUser(devices, user, groups) {
    const scope = scopeForUser(user, groups);
    if (scope.seeAll) return devices || [];
    return (devices || []).filter((d) => d && d.cameraId && scope.deviceIds.has(String(d.cameraId)));
}

function publicScopePayload(session, groups) {
    const user = userFromSession(session);
    const scope = scopeForUser(user, groups);
    if (scope.seeAll) {
        return {
            seeAll: true,
            groupIds: null,
            groupNames: (groups || []).map((g) => g.name),
        };
    }
    const names = scope.groupIds.map((gid) => {
        const g = (groups || []).find((x) => x.id === gid);
        return g ? g.name : gid;
    });
    return {
        seeAll: false,
        groupIds: scope.groupIds.slice(),
        groupNames: names,
    };
}

module.exports = {
    scopeForUser,
    userFromSession,
    userCanAccessDevice,
    sessionCanAccessDevice,
    filterFleetForUser,
    filterFleetForSession,
    filterGroupsForUser,
    filterMapDevicesForUser,
    publicScopePayload,
    normalizeGroupIds,
    deviceIdsForGroupIds,
};
