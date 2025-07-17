<template>
  <div class="app-container" :class="selectedTheme">
    <!-- 显示认证界面 -->
    <AuthWrapper 
      v-if="!isAuthenticated"
      @auth-success="handleAuthSuccess"
    />
    
    <!-- 显示主应用 -->
    <template v-else>
      <header class="header">
        <div class="header-content">
          <div class="title-wrapper">
            <h1 class="app-title">智灵-在线生图、改图、合成图</h1>
            <div class="theme-selector">
              <button 
                class="theme-button" 
                :class="{ active: selectedTheme === 'theme-purple' }"
                @click="changeTheme('theme-purple')"
                title="紫色主题"
              >
                <span class="color-circle purple"></span>
              </button>
              <button 
                class="theme-button" 
                :class="{ active: selectedTheme === 'theme-blue' }"
                @click="changeTheme('theme-blue')"
                title="蓝色主题"
              >
                <span class="color-circle blue"></span>
              </button>
              <button 
                class="theme-button" 
                :class="{ active: selectedTheme === 'theme-dark' }"
                @click="changeTheme('theme-dark')"
                title="暗黑主题"
              >
                <span class="color-circle dark"></span>
              </button>
              <button 
                class="theme-button" 
                :class="{ active: selectedTheme === 'theme-gradient' }"
                @click="changeTheme('theme-gradient')"
                title="渐变主题"
              >
                <span class="color-circle gradient"></span>
              </button>
            </div>
          </div>
          
          <!-- 用户信息区域 -->
          <div class="user-info">
            <div class="user-avatar">
              <img 
                v-if="currentUser?.avatar" 
                :src="currentUser.avatar" 
                :alt="currentUser.username"
              >
              <span v-else class="avatar-placeholder">
                {{ currentUser?.username?.charAt(0).toUpperCase() }}
              </span>
            </div>
            <div class="user-details">
              <span class="username">{{ currentUser?.username }}</span>
              <span class="user-status">
                {{ userStats?.subscription?.hasActiveSubscription ? userStats.subscription.planName : '免费用户' }}
              </span>
            </div>
            <div class="user-actions">
              <button @click="showUserMenu = !showUserMenu" class="user-menu-btn">
                <span class="menu-icon">⋮</span>
              </button>
              <div v-if="showUserMenu" class="user-menu">
                <button @click="showProfile = true">个人设置</button>
                <button @click="showUsageStats = true">使用统计</button>
                <button @click="handleLogout">退出登录</button>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <main class="main-content">
        <router-view 
          :api-endpoint="apiEndpoint"
          :user-stats="userStats"
          @usage-updated="refreshUserStats"
        ></router-view>
      </main>
    </template>
    
    <footer class="footer">
      <p>智灵绘图 © {{ new Date().getFullYear() }}</p>
    </footer>
  </div>
</template>

<script>
import AuthWrapper from './components/AuthWrapper.vue';
import userService from './services/userService.js';

export default {
  name: 'App',
  components: {
    AuthWrapper
  },
  data() {
    return {
      apiEndpoint: '/api',
      selectedTheme: 'theme-purple',
      isAuthenticated: false,
      currentUser: null,
      userStats: null,
      showUserMenu: false,
      showProfile: false,
      showUsageStats: false
    }
  },
  async created() {
    const savedTheme = localStorage.getItem('selectedTheme');
    if (savedTheme) {
      this.selectedTheme = savedTheme;
    }
    
    await this.checkAuthStatus();
  },
  methods: {
    // 主题相关方法
    changeTheme(theme) {
      this.selectedTheme = theme;
      localStorage.setItem('selectedTheme', theme);
    },
    
    // 认证相关方法
    async checkAuthStatus() {
      try {
        if (userService.isLoggedIn()) {
          this.isAuthenticated = true;
          this.currentUser = userService.getUser();
          await this.refreshUserStats();
        }
      } catch (error) {
        console.error('检查认证状态失败:', error);
        this.isAuthenticated = false;
      }
    },
    
    async handleAuthSuccess(user) {
      this.isAuthenticated = true;
      this.currentUser = user;
      await this.refreshUserStats();
    },
    
    async handleLogout() {
      try {
        await userService.logout();
        this.isAuthenticated = false;
        this.currentUser = null;
        this.userStats = null;
        this.showUserMenu = false;
      } catch (error) {
        console.error('退出登录失败:', error);
      }
    },
    
    async refreshUserStats() {
      try {
        if (this.isAuthenticated) {
          this.userStats = await userService.getCurrentUser();
        }
      } catch (error) {
        console.error('刷新用户统计失败:', error);
        if (error.response?.status === 401) {
          this.handleLogout();
        }
      }
    }
  }
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  line-height: 1.6;
}

.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* 紫色主题 - 默认 */
.theme-purple {
  --primary-color: #6c5ce7;
  --primary-hover: #5f4dd3;
  --bg-color: #f8f9fa;
  --card-bg: white;
  --text-color: #343a40;
  --text-secondary: #6c757d;
  --border-color: #e9ecef;
  --input-bg: #f8f9fa;
  --header-text: white;
  --card-shadow: 0 4px 20px rgba(0,0,0,0.05);
  --card-shadow-hover: 0 6px 24px rgba(0,0,0,0.08);
  --header-shadow: 0 2px 10px rgba(108, 92, 231, 0.2);
}

