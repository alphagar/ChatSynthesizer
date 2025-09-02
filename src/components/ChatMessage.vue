<template>
  <div class="chat-message" :class="{ 'user-message': isUser, 'assistant-message': isAssistant }">
    <div class="message-content">
      <div class="message-header">
        <div class="role-indicator">
          <n-avatar
            :size="32"
            :style="{ backgroundColor: isUser ? '#36ad6a' : '#2080f0' }"
          >
            {{ isUser ? 'U' : 'AI' }}
          </n-avatar>
          <span class="role-name">
            {{ isUser ? '사용자' : 'AI 어시스턴트' }}
          </span>
        </div>
        
        <div class="message-meta">
          <n-time :time="message.timestamp" type="relative" />
        </div>
      </div>

      <!-- 메시지 내용 -->
      <div class="message-body">
        <div class="main-content">
          <MarkdownRenderer :content="message.content" />
        </div>

        <!-- 합성 정보 -->
        <div v-if="message.synthesizedFrom && message.synthesizedFrom.length > 0" class="synthesis-info">
          <n-space :size="4">
            <n-text depth="3" style="font-size: 12px;">합성된 모델:</n-text>
            <n-tag 
              v-for="modelName in message.synthesizedFrom" 
              :key="modelName"
              size="tiny"
              type="info"
            >
              {{ modelName }}
            </n-tag>
          </n-space>
          
          <!-- 모델 응답 토글 버튼 (어시스턴트 메시지이고 modelResponses가 있는 경우) -->
          <n-button
            v-if="isAssistant && message.modelResponses && message.modelResponses.length > 0"
            text
            size="small"
            @click="$emit('toggle-responses')"
          >
            <template #icon>
              <n-icon>
                <chevron-down-outline v-if="!showModelResponses" />
                <chevron-up-outline v-else />
              </n-icon>
            </template>
            개별 응답 {{ showModelResponses ? '숨기기' : '보기' }}
          </n-button>
        </div>

        <!-- 개별 모델 응답들 -->
        <div 
          v-if="showModelResponses && message.modelResponses && message.modelResponses.length > 0"
          class="model-responses"
        >
          <n-divider style="margin: 16px 0;" />
          <div class="responses-header">
            <h4>개별 모델 응답</h4>
            <n-text depth="3" style="font-size: 12px;">
              각 AI 모델이 생성한 개별 응답을 확인할 수 있습니다.
            </n-text>
          </div>
          
          <n-space direction="vertical" :size="16" style="margin-top: 12px;">
            <n-card 
              v-for="response in message.modelResponses" 
              :key="response.modelId"
              size="small"
              embedded
            >
              <template #header>
                <n-space justify="space-between" align="center">
                  <div>
                    <n-text strong>{{ response.modelName }}</n-text>
                    <n-tag 
                      :type="response.isCompleted ? 'success' : 'warning'"
                      size="small"
                      style="margin-left: 8px;"
                    >
                      {{ response.isCompleted ? '완료' : '진행 중' }}
                    </n-tag>
                  </div>
                  <n-time :time="response.timestamp" type="relative" />
                </n-space>
              </template>
              
              <MarkdownRenderer :content="response.content" />
            </n-card>
          </n-space>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  NAvatar,
  NSpace,
  NText,
  NTag,
  NButton,
  NIcon,
  NTime,
  NDivider,
  NCard
} from 'naive-ui'
import { ChevronDownOutline, ChevronUpOutline } from '@vicons/ionicons5'
import type { ChatMessage } from '@/types'
import MarkdownRenderer from './MarkdownRenderer.vue'

interface Props {
  message: ChatMessage
  showModelResponses?: boolean
}

interface Emits {
  (e: 'toggle-responses'): void
}

const props = withDefaults(defineProps<Props>(), {
  showModelResponses: false
})
defineEmits<Emits>()

// Computed
const isUser = computed(() => props.message.role === 'user')
const isAssistant = computed(() => props.message.role === 'assistant')
</script>

<style scoped>
.chat-message {
  margin-bottom: 24px;

  &.user-message .message-content {
    background: var(--success-color-hover);
    border-radius: 16px 16px 4px 16px;
  }

  &.assistant-message .message-content {
    background: var(--card-color);
    border-radius: 16px 16px 16px 4px;
    border: 1px solid var(--border-color);
  }

  .message-content {
    padding: 16px 20px;

    .message-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;

      .role-indicator {
        display: flex;
        align-items: center;
        gap: 8px;

        .role-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-color-1);
        }
      }

      .message-meta {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 12px;
        color: var(--text-color-3);
      }
    }

    .message-body {
      .main-content {
        line-height: 1.6;
        color: var(--text-color-1);
      }

      .synthesis-info {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid var(--divider-color);
      }

      .model-responses {
        .responses-header {
          h4 {
            margin: 0 0 4px 0;
            font-size: 14px;
            font-weight: 600;
          }
        }
      }
    }
  }
}
</style>
