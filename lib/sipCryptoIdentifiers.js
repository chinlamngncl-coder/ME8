'use strict';

const crypto = require('crypto');

function createSipCallId(prefix) {
    const id = crypto.randomUUID();
    const safePrefix = String(prefix || '').trim();
    return safePrefix ? (safePrefix + id) : id;
}

/* SOS-INVITE-GUARDS-V1 — 64-bit random tag (was 0..9999: collisions across concurrent dialogs). */
function createSipTag() {
    return crypto.randomBytes(8).toString('hex');
}

function createGbSequenceNumber() {
    return String(crypto.randomInt(0, 100000));
}

module.exports = {
    createSipCallId,
    createSipTag,
    createGbSequenceNumber,
};
