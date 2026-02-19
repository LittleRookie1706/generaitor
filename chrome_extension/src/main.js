import { createApp } from "vue";
import App from "./App.vue";

const app = createApp(App);
app.mount("#app");

// Inject styles - Vite handles CSS injection via manifest in production build,
// but this ensures styles are present if needed during development or for specific scenarios.
// Note: The manifest already specifies CSS injection ("css": ["assets/index.css"]),
// so direct style manipulation here might be redundant for production builds,
// but it's good practice for clarity and potential dev setups.

// Create a link element for the CSS
const styleLink = document.createElement("link");
styleLink.rel = "stylesheet";
styleLink.type = "text/css";
// Use chrome.runtime.getURL to get the correct path to the CSS file in the extension package
styleLink.href = chrome.runtime.getURL("assets/index.css"); // Adjusted based on typical Vite build output
document.head.appendChild(styleLink);

