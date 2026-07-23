/**
 * Shared busy lock for password/PIN forms \u2014 disable inputs, show Verifying\u2026, block double submit.
 */
(function (global) {
    'use strict';

    function create(opts) {
        opts = opts || {};
        var fields = opts.fields || [];
        var cancelBtns = opts.cancelBtns || [];
        var extraBtns = opts.extraBtns || [];
        var submitBtn = opts.submitBtn;
        var busy = false;
        var submitDefault = submitBtn ? submitBtn.textContent : '';
        var busyLabel = opts.busyLabel || 'Verifying\u2026';

        function setBusy(on) {
            busy = !!on;
            fields.forEach(function (el) {
                if (el) el.disabled = busy;
            });
            if (submitBtn) {
                submitBtn.disabled = busy;
                submitBtn.textContent = busy ? busyLabel : submitDefault;
            }
            cancelBtns.concat(extraBtns).forEach(function (btn) {
                if (btn) btn.disabled = busy;
            });
            if (opts.onBusy) opts.onBusy(busy);
        }

        return {
            isBusy: function () { return busy; },
            setBusy: setBusy,
            refreshDefaultLabel: function () {
                if (submitBtn) submitDefault = submitBtn.textContent;
            },
        };
    }

    global.AuthFormBusy = { create: create };
}(typeof window !== 'undefined' ? window : this));
