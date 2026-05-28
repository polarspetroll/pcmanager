import { CONFIG } from './config.js';

// ── State ─────────────────────────────────────────────────────────────────────
let ws = null;

// ── WebSocket helpers ─────────────────────────────────────────────────────────

function wsUrl() {
  return (
    `wss://${CONFIG.PIESOCKET_CLUSTER}.piesocket.com/v3/${CONFIG.PIESOCKET_CHANNEL}` +
    `?api_key=${CONFIG.PIESOCKET_API_KEY}&notify_self=0`
  );
}

function send(payload) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ ...payload, from: 'extension', wnum: CONFIG.WORKSTATION_NUMBER }));
  }
}

function connect() {
  if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
    return;
  }

  try {
    ws = new WebSocket(wsUrl());
  } catch (err) {
    console.error('[LabPCManager] WebSocket construction failed:', err);
    return;
  }

  ws.onopen = () => {
    console.log('[LabPCManager] Connected to PieSocket');
    chrome.storage.local.set({ wsStatus: 'connected' });
    send({ type: 'register' });
  };

  ws.onmessage = ({ data }) => {
    try {
      handleMessage(JSON.parse(data));
    } catch {
      // ignore malformed messages
    }
  };

  ws.onclose = () => {
    console.log('[LabPCManager] Disconnected');
    chrome.storage.local.set({ wsStatus: 'disconnected' });
    ws = null;
  };

  ws.onerror = () => ws?.close();
}

// ── Message handler ───────────────────────────────────────────────────────────

function handleMessage(msg) {
  // Only act on admin→extension commands
  if (msg.from !== 'admin') return;

  const targets = msg.targets;
  const isTargeted = targets === 'all' || (Array.isArray(targets) && targets.includes(CONFIG.WORKSTATION_NUMBER));
  if (!isTargeted) return;

  if (msg.type === 'clear_cache') {
    clearBrowsingData();
  } else if (msg.type === 'open_url' && msg.url) {
    openUrl(msg.url);
  } else if (msg.type === 'ping') {
    // Admin is requesting fresh registration from everyone
    send({ type: 'register' });
  }
}

// ── Commands ──────────────────────────────────────────────────────────────────

function clearBrowsingData() {
  chrome.browsingData.remove(
    { since: 0 },
    { cache: true, cookies: true, history: true, localStorage: true, indexedDB: true },
    () => {
      console.log('[LabPCManager] Browsing data cleared');
      // Open a fresh new tab, then close every other tab
      chrome.tabs.create({}, (newTab) => {
        chrome.tabs.query({}, (allTabs) => {
          const toClose = allTabs.filter(t => t.id !== newTab.id).map(t => t.id);
          if (toClose.length > 0) {
            chrome.tabs.remove(toClose, () => send({ type: 'ack', cmd: 'clear_cache' }));
          } else {
            send({ type: 'ack', cmd: 'clear_cache' });
          }
        });
      });
    }
  );
}

function openUrl(baseUrl) {
  const sep = baseUrl.includes('?') ? '&' : '?';
  const url = `${baseUrl}${sep}wnum=${CONFIG.WORKSTATION_NUMBER}`;
  chrome.tabs.create({ url }, () => {
    send({ type: 'ack', cmd: 'open_url', url });
  });
}

// ── Keep-alive (MV3 service workers are terminated after ~30 s idle) ──────────

chrome.alarms.create('keepAlive',  { periodInMinutes: 0.4 });  // every ~24 s
chrome.alarms.create('heartbeat',  { periodInMinutes: CONFIG.HEARTBEAT_INTERVAL_SEC / 60 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepAlive') {
    // Ensures service worker stays alive; also reconnects if dropped
    if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
      connect();
    }
  }
  if (alarm.name === 'heartbeat') {
    send({ type: 'heartbeat' });
  }
});

// ── Boot ──────────────────────────────────────────────────────────────────────
// Mirror workstation number so popup.js can read it without importing config.js
chrome.storage.local.set({ wnumMirror: CONFIG.WORKSTATION_NUMBER });
connect();
