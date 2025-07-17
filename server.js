const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const FormData = require('form-data');
const { v4: uuidv4 } = require('uuid');
const cookieParser = require('cookie-parser');

// 数据库和认证
const { initDatabase, query } = require('./config/database');
const { AlipayService, isAlipayConfigured } = require('./config/alipay');
const { generateToken, authenticateToken, optionalAuth } = require('./utils/auth');
const { 
  registerValidator, 
  loginValidator, 
  updateUserValidator, 
  changePasswordValidator,
  generateImageValidator,
  editImageValidator,
  paymentValidator,
  validate 
} = require('./utils/validators');
const UserService = require('./services/userService');

// 加载环境变量
dotenv.config();
console.log('环境变量加载完成');

const app = express();
const port = process.env.PORT || 3000;

// API密钥和基础URL从环境变量中获取
const OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.VITE_OPENAI_BASE_URL || 'https://api.maynor1024.live/v1';
// 每个用户的最大使用次数
const MAX_USAGE_COUNT = process.env.MAX_USAGE_COUNT || 10;

console.log("OPENAI_API_KEY:", OPENAI_API_KEY)
console.log("OPENAI_BASE_URL:", OPENAI_BASE_URL)
console.log("用户最大使用次数:", MAX_USAGE_COUNT)

if (!OPENAI_API_KEY) {
  console.error('警告: 未设置OpenAI API密钥。请确保在.env文件中设置VITE_OPENAI_API_KEY。');
}

// 用户使用次数跟踪
const userUsageMap = new Map();

// 创建支付宝服务实例
const alipayService = new AlipayService();

// 创建用户服务实例
const userService = new UserService();

// MySQL数据库初始化在启动时进行

// 获取用户IP
const getClientIP = (req) => {
  // 尝试获取各种代理设置中的客户端IP
  const ip = req.headers['x-forwarded-for'] || 
             req.headers['x-real-ip'] || 
             req.connection.remoteAddress ||
             req.socket.remoteAddress ||
             req.connection.socket?.remoteAddress;
  
  // 提取IPv4地址，避免IPv6前缀
  const ipv4Match = ip?.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
  return ipv4Match ? ipv4Match[0] : ip;
};

// 检查用户使用次数限制的中间件
const checkUsageLimit = async (req, res, next) => {
  const clientIP = getClientIP(req);
  
  // 如果是排除的路径，直接跳过
  const excludedPaths = ['/api/status', '/api/auth', '/api/subscription', '/api/payment'];
  if (excludedPaths.some(path => req.path.startsWith(path))) {
    return next();
  }
  
  try {
    // 检查用户是否已登录
    if (!req.user) {
      return res.status(401).json({
        error: {
          message: '请先登录',
          code: 'authentication_required'
        }
      });
    }
    
    const userId = req.user.id;
    console.log(`用户 ${userId} 请求来源IP: ${clientIP}`);
    
    // 重置每日使用次数（如果需要）
    await userService.resetDailyUsage(userId);
    
    // 获取用户限制
    const limits = await userService.getUserLimits(userId);
    
    // 获取用户当前使用情况
    const userStats = await userService.getUserStats(userId);
    
    // 检查是否超过每日限制
    if (!limits.isUnlimited && userStats.user.dailyUsage >= limits.dailyLimit) {
      console.log(`用户 ${userId} 已达到每日使用次数限制 (${userStats.user.dailyUsage}/${limits.dailyLimit})`);
      return res.status(429).json({
        error: {
          message: `您已达到每日使用次数限制 (${limits.dailyLimit}次)。请升级订阅以获得更多使用次数。`,
          code: 'daily_limit_exceeded',
          upgrade_required: true
        }
      });
    }
    
    // 继续处理请求
    next();
  } catch (error) {
    console.error('检查用户限制时出错:', error);
    
    return res.status(500).json({
      error: {
        message: '服务器内部错误',
        code: 'internal_server_error'
      }
    });
  }
};

