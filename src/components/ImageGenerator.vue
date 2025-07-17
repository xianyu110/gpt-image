<template>
  <div class="image-generator">
    <div class="card">
      <div class="form-group">
        <label for="prompt">
          <span class="label-icon">💬</span>
          输入提示词生成图片
        </label>
        <textarea
          id="prompt"
          class="form-control prompt-textarea"
          placeholder="例如：一只可爱的小猫咪坐在窗台上，阳光照射，背景是蓝天"
          v-model="prompt"
          rows="4"
        ></textarea>
      </div>
      
      <!-- Quick Play Modes -->
      <div class="play-modes">
         <h4 class="play-modes-label">快速玩法选择:</h4>
         <div class="play-mode-buttons">
            <button class="play-mode-button" @click="applyPlayMode('realistic')"><span>🧑</span> 真人绘制</button>
            <button class="play-mode-button" @click="applyPlayMode('multiObject')"><span>🧩</span> 生成多个对象</button>
            <button class="play-mode-button" @click="applyPlayMode('comicStrip')"><span>📖</span> 连环画制作</button>
            <button class="play-mode-button" @click="applyPlayMode('poster')"><span>🎓</span> 制作海报 (教育)</button>
            <button class="play-mode-button" @click="applyPlayMode('researchArt')"><span>🔬</span> 制作科研图</button>
            <button class="play-mode-button" @click="applyPlayMode('iphoneSelfie')"><span>🤳</span> iPhone自拍</button>
            <!-- Add more modes if needed -->
         </div>
      </div>
      
      <div class="form-controls">
        <div class="form-controls-row">
          <div class="form-group select-group">
            <label for="quality" class="small-label">画面质量</label>
            <select id="quality" class="form-control select-control" v-model="imageQuality">
              <option value="low">低质量</option>
              <option value="medium" selected>中等质量</option>
              <option value="high">高质量</option>
            </select>
          </div>
          
          <div class="form-group select-group">
            <label for="size" class="small-label">图片尺寸</label>
            <select id="size" class="form-control select-control" v-model="imageSize">
              <option value="1024x1024" selected>正方形</option>
              <option value="1024x1536">竖向</option>
              <option value="1536x1024">横向</option>
            </select>
          </div>

          <!-- Quantity Input -->
          <div class="form-group select-group">
            <label for="quantity" class="small-label">生成数量</label>
            <input 
              type="number" 
              id="quantity" 
              class="form-control number-input" 
              v-model.number="imageQuantityN" 
              min="1" 
              max="4"  
            />
          </div>
        </div>
        
        <button 
          class="btn btn-primary generate-btn" 
          @click="generateImage" 
          :disabled="isGenerating || !prompt"
        >
          <span class="loading" v-if="isGenerating"></span>
          <span class="btn-icon" v-if="!isGenerating">🪄</span>
          {{ isGenerating ? '生成中...' : '生成图片' }}
        </button>
      </div>
      
      <div class="status-message" v-if="statusMessage">
        <span class="status-icon">ℹ️</span>
        {{ statusMessage }}
      </div>
      
      <div class="error-message" v-if="error">
        <span class="error-icon">⚠️</span>
        {{ error }}
      </div>
    </div>
    
    <div class="result-container" v-if="generatedImages.length > 0">
      <p>生成结果 ({{ generatedImages.length }} 张):</p>
      <div class="result-grid">
         <div v-for="(image, index) in generatedImages" :key="index" class="result-card">
            <div class="result-image-container">
              <img 
                :src="image.url" 
                alt="Generated Image" 
                class="image-preview"
              />
            </div>
             <div class="action-buttons">
                <button class="btn btn-icon" @click="viewOriginalImage(image.url)" title="查看原图">🔍</button>
                <button class="btn btn-icon" @click="downloadImage(image.url, index)" title="下载图片">💾</button>
            </div>
            <!-- Optional: Display revised prompt if available -->
            <div class="revised-prompt" v-if="image.revised_prompt">
                 <span title="Revised Prompt">💡</span> {{ image.revised_prompt }}
            </div>
         </div>
      </div>
       <!-- Display original prompt below the grid -->
       <div class="prompt-display" v-if="prompt">
         <div class="prompt-content">
           <span class="prompt-icon">💬</span>
           <p>{{ prompt }}</p>
         </div>
       </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'ImageGenerator',
  props: {
    apiEndpoint: {
      type: String,
      default: '/api'
    },
    userStats: {
      type: Object,
      default: () => null
    }
  },
  emits: ['usage-updated'],
  data() {
    return {
      prompt: '',
      imageQuality: 'medium',
      imageSize: '1024x1024',
      imageQuantityN: 1,
      generatedImages: [],
      isGenerating: false,
      error: '',
      statusMessage: ''
    }
  },
  mounted() {
    // 检查API服务器状态
    this.checkApiStatus();
  },
  methods: {
    async checkApiStatus() {
      try {
        const response = await axios.get(`${this.apiEndpoint}/status`);
        if (response.data.status === 'ok') {
          console.log('API服务器状态正常');
        }
      } catch (error) {
        console.error('API服务器状态检查失败:', error);
        this.error = '无法连接到API服务器，请确保服务器已启动';
      }
    },
    applyPlayMode(mode) {
        let template = '';
        switch (mode) {
            case 'realistic':
              template = '写实照片风格，描绘 [主体]，[细节描述]。Realistic photo style depicting [subject], [detailed description].';
              break;
            case 'multiObject':
              template = '生成10-20个不同的 [对象类型]，例如 [示例1], [示例2], [示例3]。Generate 10-20 distinct [object type], such as [example 1], [example 2], [example 3].';
              break;
            case 'comicStrip':
              template = '创建一个包含4个画面的连环画，讲述关于 [故事主题] 的故事。画面风格：[风格描述]。Create a 4-panel comic strip about [story theme]. Art style: [style description].\nPanel 1: [描述]\nPanel 2: [描述]\nPanel 3: [描述]\nPanel 4: [描述]';
              break;
            case 'poster':
              template = '为 [活动/课程名称] 设计一张教育海报，主要内容是 [核心信息]，面向 [目标受众]。风格要求：[风格描述]。Design an educational poster for [event/course name] about [core message], targeting [audience]. Style requirements: [style description].';
              break;
            case 'researchArt':
              template = '为科研论文制作插图，类型：[图表类型：封面摘要图/ppt插图/技术路线图]，主题：[研究主题]，关键元素：[元素1], [元素2]。Create a scientific illustration for a research paper. Type: [figure type: cover/ppt/roadmap], Topic: [research topic], Key elements: [element 1], [element 2].';
              break;
            case 'iphoneSelfie':
              template = '请画一张极其平凡无奇的iPhone自拍照，没有明确的主体或构图感，就像是随手一拍的快照。照片略带运动模糊，阳光或店内灯光不均导致轻微曝光过度。角度尴尬、构图混乱，整体呈现出一种刻意的平庸感，就像是从口袋里拿手机时不小心拍到的一张自拍。主角是_____，背景是_____。';
              break;
            default:
              template = '';
        }
        // Replace the current prompt or append, depending on desired behavior.
        // Currently, it replaces the prompt.
        this.prompt = template;
     },
    async generateImage() {
      if (!this.prompt) {
        this.error = '请输入提示词';
        return;
      }
      if (this.imageQuantityN < 1 || this.imageQuantityN > 4) {
         this.error = '生成数量必须在 1 到 4 之间';
         return;
      }

      this.error = '';
      this.generatedImages = [];
      this.statusMessage = '正在连接服务器...';
      this.isGenerating = true;
      
      try {
        const requestData = {
          prompt: this.prompt,
          quality: this.imageQuality,
          size: this.imageSize,
          n: this.imageQuantityN
        };
        console.log('发送图像生成请求:', {
          endpoint: `${this.apiEndpoint}/images/generations`,
          data: requestData
        });
        
        this.statusMessage = `正在生成 ${this.imageQuantityN} 张图像，请稍候...`;
        
        const response = await axios({
          method: 'post',
          url: `${this.apiEndpoint}/images/generations`,
          headers: {
            'Content-Type': 'application/json'
          },
          data: requestData
        });
        
        console.log('图像生成响应:', response);
        
        if (response.data && response.data.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
          this.generatedImages = response.data.data;
          this.statusMessage = '';
          console.log(`成功生成 ${this.generatedImages.length} 张图片`);
          
          // 发出事件通知使用次数更新
          this.$emit('usage-updated');
        } else {
           console.error('响应数据格式不正确或未返回图片数组', response.data);
           throw new Error('响应数据格式不正确');
        }
      } catch (error) {
        console.error('生成图片错误:', error);
        this.generatedImages = [];
        if (error.response) {
          console.error('错误响应:', error.response.data);
          this.error = error.response.data?.error?.message || `请求失败 (${error.response.status})`;
        } else if (error.request) {
          console.error('无响应:', error.request);
          this.error = '服务器没有响应，请检查网络连接或服务器状态';
        } else {
          this.error = error.message || '图像生成失败';
        }
      } finally {
        this.isGenerating = false;
        this.statusMessage = '';
      }
    },
    viewOriginalImage(url) {
      if (url) {
        window.open(url, '_blank');
      }
    },
    downloadImage(url, index) {
      if (url) {
        const link = document.createElement('a');
        link.href = url;
        link.download = `ai-image-${new Date().getTime()}-${index + 1}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  }
}
</script>

<style scoped>
.image-generator {
  max-width: 1200px;
}

label {
  display: flex;
  align-items: center;
  font-weight: 600;
  margin-bottom: 0.6rem;
  color: #4a5568;
}

.label-icon {
  margin-right: 0.5rem;
  font-size: 1.2rem;
}

.small-label {
  font-size: 0.85rem;
  margin-bottom: 0.3rem;
  color: #6c757d;
}

.form-controls {
  margin-top: 1.5rem;
}

.form-controls-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.select-group {
  min-width: 150px;
}

.select-control {
  background-color: white;
  cursor: pointer;
  padding: 0.7rem 1rem;
}

.generate-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 1rem;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.btn-icon {
  margin-right: 0.5rem;
  font-size: 1.1rem;
}

.status-message {
  display: flex;
  align-items: center;
  color: #3182ce;
  font-size: 0.9rem;
  margin-top: 1rem;
  padding: 0.75rem;
  background-color: rgba(49, 130, 206, 0.1);
  border-radius: 8px;
}

.status-icon {
  margin-right: 0.5rem;
}

.error-message {
  display: flex;
  align-items: center;
  color: #e53e3e;
  font-size: 0.9rem;
  margin-top: 1rem;
  padding: 0.75rem;
  background-color: rgba(229, 62, 62, 0.1);
  border-radius: 8px;
}

.error-icon {
  margin-right: 0.5rem;
}

.result-container {
  margin-top: 2rem;
}

.result-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-top: 1rem;
    margin-bottom: 1.5rem;
}

.result-card {
    position: relative;
    background: var(--card-bg);
    border-radius: 8px;
    box-shadow: var(--card-shadow);
    overflow: hidden;
}

.result-image-container {
    width: 100%;
    padding-top: 100%;
    position: relative;
    background-color: var(--input-bg);
}

.image-preview {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
}

.result-card .action-buttons {
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    gap: 0.5rem;
    background-color: rgba(0, 0, 0, 0.5);
    padding: 0.3rem 0.5rem;
    border-radius: 6px;
    opacity: 0;
    transition: opacity 0.3s ease;
}

.result-card:hover .action-buttons {
    opacity: 1;
}

.action-buttons .btn-icon span {
    color: white;
    font-size: 1.1rem; 
    display: block;
    line-height: 1;
}

.revised-prompt {
    padding: 0.5rem 0.8rem;
    font-size: 0.8rem;
    color: var(--text-secondary);
    background-color: var(--input-bg);
    border-top: 1px solid var(--border-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.revised-prompt span {
    font-style: italic;
    margin-right: 0.3em;
}

.prompt-display {
  margin-top: 0;
}

.prompt-content {
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #6c5ce7;
  display: flex;
  align-items: flex-start;
}

.prompt-icon {
  margin-right: 0.5rem;
  font-size: 1.2rem;
}

.prompt-content p {
  margin: 0;
  color: #4a5568;
  font-size: 0.95rem;
  line-height: 1.5;
}

.loading {
  display: inline-block;
  width: 1.2em;
  height: 1.2em;
  margin-right: 0.7em;
  border: 2px solid #fff;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .form-controls-row {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .select-group {
    width: 100%;
  }
}

/* Play Modes Styles */
.play-modes {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: var(--input-bg);
  border-radius: 8px;
}

.play-modes-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 0.8rem;
}

.play-mode-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.play-mode-button {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color);
  background-color: var(--card-bg);
  color: var(--text-color);
  border-radius: 8px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.play-mode-button:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
  background-color: rgba(var(--primary-color-rgb, 108, 92, 231), 0.05); /* Need theme RGB */
  transform: translateY(-1px);
}

.play-mode-button span {
   font-size: 1rem;
}

.prompt-textarea {
    min-height: 100px; /* Slightly larger default height */
    margin-bottom: 1rem; /* Space below textarea */
}

.number-input {
  width: 80px;
  text-align: center;
}
</style>
