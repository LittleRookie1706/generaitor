import { createApp } from 'vue'
import App from './App.vue'

// Create a div element for the Vue app
const appContainer = document.createElement('div')
appContainer.id = 'oteiting-floating-chat-container'
document.body.appendChild(appContainer)

// Create and mount the Vue app into the container
const app = createApp(App)
app.mount('#oteiting-floating-chat-container')

// Inject styles - Vite handles CSS injection via manifest in production build,
// but this ensures styles are present if needed during development or for specific scenarios.
// Note: The manifest already specifies CSS injection ("css": ["assets/index.css"]),
// so direct style manipulation here might be redundant for production builds,
// but it's good practice for clarity and potential dev setups.

// Create a link element for the CSS
const styleLink = document.createElement('link');
styleLink.rel = 'stylesheet';
styleLink.type = 'text/css';
// Use chrome.runtime.getURL to get the correct path to the CSS file in the extension package
styleLink.href = chrome.runtime.getURL('assets/index.css'); // Adjusted based on typical Vite build output
document.head.appendChild(styleLink);

console.log('Oteiting Floating Chatbox injected.');