// 记录使用次数的函数
const incrementUsageCount = async (req) => {
  if (req.user) {
    await userService.incrementUserUsage(req.user.id);
    console.log(`用户 ${req.user.id} 使用次数增加`);
  }
};

// 配置上传存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    // 确保上传目录存在
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log('创建上传目录:', uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname);
    console.log('上传文件名:', filename);
    cb(null, filename);
  }
});


// 使用任何字段名的上传中间件，更宽松的配置
const uploadAny = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  }
}).any();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 请求日志中间件
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} [${req.method}] ${req.path}`);
  next();
});

// 可选认证中间件 (不强制登录)
app.use('/api', optionalAuth);

// 使用次数限制中间件 (仅对需要认证的API)
app.use('/api/images', authenticateToken, checkUsageLimit);

// 修改静态文件服务配置
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  console.log('已找到dist目录，提供静态文件服务:', distPath);
  app.use(express.static(distPath));
} else {
  console.warn('警告: dist目录不存在，请先运行 npm run build');
}

// --- Start: API Endpoints ---

// 用户认证API
app.post('/api/auth/register', async (req, res) => {
  console.log('收到用户注册请求');
  try {
    const validatedData = validate(registerValidator, req.body);
    
    const user = await userService.createUser(validatedData);
    
    // 生成JWT token
    const token = generateToken({ 
      id: user.id, 
      username: user.username, 
      email: user.email 
    });
    
    // 设置Cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7天
    });
    
    res.status(201).json({
      success: true,
      message: '注册成功',
      user: user,
      token: token
    });
    
  } catch (error) {
    console.error('用户注册失败:', error);
    
    if (error.type === 'validation_error') {
      return res.status(400).json({
        error: {
          message: error.message,
          code: 'validation_error',
          details: error.errors
        }
      });
    }
    
    res.status(400).json({
      error: {
        message: error.message || '注册失败',
        code: 'registration_failed'
      }
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  console.log('收到用户登录请求');
  try {
    const validatedData = validate(loginValidator, req.body);
    
    const user = await userService.verifyLogin(validatedData.username, validatedData.password);
    
    // 生成JWT token
    const token = generateToken({ 
      id: user.id, 
      username: user.username, 
      email: user.email 
    });
    
    // 设置Cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7天
    });
    
    res.json({
      success: true,
      message: '登录成功',
      user: user,
      token: token
    });
    
  } catch (error) {
    console.error('用户登录失败:', error);
    
    if (error.type === 'validation_error') {
      return res.status(400).json({
        error: {
          message: error.message,
          code: 'validation_error',
          details: error.errors
        }
      });
    }
    
    res.status(401).json({
      error: {
        message: error.message || '登录失败',
        code: 'login_failed'
      }
    });
  }
});

app.post('/api/auth/logout', (req, res) => {
  console.log('收到用户退出请求');
  res.clearCookie('token');
  res.json({
    success: true,
    message: '退出成功'
  });
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  console.log('收到获取用户信息请求');
  try {
    const userStats = await userService.getUserStats(req.user.id);
    
    res.json({
      success: true,
      data: userStats
    });
    
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({
      error: {
        message: '获取用户信息失败',
        code: 'get_user_failed'
      }
    });
  }
});

app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  console.log('收到更新用户信息请求');
  try {
    const validatedData = validate(updateUserValidator, req.body);
    
    const updatedUser = await userService.updateUser(req.user.id, validatedData);
    
    res.json({
      success: true,
      message: '用户信息更新成功',
      user: updatedUser
    });
    
  } catch (error) {
    console.error('更新用户信息失败:', error);
    
    if (error.type === 'validation_error') {
      return res.status(400).json({
        error: {
          message: error.message,
          code: 'validation_error',
          details: error.errors
        }
      });
    }
    
    res.status(400).json({
      error: {
        message: error.message || '更新失败',
        code: 'update_failed'
      }
    });
  }
});

app.put('/api/auth/password', authenticateToken, async (req, res) => {
  console.log('收到修改密码请求');
  try {
    const validatedData = validate(changePasswordValidator, req.body);
    
    await userService.changePassword(
      req.user.id, 
      validatedData.currentPassword, 
      validatedData.newPassword
    );
    
    res.json({
      success: true,
      message: '密码修改成功'
    });
    
  } catch (error) {
    console.error('修改密码失败:', error);
    
    if (error.type === 'validation_error') {
      return res.status(400).json({
        error: {
          message: error.message,
          code: 'validation_error',
          details: error.errors
        }
      });
    }
    
    res.status(400).json({
      error: {
        message: error.message || '密码修改失败',
        code: 'password_change_failed'
      }
    });
  }
});

// 图片生成API
app.post('/api/images/generations', async (req, res) => {
  console.log('收到图片生成请求');
  
  try {
    // 验证输入参数
    const validatedData = validate(generateImageValidator, req.body);
    const { prompt, quality, size, n } = validatedData;
    
    console.log('请求参数:', { 
      userId: req.user.id, 
      prompt: prompt?.substring(0, 20) + '...', 
      quality, 
      size, 
      n 
    });

    if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your_openai_api_key_here') {
      console.error('错误: API密钥未配置');
      return res.status(500).json({ 
        error: { 
          message: 'OpenAI API密钥未配置，请在.env文件中设置VITE_OPENAI_API_KEY',
          code: 'api_key_not_configured'
        } 
      });
    }

    console.log('正在调用OpenAI API...');
    const response = await axios({
      method: 'post',
      url: `${OPENAI_BASE_URL}/images/generations`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      data: {
        model: "gpt-image-1",
        prompt,
        n: n, // Pass validated n to OpenAI API
        quality: quality || 'medium',
        size: size || '1024x1024',
        response_format: "url"
      }
    });

    // 保存成功的历史记录
    if (response.data && response.data.data && Array.isArray(response.data.data)) {
      const generatedData = response.data.data;
      console.log(`OpenAI API 成功返回 ${generatedData.length} 张图片数据`);
      
      // 保存每个成功生成的图片记录
      for (const item of generatedData) {
        if (item.url) {
          await query(`
            INSERT INTO image_history (user_id, type, prompt, image_url, quality, size, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [req.user.id, 'generate', prompt, item.url, quality, size, 'success']);
        }
      }
      
      console.log(`${generatedData.length} 条图片生成成功历史记录已保存`);
    }

    // 增加用户使用次数
    await incrementUsageCount(req);
    
    console.log('OpenAI API响应成功');
    res.json(response.data); // Send the full response back (contains array data)
  } catch (error) {
    console.error('生成图片错误:');
    if (error.response) {
      console.error('API响应状态:', error.response.status);
      console.error('API响应数据:', error.response.data);
    } else if (error.request) {
      console.error('无响应:', error.request);
    } else {
      console.error('错误信息:', error.message);
    }
    
    // 保存失败的历史记录
    try {
      const errorMessage = error.response?.data?.error?.message || '图像生成失败: ' + error.message;
      await query(`
        INSERT INTO image_history (user_id, type, prompt, quality, size, status, error_message)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [req.user.id, 'generate', prompt, quality, size, 'failed', errorMessage]);
      
      console.log('图片生成失败历史记录已保存');
    } catch (dbError) {
      console.error('保存失败历史记录时出错:', dbError);
    }
    
    res.status(error.response?.status || 500).json({
      error: {
        message: error.response?.data?.error?.message || '图像生成失败: ' + error.message
      }
    });
  }
});

// 图片编辑API - 使用any()中间件处理所有文件字段
app.post('/api/images/edits', (req, res) => {
  console.log('收到图片编辑请求');
  
  // 使用any()中间件，接受任何字段名的文件
  uploadAny(req, res, async (err) => {
    if (err) {
      console.error('文件上传错误:', err);
      return res.status(400).json({ 
        error: { 
          message: '文件上传失败: ' + (err.message || '未知错误'),
          code: err.code
        } 
      });
    }
    
    try {
      const { prompt, quality, size } = req.body;
      const imageFiles = req.files || [];
      // Store original filenames for history
      const originalFilenames = imageFiles.map(f => f.originalname).join(', ');
      
      console.log('请求参数:', { 
        prompt: prompt?.substring(0, 20) + '...', 
        quality, 
        size, 
        imageFiles: `${imageFiles.length}个文件已上传` 
      });
      
      // 调试信息 - 查看所有上传的文件和字段
      console.log('所有上传的文件:', imageFiles.map(f => ({ 
        fieldname: f.fieldname, 
        originalname: f.originalname,
        size: f.size
      })));
      console.log('请求体字段:', req.body);

      if (!prompt) {
        console.error('错误: 提示词为空');
        return res.status(400).json({ error: { message: '提示词不能为空' } });
      }

      if (imageFiles.length === 0) {
        console.error('错误: 图片文件为空');
        return res.status(400).json({ error: { message: '图片文件不能为空' } });
      }

      if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your_openai_api_key_here') {
        console.error('错误: API密钥未配置');
        return res.status(500).json({ 
          error: { 
            message: 'OpenAI API密钥未配置，请在.env文件中设置VITE_OPENAI_API_KEY',
            code: 'api_key_not_configured'
          } 
        });
      }

      // 创建FormData对象
      const formData = new FormData();
      formData.append('model', 'gpt-image-1');
      formData.append('prompt', prompt);
      formData.append('quality', quality || 'medium');
      formData.append('size', size || '1024x1024');
      formData.append('response_format', 'url');
      
      // 添加所有图片文件，使用官方API格式
      console.log(`添加${imageFiles.length}个图片文件到请求`);
      imageFiles.forEach((file, index) => {
        console.log(`添加图片文件 ${index+1}/${imageFiles.length}:`, file.path);
        // 使用 image[] 格式添加文件，与OpenAI API格式匹配
        formData.append('image[]', fs.createReadStream(file.path));
      });

      console.log('正在调用OpenAI编辑API...');
      const response = await axios.post(`${OPENAI_BASE_URL}/images/edits`, formData, {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          ...formData.getHeaders()
        }
      });

      // ---- Start: Add edit success to history ----
      let editedImageUrl = null;
      if (response.data && response.data.data && response.data.data[0] && response.data.data[0].url) {
         editedImageUrl = response.data.data[0].url;
         if(db) { // Check if db is initialized
            const historyEntry = {
              id: uuidv4(),
              type: 'edit', // Mark as edit history
              prompt,
              quality: quality || 'medium',
              size: size || '1024x1024',
              originalFilenames, // Save original filename(s)
              imageUrl: editedImageUrl, // Edited image URL
              status: 'success', 
              timestamp: new Date().toISOString(),
              // userId: req.user ? req.user.id : getClientIP(req)
            };
            
            db.data.history = db.data.history || [];
            db.data.history.unshift(historyEntry);
            await db.write();
            console.log('图片编辑成功历史记录已保存');
         } else {
            console.warn('Database not available, edit success history not saved.');
         }
      } else {
         console.warn('OpenAI API响应数据格式不正确，无法从响应中提取编辑后的图片URL');
      }
      // ---- End: Add edit success to history ----

      // 处理完成后删除所有临时文件
      imageFiles.forEach(file => {
        fs.unlinkSync(file.path);
        console.log('临时文件已删除:', file.path);
      });

      console.log('OpenAI API响应成功');
      console.log("响应结果：", response.data)
      
      // 增加用户使用次数
      await incrementUsageCount(req);
      
      res.json(response.data);
    } catch (error) {
      console.error('编辑图片错误:');
      if (error.response) {
        console.error('API响应状态:', error.response.status);
        console.error('API响应数据:', error.response.data);
      } else if (error.request) {
        console.error('无响应:', error.request);
      } else {
        console.error('错误信息:', error.message);
      }
      
      // ---- Start: Add edit error to history ----
       if(db) { // Check if db is initialized
          try {
            const { prompt, quality, size } = req.body;
            const imageFiles = req.files || []; // Get files again or pass from outer scope if needed
            const originalFilenames = imageFiles.map(f => f.originalname).join(', ');
            
            const historyEntry = {
              id: uuidv4(),
              type: 'edit',
              prompt,
              quality: quality || 'medium',
              size: size || '1024x1024',
              originalFilenames,
              imageUrl: null, // No URL on failure
              status: 'failed',
              error: error.response?.data?.error?.message || '图像编辑失败: ' + error.message,
              timestamp: new Date().toISOString(),
              // userId: req.user ? req.user.id : getClientIP(req)
            };
            
            db.data.history = db.data.history || [];
            db.data.history.unshift(historyEntry);
            await db.write();
            console.log('图片编辑失败历史记录已保存');
          } catch (dbError) {
            console.error('保存编辑失败历史记录时出错:', dbError);
          }
       } else {
           console.warn('Database not available, edit error history not saved.');
       }
      // ---- End: Add edit error to history ----
      
      // 尝试删除所有临时文件
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          try {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
              console.log('出错后临时文件已删除:', file.path);
            }
          } catch (err) {
            console.error('删除临时文件失败:', err);
          }
        });
      }
      
      res.status(error.response?.status || 500).json({
        error: {
          message: error.response?.data?.error?.message || '图像编辑失败: ' + error.message
        }
      });
    }
  });
});

// 检查服务器状态API
app.get('/api/status', (req, res) => {
  console.log('收到状态检查请求');
  const clientIP = getClientIP(req);
  const usageCount = userUsageMap.get(clientIP) || 0;
  
  res.json({ 
    status: 'ok', 
    message: '服务器运行正常',
    time: new Date().toISOString(),
    api_configured: !!OPENAI_API_KEY,
    usage: {
      current: usageCount,
      max: MAX_USAGE_COUNT,
      remaining: Math.max(0, MAX_USAGE_COUNT - usageCount)
    }
  });
});

// 获取订阅套餐API
app.get('/api/subscription/plans', async (req, res) => {
  console.log('收到获取订阅套餐请求');
  try {
    const plans = await query(`
      SELECT id, name, description, price, duration_days, features, 
             generation_limit, daily_limit, quality_limit, is_active
      FROM subscription_plans 
      WHERE is_active = true
      ORDER BY price ASC
    `);
    
    // 解析JSON字段
    const parsedPlans = plans.map(plan => ({
      ...plan,
      features: JSON.parse(plan.features || '[]'),
      duration: plan.duration_days // 保持向后兼容
    }));
    
    res.json({ plans: parsedPlans });
  } catch (error) {
    console.error('获取订阅套餐失败:', error);
    res.status(500).json({ error: { message: '获取订阅套餐失败: ' + error.message } });
  }
});

// 获取用户订阅状态API
app.get('/api/subscription/status', authenticateToken, async (req, res) => {
  console.log('收到获取用户订阅状态请求');
  try {
    const userStats = await userService.getUserStats(req.user.id);
    
    res.json({
      success: true,
      data: userStats
    });
  } catch (error) {
    console.error('获取用户订阅状态失败:', error);
    res.status(500).json({ error: { message: '获取用户订阅状态失败: ' + error.message } });
  }
});

// 创建支付订单API
app.post('/api/payment/create', authenticateToken, async (req, res) => {
  console.log('收到创建支付订单请求');
  
  // 检查支付宝是否已配置
  if (!isAlipayConfigured()) {
    return res.status(503).json({ 
      error: { 
        message: '支付功能暂不可用，请联系管理员配置支付宝接口',
        code: 'payment_not_configured'
      } 
    });
  }
  
  try {
    const validatedData = validate(paymentValidator, req.body);
    const { planId } = validatedData;
    
    // 查找套餐
    const plans = await query('SELECT * FROM subscription_plans WHERE id = ? AND is_active = true', [planId]);
    if (plans.length === 0) {
      return res.status(400).json({ error: { message: '无效的套餐ID' } });
    }
    
    const plan = plans[0];
    
    // 创建支付订单
    const outTradeNo = `SUB_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const orderInfo = {
      outTradeNo,
      subject: `智灵绘图 - ${plan.name}`,
      totalAmount: plan.price.toString(),
      body: `订阅${plan.name}，${plan.duration_days}天有效期`,
      storeId: '001',
      timeoutExpress: '10m'
    };
    
    // 调用支付宝API创建订单
    const alipayResult = await alipayService.createFaceToFaceOrder(orderInfo);
    
    if (alipayResult.code === '10000') {
      // 保存支付记录
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10分钟过期
      
      await query(`
        INSERT INTO payments (user_id, plan_id, out_trade_no, amount, status, qr_code, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [req.user.id, planId, outTradeNo, plan.price, 'pending', alipayResult.qrCode, expiresAt]);
      
      // 获取插入的支付记录ID
      const [paymentRecord] = await query('SELECT id FROM payments WHERE out_trade_no = ?', [outTradeNo]);
      
      console.log('支付订单创建成功:', outTradeNo);
      res.json({
        success: true,
        paymentId: paymentRecord.id,
        outTradeNo,
        qrCode: alipayResult.qrCode,
        amount: plan.price,
        planName: plan.name
      });
    } else {
      throw new Error(`支付宝API错误: ${alipayResult.msg}`);
    }
  } catch (error) {
    console.error('创建支付订单失败:', error);
    
    if (error.type === 'validation_error') {
      return res.status(400).json({
        error: {
          message: error.message,
          code: 'validation_error',
          details: error.errors
        }
      });
    }
    
    res.status(500).json({ error: { message: '创建支付订单失败: ' + error.message } });
  }
});

// 查询支付状态API
app.get('/api/payment/status/:paymentId', authenticateToken, async (req, res) => {
  console.log('收到查询支付状态请求');
  
  try {
    const { paymentId } = req.params;
    
    // 查找支付记录
    const payments = await query('SELECT * FROM payments WHERE id = ? AND user_id = ?', [paymentId, req.user.id]);
    if (payments.length === 0) {
      return res.status(404).json({ error: { message: '支付记录不存在' } });
    }
    
    const payment = payments[0];
    
    // 查询支付宝订单状态
    const alipayResult = await alipayService.queryOrder(payment.out_trade_no);
    
    if (alipayResult.code === '10000') {
      const tradeStatus = alipayResult.tradeStatus;
      
      if (tradeStatus === 'TRADE_SUCCESS') {
        // 支付成功，激活订阅
        if (payment.status === 'pending') {
          await activateSubscription(payment.user_id, payment.plan_id);
          
          // 更新支付状态
          await query(`
            UPDATE payments 
            SET status = 'completed', trade_no = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [alipayResult.tradeNo, paymentId]);
        }
        
        res.json({
          status: 'success',
          message: '支付成功'
        });
      } else if (tradeStatus === 'WAIT_BUYER_PAY') {
        res.json({
          status: 'pending',
          message: '等待支付'
        });
      } else {
        res.json({
          status: 'failed',
          message: '支付失败或已取消'
        });
      }
    } else {
      res.json({
        status: 'unknown',
        message: '查询支付状态失败'
      });
    }
  } catch (error) {
    console.error('查询支付状态失败:', error);
    res.status(500).json({ error: { message: '查询支付状态失败: ' + error.message } });
  }
});

