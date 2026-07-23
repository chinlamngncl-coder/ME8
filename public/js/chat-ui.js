/**
 * BWC messaging \u2014 online picker, multi-thread tabs, SQLite-backed history.
 */
(function (global) {
    const ONLINE_VISIBLE = 6;
    const ONLINE_ROW_H = 34;
    const UI_HOURS = 24;

    let socket = null;
    let activeCamId = null;
    let canClearMessages = false;
    const openThreads = [];
    const loadedIds = {};

    function tr(key, params) {
        if (global.I18n && I18n.t) {
            const s = I18n.t(key, params);
            if (s !== key) return s;
        }
        const fallbacks = {
            'messages.title': 'Messages',
            'messages.you': 'You',
            'messages.device': 'Device',
            'messages.onlinePick': 'Online BWCs \u2014 pick to chat',
            'messages.noOnline': 'No BWC online',
            'messages.pickThread': 'Select a BWC above or an open chat tab',
            'messages.send': 'Send',
            'messages.placeholder': 'Message to BWC\u2026',
            'messages.clearThread': 'Clear thread',
            'messages.clearConfirm': 'Clear messages for this BWC? This cannot be undone.',
            'messages.cleared': 'Messages cleared.',
            'messages.clearFailed': 'Could not clear messages. Restart the fleet server and try again.',
            'messages.retentionHint': 'Showing last 24 hours \u00B7 stored up to 30 days',
        };
        return fallbacks[key] || key;
    }

    function updateClearUi() {
        const row = document.getElementById('chat-clear-row');
        if (row) row.hidden = !canClearMessages || !activeCamId;
    }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/"/g, '&quot;');
    }

    function shortId(id) {
        if (!id) return '\u2014';
        return id.length > 12 ? id.slice(0, 8) + '\u2026' + id.slice(-4) : id;
    }

    function deviceLabel(camId) {
        if (global.FleetUi && FleetUi.getDeviceName) {
            const name = FleetUi.getDeviceName(camId);
            if (name && name !== camId) return name;
        }
        return shortId(camId);
    }

    function fmtTime(isoOrStamp) {
        if (!isoOrStamp) return '';
        const s = String(isoOrStamp);
        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s)) return s.slice(11, 16);
        try {
            return new Date(s).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (_) {
            return s;
        }
    }

    function renderOnlineList() {
        const list = document.getElementById('chat-online-list');
        const hint = document.getElementById('chat-online-hint');
        if (!list) return;
        const online = (global.FleetUi && FleetUi.getOnlineDevices)
            ? FleetUi.getOnlineDevices()
            : [];
        if (hint) {
            hint.textContent = online.length ? tr('messages.onlinePick') : tr('messages.noOnline');
        }
        if (!online.length) {
            list.innerHTML = '';
            list.style.maxHeight = ONLINE_ROW_H + 'px';
            return;
        }
        const rows = Math.min(online.length, ONLINE_VISIBLE);
        list.style.maxHeight = (rows * ONLINE_ROW_H) + 'px';
        list.classList.toggle('chat-online-scroll', online.length > ONLINE_VISIBLE);
        list.innerHTML = online.map(function (m) {
            const active = m.id === activeCamId ? ' active' : '';
            return '<button type="button" class="chat-online-item' + active + '" data-cam-id="' + esc(m.id) + '">'
                + '<span class="chat-online-dot" aria-hidden="true"></span>'
                + '<span class="chat-online-name">' + esc(m.name || deviceLabel(m.id)) + '</span>'
                + '<span class="chat-online-id">' + esc(shortId(m.id)) + '</span>'
                + '</button>';
        }).join('');
    }

    function renderThreadTabs() {
        const tabs = document.getElementById('chat-thread-tabs');
        if (!tabs) return;
        if (!openThreads.length) {
            tabs.innerHTML = '';
            tabs.hidden = true;
            return;
        }
        tabs.hidden = false;
        tabs.innerHTML = openThreads.map(function (camId) {
            const active = camId === activeCamId ? ' active' : '';
            return '<span class="chat-thread-tab' + active + '" data-cam-id="' + esc(camId) + '">'
                + esc(deviceLabel(camId))
                + '<button type="button" class="chat-thread-close" data-cam-id="' + esc(camId) + '" aria-label="Close">\u00D7</button>'
                + '</span>';
        }).join('');
    }

    function renderChatBox(messages) {
        const box = document.getElementById('chat-box');
        if (!box) return;
        if (!activeCamId) {
            box.innerHTML = '<p class="chat-empty">' + esc(tr('messages.pickThread')) + '</p>';
            return;
        }
        if (!messages || !messages.length) {
            box.innerHTML = '<p class="chat-empty">' + esc(tr('messages.placeholder')) + '</p>';
            return;
        }
        box.innerHTML = messages.map(function (m) {
            const who = m.direction === 'out'
                ? tr('messages.you')
                : (m.senderName || deviceLabel(m.deviceId || activeCamId));
            const stamp = fmtTime(m.msgTime || m.createdAt);
            return '<div class="chat-line">'
                + (stamp ? '<span class="chat-time">' + esc(stamp) + '</span> ' : '')
                + '<b class="chat-who">' + esc(who) + ':</b> '
                + esc(m.text || '')
                + '</div>';
        }).join('');
        box.scrollTop = box.scrollHeight;
    }

    async function loadHistory(camId) {
        if (!camId) {
            renderChatBox([]);
            return;
        }
        const box = document.getElementById('chat-box');
        if (box) box.innerHTML = '<p class="chat-empty">Loading\u2026</p>';
        try {
            const res = await fetch('/api/messages/' + encodeURIComponent(camId) + '?limit=200&sinceHours=' + UI_HOURS);
            const data = await res.json();
            if (!res.ok || !data.ok) throw new Error((data && data.error) || 'Could not load messages');
            loadedIds[camId] = true;
            if (activeCamId === camId) renderChatBox(data.messages || []);
        } catch (err) {
            if (activeCamId === camId && box) {
                box.innerHTML = '<p class="chat-empty">' + esc(err.message || 'Load failed') + '</p>';
            }
        }
    }

    function openThread(camId) {
        if (!camId) return;
        if (openThreads.indexOf(camId) < 0) openThreads.push(camId);
        activeCamId = camId;
        renderOnlineList();
        renderThreadTabs();
        updateClearUi();
        loadHistory(camId);
        const input = document.getElementById('msg-input');
        if (input) input.focus();
    }

    function closeThread(camId) {
        const idx = openThreads.indexOf(camId);
        if (idx >= 0) openThreads.splice(idx, 1);
        delete loadedIds[camId];
        if (activeCamId === camId) {
            activeCamId = openThreads.length ? openThreads[openThreads.length - 1] : null;
            if (activeCamId) loadHistory(activeCamId);
            else renderChatBox([]);
        }
        renderOnlineList();
        renderThreadTabs();
        updateClearUi();
    }

    async function clearActiveThread() {
        if (!canClearMessages || !activeCamId) return;
        if (!confirm(tr('messages.clearConfirm'))) return;
        try {
            const res = await fetch('/api/messages/' + encodeURIComponent(activeCamId) + '/clear', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const ct = res.headers.get('content-type') || '';
            if (ct.indexOf('application/json') < 0) {
                throw new Error(tr('messages.clearFailed'));
            }
            const data = await res.json();
            if (!res.ok || !data.ok) throw new Error((data && data.error) || 'Clear failed');
            delete loadedIds[activeCamId];
            renderChatBox([]);
            alert(tr('messages.cleared'));
        } catch (err) {
            alert(err.message || 'Clear failed');
        }
    }

    function appendLiveLine(m) {
        if (!m || !m.cameraId || m.cameraId !== activeCamId) return;
        const box = document.getElementById('chat-box');
        if (!box) return;
        const empty = box.querySelector('.chat-empty');
        if (empty) empty.remove();
        const who = m.direction === 'out'
            ? tr('messages.you')
            : (m.name || deviceLabel(m.cameraId));
        const stamp = fmtTime(m.time);
        const line = document.createElement('div');
        line.className = 'chat-line';
        line.innerHTML = (stamp ? '<span class="chat-time">' + esc(stamp) + '</span> ' : '')
            + '<b class="chat-who">' + esc(who) + ':</b> '
            + esc(m.text || '');
        box.appendChild(line);
        box.scrollTop = box.scrollHeight;
    }

    function sendMessage() {
        const input = document.getElementById('msg-input');
        const text = (input && input.value || '').trim();
        if (!text) return;
        if (!activeCamId) {
            alert(tr('messages.pickThread'));
            return;
        }
        socket.emit('send-message', { text: text, cameraId: activeCamId });
        if (input) input.value = '';
    }

    async function restoreThreadsFromServer() {
        try {
            const res = await fetch('/api/messages/threads?limit=8&sinceHours=' + UI_HOURS);
            const data = await res.json();
            if (!res.ok || !data.ok || !data.threads || !data.threads.length) return;
            data.threads.slice().reverse().forEach(function (t) {
                if (t.deviceId && openThreads.indexOf(t.deviceId) < 0) openThreads.push(t.deviceId);
            });
            if (!activeCamId && openThreads.length) activeCamId = openThreads[0];
            renderThreadTabs();
            if (activeCamId) loadHistory(activeCamId);
        } catch (_) { /* ignore */ }
    }

    function bindEvents() {
        const onlineList = document.getElementById('chat-online-list');
        if (onlineList) {
            onlineList.addEventListener('click', function (e) {
                const btn = e.target.closest('.chat-online-item');
                if (!btn) return;
                openThread(btn.getAttribute('data-cam-id'));
            });
        }
        const tabs = document.getElementById('chat-thread-tabs');
        if (tabs) {
            tabs.addEventListener('click', function (e) {
                const closeBtn = e.target.closest('.chat-thread-close');
                if (closeBtn) {
                    e.stopPropagation();
                    closeThread(closeBtn.getAttribute('data-cam-id'));
                    return;
                }
                const tab = e.target.closest('.chat-thread-tab');
                if (!tab) return;
                activeCamId = tab.getAttribute('data-cam-id');
                renderOnlineList();
                renderThreadTabs();
                updateClearUi();
                loadHistory(activeCamId);
            });
        }
        const clearBtn = document.getElementById('chat-clear-thread');
        if (clearBtn) clearBtn.addEventListener('click', clearActiveThread);
        const input = document.getElementById('msg-input');
        if (input) {
            input.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') sendMessage();
            });
        }
        const sendBtn = document.getElementById('chat-send-btn');
        if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    }

    function onFleetChange() {
        renderOnlineList();
    }

    function onLangChange() {
        renderOnlineList();
        if (activeCamId && loadedIds[activeCamId]) {
            loadHistory(activeCamId);
        } else {
            renderChatBox([]);
        }
    }

    function init(sock) {
        socket = sock || global.socket;
        fetch('/api/auth/session').then(function (r) { return r.json(); }).then(function (data) {
            canClearMessages = !!(data && data.ok && data.canManageServer);
            updateClearUi();
        }).catch(function () { /* ignore */ });
        bindEvents();
        renderOnlineList();
        renderChatBox([]);
        restoreThreadsFromServer();
        window.addEventListener('fm-i18n-changed', onLangChange);
        if (socket) {
            socket.on('camera-message', function (m) {
                const camId = m && m.cameraId;
                if (camId && openThreads.indexOf(camId) < 0) openThreads.push(camId);
                if (!activeCamId && camId) activeCamId = camId;
                renderThreadTabs();
                appendLiveLine(m);
            });
            socket.on('fleet-roster', onFleetChange);
            socket.on('heartbeat', onFleetChange);
            socket.on('device-offline', onFleetChange);
        }
    }

    global.ChatUi = { init: init, openThread: openThread, refreshOnline: onFleetChange };
    global.sendChatMessage = sendMessage;
})(window);
