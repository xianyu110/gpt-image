<template>
  <div class="image-history">
    <h2>历史绘图</h2>
    <div v-if="loading" class="loading-indicator">
      <span class="loading"></span> 加载历史记录中...
    </div>
    <div v-else-if="error" class="error-message">
      <span class="error-icon">⚠️</span> {{ error }}
    </div>
    <div v-else-if="history.length === 0" class="empty-state">
      <span class="empty-icon">📂</span> 暂无历史记录
    </div>
    <div v-else class="history-grid">
      <div v-for="item in history" :key="item.id" class="history-item card">
        <div class="image-container">
          <img v-if="item.status === 'success' && item.imageUrl" :src="item.imageUrl" alt="Generated Image" class="history-image" @error="handleImageError"/>
          <div v-else-if="item.status === 'failed'" class="failed-placeholder">
            <span class="error-icon">❗️</span>
            <p>绘图失败</p>
            <small v-if="item.error">{{ item.error }}</small>
          </div>
           <div v-else class="failed-placeholder"> 
             <span class="loading"></span> 处理中... 
           </div>
        </div>
        <div class="item-info">
           <p class="prompt" :title="item.prompt">{{ item.prompt ? truncateText(item.prompt, 50) : '无提示词' }}</p>
           <div class="details">
             <span>{{ formatTimestamp(item.timestamp) }}</span>
             <span>{{ item.size }}</span>
             <span :class="['status-badge', item.status]">{{ getStatusText(item.status) }}</span>
           </div>
        </div>
         <div class="actions">
            <button class="btn btn-icon btn-sm" @click="viewImage(item.imageUrl)" v-if="item.status === 'success' && item.imageUrl" title="查看大图">🔍</button>
            <button class="btn btn-icon btn-sm" @click="copyPrompt(item.prompt)" v-if="item.prompt" title="复制提示词">📋</button>
            <!-- Add delete button later if needed -->
         </div>
      </div>
    </div>
    <!-- Add pagination controls later -->
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'ImageHistory',
  props: {
    apiEndpoint: {
      type: String,
      default: '/api'
    }
  },
  data() {
    return {
      history: [],
      loading: false,
      error: '',
    };
  },
  created() {
    this.fetchHistory();
  },
  methods: {
    async fetchHistory() {
      this.loading = true;
      this.error = '';
      try {
        const response = await axios.get(`${this.apiEndpoint}/history`);
        this.history = response.data.history || [];
      } catch (err) {
        console.error('获取历史记录失败:', err);
        this.error = err.response?.data?.error?.message || err.message || '加载历史记录失败';
      } finally {
        this.loading = false;
      }
    },
    formatTimestamp(timestamp) {
      if (!timestamp) return '';
      try {
        const date = new Date(timestamp);
        // More user-friendly format
        return date.toLocaleString('zh-CN', { 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit', 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      } catch (e) {
        return timestamp; // Fallback
      }
    },
    getStatusText(status) {
      switch (status) {
        case 'success': return '成功';
        case 'failed': return '失败';
        case 'pending': return '处理中'; // Assuming a pending state might exist
        default: return status;
      }
    },
     truncateText(text, maxLength) {
      if (!text) return '';
      return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    },
    handleImageError(event) {
      // Optional: Replace broken image links with a placeholder
      console.warn('图片加载失败:', event.target.src);
      // event.target.src = '/path/to/placeholder.png'; // Example placeholder
       event.target.style.display = 'none'; // Hide broken image icon
       const container = event.target.parentElement;
       if (container && !container.querySelector('.failed-placeholder')) {
           const placeholder = document.createElement('div');
           placeholder.className = 'failed-placeholder';
           placeholder.innerHTML = '<span class="error-icon">🖼️</span><p>图片加载失败</p>';
           container.appendChild(placeholder);
       }
    },
    viewImage(url) {
       if(url) window.open(url, '_blank');
    },
    async copyPrompt(prompt) {
      if (!prompt) return;
      try {
        await navigator.clipboard.writeText(prompt);
        // Optional: Show a success message
        console.log('提示词已复制!'); 
      } catch (err) {
        console.error('复制失败:', err);
        // Optional: Show an error message
      }
    }
  }
};
</script>

<style scoped>
.image-history {
  padding: 1rem;
  /* background-color: var(--card-bg);
  border-radius: 8px;
  box-shadow: var(--card-shadow); */
  margin-top: 1rem;
}

h2 {
  margin-bottom: 1.5rem;
  color: var(--text-color);
  font-size: 1.4rem;
  font-weight: 600;
}

.loading-indicator, .error-message, .empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.loading {
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-left-color: var(--primary-color);
  border-radius: 50%;
  width: 20px;
  height: 20px;
  animation: spin 1s linear infinite;
  display: inline-block;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-icon, .empty-icon {
  font-size: 1.5rem;
  margin-right: 0.5rem;
}

.error-message {
  color: #e53e3e; /* Consider using theme variable */
  background-color: rgba(229, 62, 62, 0.1);
  border: 1px solid rgba(229, 62, 62, 0.2);
  border-radius: 8px;
  padding: 1rem;
}

.history-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1.5rem;
}

.history-item {
  background-color: var(--card-bg);
  border-radius: 8px;
  box-shadow: var(--card-shadow);
  transition: box-shadow 0.3s ease;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.history-item:hover {
   box-shadow: var(--card-shadow-hover);
}

.image-container {
  position: relative;
  width: 100%;
  padding-top: 100%; /* 1:1 Aspect Ratio */
  background-color: var(--input-bg); /* Placeholder background */
  overflow: hidden;
}

.history-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover; /* Cover the container */
  display: block;
}

.failed-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.9rem;
  padding: 1rem;
}

.failed-placeholder .error-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  color: #e53e3e; /* Consider theme variable */
}

.item-info {
  padding: 0.8rem 1rem;
  border-top: 1px solid var(--border-color);
  flex-grow: 1; /* Take remaining space */
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.prompt {
  font-size: 0.9rem;
  color: var(--text-color);
  margin-bottom: 0.5rem;
  line-height: 1.4;
  /* Allow prompt to wrap */
  word-break: break-word; 
  height: 2.8em; /* Limit to 2 lines approx */
  overflow: hidden;
}

.details {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  color: var(--text-secondary);
  flex-wrap: wrap; /* Allow wrapping on small cards */
  gap: 0.5rem;
}

.status-badge {
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
  font-weight: 500;
  font-size: 0.75rem;
}

.status-badge.success {
  background-color: rgba(76, 175, 80, 0.15);
  color: #38a169; /* Consider theme variable */
}

.status-badge.failed {
  background-color: rgba(229, 62, 62, 0.15);
  color: #e53e3e; /* Consider theme variable */
}

.status-badge.pending {
  background-color: rgba(49, 130, 206, 0.15);
  color: #3182ce; /* Consider theme variable */
}

.actions {
  padding: 0.5rem 1rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.btn-sm {
  padding: 0.3rem 0.6rem;
  font-size: 0.8rem;
}

.btn-icon {
   background: none;
   border: none;
   color: var(--text-secondary);
   cursor: pointer;
   font-size: 1.1rem;
   padding: 0.2rem;
   border-radius: 4px;
   transition: background-color 0.2s, color 0.2s;
}

.btn-icon:hover {
  background-color: var(--input-bg);
  color: var(--text-color);
}

</style> 