const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const FormData = require('form-data');
const { v4: uuidv4 } = require('uuid');

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

// --- Start: Database setup moved to async function ---
let db; // Declare db variable here, assign later

async function setupDatabase() {
  try {
    // Dynamically import lowdb modules
    const { Low } = await import('lowdb');
    const { JSONFile } = await import('lowdb/node');
    
    const adapter = new JSONFile('db.json');
    const defaultData = { history: [] };
    db = new Low(adapter, defaultData); // Assign to the outer scope db variable
    
    // Load the database
    await db.read();
    console.log('Database loaded successfully.');
  } catch (error) {
    console.error('Failed to initialize or load database:', error);
    // Decide how to handle DB load failure. Exit or run without DB?
    // For now, we'll log the error and continue, endpoints using db will fail.
  }
}
// --- End: Database setup moved to async function ---

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
const checkUsageLimit = (req, res, next) => {
  const clientIP = getClientIP(req);
  console.log(`请求来源IP: ${clientIP}`);
  
  // 如果是API状态检查请求，不计入使用次数
  if (req.path === '/api/status') {
    return next();
  }
  
  // 获取当前用户的使用次数
  const usageCount = userUsageMap.get(clientIP) || 0;
  
  // 检查是否超过限制
  if (usageCount >= MAX_USAGE_COUNT) {
    console.log(`用户 ${clientIP} 已达到使用次数限制 (${usageCount}/${MAX_USAGE_COUNT})`);
    return res.status(429).json({
      error: {
        message: `您已达到最大使用次数限制 (${MAX_USAGE_COUNT}次)。`,
        code: 'usage_limit_exceeded'
      }
    });
  }
  
  // 如果未超过限制，将使用次数加1并继续
  next();
};

// 记录使用次数的函数
const incrementUsageCount = (req) => {
  const clientIP = getClientIP(req);
  const currentCount = userUsageMap.get(clientIP) || 0;
  userUsageMap.set(clientIP, currentCount + 1);
  console.log(`用户 ${clientIP} 使用次数: ${currentCount + 1}/${MAX_USAGE_COUNT}`);
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

// 请求日志中间件
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} [${req.method}] ${req.path}`);
  next();
});

// 使用次数限制中间件
app.use('/api', checkUsageLimit);

// 修改静态文件服务配置
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  console.log('已找到dist目录，提供静态文件服务:', distPath);
  app.use(express.static(distPath));
} else {
  console.warn('警告: dist目录不存在，请先运行 npm run build');
}

// --- Start: API Endpoints ---
// Ensure DB is checked within endpoints or after setup completion

// 图片生成API
app.post('/api/images/generations', async (req, res) => {
  console.log('收到图片生成请求');
  if (!db) { // Check if db is initialized
      console.error('Database not initialized. Cannot save history.');
      // Optionally return an error or proceed without saving history
      // return res.status(500).json({ error: { message: 'Database error' } });
  }
  try {
    // Destructure n from req.body, default to 1, ensure it's a valid number
    const { prompt, quality, size, n: requestedN } = req.body;
    const n = Math.max(1, Math.min(parseInt(requestedN) || 1, 4)); // Clamp n between 1 and 4 (or API limit)
    console.log('请求参数:', { prompt: prompt?.substring(0, 20) + '...', quality, size, n });

    if (!prompt) {
      console.error('错误: 提示词为空');
      return res.status(400).json({ error: { message: '提示词不能为空' } });
    }

    if (!OPENAI_API_KEY) {
      console.error('错误: API密钥未配置');
      return res.status(500).json({ error: { message: 'OpenAI API密钥未配置' } });
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

    // ---- Start: Modified History Saving for n > 1 ----
    // Check if response data is an array (expected for n > 0)
    if (response.data && response.data.data && Array.isArray(response.data.data)) {
      const generatedData = response.data.data; // Array of { url, revised_prompt? }
      console.log(`OpenAI API 成功返回 ${generatedData.length} 张图片数据`);
      
      if (db) { // Check if db is initialized
         db.data.history = db.data.history || [];
         let savedCount = 0;
         // Save each successful generation as a separate history entry
         for (const item of generatedData) {
             if (item.url) { // Ensure item has a URL
                const historyEntry = {
                  id: uuidv4(),
                  type: 'generate',
                  prompt,
                  quality: quality || 'medium',
                  size: size || '1024x1024',
                  imageUrl: item.url,
                  revised_prompt: item.revised_prompt, // Store revised prompt if available
                  status: 'success',
                  timestamp: new Date().toISOString(),
                  // userId: req.user ? req.user.id : getClientIP(req)
                };
                db.data.history.unshift(historyEntry); // Add to beginning
                savedCount++;
             } else {
                 console.warn('API 返回的某个图片数据缺少 URL', item);
             }
         }
         if (savedCount > 0) {
            await db.write();
            console.log(`${savedCount} 条图片生成成功历史记录已保存`);
         }
      } else {
         console.warn('Database not available, history not saved.');
      }
    } else {
       // This case might indicate an API error before generation or unexpected format
       console.warn('OpenAI API响应数据格式不正确，无法保存历史记录', response.data);
    }
    // ---- End: Modified History Saving ----

    // 增加用户使用次数
    incrementUsageCount(req);
    
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
    
    // ---- Start: Modified Error History Saving ----
    if(db) { 
       try {
         const { prompt, quality, size, n: requestedN } = req.body;
         const n = Math.max(1, Math.min(parseInt(requestedN) || 1, 4));
         const historyEntry = {
           id: uuidv4(),
           type: 'generate',
           prompt,
           quality: quality || 'medium',
           size: size || '1024x1024',
           requestedCount: n, // Store requested number on failure
           imageUrl: null, 
           status: 'failed',
           error: error.response?.data?.error?.message || '图像生成失败: ' + error.message,
           timestamp: new Date().toISOString(),
           // userId: req.user ? req.user.id : getClientIP(req)
         };
         
         db.data.history = db.data.history || [];
         db.data.history.unshift(historyEntry);
         await db.write();
         console.log(`图片生成失败历史记录已保存 (请求数量: ${n})`);
       } catch (dbError) {
         console.error('保存失败历史记录时出错:', dbError);
       }
    } else {
        console.warn('Database not available, error history not saved.');
    }
    // ---- End: Modified Error History Saving ----
    
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

      if (!OPENAI_API_KEY) {
        console.error('错误: API密钥未配置');
        return res.status(500).json({ error: { message: 'OpenAI API密钥未配置' } });
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
      incrementUsageCount(req);
      
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

// 获取历史记录API
app.get('/api/history', async (req, res) => {
  console.log('收到获取历史记录请求');
   if (!db) { // Check if db is initialized
       return res.status(500).json({ error: { message: 'Database not initialized.' } });
   }
  try {
    // Read data from the database
    await db.read(); // Ensure data is fresh (optional depending on strategy)
    const history = db.data.history || [];
    res.json({ history }); 
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
  await setupDatabase(); // Wait for DB setup to complete (or fail)
  
  app.listen(port, () => {
    console.log(`服务器运行在端口 ${port}`);
    console.log('环境变量:', {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      VITE_OPENAI_API_KEY: process.env.VITE_OPENAI_API_KEY ? '已设置' : '未设置',
      VITE_OPENAI_BASE_URL: process.env.VITE_OPENAI_BASE_URL || 'https://api.maynor1024.live/v1'
    });
  });
}

startServer(); // Call the async function to start the server
// --- End: Asynchronous Server Startup --- 