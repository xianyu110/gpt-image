<template>
  <div class="auth-wrapper">
    <transition name="fade" mode="out-in">
      <LoginForm 
        v-if="currentView === 'login'"
        @login-success="handleAuthSuccess"
        @switch-to-register="currentView = 'register'"
      />
      <RegisterForm 
        v-else-if="currentView === 'register'"
        @register-success="handleAuthSuccess"
        @switch-to-login="currentView = 'login'"
      />
    </transition>
  </div>
</template>

<script>
import LoginForm from './LoginForm.vue';
import RegisterForm from './RegisterForm.vue';

export default {
  name: 'AuthWrapper',
  components: {
    LoginForm,
    RegisterForm
  },
  emits: ['auth-success'],
  data() {
    return {
      currentView: 'login' // 'login' or 'register'
    };
  },
  methods: {
    handleAuthSuccess(user) {
      this.$emit('auth-success', user);
    }
  }
};
</script>

<style scoped>
.auth-wrapper {
  position: relative;
  width: 100%;
  height: 100vh;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style> 