// 支付宝异步通知处理
app.post('/api/payment/alipay/notify', async (req, res) => {
  console.log('收到支付宝异步通知');
  try {
    const notifyData = req.body;
    
    // 验证签名
    const isValid = alipayService.verifySign(notifyData);
    if (!isValid) {
      console.error('支付宝通知签名验证失败');
      return res.status(400).send('FAIL');
    }
    
    const outTradeNo = notifyData.out_trade_no;
    const tradeStatus = notifyData.trade_status;
    const tradeNo = notifyData.trade_no;
    
    if (tradeStatus === 'TRADE_SUCCESS') {
      // 查找支付记录
      const payments = await query('SELECT * FROM payments WHERE out_trade_no = ?', [outTradeNo]);
      
      if (payments.length > 0) {
        const payment = payments[0];
        
        if (payment.status === 'pending') {
          // 激活订阅
          await activateSubscription(payment.user_id, payment.plan_id);
          
          // 更新支付状态
          await query(`
            UPDATE payments 
            SET status = 'completed', trade_no = ?, updated_at = CURRENT_TIMESTAMP
            WHERE out_trade_no = ?
          `, [tradeNo, outTradeNo]);
          
          console.log('订阅激活成功:', payment.user_id, payment.plan_id);
        }
      }
    }
    
    res.send('SUCCESS');
  } catch (error) {
    console.error('处理支付宝通知失败:', error);
    res.status(500).send('FAIL');
  }
});

