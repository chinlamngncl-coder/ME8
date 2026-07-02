'use strict';

const NOTIFY_APPS = new Set(['auto', 'sms', 'whatsapp', 'line', 'kakao']);

function loadConfig(env) {
    const e = env || process.env;
    return {
        enabled: e.FM_NOTIFY_ENABLED === '1',
        publicBaseUrl: String(e.FM_PUBLIC_BASE_URL || '').trim().replace(/\/$/, ''),
        webhookUrl: String(e.FM_NOTIFY_WEBHOOK_URL || '').trim(),
        webhookSecret: String(e.FM_NOTIFY_WEBHOOK_SECRET || '').trim(),
        defaultApp: normalizeNotifyApp(e.FM_NOTIFY_DEFAULT_APP || 'sms'),
        twilio: {
            enabled: e.FM_TWILIO_ENABLED === '1',
            accountSid: String(e.TWILIO_ACCOUNT_SID || '').trim(),
            authToken: String(e.TWILIO_AUTH_TOKEN || '').trim(),
            smsFrom: String(e.TWILIO_SMS_FROM || '').trim(),
            whatsappFrom: String(e.TWILIO_WHATSAPP_FROM || '').trim(),
        },
    };
}

function normalizeNotifyApp(raw) {
    const v = String(raw || 'auto').trim().toLowerCase();
    return NOTIFY_APPS.has(v) ? v : 'auto';
}

function normalizePhone(raw) {
    const s = String(raw || '').trim();
    if (!s) return '';
    if (s.startsWith('+')) return '+' + s.slice(1).replace(/\D/g, '');
    return s.replace(/\D/g, '');
}

function resolveNotifyApp(deviceApp, config) {
    const d = normalizeNotifyApp(deviceApp);
    if (d !== 'auto') return d;
    return config.defaultApp === 'auto' ? 'sms' : config.defaultApp;
}

function twilioWhatsAppFrom(config) {
    if (config.twilio.whatsappFrom) return config.twilio.whatsappFrom;
    if (config.twilio.smsFrom && !config.twilio.smsFrom.startsWith('whatsapp:')) {
        return `whatsapp:${config.twilio.smsFrom}`;
    }
    return config.twilio.smsFrom;
}

function buildOfficerMessage(opts) {
    const {
        operatorName,
        radioLine,
        mapsUrl,
        shareUrl,
    } = opts;
    const name = operatorName || 'Officer';
    const parts = [`SOS assist — ${name}.`];
    if (mapsUrl) parts.push(`Navigate: ${mapsUrl}`);
    if (shareUrl && shareUrl !== mapsUrl) parts.push(`Map: ${shareUrl}`);
    if (radioLine && parts.join(' ').length < 120) {
        return parts.join(' ');
    }
    if (radioLine && radioLine.length <= 320) return radioLine;
    const msg = parts.join(' ');
    return msg.length > 480 ? msg.slice(0, 477) + '…' : msg;
}

function twilioReady(config, app) {
    if (!config.twilio.enabled) return false;
    if (!config.twilio.accountSid || !config.twilio.authToken) return false;
    if (app === 'whatsapp') return !!twilioWhatsAppFrom(config);
    if (app === 'sms') return !!config.twilio.smsFrom;
    return false;
}

async function sendTwilioMessage(config, { to, body, app }, log) {
    const accountSid = config.twilio.accountSid;
    const authToken = config.twilio.authToken;
    let from = config.twilio.smsFrom;
    let toAddr = to;
    if (app === 'whatsapp') {
        from = twilioWhatsAppFrom(config);
        toAddr = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    } else if (!to.startsWith('+')) {
        return { ok: false, error: 'phone_must_be_e164_for_twilio' };
    }
    const params = new URLSearchParams({ From: from, To: toAddr, Body: body });
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
            signal: AbortSignal.timeout(12000),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            if (log) log.web.warn('twilio notify failed', { status: res.status, error: data.message || res.statusText });
            return { ok: false, error: data.message || res.statusText, status: res.status };
        }
        if (log) log.web.info('twilio notify sent', { app, to: toAddr.slice(-4), sid: data.sid });
        return { ok: true, provider: 'twilio', sid: data.sid };
    } catch (err) {
        if (log) log.web.warn('twilio notify error', { err: err.message });
        return { ok: false, error: err.message };
    }
}

