# 用户认证系统文档

## 系统概述

智灵绘图已升级为支持用户登录注册的完整系统，每个用户都有独立的账户和使用统计。系统使用MySQL数据库存储用户信息，并通过JWT实现认证机制。

## 技术架构

### 后端
- **数据库**: MySQL 8.0
- **认证**: JWT (JSON Web Tokens)
- **密码加密**: bcryptjs
- **输入验证**: Joi
- **API框架**: Express.js

### 前端
- **框架**: Vue 3
- **状态管理**: 本地状态 + 用户服务
- **HTTP客户端**: Axios
- **认证拦截**: 自动Token处理

## 数据库结构

### 用户表 (users)
```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  avatar VARCHAR(255),
  phone VARCHAR(20),
  status ENUM('active', 'inactive', 'banned') DEFAULT 'active',
  total_usage INT DEFAULT 0,
  daily_usage INT DEFAULT 0,
  last_usage_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 订阅套餐表 (subscription_plans)
```sql
CREATE TABLE subscription_plans (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  duration_days INT NOT NULL,
  features JSON,
  generation_limit INT DEFAULT -1,
  daily_limit INT DEFAULT -1,
  quality_limit VARCHAR(20) DEFAULT 'high',
  is_active BOOLEAN DEFAULT true
);
```

### 用户订阅表 (user_subscriptions)
```sql
CREATE TABLE user_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  plan_id VARCHAR(50) NOT NULL,
  status ENUM('active', 'expired', 'cancelled') DEFAULT 'active',
  start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  end_date TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE
);
```

### 支付记录表 (payments)
```sql
CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  plan_id VARCHAR(50) NOT NULL,
  out_trade_no VARCHAR(100) UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status ENUM('pending', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
  payment_method VARCHAR(50) DEFAULT 'alipay',
  qr_code TEXT,
  trade_no VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE
);
```

### 图像历史记录表 (image_history)
```sql
CREATE TABLE image_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM('generate', 'edit') NOT NULL,
  prompt TEXT NOT NULL,
  image_url VARCHAR(500),
  quality VARCHAR(20),
  size VARCHAR(20),
  status ENUM('success', 'failed', 'pending') DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## API接口文档

### 认证接口

#### 1. 用户注册
```
POST /api/auth/register
Content-Type: application/json

{
  "username": "testuser",
  "email": "test@example.com",
  "password": "123456",
  "confirmPassword": "123456",
  "phone": "13800138000" // 可选
}
```

**响应**:
```json
{
  "success": true,
  "message": "注册成功",
  "user": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com",
    "avatar": null,
    "phone": "13800138000",
    "status": "active",
    "total_usage": 0,
    "daily_usage": 0,
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 2. 用户登录
```
POST /api/auth/login
Content-Type: application/json

