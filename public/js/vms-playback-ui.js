/**
 * VMS Forensic Playback UI — vms-playback-ui.js
 *
 * Timeline interaction:
 *   Left-click  = set RANGE START marker (green)
 *   Right-click = set RANGE END marker (orange)
 *   Click on a complete segment without shift = load that segment for playback
 *   ESC key = clear range markers
 *
 * Add to Case:  POST rough {start_at, end_at, segmentId, camId} → /api/vms/cases/:id/items
 * Refine Clip:  POST {startSec, endSec} → /api/vms/segments/:id/trim → creates Evidence file
 */
(function () {
    'use strict';

    /* ── Constants ───────────────────────────────────────────────────────────── */
    const TIMELINE_H    = 80;
    const SEGMENT_Y     = 32;
    const SEGMENT_H     = 30;
    const ALARM_Y       = 8;
    const ALARM_H       = 18;
    const MIN_RANGE_MS  = 3000;  // 3 s minimum rough snip

    /* ── State ───────────────────────────────────────────────────────────────── */
    let state = {
        camId:         null,
        camName:       '',
        from:          null,
        to:            null,
        segments:      [],
        alarms:        [],
        activeSegment: null,
        rangeStartMs:  null,
        rangeEndMs:    null,
        loading:       false,
        caseItems:     [],
        activeCaseId:  null,
    };

    let els = {};

    /* ── Utilities ───────────────────────────────────────────────────────────── */
    function isoToMs(s)  { return s ? new Date(s).getTime() : 0; }
    function msToHms(ms) {
        const s = Math.floor(Math.abs(ms) / 1000);
        const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
        return (h ? h + ':' : '') + String(m).padStart(h ? 2 : 1, '0') + ':' + String(sec).padStart(2, '0');
    }
    function localIsoForInput(d) {
        return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    }
    function setStatus(msg, isErr) {
        if (!els.status) return;
        els.status.textContent = msg;
        els.status.style.color = isErr ? '#f87171' : '#94a3b8';
    }
    function timeAtRatio(ratio) {
        if (!state.from || !state.to) return null;
        return new Date(state.from.getTime() + ratio * (state.to - state.from));
    }
    function ratioForMs(ms) {
        if (!state.from || !state.to) return 0;
        return (ms - state.from.getTime()) / (state.to.getTime() - state.from.getTime());
    }

    /* ── Camera tree ─────────────────────────────────────────────────────────── */
    async function loadCameraTree() {
        try {
            const r = await fetch('/api/vms/tree', { credentials: 'same-origin' });
            const d = await r.json();
            if (!d.ok) throw new Error(d.error || 'tree error');
            const sel = els.camSelect;
            if (!sel) return;
            sel.innerHTML = '<option value="">— select camera —</option>';
            (d.tree || []).forEach((site) => {
                (site.zones || []).forEach((zone) => {
                    (zone.cameras || []).forEach((cam) => {
                        const opt = document.createElement('option');
                        opt.value = cam.id;
                        opt.textContent = (site.name ? site.name + ' › ' : '') +
                            (zone.name ? zone.name + ' › ' : '') + cam.name;
                        sel.appendChild(opt);
                    });
                });
            });
        } catch (e) {
            setStatus('Camera load error: ' + e.message, true);
        }
    }

    /* ── Timeline fetch ──────────────────────────────────────────────────────── */
    async function fetchTimeline() {
        const { camId, from, to } = state;
        if (!camId || !from || !to) { setStatus('Select a camera and time window.', false); return; }
        if ((to - from) < 5 * 60 * 1000) { setStatus('Time window too small (min 5 min).', true); return; }
        state.loading = true;
        setStatus('Loading timeline…', false);
        try {
            const url = `/api/vms/cameras/${encodeURIComponent(camId)}/timeline` +
                `?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`;
            const r = await fetch(url, { credentials: 'same-origin' });
            const d = await r.json();
            if (!d.ok) throw new Error(d.error || 'timeline error');
            state.segments = d.segments || [];
            state.alarms   = d.alarms   || [];
            state.rangeStartMs = null;
            state.rangeEndMs   = null;
            setStatus(state.segments.length + ' segment(s), ' + state.alarms.length + ' alarm(s).', false);
            drawTimeline();
            updateRangeDisplay();
        } catch (e) {
            setStatus('Timeline error: ' + e.message, true);
        } finally {
            state.loading = false;
        }
    }

    /* ── Canvas drawing ──────────────────────────────────────────────────────── */
    function drawTimeline() {
        const canvas = els.canvas;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W   = canvas.offsetWidth || 880;
        canvas.width  = W;
        canvas.height = TIMELINE_H;

        const fromMs = state.from ? state.from.getTime() : 0;
        const toMs   = state.to   ? state.to.getTime()   : fromMs + 3600000;
        const span   = toMs - fromMs || 1;
        const xFor   = (ms) => Math.round((ms - fromMs) / span * W);

        /* Background */
        ctx.fillStyle = '#0a1020';
        ctx.fillRect(0, 0, W, TIMELINE_H);

        /* Hour grid */
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        let t = Math.ceil(fromMs / 3600000) * 3600000;
        while (t <= toMs) {
            const x = xFor(t);
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, TIMELINE_H); ctx.stroke();
            ctx.fillStyle = '#475569';
            ctx.font = '9px system-ui';
            ctx.fillText(new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), x + 2, TIMELINE_H - 4);
            t += 3600000;
        }

        /* Stripe pattern for recording */
        const pat = (() => {
            const sc = document.createElement('canvas');
            sc.width = 8; sc.height = 8;
            const sx = sc.getContext('2d');
            sx.fillStyle = '#1e40af'; sx.fillRect(0, 0, 8, 8);
            sx.strokeStyle = '#3b82f6'; sx.lineWidth = 2;
            sx.beginPath(); sx.moveTo(0, 8); sx.lineTo(8, 0); sx.stroke();
            return ctx.createPattern(sc, 'repeat');
        })();

        /* Segments */
        state.segments.forEach((seg) => {
            const x1  = xFor(isoToMs(seg.start_at));
            const x2  = xFor(isoToMs(seg.end_at));
            const w   = Math.max(2, x2 - x1);
            const act = state.activeSegment && state.activeSegment.segmentId === seg.segmentId;
            ctx.fillStyle = seg.status === 'recording' ? pat : (act ? '#60a5fa' : '#2563eb');
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(x1, SEGMENT_Y, w, SEGMENT_H, 3);
            else ctx.rect(x1, SEGMENT_Y, w, SEGMENT_H);
            ctx.fill();
            if (act) {
                ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = 2;
                ctx.beginPath();
                if (ctx.roundRect) ctx.roundRect(x1, SEGMENT_Y, w, SEGMENT_H, 3);
                else ctx.rect(x1, SEGMENT_Y, w, SEGMENT_H);
                ctx.stroke();
            }
            if (w > 48) {
                const durMs = isoToMs(seg.end_at) - isoToMs(seg.start_at);
                ctx.fillStyle = '#dbeafe'; ctx.font = '10px system-ui';
                ctx.fillText(msToHms(durMs), x1 + 4, SEGMENT_Y + 13);
            }
        });

        /* Alarm spikes */
        state.alarms.forEach((al) => {
            const x = xFor(isoToMs(al.occurred_at));
            ctx.fillStyle = '#ef4444';
            ctx.beginPath(); ctx.moveTo(x, ALARM_Y + ALARM_H); ctx.lineTo(x - 5, ALARM_Y); ctx.lineTo(x + 5, ALARM_Y); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#fca5a5'; ctx.lineWidth = 1; ctx.stroke();
        });

        /* Range shading */
        if (state.rangeStartMs != null) {
            const rx1 = xFor(state.rangeStartMs);
            const rx2 = state.rangeEndMs != null ? xFor(state.rangeEndMs) : rx1;
            const rl  = Math.min(rx1, rx2), rw = Math.abs(rx2 - rx1);
            ctx.fillStyle = 'rgba(34, 197, 94, 0.15)';
            ctx.fillRect(rl, 0, rw || 2, TIMELINE_H);
            /* Start marker (green) */
            ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(rx1, 0); ctx.lineTo(rx1, TIMELINE_H); ctx.stroke();
            /* Label */
            ctx.fillStyle = '#22c55e'; ctx.font = 'bold 10px system-ui';
            ctx.fillText('S', rx1 + 2, 12);
        }
        if (state.rangeEndMs != null) {
            const rx2 = xFor(state.rangeEndMs);
            ctx.strokeStyle = '#f97316'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(rx2, 0); ctx.lineTo(rx2, TIMELINE_H); ctx.stroke();
            ctx.fillStyle = '#f97316'; ctx.font = 'bold 10px system-ui';
            ctx.fillText('E', rx2 + 2, 12);
        }

        /* Playhead */
        if (state.activeSegment && els.video && !els.video.paused) {
            const px = xFor(isoToMs(state.activeSegment.start_at) + els.video.currentTime * 1000);
            ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, TIMELINE_H); ctx.stroke();
        }
    }

    /* ── Range display / Add-to-Case enable ──────────────────────────────────── */
    function updateRangeDisplay() {
        const hasRange = state.rangeStartMs != null && state.rangeEndMs != null
            && (state.rangeEndMs - state.rangeStartMs) >= MIN_RANGE_MS;
        if (els.rangeInfo) {
            if (state.rangeStartMs == null) {
                els.rangeInfo.textContent = 'Left-click = set Start. Right-click = set End.';
            } else if (state.rangeEndMs == null) {
                els.rangeInfo.textContent = 'Start: ' + new Date(state.rangeStartMs).toLocaleTimeString()
                    + ' — Right-click to set End';
            } else {
                const dur = state.rangeEndMs - state.rangeStartMs;
                els.rangeInfo.textContent = new Date(state.rangeStartMs).toLocaleTimeString()
                    + ' → ' + new Date(state.rangeEndMs).toLocaleTimeString()
                    + '  (' + msToHms(dur) + ')';
            }
        }
        if (els.addToCase) els.addToCase.disabled = !hasRange || !state.activeCaseId;
        /* Populate refine if there is an active segment */
        updateRefinePanel();
    }

    /* ── Timeline click handler ──────────────────────────────────────────────── */
    function onTimelineClick(e) {
        e.preventDefault();
        const canvas = els.canvas;
        if (!canvas || !state.from || !state.to) return;
        const rect  = canvas.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        const clickMs = state.from.getTime() + ratio * (state.to.getTime() - state.from.getTime());

        if (e.button === 2 || e.type === 'contextmenu') {
            /* Right-click = set END marker */
            if (state.rangeStartMs != null && clickMs > state.rangeStartMs) {
                state.rangeEndMs = clickMs;
            } else if (state.rangeStartMs != null) {
                setStatus('End must be after Start.', true);
            }
        } else {
            /* Left-click: if shift, set end; else set start (reset end) */
            if (e.shiftKey && state.rangeStartMs != null && clickMs > state.rangeStartMs) {
                state.rangeEndMs = clickMs;
            } else {
                /* Load segment if clicking inside a complete segment (no range yet) */
                const seg = state.segments.find((s) =>
                    s.status === 'complete' &&
                    isoToMs(s.start_at) <= clickMs && clickMs <= isoToMs(s.end_at)
                );
                if (seg && state.rangeStartMs == null) {
                    const offsetSec = (clickMs - isoToMs(seg.start_at)) / 1000;
                    loadSegment(seg, offsetSec);
                }
                /* Set start marker */
                state.rangeStartMs = clickMs;
                state.rangeEndMs   = null;
            }
        }
        drawTimeline();
        updateRangeDisplay();
    }

    /* ── ESC to clear range ──────────────────────────────────────────────────── */
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            state.rangeStartMs = null;
            state.rangeEndMs   = null;
            drawTimeline();
            updateRangeDisplay();
        }
    });

    /* ── Video loader ────────────────────────────────────────────────────────── */
    function loadSegment(seg, seekSec) {
        state.activeSegment = seg;
        const video = els.video;
        if (!video) return;
        video.src = `/api/vms/segments/${encodeURIComponent(seg.segmentId)}/stream`;
        video.load();
        video.addEventListener('canplay', function once() {
            video.removeEventListener('canplay', once);
            if (seekSec > 0) video.currentTime = seekSec;
            video.play().catch(() => {});
        }, { once: true });
        setStatus('Clip loaded' + (seekSec ? (' @' + msToHms(seekSec * 1000)) : ''), false);
        updateRefinePanel();
        drawTimeline();
    }

    /* ── Refine (trim) panel ─────────────────────────────────────────────────── */
    function updateRefinePanel() {
        const panel = els.refinePanel;
        if (!panel) return;
        if (!state.activeSegment) { panel.hidden = true; return; }
        panel.hidden = false;

        /* Pre-fill from range if available */
        const segStartMs = isoToMs(state.activeSegment.start_at);
        if (els.refineStart && state.rangeStartMs != null) {
            const s = Math.max(0, (state.rangeStartMs - segStartMs) / 1000);
            els.refineStart.value = s.toFixed(1);
        }
        if (els.refineEnd && state.rangeEndMs != null) {
            const e2 = Math.max(0, (state.rangeEndMs - segStartMs) / 1000);
            els.refineEnd.value = e2.toFixed(1);
        }
        if (els.refineLabel) {
            var a = state.activeSegment.start_at ? new Date(state.activeSegment.start_at) : null;
            var b = state.activeSegment.end_at ? new Date(state.activeSegment.end_at) : null;
            if (a && b && !isNaN(a.getTime()) && !isNaN(b.getTime())) {
                els.refineLabel.textContent = 'Clip · ' + a.toLocaleTimeString() + ' – ' + b.toLocaleTimeString();
            } else {
                els.refineLabel.textContent = 'Clip';
            }
        }
    }

    async function onRefineClip() {
        const seg = state.activeSegment;
        if (!seg || seg.status === 'recording') {
            setStatus('Cannot trim a recording-in-progress segment.', true); return;
        }
        const startSec = parseFloat(els.refineStart && els.refineStart.value) || 0;
        const endSec   = parseFloat(els.refineEnd   && els.refineEnd.value)   || 0;
        if (endSec <= startSec) { setStatus('End must be after Start.', true); return; }

        if (els.refineBtn) { els.refineBtn.disabled = true; els.refineBtn.textContent = 'Extracting…'; }
        setStatus('Extracting clip — please wait…', false);
        try {
            const r = await fetch(`/api/vms/segments/${encodeURIComponent(seg.segmentId)}/trim`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ startSec, endSec }),
            });
            const d = await r.json();
            if (!d.ok) throw new Error(d.error || 'trim error');
            setStatus('Clip extracted → Evidence Hub file: ' + d.clip.fileId, false);
            if (els.refineResult) {
                els.refineResult.hidden = false;
                els.refineResult.innerHTML =
                    '<strong>Clip ready in Evidence Hub</strong><br>' +
                    'File ID: <code>' + d.clip.fileId + '</code><br>' +
                    '<a href="/index.html#evidence-hub" target="_blank" style="color:#60a5fa">Open Evidence Hub ›</a>';
            }
        } catch (e) {
            setStatus('Trim failed: ' + e.message, true);
        } finally {
            if (els.refineBtn) { els.refineBtn.disabled = false; els.refineBtn.textContent = 'Extract Clip'; }
        }
    }

    /* ── Add to Case ─────────────────────────────────────────────────────────── */
    async function onAddToCase() {
        const caseId = els.caseIdInput ? els.caseIdInput.value.trim() : '';
        if (!caseId) { setStatus('Enter a Case ID first.', true); return; }
        if (!state.rangeStartMs || !state.rangeEndMs) { setStatus('Set Start and End markers first.', true); return; }

        /* Find which segment contains the range start */
        const seg = state.segments.find((s) =>
            isoToMs(s.start_at) <= state.rangeStartMs && state.rangeEndMs <= isoToMs(s.end_at)
        ) || state.segments.find((s) => isoToMs(s.start_at) <= state.rangeStartMs);

        const payload = {
            source_type: 'fixed',
            source_id:   seg ? seg.segmentId : null,
            start_at:    new Date(state.rangeStartMs).toISOString(),
            end_at:      new Date(state.rangeEndMs).toISOString(),
            metadata_json: JSON.stringify({
                camId:   state.camId,
                camName: state.camName,
                rough:   true,
            }),
        };

        if (els.addToCase) { els.addToCase.disabled = true; els.addToCase.textContent = 'Adding…'; }
        try {
            const r = await fetch(`/api/vms/cases/${encodeURIComponent(caseId)}/items`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const d = await r.json();
            if (!d.ok) throw new Error(d.error || 'case error');
            setStatus('Rough clip added to case ' + caseId, false);
            state.activeCaseId = caseId;
            await loadCaseItems(caseId);
            /* Clear markers after successful add */
            state.rangeStartMs = null; state.rangeEndMs = null;
            drawTimeline(); updateRangeDisplay();
        } catch (e) {
            setStatus('Add to case failed: ' + e.message, true);
        } finally {
            if (els.addToCase) { els.addToCase.textContent = '＋ Add to Case'; updateRangeDisplay(); }
        }
    }

    /* ── Case Items panel ────────────────────────────────────────────────────── */
    async function loadCaseItems(caseId) {
        if (!caseId || !els.caseItemsList) return;
        try {
            const r = await fetch(`/api/vms/cases/${encodeURIComponent(caseId)}/items`, { credentials: 'same-origin' });
            const d = await r.json();
            if (!d.ok) throw new Error(d.error || 'items error');
            state.caseItems = d.items || [];
            renderCaseItems();
        } catch (e) {
            if (els.caseItemsList) els.caseItemsList.innerHTML = '<li style="color:#f87171">Could not load items: ' + e.message + '</li>';
        }
    }

    function renderCaseItems() {
        const list = els.caseItemsList;
        if (!list) return;
        list.innerHTML = '';
        if (!state.caseItems.length) {
            list.innerHTML = '<li style="color:#475569">No items yet.</li>'; return;
        }
        state.caseItems.forEach((item) => {
            const li = document.createElement('li');
            li.className = 'vms-case-item';
            const label = document.createElement('span');
            label.textContent = ((typeof UiFormatter !== 'undefined' && UiFormatter.formatEventTag)
                ? UiFormatter.formatEventTag(item.source_type || 'item')
                : String(item.source_type || 'item')) + '  ' +
                (item.start_at ? new Date(item.start_at).toLocaleTimeString() : '—') + ' → ' +
                (item.end_at   ? new Date(item.end_at).toLocaleTimeString()   : '—');
            li.appendChild(label);

            if (item.source_type === 'fixed' && item.source_id) {
                const refineBtn = document.createElement('button');
                refineBtn.className = 'btn-refine';
                refineBtn.textContent = 'Refine Clip';
                refineBtn.addEventListener('click', () => {
                    /* Load the segment into the player first, then open refine panel */
                    const seg = state.segments.find((s) => s.segmentId === item.source_id);
                    if (seg) {
                        /* Pre-fill range from item times */
                        state.rangeStartMs = isoToMs(item.start_at);
                        state.rangeEndMs   = isoToMs(item.end_at);
                        loadSegment(seg, 0);
                        drawTimeline(); updateRangeDisplay();
                        if (els.refinePanel) {
                            els.refinePanel.scrollIntoView({ behavior: 'smooth' });
                        }
                    } else {
                        setStatus('Load the timeline first, then refine.', true);
                    }
                });
                li.appendChild(refineBtn);
            }
            list.appendChild(li);
        });
    }

    /* ── Playhead ticker ─────────────────────────────────────────────────────── */
    let playheadTimer = null;
    function startTick() { if (!playheadTimer) playheadTimer = setInterval(() => { if (els.video && !els.video.paused) drawTimeline(); }, 1000); }
    function stopTick()  { if (playheadTimer) { clearInterval(playheadTimer); playheadTimer = null; } }

    /* ── Event binding ───────────────────────────────────────────────────────── */
    function bind() {
        els.camSelect  && els.camSelect.addEventListener('change', () => {
            const opt = els.camSelect.options[els.camSelect.selectedIndex];
            state.camId = els.camSelect.value;
            state.camName = opt ? opt.textContent : '';
            state.segments = []; state.alarms = [];
            state.activeSegment = null;
            state.rangeStartMs = null; state.rangeEndMs = null;
            if (els.video) els.video.src = '';
            drawTimeline(); updateRangeDisplay();
        });
        els.fromInput && els.fromInput.addEventListener('change', () => { state.from = els.fromInput.value ? new Date(els.fromInput.value) : null; });
        els.toInput   && els.toInput.addEventListener('change',   () => { state.to   = els.toInput.value   ? new Date(els.toInput.value)   : null; });
        els.loadBtn   && els.loadBtn.addEventListener('click', fetchTimeline);

        if (els.canvas) {
            els.canvas.addEventListener('click',       onTimelineClick);
            els.canvas.addEventListener('contextmenu', onTimelineClick);
            const ro = new ResizeObserver(drawTimeline);
            ro.observe(els.canvas);
        }

        if (els.video) {
            els.video.addEventListener('play',  startTick);
            els.video.addEventListener('pause', stopTick);
            els.video.addEventListener('ended', stopTick);
            els.video.addEventListener('timeupdate', () => {
                if (els.timeDisplay && state.activeSegment) {
                    const absMs = isoToMs(state.activeSegment.start_at) + els.video.currentTime * 1000;
                    els.timeDisplay.textContent = new Date(absMs).toLocaleTimeString();
                }
            });
            els.video.addEventListener('loadstart', () => {
                const ov = document.getElementById('vms-empty-overlay');
                if (ov) ov.style.display = 'none';
            });
        }

        els.addToCase && els.addToCase.addEventListener('click', onAddToCase);
        els.refineBtn && els.refineBtn.addEventListener('click', onRefineClip);

        /* Case load on ID blur / Enter */
        if (els.caseIdInput) {
            const doLoad = () => {
                const id = els.caseIdInput.value.trim();
                if (id) { state.activeCaseId = id; loadCaseItems(id); updateRangeDisplay(); }
            };
            els.caseIdInput.addEventListener('blur', doLoad);
            els.caseIdInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLoad(); });
        }

        /* Create new case */
        if (els.createCaseBtn) {
            els.createCaseBtn.addEventListener('click', async () => {
                const title = els.caseTitleInput ? els.caseTitleInput.value.trim() : 'VMS Incident';
                if (!title) return;
                try {
                    const r = await fetch('/api/vms/cases', {
                        method: 'POST', credentials: 'same-origin',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ title }),
                    });
                    const d = await r.json();
                    if (!d.ok) throw new Error(d.error);
                    if (els.caseIdInput) els.caseIdInput.value = d.case.id;
                    state.activeCaseId = d.case.id;
                    setStatus('Case created: ' + d.case.id, false);
                    updateRangeDisplay();
                } catch (e) { setStatus('Create case failed: ' + e.message, true); }
            });
        }
    }

    /* ── Init ────────────────────────────────────────────────────────────────── */
    function init() {
        els.camSelect    = document.getElementById('vms-cam-select');
        els.fromInput    = document.getElementById('vms-from');
        els.toInput      = document.getElementById('vms-to');
        els.loadBtn      = document.getElementById('vms-load-btn');
        els.canvas       = document.getElementById('vms-timeline-canvas');
        els.video        = document.getElementById('vms-video');
        els.status       = document.getElementById('vms-status');
        els.timeDisplay  = document.getElementById('vms-time-display');
        els.rangeInfo    = document.getElementById('vms-range-info');
        els.addToCase    = document.getElementById('vms-add-to-case');
        els.caseIdInput  = document.getElementById('vms-case-id');
        els.caseTitleInput = document.getElementById('vms-case-title');
        els.createCaseBtn  = document.getElementById('vms-create-case');
        els.caseItemsList  = document.getElementById('vms-case-items-list');
        els.refinePanel  = document.getElementById('vms-refine-panel');
        els.refineLabel  = document.getElementById('vms-refine-label');
        els.refineStart  = document.getElementById('vms-refine-start');
        els.refineEnd    = document.getElementById('vms-refine-end');
        els.refineBtn    = document.getElementById('vms-refine-btn');
        els.refineResult = document.getElementById('vms-refine-result');

        const now = new Date(), h4 = new Date(now - 4 * 3600000);
        state.from = h4; state.to = now;
        if (els.fromInput) els.fromInput.value = localIsoForInput(h4);
        if (els.toInput)   els.toInput.value   = localIsoForInput(now);

        drawTimeline();
        updateRangeDisplay();
        bind();
        loadCameraTree();
    }

    document.addEventListener('DOMContentLoaded', init);
    window.VmsPlayback = { reload: fetchTimeline, draw: drawTimeline };
})();
