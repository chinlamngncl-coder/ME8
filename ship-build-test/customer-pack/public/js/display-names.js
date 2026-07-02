/**
 * Friendly labels for BWCs — nickname + unit code for ops; wire deviceId stays internal.
 */
(function (global) {
    function tr(key, params) {
        if (typeof I18n !== 'undefined' && I18n.t) return I18n.t(key, params);
        return key;
    }

    function getDeviceRecord(camId) {
        if (!camId || !global.BwcDevices || !BwcDevices.findByDeviceId) return null;
        return BwcDevices.findByDeviceId(camId);
    }

    function getUnitCode(camId) {
        const rec = getDeviceRecord(camId);
        return rec && rec.unitCode ? String(rec.unitCode).trim() : '';
    }

    function hasConfiguredName(camId) {
        const rec = getDeviceRecord(camId);
        if (rec && (rec.operatorName || rec.unitCode)) return true;
        if (global.FleetUi && FleetUi.getDeviceName) {
            var n = FleetUi.getDeviceName(camId);
            if (n && n !== camId && n.indexOf('BWC …') !== 0 && n.indexOf('BWC #') !== 0 && n.indexOf('Unnamed') !== 0) {
                return true;
            }
        }
        return false;
    }

    function friendlyDeviceName(camId) {
        if (!camId) return tr('fleet.bwc');
        const rec = getDeviceRecord(camId);
        const nick = rec && rec.operatorName ? String(rec.operatorName).trim() : '';
        if (nick) return nick;
        const unit = rec && rec.unitCode ? String(rec.unitCode).trim() : '';
        if (unit) return unit;
        if (global.FleetUi && FleetUi.getDeviceName) {
            var fleet = FleetUi.getDeviceName(camId);
            if (fleet && fleet !== camId) return fleet;
        }
        if (camId.length > 8) return tr('fleet.bwcShort', { suffix: camId.slice(-4) });
        return tr('fleet.bwcWithId', { id: camId });
    }

    /** Unit / badge line under nickname in fleet list — never the long wire ID. */
    function operationalSubLabel(camId) {
        const rec = getDeviceRecord(camId);
        const nick = rec && rec.operatorName ? String(rec.operatorName).trim() : '';
        const unit = rec && rec.unitCode ? String(rec.unitCode).trim() : '';
        if (nick && unit) return unit;
        return '';
    }

    function mapPinLabel(camId) {
        return friendlyDeviceName(camId);
    }

    function searchTokens(camId, fleetName, mapGroup) {
        const rec = getDeviceRecord(camId);
        const parts = [];
        if (fleetName) parts.push(String(fleetName));
        if (rec && rec.operatorName) parts.push(rec.operatorName);
        if (rec && rec.unitCode) parts.push(rec.unitCode);
        if (mapGroup) parts.push(String(mapGroup));
        const id = String(camId || '').trim();
        if (id.length > 4) parts.push(id.slice(-4));
        return parts.join(' ').toLowerCase();
    }

    /** Short technical hint — admin / install only; hidden from operator sub-labels. */
    function shortTechnicalId(camId) {
        if (!camId || camId.length <= 10) return camId || '';
        return camId.slice(0, 4) + '…' + camId.slice(-4);
    }

    function setCamLabel(el, camId) {
        if (!el) return;
        el.setAttribute('data-cam-id', camId || '');
        el.textContent = friendlyDeviceName(camId);
    }

    function camIdFromElement(el) {
        if (!el) return '';
        return String(el.getAttribute('data-cam-id') || '').trim();
    }

    global.FleetDisplay = {
        friendlyDeviceName,
        mapPinLabel,
        operationalSubLabel,
        getUnitCode,
        searchTokens,
        shortTechnicalId,
        hasConfiguredName,
        setCamLabel,
        camIdFromElement,
    };
})(window);
