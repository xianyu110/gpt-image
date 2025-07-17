const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// 生成JWT Token
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
}

// 验证JWT Token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
}

// 密码加密
async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

// 验证密码
async function verifyPassword(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword);
}

// 从请求中提取JWT Token
function extractToken(req) {
  // 从Header中获取
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // 从Cookie中获取
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  
  return null;
}

// JWT认证中间件
function authenticateToken(req, res, next) {
  const token = extractToken(req);
  
  if (!token) {
    return res.status(401).json({
      error: {
        message: '未提供认证令牌',
        code: 'no_token'
      }
    });
  }
  
  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      error: {
        message: '认证令牌无效',
        code: 'invalid_token'
      }
    });
  }
}

// 可选的JWT认证中间件（不强制要求登录）
function optionalAuth(req, res, next) {
  const token = extractToken(req);
  
  if (token) {
    try {
      const decoded = verifyToken(token);
      req.user = decoded;
    } catch (error) {
      // 忽略无效token，继续处理
      console.warn('Optional auth failed:', error.message);
    }
  }
  
  next();
}

module.exports = {
  generateToken,
  verifyToken,
  hashPassword,
  verifyPassword,
  extractToken,
  authenticateToken,
  optionalAuth
}; 