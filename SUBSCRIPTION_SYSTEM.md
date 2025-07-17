# 智灵绘图订阅收费系统

## 🎯 系统概述

本系统为智灵绘图应用实现了完整的订阅收费功能，支持多种套餐选择和支付宝当面付支付方式。

## 📋 功能特性

### ✅ 已实现的功能

1. **订阅套餐管理**
   - 三种套餐：基础版、高级版、专业版
   - 不同的使用限制和画质选项
   - 灵活的定价和有效期设置

2. **用户管理系统**
   - 自动用户识别（基于IP和localStorage）
   - 使用量统计和限制管理
   - 每日使用次数重置

3. **支付系统**
   - 支付宝当面付集成
   - 二维码支付
   - 支付状态实时查询
   - 异步通知处理

4. **权限控制**
   - 基于订阅状态的功能限制
   - 免费用户和付费用户区分
   - 画质和尺寸权限管理

5. **前端界面**
   - 订阅套餐展示页面
   - 支付弹窗和二维码展示
   - 用户状态和使用情况显示

## 🏗️ 系统架构

### 后端结构

```
├── server.js              # 主服务器文件
├── config/
│   └── alipay.js          # 支付宝配置和工具类
├── db.json                # 数据库文件
└── package.json           # 依赖配置
```

### 前端结构

```
├── src/
│   ├── components/
│   │   ├── SubscriptionPlans.vue    # 订阅套餐组件
│   │   ├── DrawingBoard.vue         # 主界面组件
│   │   ├── ImageGenerator.vue       # 图像生成组件
│   │   └── ImageEditor.vue          # 图像编辑组件
│   └── main.js                      # 入口文件
```

### 数据库结构

```json
{
  "users": [
    {
      "id": "用户ID",
      "ip": "用户IP",
      "totalUsage": 0,
      "dailyUsage": 0,
      "lastUsageDate": "2025-07-16"
    }
  ],
  "subscriptions": [
    {
      "id": "订阅ID",
      "userId": "用户ID",
      "planId": "套餐ID",
      "status": "active",
      "expiresAt": "过期时间"
    }
  ],
  "payments": [
    {
      "id": "支付ID",
      "userId": "用户ID",
      "planId": "套餐ID",
      "amount": 19.9,
      "status": "completed",
      "qrCode": "二维码数据"
    }
  ]
}
```

## 💰 套餐配置

### 基础版 (¥19.9/月)
- 每日50次生成
- 基础画质 (medium)
- 标准尺寸

### 高级版 (¥39.9/月)
- 每日200次生成
- 高画质 (high)
- 所有尺寸
- 优先处理

### 专业版 (¥99.9/月)
- 无限生成
- 最高画质 (high)
- 所有尺寸
- 优先处理
- 批量下载

## 🔧 配置说明

### 环境变量

```bash
# OpenAI API 配置
VITE_OPENAI_API_KEY=your_openai_api_key_here
VITE_OPENAI_BASE_URL=https://api.maynor1024.live/v1

# 服务器配置
PORT=3000
MAX_USAGE_COUNT=10

# 支付宝当面付配置
ALIPAY_APP_ID=your_alipay_app_id
ALIPAY_PRIVATE_KEY=your_alipay_private_key
ALIPAY_PUBLIC_KEY=your_alipay_public_key
ALIPAY_GATEWAY=https://openapi.alipay.com/gateway.do
ALIPAY_NOTIFY_URL=https://your-domain.com/api/payment/alipay/notify
```

### 支付宝配置步骤

1. 登录支付宝开放平台 https://open.alipay.com/
2. 创建应用并获取APP_ID
3. 生成RSA密钥对
4. 配置应用公钥
5. 获取支付宝公钥
6. 设置异步通知URL

## 📡 API 接口

### 订阅相关

- `GET /api/subscription/plans` - 获取套餐列表
- `GET /api/subscription/status` - 获取用户订阅状态
- `POST /api/payment/create` - 创建支付订单
- `GET /api/payment/status/:paymentId` - 查询支付状态
- `POST /api/payment/alipay/notify` - 支付宝异步通知

### 用户相关

- `GET /api/status` - 获取用户使用状态
- `POST /api/images/generations` - 图像生成 (需要权限)
- `POST /api/images/edits` - 图像编辑 (需要权限)

## 🚀 使用流程

### 用户订阅流程

1. 用户访问订阅套餐页面
2. 选择合适的套餐
3. 点击"立即订阅"
4. 系统生成支付二维码
5. 用户扫码支付
6. 支付成功后自动激活订阅

### 权限验证流程

1. 用户发起图像生成/编辑请求
2. 系统识别用户身份
3. 检查用户订阅状态
4. 验证使用限制
5. 处理请求或返回限制提示

## 🛡️ 安全特性

1. **API密钥保护** - 后端处理所有API调用
2. **签名验证** - 支付宝通知签名验证
3. **使用限制** - 防止滥用和超量使用
4. **数据加密** - 敏感数据安全存储

## 📊 监控和统计

系统提供以下监控功能：

- 用户使用量统计
- 订阅状态监控
- 支付成功率统计
- 系统健康状态检查

## 🔄 未来扩展

可以考虑的功能扩展：

1. **多支付方式** - 微信支付、银联支付等
2. **订阅管理** - 续费、退订、暂停等
3. **优惠券系统** - 折扣码、推荐奖励等
4. **企业版功能** - 团队管理、批量购买等
5. **数据分析** - 用户行为分析、收入统计等

## 🐛 故障排除

### 常见问题

1. **支付功能不可用**
   - 检查支付宝配置是否完整
   - 确认异步通知URL是否可访问

2. **用户权限异常**
   - 检查数据库用户记录
   - 验证订阅状态和过期时间

3. **API调用失败**
   - 检查OpenAI API密钥配置
   - 确认网络连接正常

### 日志查看

服务器会输出详细的日志信息，包括：

- 用户请求日志
- 支付状态变更
- 错误信息记录
- 系统运行状态

## 📞 技术支持

如果遇到问题，请：

1. 检查环境变量配置
2. 查看服务器日志
3. 确认数据库状态
4. 联系技术支持

---

**注意**: 在生产环境中使用前，请确保所有配置项都已正确设置，并进行充分的测试。 