{
  "username": "testuser", // 用户名或邮箱
  "password": "123456"
}
```

**响应**:
```json
{
  "success": true,
  "message": "登录成功",
  "user": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com",
    "avatar": null,
    "phone": "13800138000",
    "status": "active",
    "total_usage": 5,
    "daily_usage": 2,
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 3. 获取用户信息
```
GET /api/auth/me
Authorization: Bearer <token>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "testuser",
      "email": "test@example.com",
      "avatar": null,
      "totalUsage": 5,
      "dailyUsage": 2,
      "lastUsageDate": "2024-01-01",
      "status": "active",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "subscription": {
      "hasActiveSubscription": true,
      "planName": "高级版",
      "endDate": "2024-02-01T00:00:00.000Z",
      "features": ["每日200次生成", "高画质", "所有尺寸", "优先处理"]
    },
    "limits": {
      "dailyLimit": 200,
      "qualityLimit": "high",
      "isUnlimited": false,
      "hasActiveSubscription": true
    }
  }
}
```

#### 4. 用户退出登录
```
POST /api/auth/logout
Authorization: Bearer <token>
```

**响应**:
```json
{
  "success": true,
  "message": "退出成功"
}
```

### 图像生成接口

#### 1. 生成图像
```
POST /api/images/generations
Authorization: Bearer <token>
Content-Type: application/json

{
  "prompt": "一只可爱的小猫",
  "quality": "high",
  "size": "1024x1024",
  "n": 1
}
```

**响应**:
```json
{
  "data": [
    {
      "url": "https://example.com/image.png",
      "revised_prompt": "A cute little cat sitting on a windowsill..."
    }
  ]
}
```

#### 2. 获取历史记录
```
GET /api/history?page=1&pageSize=20
Authorization: Bearer <token>
```

**响应**:
```json
{
  "history": [
    {
      "id": 1,
      "type": "generate",
      "prompt": "一只可爱的小猫",
      "imageUrl": "https://example.com/image.png",
      "quality": "high",
      "size": "1024x1024",
      "status": "success",
      "error": null,
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

### 订阅和支付接口

#### 1. 获取订阅套餐
```
GET /api/subscription/plans
```

**响应**:
```json
{
  "plans": [
    {
      "id": "basic",
      "name": "基础版",
      "description": "适合轻度使用者",
      "price": 19.9,
      "duration": 30,
      "features": ["每日50次生成", "基础画质", "标准尺寸"],
      "generation_limit": 50,
      "daily_limit": 50,
      "quality_limit": "medium"
    }
  ]
}
```

#### 2. 创建支付订单
```
POST /api/payment/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "planId": "basic"
}
```

**响应**:
```json
{
  "success": true,
  "paymentId": 123,
  "outTradeNo": "SUB_1234567890_abc123",
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "amount": 19.9,
  "planName": "基础版"
}
```

## 前端组件说明

### 认证组件
- **LoginForm.vue**: 用户登录表单
- **RegisterForm.vue**: 用户注册表单
- **AuthWrapper.vue**: 认证包装器，管理登录/注册切换

### 用户服务
- **userService.js**: 用户认证和API调用的统一服务
- 自动处理JWT Token
- 自动处理401认证错误

### 主要特性
1. **自动Token管理**: 登录后自动在所有API请求中添加Authorization头
2. **错误处理**: 401错误自动跳转到登录页面
3. **持久化**: Token和用户信息保存在localStorage中
4. **实时状态**: 用户状态和统计信息实时更新

## 使用限制

### 免费用户
- 每日生成限制: 10次
- 画质限制: 中等
- 尺寸限制: 所有尺寸
- 历史记录: 保留

### 基础版订阅
- 每日生成限制: 50次
- 画质限制: 中等
- 尺寸限制: 所有尺寸
- 价格: ¥19.9/30天

### 高级版订阅
- 每日生成限制: 200次
- 画质限制: 高画质
- 尺寸限制: 所有尺寸
- 优先处理: 是
- 价格: ¥39.9/30天

### 专业版订阅
- 每日生成限制: 无限制
- 画质限制: 最高画质
- 尺寸限制: 所有尺寸
- 优先处理: 是
- 批量下载: 是
- 价格: ¥99.9/30天

## 配置说明

### 环境变量
```bash
# 数据库配置
DB_HOST=rm-wz9wd8lg8z852eo4p0o.mysql.rds.aliyuncs.com
DB_PORT=3306
DB_USER=maynor_admin
DB_PASSWORD=@Amn123456
DB_NAME=zhiling_image_app

# JWT配置
JWT_SECRET=zhiling_image_app_secret_key_2024
JWT_EXPIRES_IN=7d

# OpenAI配置
VITE_OPENAI_API_KEY=your_openai_api_key_here
VITE_OPENAI_BASE_URL=https://api.maynor1024.live/v1

# 支付宝配置（可选）
ALIPAY_APP_ID=your_alipay_app_id
ALIPAY_PRIVATE_KEY=your_alipay_private_key
ALIPAY_PUBLIC_KEY=your_alipay_public_key
```

## 部署说明

1. **安装依赖**:
   ```bash
   npm install
   ```

2. **配置环境变量**:
   ```bash
   cp config.env .env
   # 编辑 .env 文件，填入正确的配置
   ```

3. **构建前端**:
   ```bash
   npm run build
   ```

4. **启动服务器**:
   ```bash
   node server.js
   ```

## 安全考虑

1. **密码安全**: 使用bcryptjs进行密码哈希
2. **JWT安全**: 使用强随机密钥，设置合理的过期时间
3. **输入验证**: 所有输入都经过Joi验证
4. **SQL注入防护**: 使用参数化查询
5. **跨域配置**: 正确配置CORS策略

## 故障排除

### 数据库连接问题
- 确认MySQL服务器可访问
- 检查数据库凭据
- 确认数据库已创建

### 认证问题
- 检查JWT密钥配置
- 确认Token未过期
- 验证用户状态为active

### API错误
- 检查网络连接
- 验证API端点URL
- 查看服务器日志

## 更新日志

### v2.0.0 (2024-01-01)
- ✅ 添加完整的用户认证系统
- ✅ 迁移数据存储到MySQL
- ✅ 实现JWT认证机制
- ✅ 添加用户独立的使用统计
- ✅ 支持订阅套餐和支付功能
- ✅ 优化前端用户体验
- ✅ 增强安全性和错误处理

## 联系支持

如有问题或建议，请联系开发团队。 