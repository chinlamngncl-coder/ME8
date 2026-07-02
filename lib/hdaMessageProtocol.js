/**
 * HDA message-service binary protocol (PDF pages 14–20).
 * WebSocket flags: 0xfb,0xfc,0xfd,0xfe
 */

const siteTime = require('./siteTime');

const MSG_FLAG = Buffer.from([0xfb, 0xfc, 0xfd, 0xfe]);
const HEADER_SIZE = 16;
const CMD_LOGIN_RET = 2;
const CMD_MSG_DATA = 76;
const CMD_MSG_DATA_ACK = 77;
const MAX_PAYLOAD_CHUNK = 100 * 1024;
const RECV_HEADER_LEN = 152;
const RET_OK = 0;
const RET_BUSY = 24;

const MSG_TYPE = { TXT: 0, PICTURE: 1, AUDIO: 2, VIDEO: 3, APK: 100 };
const MSG_LEVEL = { DEFAULT: 0, FACE: 101, PLATE: 102 };

function findMsgFlagIndex(buf) {
    if (!Buffer.isBuffer(buf) || buf.length < 4) return -1;
    for (let i = 0; i <= buf.length - 4; i++) {
        if (buf[i] === 0xfb && buf[i + 1] === 0xfc && buf[i + 2] === 0xfd && buf[i + 3] === 0xfe) return i;
    }
    return -1;
}

function readHeader(buf) {
    if (!Buffer.isBuffer(buf) || buf.length < HEADER_SIZE) return null;
    if (!buf.slice(0, 4).equals(MSG_FLAG)) return null;
    return {
        dwCMD: buf.readUInt32LE(4),
        dwIndex: buf.readUInt32LE(8),
        nLength: buf.readUInt32LE(12),
        lpData: buf.length > HEADER_SIZE ? buf.subarray(HEADER_SIZE) : Buffer.alloc(0),
    };
}

function buildHeader(dwCMD, dwIndex, lpData) {
    const payload = lpData || Buffer.alloc(0);
    const buf = Buffer.alloc(HEADER_SIZE + payload.length);
    MSG_FLAG.copy(buf, 0);
    buf.writeUInt32LE(dwCMD, 4);
    buf.writeUInt32LE(dwIndex, 8);
    buf.writeUInt32LE(payload.length, 12);
    if (payload.length) payload.copy(buf, HEADER_SIZE);
    return buf;
}

function buildLoginSuccess() {
    const buf = Buffer.alloc(20);
    MSG_FLAG.copy(buf, 0);
    buf.writeUInt32LE(CMD_LOGIN_RET, 4);
    buf.writeUInt32LE(0, 8);
    buf.writeUInt32LE(4, 12);
    buf.writeUInt32LE(0, 16);
    return buf;
}

function buildLoginOverload(ipStr, port) {
    const ipBuf = Buffer.alloc(20);
    Buffer.from(String(ipStr || '').trim(), 'ascii').copy(ipBuf, 0, 0, 19);
    const extra = Buffer.alloc(24);
    ipBuf.copy(extra, 0);
    extra.writeUInt32LE(port >>> 0, 20);
    const buf = Buffer.alloc(20 + 24);
    MSG_FLAG.copy(buf, 0);
    buf.writeUInt32LE(CMD_LOGIN_RET, 4);
    buf.writeUInt32LE(0, 8);
    buf.writeUInt32LE(28, 12);
    buf.writeUInt32LE(3, 16);
    extra.copy(buf, 20);
    return buf;
}

/** Outbound send layout (PDF 16) */
function parseMsgDataSend(lpData) {
    if (!lpData || lpData.length < 132) return null;
    const toNum = lpData.readUInt32LE(0);
    if (toNum > 32) return null;
    let offset = 4 + toNum * 20;
    if (lpData.length < offset + 128) return null;

    const time = lpData.subarray(offset, offset + 20).toString('utf8').replace(/\0/g, '').trim();
    offset += 20;
    const level = lpData.readUInt16LE(offset);
    offset += 2;
    const type = lpData.readUInt16LE(offset);
    offset += 2;
    const name = lpData.subarray(offset, offset + 100).toString('utf8').replace(/\0/g, '').trim();
    offset += 100;
    const totalLen = lpData.readUInt32LE(offset);
    offset += 4;
    const len = lpData.readUInt32LE(offset);
    offset += 4;
    if (lpData.length < offset + len) return null;
    const payload = lpData.subarray(offset, offset + len);

    const toPersons = [];
    for (let i = 0; i < toNum; i++) {
        const start = 4 + i * 20;
        toPersons.push(lpData.subarray(start, start + 20).toString('utf8').replace(/\0/g, '').trim());
    }

    return { format: 'send', toNum, toPersons, time, level, type, name, totalLen, len, payload };
}

