chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "executeCode") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0].id;

      chrome.scripting.executeScript(
        {
          target: { tabId: tabId },
          func: (jsCode) => {
            try {
              // Thực thi trong trang
              new Function(jsCode)();
            } catch (e) {
              console.error("Execution error:", e);
            }
          },
          args: [request.code],
        },
        (results) => {
          if (chrome.runtime.lastError) {
            sendResponse({ error: chrome.runtime.lastError.message });
          } else {
            sendResponse({ success: true });
          }
        }
      );
    });

    // IMPORTANT: Required to keep message channel open
    return true;
  }
});
