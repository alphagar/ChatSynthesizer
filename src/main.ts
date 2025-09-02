import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// Naive UI 스타일은 vite.config.ts의 자동 import 플러그인에서 처리됩니다

const app = createApp(App)

app.use(router)

app.mount('#app')
