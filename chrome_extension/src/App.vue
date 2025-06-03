<script setup>
import { ref, computed, watch, nextTick } from "vue";
import { useDateFormat, useLocalStorage, useScroll } from "@vueuse/core";
import { getMinimizedDOM } from "./utils/domUtils.js";

import { isVisible } from "element-is-visible";

const messagesAreaRef = ref(null);
const { y } = useScroll(messagesAreaRef);

// Reactive Gemini API Setup
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
// Function to scroll messages area to bottom
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesAreaRef.value) {
      y.value = messagesAreaRef.value.scrollHeight;
    }
  });
};

// Initialize on component mount and watch for changes in stored key
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

// Chatbox State and Messages
const messages = useLocalStorage("chat-history", [
  {
    id: 1,
    text: "Hello! Ask me anything.",
    sender: "bot",
    timestamp: Date.now() - 10000,
  },
]);
const newMessage = ref("");
const isChatboxVisible = ref(false);
const isLoading = ref(false);

const formattedTimestamp = (ts) => {
  return useDateFormat(ts, "HH:mm").value;
};

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

  messages.value.push({
    id: Date.now(),
    text: `Commands: ${userText}`,
    sender: "user",
    timestamp: Date.now(),
  });

  newMessage.value = "";
  isLoading.value = true;

  const processingMessageId = Date.now();
  messages.value.push({
    id: processingMessageId,
    text: "Start...",
    sender: "bot",
    timestamp: Date.now(),
    color: "gray",
  });

  const API_URL_INTERACT = "http://localhost:3000/api/process-dom";

  let aiResponseText; 
  for (const command of commands) {
    const loadingMessageId = Date.now();
    messages.value.push({
      id: loadingMessageId,
      text: `On processing: "${command}"`,
      sender: "bot",
      timestamp: Date.now(),
      color: "gray",
    });

    if (command.toLowerCase().startsWith("check if")) {
      messages.value.push({
        id: Date.now(),
        text: `Command: ${command}`,
        sender: "bot",
        timestamp: Date.now(),
      });
      continue;
    }

    const currentDOM = getMinimizedDOM(document.body);
    try {
      const response = await fetch(API_URL_INTERACT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dom: currentDOM.outerHTML,
          commandText: command,
          apiKey: apiKey.value,
        }),
      });

      // Remove loading
    messages.value.pop();

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API Error: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();

    aiResponseText = data.aiResponse;

    console.log("AI response json:", aiResponseText);
    } catch (apiError) {
      console.error("API error:", apiError);
      messages.value.push({
        id: Date.now() + 1,
        text: `Error: ${apiError.message}`,
        sender: "bot",
        timestamp: Date.now(),
        color: "red",
      });
    }

    

    try {
      const actionData = JSON.parse(aiResponseText);

      if (actionData.error) {
        messages.value.push({
          id: Date.now() + 1,
          text: `AI Error: ${actionData.error}`,
          sender: "bot",
          timestamp: Date.now(),
        });
      } else if (actionData.selector && actionData.action) {
        // Query all matching elements
        const allMatchingElements = document.querySelectorAll(
          actionData.selector
        );
        let targetElement = null;

        if (allMatchingElements.length === 0) {
          messages.value.push({
            id: Date.now() + 1,
            text: `Error: No elements found for selector: ${actionData.selector}`,
            sender: "bot",
            timestamp: Date.now(),
          });
          continue;
        }
        // Handle multiple matching elements with index
        else if (allMatchingElements.length > 1) {
          if (
            typeof actionData.index === "number" &&
            actionData.index >= 0 &&
            actionData.index < allMatchingElements.length
          ) {
            targetElement = allMatchingElements[actionData.index];
          } else {
            targetElement = allMatchingElements[0];
          }
        }
        // Single element case
        else {
          targetElement = allMatchingElements[0];
        }

        if (!targetElement) {
          messages.value.push({
            id: Date.now() + 1,
            text: `Error: Could not determine which element to interact with`,
            sender: "bot",
            timestamp: Date.now(),
          });
        } else {
          let actionDescription = `${actionData.action} on ${actionData.selector}`;
          if (typeof actionData.index === "number") {
            actionDescription += ` (element #${actionData.index + 1})`;
          }

          switch (actionData.action.toLowerCase()) {
            case "click":
              targetElement.click();
              break;

            case "select":
              if (targetElement instanceof HTMLSelectElement) {
                let optionValue = null;

                if (actionData.optionValue) {
                  optionValue = actionData.optionValue;
                }
                else if (actionData.value) {
                  const options = Array.from(targetElement.options);
                  const matchingOption = options.find((option) =>
                    option.textContent.trim().includes(actionData.value)
                  );
                  if (matchingOption) {
                    optionValue = matchingOption.value;
                  }
                }

                if (optionValue !== null) {
                  targetElement.value = optionValue;
                  actionDescription += ` with value "${optionValue}" (${
                    actionData.value || ""
                  })`;

                  targetElement.dispatchEvent(
                    new Event("change", { bubbles: true })
                  );

                  if (
                    actionData.isSelect2 ||
                    targetElement.classList.contains(
                      "select2-hidden-accessible"
                    )
                  ) {
                    if (
                      window.jQuery &&
                      window.jQuery(targetElement).data("select2")
                    ) {
                      window.jQuery(targetElement).trigger("change");
                    }

                    actionDescription += " (Select2 force approach)";
                  }
                } else {
                  throw new Error(
                    `Option "${actionData.value}" not found in select element.`
                  );
                }
              } else {
                throw new Error(`'select' action requires a SELECT element.`);
              }
              break;

            case "type":
              if (typeof actionData.value === "string") {
                if (
                  targetElement instanceof HTMLInputElement ||
                  targetElement instanceof HTMLTextAreaElement
                ) {
                  targetElement.value = actionData.value;
                  actionDescription += ` with value "${actionData.value}"`;
                  targetElement.dispatchEvent(
                    new Event("input", { bubbles: true })
                  );
                  targetElement.dispatchEvent(
                    new Event("change", { bubbles: true })
                  );
                } else {
                  throw new Error(
                    `Element for 'type' is not an input or textarea.`
                  );
                }
              } else {
                throw new Error(`'type' action requires a 'value' string.`);
              }
              break;

            case "focus":
              targetElement.focus();
              break;

            case "submit":
              if (targetElement instanceof HTMLFormElement) {
                targetElement.submit();
              } else if (targetElement.form) {
                targetElement.form.submit();
              } else {
                throw new Error(
                  `Cannot 'submit' element directly, and it's not part of a form.`
                );
              }
              break;

            default:
              throw new Error(`Unsupported action: ${actionData.action}`);
          }

          messages.value.push({
            id: Date.now() + 1,
            text: `Executed: ${command}`,
            sender: "bot",
            timestamp: Date.now(),
            color: "green",
          });
        }
      } else {
        throw new Error("Invalid JSON structure received from AI.");
      }
    } catch (parseOrExecError) {
      messages.value.push({
        id: Date.now() + 1,
        text: `Execution Error: ${parseOrExecError.message}. AI Response: ${aiResponseText}`,
        sender: "bot",
        timestamp: Date.now(),
        color: "red",
      });
    }
  }

  // ===========================

  const API_URL = "http://localhost:3000/api/generate-cypress";

  let data;
  const currentDOM = getMinimizedDOM(document.body);
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dom: currentDOM.outerHTML,
        commandText: commands,
        apiKey: apiKey.value,
      }),
    });

    if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`API Error: ${errorData.error || response.statusText}`);
  }

  data = await response.json();
  aiResponseText = data.aiResponse;

  } catch (apiError) {
    messages.value.push({
      id: Date.now() + 1,
      text: `Error: ${apiError.message}`,
      sender: "bot",
      timestamp: Date.now(),
      color: "red",
    });
  }

  for (const item of data.individual) {
    if (item.error) {
      messages.value.push({
        text: `Command: ${item.command}\nError: ${item.error}`,
        sender: "bot",
        color: "red",
      });
    }
  }

  messages.value.push({
    text: `Complete Cypress Test:\n${data.fullScript}`,
    sender: "bot",
    color: "green",
  });

  isLoading.value = false;
};