/** Inbound receive layout (PDF 18–19) */
function parseMsgDataRecv(lpData) {
    if (!lpData || lpData.length < RECV_HEADER_LEN) return null;
    const from = lpData.subarray(0, 20).toString('utf8').replace(/\0/g, '').trim();
    const time = lpData.subarray(20, 40).toString('utf8').replace(/\0/g, '').trim();
    const level = lpData.readUInt16LE(40);
    const type = lpData.readUInt16LE(42);
    const name = lpData.subarray(44, 144).toString('utf8').replace(/\0/g, '').trim();
    const totalLen = lpData.readUInt32LE(144);
    const len = lpData.readUInt32LE(148);
    if (lpData.length < RECV_HEADER_LEN + len) return null;
    const payload = lpData.subarray(RECV_HEADER_LEN, RECV_HEADER_LEN + len);
    return { format: 'recv', from, time, level, type, name, totalLen, len, payload };
}

function parseIncomingMsgData(lpData) {
    const recv = parseMsgDataRecv(lpData);
    if (recv) return recv;
    const send = parseMsgDataSend(lpData);
    if (send) return send;
    return null;
}

function parseMsgDataRet(lpData) {
    if (!lpData || lpData.length < 4 || lpData.length % 4 !== 0) return null;
    const count = lpData.length / 4;
    const ret = [];
    for (let i = 0; i < count; i++) ret.push(lpData.readUInt32LE(i * 4));
    return ret;
}

function isAckFrame(header) {
    if (!header) return false;
    if (header.dwCMD === CMD_MSG_DATA_ACK) return true;
    if (header.dwCMD === CMD_MSG_DATA && header.nLength >= 4 && header.nLength <= 128 && header.nLength % 4 === 0) {
        const toNum = header.nLength / 4;
        if (toNum <= 32 && header.nLength < RECV_HEADER_LEN) return true;
    }
    return false;
}

function buildMsgDataRetAck(toNums, retValues, dwIndex = 0) {
    const n = Math.max(1, toNums || 1);
    const lpData = Buffer.alloc(4 * n);
    for (let i = 0; i < n; i++) {
        lpData.writeUInt32LE(retValues[i] != null ? retValues[i] : RET_OK, i * 4);
    }
    return buildHeader(CMD_MSG_DATA_ACK, dwIndex, lpData);
}

function buildMsgDataPacket(opts) {
    const {
        toPersons = [],
        time = siteTime.formatEvidenceShort(new Date()),
        level = MSG_LEVEL.DEFAULT,
        type = MSG_TYPE.TXT,
        name = 'FleetBackend',
        totalLen,
        payloadChunk,
    } = opts;

    const toNum = toPersons.length;
    const chunk = payloadChunk || Buffer.alloc(0);
    const total = totalLen != null ? totalLen : chunk.length;

    const headerLen = 4 + toNum * 20 + 20 + 2 + 2 + 100 + 4 + 4;
    const buf = Buffer.alloc(headerLen + chunk.length);
    let offset = 0;

    buf.writeUInt32LE(toNum, offset);
    offset += 4;
    for (const person of toPersons) {
        const slot = Buffer.alloc(20);
        Buffer.from(String(person), 'utf8').copy(slot, 0, 0, 20);
        slot.copy(buf, offset);
        offset += 20;
    }
    Buffer.from(String(time).slice(0, 19), 'utf8').copy(buf, offset, 0, 19);
    offset += 20;
    buf.writeUInt16LE(level, offset);
    offset += 2;
    buf.writeUInt16LE(type, offset);
    offset += 2;
    Buffer.from(String(name).slice(0, 99), 'utf8').copy(buf, offset, 0, 99);
    offset += 100;
    buf.writeUInt32LE(total, offset);
    offset += 4;
    buf.writeUInt32LE(chunk.length, offset);
    offset += 4;
    chunk.copy(buf, offset);

    return buf;
}

