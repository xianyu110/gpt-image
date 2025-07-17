const AlipaySdk = require('alipay-sdk').default;

// 检查支付宝配置是否完整
const isAlipayConfigured = () => {
  return process.env.ALIPAY_APP_ID && 
         process.env.ALIPAY_PRIVATE_KEY && 
         process.env.ALIPAY_PUBLIC_KEY;
};

// 支付宝当面付配置
const alipayConfig = {
  appId: process.env.ALIPAY_APP_ID || 'dummy_app_id',
  privateKey: process.env.ALIPAY_PRIVATE_KEY || 'dummy_private_key',
  alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY || 'dummy_public_key',
  gateway: process.env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do',
  timeout: 5000,
  camelCase: true,
  format: 'json',
  charset: 'utf-8',
  signType: 'RSA2',
  version: '1.0'
};

// 创建支付宝SDK实例（仅在配置完整时）
let alipaySdk = null;
if (isAlipayConfigured()) {
  alipaySdk = new AlipaySdk(alipayConfig);
  console.log('支付宝SDK初始化成功');
} else {
  console.warn('支付宝配置不完整，支付功能已禁用');
}

// 支付宝当面付工具类
class AlipayService {
  constructor() {
    this.sdk = alipaySdk;
    this.isEnabled = isAlipayConfigured();
  }

  // 检查支付宝是否可用
  checkEnabled() {
    if (!this.isEnabled) {
      throw new Error('支付宝未配置，支付功能不可用');
    }
  }

  // 创建当面付订单
  async createFaceToFaceOrder(orderInfo) {
    this.checkEnabled();
    
    try {
      const { outTradeNo, subject, totalAmount, body, storeId, timeoutExpress } = orderInfo;
      
      const params = {
        subject,
        outTradeNo,
        totalAmount,
        body,
        storeId: storeId || '001',
        timeoutExpress: timeoutExpress || '5m'
      };

      const result = await this.sdk.exec('alipay.trade.precreate', {
        bizContent: params,
        notify_url: process.env.ALIPAY_NOTIFY_URL
      });

      return result;
    } catch (error) {
      console.error('创建当面付订单失败:', error);
      throw error;
    }
  }

  // 查询订单状态
  async queryOrder(outTradeNo) {
    this.checkEnabled();
    
    try {
      const result = await this.sdk.exec('alipay.trade.query', {
        bizContent: {
          outTradeNo
        }
      });

      return result;
    } catch (error) {
      console.error('查询订单失败:', error);
      throw error;
    }
  }

  // 取消订单
  async cancelOrder(outTradeNo) {
    this.checkEnabled();
    
    try {
      const result = await this.sdk.exec('alipay.trade.cancel', {
        bizContent: {
          outTradeNo
        }
      });

      return result;
    } catch (error) {
      console.error('取消订单失败:', error);
      throw error;
    }
  }

  // 验证支付宝回调签名
  verifySign(params) {
    this.checkEnabled();
    
    try {
      return this.sdk.checkNotifySign(params);
    } catch (error) {
      console.error('验证签名失败:', error);
      return false;
    }
  }

  // 退款
  async refund(refundInfo) {
    this.checkEnabled();
    
    try {
      const { outTradeNo, refundAmount, refundReason } = refundInfo;
      
      const result = await this.sdk.exec('alipay.trade.refund', {
        bizContent: {
          outTradeNo,
          refundAmount,
          refundReason
        }
      });

      return result;
    } catch (error) {
      console.error('退款失败:', error);
      throw error;
    }
  }
}

module.exports = {
  AlipayService,
  alipayConfig,
  isAlipayConfigured
}; 