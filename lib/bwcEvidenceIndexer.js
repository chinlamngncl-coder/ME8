'use strict';
/**
 * Pile B — BWC FTP evidence indexer (VMS-INVESTIGATION-BWC-SOS-INDEXER-V1)
 * Definitive identity: <FTP_ROOT>/<serial|deviceId>/... → cam_id in vms_recording_segments.
 * Implementation lives in vmsBwcEvidenceIndex (hardened); this module is the stable entry.
 */
module.exports = require('./vmsBwcEvidenceIndex');
