<script setup>
import { ref, computed, watch, nextTick } from "vue";
import { useDateFormat, useLocalStorage, useScroll } from "@vueuse/core";
import { v4 as uuidv4 } from 'uuid';

const messagesAreaRef = ref(null);
const { y } = useScroll(messagesAreaRef);

const API_URL_INTERACT = "http://localhost:3456/api/process-dom";
const API_URL_GENERATE = "http://localhost:3456/api/generate-auto-test";

const apiKey = useLocalStorage("gemini-api-key", "");
const apiKeyInput = ref("");

const showApiKeyInput = ref(!apiKey.value);

const showHideApiKeyInput = (key) => {
  if (key) {
    showApiKeyInput.value = false;
  } else {
    console.log("Gemini client requires an API key.");
    showApiKeyInput.value = true;
  }
};
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesAreaRef.value) {
      y.value = messagesAreaRef.value.scrollHeight;
    }
  });
};

watch(
  apiKey,
  (newKey) => {
    showHideApiKeyInput(newKey);
  },
  { immediate: true }
);

const saveApiKey = () => {
  apiKey.value = apiKeyInput.value;
  apiKeyInput.value = "";
  alert("API Key saved!");
};

const isApiKeySet = computed(() => !!apiKey.value);

const messages = useLocalStorage("chat-history", [
  {
    id: 1,
    text: "Hello! Ask me anything.",
    sender: "bot",
    timestamp: Date.now() - 10000,
  },
]);

const clearChat = () => {
  messages.value = [];
};
const newMessage = ref("");
const isLoading = ref(false);
const testType = useLocalStorage("test-type", "cypress");


function addMessageToChat(text, sender, color = undefined, customId = undefined, status = undefined) {
  messages.value.push({
    id: customId || uuidv4(),
    text,
    sender,
    timestamp: Date.now(),
    ...(color && { color }), // Add color only if provided
    ...(status && { status }), // Add status only if provided
  });
}

async function processCommandsAndGenerateTest(commandsToProcess, activeTab) {
  // This function will handle processing individual commands and generating the Cypress test.
  // It encapsulates the logic previously from lines 98-190 of sendMessage.

  for (let i = 0; i < commandsToProcess.length; i++) {
    const command = commandsToProcess[i];
    let currentCommandAiResponseText; // Stores AI response for the current command's DOM interaction

    // Find the corresponding user message and update its status to 'running'
    const userMessageIndex = messages.value.findIndex(m => m.text === command && m.sender === 'user' && m.status === 'pending');
    if (userMessageIndex > -1) {
      messages.value[userMessageIndex].status = 'running';
    }

    if (command.toLowerCase().startsWith("check if")) {
      addMessageToChat(`Command: ${command}`, "bot");
      if (userMessageIndex > -1) {
        messages.value[userMessageIndex].status = 'success'; // Mark as success if it's a check if command
      }
      continue;
    }

    await chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      files: ['content.js']
    });
    let currentCommandDOM = await chrome.tabs.sendMessage(activeTab.id, { action: "getDOM" });

    try {
      const response = await fetch(API_URL_INTERACT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dom: currentCommandDOM.outerHTML,
          commandText: command,
          apiKey: apiKey.value,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API Error: ${errorData.error || response.statusText}`);
      }

      const interactApiData = await response.json();
      currentCommandAiResponseText = interactApiData.aiResponse;

    } catch (apiError) {
      console.error("API error:", apiError);
      addMessageToChat(`Error processing command "${command}": ${apiError.message}`, "bot", "red");
      if (userMessageIndex > -1) {
        messages.value[userMessageIndex].status = 'failed'; // Mark as failed
      }
      return null; // Stop execution on API error
    }

    if (currentCommandAiResponseText) {
      const actionData = currentCommandAiResponseText;
      if (actionData.error) {
        addMessageToChat(`AI Error for "${command}": ${actionData.error}`, "bot");
        if (userMessageIndex > -1) {
          messages.value[userMessageIndex].status = 'failed'; // Mark as failed
        }
        return null; // Stop execution on AI error
      } else {
        const res = await chrome.tabs.sendMessage(activeTab.id, { action: "DOMAction", aiResponseText: actionData });
        if (res.error) {
          addMessageToChat(`Execution error for "${command}": ${res.error}`, "bot", "red");
          if (userMessageIndex > -1) {
            messages.value[userMessageIndex].status = 'failed'; // Mark as failed
          }
          return null; // Stop execution on DOM action error
        } else {
          // addMessageToChat(`Executed: ${command}`, "bot", "green"); // Removed as per user request
          if (userMessageIndex > -1) {
            messages.value[userMessageIndex].status = 'success'; // Mark as success
          }
        }
      }
    } else {
      // This case means currentCommandAiResponseText is undefined,
      // likely due to an error in the try-catch block above.
      // An error message should have already been pushed.
      addMessageToChat(`No action performed for "${command}" due to prior error or no AI directive.`, "bot", "orange");
      if (userMessageIndex > -1) {
        messages.value[userMessageIndex].status = 'failed'; // Mark as failed
      }
      return null; // Stop execution if no AI directive
    }
  } // End of for loop for commands

  // --- API_URL_GENERATE part ---
  let generateApiResult = null;
  try {
    const domForGenerate = await chrome.tabs.sendMessage(activeTab.id, { action: "getDOM" });
    const response = await fetch(API_URL_GENERATE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dom: domForGenerate.outerHTML,
        commandText: commandsToProcess,
        apiKey: apiKey.value,
        testType: testType.value, // Pass the selected test type
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API Error (Generate): ${errorData.error || response.statusText}`);
    }
    generateApiResult = await response.json();
  } catch (apiError) {
    console.error("API_URL_GENERATE error:", apiError);
    addMessageToChat(`Error generating ${testType.value} test: ${apiError.message}`, "bot", "red");
    // generateApiResult will remain null
  }
  return generateApiResult;
}

