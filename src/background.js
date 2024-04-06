// Set the default options and open the options page on initial install.
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason !== "install") {
    return;
  }
  const options = {
    lightModeTextColor: "#222222",
    darkModeTextColor: "#dddddd",
  };
  await chrome.storage.sync.set({
    options,
    defaultOptions: options,
    enableSyntaxHighlighting: true,
  });
  chrome.tabs.create({
    url: chrome.runtime.getURL("options.html#installed"),
  });
});
