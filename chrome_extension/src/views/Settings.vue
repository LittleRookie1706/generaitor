<script setup>
import { ref, computed } from "vue";

const props = defineProps({
  apiKey: String,
  isApiKeySet: Boolean,
});

const emit = defineEmits(["update:apiKey", "close-config"]);

const apiKeyInputType = ref("password");

const toggleApiKeyVisibility = () => {
  apiKeyInputType.value = apiKeyInputType.value === "password" ? "text" : "password";
};

const localApiKey = computed({
  get: () => props.apiKey,
  set: (value) => emit("update:apiKey", value),
});

const closeConfig = () => {
  emit("close-config");
};
</script>

<template lang="pug">
.config-overlay
  .config-header
    span.back-to-chat-text(@click="closeConfig") &larr; Back
  .config-content
    p(v-if="!isApiKeySet" class="api-key-warning") Please set your Gemini API Key.
    .api-key-input-group
      input(:type="apiKeyInputType" v-model="localApiKey" placeholder="Gemini API Key")
      button.api-key-toggle-btn(@click="toggleApiKeyVisibility")
        svg(xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24px" height="24px")
          path(v-if="apiKeyInputType === 'password'" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z")
          path(v-else d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 9c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zM2 4.27l2.59 2.59C3.71 7.57 3.07 8.74 3.07 10c0 2.76 2.24 5 5 5 .64 0 1.25-.13 1.82-.36L12 17.17l.88-.88c3.39-.49 6.02-3.39 6.02-6.89 0-1.26-.37-2.43-.99-3.43L20.73 2 19.3 3.43 2 4.27z")
</template>

<style scoped>
.config-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #fff; /* Removed opacity */
  z-index: 10000;
  display: flex;
  flex-direction: column;
  padding: 20px;
  box-sizing: border-box;
}

.config-header {
  display: flex;
  justify-content: flex-start;
  padding-bottom: 10px;
}

.back-to-chat-text {
  color: green;
  text-decoration: underline;
  cursor: pointer;
  font-size: 1.1em;
}

.config-content {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.config-content h3 {
  margin-top: 0;
  color: #333;
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
  align-items: center; /* Align items vertically */
}

.api-key-input-group input {
  flex-grow: 1;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.api-key-input-group button {
  padding: 8px 12px;
  background-color: #4caf50; /* Green color for buttons in config */
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}
.api-key-input-group button:hover {
  background-color: #45a049; /* Darker green on hover */
}

.api-key-toggle-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  color: #555;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
}

.api-key-toggle-btn:hover {
  color: #000;
}
</style>