const sendMessage = async () => {
  const userText = newMessage.value.trim();
  if (userText === "" || isLoading.value) {
    return;
  }

  const commands = userText
    .split("\n")
    .map((cmd) => cmd.trim())
    .filter((cmd) => cmd !== "");
  if (commands.length === 0) {
    return;
  }

  for (const command of commands) {
    addMessageToChat(command, "user", undefined, Date.now(), 'pending'); // Add status 'pending'
  }

  newMessage.value = "";
  isLoading.value = true;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Call the new helper function to process commands and generate the test
  const generateData = await processCommandsAndGenerateTest(commands, tab);

  // Process the results from the test generation
  if (generateData) {
    if (generateData.individual && Array.isArray(generateData.individual)) {
      for (const item of generateData.individual) {
        if (item.error) {
          addMessageToChat(`Command: ${item.command}\nError: ${item.error}`, "bot", "red");
        }
      }
    }

    if (generateData.fullScript) {
      addMessageToChat(`Complete ${testType.value} Test:\n${generateData.fullScript}`, "bot", "green");
    } else if (!generateData.individual || generateData.individual.length === 0)
      addMessageToChat(`${testType.value} test generation did not produce a script.`, "bot", "orange");
  } else addMessageToChat(`Failed to generate ${testType.value} test due to an earlier error.`, "bot", "red");

  isLoading.value = false;
};

watch(
  () => messages.value.length,
  () => {
    scrollToBottom()
  }
)
</script>

