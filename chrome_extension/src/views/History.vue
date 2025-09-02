<script setup>
import { computed } from "vue";

const props = defineProps({
  channels: Object,
  currentChannelId: String,
});

const emit = defineEmits(["switch-channel", "delete-channel", "close-history"]);

const channelList = computed(() => {
  return Object.keys(props.channels).map((id, index) => ({
    id,
    title: `Channel ${index + 1}`,
    firstMessage: props.channels[id].messages[0] ? props.channels[id].messages[0].text : 'No messages yet.',
    isActive: id === props.currentChannelId,
  }));
});

const switchChannel = (channelId) => {
  emit("switch-channel", channelId);
};

const deleteChannel = (channelId) => {
  emit("delete-channel", channelId);
};

const closeHistory = () => {
  emit("close-history");
};
</script>

<template lang="pug">
.channel-history-overlay
  .history-header
    span.close-history-text(@click="closeHistory") &larr; Back
  ul.channel-list
    li(v-for="channel in channelList" :key="channel.id" @click="switchChannel(channel.id)" :class="{ 'active-channel': channel.isActive }")
      .channel-info
        span.channel-title {{ channel.title }}
        span.first-message {{ channel.firstMessage }}
      button.delete-channel-btn(@click.stop="deleteChannel(channel.id)") Delete
</template>

<style scoped>
.channel-history-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.95);
  z-index: 10000;
  display: flex;
  flex-direction: column;
  padding: 20px;
  box-sizing: border-box;
}

.channel-history-overlay .history-header {
  display: flex;
  justify-content: flex-start;
  padding-bottom: 10px;
}

.close-history-text {
  color: green;
  text-decoration: underline;
  cursor: pointer;
  font-size: 1.1em;
}

.channel-history-overlay h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #333;
}

.channel-list {
  list-style: none;
  padding: 0;
  margin: 0;
  flex-grow: 1;
  overflow-y: auto;
}

.channel-list li {
  padding: 10px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px; /* Space between channel info and delete button */
}

.channel-info {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.channel-title {
  font-weight: bold;
}

.first-message {
  font-size: 0.9em;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px; /* Adjust as needed */
}

.channel-list li:hover {
  background-color: #f0f0f0;
}

.channel-list li.active-channel {
  background-color: #e0e0e0;
  font-weight: bold;
}

.message-count {
  font-size: 0.8em;
  color: #777;
}

.delete-channel-btn {
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 5px;
  padding: 5px 10px;
  cursor: pointer;
  font-size: 0.8em;
  flex-shrink: 0; /* Prevent button from shrinking */
}

.delete-channel-btn:hover {
  background-color: #c82333;
}
</style>
