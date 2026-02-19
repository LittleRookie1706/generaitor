chrome.action.onClicked.addListener(async (tab) => {
  // avaiable from Chrome 116+)
  // with Chrome 114-115, side panel will open for every default tab
  await chrome.sidePanel.open({ tabId: tab.id });
});
