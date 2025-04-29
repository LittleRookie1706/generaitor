<script setup>
import { ref, computed, watch, nextTick } from 'vue' // Add nextTick
import { useDateFormat, useNow, useLocalStorage, useScroll } from '@vueuse/core' // Add useScroll
import { GoogleGenerativeAI } from "@google/generative-ai";

// --- Template Refs ---
const messagesAreaRef = ref(null); // Ref for the scrollable messages area
const { y } = useScroll(messagesAreaRef); // Get scroll controls

// --- Reactive Gemini API Setup ---
const apiKey = useLocalStorage('gemini-api-key', ''); // Store API key in local storage
const apiKeyInput = ref(''); // Temporary input model
const genAIInstance = ref(null); // Reactive reference for the GenAI instance
const modelInstance = ref(null); // Reactive reference for the model
const showApiKeyInput = ref(!apiKey.value); // Control visibility, show if no key initially

// Function to initialize or update the Gemini client
const initializeGemini = (key) => {
  if (key) {
    try {
      const genAI = new GoogleGenerativeAI(key);
      genAIInstance.value = genAI;
      modelInstance.value = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" }); // Use gemini-2.0-flash-lite
      console.log("Gemini client initialized successfully.");
      showApiKeyInput.value = false; // Hide input on success
    } catch (error) {
      console.error("Failed to initialize Gemini client:", error);
      showApiKeyInput.value = true; // Show input on error
      genAIInstance.value = null;
      modelInstance.value = null;
      // Optionally add a user-facing error message
      messages.value.push({
        id: Date.now(),
        text: "Failed to initialize Gemini with the provided key.",
        sender: 'bot',
        timestamp: Date.now(),
      });
    }
  } else {
    genAIInstance.value = null;
    modelInstance.value = null;
    console.log("Gemini client requires an API key.");
    showApiKeyInput.value = true; // Show input if no key
  }
};

// Function to scroll messages area to bottom
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesAreaRef.value) {
      y.value = messagesAreaRef.value.scrollHeight;
    }
  });
};

// Initialize on component mount and watch for changes in stored key
watch(apiKey, (newKey) => {
  initializeGemini(newKey);
}, { immediate: true }); // immediate: true runs the watcher once on mount

const saveApiKey = () => {
  apiKey.value = apiKeyInput.value; // Save the input value to local storage
  apiKeyInput.value = ''; // Clear the input field
  // Re-initialization is handled by the watcher
  alert('API Key saved!');
};

const isApiKeySet = computed(() => !!apiKey.value); // Check if API key exists
// -----------------------------

// Adjust initial/stored message structure
const messages = useLocalStorage('chat-history', [
  { id: 1, text: 'Hello! Ask me anything.', sender: 'bot', timestamp: Date.now() - 10000 },
  // { id: 2, text: 'Hi there!', sender: 'user', timestamp: Date.now() - 5000 }, // Example user message
])
const newMessage = ref('')
const isChatboxVisible = ref(false) // Default to hidden
const isLoading = ref(false); // Add loading state for API calls

const formattedTimestamp = (ts) => {
  return useDateFormat(ts, 'HH:mm').value
}

