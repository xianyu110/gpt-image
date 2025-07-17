<template>
  <div class="subscription-plans">
    <div class="plans-header">
      <h2>订阅套餐</h2>
      <p>选择适合您的套餐，解锁更多功能</p>
    </div>

    <div class="user-status" v-if="userStats">
      <div class="status-card">
        <h3>当前状态</h3>
        <div class="status-info">
          <div class="info-item">
            <span class="label">今日使用:</span>
            <span class="value">{{ userStats.user.dailyUsage }}/{{ userStats.limits.dailyLimit === -1 ? '∞' : userStats.limits.dailyLimit }}</span>
          </div>
          <div class="info-item">
            <span class="label">总使用次数:</span>
            <span class="value">{{ userStats.user.totalUsage }}</span>
          </div>
          <div class="info-item">
            <span class="label">订阅状态:</span>
            <span class="value" :class="{ 'active': userStats.subscription.hasActiveSubscription }">
              {{ userStats.subscription.hasActiveSubscription ? '已订阅' : '未订阅' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="plans-grid">
      <div 
        v-for="plan in plans" 
        :key="plan.id"
        class="plan-card"
        :class="{ 'current': isCurrentPlan(plan.id) }"
      >
        <div class="plan-header">
          <h3>{{ plan.name }}</h3>
          <div class="price">
            <span class="amount">¥{{ plan.price }}</span>
            <span class="period">/{{ plan.duration }}天</span>
          </div>
        </div>
        
        <div class="plan-features">
          <ul>
            <li v-for="feature in plan.features" :key="feature">
              <span class="icon">✓</span>
              {{ feature }}
            </li>
          </ul>
        </div>
        
        <div class="plan-actions">
          <button 
            v-if="!isCurrentPlan(plan.id)"
            class="btn btn-primary"
            @click="subscribeToPlan(plan)"
            :disabled="isProcessing"
          >
            <span v-if="isProcessing">处理中...</span>
            <span v-else>立即订阅</span>
          </button>
          <button 
            v-else
            class="btn btn-current"
            disabled
          >
            当前套餐
          </button>
        </div>
      </div>
    </div>

    <!-- 支付弹窗 -->
    <div v-if="showPaymentModal" class="payment-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>支付订单</h3>
          <button class="close-btn" @click="closePaymentModal">×</button>
        </div>
        
        <div class="modal-body">
          <div class="order-info">
            <h4>订单信息</h4>
            <div class="info-row">
              <span>套餐:</span>
              <span>{{ selectedPlan?.name }}</span>
            </div>
            <div class="info-row">
              <span>价格:</span>
              <span>¥{{ selectedPlan?.price }}</span>
            </div>
            <div class="info-row">
              <span>有效期:</span>
              <span>{{ selectedPlan?.duration }}天</span>
            </div>
          </div>
          
          <div class="qr-code-section" v-if="paymentInfo">
            <h4>支付宝扫码支付</h4>
            <div class="qr-code">
              <img :src="paymentInfo.qrCode" alt="支付二维码" />
            </div>
            <p class="payment-tip">请使用支付宝扫描二维码完成支付</p>
            <div class="payment-status">
              <span>支付状态: {{ paymentStatusText }}</span>
              <button class="btn btn-small" @click="checkPaymentStatus">刷新状态</button>
            </div>
          </div>
          
          <div class="loading" v-if="isCreatingPayment">
            <p>正在创建支付订单...</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'SubscriptionPlans',
  props: {
    userStats: {
      type: Object,
      default: () => null
    }
  },
  data() {
    return {
      plans: [],
      selectedPlan: null,
      showPaymentModal: false,
      paymentInfo: null,
      paymentStatus: 'pending',
      isProcessing: false,
      isCreatingPayment: false,
      paymentCheckInterval: null
    };
  },
  computed: {
    paymentStatusText() {
      switch (this.paymentStatus) {
        case 'pending': return '等待支付';
        case 'success': return '支付成功';
        case 'failed': return '支付失败';
        default: return '未知状态';
      }
    }
  },
  async mounted() {
    await this.loadData();
  },
  beforeUnmount() {
    if (this.paymentCheckInterval) {
      clearInterval(this.paymentCheckInterval);
    }
  },
  methods: {
    async loadData() {
      try {
        // 加载套餐列表
        const plansResponse = await axios.get('/api/subscription/plans');
        this.plans = plansResponse.data.plans;
      } catch (error) {
        console.error('加载数据失败:', error);
        this.$message?.error('加载数据失败，请刷新页面重试');
      }
    },
    
    isCurrentPlan(planId) {
      return this.userStats?.subscription?.hasActiveSubscription && 
             this.userStats.subscription.planName === this.plans.find(p => p.id === planId)?.name;
    },
    
    async subscribeToPlan(plan) {
      this.selectedPlan = plan;
      this.showPaymentModal = true;
      this.isCreatingPayment = true;
      
      try {
        // 创建支付订单
        const response = await axios.post('/api/payment/create', {
          planId: plan.id
        });
        
        this.paymentInfo = response.data;
        this.isCreatingPayment = false;
        
        // 开始检查支付状态
        this.startPaymentStatusCheck();
        
      } catch (error) {
        console.error('创建支付订单失败:', error);
        this.$message?.error('创建支付订单失败，请重试');
        this.isCreatingPayment = false;
        this.closePaymentModal();
      }
    },
    
    startPaymentStatusCheck() {
      if (this.paymentCheckInterval) {
        clearInterval(this.paymentCheckInterval);
      }
      
      this.paymentCheckInterval = setInterval(async () => {
        await this.checkPaymentStatus();
      }, 3000); // 每3秒检查一次
    },
    
    async checkPaymentStatus() {
      if (!this.paymentInfo) return;
      
      try {
        const response = await axios.get(`/api/payment/status/${this.paymentInfo.paymentId}`);
        this.paymentStatus = response.data.status;
        
        if (this.paymentStatus === 'success') {
          this.$message?.success('支付成功！订阅已激活');
          this.closePaymentModal();
          await this.loadData(); // 刷新用户信息
        } else if (this.paymentStatus === 'failed') {
          this.$message?.error('支付失败，请重试');
          this.closePaymentModal();
        }
      } catch (error) {
        console.error('检查支付状态失败:', error);
      }
    },
    
    closePaymentModal() {
      this.showPaymentModal = false;
      this.selectedPlan = null;
      this.paymentInfo = null;
      this.paymentStatus = 'pending';
      this.isCreatingPayment = false;
      
      if (this.paymentCheckInterval) {
        clearInterval(this.paymentCheckInterval);
        this.paymentCheckInterval = null;
      }
    }
  }
};
</script>

<style scoped>
.subscription-plans {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.plans-header {
  text-align: center;
  margin-bottom: 30px;
}

.plans-header h2 {
  font-size: 2.5rem;
  margin-bottom: 10px;
  color: var(--primary-color);
}

.plans-header p {
  font-size: 1.1rem;
  color: var(--text-secondary);
}

.user-status {
  margin-bottom: 30px;
}

.status-card {
  background: var(--card-background);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.status-card h3 {
  margin-bottom: 15px;
  color: var(--primary-color);
}

.status-info {
  display: flex;
  gap: 30px;
  flex-wrap: wrap;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-item .label {
  color: var(--text-secondary);
}

.info-item .value {
  font-weight: 500;
  color: var(--text-primary);
}

.info-item .value.active {
  color: var(--success-color);
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}

.plan-card {
  background: var(--card-background);
  border: 2px solid var(--border-color);
  border-radius: 16px;
  padding: 24px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.plan-card:hover {
  border-color: var(--primary-color);
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.plan-card.current {
  border-color: var(--success-color);
  background: var(--success-background);
}

.plan-card.current::before {
  content: '当前套餐';
  position: absolute;
  top: 12px;
  right: -30px;
  background: var(--success-color);
  color: white;
  padding: 4px 40px;
  font-size: 0.8rem;
  transform: rotate(45deg);
}

.plan-header {
  text-align: center;
  margin-bottom: 24px;
}

.plan-header h3 {
  font-size: 1.5rem;
  margin-bottom: 8px;
  color: var(--primary-color);
}

.price {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 4px;
}

.price .amount {
  font-size: 2rem;
  font-weight: 700;
  color: var(--primary-color);
}

.price .period {
  color: var(--text-secondary);
}

.plan-features ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.plan-features li {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  padding: 8px 0;
}

.plan-features .icon {
  color: var(--success-color);
  font-weight: bold;
}

.plan-actions {
  margin-top: 24px;
}

.btn {
  width: 100%;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover);
  transform: translateY(-1px);
}

.btn-current {
  background: var(--success-color);
  color: white;
  cursor: not-allowed;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 支付弹窗样式 */
.payment-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: var(--card-background);
  border-radius: 12px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
  color: var(--primary-color);
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-secondary);
}

.modal-body {
  padding: 20px;
}

.order-info {
  margin-bottom: 20px;
}

.order-info h4 {
  margin-bottom: 10px;
  color: var(--primary-color);
}

.info-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.qr-code-section {
  text-align: center;
}

.qr-code {
  margin: 20px 0;
  display: flex;
  justify-content: center;
}

.qr-code img {
  max-width: 200px;
  max-height: 200px;
}

.payment-tip {
  color: var(--text-secondary);
  margin-bottom: 20px;
}

.payment-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: var(--background-light);
  border-radius: 8px;
}

.btn-small {
  padding: 6px 12px;
  font-size: 0.9rem;
}

.loading {
  text-align: center;
  padding: 40px;
  color: var(--text-secondary);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .plans-grid {
    grid-template-columns: 1fr;
  }
  
  .status-info {
    flex-direction: column;
    gap: 10px;
  }
  
  .info-item {
    justify-content: space-between;
  }
}
</style> 