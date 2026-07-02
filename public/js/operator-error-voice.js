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
        'automatic media wipe is not enabled on this server.': 'usbMaint.clearNotConfigured',
        'device connection tool not available — contact your it administrator.': 'usbMaint.adbMissing',
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

    const TECH_LEAK_RE = /fm_|\.env\b|fleet\.log|storage\/|node_modules|restart\s+fleet|errno|eaddrinuse|enotfound/i;

    const FALLBACK_EN = {
        'errors.generic': 'Something went wrong. Try again or contact your IT administrator.',
        'errors.unauthorized': 'Sign in required.',
        'errors.signInFailed': 'Invalid user or password.',
        'errors.orgSignInRequired': 'Local sign-in is disabled. Use your organization account.',
        'errors.accountExpired': 'This account has expired. Contact your administrator.',
        'errors.accountNotActive': 'This account is not active yet. Check your sign-in from date.',
        'errors.incorrectPin': 'Incorrect PIN.',
        'errors.permissionDenied': 'You do not have permission for this action.',
        'errors.geofenceNotPermitted': 'Geofence control is not permitted for your account.',
        'errors.deviceNotFound': 'Device not found.',
        'errors.caseFileNotFound': 'Case file not found.',
        'errors.evidenceFileNotFound': 'Evidence file not found.',
        'errors.deviceIdRequired': 'Device ID is required.',
        'errors.invalidGeofence': 'Geofence data is not valid.',
        'errors.noGeofence': 'No geofence is set for this device.',
        'errors.geofenceClearRequired': 'Provide geofence data or clear the existing geofence.',
        'errors.mapControlRequired': 'Map remote control permission is required.',
        'errors.dockAdminRequired': 'Dock administration permission is required.',
        'errors.evidenceViewRequired': 'Evidence access permission is required.',
        'errors.evidenceDownloadRequired': 'Evidence download permission is required.',
        'errors.auditRequired': 'Audit trail access is required.',
        'errors.auditExportRequired': 'Audit export permission is required.',
        'errors.operationOverlayRequired': 'Operation overlay access is required.',
        'errors.operationOverlayEditRequired': 'Operation overlay edit permission is required.',
        'errors.operationOverlayCloseRequired': 'Operation overlay close permission is required.',
        'errors.pttDisabled': 'Push-to-talk is not enabled on this server.',
        'errors.groupNotFound': 'Group not found.',
        'errors.groupNoDevices': 'This group has no devices with IDs.',
        'errors.pttNeedTwoUnits': 'Select at least two online units for group push-to-talk.',
        'errors.pttSelectUnits': 'Select a map group or at least two online units.',
        'errors.camIdRequired': 'Camera selection is required.',
        'errors.pttUnitBusy': 'This unit is already on the push-to-talk team.',
        'errors.incidentNotFound': 'Incident folder not found.',
        'errors.runbookNotFound': 'Runbook not found.',
        'errors.userNotFound': 'User not found.',
        'errors.userExists': 'That username is already in use. Pick another name or edit the existing row.',
        'errors.passwordConfirmRequired': 'Enter your password to confirm this change.',
        'errors.passwordWrong': 'Wrong password. Try again.',
        'errors.superAdminPasswordRequired': 'Your super admin password is required.',
        'errors.storageNasRequired': 'Shared storage path is required when using network archive.',
        'errors.storageMountNotFound': 'Mount folder not found on this server. Ask IT to connect shared storage first.',
        'errors.usbWindowsOnly': 'USB maintenance requires Windows on the dispatch PC.',
        'evidence.catalogErrorDamaged': 'The evidence index on this server could not be read. Contact your IT administrator.',
        'evidence.catalogErrorBusy': 'The evidence index is in use. Wait a moment and try again.',
        'evidence.catalogErrorNotReady': 'The evidence index is still starting. Refresh in a moment.',
        'evidence.catalogErrorUnavailable': 'The evidence index is not available. Contact your IT administrator.',
        'evidence.catalogErrorGeneric': 'The evidence index could not be accessed. Contact your IT administrator.',
        'login.errorInvalid': 'Invalid sign-in. Try again.',
        'login.errorServer': 'Could not reach server.',
        'login.totpError': 'Authenticator code not accepted. Try again.',
        'mustChangePassword.error': 'Could not update your sign-in. Check the fields and try again.',
        'mustChangePassword.errorServer': 'Could not reach server.',
        'totpEnroll.error': 'Could not complete authenticator setup. Try again.',
        'usbMaint.clearNotConfigured': 'Automatic media wipe is not enabled on this server.',
        'usbMaint.adbMissing': 'Device connection tool not available — contact your IT administrator.',
    };

    function tr(key) {
        if (global.I18n && I18n.t) {
            const s = I18n.t(key);
            if (s && s !== key) return s;
        }
        return FALLBACK_EN[key] || FALLBACK_EN['errors.generic'];
    }

    function looksTechnical(msg) {
        const text = String(msg || '').trim();
        if (!text) return true;
        if (TECH_LEAK_RE.test(text)) return true;
        if (/[a-z]:\\/i.test(text)) return true;
        if (/\/lib\/|\/public\/|\/storage\//i.test(text)) return true;
        return false;
    }

    function keyFromRaw(msg) {
        const text = String(msg || '').trim();
        if (!text || looksTechnical(text)) return 'errors.generic';
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

    function fromPayload(data, fallbackKey) {
        if (data && data.errorKey) return tr(data.errorKey);
        if (data && data.error) return tr(keyFromRaw(data.error));
        return tr(fallbackKey || 'errors.generic');
    }

    function fromCatch(err, data, fallbackKey) {
        if (data) return fromPayload(data, fallbackKey);
        if (err && err.opPayload) return fromPayload(err.opPayload, fallbackKey);
        if (err && err.catalogPayload) return fromPayload(err.catalogPayload, fallbackKey);
        if (err && err.message && err.message !== 'op') return tr(keyFromRaw(err.message));
        return tr(fallbackKey || 'errors.generic');
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
        looksTechnical: looksTechnical,
        FALLBACK_EN: FALLBACK_EN,
    };
}(window));
