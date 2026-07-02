/**
 * Resolve API errors to localized operator text (no engine jargon).
 */
(function (global) {
    const CODE_MAP = {
        unauthorized: 'errors.unauthorized',
        'invalid user or password': 'errors.signInFailed',
        invalid_credentials: 'errors.signInFailed',
        'local sign-in disabled — use organization account': 'errors.orgSignInRequired',
        'account expired — contact your administrator': 'errors.accountExpired',
        'account not active yet — check sign-in from date': 'errors.accountNotActive',
        'incorrect pin': 'errors.incorrectPin',
        geofence_not_permitted: 'errors.geofenceNotPermitted',
        device_not_found: 'errors.deviceNotFound',
        device_id_required: 'errors.deviceIdRequired',
        invalid_geofence: 'errors.invalidGeofence',
        no_geofence: 'errors.noGeofence',
        use_geofence_clear_api: 'errors.geofenceClearRequired',
        geofence_or_clear_required: 'errors.geofenceClearRequired',
        'map remote control permission required': 'errors.mapControlRequired',
        'dock administration permission required': 'errors.dockAdminRequired',
        'evidence view permission required': 'errors.evidenceViewRequired',
        'evidence download permission required': 'errors.evidenceDownloadRequired',
        'audit trail access required': 'errors.auditRequired',
        'audit export permission required': 'errors.auditExportRequired',
        'operation overlay access required': 'errors.operationOverlayRequired',
        'operation overlay edit permission required': 'errors.operationOverlayEditRequired',
        'operation overlay close permission required': 'errors.operationOverlayCloseRequired',
        'ptt not enabled on server': 'errors.pttDisabled',
        'group not found': 'errors.groupNotFound',
        'group has no devices with ids': 'errors.groupNoDevices',
        'need at least 2 units for group ptt': 'errors.pttNeedTwoUnits',
        'select a map group or tick at least 2 online units': 'errors.pttSelectUnits',
        'cameraid required': 'errors.camIdRequired',
        'camid required': 'errors.camIdRequired',
        'helpercamids required': 'errors.camIdRequired',
        'unit already on ptt team': 'errors.pttUnitBusy',
        'case file not found': 'errors.caseFileNotFound',
        'evidence file not found': 'errors.evidenceFileNotFound',
        'sos incident id required': 'errors.incidentNotFound',
        'incident folder not found': 'errors.incidentNotFound',
        'runbook not found': 'errors.runbookNotFound',
        'user not found': 'errors.userNotFound',
        'username already exists': 'errors.userExists',
        'enter your password to add this account.': 'errors.passwordConfirmRequired',
        'enter your password to confirm this change.': 'errors.passwordConfirmRequired',
        'wrong password': 'errors.passwordWrong',
        'wrong password.': 'errors.passwordWrong',
        'your super admin password is required': 'errors.superAdminPasswordRequired',
        'database not ready': 'evidence.catalogErrorNotReady',
        'database file missing': 'evidence.catalogErrorUnavailable',
        'ip san / nas mount path is required when using network archive.': 'errors.storageNasRequired',
        'mount folder not found on this server. connect iscsi/nfs/smb and assign a drive letter or mount point first.': 'errors.storageMountNotFound',
        'usb maintenance requires windows on the dispatch pc': 'errors.usbWindowsOnly',
    };

    const PATTERNS = [
        { re: /disk image is malformed|database disk image|database is corrupt|malformed/i, key: 'evidence.catalogErrorDamaged' },
        { re: /catalog/i, key: 'evidence.catalogErrorGeneric' },
        { re: /sqlite|sql\b/i, key: 'evidence.catalogErrorGeneric' },
        { re: /locked|busy/i, key: 'evidence.catalogErrorBusy' },
        { re: /not ready/i, key: 'evidence.catalogErrorNotReady' },
        { re: /file missing|unable to open|cannot open|no such file/i, key: 'evidence.catalogErrorUnavailable' },
        { re: /geofence/i, key: 'errors.geofenceNotPermitted' },
        { re: /password/i, key: 'errors.passwordConfirmRequired' },
        { re: /permission required|not permitted|forbidden/i, key: 'errors.permissionDenied' },
        { re: /unauthorized|invalid credentials|invalid user/i, key: 'errors.signInFailed' },
        { re: /device.*not found|device_not_found/i, key: 'errors.deviceNotFound' },
        { re: /camer?id|camid/i, key: 'errors.camIdRequired' },
        { re: /ptt/i, key: 'errors.pttDisabled' },
    ];

    function tr(key) {
        if (global.I18n && I18n.t) return I18n.t(key);
        return key;
    }

    function keyFromRaw(msg) {
        const text = String(msg || '').trim();
        if (!text) return 'errors.generic';
        if (CODE_MAP[text]) return CODE_MAP[text];
        const lower = text.toLowerCase();
        if (CODE_MAP[lower]) return CODE_MAP[lower];
        const snake = lower.replace(/\s+/g, '_');
        if (CODE_MAP[snake]) return CODE_MAP[snake];
        for (let i = 0; i < PATTERNS.length; i += 1) {
            if (PATTERNS[i].re.test(text)) return PATTERNS[i].key;
        }
        return 'errors.generic';
    }

    function fromPayload(data) {
        if (data && data.errorKey) return tr(data.errorKey);
        if (data && data.error) return tr(keyFromRaw(data.error));
        return tr('errors.generic');
    }

    function fromCatch(err, data) {
        if (data) return fromPayload(data);
        if (err && err.opPayload) return fromPayload(err.opPayload);
        if (err && err.catalogPayload) return fromPayload(err.catalogPayload);
        if (err && err.message && err.message !== 'op') return tr(keyFromRaw(err.message));
        return tr('errors.generic');
    }

    function attach(err, data) {
        if (err && data) {
            err.opPayload = data;
            err.catalogPayload = data;
        }
        return err;
    }

    global.OperatorErrorVoice = {
        fromPayload: fromPayload,
        fromCatch: fromCatch,
        attach: attach,
        keyFromRaw: keyFromRaw,
    };
}(window));
