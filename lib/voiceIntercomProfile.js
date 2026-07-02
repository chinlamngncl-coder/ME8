/**
 * SDK §8 outbound intercom INVITE matrix — one profile at a time via FM_VOICE_INTERCOM_PROFILE.
 * Lab: compare Subject / s= / y= / f= / audio direction without changing Fleet ☎ toggle UX.
 */

const PROFILES = {
    'talk-duplex': {
        label: 'Talk duplex (§8 y/f, sendrecv)',
        invite: {
            sessionName: 'Talk',
            useTalkSubject: true,
            voicePhone: false,
            includeTalkExtensions: true,
            audioDirection: 'both',
        },
        stopRecordOnConnect: false,
    },
    'talk-minimal': {
        label: 'Talk subject, no y/f',
        invite: {
            sessionName: 'Talk',
            useTalkSubject: true,
            voicePhone: false,
            includeTalkExtensions: false,
            audioDirection: 'both',
        },
        stopRecordOnConnect: false,
    },
    'talk-recvonly': {
        label: 'Talk y/f, SDP recvonly',
        invite: {
            sessionName: 'Talk',
            useTalkSubject: true,
            voicePhone: false,
            includeTalkExtensions: true,
            audioDirection: 'recv',
        },
        stopRecordOnConnect: false,
    },
    'phone-channel0': {
        label: 'Phone session, subject :0',
        invite: {
            sessionName: 'Phone',
            useVoicePhoneSubject: true,
            voicePhone: true,
            audioDirection: 'both',
        },
        stopRecordOnConnect: true,
    },
};

const DEFAULT_ID = String(process.env.FM_VOICE_INTERCOM_PROFILE || 'talk-duplex').trim() || 'talk-duplex';

function resolve(profileId) {
    const id = String(profileId || DEFAULT_ID).trim() || DEFAULT_ID;
    const row = PROFILES[id];
    if (row) {
        return Object.assign({ id }, row);
    }
    const fallback = PROFILES['talk-duplex'];
    return Object.assign({ id: 'talk-duplex', fallback: true, requested: id }, fallback);
}

function listProfiles() {
    return Object.keys(PROFILES).map((id) => ({
        id,
        label: PROFILES[id].label,
    }));
}

function clientPayload() {
    const active = resolve();
    return {
        intercomProfile: active.id,
        intercomProfileLabel: active.label,
        intercomProfiles: listProfiles(),
    };
}

module.exports = {
    resolve,
    listProfiles,
    clientPayload,
    DEFAULT_ID,
};
