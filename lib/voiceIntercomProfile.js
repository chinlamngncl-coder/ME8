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
        label: 'Pure audio Phone, subject :0, no y/f',
        invite: {
            sessionName: 'Phone',
            useTalkSubject: false,
            useVoicePhoneSubject: true,
            voicePhone: true,
            includeTalkExtensions: false,
            omitSubject: true,
            audioDirection: 'both',
        },
        stopRecordOnConnect: false,
    },
};

const DEFAULT_ID = String(process.env.FM_VOICE_INTERCOM_PROFILE || 'phone-channel0').trim() || 'phone-channel0';

function resolve(profileId) {
    const id = String(profileId || DEFAULT_ID).trim() || DEFAULT_ID;
    const row = PROFILES[id];
    if (row) {
        return Object.assign({ id }, row);
    }
    const fallback = PROFILES['phone-channel0'];
    return Object.assign({ id: 'phone-channel0', fallback: true, requested: id }, fallback);
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