const sendMessage = async () => { // Make async
  const userText = newMessage.value.trim();
  if (userText === '' || isLoading.value || !isApiKeySet.value || !modelInstance.value) {
    if (!isApiKeySet.value) {
       alert("Please set your Gemini API Key first.");
    }
    return; // Prevent sending if no key, no model, empty, or loading
  }

  // Add user message (as the command)
  messages.value.push({
    id: Date.now(),
    text: `Command: ${userText}`, // Label it as a command
    sender: 'user',
    timestamp: Date.now(),
  })
  const commandText = userText; // Store command text
  newMessage.value = '' // Clear input immediately

  // --- Get DOM and Call Gemini API for Action ---
  isLoading.value = true;
  try {
    const currentDOM = document.body.outerHTML;
    // Updated prompt to request JSON output
    const prompt = `
Your task is to act as a DOM interaction planner. Analyze the user command and the provided DOM structure. Identify the target element and the intended action.

Instructions:
1. Find the target element based on the Command and DOM.
2. Determine the best CSS selector using this priority: id > class > tag+attributes.
3. Identify the action: "click", "type", "focus", "submit", "select".
4. If action is "type" or "select", extract the value from the Command.

Output Format:
Return ONLY a single-line JSON object. Do NOT include any other text, explanations, or markdown.
Structure:
{
  "selector": "<CSS selector string>",
  "action": "<action name>",
  "value": "<value string>" // Include ONLY for "type" or "select" actions
}
Example for "click button with id save": {"selector": "#save", "action": "click"}
Example for "type 'hello' into input with name query": {"selector": "input[name='query']", "action": "type", "value": "hello"}
Example for "select 'US' in dropdown with class country": {"selector": ".country", "action": "select", "value": "US"}

If the command is ambiguous or the element/action cannot be determined, return JSON: {"error": "Cannot determine action or selector."}

---
Command: ${commandText}
---
DOM:
\`\`\`html
${currentDOM}
\`\`\`
---
JavaScript Code:`; // Expecting only JS code below

    // Use startChat for potentially better handling of complex prompts
    const chat = modelInstance.value.startChat();
    const result = await chat.sendMessage(prompt);
    const response = await result.response;
    let aiResponseText = (await response.text()).trim();

    console.log("Raw AI response:", aiResponseText); // Log the raw response

    // Clean potential Markdown fences
    if (aiResponseText.startsWith("```json")) {
      aiResponseText = aiResponseText.substring(7); // Remove ```json\n
      if (aiResponseText.endsWith("```")) {
        aiResponseText = aiResponseText.substring(0, aiResponseText.length - 3); // Remove ```
      }
      aiResponseText = aiResponseText.trim(); // Trim again after stripping fences
      console.log("Cleaned AI response:", aiResponseText); // Log the cleaned response
    }


    // --- Process JSON Response and Execute via DOM API ---
    try {
      const actionData = JSON.parse(aiResponseText);

      if (actionData.error) {
        messages.value.push({
          id: Date.now() + 1,
          text: `AI Error: ${actionData.error}`,
          sender: 'bot',
          timestamp: Date.now(),
        });
      } else if (actionData.selector && actionData.action) {
        const targetElement = document.querySelector(actionData.selector);

        if (!targetElement) {
          messages.value.push({
            id: Date.now() + 1,
            text: `Error: Element not found for selector: ${actionData.selector}`,
            sender: 'bot',
            timestamp: Date.now(),
          });
        } else {
          // Perform action using standard DOM methods
          let actionDescription = `${actionData.action} on ${actionData.selector}`;
          switch (actionData.action.toLowerCase()) {
            case 'click':
              targetElement.click();
              break;
            case 'type':
              if (typeof actionData.value === 'string') {
                if (targetElement instanceof HTMLInputElement || targetElement instanceof HTMLTextAreaElement) {
                  targetElement.value = actionData.value;
                  actionDescription += ` with value "${actionData.value}"`;
                  // Optionally trigger input/change events if needed by the page
                  targetElement.dispatchEvent(new Event('input', { bubbles: true }));
                  targetElement.dispatchEvent(new Event('change', { bubbles: true }));
                } else {
                   throw new Error(`Element for 'type' is not an input or textarea.`);
                }
              } else {
                throw new Error(`'type' action requires a 'value' string.`);
              }
              break;
            case 'select':
               if (typeof actionData.value === 'string' && targetElement instanceof HTMLSelectElement) {
                 targetElement.value = actionData.value;
                 actionDescription += ` to value "${actionData.value}"`;
                 // Optionally trigger change event
                 targetElement.dispatchEvent(new Event('change', { bubbles: true }));
               } else {
                 throw new Error(`'select' action requires a 'value' string and a SELECT element.`);
               }
              break;
            case 'focus':
              targetElement.focus();
              break;
             case 'submit':
               if (targetElement instanceof HTMLFormElement) {
                 targetElement.submit();
               } else if (targetElement.form) {
                 targetElement.form.submit(); // Try submitting the form the element belongs to
               } else {
                  throw new Error(`Cannot 'submit' element directly, and it's not part of a form.`);
               }
               break;
            default:
              throw new Error(`Unsupported action: ${actionData.action}`);
          }
          messages.value.push({
            id: Date.now() + 1,
            text: `Executed: ${actionDescription}`,
            sender: 'bot',
            timestamp: Date.now(),
          });
        }
      } else {
         throw new Error("Invalid JSON structure received from AI.");
      }
    } catch (parseOrExecError) {
      console.error("JSON parsing or DOM execution error:", parseOrExecError);
      messages.value.push({
        id: Date.now() + 1,
        text: `Execution Error: ${parseOrExecError.message}. AI Response: ${aiResponseText}`, // Removed extra comma here
        sender: 'bot',
        timestamp: Date.now(),
      });
    } // Removed the misplaced 'else' block that was here

  } catch (apiError) {
    console.error("Gemini API error:", apiError);
    // Add error message to chat
    messages.value.push({
      id: Date.now() + 1,
      text: "Error communicating with AI. Please check API key and console.",
      sender: 'bot',
      timestamp: Date.now(),
    });
  } finally {
    isLoading.value = false;
  }
  // ------------------------
}

