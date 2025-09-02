<script setup>
import { ref, computed, watch } from "vue";
import { useLocalStorage } from "@vueuse/core";
import { v4 as uuidv4 } from 'uuid';

import Chat from "./views/Chat.vue";
import History from "./views/History.vue";
import Settings from "./views/Settings.vue";

const API_URL_INTERACT = "http://localhost:3456/api/process-dom";
const API_URL_GENERATE = "http://localhost:3456/api/generate-auto-test";

const apiKey = useLocalStorage("gemini-api-key", "");
const showConfig = ref(false);
const showHistory = ref(false);

const showApiKeyInput = ref(!apiKey.value);

watch(
  apiKey,
  (newKey) => {
    if (newKey) {
      showApiKeyInput.value = false;
    } else {
      console.log("Gemini client requires an API key.");
      showApiKeyInput.value = true;
    }
  },
  { immediate: true }
);

const isApiKeySet = computed(() => !!apiKey.value);

const channels = useLocalStorage("chat-channels", {});
const currentChannelId = useLocalStorage("current-chat-channel-id", null);
const isLoading = ref(false);
const testType = useLocalStorage("test-type", "cypress");

const createNewChannel = () => {
  const emptyChannelId = Object.keys(channels.value).find(id => {
    const channel = channels.value[id];
    return channel.messages.length === 1 && channel.messages[0].text === "Hello! Ask me anything.";
  });

  if (emptyChannelId) {
    currentChannelId.value = emptyChannelId;
  } else {
    const newId = uuidv4();
    channels.value[newId] = {
      messages: [{
        id: uuidv4(),
        text: "Hello! Ask me anything.",
        sender: "bot",
        timestamp: Date.now(),
      }],
    };
    currentChannelId.value = newId;
  }
  showHistory.value = false;
};

const switchChannel = (channelId) => {
  currentChannelId.value = channelId;
  showHistory.value = false;
};

const deleteChannel = (channelIdToDelete) => {
  if (Object.keys(channels.value).length === 1) {
    alert("Cannot delete the last channel.");
    return;
  }

  const newChannels = { ...channels.value };
  delete newChannels[channelIdToDelete];
  channels.value = newChannels;

  if (currentChannelId.value === channelIdToDelete) {
    currentChannelId.value = Object.keys(channels.value)[0];
  }
};

if (Object.keys(channels.value).length === 0) {
  createNewChannel();
}

watch(channels, (newChannels) => {
  if (!currentChannelId.value || !newChannels[currentChannelId.value]) {
    const firstChannelId = Object.keys(newChannels)[0];
    if (firstChannelId) {
      currentChannelId.value = firstChannelId;
    }
  }
}, { immediate: true });

const messages = computed(() => {
  if (currentChannelId.value && channels.value[currentChannelId.value]) {
    return channels.value[currentChannelId.value].messages;
  }
  return [];
});

const addMessageToChat = (text, sender, color = undefined, customId = undefined, status = undefined) => {
  if (currentChannelId.value && channels.value[currentChannelId.value]) {
    channels.value[currentChannelId.value].messages.push({
      id: customId || uuidv4(),
      text,
      sender,
      timestamp: Date.now(),
      ...(color && { color }),
      ...(status && { status }),
    });
  }
};

const clearChat = () => {
  if (currentChannelId.value && channels.value[currentChannelId.value]) {
    channels.value[currentChannelId.value].messages = [];
  }
};

