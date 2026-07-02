/**
 * HDA TCP media framing (PDF pages 10–13). dwFlag: 0xfa,0xfb,0xfc,0xfd
 */

const MEDIA_FLAG = Buffer.from([0xfa, 0xfb, 0xfc, 0xfd]);
const HEADER_SIZE = 16;
const CMD_MEDIA_INFO = 1;
const CMD_OPEN_RET = 2;
const CMD_VIDEO_DATA = 3;
const CMD_AUDIO_DATA = 4;

function readMediaHeader(buf, offset = 0) {
    if (!Buffer.isBuffer(buf) || buf.length < offset + HEADER_SIZE) return null;
    if (!buf.slice(offset, offset + 4).equals(MEDIA_FLAG)) return null;
    const nLength = buf.readUInt32LE(offset + 12);
    if (buf.length < offset + HEADER_SIZE + nLength) return null;
    return {
        dwCMD: buf.readUInt32LE(offset + 4),
        dwIndex: buf.readUInt32LE(offset + 8),
        nLength,
        lpData: buf.subarray(offset + HEADER_SIZE, offset + HEADER_SIZE + nLength),
        frameSize: HEADER_SIZE + nLength,
    };
}

function findMediaFlagIndex(buf) {
    if (buf.length < 4) return -1;
    for (let i = 0; i <= buf.length - 4; i++) {
        if (buf[i] === 0xfa && buf[i + 1] === 0xfb && buf[i + 2] === 0xfc && buf[i + 3] === 0xfd) return i;
    }
    return -1;
}

function buildMediaPacket(dwCMD, dwIndex, lpData) {
    const payload = lpData || Buffer.alloc(0);
    const buf = Buffer.alloc(HEADER_SIZE + payload.length);
    MEDIA_FLAG.copy(buf, 0);
    buf.writeUInt32LE(dwCMD, 4);
    buf.writeUInt32LE(dwIndex, 8);
    buf.writeUInt32LE(payload.length, 12);
    if (payload.length) payload.copy(buf, HEADER_SIZE);
    return buf;
}

function buildOpenRet(nRet = 0) {
    const lpData = Buffer.alloc(4);
    lpData.writeInt32LE(nRet, 0);
    return buildMediaPacket(CMD_OPEN_RET, 0, lpData);
}

function parseMediaInfo(lpData) {
    if (!lpData || lpData.length < 32) return null;
    return {
        video: {
            nFormat: lpData.readInt32LE(0),
            nWidth: lpData.readInt32LE(4),
            nHeight: lpData.readInt32LE(8),
            nFps: lpData.readInt32LE(12),
        },
        audio: {
            nFormat: lpData.readInt32LE(16),
            nBits: lpData.readInt32LE(20),
            nChannel: lpData.readInt32LE(24),
            nSampleRate: lpData.readInt32LE(28),
        },
    };
}

module.exports = {
    MEDIA_FLAG,
    HEADER_SIZE,
    CMD_MEDIA_INFO,
    CMD_OPEN_RET,
    CMD_VIDEO_DATA,
    CMD_AUDIO_DATA,
    readMediaHeader,
    findMediaFlagIndex,
    buildMediaPacket,
    buildOpenRet,
    parseMediaInfo,
};
