/**
 * Extract G.711 A-law from SIP MPEG-PS and decode to PCM s16le mono 8 kHz.
 * Bypasses ffmpeg mpeg demuxer (broken metadata on many BWCs).
 */

function isAudioStreamId(id) {
    return (id >= 0xC0 && id <= 0xDF) || id === 0xBD;
}

function findStartCode(buf, from) {
    for (let i = from; i + 3 <= buf.length; i++) {
        if (buf[i] === 0 && buf[i + 1] === 0 && buf[i + 2] === 1) return i;
    }
    return -1;
}

function parsePesPacket(buf, pos) {
    if (pos + 6 > buf.length) return null;
    const streamId = buf[pos + 3];
    const pesLen = buf.readUInt16BE(pos + 4);
    let end = pesLen > 0 ? pos + 6 + pesLen : -1;
    if (pesLen > 0 && end > buf.length) return null;
    if (end < 0) {
        end = findStartCode(buf, pos + 6);
        if (end < 0) return null;
    }
    let payloadStart = pos + 6;
    if (payloadStart + 9 <= end && (buf[payloadStart] & 0xC0) === 0x80) {
        const pesHeaderDataLen = buf[payloadStart + 8];
        payloadStart += 9 + pesHeaderDataLen;
    }
    if (payloadStart >= end) {
        return { payload: Buffer.alloc(0), next: end, streamId };
    }
    return { payload: buf.subarray(payloadStart, end), next: end, streamId };
}

function alawToLinear(aVal) {
    let a = aVal ^ 0x55;
    let t = (a & 0x0F) << 4;
    const seg = (a & 0x70) >> 4;
    if (seg === 0) {
        t += 8;
    } else {
        t += 0x108;
        t <<= seg - 1;
    }
    return (a & 0x80) ? t : -t;
}

function alawToPcm16(alawBuf) {
    const pcm = Buffer.alloc(alawBuf.length * 2);
    for (let i = 0; i < alawBuf.length; i++) {
        pcm.writeInt16LE(alawToLinear(alawBuf[i]), i * 2);
    }
    return pcm;
}

function createPsG711Extractor() {
    let buf = Buffer.alloc(0);
    let scanPos = 0;
    const maxBuf = 512 * 1024;

    function reset() {
        buf = Buffer.alloc(0);
        scanPos = 0;
    }

    function feed(chunk) {
        if (!chunk || !chunk.length) return Buffer.alloc(0);
        buf = buf.length ? Buffer.concat([buf, chunk]) : chunk;
        const alawParts = [];
        while (scanPos + 6 <= buf.length) {
            const sc = findStartCode(buf, scanPos);
            if (sc < 0) {
                if (buf.length > 3) {
                    buf = buf.subarray(buf.length - 3);
                    scanPos = 0;
                }
                break;
            }
            scanPos = sc;
            const streamId = buf[scanPos + 3];
            if (!isAudioStreamId(streamId)) {
                scanPos += 4;
                continue;
            }
            const pes = parsePesPacket(buf, scanPos);
            if (!pes) break;
            if (pes.payload.length) alawParts.push(pes.payload);
            scanPos = pes.next;
        }
        if (scanPos > 65536) {
            buf = buf.subarray(scanPos);
            scanPos = 0;
        } else if (buf.length > maxBuf) {
            buf = buf.subarray(buf.length - maxBuf);
            scanPos = 0;
        }
        if (!alawParts.length) return Buffer.alloc(0);
        return alawToPcm16(Buffer.concat(alawParts));
    }

    return { feed, reset };
}

function linearToAlaw(pcm) {
    let sign = 0;
    if (pcm < 0) {
        sign = 0x80;
        pcm = -pcm;
    }
    if (pcm > 32635) pcm = 32635;
    let exp = 7;
    for (let mask = 0x4000; (pcm & mask) === 0 && exp > 0; exp--, mask >>= 1) { /* */ }
    const mantissa = (pcm >> ((exp === 0) ? 4 : (exp + 3))) & 0x0F;
    return (sign | (exp << 4) | mantissa) ^ 0xD5;
}

function pcm16ToAlaw(pcmBuf) {
    const out = Buffer.alloc(pcmBuf.length / 2);
    for (let i = 0; i < out.length; i++) {
        out[i] = linearToAlaw(pcmBuf.readInt16LE(i * 2));
    }
    return out;
}

function amplifyAlaw(alawBuf, gain) {
    if (!alawBuf || !alawBuf.length || gain === 1) return alawBuf;
    const pcm = alawToPcm16(alawBuf);
    for (let i = 0; i < pcm.length; i += 2) {
        let s = pcm.readInt16LE(i);
        s = Math.max(-32768, Math.min(32767, Math.round(s * gain)));
        pcm.writeInt16LE(s, i);
    }
    return pcm16ToAlaw(pcm);
}

module.exports = {
    createPsG711Extractor,
    alawToPcm16,
    pcm16ToAlaw,
    amplifyAlaw,
};
