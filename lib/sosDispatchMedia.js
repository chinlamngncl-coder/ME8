'use strict';

const hdaMsg = require('./hdaMessageProtocol');

/**
 * Push map image via HDA PICTURE on the active BWC message WebSocket.
 * Recipients are listed in toPersons — firmware may route to team units.
 * Returns false when no message socket is connected.
 */
function pushPictureViaHda(msgSocket, opts) {
    const {
        pngOrJpegBuffer,
        toPersons = [],
        name = 'dispatch-map.jpg',
        log,
    } = opts;
    if (!msgSocket || msgSocket.readyState !== 1 || !pngOrJpegBuffer || !pngOrJpegBuffer.length) {
        return { ok: false, reason: 'no_msg_socket' };
    }
    const persons = toPersons.map(String).filter(Boolean);
    if (!persons.length) return { ok: false, reason: 'no_recipients' };

    const chunks = hdaMsg.buildOutboundChunks({
        payload: pngOrJpegBuffer,
        toPersons: persons,
        type: hdaMsg.MSG_TYPE.PICTURE,
        name: String(name).slice(0, 99),
    });

    if (!msgSocket._outMsgQueue) {
        msgSocket._outMsgQueue = new hdaMsg.OutboundMessageQueue(msgSocket, log);
    }
    msgSocket._outMsgQueue.reset();
    msgSocket._outMsgQueue.enqueue(chunks);

    if (log) {
        log.messaging.info('dispatch picture queued', {
            packets: chunks.length,
            bytes: pngOrJpegBuffer.length,
            to: persons,
        });
    }
    return { ok: true, packets: chunks.length, to: persons };
}

module.exports = {
    pushPictureViaHda,
};