// Watch for chatbox visibility change to scroll down
watch(isChatboxVisible, async (isVisible) => { // Make watcher async
  if (isVisible) {
    await nextTick(); // Wait for DOM updates after v-if becomes true
    scrollToBottom(); // Now the element should exist
  }
});

// Watch for new messages to scroll down (only if visible)
watch(messages, () => {
  if (isChatboxVisible.value) { // Only scroll if the box is open
    scrollToBottom();
  }
}, { deep: true }); // Use deep watch for array changes
</script>

<template lang="pug">
// Floating button to open the chatbox
button.open-chat-btn(v-if="!isChatboxVisible" @click="isChatboxVisible = true") 💬

// The actual chatbox container, shown only when isChatboxVisible is true
.chatbox-container(v-if="isChatboxVisible")
  .chatbox-header
    h1 Simple Chatbox
    button.close-btn(@click="isChatboxVisible = false") &times;

  // Conditionally render the main content (now always rendered if container is visible)
  .chatbox-content
    // Add ref to the messages area
    .messages-area(ref="messagesAreaRef")
      // Add loading indicator
      .loading-indicator(v-if="isLoading") Thinking...
      // Update class binding to use 'user' and 'bot'
      .message(v-for="msg in messages" :key="msg.id" :class="['message-' + msg.sender]")
        .message-content {{ msg.text }}
        .timestamp {{ formattedTimestamp(msg.timestamp) }}
    .input-area
      // Disable input and button when loading or API key not set
      input(type="text" v-model="newMessage" @keyup.enter="sendMessage" :disabled="isLoading || !isApiKeySet" placeholder="Type your message...")
      button(@click="sendMessage" :disabled="isLoading || !isApiKeySet") Send

    // API Key Input Area - Conditionally rendered
    .api-key-area(v-if="showApiKeyInput")
      p(v-if="!isApiKeySet" class="api-key-warning") Please set your Gemini API Key below to enable chat.
      div.api-key-input-group
        input(type="password" v-model="apiKeyInput" placeholder="Enter Gemini API Key" @keyup.enter="saveApiKey")
        button(@click="saveApiKey") Save Key

</template>

