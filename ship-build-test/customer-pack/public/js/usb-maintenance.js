/**
 * Command-room USB maintenance — super admin, Server config tab.
 */
(function (global) {
    function tr(key, params) {
        if (global.I18n && I18n.t) return I18n.t(key, params);
        return key;
    }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/"/g, '&quot;');
    }

    let pollTimer = null;
    let lastStatus = null;

    function setMeta(text, isError) {
        const el = document.getElementById('usb-maint-meta');
        if (!el) return;
        el.textContent = text || '';
        el.className = 'setup-hint' + (isError ? ' is-error' : '');
    }

    function renderStatus(st) {
        const el = document.getElementById('usb-maint-status');
        const clearBtn = document.getElementById('usb-maint-clear');
        if (!el || !st) return;
        const parts = [];
        if (!st.supported) {
            parts.push(tr('usbMaint.unsupportedPlatform', { platform: st.platform || '?' }));
        } else {
            parts.push(st.adbFound ? tr('usbMaint.adbReady') : tr('usbMaint.adbMissing'));
            if (st.toolExeFound) parts.push(tr('usbMaint.toolReady'));
            if (st.clearMediaConfigured) parts.push(tr('usbMaint.clearConfigured'));
            else parts.push(tr('usbMaint.clearNotConfigured'));
        }
        el.textContent = parts.join(' · ');
        if (clearBtn) {
            clearBtn.disabled = !st.clearMediaConfigured;
            clearBtn.title = st.clearMediaConfigured ? '' : tr('usbMaint.clearNotConfigured');
        }
        lastStatus = st;
    }

    function renderDevices(data) {
        const list = document.getElementById('usb-maint-devices');
        const actions = document.getElementById('usb-maint-actions');
        if (!list) return;
        const devices = (data && data.devices) ? data.devices : [];
        if (!devices.length) {
            list.innerHTML = '<p class="setup-hint">' + esc(tr('usbMaint.noDevices')) + '</p>';
            if (actions) actions.hidden = true;
            return;
        }
        list.innerHTML = devices.map(function (d) {
            const ok = d.state === 'device';
            return '<div class="usb-maint-device' + (ok ? '' : ' offline') + '" data-serial="' + esc(d.serial) + '">'
                + '<strong>' + esc(d.serial) + '</strong>'
                + ' <span class="usb-maint-state">' + esc(d.state) + '</span>'
                + (ok ? '' : (' <span class="setup-hint">' + esc(tr('usbMaint.fixConnection')) + '</span>'))
                + '</div>';
        }).join('');
        if (actions) actions.hidden = false;
    }

    async function fetchJson(url, opts) {
        const res = await fetch(url, opts || {});
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error((data && data.error) || 'Request failed');
        return data;
    }

    async function refresh() {
        setMeta(tr('usbMaint.scanning'), false);
        try {
            const status = await fetchJson('/api/usb-maintenance/status');
            renderStatus(status.status);
            const dev = await fetchJson('/api/usb-maintenance/devices');
            renderDevices(dev);
            setMeta('', false);
        } catch (err) {
            setMeta(err.message, true);
        }
    }

    function selectedSerial() {
        const picked = document.querySelector('.usb-maint-device.selected');
        if (picked) return picked.getAttribute('data-serial');
        const first = document.querySelector('.usb-maint-device:not(.offline)');
        return first ? first.getAttribute('data-serial') : null;
    }

    async function runAction(action, destructive) {
        const serial = selectedSerial();
        if (!serial) {
            alert(tr('usbMaint.pickDevice'));
            return;
        }
        if (action === 'clear-media' && lastStatus && !lastStatus.clearMediaConfigured) {
            alert(tr('usbMaint.clearNotConfiguredDetail'));
            return;
        }
        let body = { action: action, serial: serial };
        if (destructive) {
            const msg = tr('usbMaint.confirmClear');
            if (!window.confirm(msg)) return;
            const adminPassword = window.prompt(tr('usbMaint.adminPasswordPrompt'));
            if (!adminPassword) return;
            body.adminPassword = adminPassword;
        }
        setMeta(tr('usbMaint.working'), false);
        try {
            const res = await fetch('/api/usb-maintenance/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok || !data.ok) {
                const msg = (data && data.error) || 'Action failed';
                alert(msg);
                throw new Error(msg);
            }
            const out = document.getElementById('usb-maint-output');
            if (out) {
                out.hidden = false;
                out.textContent = JSON.stringify(data.result || data, null, 2);
            }
            setMeta(tr('usbMaint.done'), false);
            await refresh();
        } catch (err) {
            setMeta(err.message, true);
        }
    }

    async function launchVendorTool() {
        if (!window.confirm(tr('usbMaint.launchToolConfirm'))) return;
        const adminPassword = window.prompt(tr('usbMaint.adminPasswordPrompt'));
        if (!adminPassword) return;
        setMeta(tr('usbMaint.working'), false);
        try {
            const res = await fetch('/api/usb-maintenance/launch-tool', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminPassword: adminPassword }),
            });
            const data = await res.json();
            if (!res.ok || !data.ok) {
                const msg = (data && data.error) || 'Could not launch tool';
                alert(msg);
                throw new Error(msg);
            }
            setMeta(tr('usbMaint.toolLaunched'), false);
        } catch (err) {
            setMeta(err.message, true);
        }
    }

    function bindUi() {
        const refreshBtn = document.getElementById('usb-maint-refresh');
        if (refreshBtn) refreshBtn.addEventListener('click', function () { refresh(); });
        const infoBtn = document.getElementById('usb-maint-info');
        if (infoBtn) infoBtn.addEventListener('click', function () { runAction('device-info', false); });
        const clearBtn = document.getElementById('usb-maint-clear');
        if (clearBtn) clearBtn.addEventListener('click', function () { runAction('clear-media', true); });
        const toolBtn = document.getElementById('usb-maint-launch-tool');
        if (toolBtn) toolBtn.addEventListener('click', function () { launchVendorTool(); });
        const list = document.getElementById('usb-maint-devices');
        if (list) {
            list.addEventListener('click', function (e) {
                const row = e.target.closest('.usb-maint-device');
                if (!row) return;
                list.querySelectorAll('.usb-maint-device').forEach(function (el) {
                    el.classList.toggle('selected', el === row);
                });
            });
        }
    }

    function onTabShown() {
        refresh();
        if (pollTimer) clearInterval(pollTimer);
        pollTimer = setInterval(refresh, 8000);
    }

    function onTabHidden() {
        if (pollTimer) {
            clearInterval(pollTimer);
            pollTimer = null;
        }
    }

    global.UsbMaintenance = {
        bindUi: bindUi,
        onTabShown: onTabShown,
        onTabHidden: onTabHidden,
    };
}(window));
