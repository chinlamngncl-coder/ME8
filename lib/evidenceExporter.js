/**
 * Secure VMS timeline evidence export — AES-256 password ZIP + audit ledger.
 * No absolute paths returned to the client.
 */
'use strict';

const vmsForensicExport = require('./vmsForensicExport');

async function streamSecureTimelineZip(res, opts) {
    return vmsForensicExport.streamSecureExportZip(res, opts);
}

module.exports = {
    streamSecureTimelineZip,
};
