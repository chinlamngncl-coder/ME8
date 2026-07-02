/**
 * RTP payload video format detection — shared by live wall and conference BWC ingress.
 */

function rtpPayloadOffset(rtpBuf) {
    const cc = rtpBuf[0] & 0x0f;
    let off = 12 + cc * 4;
    if ((rtpBuf[0] & 0x10) && off + 4 <= rtpBuf.length) {
        const extLen = rtpBuf.readUInt16BE(off + 2);
        off += 4 + extLen * 4;
    }
    return Math.min(off, rtpBuf.length);
}

function detectRtpVideoFormat(rtpBuf) {
    const payload = rtpBuf.subarray(rtpPayloadOffset(rtpBuf));
    if (payload.length < 4) return 'mpeg';
    let sc = -1;
    if (payload[0] === 0x00 && payload[1] === 0x00 && payload[2] === 0x01) sc = 3;
    else if (payload.length >= 5 && payload[0] === 0x00 && payload[1] === 0x00
        && payload[2] === 0x00 && payload[3] === 0x01) sc = 4;
    if (sc >= 0 && sc < payload.length) {
        const b = payload[sc];
        if (b === 0xba || b === 0xe0 || b === 0xbd || b === 0xbb) return 'mpeg';
        if (b === 0x67 || b === 0x68 || b === 0x65 || b === 0x61 || (b & 0x7f) === 0x67) return 'h264';
    }
    if (payload[0] === 0x47) return 'mpegts';
    for (let j = 188; j + 188 <= payload.length; j += 188) {
        if (payload[j] === 0x47) return 'mpegts';
    }
    return 'mpeg';
}

function ffmpegDemuxFormat(fmt) {
    if (fmt === 'mpegts' || fmt === 'ts') return 'mpegts';
    if (fmt === 'h264') return 'h264';
    return 'mpeg';
}

function rtpPayloadBytes(rtpBuf) {
    return rtpBuf.subarray(rtpPayloadOffset(rtpBuf));
}

/** Conference BWC — match live wall: MPEG-PS stays on mpeg demux only (no mpegts/h264 pipe). */
function buildConferenceFallbackFormats(detected) {
    const fmt = detected || 'mpeg';
    if (fmt === 'mpegts' || fmt === 'ts') return ['mpegts'];
    if (fmt === 'h264') return ['h264'];
    return ['mpeg'];
}

module.exports = {
    rtpPayloadOffset,
    detectRtpVideoFormat,
    ffmpegDemuxFormat,
    rtpPayloadBytes,
    buildConferenceFallbackFormats,
};
