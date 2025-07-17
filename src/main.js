import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import './style.css'
import { v4 as uuidv4 } from 'uuid'

// 路由配置
const routes = [
  { path: '/', component: () => import('./components/DrawingBoard.vue') },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 生成或获取用户ID
if (!localStorage.getItem('userId')) {
  localStorage.setItem('userId', uuidv4())
}

const app = createApp(App)
app.use(router)
app.mount('#root')