function buildOutboundChunks(opts) {
    const textBuf = Buffer.isBuffer(opts.payload)
        ? opts.payload
        : Buffer.from(String(opts.text != null ? opts.text : ''), 'utf8');
    const persons = (opts.toPersons && opts.toPersons.length)
        ? opts.toPersons
        : (opts.toPerson ? [opts.toPerson] : []);

    const packets = [];
    let index = opts.startIndex || 0;
    let offset = 0;

    while (offset < textBuf.length || (offset === 0 && textBuf.length === 0)) {
        const slice = textBuf.subarray(offset, offset + MAX_PAYLOAD_CHUNK);
        const lpData = buildMsgDataPacket({
            toPersons: persons,
            time: opts.time,
            level: opts.level != null ? opts.level : MSG_LEVEL.DEFAULT,
            type: opts.type != null ? opts.type : MSG_TYPE.TXT,
            name: opts.name,
            totalLen: textBuf.length,
            payloadChunk: slice,
        });
        packets.push({ packet: buildHeader(CMD_MSG_DATA, index++, lpData), toNums: persons.length });
        offset += slice.length;
        if (textBuf.length === 0) break;
    }

    return packets;
}

const MAX_PARTIAL_STATES = 32;
const MAX_BYTES_PER_STATE = 4 * 1024 * 1024;
const MAX_TOTAL_LEN = 16 * 1024 * 1024;

class MessageReassembler {
    constructor() {
        this._parts = new Map();
    }

    clear() {
        this._parts.clear();
    }

    ingest(header, msg) {
        if (!msg) return null;
        if (msg.totalLen > MAX_TOTAL_LEN) return null;
        const key = msg.format === 'recv'
            ? `${msg.from}|${msg.time}|${msg.totalLen}`
            : `${msg.time}|${msg.name}|${msg.totalLen}|${(msg.toPersons || []).join(',')}`;
        let state = this._parts.get(key);
        if (!state) {
            if (this._parts.size >= MAX_PARTIAL_STATES) {
                const firstKey = this._parts.keys().next().value;
                if (firstKey !== undefined) this._parts.delete(firstKey);
            }
            state = { totalLen: msg.totalLen, chunks: new Map(), received: 0, meta: msg };
            this._parts.set(key, state);
        }
        if (!state.chunks.has(header.dwIndex)) {
            state.chunks.set(header.dwIndex, msg.payload);
            state.received += msg.len;
        }
        if (state.received > MAX_BYTES_PER_STATE) {
            this._parts.delete(key);
            return null;
        }
        if (state.received < state.totalLen) return null;

        const ordered = [...state.chunks.keys()].sort((a, b) => a - b);
        const full = Buffer.concat(ordered.map((i) => state.chunks.get(i)));
        this._parts.delete(key);

        const isText = msg.type === MSG_TYPE.TXT || msg.type === 0;
        return {
            ...state.meta,
            text: isText ? full.toString('utf8') : null,
            binary: isText ? null : full,
            from: msg.from || (msg.toPersons && msg.toPersons[0]) || null,
        };
    }
}

class OutboundMessageQueue {
    constructor(ws, logger) {
        this.ws = ws;
        this.log = logger;
        this.queue = [];
        this.active = false;
        this.toNums = 1;
    }

    reset() {
        this.queue = [];
        this.active = false;
    }

    enqueue(chunks) {
        this.queue.push(...chunks);
        this.toNums = (chunks[0] && chunks[0].toNums) || 1;
        this.pump();
    }

    onAck(header) {
        const ret = parseMsgDataRet(header.lpData);
        if (!ret || !ret.length) return;
        if (ret[0] === RET_BUSY) return;
        if (ret[0] !== RET_OK) {
            this.log.messaging.warn('outbound chunk rejected', { ret });
            this.reset();
            return;
        }
        this.active = false;
        this.pump();
    }

    pump() {
        if (this.active || !this.queue.length) return;
        if (this.ws.readyState !== 1) {
            this.reset();
            return;
        }
        const item = this.queue.shift();
        this.active = true;
        this.ws.send(item.packet);
    }
}

module.exports = {
    MSG_FLAG,
    findMsgFlagIndex,
    HEADER_SIZE,
    CMD_LOGIN_RET,
    CMD_MSG_DATA,
    CMD_MSG_DATA_ACK,
    MAX_PAYLOAD_CHUNK,
    MSG_TYPE,
    MSG_LEVEL,
    RET_OK,
    RET_BUSY,
    readHeader,
    buildHeader,
    buildLoginSuccess,
    buildLoginOverload,
    parseMsgDataSend,
    parseMsgDataRecv,
    parseIncomingMsgData,
    parseMsgDataRet,
    isAckFrame,
    buildMsgDataRetAck,
    buildOutboundChunks,
    MessageReassembler,
    OutboundMessageQueue,
};
