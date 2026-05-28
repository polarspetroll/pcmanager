// Reads live state written by the background service worker
chrome.storage.local.get(['wsStatus'], ({ wsStatus }) => {
  // Workstation number lives in config.js which can't be imported here directly,
  // so background.js mirrors it into storage on first run.
  chrome.storage.local.get(['wnumMirror'], ({ wnumMirror }) => {
    document.getElementById('wnum').textContent = wnumMirror ?? '?';
  });

  const badge = document.getElementById('status-badge');
  const text  = document.getElementById('status-text');

  if (wsStatus === 'connected') {
    badge.className = 'badge online';
    text.textContent = 'Online';
  } else {
    badge.className = 'badge offline';
    text.textContent = 'Offline';
  }
});
