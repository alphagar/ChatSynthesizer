<template>
  <div class="model-responses-display">
    <div class="responses-header">
      <h4>AI 모델들이 응답하고 있습니다...</h4>
      <n-progress 
        :percentage="completionPercentage" 
        :status="isGenerating ? 'default' : 'success'"
        style="margin-top: 8px;"
      />
    </div>

    <div class="responses-container">
      <n-card 
        v-for="response in responses" 
        :key="response.modelId"
        size="small"
        class="response-card"
      >
        <template #header>
          <n-space justify="space-between" align="center">
            <div class="model-info">
              <span class="model-name">{{ response.modelName }}</span>
              <n-tag 
                :type="getStatusTagType(response)" 
                size="small"
                style="margin-left: 8px;"
              >
                {{ getStatusText(response) }}
              </n-tag>
            </div>
            
            <div class="response-stats">
              <n-text depth="3" style="font-size: 12px;">
                {{ response.content.length }} 문자
              </n-text>
            </div>
          </n-space>
        </template>

        <div class="response-content">
          <!-- 응답 내용이 있는 경우 -->
          <div v-if="response.content.trim()" class="content">
            <MarkdownRenderer :content="response.content" />
            
            <!-- 스트리밍 커서 -->
            <span 
              v-if="!response.isCompleted && isGenerating"
              class="streaming-cursor"
            >
              |
            </span>
          </div>

          <!-- 아직 응답이 시작되지 않은 경우 -->
          <div v-else class="waiting-content">
            <n-space align="center" :size="8">
              <n-spin size="small" v-if="!response.isCompleted" />
              <n-text depth="3">
                {{ response.isCompleted ? '응답을 받지 못했습니다.' : '응답을 기다리는 중...' }}
              </n-text>
            </n-space>
          </div>
        </div>
      </n-card>
    </div>

    <!-- 합성 진행 상태 -->
    <div v-if="!isGenerating && allCompleted" class="synthesis-status">
      <n-card size="small" style="background: var(--success-color-hover); border: none;">
        <n-space align="center" :size="12">
          <n-icon size="20" color="var(--success-color)">
            <checkmark-circle-outline />
          </n-icon>
          <div>
            <div class="status-text">모든 모델의 응답이 완료되었습니다.</div>
            <div class="status-sub">싱크로나이저가 최종 응답을 생성하고 있습니다...</div>
          </div>
          <n-spin size="small" />
        </n-space>
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  NCard,
  NSpace,
  NTag,
  NText,
  NProgress,
  NSpin,
  NIcon
} from 'naive-ui'
import { CheckmarkCircleOutline } from '@vicons/ionicons5'
import type { ModelResponse } from '@/types'
import MarkdownRenderer from './MarkdownRenderer.vue'

interface Props {
  responses: ModelResponse[]
  isGenerating: boolean
}

const props = defineProps<Props>()

// Computed
const completionPercentage = computed(() => {
  if (props.responses.length === 0) return 0
  
  const completedCount = props.responses.filter(r => r.isCompleted).length
  return Math.round((completedCount / props.responses.length) * 100)
})

const allCompleted = computed(() => {
  return props.responses.length > 0 && props.responses.every(r => r.isCompleted)
})

// Methods
const getStatusTagType = (response: ModelResponse) => {
  if (response.isCompleted) {
    return response.content.trim() ? 'success' : 'warning'
  }
  return response.content.trim() ? 'info' : 'default'
}

const getStatusText = (response: ModelResponse) => {
  if (response.isCompleted) {
    return response.content.trim() ? '완료' : '응답 없음'
  }
  return response.content.trim() ? '생성 중...' : '대기 중...'
}
</script>

<style scoped>
.model-responses-display {
  .responses-header {
    h4 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--text-color-1);
    }
  }

  .responses-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-top: 16px;
    width: 100%;
  }

  .response-card {
    width: 100%;
    flex-shrink: 0;
  }

  .model-info {
    display: flex;
    align-items: center;

    .model-name {
      font-weight: 600;
      font-size: 14px;
    }
  }

  .response-content {
    .content {
      position: relative;
      min-height: 20px;

      .streaming-cursor {
        color: var(--primary-color);
        animation: blink 1s infinite;
        font-weight: bold;
      }
    }

    .waiting-content {
      padding: 20px;
      text-align: center;
      color: var(--text-color-3);
    }
  }

  .synthesis-status {
    margin-top: 20px;

    .status-text {
      font-weight: 600;
      color: var(--success-color);
      margin-bottom: 4px;
    }

    .status-sub {
      font-size: 12px;
      color: var(--text-color-3);
    }
  }

  @keyframes blink {
    0%, 50% {
      opacity: 1;
    }
    51%, 100% {
      opacity: 0;
    }
  }
}
</style>
