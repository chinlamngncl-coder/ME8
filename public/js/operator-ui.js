/**

 * Unified operator error display \u2014 use instead of raw err.message / data.error in the UI.

 */

(function (global) {

    function tr(key) {

        if (global.I18n && I18n.t) {

            const s = I18n.t(key);

            if (s && s !== key) return s;

        }

        if (global.OperatorErrorVoice && OperatorErrorVoice.FALLBACK_EN) {

            return OperatorErrorVoice.FALLBACK_EN[key] || OperatorErrorVoice.FALLBACK_EN['errors.generic'];

        }

        return key;

    }



    function opMessage(err, data, fallbackKey) {

        if (global.OperatorErrorVoice) {

            return OperatorErrorVoice.fromCatch(err, data, fallbackKey);

        }

        if (data && data.errorKey) return tr(data.errorKey);

        return tr(fallbackKey || 'errors.generic');

    }



    function resolveTarget(target) {

        if (!target) return null;

        if (typeof target === 'string') return document.getElementById(target);

        if (target.nodeType === 1) return target;

        return null;

    }



    function showOpError(target, err, data, fallbackKey) {

        const msg = opMessage(err, data, fallbackKey);

        const el = resolveTarget(target);

        if (el) {

            el.textContent = msg;

            if (el.style && el.style.display === 'none') el.style.display = 'block';

            if ('hidden' in el) el.hidden = false;

        }

        return msg;

    }



    function hideOpError(target) {

        const el = resolveTarget(target);

        if (!el) return;

        el.textContent = '';

        if (el.style) el.style.display = 'none';

        if ('hidden' in el) el.hidden = true;

    }



    function showOpAlert(err, data, fallbackKey) {

        alert(opMessage(err, data, fallbackKey));

    }



    /** Safe JSON fetch \u2014 never surfaces parse/HTML errors to operators. */

    async function fetchOpJson(url, options, fallbackKey) {

        const fb = fallbackKey || 'errors.generic';

        try {

            const res = await fetch(url, Object.assign({ credentials: 'same-origin' }, options || {}));

            const ct = (res.headers.get('content-type') || '').toLowerCase();

            let data = null;

            if (ct.indexOf('json') !== -1) {

                data = await res.json();

            } else {

                const text = await res.text();

                if (!text || !String(text).trim()) {

                    data = {};

                } else {

                    try {

                        data = JSON.parse(text);

                    } catch (parseErr) {

                        console.warn('[fetchOpJson] expected JSON:', url, String(text).slice(0, 160));

                        return { ok: false, data: null, errorKey: fb, _err: parseErr };

                    }

                }

            }

            if (!res.ok || (data && data.ok === false)) {

                return { ok: false, data: data, errorKey: (data && data.errorKey) || fb, _err: null };

            }

            return { ok: true, data: data };

        } catch (err) {

            console.warn('[fetchOpJson]', url, err);

            return { ok: false, data: null, errorKey: fb, _err: err };

        }

    }



    /** Drop-in for module-local opMsg / catalogMsg helpers. */

    function opMsg(data, err, fallbackKey) {

        return opMessage(err, data, fallbackKey);

    }



    global.OperatorUI = {

        opMessage: opMessage,

        opMsg: opMsg,

        showOpError: showOpError,

        hideOpError: hideOpError,

        showOpAlert: showOpAlert,

        fetchOpJson: fetchOpJson,

    };

}(window));

