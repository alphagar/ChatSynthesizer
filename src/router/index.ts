import { createRouter, createWebHistory } from 'vue-router'
import ChatPage from '@/views/ChatPage.vue'
import ModelGroupManager from '@/views/ModelGroupManager.vue'

const routes = [
  {
    path: '/',
    name: 'Chat',
    component: ChatPage,
    meta: {
      title: '채팅'
    }
  },
  {
    path: '/groups',
    name: 'ModelGroups',
    component: ModelGroupManager,
    meta: {
      title: 'AI 모델 그룹 관리'
    }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 페이지 타이틀 설정
router.beforeEach((to) => {
  document.title = `${to.meta.title || 'ChatSynthesizer'} | ChatSynthesizer`
})

export default router
