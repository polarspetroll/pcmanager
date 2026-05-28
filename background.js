const DEFAULT_SERVER = "http://127.0.0.1:6553";

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ serverUrl: DEFAULT_SERVER, lastId: 0 });
  chrome.alarms.create("poll", { periodInMinutes: 0.1 }); // every 6 seconds
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "poll") return;

  const { serverUrl, lastId } = await chrome.storage.local.get(["serverUrl", "lastId"]);
  if (!serverUrl) return;

  try {
    const res = await fetch(`${serverUrl}/api/pending?since=${lastId || 0}`);
    if (!res.ok) return;
    const data = await res.json();

    for (const cmd of data.commands) {
      chrome.windows.create({ url: cmd.url, incognito: true });
      if (cmd.id > (lastId || 0)) {
        await chrome.storage.local.set({ lastId: cmd.id });
      }
    }
  } catch (e) {
    // server unreachable, silently retry next cycle
  }
});