<template lang="pug">
.chatbox-container
  .chatbox-header
    h1 Simple Chatbot

  .chatbox-content
    .messages-area(ref="messagesAreaRef")
      .message(v-for="msg in messages" :key="msg.id" :class="['message-' + msg.sender, msg.status ? 'message-' + msg.status : '']")
        
        .status-dot
          template(v-if="msg.text.startsWith('On processing') && msg.sender === 'bot'")
            .spinner
          template(v-else)
            .dot(:style="{ backgroundColor: msg.color || '#000' }")
        .message-body
          .message-content(:style="{ color: msg.color }") {{ msg.text }}

    .input-area
      textarea(
        v-model="newMessage" 
        @keydown.enter.exact.prevent="sendMessage" 
        :disabled="isLoading || !isApiKeySet" 
        placeholder="Type your message..." 
        rows="4"
      )
      .button-container
        button.clear-btn(
          @click="clearChat"
          :disabled="isLoading"
        ) Clear
        .test-type-selection
          label
            input(type="radio" v-model="testType" value="cypress")
            span Cypress
          label
            input(type="radio" v-model="testType" value="playwright")
            span Playwright
        button(
          @click="sendMessage" 
          :disabled="isLoading || !isApiKeySet"
        ) Send
    


    .api-key-area(v-if="showApiKeyInput")
      p(v-if="!isApiKeySet" class="api-key-warning") Please set your Gemini API Key below to enable chat.
      div.api-key-input-group
        input(type="password" v-model="apiKeyInput" placeholder="Enter Gemini API Key" @keyup.enter="saveApiKey")
        button(@click="saveApiKey") Save Key

</template>

<style scoped>
.chatbox-container {
  position: fixed;
  bottom: 0;
  right: 0;
  width: 100%;
  height: 100vh;
  max-height: 100vh;
  display: flex;
  flex-direction: column;
  border: 1px solid #ccc;
  overflow: hidden;
  font-family: sans-serif;
  background-color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.open-chat-btn {
  position: fixed;
  bottom: 200px;
  right: 20px;
  width: 60px;
  height: 60px;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 50%;
  font-size: 1.5em;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  z-index: 9998;
  transition: background-color 0.3s ease;
}
.open-chat-btn:hover {
  background-color: #45a049;
}

.chatbox-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 10px;
  background-color: #f1f1f1;
  border-bottom: 1px solid #ccc;
  min-height: 40px;
}

h1 {
  padding: 10px 0;
  margin: 0;
  font-size: 1.1em;
  flex-grow: 1;
  text-align: center;
}

.close-btn,
.open-btn {
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

.chatbox-content {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  overflow: hidden;
}

.messages-area {
  flex-grow: 1;
  padding: 15px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background-color: #f9f9f9;
  align-items: center; /* Center messages horizontally */
}

.message {
  padding: 8px 12px;
  border-radius: 15px;
  word-wrap: break-word;
}

.message-user {
  background-color: #dcf8c6;
  margin: 0 auto; /* Center the message */
  text-align: center; /* Center text within the message bubble */
  max-width: 90%;
  width: 90%;
}

.message-user.message-running {
  background-color: orange;
}

.message-user.message-failed {
  background-color: red;
}

.message-user.message-pending {
  background-color: gray;
}

.message-bot {
  background-color: #e5e5ea;
  color: #000;
  margin: 0 auto; /* Center the message */
  display: flex;
  align-items: center;
  max-width: 90%;
  width: 90%;
}

.message-body {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex: 1;
  min-width: 0;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 8px;
  flex-shrink: 0;
}

.message-content {
  margin-bottom: 3px;
  word-break: break-word;
  white-space: pre-wrap;
}


.input-area {
  padding: 10px;
  border-top: 1px solid #ccc;
  background-color: #f1f1f1;
  display: flex;
  flex-direction: column;
}

.input-area textarea {
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 20px;
  width: 100%;
  margin-bottom: 10px;
  resize: vertical;
}

.button-container {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  width: 100%;
}

.test-type-selection {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-right: auto; /* Pushes the radio buttons to the left */
}

.test-type-selection label {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: 0.9em;
  color: #555;
}

.test-type-selection input[type="radio"] {
  margin-right: 5px;
}

.input-area button {
  padding: 10px 15px;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.input-area button:hover {
  background-color: #45a049;
}

.loading-indicator {
  text-align: center;
  padding: 10px;
  color: #888;
  font-style: italic;
}

.input-area input:disabled,
.input-area button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.api-key-area {
  padding: 10px;
  border-top: 1px dashed #ccc;
  background-color: #f9f9f9;
}

.api-key-warning {
  color: #d9534f;
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
  background-color: #5bc0de;
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
