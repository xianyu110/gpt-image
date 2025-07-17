const mysql = require('mysql2/promise');

// MySQL数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'zhiling_image_app',
  charset: 'utf8mb4',
  timezone: '+08:00',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// 创建连接池
const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 数据库初始化
async function initDatabase() {
  try {
    console.log('正在连接MySQL数据库...');
    
    // 首先连接到MySQL服务器（不指定数据库）
    const connectionConfig = {
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      charset: 'utf8mb4',
      timezone: '+08:00'
    };
    
    const tempConnection = await mysql.createConnection(connectionConfig);
    console.log('MySQL数据库连接成功');
    
    // 创建数据库（如果不存在）
    await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`数据库 ${dbConfig.database} 已确保存在`);
    
    // 关闭临时连接
    await tempConnection.end();
    
    // 创建表结构
    await createTables();
    
    console.log('数据库初始化完成');
    
  } catch (error) {
    console.error('数据库初始化失败:', error);
    throw error;
  }
}

// 创建表结构
async function createTables() {
  try {
    // 创建用户表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
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
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_username (username),
        INDEX idx_email (email),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    
    // 创建订阅套餐表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        duration_days INT NOT NULL,
        features JSON,
        generation_limit INT DEFAULT -1,
        daily_limit INT DEFAULT -1,
        quality_limit VARCHAR(20) DEFAULT 'high',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    
    // 创建用户订阅表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS user_subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        plan_id VARCHAR(50) NOT NULL,
        status ENUM('active', 'expired', 'cancelled') DEFAULT 'active',
        start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        end_date TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_plan_id (plan_id),
        INDEX idx_status (status),
        INDEX idx_end_date (end_date)
      ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    
    // 创建支付记录表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS payments (
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
        FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_out_trade_no (out_trade_no),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    
    // 创建图像历史记录表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS image_history (
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
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_type (type),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    
    console.log('数据库表创建完成');
    
    // 插入默认套餐数据
    await insertDefaultPlans();
    
  } catch (error) {
    console.error('创建表失败:', error);
    throw error;
  }
}

// 插入默认套餐数据
async function insertDefaultPlans() {
  try {
    const plans = [
      {
        id: 'basic',
        name: '基础版',
        description: '适合轻度使用者',
        price: 19.9,
        duration_days: 30,
        features: JSON.stringify(['每日50次生成', '基础画质', '标准尺寸']),
        generation_limit: 50,
        daily_limit: 50,
        quality_limit: 'medium'
      },
      {
        id: 'premium',
        name: '高级版',
        description: '适合频繁使用者',
        price: 39.9,
        duration_days: 30,
        features: JSON.stringify(['每日200次生成', '高画质', '所有尺寸', '优先处理']),
        generation_limit: 200,
        daily_limit: 200,
        quality_limit: 'high'
      },
      {
        id: 'professional',
        name: '专业版',
        description: '适合专业创作者',
        price: 99.9,
        duration_days: 30,
        features: JSON.stringify(['无限生成', '最高画质', '所有尺寸', '优先处理', '批量下载']),
        generation_limit: -1,
        daily_limit: -1,
        quality_limit: 'high'
      }
    ];
    
    for (const plan of plans) {
      await pool.execute(`
        INSERT INTO subscription_plans (id, name, description, price, duration_days, features, generation_limit, daily_limit, quality_limit)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        description = VALUES(description),
        price = VALUES(price),
        duration_days = VALUES(duration_days),
        features = VALUES(features),
        generation_limit = VALUES(generation_limit),
        daily_limit = VALUES(daily_limit),
        quality_limit = VALUES(quality_limit)
      `, [
        plan.id, plan.name, plan.description, plan.price, plan.duration_days,
        plan.features, plan.generation_limit, plan.daily_limit, plan.quality_limit
      ]);
    }
    
    console.log('默认套餐数据插入完成');
    
  } catch (error) {
    console.error('插入默认套餐数据失败:', error);
    throw error;
  }
}

// 获取数据库连接
async function getConnection() {
  return await pool.getConnection();
}

// 执行查询
async function query(sql, params = []) {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('SQL查询错误:', error);
    throw error;
  }
}

module.exports = {
  pool,
  initDatabase,
  getConnection,
  query
}; 