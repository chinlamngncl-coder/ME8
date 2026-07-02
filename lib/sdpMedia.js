/**
 * SDP helpers for intercom modes (PDF page 9) and UDP/TCP transport (PDF page 10).
 */

function parseInviteMode(sdp) {
    if (!sdp || typeof sdp !== 'string') return { mode: 'video', transport: 'udp' };
    const hasVideo = /^m=video/im.test(sdp);
    const hasAudio = /^m=audio/im.test(sdp);
    let mode = 'audio';
    if (hasVideo && hasAudio) mode = 'av';
    else if (hasVideo) mode = 'video';
    const videoPort = parseMediaPort(sdp, 'video');
    const audioPort = parseMediaPort(sdp, 'audio');
    const transport = detectTransport(sdp, videoPort, audioPort, hasVideo, hasAudio);
    return { mode, transport, videoPort, audioPort };
}

function parseMediaPort(sdp, kind) {
    const re = new RegExp(`^m=${kind}\\s+(\\d+)`, 'im');
    const m = sdp.match(re);
    return m ? parseInt(m[1], 10) : 0;
}

function detectTransport(sdp, videoPort, audioPort, hasVideo, hasAudio) {
    if (/TCP\/RTP/i.test(sdp) || /a=setup:/i.test(sdp)) return 'tcp';
    if (hasVideo && videoPort === 0) return 'tcp';
    if (hasAudio && audioPort === 0) return 'tcp';
    return 'udp';
}

/** SIP Subject: deviceId:channelId,platformId:channelId — channel is 0 for live Play (not SSRC). */
function buildInviteSubject(camId, serverId) {
    return `${camId}:0,${serverId}:0`;
}

/** SIP Talk — SSRC in Subject must match SDP y= (not :0 Play channel). */
const TALK_SSRC = '0100000001';
/** Voice-only Talk (PDF §8): no v token — f=v… makes some BWCs start camera/recording. */
const TALK_AUDIO_F_LINE = '/////a/1/8/1';

function buildTalkInviteSubject(camId, serverId) {
    return `${camId}:${TALK_SSRC},${serverId}:0`;
}

/** Fleet phone — channel :0 (not Talk SSRC) so BWC does not enter live-view / watch mode. */
function buildVoicePhoneInviteSubject(camId, serverId) {
    return buildInviteSubject(camId, serverId);
}

function buildInviteSdp(opts) {
    const {
        host,
        serverId,
        mode = 'video',
        transport = 'udp',
        videoPort = 40130,
        audioPort = 40132,
        sessionName = 'Play',
        audioDirection,
        voicePhone = false,
        includeTalkExtensions = true,
    } = opts;

    const vPort = transport === 'tcp' ? 0 : videoPort;
    const aPort = transport === 'tcp' ? 0 : audioPort;
    const proto = transport === 'tcp' ? 'TCP/RTP/AVP' : 'RTP/AVP';

    let sdp = `v=0\r\no=${serverId} 0 0 IN IP4 ${host}\r\ns=${sessionName}\r\nc=IN IP4 ${host}\r\nt=0 0\r\n`;

    const audioDir = audioDirection != null
        ? audioDirection
        : ((sessionName === 'Talk' || sessionName === 'Phone') ? 'both' : 'recv');
    const audioAttr = audioDir === 'recv' ? 'recvonly'
        : (audioDir === 'both' ? 'sendrecv' : 'sendonly');

    if (mode === 'audio') {
        sdp += `m=audio ${aPort} ${proto} 8\r\na=${audioAttr}\r\na=rtpmap:8 PCMA/8000\r\n`;
        if (includeTalkExtensions && !voicePhone && sessionName === 'Talk') {
            sdp += `y=${TALK_SSRC}\r\nf=${TALK_AUDIO_F_LINE}\r\n`;
        }
    } else if (mode === 'av') {
        sdp += `m=video ${vPort} ${proto} 96\r\na=recvonly\r\na=rtpmap:96 PS/90000\r\n`;
        sdp += `m=audio ${aPort} ${proto} 8\r\na=recvonly\r\na=rtpmap:8 PCMA/8000\r\n`;
        sdp += `y=0100000001\r\n`;
    } else {
        sdp += `m=video ${vPort} ${proto} 96\r\na=recvonly\r\na=rtpmap:96 PS/90000\r\ny=0100000001\r\n`;
    }

    if (transport === 'tcp') {
        sdp += `a=setup:passive\r\na=connection:new\r\n`;
    }

    return sdp;
}

function peerTcpSetupForAnswer(inviteSdp) {
    const m = inviteSdp && inviteSdp.match(/a=setup:(active|passive)/i);
    if (!m) return 'passive';
    return m[1].toLowerCase() === 'active' ? 'passive' : 'active';
}

function buildAnswerSdp(opts) {
    const {
        host,
        serverId,
        mode,
        transport = 'udp',
        videoPort = 40130,
        audioPort = 40132,
        audioDirection = 'send',
        sessionName = 'Play',
        tcpSetup,
    } = opts;

    const vPort = transport === 'tcp' ? 0 : videoPort;
    let aPort = transport === 'tcp' ? 0 : audioPort;
    if (mode === 'audio') aPort = audioPort;
    const proto = transport === 'tcp' ? 'TCP/RTP/AVP' : 'RTP/AVP';

    let sdp = `v=0\r\no=${serverId} 0 0 IN IP4 ${host}\r\ns=${sessionName}\r\nc=IN IP4 ${host}\r\nt=0 0\r\n`;

    if (mode === 'audio') {
        const audioAttr = audioDirection === 'recv' ? 'recvonly'
            : (audioDirection === 'both' ? 'sendrecv' : 'sendonly');
        sdp += `m=audio ${aPort} ${proto} 8\r\na=${audioAttr}\r\na=rtpmap:8 PCMA/8000\r\n`;
        if (sessionName === 'Talk') {
            sdp += `y=${TALK_SSRC}\r\nf=${TALK_AUDIO_F_LINE}\r\n`;
        }
    } else if (mode === 'av') {
        sdp += `m=video ${vPort} ${proto} 96\r\na=sendonly\r\na=rtpmap:96 PS/90000\r\n`;
        sdp += `m=audio ${aPort} ${proto} 8\r\na=sendonly\r\na=rtpmap:8 PCMA/8000\r\n`;
    } else {
        sdp += `m=video ${vPort} ${proto} 96\r\na=sendonly\r\na=rtpmap:96 PS/90000\r\n`;
    }

    if (transport === 'tcp') {
        const setup = tcpSetup === 'passive' ? 'passive' : 'active';
        sdp += `a=setup:${setup}\r\na=connection:new\r\n`;
    }

    return sdp;
}

function parseRemoteAudioEndpoint(sdp) {
    if (!sdp || typeof sdp !== 'string') return { host: null, port: 0 };
    const hostMatch = sdp.match(/^c=IN IP4 ([^\s\r\n]+)/im);
    const host = hostMatch ? hostMatch[1].trim() : null;
    return { host, port: parseMediaPort(sdp, 'audio') };
}

module.exports = {
    parseInviteMode,
    buildInviteSubject,
    buildTalkInviteSubject,
    buildVoicePhoneInviteSubject,
    buildInviteSdp,
    buildAnswerSdp,
    peerTcpSetupForAnswer,
    parseRemoteAudioEndpoint,
};