// 激活订阅的辅助函数
async function activateSubscription(userId, planId) {
  // 查找套餐信息
  const plans = await query('SELECT * FROM subscription_plans WHERE id = ?', [planId]);
  if (plans.length === 0) {
    throw new Error('套餐不存在');
  }
  
  const plan = plans[0];
  
  // 计算到期时间
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + plan.duration_days * 24 * 60 * 60 * 1000);
  
  // 先将用户的现有订阅设为过期
  await query(`
    UPDATE user_subscriptions 
    SET status = 'expired', updated_at = CURRENT_TIMESTAMP 
    WHERE user_id = ? AND status = 'active'
  `, [userId]);
  
  // 创建新的订阅记录
  await query(`
    INSERT INTO user_subscriptions (user_id, plan_id, status, start_date, end_date)
    VALUES (?, ?, 'active', ?, ?)
  `, [userId, planId, startDate, endDate]);
  
  console.log('订阅激活成功:', { userId, planId, startDate, endDate });
}

// 获取历史记录API
app.get('/api/history', authenticateToken, async (req, res) => {
  console.log('收到获取历史记录请求');
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const offset = (page - 1) * pageSize;
    
    const history = await query(`
      SELECT id, type, prompt, image_url, quality, size, status, error_message, created_at
      FROM image_history 
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [req.user.id, pageSize, offset]);
    
    const [countResult] = await query(`
      SELECT COUNT(*) as total FROM image_history WHERE user_id = ?
    `, [req.user.id]);
    
    res.json({ 
      history: history.map(item => ({
        id: item.id,
        type: item.type,
        prompt: item.prompt,
        imageUrl: item.image_url,
        quality: item.quality,
        size: item.size,
        status: item.status,
        error: item.error_message,
        timestamp: item.created_at
      })),
      pagination: {
        page,
        pageSize,
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / pageSize)
      }
    }); 
  } catch (error) {
    console.error('获取历史记录失败:', error);
    res.status(500).json({ error: { message: '获取历史记录失败: ' + error.message } });
  }
});

// 处理SPA路由
app.get('*', (req, res) => {
  // 只处理非API请求的路由
  if (!req.path.startsWith('/api/')) {
    console.log('处理SPA路由:', req.path);
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('应用尚未构建，请先运行 npm run build');
    }
  } else {
    // 对于未定义的API路由，返回404
    console.log('未找到API路由:', req.path);
    res.status(404).json({ error: { message: '未找到API路由: ' + req.path } });
  }
});

// 导出 app 而不是直接启动服务器
module.exports = app;

// --- Start: Asynchronous Server Startup ---
async function startServer() {
  try {
    await initDatabase(); // 初始化MySQL数据库
    
    app.listen(port, () => {
      console.log(`服务器运行在端口 ${port}`);
      console.log('环境变量:', {
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT,
        VITE_OPENAI_API_KEY: process.env.VITE_OPENAI_API_KEY ? '已设置' : '未设置',
        VITE_OPENAI_BASE_URL: process.env.VITE_OPENAI_BASE_URL || 'https://api.maynor1024.live/v1'
      });
    });
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
}

startServer(); // Call the async function to start the server
// --- End: Asynchronous Server Startup --- 