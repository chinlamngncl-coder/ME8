/**
 * UI-DATE-FORMAT-CENTRE-UNIFY-V1
 * Operator chrome timestamps: "31 Aug 2026, 16:28"
 * Day number + short month (active UI language) + full year + HH:mm local.
 * Never use for API / date= / datetime-local values — display only.
 */
(function (global) {
    'use strict';

    function localeTag() {
        var lang = 'en';
        try {
            if (global.I18n && typeof global.I18n.getLocale === 'function') {
                lang = String(global.I18n.getLocale() || 'en');
            }
        } catch (_) { /* ignore */ }
        if (lang === 'zh') return 'zh-CN';
        if (lang === 'fil') return 'fil';
        return lang || 'en';
    }

    function parseDate(iso) {
        if (!iso) return null;
        var d = new Date(iso);
        if (isNaN(d.getTime())) d = new Date(String(iso).replace(' ', 'T'));
        if (isNaN(d.getTime())) return null;
        return d;
    }

    function shortMonth(d) {
        try {
            return d.toLocaleDateString(localeTag(), { month: 'short' }).replace(/\.$/, '');
        } catch (_) {
            var en = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return en[d.getMonth()] || '';
        }
    }

    function pad2(n) {
        return (n < 10 ? '0' : '') + n;
    }

    /** Date only → "31 Aug 2026" */
    function fmtDate(iso) {
        if (!iso) return '\u2014';
        var d = parseDate(iso);
        if (!d) {
            var s = String(iso).slice(0, 10);
            return s || '\u2014';
        }
        return d.getDate() + ' ' + shortMonth(d) + ' ' + d.getFullYear();
    }

    /** Date + time → "31 Aug 2026, 16:28" */
    function fmtDateTime(iso) {
        if (!iso) return '\u2014';
        var d = parseDate(iso);
        if (!d) return String(iso).slice(0, 16).replace('T', ' ');
        return d.getDate() + ' ' + shortMonth(d) + ' ' + d.getFullYear() +
            ', ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
    }

    global.fmtDate = fmtDate;
    global.fmtDateTime = fmtDateTime;
})(typeof window !== 'undefined' ? window : global);
