// This file is no longer the main entry point for the extension build.
// App initialization and mounting are handled in src/content.js.
// The original CSS import './style.css' is also removed as styles
// are now injected via the manifest and content script.

console.log("src/main.js loaded (should not mount app here for content script)");
