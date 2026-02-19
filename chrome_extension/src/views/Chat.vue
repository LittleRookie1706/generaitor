<script setup>
import { ref, computed, watch, nextTick } from "vue";
import { useScroll } from "@vueuse/core";
import { v4 as uuidv4 } from 'uuid';

const props = defineProps({
  messages: Array,
  isLoading: Boolean,
  isApiKeySet: Boolean,
  testType: String,
  currentChannelId: String,
  channels: Object,
  apiKey: String,
});

const emit = defineEmits([
  "send-message",
  "clear-chat",
  "update:testType",
  "update:apiKey",
  "update:currentChannelId",
  "update:channels",
]);

const messagesAreaRef = ref(null);
const { y } = useScroll(messagesAreaRef);

const newMessage = ref("");

const sendMessage = () => {
  emit("send-message", newMessage.value);
  newMessage.value = "";
};

const clearChat = () => {
  emit("clear-chat");
};

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesAreaRef.value) {
      y.value = messagesAreaRef.value.scrollHeight;
    }
  });
};

watch(
  () => props.messages.length,
  () => {
    scrollToBottom();
  }
);

const localTestType = computed({
  get: () => props.testType,
  set: (value) => emit("update:testType", value),
});
</script>

<template lang="pug">
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
          input(type="radio" v-model="localTestType" value="cypress")
          span Cypress
        label
          input(type="radio" v-model="localTestType" value="playwright")
          span Playwright
      button(
        @click="sendMessage" 
        :disabled="isLoading || !isApiKeySet"
      ) Send
</template>

<style scoped>
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

.clear-btn {
  background-color: #dc3545 !important;
}

.clear-btn:hover {
  background-color: #c82333 !important;
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
</style>