/* 蓝色主题 */
.theme-blue {
  --primary-color: #3498db;
  --primary-hover: #2980b9;
  --bg-color: #f0f6fc;
  --card-bg: white;
  --text-color: #2c3e50;
  --text-secondary: #7f8c8d;
  --border-color: #e1e8ed;
  --input-bg: #f5f8fa;
  --header-text: white;
  --card-shadow: 0 4px 20px rgba(52, 152, 219, 0.08);
  --card-shadow-hover: 0 6px 24px rgba(52, 152, 219, 0.12);
  --header-shadow: 0 2px 10px rgba(52, 152, 219, 0.2);
}

/* 暗黑主题 */
.theme-dark {
  --primary-color: #6c5ce7;
  --primary-hover: #8a7ce9;
  --bg-color: #1a1a2e;
  --card-bg: #252541;
  --text-color: #e9e9e9;
  --text-secondary: #b8b8b8;
  --border-color: #3a3a59;
  --input-bg: #323251;
  --header-text: #e9e9e9;
  --card-shadow: 0 4px 20px rgba(0,0,0,0.2);
  --card-shadow-hover: 0 6px 24px rgba(0,0,0,0.3);
  --header-shadow: 0 2px 10px rgba(0,0,0,0.3);
}

/* 渐变主题 */
.theme-gradient {
  --primary-color: #8e2de2;
  --primary-hover: #a634e7;
  --bg-color: #f5f7fa;
  --card-bg: white;
  --text-color: #333333;
  --text-secondary: #777777;
  --border-color: #e6e6e6;
  --input-bg: #f8f9fa;
  --header-text: white;
  --card-shadow: 0 4px 20px rgba(142, 45, 226, 0.08);
  --card-shadow-hover: 0 6px 24px rgba(142, 45, 226, 0.12);
  --header-shadow: 0 2px 10px rgba(142, 45, 226, 0.2);
}

body {
  background-color: var(--bg-color);
  color: var(--text-color);
}

.header {
  position: relative;
  padding: 1.5rem 0;
  box-shadow: var(--header-shadow);
}

.theme-purple .header {
  background-color: var(--primary-color);
}

.theme-blue .header {
  background-color: var(--primary-color);
}

.theme-dark .header {
  background-color: #252541;
  border-bottom: 1px solid #3a3a59;
}

.theme-gradient .header {
  background: linear-gradient(45deg, #8e2de2, #4a00e0);
}

.header-content {
  width: 90%;
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.title-wrapper {
  display: flex;
  align-items: center;
  gap: 20px;
}

.app-title {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--header-text);
  letter-spacing: 0.5px;
}

.theme-selector {
  display: flex;
  gap: 0.5rem;
}

.theme-button {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.theme-button.active {
  border-color: white;
  transform: scale(1.1);
}

.color-circle {
  width: 18px;
  height: 18px;
  border-radius: 50%;
}

.purple {
  background-color: #6c5ce7;
}

.blue {
  background-color: #3498db;
}

.dark {
  background-color: #1a1a2e;
}

.gradient {
  background: linear-gradient(45deg, #8e2de2, #4a00e0);
}

.main-content {
  flex: 1;
  padding: 2rem;
  width: 90%;
  max-width: 1200px;
  margin: 0 auto;
}

.footer {
  padding: 1.2rem 0;
  color: var(--text-secondary);
  text-align: center;
  font-size: 0.9rem;
}

.theme-purple .footer, .theme-blue .footer, .theme-gradient .footer {
  background-color: #f1f3f5;
  border-top: 1px solid var(--border-color);
}

.theme-dark .footer {
  background-color: #252541;
  border-top: 1px solid #3a3a59;
}

.card {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 1.8rem;
  box-shadow: var(--card-shadow);
  margin-bottom: 2rem;
  transition: transform 0.2s, box-shadow 0.2s;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: var(--card-shadow-hover);
}

.form-group {
  margin-bottom: 1.2rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.6rem;
  font-weight: 600;
  color: var(--text-color);
}

.form-control {
  width: 100%;
  padding: 0.8rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 1rem;
  background-color: var(--input-bg);
  color: var(--text-color);
  transition: all 0.2s;
}

.form-control:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(var(--primary-color), 0.2);
  background-color: var(--card-bg);
}

.theme-dark .form-control::placeholder {
  color: #8f8f9d;
}

.btn {
  padding: 0.8rem 1.2rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:hover {
  background: var(--primary-hover);
  transform: translateY(-1px);
}

.btn-primary:active {
  transform: translateY(0);
}

/* 用户信息区域样式 */
.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 16px;
}

.user-details {
  display: flex;
  flex-direction: column;
  color: white;
}

.username {
  font-weight: 600;
  font-size: 14px;
}

.user-status {
  font-size: 12px;
  opacity: 0.8;
}

.user-actions {
  position: relative;
}

.user-menu-btn {
  background: none;
  border: none;
  color: white;
  font-size: 18px;
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.user-menu-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.user-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  min-width: 120px;
  z-index: 1000;
  overflow: hidden;
  margin-top: 8px;
}

.user-menu button {
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-color);
  transition: background-color 0.2s ease;
}

.user-menu button:hover {
  background: #f8f9fa;
}

@media (max-width: 768px) {
  .header-content, .main-content {
    width: 95%;
  }
  
  .main-content {
    padding: 1.5rem 0;
  }
  
  .title-wrapper {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .theme-selector {
    margin-bottom: 0.5rem;
  }
}
</style>
