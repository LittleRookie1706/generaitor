chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "executeCode") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0].id;
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: (code) => {
          try {
            eval(code);
          } catch (e) {
            console.error("Error executing code:", e);
          }
        },
        args: [request.code],
      });
    });
  }
});
