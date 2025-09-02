<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  NConfigProvider,
  NLayout,
  NLayoutHeader,
  NSpace,
  NButton,
  NIcon,
  NText,
  NMessageProvider,
  darkTheme
} from 'naive-ui'
import type { GlobalThemeOverrides } from 'naive-ui'
import { 
  ChatbubblesOutline, 
  SettingsOutline, 
  MoonOutline, 
  SunnyOutline 
} from '@vicons/ionicons5'

const router = useRouter()
const route = useRoute()

const isDarkMode = ref(false)

// 테마 오버라이드
const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#2080F0',
    primaryColorHover: '#4098FC',
    primaryColorPressed: '#1C7ED6',
    successColor: '#36AD6A',
    warningColor: '#F0A020',
    errorColor: '#D03050',
    borderRadius: '8px'
  },
  Card: {
    borderRadius: '12px'
  },
  Input: {
    borderRadius: '8px'
  },
  Button: {
    borderRadius: '8px'
  }
}

// Methods
const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value
}

const navigateTo = (path: string) => {
  router.push(path)
}
</script>

<template>
  <n-config-provider 
    :theme="isDarkMode ? darkTheme : null" 
    :theme-overrides="themeOverrides"
  >
    <n-message-provider>
      <n-layout style="min-height: 100vh;">
        <!-- 헤더 -->
        <n-layout-header 
          bordered 
          style="height: 64px; padding: 0 24px; display: flex; align-items: center;"
        >
          <n-space justify="space-between" align="center" style="width: 100%;">
            <div class="header-left">
              <n-space align="center" :size="16">
                <div class="logo">
                  <h1 style="margin: 0; font-size: 20px; font-weight: bold;">
                    ChatSynthesizer
                  </h1>
                  <n-text depth="3" style="font-size: 12px;">
                    AI 모델 통합 채팅 플랫폼
                  </n-text>
                </div>
                
                <!-- 네비게이션 -->
                <n-space :size="8" style="margin-left: 32px;">
                  <n-button 
                    :type="route.path === '/' ? 'primary' : 'default'"
                    @click="navigateTo('/')"
                    ghost
                  >
                    <template #icon>
                      <n-icon><chatbubbles-outline /></n-icon>
                    </template>
                    채팅
                  </n-button>
                  
                  <n-button 
                    :type="route.path === '/groups' ? 'primary' : 'default'"
                    @click="navigateTo('/groups')"
                    ghost
                  >
                    <template #icon>
                      <n-icon><settings-outline /></n-icon>
                    </template>
                    모델 그룹
                  </n-button>
                </n-space>
              </n-space>
            </div>
            
            <div class="header-right">
              <n-button 
                @click="toggleTheme" 
                circle 
                quaternary
                size="large"
                :title="isDarkMode ? '라이트 모드로 변경' : '다크 모드로 변경'"
              >
                <template #icon>
                  <n-icon size="18">
                    <sunny-outline v-if="isDarkMode" />
                    <moon-outline v-else />
                  </n-icon>
                </template>
              </n-button>
            </div>
          </n-space>
        </n-layout-header>

        <!-- 메인 컨텐츠 -->
        <n-layout style="height: calc(100vh - 64px);">
          <router-view />
        </n-layout>
      </n-layout>
    </n-message-provider>
  </n-config-provider>
</template>

<style>
/* 전역 스타일 */
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.6;
}

#app {
  min-height: 100vh;
}

/* 스크롤바 스타일 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--scrollbar-color, #f1f1f1);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb-color, #c1c1c1);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover-color, #a8a8a8);
}

/* 코드 블록 색상 정의 */
:root {
  --code-color: #f6f8fa;
}

[data-theme="dark"] {
  --code-color: #161b22;
}
</style>

<style scoped>
.header-left {
  display: flex;
  align-items: center;

  .logo {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }
}

.header-right {
  display: flex;
  align-items: center;
}
</style>
