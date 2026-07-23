/**
 * Mobility C2 i18n \u2014 curated locale packs (dispatch / CCTV terminology).
 * Locales: en, fil (Filipino), id (Indonesian), th (Thai), ko (Korean), zh (Chinese).
 */
(function (global) {
    const STORAGE_KEY = 'fm_ui_lang';
    const SUPPORTED = (function () {
        try {
            var meta = document.querySelector('meta[name="fm-locales"]');
            if (meta && meta.content) {
                var list = String(meta.content).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
                if (list.length) return list;
            }
        } catch (_) { /* ignore */ }
        return ['en', 'fil', 'id', 'th', 'ko'];
    })();
    const DEFAULT = 'en';

    /** Keys that stay Latin acronym in all locales (professional convention). */
    const LOCK_TERMS = {
        PTT: true,
        BWC: true,
        SIP: true,
        SOS: true,
        FTP: true,
        CSV: true,
        SD: true,
        HQ: true,
        LAN: true,
        VPN: true,
        ID: true,
    };

    let locale = DEFAULT;
    let bundles = {};
    let ready = false;
    let readyPromise = null;

    function normalizeLang(raw) {
        const v = String(raw || '').trim().toLowerCase();
        if (v === 'ph' || v === 'tl' || v === 'filipino' || v === 'tagalog') return 'fil';
        if (v === 'in' || v === 'id-id' || v === 'indonesian') return 'id';
        if (v === 'th-th' || v === 'thai' || v === 'thailand') return 'th';
        if (v === 'ko-kr' || v === 'kr' || v === 'korean' || v === 'hangul') return 'ko';
        if (v === 'zh-cn' || v === 'zh' || v === 'cn' || v === 'chinese' || v === 'mandarin') return 'zh';
        if (SUPPORTED.indexOf(v) >= 0) return v;
        return DEFAULT;
    }

    function fetchLocale(lang) {
        return fetch('/locales/' + lang + '.json', { cache: 'no-cache' })
            .then(function (r) {
                if (!r.ok) throw new Error('locale ' + lang);
                return r.json();
            });
    }

    function loadBundle(lang) {
        lang = normalizeLang(lang);
        if (bundles[lang]) return Promise.resolve(bundles[lang]);
        return fetchLocale(lang).then(function (data) {
            bundles[lang] = data || {};
            return bundles[lang];
        });
    }

    function humanizeKey(k) {
        const tail = String(k || '').split('.').pop() || String(k || '');
        return tail
            .replace(/([A-Z])/g, ' $1')
            .replace(/_/g, ' ')
            .replace(/^./, function (c) { return c.toUpperCase(); })
            .trim();
    }

    function t(key, params) {
        const k = String(key || '');
        let s = (bundles[locale] && bundles[locale][k])
            || (bundles[DEFAULT] && bundles[DEFAULT][k]);
        if (s == null || s === '') s = humanizeKey(k);
        if (params && typeof params === 'object') {
            Object.keys(params).forEach(function (p) {
                s = s.replace(new RegExp('\\{' + p + '\\}', 'g'), String(params[p]));
            });
        }
        return s;
    }

    function getLocale() {
        return locale;
    }

    function supportedLanguages() {
        return SUPPORTED.slice();
    }

    function applyPage(root) {
        root = root || document;
        if (!root.querySelectorAll) return;

        root.querySelectorAll('[data-i18n]').forEach(function (el) {
            if (el.id === 'header-lang') return;
            if (el.getAttribute('data-dr-dynamic') === '1') return;
            const key = el.getAttribute('data-i18n');
            if (!key) return;
            el.textContent = t(key);
        });

        root.querySelectorAll('[data-i18n-html]').forEach(function (el) {
            const key = el.getAttribute('data-i18n-html');
            if (!key) return;
            el.innerHTML = t(key);
        });

        root.querySelectorAll('option[data-i18n]').forEach(function (opt) {
            const key = opt.getAttribute('data-i18n');
            if (key) opt.textContent = t(key);
        });

        root.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
            el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
        });

        root.querySelectorAll('[data-i18n-alt]').forEach(function (el) {
            el.alt = t(el.getAttribute('data-i18n-alt'));
        });

        root.querySelectorAll('[data-i18n-title]').forEach(function (el) {
            el.title = t(el.getAttribute('data-i18n-title'));
        });

        root.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
            el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
        });

        root.querySelectorAll('select[data-i18n-options]').forEach(function (sel) {
            const prefix = sel.getAttribute('data-i18n-options');
            Array.prototype.forEach.call(sel.options, function (opt) {
                const key = opt.getAttribute('data-i18n-key');
                if (key) opt.textContent = t(prefix + key);
            });
        });

        if (root === document && document.title) {
            document.title = t('app.documentTitle');
        }
    }

    function bindLangSelect() {
        const sel = document.getElementById('header-lang');
        if (!sel) return;
        if (!sel._i18nBound) {
            sel._i18nBound = true;
            sel.addEventListener('change', function () {
                setLocale(sel.value);
            });
        }
        sel.innerHTML = '';
        SUPPORTED.forEach(function (code) {
            const opt = document.createElement('option');
            opt.value = code;
            opt.textContent = t('lang.' + code);
            sel.appendChild(opt);
        });
        sel.value = locale;
    }

    function notifyChange() {
        try {
            global.dispatchEvent(new CustomEvent('fm-i18n-changed', { detail: { locale: locale } }));
        } catch (_) { /* ignore */ }
        applyPage(document);
        bindLangSelect();
    }

    function setLocale(lang) {
        lang = normalizeLang(lang);
        return loadBundle(DEFAULT).then(function () {
            return loadBundle(lang);
        }).then(function () {
            locale = lang;
            try { localStorage.setItem(STORAGE_KEY, lang); } catch (_) { /* ignore */ }
            document.documentElement.lang = lang === 'fil' ? 'fil' : (lang === 'zh' ? 'zh-CN' : lang);
            ready = true;
            notifyChange();
            return locale;
        }).catch(function () {
            locale = DEFAULT;
            notifyChange();
            return locale;
        });
    }

    function init(opts) {
        if (readyPromise && !(opts && opts.force)) return readyPromise;
        const saved = (function () {
            try { return localStorage.getItem(STORAGE_KEY); } catch (_) { return null; }
        })();
        const initial = normalizeLang((opts && opts.locale) || saved || DEFAULT);
        readyPromise = loadBundle(DEFAULT).then(function () {
            return loadBundle(initial);
        }).then(function () {
            locale = initial;
            document.documentElement.lang = locale === 'fil' ? 'fil' : (locale === 'zh' ? 'zh-CN' : locale);
            ready = true;
            bindLangSelect();
            applyPage(document);
            return locale;
        }).catch(function () {
            locale = DEFAULT;
            ready = true;
            return locale;
        });
        return readyPromise;
    }

    function scheduleApply(root) {
        if (!ready) return;
        requestAnimationFrame(function () { applyPage(root || document); });
    }

    global.I18n = {
        t: t,
        init: init,
        setLocale: setLocale,
        getLocale: getLocale,
        applyPage: applyPage,
        scheduleApply: scheduleApply,
        supportedLanguages: supportedLanguages,
        LOCK_TERMS: LOCK_TERMS,
    };

    global.t = t;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { init(); });
    } else {
        init();
    }
})(window);
