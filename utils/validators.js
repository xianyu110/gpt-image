const Joi = require('joi');

// 用户注册验证
const registerValidator = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required()
    .messages({
      'string.base': '用户名必须是字符串',
      'string.alphanum': '用户名只能包含字母和数字',
      'string.min': '用户名长度至少为3个字符',
      'string.max': '用户名长度不能超过30个字符',
      'any.required': '用户名是必填项'
    }),
  
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': '邮箱格式不正确',
      'any.required': '邮箱是必填项'
    }),
  
  password: Joi.string()
    .min(6)
    .max(100)
    .required()
    .messages({
      'string.min': '密码长度至少为6个字符',
      'string.max': '密码长度不能超过100个字符',
      'any.required': '密码是必填项'
    }),
  
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': '确认密码必须与密码一致',
      'any.required': '确认密码是必填项'
    }),
  
  phone: Joi.string()
    .pattern(/^1[3-9]\d{9}$/)
    .optional()
    .messages({
      'string.pattern.base': '手机号格式不正确'
    })
});

// 用户登录验证
const loginValidator = Joi.object({
  username: Joi.string()
    .required()
    .messages({
      'any.required': '用户名/邮箱是必填项'
    }),
  
  password: Joi.string()
    .required()
    .messages({
      'any.required': '密码是必填项'
    })
});

// 用户信息更新验证
const updateUserValidator = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .optional()
    .messages({
      'string.base': '用户名必须是字符串',
      'string.alphanum': '用户名只能包含字母和数字',
      'string.min': '用户名长度至少为3个字符',
      'string.max': '用户名长度不能超过30个字符'
    }),
  
  email: Joi.string()
    .email()
    .optional()
    .messages({
      'string.email': '邮箱格式不正确'
    }),
  
  phone: Joi.string()
    .pattern(/^1[3-9]\d{9}$/)
    .optional()
    .messages({
      'string.pattern.base': '手机号格式不正确'
    }),
  
  avatar: Joi.string()
    .uri()
    .optional()
    .messages({
      'string.uri': '头像URL格式不正确'
    })
});

// 密码修改验证
const changePasswordValidator = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'any.required': '当前密码是必填项'
    }),
  
  newPassword: Joi.string()
    .min(6)
    .max(100)
    .required()
    .messages({
      'string.min': '新密码长度至少为6个字符',
      'string.max': '新密码长度不能超过100个字符',
      'any.required': '新密码是必填项'
    }),
  
  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': '确认密码必须与新密码一致',
      'any.required': '确认密码是必填项'
    })
});

// 图像生成验证
const generateImageValidator = Joi.object({
  prompt: Joi.string()
    .min(1)
    .max(1000)
    .required()
    .messages({
      'string.min': '提示词不能为空',
      'string.max': '提示词长度不能超过1000个字符',
      'any.required': '提示词是必填项'
    }),
  
  quality: Joi.string()
    .valid('low', 'medium', 'high')
    .default('medium')
    .messages({
      'any.only': '画质选项无效'
    }),
  
  size: Joi.string()
    .valid('1024x1024', '1024x1536', '1536x1024')
    .default('1024x1024')
    .messages({
      'any.only': '尺寸选项无效'
    }),
  
  n: Joi.number()
    .integer()
    .min(1)
    .max(4)
    .default(1)
    .messages({
      'number.base': '生成数量必须是数字',
      'number.integer': '生成数量必须是整数',
      'number.min': '生成数量至少为1',
      'number.max': '生成数量最多为4'
    })
});

// 图像编辑验证
const editImageValidator = Joi.object({
  prompt: Joi.string()
    .min(1)
    .max(1000)
    .required()
    .messages({
      'string.min': '编辑提示词不能为空',
      'string.max': '编辑提示词长度不能超过1000个字符',
      'any.required': '编辑提示词是必填项'
    }),
  
  quality: Joi.string()
    .valid('low', 'medium', 'high')
    .default('medium')
    .messages({
      'any.only': '画质选项无效'
    }),
  
  size: Joi.string()
    .valid('1024x1024', '1024x1536', '1536x1024')
    .default('1024x1024')
    .messages({
      'any.only': '尺寸选项无效'
    })
});

// 支付订单验证
const paymentValidator = Joi.object({
  planId: Joi.string()
    .required()
    .messages({
      'any.required': '套餐ID是必填项'
    })
});

// 验证函数
function validate(schema, data) {
  const { error, value } = schema.validate(data, { abortEarly: false });
  
  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path[0],
      message: detail.message
    }));
    
    throw {
      type: 'validation_error',
      message: '输入验证失败',
      errors: errors
    };
  }
  
  return value;
}

module.exports = {
  registerValidator,
  loginValidator,
  updateUserValidator,
  changePasswordValidator,
  generateImageValidator,
  editImageValidator,
  paymentValidator,
  validate
}; 