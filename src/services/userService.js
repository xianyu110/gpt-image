import axios from 'axios';

class UserService {
  constructor() {
    this.user = null;
    this.token = null;
    this.isAuthenticated = false;
    
    // 初始化axios拦截器
    this.setupAxiosInterceptors();
    
    // 从localStorage恢复用户状态
    this.restoreUserState();
  }

  // 设置axios拦截器
  setupAxiosInterceptors() {
    // 请求拦截器 - 自动添加token
    axios.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // 响应拦截器 - 处理401错误
    axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.logout();
        }
        return Promise.reject(error);
      }
    );
  }

  // 从localStorage恢复用户状态
  restoreUserState() {
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      
      if (token && userStr) {
        this.token = token;
        this.user = JSON.parse(userStr);
        this.isAuthenticated = true;
      }
    } catch (error) {
      console.error('恢复用户状态失败:', error);
      this.clearUserState();
    }
  }

  // 清除用户状态
  clearUserState() {
    this.user = null;
    this.token = null;
    this.isAuthenticated = false;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  // 获取token
  getToken() {
    return this.token || localStorage.getItem('token');
  }

  // 获取用户信息
  getUser() {
    return this.user;
  }

  // 检查是否已登录
  isLoggedIn() {
    return this.isAuthenticated && this.token;
  }

  // 登录
  async login(credentials) {
    try {
      const response = await axios.post('/api/auth/login', credentials);
      
      if (response.data.success) {
        this.token = response.data.token;
        this.user = response.data.user;
        this.isAuthenticated = true;
        
        // 保存到localStorage
        localStorage.setItem('token', this.token);
        localStorage.setItem('user', JSON.stringify(this.user));
        
        return response.data;
      }
    } catch (error) {
      console.error('登录失败:', error);
      throw error;
    }
  }

  // 注册
  async register(userData) {
    try {
      const response = await axios.post('/api/auth/register', userData);
      
      if (response.data.success) {
        this.token = response.data.token;
        this.user = response.data.user;
        this.isAuthenticated = true;
        
        // 保存到localStorage
        localStorage.setItem('token', this.token);
        localStorage.setItem('user', JSON.stringify(this.user));
        
        return response.data;
      }
    } catch (error) {
      console.error('注册失败:', error);
      throw error;
    }
  }

  // 退出登录
  async logout() {
    try {
      await axios.post('/api/auth/logout');
    } catch (error) {
      console.error('退出登录请求失败:', error);
    } finally {
      this.clearUserState();
    }
  }

  // 获取当前用户信息
  async getCurrentUser() {
    try {
      const response = await axios.get('/api/auth/me');
      
      if (response.data.success) {
        this.user = response.data.data.user;
        localStorage.setItem('user', JSON.stringify(this.user));
        return response.data.data;
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
      if (error.response?.status === 401) {
        this.logout();
      }
      throw error;
    }
  }

  // 更新用户信息
  async updateProfile(userData) {
    try {
      const response = await axios.put('/api/auth/profile', userData);
      
      if (response.data.success) {
        this.user = response.data.user;
        localStorage.setItem('user', JSON.stringify(this.user));
        return response.data.user;
      }
    } catch (error) {
      console.error('更新用户信息失败:', error);
      throw error;
    }
  }

  // 修改密码
  async changePassword(passwordData) {
    try {
      const response = await axios.put('/api/auth/password', passwordData);
      return response.data;
    } catch (error) {
      console.error('修改密码失败:', error);
      throw error;
    }
  }

  // 获取用户订阅状态
  async getSubscriptionStatus() {
    try {
      const response = await axios.get('/api/subscription/status');
      return response.data.data;
    } catch (error) {
      console.error('获取订阅状态失败:', error);
      throw error;
    }
  }

  // 获取订阅套餐
  async getSubscriptionPlans() {
    try {
      const response = await axios.get('/api/subscription/plans');
      return response.data.plans;
    } catch (error) {
      console.error('获取订阅套餐失败:', error);
      throw error;
    }
  }

  // 获取历史记录
  async getHistory(page = 1, pageSize = 20) {
    try {
      const response = await axios.get('/api/history', {
        params: { page, pageSize }
      });
      return response.data;
    } catch (error) {
      console.error('获取历史记录失败:', error);
      throw error;
    }
  }

  // 生成图像
  async generateImage(imageData) {
    try {
      const response = await axios.post('/api/images/generations', imageData);
      return response.data;
    } catch (error) {
      console.error('生成图像失败:', error);
      throw error;
    }
  }

  // 编辑图像
  async editImage(imageData) {
    try {
      const response = await axios.post('/api/images/edits', imageData);
      return response.data;
    } catch (error) {
      console.error('编辑图像失败:', error);
      throw error;
    }
  }
}

// 创建单例实例
const userService = new UserService();

export default userService; 