<style scoped>
/* Styles for the floating chatbox */
.chatbox-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 350px; /* Fixed width */
  height: 500px; /* Fixed height */
  max-height: 80vh; /* Limit height based on viewport */
  display: flex; /* Keep flex for internal layout */
  flex-direction: column;
  border: 1px solid #ccc;
  border-radius: 8px;
  overflow: hidden; /* Keep overflow hidden */
  font-family: sans-serif;
  background-color: white; /* Add background */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); /* Add shadow */
  z-index: 9999; /* Ensure it's on top */
  transition: opacity 0.3s ease, transform 0.3s ease; /* Add transition for appearing/disappearing */
}

/* Styles for the floating open chat button */
.open-chat-btn {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 60px;
  height: 60px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 50%;
  font-size: 1.5em; /* Adjust icon size */
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  z-index: 9998; /* Below chatbox, but above page content */
  transition: background-color 0.3s ease;
}
.open-chat-btn:hover {
  background-color: #45a049;
}


.chatbox-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 10px; /* Adjust padding */
  background-color: #f1f1f1;
  border-bottom: 1px solid #ccc;
  min-height: 40px; /* Ensure header has some height */
}

h1 {
  /* text-align: center; */ /* No longer needed with flex */
  padding: 10px 0; /* Adjust padding */
  margin: 0;
  /* background-color: #f1f1f1; */ /* Moved to header */
  font-size: 1.1em; /* Slightly smaller */
  /* border-bottom: 1px solid #ccc; */ /* Moved to header */
  flex-grow: 1; /* Allow title to take space */
  text-align: center; /* Center title text */
}

.close-btn, .open-btn {
  background: none;
  border: none;
  font-size: 1.5em;
  cursor: pointer;
  padding: 0 5px;
  color: #555;
  line-height: 1;
}
.close-btn:hover {
  color: #000;
}
/* Removed .open-btn styles as it's replaced by .open-chat-btn */

/* Container for messages and input */
.chatbox-content {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  overflow: hidden; /* Important for flex layout */
}

.messages-area {
  flex-grow: 1; /* Takes available space within chatbox-content */
  padding: 15px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background-color: #f9f9f9;
}

.message {
  padding: 8px 12px;
  border-radius: 15px;
  max-width: 70%;
  word-wrap: break-word;
}

/* Renamed from .message-me */
.message-user {
  background-color: #dcf8c6;
  align-self: flex-end;
  text-align: right;
}

/* Rename message-other to message-bot and adjust style */
.message-bot {
  background-color: #e5e5ea; /* Different background for bot */
  color: #000;
  align-self: flex-start;
  /* border: 1px solid #eee; */ /* Optional: remove or adjust border */
}

.message-content {
  margin-bottom: 3px;
}

.timestamp {
  font-size: 0.7em;
  color: #888;
}

.input-area {
  display: flex;
  padding: 10px;
  border-top: 1px solid #ccc;
  background-color: #f1f1f1;
}

.input-area input {
  flex-grow: 1;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 20px;
  margin-right: 10px;
}

.input-area button {
  padding: 10px 15px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.input-area button:hover {
  background-color: #45a049;
}

/* Style for loading indicator */
.loading-indicator {
  text-align: center;
  padding: 10px;
  color: #888;
  font-style: italic;
}

/* Disable input/button when loading */
.input-area input:disabled,
.input-area button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

/* Styles for API Key Input Area */
.api-key-area {
  padding: 10px;
  border-top: 1px dashed #ccc; /* Dashed border to separate */
  background-color: #f9f9f9;
}

.api-key-warning {
  color: #d9534f; /* Red warning color */
  font-size: 0.9em;
  margin-bottom: 5px;
  text-align: center;
}

.api-key-input-group {
  display: flex;
  gap: 10px;
}

.api-key-input-group input {
  flex-grow: 1;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.api-key-input-group button {
  padding: 8px 12px;
  background-color: #5bc0de; /* Info blue */
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}
.api-key-input-group button:hover {
  background-color: #31b0d5;
}

</style>
