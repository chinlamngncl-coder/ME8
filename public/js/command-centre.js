(function (global) {
    const EMBEDDED = !!document.getElementById('app-view-centre-summary');

    let popoutWin = null;

    function openCentreSummaryPopout() {
        const features = 'width=1600,height=900,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes';
        if (popoutWin && !popoutWin.closed) {
            try {
                popoutWin.focus();
                return;
            } catch (_) {
                popoutWin = null;
            }
        }
        popoutWin = window.open('/command-centre.html', 'mobility-centre-summary', features);
    }

    const EL_IDS = EMBEDDED ? {
        error: 'cs-error',
        loading: 'cs-loading',
        content: 'cs-content',
        generatedAt: 'cs-generated-at',
        statsGrid: 'cs-stats-grid',
        trendChart: 'cs-trend-chart',
        fleetRing: 'cs-fleet-ring',
        storageRing: 'cs-storage-ring',
        storageTable: 'cs-storage-table',
        servicesGrid: 'cs-services-grid',
        activityTable: 'cs-activity-table',
        btnExportCsv: 'cs-btn-export-csv',
        btnViewLocal: 'cs-btn-view-local',
        btnExportChart: 'cs-btn-export-chart',
        btnRefresh: 'cs-btn-refresh',
        btnPopout: 'cs-btn-popout',
        yearMonth: 'cs-year-month',
        llmStatus: 'cs-llm-status',
        llmChat: 'cs-llm-chat',
        llmInput: 'cs-llm-input',
        llmAsk: 'cs-llm-ask',
        llmSuggestions: 'cs-llm-suggestions',
        liveViewersTable: 'cs-live-viewers-table',
        btnLiveViewersRefresh: 'cs-btn-live-viewers-refresh',
    } : {
        error: 'error',
        loading: 'loading',
        content: 'content',
        generatedAt: 'generated-at',
        statsGrid: 'stats-grid',
        trendChart: 'trend-chart',
        fleetRing: 'fleet-ring',
        storageRing: 'storage-ring',
        storageTable: 'storage-table',
        servicesGrid: 'services-grid',
        activityTable: 'activity-table',
        btnExportCsv: 'btn-export-csv',
        btnViewLocal: 'btn-view-local',
        btnExportChart: 'btn-export-chart',
        btnRefresh: 'btn-refresh',
        yearMonth: 'year-month',
        llmStatus: 'llm-status',
        llmChat: 'llm-chat',
        llmInput: 'llm-input',
        llmAsk: 'llm-ask',
        llmSuggestions: 'llm-suggestions',
        liveViewersTable: 'live-viewers-table',
        btnLiveViewersRefresh: 'btn-live-viewers-refresh',
    };

    let summary = null;
    let activePeriod = 'weekly';
    let activeYearMonth = '';
    let started = false;
    let refreshTimer = null;

    function el(key) { return document.getElementById(EL_IDS[key] || key); }

    function tr(key, params) {
        if (typeof I18n !== 'undefined' && I18n.t) return I18n.t(key, params);
        return key;
    }

    function getLang() {
        if (typeof I18n !== 'undefined' && I18n.getLocale) return I18n.getLocale();
        return 'en';
    }

    function showError(err, data, fallbackKey) {
        const loading = el('loading');
        const content = el('content');
        const errEl = el('error');
        let msg;
        if (typeof err === 'string') {
            msg = err;
        } else if (global.OperatorUI && OperatorUI.opMsg) {
            msg = OperatorUI.opMsg(data, err, fallbackKey || 'centre.error.load');
        } else if (global.OperatorErrorVoice) {
            msg = OperatorErrorVoice.fromCatch(err, data, fallbackKey || 'centre.error.load');
        } else {
            msg = tr(fallbackKey || 'centre.error.load');
        }
        if (loading) loading.hidden = true;
        if (content) content.hidden = true;
        if (errEl) {
            errEl.hidden = false;
            errEl.textContent = msg;
        }
    }

    function fmtUptime(sec) {
        sec = Math.floor(Number(sec) || 0);
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        return h + 'h ' + m + 'm';
    }

    function esc(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    }

    function pct(part, total) {
        if (!total) return 0;
        return Math.round((part / total) * 100);
    }

    function ceilPct(part, total) {
        const p = Number(part) || 0;
        const t = Number(total) || 0;
        if (!t || !p) return 0;
        return Math.min(100, Math.ceil((p / t) * 100));
    }

    var ACTION_LABELS = {
        'auth.login': 'User login',
        'alarm.raise': 'Alarm raised',
        'sos.acknowledge': 'SOS acknowledged',
        'sos.ptt_team': 'SOS team call',
        'voice.call': 'Voice call',
        'voice.call.end': 'Voice call ended',
        'ptt.dispatch_group': 'PTT group joined',
        'ptt.dispatch_ungroup': 'PTT ungrouped',
        'bwc.registry.save': 'BWC list saved',
        'server.settings.save': 'Server settings saved',
        'docking.settings.save': 'Docking settings saved',
        'user.create': 'User created',
        'user.update': 'User updated',
        'dispatch_groups.save': 'Map groups saved',
        'dispatch_groups.import': 'Map groups imported',
        'evidence.download_request': 'Evidence download requested',
        'evidence.download_stream': 'Evidence downloaded',
        'device.remote_control': 'Remote device command',
    };

    function formatActionLabel(action) {
        const key = String(action || '').trim();
        if (!key) return '';
        if (ACTION_LABELS[key]) return ACTION_LABELS[key];
        return key.split(/[._]/).filter(Boolean).map(function (w) {
            return w.charAt(0).toUpperCase() + w.slice(1);
        }).join(' ');
    }

    function renderRing(containerId, percent, color, label) {
        const node = el(containerId);
        if (!node) return;
        const p = Math.max(0, Math.min(100, percent));
        const r = 42;
        const c = 2 * Math.PI * r;
        const dash = (p / 100) * c;
        node.innerHTML =
            '<div class="cs-ring-wrap">' +
            '<svg class="cs-ring-svg" viewBox="0 0 100 100" aria-hidden="true">' +
            '<circle class="cs-ring-bg" cx="50" cy="50" r="' + r + '"></circle>' +
            '<circle class="cs-ring-fg" cx="50" cy="50" r="' + r + '" stroke="' + color + '" ' +
            'stroke-dasharray="' + dash + ' ' + c + '" stroke-dashoffset="' + (c * 0.25) + '"></circle>' +
            '</svg>' +
            '<div class="cs-ring-center"><span class="cs-ring-pct">' + p + '%</span><span class="cs-ring-lbl">' + esc(label) + '</span></div>' +
            '</div>';
    }

    function renderStats(data) {
        const f = data.fleet || {};
        const s = data.sos || {};
        const st = data.storage || {};
        const capacity = f.capacity || 5000;
        const onlinePct = f.onlinePct != null ? f.onlinePct : ceilPct(f.online, capacity);
        const storagePct = st.usedPct != null ? st.usedPct : (st.totalBytes ? pct(st.totalBytes, (st.capacityGb || 500) * 1073741824) : 50);
        const grid = el('statsGrid');
        if (!grid) return;
        // Inline Lucide (ISC) outline icons — no emoji, no CDN, theme-coloured.
        const csIcon = function (name) {
            const paths = {
                wifi: '<path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.859a10 10 0 0 1 14 0"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/>',
                'wifi-off': '<path d="M12 20h.01"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/><path d="M5 12.859a10 10 0 0 1 5.17-2.69"/><path d="M19 12.859a10 10 0 0 0-2.007-1.523"/><path d="M2 8.82a15 15 0 0 1 4.177-2.643"/><path d="M22 8.82a15 15 0 0 0-11.288-3.764"/><path d="m2 2 20 20"/>',
                alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
                bars: '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
                drive: '<line x1="22" x2="2" y1="12" y2="12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><line x1="6" x2="6.01" y1="16" y2="16"/><line x1="10" x2="10.01" y1="16" y2="16"/>',
                clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
            };
            return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[name] || '') + '</svg>';
        };
        grid.innerHTML =
            '<div class="cs-kpi cs-kpi-green">' +
            '<div class="cs-kpi-icon">' + csIcon('wifi') + '</div>' +
            '<div class="cs-kpi-body"><div class="cs-kpi-label">' + esc(tr('centre.kpi.online')) + '</div>' +
            '<div class="cs-kpi-value">' + (f.online || 0) + '</div>' +
            '<div class="cs-kpi-hint">' + onlinePct + '% · ' + (f.online || 0) + ' / ' + capacity + ' ' + esc(tr('centre.kpi.capacity')) + '</div></div></div>' +
            '<div class="cs-kpi">' +
            '<div class="cs-kpi-icon">' + csIcon('wifi-off') + '</div>' +
            '<div class="cs-kpi-body"><div class="cs-kpi-label">' + esc(tr('centre.kpi.offline')) + '</div>' +
            '<div class="cs-kpi-value">' + (f.offline || 0) + '</div></div></div>' +
            '<div class="cs-kpi' + ((s.openNow || 0) > 0 ? ' cs-kpi-alert' : '') + '">' +
            '<div class="cs-kpi-icon">' + csIcon('alert') + '</div>' +
            '<div class="cs-kpi-body"><div class="cs-kpi-label">' + esc(tr('centre.kpi.openSos')) + '</div>' +
            '<div class="cs-kpi-value">' + (s.openNow || 0) + '</div>' +
            '<div class="cs-kpi-hint">' + esc(tr('centre.kpi.today')) + ': ' + (s.today || 0) + '</div></div></div>' +
            '<div class="cs-kpi">' +
            '<div class="cs-kpi-icon">' + csIcon('bars') + '</div>' +
            '<div class="cs-kpi-body"><div class="cs-kpi-label">' + esc(tr('centre.kpi.sosWeek')) + '</div>' +
            '<div class="cs-kpi-value">' + (s.week || 0) + '</div>' +
            '<div class="cs-kpi-hint">' + esc(tr('centre.kpi.month')) + ': ' + (s.month || 0) + '</div></div></div>' +
            '<div class="cs-kpi">' +
            '<div class="cs-kpi-icon">' + csIcon('drive') + '</div>' +
            '<div class="cs-kpi-body"><div class="cs-kpi-label">' + esc(tr('centre.kpi.storage')) + '</div>' +
            '<div class="cs-kpi-value cs-kpi-sm">' + esc(st.totalLabel || '—') + '</div></div></div>' +
            '<div class="cs-kpi">' +
            '<div class="cs-kpi-icon">' + csIcon('clock') + '</div>' +
            '<div class="cs-kpi-body"><div class="cs-kpi-label">' + esc(tr('centre.kpi.uptime')) + '</div>' +
            '<div class="cs-kpi-value cs-kpi-sm">' + fmtUptime(data.serverUptimeSec) + '</div></div></div>';

        renderRing('fleetRing', onlinePct, '#22c55e', tr('centre.ring.deviceOnline'));
        renderRing('storageRing', storagePct, '#38bdf8', tr('centre.kpi.storage'));
    }

    function getTrendBuckets(period) {
        if (!summary || !summary.trends) return [];
        if (period === 'yearly') {
            const yearly = summary.trends.yearly;
            if (!yearly || !yearly.byMonth) return [];
            const ym = activeYearMonth || yearly.defaultMonth;
            const trend = yearly.byMonth[ym];
            return trend && trend.buckets ? trend.buckets : [];
        }
        const trend = summary.trends[period];
        return trend && trend.buckets ? trend.buckets : [];
    }

    function renderChart(period) {
        const chartEl = el('trendChart');
        if (!chartEl) return;
        chartEl.innerHTML = '';
        const buckets = getTrendBuckets(period);
        if (!buckets.length) return;
        const max = Math.max(1, ...buckets.map(function (b) { return b.count || 0; }));
        buckets.forEach(function (b) {
            const wrap = document.createElement('div');
            wrap.className = 'cs-bar-wrap';
            const val = document.createElement('div');
            val.className = 'cs-bar-val';
            val.textContent = String(b.count || 0);
            const bar = document.createElement('div');
            bar.className = 'cs-bar';
            const h = Math.max(4, Math.round((b.count / max) * 100));
            bar.style.height = h + '%';
            bar.title = (b.label || '') + ': ' + (b.count || 0);
            const lab = document.createElement('div');
            lab.className = 'cs-bar-label';
            lab.textContent = b.label || '';
            wrap.appendChild(val);
            wrap.appendChild(bar);
            wrap.appendChild(lab);
            chartEl.appendChild(wrap);
        });
    }

    function storageAreaLabel(key) {
        const map = {
            storage: 'Storage',
            ftp: 'FTP',
            sosIncidents: 'SOS Incident',
            fleetLog: 'Mobility Log',
            facePlate: 'Face / Plate',
        };
        return map[key] || String(key || '');
    }

    function renderStorage(data) {
        const table = el('storageTable');
        if (!table) return;
        const tbody = table.querySelector ? table.querySelector('tbody') : table;
        if (!tbody) return;
        const rows = (data.storage && data.storage.breakdown) || [];
        tbody.innerHTML = rows.map(function (row) {
            const share = data.storage.totalBytes ? pct(row.bytes, data.storage.totalBytes) : 0;
            const area = row.area || storageAreaLabel(row.key);
            return '<tr><td>' + esc(area) + '</td><td class="mono">' + esc(row.label) + '</td>' +
                '<td><div class="cs-meter"><div class="cs-meter-fill" style="width:' + share + '%"></div></div> ' + share + '%</td></tr>';
        }).join('');
    }

    function renderServices(data) {
        const grid = el('servicesGrid');
        if (!grid) return;
        const svc = data.services || {};
        const f = data.fleet || {};
        const tiles = [
            { key: 'SIP', ok: !!svc.sipPortStatus, label: tr('centre.svc.sip') },
            { key: 'PTT', ok: !!svc.pttPortStatus, label: tr('centre.svc.ptt') },
            { key: 'Devices', ok: (f.online || 0) > 0, label: tr('centre.svc.devices'), state: (f.online || 0) + ' ' + tr('common.online').toLowerCase() },
        ];
        grid.innerHTML = tiles.map(function (t) {
            return '<div class="cs-svc-tile' + (t.ok ? ' ok' : ' bad') + '">' +
                '<span class="cs-svc-dot"></span>' +
                '<span class="cs-svc-name">' + esc(t.label) + '</span>' +
                '<span class="cs-svc-state">' + esc(t.state || (t.ok ? tr('centre.svc.active') : tr('centre.svc.down'))) + '</span></div>';
        }).join('');
    }

    function renderActivity(data) {
        const table = el('activityTable');
        if (!table) return;
        const tbody = table.querySelector ? table.querySelector('tbody') : table;
        if (!tbody) return;
        const rows = data.recentActivity || [];
        tbody.innerHTML = rows.length ? rows.map(function (a) {
            return '<tr><td class="mono">' + esc(a.at ? new Date(a.at).toLocaleString() : '') + '</td>' +
                '<td>' + esc(a.actionLabel || formatActionLabel(a.action)) + '</td><td>' + esc(a.target || '') + '</td>' +
                '<td>' + esc(a.user || '') + '</td></tr>';
        }).join('') : '<tr><td colspan="4" class="hint">' + esc(tr('centre.activity.empty')) + '</td></tr>';
    }

    function monthSelectLabel(ym) {
        const parts = String(ym || '').split('-');
        if (parts.length < 2) return ym;
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (!y || !m) return ym;
        return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    }

    function populateYearMonthSelect() {
        const select = el('yearMonth');
        if (!select || !summary || !summary.trends || !summary.trends.yearly) return;
        const yearly = summary.trends.yearly;
        const months = yearly.months || [];
        if (!months.length) {
            select.hidden = true;
            return;
        }
        if (!activeYearMonth || months.indexOf(activeYearMonth) < 0) {
            activeYearMonth = yearly.defaultMonth || months[months.length - 1];
        }
        select.innerHTML = months.map(function (ym) {
            return '<option value="' + esc(ym) + '"' + (ym === activeYearMonth ? ' selected' : '') + '>' +
                esc(monthSelectLabel(ym)) + '</option>';
        }).join('');
        select.hidden = activePeriod !== 'yearly';
    }

    function setPeriod(period) {
        activePeriod = period;
        const root = EMBEDDED ? document.getElementById('app-view-centre-summary') : document;
        if (!root) return;
        root.querySelectorAll('[data-period]').forEach(function (btn) {
            btn.classList.toggle('cs-active', btn.getAttribute('data-period') === period);
        });
        populateYearMonthSelect();
        const select = el('yearMonth');
        if (select) select.hidden = period !== 'yearly';
        renderChart(period);
    }

    let llmPollTimer = null;

    function isLlmBusy(status) {
        return !!(status && (status.downloading || status.installing || status.loading));
    }

    function isLlmOnline(status) {
        return !!(status && status.ok && status.modelReady && !status.loading
            && !status.downloading && !status.installing);
    }

    function setLlmAskEnabled(on) {
        const btn = el('llmAsk');
        if (btn) btn.disabled = !on;
    }

    function llmStatusLabel(status) {
        if (!status) return tr('centre.llm.offline');
        if (status.installing) {
            const pct = typeof status.downloadPct === 'number' ? status.downloadPct : null;
            if (pct != null && pct > 0) {
                return tr('centre.llm.installingPct', { pct: pct });
            }
            return tr('centre.llm.installing');
        }
        if (status.downloading) {
            const pct = typeof status.downloadPct === 'number' ? status.downloadPct : null;
            if (pct != null && pct > 0) {
                return tr('centre.llm.downloadingPct', { pct: pct });
            }
            return tr('centre.llm.downloading');
        }
        if (status.loading) return tr('centre.llm.loading');
        if (status.needsInstall || (status.ok === false && !status.modelReady && !status.error)) {
            return tr('centre.llm.modelMissing');
        }
        if (!status.modelReady && status.ok && status.hint) {
            return tr('centre.llm.willDownload');
        }
        return tr('centre.llm.offline');
    }

    function renderLlmStatus(status) {
        const node = el('llmStatus');
        if (!node) return;
        if (isLlmBusy(status)) {
            if (!llmPollTimer) llmPollTimer = setInterval(loadLlmStatus, 1000);
        } else if (llmPollTimer) {
            clearInterval(llmPollTimer);
            llmPollTimer = null;
        }
        if (isLlmOnline(status)) {
            node.className = 'cs-llm-status online';
            node.textContent = tr('centre.llm.online');
            setLlmAskEnabled(true);
            return;
        }
        node.className = 'cs-llm-status offline';
        node.textContent = llmStatusLabel(status);
        setLlmAskEnabled(false);
    }

    function appendChat(role, text) {
        const chat = el('llmChat');
        if (!chat) return;
        const row = document.createElement('div');
        row.className = 'cs-chat-row cs-chat-' + role;
        row.innerHTML = '<div class="cs-chat-bubble">' + esc(text).replace(/\n/g, '<br>') + '</div>';
        chat.appendChild(row);
        chat.scrollTop = chat.scrollHeight;
    }

    function loadLlmStatus() {
        return fetch('/api/command-centre/llm-status', { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(renderLlmStatus)
            .catch(function () {
                renderLlmStatus({ ok: false });
            });
    }

    function askLlm() {
        const input = el('llmInput');
        const btn = el('llmAsk');
        const q = input && input.value ? input.value.trim() : '';
        if (!q) return;
        appendChat('user', q);
        if (input) input.value = '';
        if (btn) btn.disabled = true;
        fetch('/api/command-centre/ask', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: q, lang: getLang() }),
        })
            .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
            .then(function (res) {
                if (!res.ok || !res.data || !res.data.ok) {
                    throw new Error((res.data && res.data.error) || tr('centre.llm.failed'));
                }
                appendChat('assistant', res.data.answer);
            })
            .catch(function (err) {
                appendChat('assistant', err.message || tr('centre.llm.failed'));
            })
            .finally(function () {
                if (btn) btn.disabled = false;
            });
    }

    function exportChartPng() {
        const chartEl = el('trendChart');
        if (!chartEl || !summary) return;
        const buckets = getTrendBuckets(activePeriod);
        const canvas = document.createElement('canvas');
        const chartTitle = activePeriod === 'yearly' && activeYearMonth
            ? tr('centre.chart.title') + ' — ' + monthSelectLabel(activeYearMonth)
            : tr('centre.chart.title') + ' (' + activePeriod + ')';
        canvas.width = Math.max(640, Math.min(1200, 80 + buckets.length * 22));
        canvas.height = 320;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 16px Inter, system-ui, sans-serif';
        ctx.fillText(chartTitle, 24, 32);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px Inter, system-ui, sans-serif';
        ctx.fillText(new Date(summary.generatedAt).toLocaleString(), 24, 52);
        const max = Math.max(1, ...buckets.map(function (b) { return b.count || 0; }));
        const padL = 48;
        const padB = 48;
        const padT = 72;
        const w = canvas.width - padL - 24;
        const h = canvas.height - padB - padT;
        const barW = Math.max(8, Math.floor(w / Math.max(buckets.length, 1)) - 6);
        buckets.forEach(function (b, i) {
            const bh = Math.max(4, Math.round(((b.count || 0) / max) * h));
            const x = padL + i * (barW + 6);
            const y = padT + (h - bh);
            const grad = ctx.createLinearGradient(0, y, 0, y + bh);
            grad.addColorStop(0, '#f87171');
            grad.addColorStop(1, '#b91c1c');
            ctx.fillStyle = grad;
            ctx.fillRect(x, y, barW, bh);
            ctx.fillStyle = '#e2e8f0';
            ctx.font = '10px Inter, system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(String(b.count || 0), x + barW / 2, y - 4);
            ctx.fillStyle = '#64748b';
            ctx.font = '9px Inter, system-ui, sans-serif';
            const lbl = String(b.label || '').slice(0, 8);
            ctx.fillText(lbl, x + barW / 2, canvas.height - 18);
        });
        const a = document.createElement('a');
        const stamp = new Date().toISOString().slice(0, 10);
        a.download = activePeriod === 'yearly' && activeYearMonth
            ? 'centre-summary-yearly-' + activeYearMonth + '-' + stamp + '.png'
            : 'centre-summary-' + activePeriod + '-' + stamp + '.png';
        a.href = canvas.toDataURL('image/png');
        a.click();
    }

    function loadLiveViewers() {
        const tableEl = el('liveViewersTable');
        if (!tableEl || !global.LiveViewerTelemetry) return;
        LiveViewerTelemetry.loadInto(tableEl, { useTechApi: false });
    }

    function load(force) {
        if (!force && summary) {
            const loading = el('loading');
            if (loading) loading.hidden = true;
            const content = el('content');
            if (content) content.hidden = false;
            if (global.TabLifecycle) TabLifecycle.markLoaded('centre-summary');
            return Promise.resolve();
        }
        const loading = el('loading');
        if (loading) loading.hidden = false;
        return fetch('/api/command-centre/summary', { credentials: 'same-origin' })
            .then(function (r) {
                if (r.status === 401 || r.status === 403) {
                    throw new Error(tr('centre.error.auth'));
                }
                return r.json();
            })
            .then(function (data) {
                if (!data || !data.ok) throw new Error((data && data.error) || tr('centre.error.load'));
                summary = data;
                if (loading) loading.hidden = true;
                const content = el('content');
                if (content) content.hidden = false;
                const gen = el('generatedAt');
                if (gen) gen.textContent = tr('centre.updated') + ' ' + new Date(data.generatedAt).toLocaleString();
                renderStats(data);
                renderStorage(data);
                renderServices(data);
                renderActivity(data);
                if (data.trends && data.trends.yearly && data.trends.yearly.defaultMonth) {
                    if (!activeYearMonth) activeYearMonth = data.trends.yearly.defaultMonth;
                }
                populateYearMonthSelect();
                setPeriod(activePeriod);
                loadLlmStatus();
                loadLiveViewers();
                if (global.TabLifecycle) TabLifecycle.markLoaded('centre-summary');
            })
            .catch(function (err) {
                console.warn('[centre-summary]', err);
                showError(err, err.opPayload || err.catalogPayload, 'centre.error.load');
            });
    }

    function bindUi() {
        const root = EMBEDDED ? document.getElementById('app-view-centre-summary') : document;
        if (!root) return;
        root.querySelectorAll('[data-period]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                setPeriod(btn.getAttribute('data-period'));
            });
        });
        const monthSel = el('yearMonth');
        if (monthSel) {
            monthSel.addEventListener('change', function () {
                activeYearMonth = monthSel.value;
                if (activePeriod === 'yearly') renderChart('yearly');
            });
        }
        const csvBtn = el('btnExportCsv');
        if (csvBtn) {
            csvBtn.addEventListener('click', function () {
                window.location.href = '/api/command-centre/export?period=' + encodeURIComponent(activePeriod) + '&format=csv';
            });
        }
        const viewLocalBtn = el('btnViewLocal');
        if (viewLocalBtn) {
            viewLocalBtn.addEventListener('click', function () {
                window.open('/command-centre.html', '_blank', 'noopener');
            });
        }
        const chartBtn = el('btnExportChart');
        if (chartBtn) chartBtn.addEventListener('click', exportChartPng);
        const refreshBtn = el('btnRefresh');
        if (refreshBtn) refreshBtn.addEventListener('click', function () { load(true); });
        const lvRefresh = el('btnLiveViewersRefresh');
        if (lvRefresh) lvRefresh.addEventListener('click', loadLiveViewers);
        const popoutBtn = el('btnPopout');
        if (popoutBtn) popoutBtn.addEventListener('click', openCentreSummaryPopout);
        const askBtn = el('llmAsk');
        if (askBtn) askBtn.addEventListener('click', askLlm);
        const input = el('llmInput');
        if (input) {
            input.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    askLlm();
                }
            });
        }
        const sug = el('llmSuggestions');
        if (sug && !sug._llmSugBound) {
            sug._llmSugBound = true;
            sug.addEventListener('click', function (e) {
                const btn = e.target.closest('[data-llm-q]');
                if (!btn) return;
                const q = btn.getAttribute('data-llm-q');
                const inp = el('llmInput');
                if (inp && q) {
                    inp.value = tr(q);
                    inp.focus();
                }
            });
        }
    }

    function renderSuggestions() {
        const sug = el('llmSuggestions');
        if (!sug) return;
        const keys = ['centre.llm.q1', 'centre.llm.q2'];
        sug.innerHTML = keys.map(function (k) {
            return '<button type="button" class="cs-sug-btn" data-llm-q="' + k + '">' + esc(tr(k)) + '</button>';
        }).join('');
    }

    function startApp(opts) {
        opts = opts || {};
        if (started) {
            if (!opts.force && summary) return;
            load(!!opts.force);
            return;
        }
        started = true;
        bindUi();
        renderSuggestions();
        const chat = el('llmChat');
        if (chat) {
            appendChat('assistant', tr('centre.llm.welcome'));
        }
        load(!!opts.force);
        if (refreshTimer) clearInterval(refreshTimer);
        refreshTimer = setInterval(load, 60000);
        window.addEventListener('fm-i18n-changed', function () {
            if (summary) {
                renderStats(summary);
                renderStorage(summary);
                renderServices(summary);
                renderActivity(summary);
                renderSuggestions();
            }
        });
    }

    function bootEmbedded() {
        window.CentreSummary = { init: startApp };
    }

    function bootStandalone() {
        fetch('/api/auth/session', { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (!data || !data.ok) {
                    window.location.href = '/login.html';
                    return;
                }
                if (!data.canManageServer) {
                    showError(tr('centre.error.auth'));
                    return;
                }
                startApp();
            })
            .catch(function () {
                window.location.href = '/login.html';
            });
    }

    if (EMBEDDED) {
        bootEmbedded();
    } else {
        bootStandalone();
    }
})(window);
