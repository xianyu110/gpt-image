# 环境变量配置说明

## 必需的环境变量

### OpenAI API 配置
```
VITE_OPENAI_API_KEY=your_openai_api_key_here
VITE_OPENAI_BASE_URL=https://api.maynor1024.live/v1
```

### 服务器配置
```
PORT=3000
MAX_USAGE_COUNT=10
```

### 支付宝当面付配置
```
ALIPAY_APP_ID=your_alipay_app_id
ALIPAY_PRIVATE_KEY=your_alipay_private_key
ALIPAY_PUBLIC_KEY=your_alipay_public_key
ALIPAY_GATEWAY=https://openapi.alipay.com/gateway.do
ALIPAY_NOTIFY_URL=https://your-domain.com/api/payment/alipay/notify
```

### 开发环境配置
```
NODE_ENV=development
```

## 设置步骤

1. 创建 `.env` 文件在项目根目录
2. 复制上述配置到 `.env` 文件中
3. 替换相应的值为你的实际配置
4. 重启应用程序

## 支付宝配置获取

1. 登录支付宝开放平台: https://open.alipay.com/
2. 创建应用并获取 APP_ID
3. 配置应用公钥和私钥
4. 设置异步通知URL

## 注意事项

- 私钥和公钥需要使用正确的格式
- 异步通知URL必须是公网可访问的地址
- 开发环境可以使用支付宝沙箱环境进行测试 