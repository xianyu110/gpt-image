<template>
  <div class="drawing-board">
    <!-- Secondary Navigation Tabs/Buttons -->
    <div class="secondary-tabs">
      <button 
        class="tab-button" 
        :class="{ active: activeSecondaryTab === 'generate' }" 
        @click="activeSecondaryTab = 'generate'"
      >
        <span class="tab-icon">🖼️</span> 生成图像
      </button>
      <button 
        class="tab-button" 
        :class="{ active: activeSecondaryTab === 'edit' }" 
        @click="activeSecondaryTab = 'edit'"
      >
         <span class="tab-icon">✏️</span> 编辑图像
      </button>
      <button 
        class="tab-button" 
        :class="{ active: activeSecondaryTab === 'history' }" 
        @click="activeSecondaryTab = 'history'"
      >
         <span class="tab-icon">📜</span> 历史绘图
      </button>
       <button 
        class="tab-button" 
        :class="{ active: activeSecondaryTab === 'billing' }" 
        @click="activeSecondaryTab = 'billing'"
        disabled
      >
         <span class="tab-icon">💰</span> 消费记录
      </button>
    </div>

    <!-- Content Area -->
    <div class="content-area">
      <div v-if="activeSecondaryTab === 'generate'">
        <ImageGenerator :api-endpoint="apiEndpoint" />
      </div>
      <div v-else-if="activeSecondaryTab === 'edit'">
         <ImageEditor :api-endpoint="apiEndpoint" /> 
      </div>
      <div v-else-if="activeSecondaryTab === 'history'">
         <ImageHistory :api-endpoint="apiEndpoint" />
      </div>
       <div v-else-if="activeSecondaryTab === 'billing'">
         <p>消费记录功能即将推出。</p> 
      </div>
    </div>

  </div>
</template>

<script>
// Import child components
import ImageGenerator from './ImageGenerator.vue';
import ImageEditor from './ImageEditor.vue';
import ImageHistory from './ImageHistory.vue';

export default {
  name: 'DrawingBoard',
  components: {
    ImageGenerator,
    ImageEditor,
    ImageHistory
  },
  props: {
    apiEndpoint: {
      type: String,
      default: '/api'
    }
  },
  data() {
    return {
      activeSecondaryTab: 'generate', // Default to generate tab
    };
  },
  // Add methods if needed for more complex logic
};
</script>

<style scoped>
.drawing-board {
  width: 100%;
}

.secondary-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
  flex-wrap: wrap; /* Allow tabs to wrap on smaller screens */
}

.tab-button {
  padding: 0.8rem 1.5rem;
  border: none;
  background-color: transparent;
  color: var(--text-secondary);
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  border-radius: 8px;
  transition: background-color 0.3s ease, color 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tab-button:hover {
  background-color: var(--input-bg);
  color: var(--text-color);
}

.tab-button.active {
  background-color: var(--primary-color);
  color: white; /* Or use a specific variable for active tab text */
  font-weight: 600;
}

.tab-button:disabled {
  color: #adb5bd; /* Lighter color for disabled */
  cursor: not-allowed;
  opacity: 0.7;
}

.tab-button:disabled:hover {
   background-color: transparent;
}

.tab-icon {
  font-size: 1.1rem;
}

.content-area {
  margin-top: 1rem;
}
</style> 