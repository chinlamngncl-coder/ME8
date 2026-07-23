'use strict';

const crypto = require('crypto');

function createSipCallId(prefix) {
    const id = crypto.randomUUID();
    const safePrefix = String(prefix || '').trim();
    return safePrefix ? (safePrefix + id) : id;
}

function createSipTag() {
    return String(crypto.randomInt(0, 10000));
}

function createGbSequenceNumber() {
    return String(crypto.randomInt(0, 100000));
}

module.exports = {
    createSipCallId,
    createSipTag,
    createGbSequenceNumber,
};
