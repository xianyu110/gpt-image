<template>
  <div class="register-form">
    <div class="form-card">
      <div class="form-header">
        <h2>用户注册</h2>
        <p>创建您的账户以开始使用</p>
      </div>
      
      <form @submit.prevent="handleRegister">
        <div class="form-group">
          <label for="username">用户名</label>
          <input
            id="username"
            v-model="form.username"
            type="text"
            class="form-control"
            placeholder="请输入用户名"
            required
          >
        </div>
        
        <div class="form-group">
          <label for="email">邮箱</label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            class="form-control"
            placeholder="请输入邮箱地址"
            required
          >
        </div>
        
        <div class="form-group">
          <label for="phone">手机号（可选）</label>
          <input
            id="phone"
            v-model="form.phone"
            type="tel"
            class="form-control"
            placeholder="请输入手机号"
          >
        </div>
        
        <div class="form-group">
          <label for="password">密码</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            class="form-control"
            placeholder="请输入密码（至少6位）"
            required
          >
        </div>
        
        <div class="form-group">
          <label for="confirmPassword">确认密码</label>
          <input
            id="confirmPassword"
            v-model="form.confirmPassword"
            type="password"
            class="form-control"
            placeholder="请再次输入密码"
            required
          >
        </div>
        
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="form.agreeTerms" required>
            <span class="checkmark"></span>
            我已阅读并同意 <a href="#" class="link">用户协议</a> 和 <a href="#" class="link">隐私政策</a>
          </label>
        </div>
        
        <button 
          type="submit" 
          class="btn btn-primary btn-block"
          :disabled="isLoading || !isFormValid"
        >
          <span v-if="isLoading" class="loading-spinner"></span>
          {{ isLoading ? '注册中...' : '注册' }}
        </button>
      </form>
      
      <div class="form-footer">
        <p>
          已有账户？
          <button @click="$emit('switch-to-login')" class="link-btn">
            立即登录
          </button>
        </p>
      </div>
      
      <div v-if="errorMessage" class="error-message">
        <span class="error-icon">⚠️</span>
        {{ errorMessage }}
      </div>
      
      <div v-if="validationErrors.length > 0" class="validation-errors">
        <h4>请修正以下错误：</h4>
        <ul>
          <li v-for="error in validationErrors" :key="error.field">
            {{ error.message }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'RegisterForm',
  emits: ['register-success', 'switch-to-login'],
  data() {
    return {
      form: {
        username: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        agreeTerms: false
      },
      isLoading: false,
      errorMessage: '',
      validationErrors: []
    };
  },
  computed: {
    isFormValid() {
      return this.form.username && 
             this.form.email && 
             this.form.password && 
             this.form.confirmPassword &&
             this.form.password === this.form.confirmPassword &&
             this.form.agreeTerms;
    }
  },
  methods: {
    async handleRegister() {
      this.isLoading = true;
      this.errorMessage = '';
      this.validationErrors = [];
      
      // 客户端验证
      if (this.form.password !== this.form.confirmPassword) {
        this.errorMessage = '两次输入的密码不一致';
        this.isLoading = false;
        return;
      }
      
      if (this.form.password.length < 6) {
        this.errorMessage = '密码长度至少为6位';
        this.isLoading = false;
        return;
      }
      
      try {
        const response = await axios.post('/api/auth/register', {
          username: this.form.username,
          email: this.form.email,
          phone: this.form.phone || undefined,
          password: this.form.password,
          confirmPassword: this.form.confirmPassword
        });
        
        if (response.data.success) {
          // 保存token到localStorage
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.user));
          
          this.$emit('register-success', response.data.user);
          
          // 显示成功消息
          this.$message?.success('注册成功！');
        }
      } catch (error) {
        console.error('注册失败:', error);
        
        if (error.response?.data?.error) {
          const errorData = error.response.data.error;
          
          if (errorData.code === 'validation_error' && errorData.details) {
            this.validationErrors = errorData.details;
          } else {
            this.errorMessage = errorData.message;
          }
        } else {
          this.errorMessage = '注册失败，请检查网络连接';
        }
      } finally {
        this.isLoading = false;
      }
    }
  }
};
</script>

<style scoped>
.register-form {
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
  max-width: 450px;
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
  align-items: flex-start;
  cursor: pointer;
  user-select: none;
  font-size: 14px;
  line-height: 1.4;
}

.checkbox-label input[type="checkbox"] {
  margin-right: 8px;
  margin-top: 2px;
}

.link {
  color: var(--primary-color);
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
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

.validation-errors {
  margin-top: 16px;
  padding: 12px;
  background: rgba(229, 62, 62, 0.1);
  border: 1px solid rgba(229, 62, 62, 0.3);
  border-radius: 8px;
  color: #e53e3e;
}

.validation-errors h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
}

.validation-errors ul {
  margin: 0;
  padding-left: 20px;
}

.validation-errors li {
  margin-bottom: 4px;
  font-size: 14px;
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