const handleSendMessage = async (userText) => {
  const commands = userText
    .split("\n")
    .map((cmd) => cmd.trim())
    .filter((cmd) => cmd !== "");
  if (commands.length === 0) {
    return;
  }

  for (const command of commands) {
    addMessageToChat(command, "user", undefined, Date.now(), 'pending');
  }

  isLoading.value = true;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const generateData = await processCommandsAndGenerateTest(commands, tab);

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

async function processCommandsAndGenerateTest(commandsToProcess, activeTab) {
  for (let i = 0; i < commandsToProcess.length; i++) {
    const command = commandsToProcess[i];
    let currentCommandAiResponse;

    const userMessageIndex = messages.value.findIndex(m => m.text === command && m.sender === 'user' && m.status === 'pending');
    if (userMessageIndex > -1) {
      messages.value[userMessageIndex].status = 'running';
    }

    if (command.toLowerCase().startsWith("check if")) {
      addMessageToChat(`Command: ${command}`, "bot");
      if (userMessageIndex > -1) {
        messages.value[userMessageIndex].status = 'success';
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
      currentCommandAiResponse = interactApiData;

    } catch (apiError) {
      console.error("API error:", apiError);
      addMessageToChat(`Error processing command "${command}": ${apiError.message}`, "bot", "red");
      if (userMessageIndex > -1) {
        messages.value[userMessageIndex].status = 'failed';
      }
      return null;
    }

    if (currentCommandAiResponse.action === 'assert') {
      if(currentCommandAiResponse.success === true){
        messages.value[userMessageIndex].status = 'success';
      }
      else{
        messages.value[userMessageIndex].status = 'failed';
      }
    }
    else if (currentCommandAiResponse) {
      const actionData = currentCommandAiResponse;
      if (actionData.error) {
        addMessageToChat(`AI Error for "${command}": ${actionData.error}`, "bot");
        if (userMessageIndex > -1) {
          messages.value[userMessageIndex].status = 'failed';
        }
        return null;
      } else {
        const res = await chrome.tabs.sendMessage(activeTab.id, { action: "DOMAction", response: actionData });
        if (res.error) {
          addMessageToChat(`Execution error for "${command}": ${res.error}`, "bot", "red");
          if (userMessageIndex > -1) {
            messages.value[userMessageIndex].status = 'failed';
          }
          return null;
        } else {
          if (userMessageIndex > -1) {
            messages.value[userMessageIndex].status = 'success';
          }
        }
      }
    } else {
      addMessageToChat(`No action performed for "${command}" due to prior error or no AI directive.`, "bot", "orange");
      if (userMessageIndex > -1) {
        messages.value[userMessageIndex].status = 'failed';
      }
      return null;
    }
  }

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
        testType: testType.value,
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
  }
  return generateApiResult;
}
</script>

<template lang="pug">
.chatbox-container
  .chatbox-header
    .header-icons
      button.new-chat-icon-btn(@click="createNewChannel")
        svg(xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24px" height="24px")
          path(d="M0 0h24v24H0z" fill="none")
          path(d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z")
      button.history-icon-btn(@click="showHistory = !showHistory")
        svg(xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24px" height="24px")
          path(d="M0 0h24v24H0z" fill="none")
          path(d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.51 0-2.91-.49-4.06-1.3l-1.42 1.42C9.17 21.23 10.9 22 13 22c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z")
      button.config-icon-btn(@click="showConfig = !showConfig")
        svg(xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24px" height="24px")
          path(d="M0 0h24v24H0z" fill="none")
          path(d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.09-.73-1.7-.98l-.35-2.5c-.05-.24-.24-.41-.48-.41h-4c-.24 0-.43.17-.48.41l-.35 2.5c-.61.25-1.18.58-1.7.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.12.22-.07.49.12.64l2.11 1.65c-.04.32-.07.64-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.09.73 1.7.98l.35 2.5c.05.24.24.41.48.41h4c.24 0 .43-.17.48-.41l.35-2.5c.61-.25 1.18-.58 1.7-.98l2.49 1c.22.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z")

  Chat(
    v-if="!showHistory && !showConfig"
    :messages="messages"
    :isLoading="isLoading"
    :isApiKeySet="isApiKeySet"
    :testType="testType"
    @send-message="handleSendMessage"
    @clear-chat="clearChat"
    @update:testType="testType = $event"
  )
  History(
    v-if="showHistory"
    :channels="channels"
    :currentChannelId="currentChannelId"
    @switch-channel="switchChannel"
    @delete-channel="deleteChannel"
    @close-history="showHistory = false"
  )
  Settings(
    v-if="showConfig"
    :apiKey="apiKey"
    :isApiKeySet="isApiKeySet"
    @update:apiKey="apiKey = $event"
    @close-config="showConfig = false"
  )
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
  justify-content: flex-end; /* Align items to the right */
  align-items: center;
  padding: 0 10px;
  background-color: #f1f1f1;
  border-bottom: 1px solid #ccc;
  min-height: 40px;
}

.header-icons {
  display: flex;
  gap: 5px; /* Space between icons */
}

.config-icon-btn,
.new-chat-icon-btn,
.history-icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  color: #555; /* Adjust color as needed */
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px; /* Make it clickable */
  height: 40px; /* Make it clickable */
}

.config-icon-btn:hover,
.new-chat-icon-btn:hover,
.history-icon-btn:hover {
  color: #000;
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

</style>