watch(isChatboxVisible, async (isVisible) => {
  if (isVisible) {
    await nextTick();
    scrollToBottom();
  }
});

watch(
  messages,
  () => {
    if (isChatboxVisible.value) {
      scrollToBottom();
    }
  },
  { deep: true }
);
</script>

<template lang="pug">
button.open-chat-btn(v-if="!isChatboxVisible" @click="isChatboxVisible = true") 💬

.chatbox-container(v-if="isChatboxVisible")
  .chatbox-header
    h1 Simple Chatbot
    button.close-btn(@click="isChatboxVisible = false") &times;

  .chatbox-content
    .messages-area(ref="messagesAreaRef")
      .loading-indicator Thinking...
      .message(v-for="msg in messages" :key="msg.id" :class="['message-' + msg.sender]")
        
        .status-dot
          template(v-if="msg.text.startsWith('On processing') && msg.sender === 'bot'")
            .spinner
          template(v-else)
            .dot(:style="{ backgroundColor: msg.color || '#000' }")
        .message-body
          .message-content(:style="{ color: msg.color }") {{ msg.text }}
          .timestamp {{ formattedTimestamp(msg.timestamp) }}

    .input-area
      textarea(
        v-model="newMessage" 
        @keydown.enter.exact.prevent="sendMessage" 
        :disabled="isLoading || !isApiKeySet" 
        placeholder="Type your message..." 
        rows="4"
      )
      .button-container
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
  bottom: 20px;
  right: 20px;
  width: 350px;
  height: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  border: 1px solid #ccc;
  border-radius: 8px;
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
}

.message {
  padding: 8px 12px;
  border-radius: 15px;
  max-width: 70%;
  word-wrap: break-word;
}

.message-user {
  background-color: #dcf8c6;
  align-self: flex-end;
  text-align: right;
}

.message-bot {
  background-color: #e5e5ea;
  color: #000;
  align-self: flex-start;
  display: flex;
  align-items: center;
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
}

.timestamp {
  font-size: 0.7em;
  color: #888;
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
  width: 100%;
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
