<template>
  <div class="login-form">
    <div class="form-card">
      <div class="form-header">
        <h2>用户登录</h2>
        <p>登录您的账户以开始使用</p>
      </div>
      
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="username">用户名/邮箱</label>
          <input
            id="username"
            v-model="form.username"
            type="text"
            class="form-control"
            placeholder="请输入用户名或邮箱"
            required
          >
        </div>
        
        <div class="form-group">
          <label for="password">密码</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            class="form-control"
            placeholder="请输入密码"
            required
          >
        </div>
        
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="form.rememberMe">
            <span class="checkmark"></span>
            记住我
          </label>
        </div>
        
        <button 
          type="submit" 
          class="btn btn-primary btn-block"
          :disabled="isLoading"
        >
          <span v-if="isLoading" class="loading-spinner"></span>
          {{ isLoading ? '登录中...' : '登录' }}
        </button>
      </form>
      
      <div class="form-footer">
        <p>
          还没有账户？
          <button @click="$emit('switch-to-register')" class="link-btn">
            立即注册
          </button>
        </p>
      </div>
      
      <div v-if="errorMessage" class="error-message">
        <span class="error-icon">⚠️</span>
        {{ errorMessage }}
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'LoginForm',
  emits: ['login-success', 'switch-to-register'],
  data() {
    return {
      form: {
        username: '',
        password: '',
        rememberMe: false
      },
      isLoading: false,
      errorMessage: ''
    };
  },
  methods: {
    async handleLogin() {
      this.isLoading = true;
      this.errorMessage = '';
      
      try {
        const response = await axios.post('/api/auth/login', {
          username: this.form.username,
          password: this.form.password
        });
        
        if (response.data.success) {
          // 保存token到localStorage
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.user));
          
          this.$emit('login-success', response.data.user);
          
          // 显示成功消息
          this.$message?.success('登录成功！');
        }
      } catch (error) {
        console.error('登录失败:', error);
        
        if (error.response?.data?.error) {
          this.errorMessage = error.response.data.error.message;
        } else {
          this.errorMessage = '登录失败，请检查网络连接';
        }
      } finally {
        this.isLoading = false;
      }
    }
  }
};
</script>

<style scoped>
.login-form {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
}

.form-card {
  background: var(--card-background);
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}

.form-header {
  text-align: center;
  margin-bottom: 30px;
}

.form-header h2 {
  color: var(--primary-color);
  margin-bottom: 8px;
  font-size: 1.8rem;
}

.form-header p {
  color: var(--text-secondary);
  margin: 0;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  color: var(--text-primary);
  font-weight: 500;
}

.form-control {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s ease;
  background: var(--input-background);
  color: var(--text-primary);
}

.form-control:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(var(--primary-color-rgb), 0.1);
}

.checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
}

.checkbox-label input[type="checkbox"] {
  margin-right: 8px;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover);
  transform: translateY(-1px);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-block {
  width: 100%;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.form-footer {
  text-align: center;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
}

.form-footer p {
  color: var(--text-secondary);
  margin: 0;
}

.link-btn {
  background: none;
  border: none;
  color: var(--primary-color);
  text-decoration: underline;
  cursor: pointer;
  font-size: inherit;
}

.link-btn:hover {
  color: var(--primary-hover);
}

.error-message {
  margin-top: 16px;
  padding: 12px;
  background: rgba(229, 62, 62, 0.1);
  border: 1px solid rgba(229, 62, 62, 0.3);
  border-radius: 8px;
  color: #e53e3e;
  display: flex;
  align-items: center;
  gap: 8px;
}

.error-icon {
  flex-shrink: 0;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .form-card {
    padding: 30px 20px;
  }
  
  .form-header h2 {
    font-size: 1.5rem;
  }
}
</style> 