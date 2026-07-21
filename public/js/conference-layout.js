/**
 * Video conference stage — fixed layouts for up to 8 participants, no scroll.
 */
(function (global) {
    const MAX_PEOPLE = 8;
    const MAX_SHARE_TILES = 4;
    const POLL_VISIBLE = 4;
    const POLL_MS = 8000;
    const DEPLOY_OPS_PCT_DEFAULT = 68;
    const PEOPLE_SCHEMES = ['auto', 'gallery', 'speaker', 'two-up', 'focus', 'pip', 'briefing', 'sidebyside'];
    const SHARE_LAYOUTS = ['split', 'large', 'people'];
    const BWC_CONNECT_MS = 45000;

    let stageEl = null;
    let bodyEl = null;
    let galleryGrid = null;
    let galleryPane = null;
    let spotlightInner = null;
    let dividerEl = null;
    let toolbarEl = null;
    let peopleBarEl = null;
    let shareBarEl = null;
    let fileInput = null;
    let videoInput = null;
    let docInput = null;
    let pipLayer = null;

    let tiles = new Map();
    let staticShares = new Map();
    let layoutMode = 'gallery';
    let peopleScheme = 'gallery';
    let peopleLayoutOverride = false;
    let shareLayout = 'split';
    let shareLayoutOverride = false;
    let shareExpected = false;
    let shareError = null;
    let shareConnectTimer = null;
    let spotlightSid = null;
    let pinnedSid = null;
    let pipSid = null;
    let spotlightPct = 58;
    let opsPct = DEPLOY_OPS_PCT_DEFAULT;
    let pollPage = 0;
    let pollTimer = null;
    let pollPaused = false;
    let dragLayoutMode = null;
    let lkRoom = null;
    let screenSharing = false;
    let initialized = false;
    let connectingEl = null;
    let participantStates = new Map();
    let activeSpeakers = new Set();

    function tr(key) {
        if (global.I18n && I18n.t) return I18n.t(key);
        return key;
    }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/"/g, '&quot;');
    }

    function lkSource() {
        return global.LivekitClient && LivekitClient.Track && LivekitClient.Track.Source
            ? LivekitClient.Track.Source
            : null;
    }

    function isMobileParticipant(participant) {
        if (!participant) return false;
        const identity = participant.identity ? String(participant.identity) : '';
        if (identity.endsWith('-mobile')) return true;
        try {
            const meta = participant.metadata ? JSON.parse(participant.metadata) : {};
            return String(meta.clientKind || '').toLowerCase() === 'mobile';
        } catch (_) {
            return false;
        }
    }

    function trackKind(track, publication, participant) {
        const src = lkSource();
        const identity = participant && participant.identity ? String(participant.identity) : '';
        const pubSource = publication && publication.source;
        if (track && track.kind === 'audio') return 'audio';
        if (src && pubSource === src.ScreenShare) return 'screen';
        if (src && pubSource === src.ScreenShareAudio) return 'audio';
        if (identity.indexOf('bwc-') === 0) return 'bwc';
        if (identity.indexOf('fixed-') === 0) return 'fixed';
        return 'camera';
    }

    function isShareKind(kind) {
        return kind === 'screen' || kind === 'bwc' || kind === 'fixed' || kind === 'image'
            || kind === 'video' || kind === 'document';
    }

    function tileKindForSid(sid) {
        if (staticShares.has(sid)) return staticShares.get(sid).kind || 'image';
        const row = tiles.get(sid);
        return row ? row.kind : 'camera';
    }

    function init(stageId) {
        if (initialized) return;
        stageEl = document.getElementById(stageId || 'vc-stage');
        if (!stageEl) return;
        bodyEl = stageEl.querySelector('.vc-stage-body');
        galleryGrid = stageEl.querySelector('.vc-gallery-grid');
        galleryPane = stageEl.querySelector('.vc-gallery-pane');
        spotlightInner = stageEl.querySelector('.vc-spotlight-inner');
        dividerEl = stageEl.querySelector('.vc-stage-divider');
        toolbarEl = stageEl.querySelector('.vc-stage-toolbar');
        peopleBarEl = stageEl.querySelector('#vc-layout-people');
        shareBarEl = stageEl.querySelector('#vc-layout-share');
        fileInput = stageEl.querySelector('#vc-share-image-input');
        videoInput = stageEl.querySelector('#vc-share-video-input');
        docInput = stageEl.querySelector('#vc-share-doc-input');
        pipLayer = stageEl.querySelector('.vc-pip-layer');
        if (!pipLayer) {
            pipLayer = document.createElement('div');
            pipLayer.className = 'vc-pip-layer';
            pipLayer.hidden = true;
            stageEl.appendChild(pipLayer);
        }
        bindToolbar();
        bindDivider();
        bindDropZones();
        bindFileInput();
        bindPollHover();
        initialized = true;
    }

    function bindPollHover() {
        if (!galleryPane || galleryPane._vcPollBound) return;
        galleryPane._vcPollBound = true;
        galleryPane.addEventListener('mouseenter', function () { pollPaused = true; });
        galleryPane.addEventListener('mouseleave', function () { pollPaused = false; });
    }

    function stopPollTimer() {
        if (pollTimer) {
            clearInterval(pollTimer);
            pollTimer = null;
        }
    }

    function startPollTimer(total) {
        stopPollTimer();
        if (total <= POLL_VISIBLE) return;
        pollTimer = setInterval(function () {
            if (pollPaused) return;
            const pages = Math.ceil(total / POLL_VISIBLE);
            pollPage = (pollPage + 1) % pages;
            remount();
        }, POLL_MS);
    }

    function syncGalleryHeader(total, visible) {
        if (!galleryPane) return;
        const hdr = galleryPane.querySelector('.vc-gallery-header');
        if (!hdr) return;
        hdr.classList.remove('vc-gallery-header-connecting', 'vc-gallery-header-err');
        if (total > POLL_VISIBLE && isPeoplePollLayout(cams)) {
            hdr.textContent = tr('conference.layoutPollHeader', { visible: visible, total: total });
        } else if (shareExpected && !hasShareTiles()) {
            hdr.textContent = tr('conference.layoutBwcConnecting');
            hdr.classList.add('vc-gallery-header-connecting');
        } else if (shareError && !hasShareTiles()) {
            hdr.textContent = shareError;
            hdr.classList.add('vc-gallery-header-err');
        } else {
            hdr.textContent = tr('conference.layoutGalleryPane');
        }
    }

    function syncViewBtns() {
        if (!toolbarEl) return;
        toolbarEl.querySelectorAll('[data-vc-action]').forEach(function (btn) {
            const a = btn.getAttribute('data-vc-action');
            if (a === 'view-gallery') {
                btn.classList.toggle('active', peopleScheme === 'gallery');
            } else if (a === 'view-speaker') {
                btn.classList.toggle('active', peopleScheme === 'speaker');
            } else if (a === 'view-focus') {
                btn.classList.toggle('active', peopleScheme === 'focus');
            } else if (a === 'view-two-up') {
                btn.classList.toggle('active', peopleScheme === 'two-up');
            } else if (a === 'view-briefing') {
                btn.classList.toggle('active', peopleScheme === 'briefing');
            } else if (a === 'view-sidebyside') {
                btn.classList.toggle('active', peopleScheme === 'sidebyside');
            } else if (a === 'pip-toggle') {
                btn.classList.toggle('active', peopleScheme === 'pip');
            } else if (a === 'expand') {
                btn.hidden = !hasShareTiles() || shareLayout === 'large' || layoutMode === 'deploy';
            } else if (a === 'shrink') {
                btn.hidden = shareLayout !== 'large';
            }
        });
    }

    function bindToolbar() {
        if (!toolbarEl) return;
        if (peopleBarEl && !peopleBarEl._vcBound) {
            peopleBarEl._vcBound = true;
            peopleBarEl.addEventListener('click', function (e) {
                const btn = e.target.closest('[data-vc-layout]');
                if (!btn) return;
                setPeopleScheme(btn.getAttribute('data-vc-layout'));
            });
        }
        if (shareBarEl && !shareBarEl._vcBound) {
            shareBarEl._vcBound = true;
            shareBarEl.addEventListener('click', function (e) {
                const btn = e.target.closest('[data-vc-share-layout]');
                if (!btn) return;
                setShareLayout(btn.getAttribute('data-vc-share-layout'));
            });
        }
        toolbarEl.addEventListener('click', function (e) {
            const btn = e.target.closest('[data-vc-action]');
            if (!btn) return;
            const action = btn.getAttribute('data-vc-action');
            if (action === 'screen') {
                toggleScreenShare().catch(function (err) { alert(err.message); });
            } else if (action === 'image') {
                fileInput && fileInput.click();
            } else if (action === 'video') {
                videoInput && videoInput.click();
            } else if (action === 'document') {
                docInput && docInput.click();
            } else if (action === 'view-gallery') {
                setPeopleScheme('gallery');
            } else if (action === 'view-speaker') {
                setPeopleScheme('speaker');
            } else if (action === 'view-focus') {
                setPeopleScheme('focus');
            } else if (action === 'view-two-up') {
                setPeopleScheme('two-up');
            } else if (action === 'view-briefing') {
                setPeopleScheme('briefing');
            } else if (action === 'view-sidebyside') {
                setPeopleScheme('sidebyside');
            } else if (action === 'pip-toggle') {
                setPeopleScheme(peopleScheme === 'pip' ? 'gallery' : 'pip');
            } else if (action === 'expand') {
                setShareLayout('large');
            } else if (action === 'shrink') {
                setShareLayout('split');
            }
        });
    }

    function bindFileInput() {
        if (fileInput) {
            fileInput.addEventListener('change', function () {
                const file = fileInput.files && fileInput.files[0];
                fileInput.value = '';
                if (!file || !/^image\//i.test(file.type)) {
                    alert(tr('conference.layoutImageOnly'));
                    return;
                }
                addImageShare(URL.createObjectURL(file), file.name);
            });
        }
        if (videoInput) {
            videoInput.addEventListener('change', function () {
                const file = videoInput.files && videoInput.files[0];
                videoInput.value = '';
                if (!file || !/^video\//i.test(file.type)) {
                    alert(tr('conference.layoutVideoOnly'));
                    return;
                }
                addVideoShare(URL.createObjectURL(file), file.name);
            });
        }
        if (docInput) {
            docInput.addEventListener('change', function () {
                const file = docInput.files && docInput.files[0];
                docInput.value = '';
                if (!file) return;
                const isPdf = /^application\/pdf$/i.test(file.type) || /\.pdf$/i.test(file.name);
                const isImage = /^image\//i.test(file.type);
                if (!isPdf && !isImage) {
                    alert(tr('conference.layoutDocumentOnly'));
                    return;
                }
                addDocumentShare(URL.createObjectURL(file), file.name, isPdf ? 'pdf' : 'image');
            });
        }
    }

    function bindDivider() {
        if (!dividerEl || !bodyEl) return;
        let dragging = false;
        dividerEl.addEventListener('mousedown', function (e) {
            if (layoutMode !== 'split' && layoutMode !== 'deploy') return;
            dragging = true;
            dragLayoutMode = layoutMode;
            e.preventDefault();
        });
        global.addEventListener('mousemove', function (e) {
            if (!dragging || !bodyEl) return;
            const rect = bodyEl.getBoundingClientRect();
            if (dragLayoutMode === 'deploy') {
                const pct = Math.max(35, Math.min(80, ((e.clientY - rect.top) / rect.height) * 100));
                opsPct = pct;
                applyDeployRatio();
            } else {
                const pct = Math.max(28, Math.min(72, ((e.clientX - rect.left) / rect.width) * 100));
                spotlightPct = pct;
                applySplitRatio();
            }
        });
        global.addEventListener('mouseup', function () {
            dragging = false;
            dragLayoutMode = null;
        });
    }

    function bindDropZones() {
        if (!galleryGrid || !spotlightInner) return;
        [galleryGrid, spotlightInner].forEach(function (zone) {
            zone.addEventListener('dragover', function (e) {
                e.preventDefault();
                zone.classList.add('vc-drop-hover');
            });
            zone.addEventListener('dragleave', function () {
                zone.classList.remove('vc-drop-hover');
            });
            zone.addEventListener('drop', function (e) {
                e.preventDefault();
                zone.classList.remove('vc-drop-hover');
                const sid = e.dataTransfer.getData('text/vc-tile');
                if (!sid || (!tiles.has(sid) && !staticShares.has(sid))) return;
                pinnedSid = sid;
                if (isShareKind(tileKindForSid(sid))) {
                    shareLayout = 'large';
                    shareLayoutOverride = true;
                } else {
                    peopleLayoutOverride = true;
                }
                remount();
            });
        });
    }

    function applySplitRatio() {
        if (!bodyEl) return;
        bodyEl.style.setProperty('--vc-spotlight-pct', spotlightPct + '%');
    }

    function applyDeployRatio() {
        if (!bodyEl) return;
        bodyEl.style.setProperty('--vc-ops-pct', opsPct + '%');
    }

    function setLayoutMode(mode) {
        layoutMode = mode;
        if (!bodyEl) return;
        bodyEl.classList.remove(
            'vc-mode-gallery', 'vc-mode-split', 'vc-mode-spotlight-full', 'vc-mode-two-up', 'vc-mode-deploy'
        );
        if (mode === 'split') {
            bodyEl.classList.add('vc-mode-split');
            applySplitRatio();
        } else if (mode === 'deploy') {
            bodyEl.classList.add('vc-mode-deploy');
            applyDeployRatio();
        } else if (mode === 'spotlight-full') {
            bodyEl.classList.add('vc-mode-spotlight-full');
        } else if (mode === 'two-up') {
            bodyEl.classList.add('vc-mode-two-up');
        } else {
            bodyEl.classList.add('vc-mode-gallery');
        }
        syncToolbarState();
    }

    function clearShareConnectTimer() {
        if (shareConnectTimer) {
            clearTimeout(shareConnectTimer);
            shareConnectTimer = null;
        }
    }

    function effectivePeopleScheme() {
        if (peopleScheme === 'auto') return 'gallery';
        return peopleScheme;
    }

    function applyAutoShareLayout() {
        if (peopleScheme !== 'auto') return;
        const sharing = hasShareTiles() || shareExpected;
        if (sharing) {
            if (!shareLayoutOverride) shareLayout = 'split';
        } else {
            shareLayoutOverride = false;
            shareLayout = 'split';
            shareExpected = false;
            shareError = null;
            clearShareConnectTimer();
            if (pinnedSid && isShareKind(tileKindForSid(pinnedSid))) pinnedSid = null;
        }
    }

    function resetShareToGrid() {
        shareExpected = false;
        shareError = null;
        shareLayoutOverride = false;
        shareLayout = 'split';
        clearShareConnectTimer();
        if (pinnedSid && isShareKind(tileKindForSid(pinnedSid))) pinnedSid = null;
        if (peopleScheme === 'auto') peopleLayoutOverride = false;
        applyAutoShareLayout();
        remount();
    }

    function setPeopleScheme(scheme) {
        if (PEOPLE_SCHEMES.indexOf(scheme) < 0) scheme = 'auto';
        peopleScheme = scheme;
        if (scheme === 'auto') {
            peopleLayoutOverride = false;
            shareLayoutOverride = false;
            shareError = null;
            applyAutoShareLayout();
        } else {
            peopleLayoutOverride = true;
        }
        if (scheme !== 'pip') {
            pipSid = null;
            if (pipLayer) pipLayer.hidden = true;
        }
        remount();
    }

    function setShareLayout(layout) {
        if (SHARE_LAYOUTS.indexOf(layout) < 0) layout = 'split';
        shareLayout = layout;
        shareLayoutOverride = true;
        remount();
    }

    function setShareExpected(on) {
        shareExpected = !!on;
        if (shareExpected) shareError = null;
        clearShareConnectTimer();
        if (peopleScheme === 'auto') applyAutoShareLayout();
        if (shareExpected && !hasShareTiles()) {
            shareConnectTimer = setTimeout(function () {
                if (shareExpected && !hasShareTiles()) {
                    shareError = tr('conference.layoutBwcFailed');
                    shareExpected = false;
                    remount();
                }
            }, BWC_CONNECT_MS);
        }
        syncToolbarState();
        remount();
    }

    function setShareError(message) {
        if (!message) {
            shareError = null;
            clearShareConnectTimer();
            if (peopleScheme === 'auto') applyAutoShareLayout();
            syncToolbarState();
            remount();
            return;
        }
        shareExpected = false;
        shareError = message || tr('conference.layoutBwcFailed');
        clearShareConnectTimer();
        syncToolbarState();
        remount();
    }

    function syncToolbarState() {
        if (peopleBarEl) {
            peopleBarEl.querySelectorAll('[data-vc-layout]').forEach(function (btn) {
                btn.classList.toggle('active', btn.getAttribute('data-vc-layout') === peopleScheme);
            });
        }
        if (shareBarEl) {
            const showShare = hasShareTiles() || shareExpected;
            shareBarEl.hidden = !showShare;
            if (showShare) {
                shareBarEl.querySelectorAll('[data-vc-share-layout]').forEach(function (btn) {
                    btn.classList.toggle('active', btn.getAttribute('data-vc-share-layout') === shareLayout);
                });
            }
        }
        syncViewBtns();
    }

    /** Fixed grid for 1–4 share tiles in spotlight pane. */
    function fitShareGridDims(count) {
        const n = Math.max(0, Math.min(MAX_SHARE_TILES, count));
        if (n <= 0) return { cols: 1, rows: 1 };
        if (n === 1) return { cols: 1, rows: 1 };
        if (n === 2) return { cols: 2, rows: 1 };
        if (n === 3) return { cols: 2, rows: 2 };
        return { cols: 2, rows: 2 };
    }

    function clearSpotlightGrid() {
        if (!spotlightInner) return;
        spotlightInner.style.display = '';
        spotlightInner.style.gridTemplateColumns = '';
        spotlightInner.style.gridTemplateRows = '';
        spotlightInner.style.alignContent = '';
        spotlightInner.style.gap = '';
    }

    function applyFitShareGrid(innerEl, count) {
        if (!innerEl) return;
        const g = fitShareGridDims(count);
        innerEl.style.display = 'grid';
        innerEl.style.gridTemplateColumns = 'repeat(' + g.cols + ', minmax(0, 1fr))';
        innerEl.style.gridTemplateRows = 'repeat(' + g.rows + ', minmax(0, 1fr))';
        innerEl.style.gap = '4px';
        innerEl.style.alignContent = 'stretch';
        innerEl.style.minHeight = '0';
        innerEl.style.height = '100%';
        innerEl.style.overflow = 'hidden';
    }

    /** Fixed grid for 1–8 tiles — fills pane, no scroll. */
    function fitGridDims(count) {
        const n = Math.max(0, Math.min(MAX_PEOPLE, count));
        if (n <= 0) return { cols: 1, rows: 1 };
        if (n === 1) return { cols: 1, rows: 1 };
        if (n === 2) return { cols: 2, rows: 1 };
        if (n === 3) return { cols: 3, rows: 1 };
        if (n === 4) return { cols: 2, rows: 2 };
        if (n <= 6) return { cols: 3, rows: 2 };
        return { cols: 4, rows: 2 };
    }

    function applyFitGrid(gridEl, count) {
        if (!gridEl) return;
        const g = fitGridDims(count);
        gridEl.style.gridTemplateColumns = 'repeat(' + g.cols + ', minmax(0, 1fr))';
        gridEl.style.gridTemplateRows = 'repeat(' + g.rows + ', minmax(0, 1fr))';
        gridEl.style.minHeight = '0';
        gridEl.style.height = '100%';
        gridEl.style.alignContent = 'stretch';
        gridEl.style.overflow = 'hidden';
    }

    function orderedVideoSids() {
        const ordered = Array.from(tiles.keys()).filter(function (sid) {
            const row = tiles.get(sid);
            return row && row.kind !== 'audio';
        });
        staticShares.forEach(function (_, sid) {
            if (ordered.indexOf(sid) < 0) ordered.push(sid);
        });
        ordered.sort(function (a, b) {
            const ta = tiles.get(a);
            const tb = tiles.get(b);
            return (ta ? (ta.order || 0) : 999) - (tb ? (tb.order || 0) : 998);
        });
        return ordered;
    }

    function shareSids() {
        return orderedVideoSids().filter(function (sid) {
            return isShareKind(tileKindForSid(sid));
        });
    }

    function shareKindPriority(kind) {
        if (kind === 'bwc') return 0;
        if (kind === 'screen') return 1;
        if (kind === 'video') return 2;
        if (kind === 'document') return 3;
        if (kind === 'image') return 4;
        return 5;
    }

    function orderedShareSids() {
        return shareSids().slice().sort(function (a, b) {
            return shareKindPriority(tileKindForSid(a)) - shareKindPriority(tileKindForSid(b));
        });
    }

    function shouldPollPeople(cams, sharesInGallery) {
        if (!cams || cams.length <= POLL_VISIBLE) return false;
        if (!sharesInGallery) return true;
        const shareCount = Math.min(orderedShareSids().length, MAX_SHARE_TILES);
        const peopleSlots = Math.max(0, MAX_PEOPLE - shareCount);
        return peopleSlots > 0 && cams.length > peopleSlots;
    }

    function normalizePollPage(cams) {
        if (!cams || cams.length <= POLL_VISIBLE) return;
        const pages = Math.ceil(cams.length / POLL_VISIBLE);
        if (pollPage >= pages) pollPage = 0;
    }

    function isPeoplePollLayout(cams) {
        cams = cams || cameraSids();
        if (pinnedSid || cams.length <= POLL_VISIBLE) return false;
        if (layoutMode === 'deploy') return true;
        if (layoutMode === 'split' && peopleScheme === 'sidebyside' && hasShareTiles()) return true;
        if (layoutMode === 'gallery' && peopleScheme === 'gallery') {
            const sharesLive = hasShareTiles() && shareLayout !== 'people';
            return shouldPollPeople(cams, sharesLive);
        }
        return false;
    }

    function pickGalleryGridIds(cams, sharesLive) {
        if (!sharesLive) {
            return shouldPollPeople(cams, false)
                ? pickPollGalleryIds(cams)
                : cams.slice(0, MAX_PEOPLE);
        }
        const shareIds = orderedShareSids().slice(0, MAX_SHARE_TILES);
        const peopleSlots = Math.max(0, MAX_PEOPLE - shareIds.length);
        if (peopleSlots <= 0) return shareIds.slice(0, MAX_PEOPLE);
        let peopleIds;
        if (cams.length > peopleSlots) {
            peopleIds = pickPollGalleryIds(cams).slice(0, peopleSlots);
        } else {
            peopleIds = cams.slice(0, peopleSlots);
        }
        return shareIds.concat(peopleIds);
    }

    function maybeAutoBriefingOnShare() {
        if (!hasShareTiles()) return;
        if (peopleScheme !== 'gallery' || peopleLayoutOverride) return;
        if (shareLayoutOverride) return;
        peopleScheme = 'briefing';
    }

    function isBriefingDeploy() {
        return peopleScheme === 'briefing'
            && hasShareTiles()
            && !shareLayoutOverride
            && shareLayout !== 'large';
    }

    function wantsSharePaneLayout() {
        if (!hasShareTiles() || shareLayout === 'people') return false;
        if (peopleScheme === 'briefing' || peopleScheme === 'sidebyside') return true;
        if (shareLayoutOverride) return true;
        return false;
    }

    function pickPollGalleryIds(cams) {
        if (cams.length <= POLL_VISIBLE) return cams.slice();
        const pages = Math.ceil(cams.length / POLL_VISIBLE);
        const page = pollPage % pages;
        const ids = cams.slice(page * POLL_VISIBLE, page * POLL_VISIBLE + POLL_VISIBLE);
        const speakerSid = primaryCameraSid();
        if (speakerSid && cams.indexOf(speakerSid) >= 0 && ids.indexOf(speakerSid) < 0) {
            ids[ids.length - 1] = speakerSid;
        }
        return ids;
    }

    function cameraSids() {
        return orderedVideoSids().filter(function (sid) {
            return !isShareKind(tileKindForSid(sid));
        });
    }

    function hasShareTiles() {
        return shareSids().length > 0;
    }

    function primaryShareSid() {
        const shares = shareSids();
        if (shares.length) return shares[0];
        return null;
    }

    function sidForParticipantIdentity(identity) {
        if (!identity) return null;
        let found = null;
        tiles.forEach(function (row, sid) {
            if (found) return;
            if (row.participantIdentity === identity) found = sid;
        });
        return found;
    }

    function primaryCameraSid() {
        if (pinnedSid && cameraSids().indexOf(pinnedSid) >= 0) return pinnedSid;
        const cams = cameraSids();
        if (activeSpeakers.size) {
            const ids = Array.from(activeSpeakers);
            for (let i = 0; i < ids.length; i++) {
                const sid = sidForParticipantIdentity(ids[i]);
                if (sid && cams.indexOf(sid) >= 0) return sid;
            }
        }
        const remote = cams.filter(function (sid) {
            const row = tiles.get(sid);
            return row && row.participant && !row.participant.isLocal;
        });
        if (remote.length) return remote[0];
        return cams.length ? cams[0] : null;
    }

    function remount() {
        mountTiles();
        syncToolbarState();
    }

    function autoLayout() {
        if (peopleScheme === 'auto') {
            applyAutoShareLayout();
        } else if (hasShareTiles()) {
            shareExpected = false;
            shareError = null;
            clearShareConnectTimer();
        }
        remount();
    }

    function detachAllTileElements() {
        tiles.forEach(function (row) {
            if (row.el && row.el.parentNode) row.el.parentNode.removeChild(row.el);
        });
        staticShares.forEach(function (row) {
            if (row.el && row.el.parentNode) row.el.parentNode.removeChild(row.el);
        });
    }

    function clearNonTileChildren(container) {
        if (!container) return;
        Array.from(container.children).forEach(function (child) {
            if (!child.classList.contains('vc-tile')) child.remove();
        });
    }

    function appendSpotlightPlaceholder(html) {
        if (!spotlightInner) return;
        const wrap = document.createElement('div');
        wrap.innerHTML = html;
        const node = wrap.firstElementChild;
        if (node) spotlightInner.appendChild(node);
    }

    function shareSpotlightMessage() {
        if (shareError) {
            return '<div class="vc-spotlight-empty vc-spotlight-err">' + esc(shareError) + '</div>';
        }
        if (shareExpected) {
            return '<div class="vc-spotlight-empty">' + esc(tr('conference.layoutBwcConnecting')) + '</div>';
        }
        return '<div class="vc-spotlight-empty">' + esc(tr('conference.layoutDropShare')) + '</div>';
    }

    function mountTiles() {
        if (!galleryGrid || !spotlightInner) return;

        const shares = shareSids();
        const cams = cameraSids();
        const sharesLive = shares.length > 0;
        const showSharePane = sharesLive && shareLayout !== 'people';
        const effPeople = effectivePeopleScheme();
        const honourPeopleLayout = peopleLayoutOverride && peopleScheme !== 'auto';
        const useShareBranch = showSharePane && (
            wantsSharePaneLayout() || !(honourPeopleLayout && !shareLayoutOverride)
        );

        detachAllTileElements();
        clearNonTileChildren(spotlightInner);
        clearSpotlightGrid();
        clearNonTileChildren(galleryGrid);
        if (pipLayer) clearNonTileChildren(pipLayer);

        let spotSid = null;
        let shareGridIds = [];
        let galleryIds = [];
        let twoUpTop = [];

        if (useShareBranch) {
            const shareIds = orderedShareSids().slice(0, MAX_SHARE_TILES);
            const briefingDeploy = isBriefingDeploy();
            if (briefingDeploy) {
                shareGridIds = shareIds;
                setLayoutMode('deploy');
                if (cams.length > POLL_VISIBLE) {
                    const pages = Math.ceil(cams.length / POLL_VISIBLE);
                    if (pollPage >= pages) pollPage = 0;
                }
                galleryIds = pickPollGalleryIds(cams);
            } else if (shareLayout === 'large' && shareIds.length === 1) {
                spotSid = shareIds[0];
                setLayoutMode('spotlight-full');
                galleryIds = cams.slice(0, MAX_PEOPLE);
                stopPollTimer();
            } else if (shareLayout === 'large' && shareIds.length > 1) {
                shareGridIds = shareIds;
                setLayoutMode('spotlight-full');
                galleryIds = cams.slice(0, MAX_PEOPLE);
                stopPollTimer();
            } else {
                shareGridIds = shareIds;
                setLayoutMode('split');
                normalizePollPage(cams);
                galleryIds = shouldPollPeople(cams, false)
                    ? pickPollGalleryIds(cams)
                    : cams.slice(0, MAX_PEOPLE);
            }
        } else if (effPeople === 'focus') {
            spotSid = primaryCameraSid();
            setLayoutMode('spotlight-full');
        } else if (effPeople === 'speaker') {
            spotSid = primaryCameraSid();
            setLayoutMode('split');
            galleryIds = cams.filter(function (sid) { return sid !== spotSid; });
        } else if (effPeople === 'two-up') {
            setLayoutMode('two-up');
            twoUpTop = cams.slice(0, 2);
            galleryIds = cams.slice(2, MAX_PEOPLE);
        } else if (peopleScheme === 'pip') {
            setLayoutMode('gallery');
            const pipTarget = pipSid || primaryCameraSid() || primaryShareSid();
            if (pipTarget) pipSid = pipTarget;
            galleryIds = orderedVideoSids().filter(function (sid) {
                return sid !== pipSid && (shareLayout === 'people' || !isShareKind(tileKindForSid(sid)));
            }).slice(0, MAX_PEOPLE);
        } else {
            setLayoutMode('gallery');
            const sharesInGalleryGrid = sharesLive && shareLayout !== 'people';
            if (shareLayout === 'people' || !sharesLive) {
                normalizePollPage(cams);
                galleryIds = shouldPollPeople(cams, false)
                    ? pickPollGalleryIds(cams)
                    : cams.slice(0, MAX_PEOPLE);
            } else {
                normalizePollPage(cams);
                galleryIds = pickGalleryGridIds(cams, true);
            }
        }

        if (shareError && showSharePane && (layoutMode === 'split' || layoutMode === 'spotlight-full' || layoutMode === 'deploy')) {
            appendSpotlightPlaceholder(shareSpotlightMessage());
        } else if (showSharePane && !spotSid && !shareGridIds.length && (layoutMode === 'split' || layoutMode === 'spotlight-full' || layoutMode === 'deploy')) {
            appendSpotlightPlaceholder(shareSpotlightMessage());
        } else if (shareGridIds.length) {
            clearSpotlightGrid();
            applyFitShareGrid(spotlightInner, shareGridIds.length);
            let mounted = 0;
            shareGridIds.forEach(function (sid) {
                const el = getTileElement(sid);
                if (el) {
                    spotlightInner.appendChild(el);
                    mounted++;
                }
            });
            if (!mounted) appendSpotlightPlaceholder(shareSpotlightMessage());
        } else if (spotSid) {
            clearSpotlightGrid();
            const spotEl = getTileElement(spotSid);
            if (spotEl) spotlightInner.appendChild(spotEl);
            else appendSpotlightPlaceholder(shareSpotlightMessage());
        } else if (layoutMode === 'two-up' && twoUpTop.length) {
            clearSpotlightGrid();
            applyFitShareGrid(spotlightInner, twoUpTop.length);
            twoUpTop.forEach(function (sid) {
                const el = getTileElement(sid);
                if (el) spotlightInner.appendChild(el);
            });
        } else if (layoutMode === 'split' || layoutMode === 'spotlight-full') {
            if (!spotSid && layoutMode === 'split') {
                appendSpotlightPlaceholder(
                    '<div class="vc-spotlight-empty">' + esc(tr('conference.layoutDropShare')) + '</div>'
                );
            }
        }

        galleryIds.forEach(function (sid) {
            if (sid === pipSid) return;
            const el = getTileElement(sid);
            if (el) galleryGrid.appendChild(el);
        });

        if (pipSid && pipLayer) {
            const pipEl = getTileElement(pipSid);
            if (pipEl) {
                pipLayer.hidden = false;
                pipLayer.appendChild(pipEl);
            } else {
                pipSid = null;
                pipLayer.hidden = true;
            }
        } else if (pipLayer) {
            pipLayer.hidden = true;
        }

        const gridCount = galleryGrid.childElementCount;
        if (gridCount > 0) {
            applyFitGrid(galleryGrid, gridCount);
        } else if (!spotSid && !pipSid && layoutMode === 'gallery') {
            const empty = document.createElement('div');
            empty.className = 'vc-gallery-empty';
            empty.textContent = tr('conference.layoutWaiting');
            galleryGrid.appendChild(empty);
            galleryGrid.style.gridTemplateColumns = '';
            galleryGrid.style.gridTemplateRows = '';
        }

        if (isPeoplePollLayout(cams)) {
            startPollTimer(cams.length);
            const visiblePeople = galleryIds.filter(function (sid) {
                return !isShareKind(tileKindForSid(sid));
            }).length;
            syncGalleryHeader(cams.length, visiblePeople);
        } else {
            stopPollTimer();
            syncGalleryHeader(cams.length, gridCount);
        }

        syncToolbarState();
        reattachTileMedia();
    }

    function reattachTileMedia() {
        tiles.forEach(function (row) {
            if (!row.track || !row.el) return;
            const vid = row.el.querySelector('.vc-tile-media video');
            if (vid) {
                try { row.track.attach(vid); } catch (_) { /* ignore */ }
            }
        });
    }

    function getTileElement(sid) {
        if (staticShares.has(sid)) return staticShares.get(sid).el;
        const row = tiles.get(sid);
        return row ? row.el : null;
    }

    function createTileShell(label, kind, sid) {
        const wrap = document.createElement('div');
        wrap.className = 'vc-tile vc-tile-' + kind;
        wrap.dataset.trackSid = sid;
        wrap.dataset.kind = kind;

        const grip = document.createElement('div');
        grip.className = 'vc-tile-grip';
        grip.title = tr('conference.layoutDragHint');
        grip.draggable = true;
        grip.addEventListener('dragstart', function (e) {
            e.dataTransfer.setData('text/vc-tile', sid);
            wrap.classList.add('vc-tile-dragging');
        });
        grip.addEventListener('dragend', function () {
            wrap.classList.remove('vc-tile-dragging');
        });

        const lbl = document.createElement('span');
        lbl.className = 'vc-tile-label';
        lbl.textContent = label || '';

        const badge = document.createElement('span');
        badge.className = 'vc-tile-badge';
        if (kind === 'screen') badge.textContent = tr('conference.layoutBadgeScreen');
        else if (kind === 'bwc') badge.textContent = tr('conference.layoutBadgeBwc');
        else if (kind === 'image') badge.textContent = tr('conference.layoutBadgeImage');
        else if (kind === 'video') badge.textContent = tr('conference.layoutBadgeVideo');
        else if (kind === 'document') badge.textContent = tr('conference.layoutBadgeDocument');
        else badge.hidden = true;

        const media = document.createElement('div');
        media.className = 'vc-tile-media';

        const pinBtn = document.createElement('button');
        pinBtn.type = 'button';
        pinBtn.className = 'vc-tile-pin';
        pinBtn.title = tr('conference.layoutPin');
        pinBtn.textContent = '⤢';
        pinBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            pinnedSid = sid;
            if (isShareKind(kind)) {
                shareLayout = 'large';
                shareLayoutOverride = true;
            } else {
                peopleScheme = 'focus';
                peopleLayoutOverride = true;
            }
            remount();
        });

        const muteBadge = document.createElement('span');
        muteBadge.className = 'vc-tile-mute-badge';
        muteBadge.hidden = true;
        muteBadge.textContent = '🔇';
        muteBadge.title = tr('conference.micMuted');

        wrap.appendChild(grip);
        wrap.appendChild(badge);
        wrap.appendChild(lbl);
        wrap.appendChild(media);
        wrap.appendChild(muteBadge);
        wrap.appendChild(pinBtn);
        wrap.addEventListener('dblclick', function () {
            pinnedSid = sid;
            if (isShareKind(kind)) {
                shareLayout = 'large';
                shareLayoutOverride = true;
            } else {
                peopleScheme = 'focus';
                peopleLayoutOverride = true;
            }
            remount();
        });
        return { wrap: wrap, media: media, muteBadge: muteBadge };
    }

    function applyTileChrome(el, state) {
        if (!el) return;
        state = state || {};
        el.classList.toggle('vc-tile-muted', !!state.muted);
        el.classList.toggle('vc-tile-speaking', !!state.speaking);
        el.classList.toggle('vc-tile-allowed', !!state.floorAllowed && !state.muted);
        const badge = el.querySelector('.vc-tile-mute-badge');
        if (badge) badge.hidden = !state.muted;
    }

    function tilesForIdentity(identity) {
        const out = [];
        if (!identity) return out;
        tiles.forEach(function (row) {
            if (row.participantIdentity === identity) out.push(row);
        });
        return out;
    }

    function updateParticipantState(identity, patch) {
        if (!identity) return;
        const prev = participantStates.get(identity) || {};
        const next = Object.assign({}, prev, patch || {});
        participantStates.set(identity, next);
        tilesForIdentity(identity).forEach(function (row) {
            applyTileChrome(row.el, next);
        });
    }

    function setActiveSpeakers(identities) {
        const cams = cameraSids();
        const peoplePoll = isPeoplePollLayout(cams);
        const shouldFollow = !pinnedSid && (peopleScheme === 'speaker' || peopleScheme === 'focus');
        const prevPrimary = (shouldFollow || peoplePoll) ? primaryCameraSid() : null;
        activeSpeakers = new Set(identities || []);
        participantStates.forEach(function (state, identity) {
            updateParticipantState(identity, { speaking: activeSpeakers.has(identity) });
        });
        if (shouldFollow || peoplePoll) {
            const next = primaryCameraSid();
            if (next !== prevPrimary) remount();
        }
    }

    function clearParticipantStates() {
        participantStates.clear();
        activeSpeakers.clear();
        if (spotlightInner) spotlightInner.classList.remove('vc-spotlight-speaking');
    }

    function addTrack(track, publication, participant, label) {
        if (!track || track.kind === 'audio') return;
        const sid = track.sid || ('t-' + Date.now());
        if (tiles.has(sid)) return;
        const kind = trackKind(track, publication, participant);
        const shell = createTileShell(label || (participant && participant.name) || '', kind, sid);
        if (kind === 'camera' && isMobileParticipant(participant)) {
            shell.wrap.classList.add('vc-tile-mobile');
        }
        if (kind === 'bwc' && participant && participant.identity) {
            const bwcId = String(participant.identity);
            shell.wrap.dataset.participantIdentity = bwcId;
            shell.wrap.dataset.bwcCamId = bwcId.replace(/^bwc-/, '');
        }
        const vid = document.createElement('video');
        vid.autoplay = true;
        vid.playsInline = true;
        vid.muted = true;
        track.attach(vid);
        shell.media.appendChild(vid);
        const wasFirstShare = shareSids().length === 0;
        tiles.set(sid, {
            el: shell.wrap,
            track: track,
            kind: kind,
            order: tiles.size,
            participant: participant,
            participantIdentity: participant && participant.identity ? String(participant.identity) : null,
        });
        if (participant && participant.identity) {
            applyTileChrome(shell.wrap, participantStates.get(String(participant.identity)) || {});
        }
        if (isShareKind(kind)) {
            shareExpected = false;
            shareError = null;
            clearShareConnectTimer();
            if (wasFirstShare) pinnedSid = sid;
            maybeAutoBriefingOnShare();
            if (peopleScheme === 'briefing' && !shareLayoutOverride) {
                shareLayout = 'split';
            } else if (shareLayout === 'people') {
                shareLayout = 'split';
            }
        }
        autoLayout();
    }

    function addStaticShare(sid, shell, url, kind) {
        const wasFirstShare = shareSids().length === 0;
        staticShares.set(sid, { el: shell.wrap, url: url, kind: kind });
        if (wasFirstShare) pinnedSid = sid;
        maybeAutoBriefingOnShare();
        if (peopleScheme === 'briefing' && !shareLayoutOverride) shareLayout = 'split';
        autoLayout();
    }

    function addImageShare(url, name) {
        const sid = 'img-' + Date.now();
        const shell = createTileShell(name || tr('conference.layoutSharedImage'), 'image', sid);
        const img = document.createElement('img');
        img.src = url;
        img.alt = name || '';
        shell.media.appendChild(img);
        addStaticShare(sid, shell, url, 'image');
    }

    function addVideoShare(url, name) {
        const sid = 'vid-' + Date.now();
        const shell = createTileShell(name || tr('conference.layoutSharedVideo'), 'video', sid);
        const vid = document.createElement('video');
        vid.src = url;
        vid.autoplay = true;
        vid.loop = true;
        vid.muted = true;
        vid.playsInline = true;
        vid.controls = true;
        shell.media.appendChild(vid);
        addStaticShare(sid, shell, url, 'video');
    }

    function addDocumentShare(url, name, docKind) {
        const sid = 'doc-' + Date.now();
        const shell = createTileShell(name || tr('conference.layoutSharedDocument'), 'document', sid);
        if (docKind === 'pdf') {
            const frame = document.createElement('iframe');
            frame.src = url;
            frame.title = name || '';
            frame.className = 'vc-doc-frame';
            shell.media.appendChild(frame);
        } else {
            const img = document.createElement('img');
            img.src = url;
            img.alt = name || '';
            shell.media.appendChild(img);
        }
        addStaticShare(sid, shell, url, 'document');
    }

    function removeTrack(track) {
        if (!track) return;
        const sid = track.sid;
        const row = tiles.get(sid);
        if (row) {
            const wasShare = isShareKind(row.kind);
            try { track.detach(); } catch (_) { /* ignore */ }
            row.el.remove();
            tiles.delete(sid);
            if (wasShare && peopleScheme === 'briefing') shareLayoutOverride = false;
        }
        if (spotlightSid === sid) spotlightSid = null;
        if (pinnedSid === sid) pinnedSid = null;
        if (pipSid === sid) pipSid = null;
        autoLayout();
    }

    function clear() {
        tiles.forEach(function (row) {
            if (row.track) {
                try { row.track.detach(); } catch (_) { /* ignore */ }
            }
        });
        staticShares.forEach(function (row) {
            if (row.url) URL.revokeObjectURL(row.url);
        });
        tiles.clear();
        staticShares.clear();
        spotlightSid = null;
        pinnedSid = null;
        pipSid = null;
        screenSharing = false;
        peopleScheme = 'gallery';
        peopleLayoutOverride = false;
        shareLayout = 'split';
        shareLayoutOverride = false;
        shareExpected = false;
        shareError = null;
        clearShareConnectTimer();
        stopPollTimer();
        pollPage = 0;
        pollPaused = false;
        clearParticipantStates();
        if (galleryGrid) {
            galleryGrid.innerHTML = '';
            galleryGrid.style.gridTemplateColumns = '';
            galleryGrid.style.gridTemplateRows = '';
        }
        if (spotlightInner) spotlightInner.innerHTML = '';
        if (pipLayer) {
            pipLayer.innerHTML = '';
            pipLayer.hidden = true;
        }
        setLayoutMode('gallery');
        syncToolbarState();
    }

    function setConnecting(message) {
        if (!stageEl) return;
        if (!message) {
            if (connectingEl) {
                connectingEl.remove();
                connectingEl = null;
            }
            return;
        }
        if (!connectingEl) {
            connectingEl = document.createElement('div');
            connectingEl.className = 'vc-stage-connecting';
            stageEl.appendChild(connectingEl);
        }
        connectingEl.textContent = message;
    }

    function show() {
        if (stageEl) stageEl.hidden = false;
    }

    function hide() {
        setConnecting(null);
        if (stageEl) stageEl.hidden = true;
    }

    function setRoom(room) {
        lkRoom = room;
    }

    async function toggleScreenShare() {
        if (!lkRoom || !lkRoom.localParticipant) throw new Error(tr('conference.layoutJoinFirst'));
        const lp = lkRoom.localParticipant;
        if (screenSharing) {
            await lp.setScreenShareEnabled(false);
            screenSharing = false;
            autoLayout();
            return;
        }
        await lp.setScreenShareEnabled(true, { audio: false });
        screenSharing = true;
        if (peopleScheme === 'briefing' && !shareLayoutOverride) shareLayout = 'split';
    }

    global.ConferenceLayout = {
        init: init,
        show: show,
        hide: hide,
        clear: clear,
        setConnecting: setConnecting,
        setRoom: setRoom,
        addTrack: addTrack,
        removeTrack: removeTrack,
        addImageShare: addImageShare,
        addVideoShare: addVideoShare,
        addDocumentShare: addDocumentShare,
        autoLayout: autoLayout,
        setShareExpected: setShareExpected,
        setShareError: setShareError,
        resetShareToGrid: resetShareToGrid,
        setPeopleScheme: setPeopleScheme,
        setShareLayout: setShareLayout,
        getPeopleScheme: function () { return peopleScheme; },
        getShareLayout: function () { return shareLayout; },
        updateParticipantState: updateParticipantState,
        setActiveSpeakers: setActiveSpeakers,
        clearParticipantStates: clearParticipantStates,
    };
}(window));
