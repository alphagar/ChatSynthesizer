<template>
  <n-card hoverable class="model-group-card">
    <template #header>
      <n-space justify="space-between" align="center">
        <div>
          <h3>{{ group.title }}</h3>
          <n-space :size="8">
            <n-tag type="info" size="small">
              모델 {{ group.models.length }}개
            </n-tag>
            <n-tag :type="synthesizerModeTagType" size="small">
              {{ synthesizerModeText }}
            </n-tag>
          </n-space>
        </div>
        
        <n-dropdown 
          trigger="hover" 
          :options="menuOptions"
          @select="handleMenuSelect"
        >
          <n-button quaternary circle>
            <template #icon>
              <n-icon><ellipsis-vertical /></n-icon>
            </template>
          </n-button>
        </n-dropdown>
      </n-space>
    </template>

    <n-space direction="vertical" :size="16">
      <!-- 모델 목록 -->
      <div>
        <h4>포함된 모델:</h4>
        <n-space :size="8" style="margin-top: 8px;">
          <n-tag 
            v-for="model in group.models" 
            :key="model.id"
            size="small"
            :title="model.modelName"
          >
            {{ model.displayName }}
          </n-tag>
        </n-space>
      </div>

      <!-- 싱크로나이저 설정 -->
      <div>
        <h4>싱크로나이저:</h4>
        <n-space align="center" :size="12" style="margin-top: 8px;">
          <n-tag type="primary" size="small">
            {{ group.synthesizer.model }}
          </n-tag>
          <span class="mode-description">{{ getModeDescription(group.synthesizer.mode) }}</span>
          <n-tag 
            v-if="group.synthesizer.mode === 'intersection' && group.synthesizer.intersectionThreshold"
            size="small"
          >
            최소 {{ group.synthesizer.intersectionThreshold }}개
          </n-tag>
        </n-space>
      </div>

      <!-- 메타데이터 -->
      <div class="metadata">
        <n-space justify="space-between">
          <span class="meta-text">생성: {{ formatDate(group.createdAt) }}</span>
          <span class="meta-text">수정: {{ formatDate(group.updatedAt) }}</span>
        </n-space>
      </div>
    </n-space>
  </n-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  NCard,
  NSpace,
  NTag,
  NButton,
  NIcon,
  NDropdown,
  type DropdownOption
} from 'naive-ui'
import { EllipsisVertical } from '@vicons/ionicons5'
import type { AIModelGroup } from '@/types'
import { formatDate } from '@/utils'

interface Props {
  group: AIModelGroup
}

interface Emits {
  (e: 'edit', group: AIModelGroup): void
  (e: 'delete', group: AIModelGroup): void
  (e: 'duplicate', group: AIModelGroup): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Computed
const synthesizerModeText = computed(() => {
  switch (props.group.synthesizer.mode) {
    case 'union':
      return '합집합'
    case 'intersection':
      return '교집합'
    case 'selective':
      return '선별'
    default:
      return '알 수 없음'
  }
})

const synthesizerModeTagType = computed(() => {
  switch (props.group.synthesizer.mode) {
    case 'union':
      return 'success'
    case 'intersection':
      return 'warning'
    case 'selective':
      return 'info'
    default:
      return 'default'
  }
})

const menuOptions = computed<DropdownOption[]>(() => [
  {
    label: '편집',
    key: 'edit',
    icon: () => '✏️'
  },
  {
    label: '복제',
    key: 'duplicate',
    icon: () => '📋'
  },
  {
    type: 'divider',
    key: 'divider1'
  },
  {
    label: '삭제',
    key: 'delete',
    icon: () => '🗑️'
  }
])

// Methods
const handleMenuSelect = (key: string) => {
  switch (key) {
    case 'edit':
      emit('edit', props.group)
      break
    case 'delete':
      emit('delete', props.group)
      break
    case 'duplicate':
      emit('duplicate', props.group)
      break
  }
}

const getModeDescription = (mode: string): string => {
  switch (mode) {
    case 'union':
      return '모든 정보를 통합하여 중복 제거'
    case 'intersection':
      return '공통 언급 내용만 추출'
    case 'selective':
      return '가치 높은 정보만 선별'
    default:
      return ''
  }
}
</script>

<style scoped>
.model-group-card {
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  }

  h3 {
    margin: 0 0 8px 0;
    font-size: 20px;
    font-weight: 600;
    color: var(--text-color-1);
  }

  h4 {
    margin: 0 0 4px 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-color-2);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .mode-description {
    font-size: 12px;
    color: var(--text-color-3);
  }

  .metadata {
    padding-top: 12px;
    border-top: 1px solid var(--divider-color);

    .meta-text {
      font-size: 12px;
      color: var(--text-color-3);
    }
  }
}
</style>
