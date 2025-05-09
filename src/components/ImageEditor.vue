<template>
  <div class="image-editor">
    <div class="editor-layout">
      <!-- Left Panel: Upload, Styles, Prompt, Settings -->
      <div class="left-panel">
        <div class="card">
          <h3>
            <span class="panel-icon">⬆️</span> 上传图片
          </h3>
          <div class="upload-area-container">
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              class="file-input"
              @change="handleImageUpload"
              multiple
            />
            <label 
              for="image-upload" 
              class="upload-area"
              @dragover.prevent="handleDragOver"
              @dragleave.prevent="handleDragLeave"
              @drop.prevent="handleDrop"
              :class="{ 'drag-over': isDragging }"
            >
              <div class="upload-content">
                <div class="upload-icon-large">🖼️</div>
                <div class="upload-text-main">拖放或点击上传图片</div>
                <div class="upload-text-secondary">支持 JPG, PNG, WEBP, JPEG 格式, 大小不超过10MB</div>
              </div>
            </label>
          </div>
          <!-- Image Thumbnails (Optional, keep if needed) -->
          <div class="image-thumbnails" v-if="images.length > 0">
            <div 
              v-for="(image, index) in images" 
              :key="index" 
              class="image-thumbnail"
              :class="{ 'active': currentImageIndex === index }"
              @click="selectImage(index)"
            >
              <img :src="image.preview" alt="Thumbnail" />
              <button class="remove-image-btn" @click.stop="removeImage(index)">✕</button>
            </div>
          </div>
        </div>

        <div class="card">
          <h3>
            <span class="panel-icon">✨</span> 快速风格选择
          </h3>
          <div class="preset-styles">
            <!-- Add more buttons based on screenshot -->
            <button class="preset-button" @click="applyPresetStyle('吉卜力风格')"><span>🎨</span> 吉卜力风格</button>
            <button class="preset-button" @click="applyPresetStyle('3D渲染风格')"><span>🧊</span> 3D渲染风格</button>
            <button class="preset-button" @click="applyPresetStyle('Q版公仔风格')"><span>🧸</span> Q版公仔风格</button>
            <button class="preset-button" @click="applyPresetStyle('赛博朋克风格')"><span>🌃</span> 赛博朋克</button>
            <button class="preset-button" @click="applyPresetStyle('日式动漫风格')"><span>🎭</span> 日式动漫</button>
            <button class="preset-button" @click="applyPresetStyle('水彩画风格')"><span>💧</span> 水彩画风格</button>
            <button class="preset-button" @click="applyPresetStyle('日本小人风格')"><span>🎎</span> 日本小人</button>
            <button class="preset-button" @click="applyPresetStyle('Q版表情贴纸')"><span>😀</span> Q版表情</button>
             <button class="preset-button" @click="applyPresetStyle('四宫格漫画')"><span>📖</span> 四宫格</button>
            <button class="preset-button" @click="applyPresetStyle('史努比风格')"><span>🐶</span> 史努比</button>
            <button class="preset-button" @click="applyPresetStyle('二次元风格')"><span>🌸</span> 二次元</button>
            <button class="preset-button" @click="applyPresetStyle('像素风格')"><span>👾</span> 像素风格</button>
            <button class="preset-button" @click="applyPresetStyle('迪士尼风格')"><span>🏰</span> 迪士尼</button>
            <button class="preset-button" @click="applyPresetStyle('皮克斯风格')"><span>💡</span> 皮克斯</button>
            <button class="preset-button" @click="applyPresetStyle('写实风格')"><span>📷</span> 写实风格</button>
          </div>
        </div>

        <div class="card">
          <h3>
             <span class="panel-icon">✍️</span> 编辑提示词
          </h3>
          <div class="form-group">
            <textarea
              id="edit-prompt"
              class="form-control prompt-textarea"
              placeholder="添加一个明亮的阳光效果和温暖的色调"
              v-model="editPrompt"
              rows="4"
            ></textarea>
          </div>
          <div class="form-controls-row">
            <div class="form-group select-group">
              <label for="edit-quality">画面质量</label>
              <select id="edit-quality" class="form-control select-control" v-model="imageQuality">
                <option value="low">低质量</option>
                <option value="medium" selected>中等质量</option>
                <option value="high">高质量</option>
              </select>
            </div>
            <div class="form-group select-group">
              <label for="edit-size">图片尺寸</label>
              <select id="edit-size" class="form-control select-control" v-model="imageSize">
                <option value="1024x1024" selected>正方形 (1:1)</option>
                <option value="1024x1536">竖向 (2:3)</option>
                <option value="1536x1024">横向 (3:2)</option>
              </select>
            </div>
          </div>
          <button 
            class="btn btn-primary edit-btn" 
            @click="editImage" 
            :disabled="isEditing || !currentImage || !editPrompt"
          >
            <span class="loading" v-if="isEditing"></span>
            <span class="btn-icon" v-if="!isEditing">⚡</span>
            {{ isEditing ? '编辑中...' : '开始编辑' }}
          </button>
           <div class="error-message" v-if="error">
             <span class="error-icon">⚠️</span> {{ error }}
           </div>
           <div class="status-indicator" v-if="statusMessage">
             <span class="status-icon">{{ statusIcon }}</span> {{ statusMessage }}
           </div>
        </div>
      </div>

      <!-- Right Panel: Preview and Hints -->
      <div class="right-panel">
        <div class="card preview-card">
           <h3>
             <span class="panel-icon">🖼️</span> 您的图像将在这里显示
           </h3>
           <div class="preview-area">
              <div v-if="!editedImage" class="preview-placeholder">
                  <div class="placeholder-icon">🎨</div>
                  <p>上传图片并输入提示词，</p>
                  <p>点击"开始编辑"按钮开始创作</p>
              </div>
             <div v-if="editedImage" class="result-image-container">
                <img 
                  :src="editedImage" 
                  alt="Edited" 
                  class="image-preview"
                />
                <div class="action-buttons">
                    <button class="btn btn-icon" @click="viewOriginalImage" title="查看原图">🔍</button>
                    <button class="btn btn-icon" @click="downloadImage" title="下载图片">💾</button>
                </div>
             </div>
           </div>
        </div>
        <div class="card hints-card">
          <h3><span class="panel-icon">💡</span> 图片编辑提示</h3>
          <ul>
            <li>明确描述您想要的具体变化，如"将背景改为海滩场景"。</li>
            <li>选择合适的风格可以获得更好的编辑效果。</li>
            <li>高质量选项会生成更精细的图片，但需要更长处理时间。</li>
            <li>每张图片的编辑次数建议不超过5次，避免画质损失。</li>
            <li>生成数量越多，额度消耗越大。</li>
            <li>处理时间约为1-3分钟，请耐心等待。</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Image Modal (keep if needed) -->
    <div class="image-modal" v-if="showImageModal" @click="closeModal">
      <div class="modal-content">
        <img :src="editedImage" alt="Enlarged" class="modal-image" />
        <button class="close-modal-btn" @click="closeModal">×</button>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'ImageEditor',
  props: {
    apiEndpoint: {
      type: String,
      default: '/api'
    }
  },
  data() {
    return {
      images: [], // Array to hold uploaded images { file, preview }
      currentImageIndex: -1, // Index of the currently selected image for editing
      editPrompt: '',
      imageQuality: 'medium', // Default quality
      imageSize: '1024x1024', // Default size
      editedImage: null, // URL of the result image
      isEditing: false,
      error: '',
      statusMessage: '',
      statusIcon: '',
      showImageModal: false,
      isDragging: false, // For drag-and-drop visual feedback
      // Styles based on the screenshot (add more if needed)
      presetStyles: [
        '吉卜力风格', '3D渲染风格', 'Q版公仔风格', '赛博朋克风格', '日式动漫风格',
        '水彩画风格', '日本小人风格', 'Q版表情贴纸', '四宫格漫画', '史努比风格',
        '二次元风格', '像素风格', '迪士尼风格', '皮克斯风格', '写实风格'
      ]
    };
  },
  computed: {
    currentImage() {
      // Returns the currently selected image object or null
      return this.images.length > 0 && this.currentImageIndex >= 0 
        ? this.images[this.currentImageIndex] 
        : null;
    }
  },
  methods: {
    handleImageUpload(e) {
      // Handles file input change
      const files = e.target.files;
      if (files && files.length > 0) {
        this.addImages(files);
      }
      // Reset file input to allow uploading the same file again
      e.target.value = null; 
    },
    handleDragOver(e) {
      e.preventDefault();
      this.isDragging = true;
    },
    handleDragLeave(e) {
      e.preventDefault();
      this.isDragging = false;
    },
    handleDrop(e) {
      // Handles dropped files
      e.preventDefault();
      this.isDragging = false;
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        this.addImages(files);
      }
    },
    addImages(files) {
       // Processes files (check type, read preview)
       this.error = ''; // Clear previous errors
       let newlyAdded = false;
       
       for (const file of Array.from(files)) { // Iterate through all selected/dropped files
           if (!file.type.startsWith('image/')) {
             this.error = `文件 "${file.name}" 不是图片格式，已跳过。`;
             console.warn(`Skipped non-image file: ${file.name}`);
             continue; // Skip this file
           }
           if (file.size > 10 * 1024 * 1024) { // 10MB limit
             this.error = `图片 "${file.name}" 大小超过10MB，已跳过。`;
             console.warn(`Skipped oversized file: ${file.name}`);
             continue; // Skip this file
           }
            // Prevent adding duplicates based on name and size (simple check)
           if (this.images.some(img => img.file.name === file.name && img.file.size === file.size)) {
               console.warn(`Skipped duplicate file: ${file.name}`);
               continue;
           }

           // Read file content asynchronously
           const reader = new FileReader();
           reader.onloadend = () => {
              this.images.push({
                file: file,
                preview: reader.result
              });
              // If this is the first image added in this batch, select it
              if (this.currentImageIndex === -1) { 
                 this.currentImageIndex = this.images.findIndex(img => img.file === file); 
              }
           };
           reader.readAsDataURL(file);
           newlyAdded = true; 
       } // End of loop
       
       // Clear previous result ONLY if new images were successfully added
       if(newlyAdded) {
          this.editedImage = null; 
       }
    },
    selectImage(index) {
      // Selects an image from the thumbnail list
      this.currentImageIndex = index;
    },
    removeImage(index) {
      // Removes an image from the list
      this.images.splice(index, 1);
      if (this.images.length === 0) {
        this.currentImageIndex = -1;
        this.editedImage = null; // Clear result if no image
      } else if (this.currentImageIndex >= this.images.length) {
        // Adjust index if the last image was removed
        this.currentImageIndex = this.images.length - 1;
      }
    },
    applyPresetStyle(style) {
      // Appends selected style to the prompt
      if (this.editPrompt && this.editPrompt.trim() !== '') {
        const endsWithPunctuation = /[，,。.!！?？]$/.test(this.editPrompt.trim());
        this.editPrompt = this.editPrompt.trim() + (endsWithPunctuation ? ' ' : '，') + style;
      } else {
        this.editPrompt = style;
      }
    },
    async editImage() {
      if (!this.currentImage) {
        this.error = '请先上传图片';
        return;
      }
      if (!this.editPrompt) {
        this.error = '请输入编辑提示词';
        return;
      }

      this.error = '';
      this.statusMessage = '正在处理您的请求...';
      this.statusIcon = '⏳';
      this.isEditing = true;
      this.editedImage = null; // Clear previous result
      
      try {
        const formData = new FormData();
        formData.append('prompt', this.editPrompt);
        formData.append('quality', this.imageQuality);
        formData.append('size', this.imageSize);
        // IMPORTANT: Use the file object from the selected image
        formData.append('image', this.currentImage.file);
        
        console.log('开始发送编辑请求...');
        const response = await axios({
          method: 'post',
          url: `${this.apiEndpoint}/images/edits`,
          headers: {
            // Content-Type is set automatically for FormData
          },
          data: formData
        });
        
        if (response.data && response.data.data && response.data.data[0] && response.data.data[0].url) {
          this.editedImage = response.data.data[0].url;
          this.statusMessage = '图片编辑成功！';
          this.statusIcon = '✅';
          // Auto-clear success message after a delay
          setTimeout(() => { if (this.statusMessage === '图片编辑成功！') this.statusMessage = ''; }, 3000);
        } else {
           throw new Error('编辑结果无效或未返回图片URL');
        }

      } catch (err) {
        console.error('编辑图片错误:', err);
        this.error = err.response?.data?.error?.message || err.message || '图像编辑失败';
        this.statusMessage = ''; // Clear status on error
      } finally {
        this.isEditing = false;
      }
    },
    viewOriginalImage() {
      // Opens the edited image in a new tab
      if (this.editedImage) {
         window.open(this.editedImage, '_blank');
        // Alternatively, could use the modal: this.showImageModal = true;
      }
    },
    downloadImage() {
       // Downloads the edited image
       if (this.editedImage) {
        const link = document.createElement('a');
        link.href = this.editedImage;
        // Generate a filename (consider adding prompt or timestamp)
        link.download = `ai-edited-${new Date().getTime()}.png`; 
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    },
    // --- Modal Methods --- (Keep if modal is used)
    enlargeImage() {
      this.showImageModal = true;
      document.body.style.overflow = 'hidden';
    },
    closeModal() {
      this.showImageModal = false;
      document.body.style.overflow = 'auto';
    }
  }
};
</script>