async function postNotifyWebhook(config, payload, log) {
    if (!config.webhookUrl) return { ok: false, skipped: true, reason: 'no_webhook' };
    const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
    if (config.webhookSecret) headers.Authorization = `Bearer ${config.webhookSecret}`;
    try {
        const res = await fetch(config.webhookUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(12000),
        });
        const text = await res.text().catch(() => '');
        if (!res.ok) {
            if (log) log.web.warn('notify webhook failed', { status: res.status, body: text.slice(0, 200) });
            return { ok: false, error: text.slice(0, 200) || res.statusText, status: res.status };
        }
        if (log) log.web.info('notify webhook ok', { app: payload.notifyApp, to: String(payload.to || '').slice(-4) });
        return { ok: true, provider: 'webhook', status: res.status };
    } catch (err) {
        if (log) log.web.warn('notify webhook error', { err: err.message });
        return { ok: false, error: err.message };
    }
}

async function notifyOfficer(config, opts, log) {
    const {
        camId,
        operatorName,
        mobilePhone,
        notifyApp,
        body,
        radioLine,
        mapsUrl,
        shareUrl,
        alarmCamId,
        team,
    } = opts;
    const phone = normalizePhone(mobilePhone);
    if (!phone) return { ok: false, skipped: true, reason: 'no_phone', camId };

    const app = resolveNotifyApp(notifyApp, config);
    const payload = {
        event: 'sos.response_team',
        notifyApp: app,
        to: phone,
        camId,
        operatorName: operatorName || '',
        alarmCamId: alarmCamId || '',
        team: team || [],
        body,
        radioLine: radioLine || '',
        mapsUrl: mapsUrl || '',
        shareUrl: shareUrl || '',
        ts: new Date().toISOString(),
    };

    const results = { camId, phone: phone.slice(-4), notifyApp: app, webhook: null, twilio: null };

    if (config.webhookUrl) {
        results.webhook = await postNotifyWebhook(config, payload, log);
    }

    if (twilioReady(config, app)) {
        results.twilio = await sendTwilioMessage(config, { to: phone, body, app }, log);
    } else if (app === 'sms' || app === 'whatsapp') {
        results.twilio = { ok: false, skipped: true, reason: 'twilio_not_configured' };
    }

    results.ok = !!(results.webhook && results.webhook.ok) || !!(results.twilio && results.twilio.ok);
    if (!config.webhookUrl && !twilioReady(config, app)) {
        results.ok = false;
        results.skipped = true;
        results.reason = app === 'line' || app === 'kakao'
            ? 'regional_app_needs_webhook'
            : 'notify_not_configured';
    }
    return results;
}

async function notifyResponseTeam(config, opts, log) {
    if (!config.enabled) {
        return { ok: false, skipped: true, reason: 'notify_disabled', officers: [] };
    }
    const {
        team,
        getContactForCam,
        alarmCamId,
        radioLine,
        mapsUrl,
        shareUrl,
    } = opts;
    const bodyBase = {
        alarmCamId,
        team,
        radioLine,
        mapsUrl,
        shareUrl,
    };
    const officers = [];
    for (const camId of team || []) {
        const contact = getContactForCam ? getContactForCam(camId) : null;
        if (!contact || !contact.mobilePhone) {
            officers.push({ camId, ok: false, skipped: true, reason: 'no_phone' });
            continue;
        }
        const body = buildOfficerMessage({
            operatorName: contact.operatorName,
            radioLine,
            mapsUrl,
            shareUrl,
        });
        const result = await notifyOfficer(config, {
            ...bodyBase,
            camId,
            operatorName: contact.operatorName,
            mobilePhone: contact.mobilePhone,
            notifyApp: contact.notifyApp,
            body,
        }, log);
        officers.push(result);
    }
    const sent = officers.filter((o) => o.ok).length;
    return {
        ok: sent > 0,
        sent,
        total: officers.length,
        officers,
    };
}

function getStatusPublic(config) {
    const cfg = config || loadConfig();
    return {
        enabled: cfg.enabled,
        webhook: !!cfg.webhookUrl,
        twilio: cfg.twilio.enabled && !!cfg.twilio.accountSid,
        publicBaseUrl: !!cfg.publicBaseUrl,
        defaultApp: cfg.defaultApp,
        regionalApps: 'line,kakao via webhook middleware',
    };
}

module.exports = {
    loadConfig,
    normalizePhone,
    normalizeNotifyApp,
    buildOfficerMessage,
    notifyOfficer,
    notifyResponseTeam,
    getStatusPublic,
    NOTIFY_APPS,
};
