const { query } = require('../config/database');
const { hashPassword, verifyPassword } = require('../utils/auth');

class UserService {
  // 根据用户名或邮箱查找用户
  async findByUsernameOrEmail(username) {
    const users = await query(
      'SELECT * FROM users WHERE username = ? OR email = ? LIMIT 1',
      [username, username]
    );
    return users[0] || null;
  }

  // 根据ID查找用户
  async findById(id) {
    const users = await query(
      'SELECT * FROM users WHERE id = ? LIMIT 1',
      [id]
    );
    return users[0] || null;
  }

  // 根据邮箱查找用户
  async findByEmail(email) {
    const users = await query(
      'SELECT * FROM users WHERE email = ? LIMIT 1',
      [email]
    );
    return users[0] || null;
  }

  // 根据用户名查找用户
  async findByUsername(username) {
    const users = await query(
      'SELECT * FROM users WHERE username = ? LIMIT 1',
      [username]
    );
    return users[0] || null;
  }

  // 创建新用户
  async createUser(userData) {
    const { username, email, password, phone } = userData;
    
    // 检查用户名是否已存在
    const existingUser = await this.findByUsernameOrEmail(username);
    if (existingUser) {
      throw new Error('用户名或邮箱已存在');
    }
    
    // 检查邮箱是否已存在
    const existingEmail = await this.findByEmail(email);
    if (existingEmail) {
      throw new Error('邮箱已存在');
    }
    
    // 加密密码
    const hashedPassword = await hashPassword(password);
    
    // 插入用户
    const result = await query(
      'INSERT INTO users (username, email, password, phone) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, phone || null]
    );
    
    // 返回创建的用户信息（不包含密码）
    const newUser = await this.findById(result.insertId);
    const { password: _, ...userWithoutPassword } = newUser;
    
    return userWithoutPassword;
  }

  // 验证用户登录
  async verifyLogin(username, password) {
    const user = await this.findByUsernameOrEmail(username);
    
    if (!user) {
      throw new Error('用户不存在');
    }
    
    if (user.status !== 'active') {
      throw new Error('账户已被禁用');
    }
    
    const isPasswordValid = await verifyPassword(password, user.password);
    
    if (!isPasswordValid) {
      throw new Error('密码错误');
    }
    
    // 返回用户信息（不包含密码）
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // 更新用户信息
  async updateUser(id, updateData) {
    const { username, email, phone, avatar } = updateData;
    
    // 构建更新SQL
    const updateFields = [];
    const values = [];
    
    if (username) {
      // 检查用户名是否已被其他用户使用
      const existingUser = await this.findByUsername(username);
      if (existingUser && existingUser.id !== id) {
        throw new Error('用户名已被使用');
      }
      updateFields.push('username = ?');
      values.push(username);
    }
    
    if (email) {
      // 检查邮箱是否已被其他用户使用
      const existingEmail = await this.findByEmail(email);
      if (existingEmail && existingEmail.id !== id) {
        throw new Error('邮箱已被使用');
      }
      updateFields.push('email = ?');
      values.push(email);
    }
    
    if (phone !== undefined) {
      updateFields.push('phone = ?');
      values.push(phone);
    }
    
    if (avatar !== undefined) {
      updateFields.push('avatar = ?');
      values.push(avatar);
    }
    
    if (updateFields.length === 0) {
      throw new Error('没有要更新的字段');
    }
    
    values.push(id);
    
    await query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
      values
    );
    
    // 返回更新后的用户信息
    const updatedUser = await this.findById(id);
    const { password: _, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  // 更改密码
  async changePassword(id, currentPassword, newPassword) {
    const user = await this.findById(id);
    
    if (!user) {
      throw new Error('用户不存在');
    }
    
    // 验证当前密码
    const isCurrentPasswordValid = await verifyPassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new Error('当前密码错误');
    }
    
    // 加密新密码
    const hashedNewPassword = await hashPassword(newPassword);
    
    // 更新密码
    await query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedNewPassword, id]
    );
    
    return { message: '密码修改成功' };
  }

  // 获取用户订阅状态
  async getUserSubscriptionStatus(userId) {
    const subscriptions = await query(`
      SELECT 
        us.*,
        sp.name as plan_name,
        sp.features,
        sp.generation_limit,
        sp.daily_limit,
        sp.quality_limit
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.user_id = ? AND us.status = 'active' AND us.end_date > NOW()
      ORDER BY us.end_date DESC
    `, [userId]);
    
    return subscriptions[0] || null;
  }

  // 获取用户使用限制
  async getUserLimits(userId) {
    const subscription = await this.getUserSubscriptionStatus(userId);
    
    if (subscription) {
      return {
        dailyLimit: subscription.daily_limit,
        qualityLimit: subscription.quality_limit,
        isUnlimited: subscription.generation_limit === -1,
        hasActiveSubscription: true
      };
    }
    
    // 免费用户限制
    return {
      dailyLimit: parseInt(process.env.MAX_USAGE_COUNT || 10),
      qualityLimit: 'medium',
      isUnlimited: false,
      hasActiveSubscription: false
    };
  }

  // 重置每日使用次数
  async resetDailyUsage(userId) {
    const user = await this.findById(userId);
    if (!user) return;
    
    const today = new Date().toISOString().split('T')[0];
    if (user.last_usage_date !== today) {
      await query(
        'UPDATE users SET daily_usage = 0, last_usage_date = ? WHERE id = ?',
        [today, userId]
      );
    }
  }

  // 增加用户使用次数
  async incrementUserUsage(userId) {
    await this.resetDailyUsage(userId);
    
    await query(
      'UPDATE users SET total_usage = total_usage + 1, daily_usage = daily_usage + 1 WHERE id = ?',
      [userId]
    );
  }

  // 获取用户统计信息
  async getUserStats(userId) {
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('用户不存在');
    }
    
    await this.resetDailyUsage(userId);
    
    const subscription = await this.getUserSubscriptionStatus(userId);
    const limits = await this.getUserLimits(userId);
    
    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        totalUsage: user.total_usage,
        dailyUsage: user.daily_usage,
        lastUsageDate: user.last_usage_date,
        status: user.status,
        createdAt: user.created_at
      },
      subscription: {
        hasActiveSubscription: !!subscription,
        planName: subscription?.plan_name || null,
        endDate: subscription?.end_date || null,
        features: subscription?.features || []
      },
      limits: limits
    };
  }

  // 禁用/启用用户
  async updateUserStatus(id, status) {
    await query(
      'UPDATE users SET status = ? WHERE id = ?',
      [status, id]
    );
    
    const user = await this.findById(id);
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // 获取用户列表（管理员功能）
  async getUserList(page = 1, pageSize = 20, search = '') {
    const offset = (page - 1) * pageSize;
    let whereClause = '';
    let params = [];
    
    if (search) {
      whereClause = 'WHERE username LIKE ? OR email LIKE ?';
      params = [`%${search}%`, `%${search}%`];
    }
    
    const users = await query(
      `SELECT id, username, email, avatar, phone, status, total_usage, daily_usage, created_at 
       FROM users ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );
    
    const [countResult] = await query(
      `SELECT COUNT(*) as total FROM users ${whereClause}`,
      params
    );
    
    return {
      users,
      total: countResult.total,
      page,
      pageSize,
      totalPages: Math.ceil(countResult.total / pageSize)
    };
  }
}

module.exports = UserService; 