<style scoped>
.image-editor {
  width: 100%;
}

.editor-layout {
  display: flex;
  gap: 2rem; /* Space between left and right panels */
}

.left-panel {
  flex: 1; /* Take up available space */
  min-width: 400px; /* Minimum width for controls */
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.right-panel {
  flex: 0 0 350px; /* Fixed width for preview and hints */
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.card {
  /* Using global card style from App.vue? If so, remove duplicates */
  background-color: var(--card-bg);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: var(--card-shadow);
}

.card h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 1.2rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.panel-icon {
  font-size: 1.2rem;
}

/* Upload Area Styles */
.upload-area-container {
  margin-bottom: 1rem; /* Space below upload */
}

.file-input {
  display: none; /* Hide the default file input */
}

.upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2.5rem 1rem;
  border: 2px dashed var(--border-color);
  border-radius: 8px;
  background-color: var(--input-bg);
  cursor: pointer;
  text-align: center;
  transition: border-color 0.3s ease, background-color 0.3s ease;
}

.upload-area:hover, .upload-area.drag-over {
  border-color: var(--primary-color);
  background-color: rgba(var(--primary-color-rgb, 108, 92, 231), 0.05); /* Need theme RGB */
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.upload-icon-large {
  font-size: 3rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.upload-text-main {
  font-weight: 500;
  color: var(--text-color);
}

.upload-text-secondary {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

/* Thumbnails */
.image-thumbnails {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  flex-wrap: wrap;
}

.image-thumbnail {
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
}

.image-thumbnail.active {
  border-color: var(--primary-color);
}

.image-thumbnail img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-image-btn {
  position: absolute;
  top: 2px;
  right: 2px;
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  border: none;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  font-size: 12px;
  line-height: 16px;
  text-align: center;
  cursor: pointer;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.remove-image-btn:hover {
  opacity: 1;
}


/* Preset Styles */
.preset-styles {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.preset-button {
  padding: 0.4rem 0.8rem;
  border: 1px solid var(--border-color);
  background-color: var(--input-bg);
  color: var(--text-secondary);
  border-radius: 16px; /* Pill shape */
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.preset-button:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
  background-color: var(--card-bg);
}

.preset-button span {
   font-size: 0.9rem;
}

/* Prompt Textarea & Controls */
.prompt-textarea {
  min-height: 100px;
  margin-bottom: 1rem; /* Space before controls */
}

.form-controls-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.select-group label {
  display: block;
  font-size: 0.9rem;
  margin-bottom: 0.4rem;
  color: var(--text-secondary);
}

.select-control {
  min-width: 150px;
  background-color: var(--input-bg);
}

.edit-btn {
  width: 100%;
  padding: 0.9rem;
  font-size: 1.1rem;
  margin-top: 0.5rem;
}

.error-message, .status-indicator {
  margin-top: 1rem;
  padding: 0.8rem 1rem;
  border-radius: 6px;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.error-message {
  color: #e53e3e; /* Theme variable? */
  background-color: rgba(229, 62, 62, 0.1);
}

.status-indicator {
  color: #3182ce; /* Theme variable? */
  background-color: rgba(49, 130, 206, 0.1);
}

/* Right Panel Styles */
.preview-card {
  flex-grow: 1; /* Allow preview to take more space */
}

.preview-area {
  min-height: 300px; /* Ensure placeholder has height */
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--input-bg);
  border-radius: 8px;
  overflow: hidden;
}

.preview-placeholder {
  text-align: center;
  color: var(--text-secondary);
}

.placeholder-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.result-image-container {
  width: 100%;
  height: 100%;
  position: relative; 
}

.image-preview {
  display: block;
  max-width: 100%;
  max-height: 400px; /* Limit preview height */
  object-fit: contain;
  margin: auto; /* Center image */
}

.result-image-container .action-buttons {
    position: absolute;
    bottom: 10px;
    right: 10px;
    display: flex;
    gap: 0.5rem;
    background-color: rgba(0, 0, 0, 0.5);
    padding: 0.3rem 0.5rem;
    border-radius: 6px;
    opacity: 0;
    transition: opacity 0.3s ease;
}

.result-image-container:hover .action-buttons {
    opacity: 1;
}

.action-buttons .btn-icon {
  color: white;
  font-size: 1.2rem;
}

.hints-card ul {
  list-style: none;
  padding-left: 0;
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.hints-card li {
  margin-bottom: 0.6rem;
  line-height: 1.5;
  display: flex;
  align-items: flex-start;
}

.hints-card li::before {
  content: '•';
  color: var(--primary-color);
  margin-right: 0.5rem;
  font-weight: bold;
  display: inline-block;
  margin-top: 0.1em;
}

/* Modal styles (keep if used) */
.image-modal {
  /* ... existing modal styles ... */
}

/* Responsive adjustments */
@media (max-width: 992px) {
  .editor-layout {
    flex-direction: column;
  }
  .right-panel {
    flex: 1; /* Allow right panel to grow */
    flex-basis: auto; /* Reset fixed width */
  }
}

</style>
