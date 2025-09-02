<template>
  <div class="model-selector">
    <n-tabs type="line" animated>
      <!-- 인기 모델 탭 -->
      <n-tab-pane name="popular" tab="인기 모델">
        <n-space direction="vertical" :size="16">
          <n-input
            v-model:value="popularSearchQuery"
            placeholder="모델 검색..."
            clearable
          >
            <template #prefix>
              <n-icon><search-outline /></n-icon>
            </template>
          </n-input>

          <n-scrollbar style="max-height: 400px;">
            <n-list>
              <n-list-item
                v-for="model in filteredPopularModels"
                :key="model.id"
                class="model-item"
                @click="selectModel(model.id, model.name)"
              >
                <n-space justify="space-between" align="center">
                  <div>
                    <div class="model-name">{{ model.name }}</div>
                    <div class="model-provider">{{ model.provider }}</div>
                    <n-text depth="3" style="font-size: 12px;">{{ model.id }}</n-text>
                  </div>
                  <n-button type="primary" size="small">선택</n-button>
                </n-space>
              </n-list-item>
            </n-list>
          </n-scrollbar>
        </n-space>
      </n-tab-pane>

      <!-- 사용 가능한 모든 모델 탭 -->
      <n-tab-pane name="available" tab="모든 모델">
        <n-space direction="vertical" :size="16">
          <n-space>
            <n-input
              v-model:value="availableSearchQuery"
              placeholder="모델 검색..."
              clearable
              style="flex: 1;"
            >
              <template #prefix>
                <n-icon><search-outline /></n-icon>
              </template>
            </n-input>
            
            <n-button 
              @click="loadAvailableModels" 
              :loading="loadingAvailable"
              secondary
            >
              <template #icon>
                <n-icon><refresh-outline /></n-icon>
              </template>
              새로고침
            </n-button>
          </n-space>

          <div v-if="loadingAvailable" class="loading-state">
            <n-spin size="large" />
            <div style="margin-top: 16px;">모델 목록을 불러오는 중...</div>
          </div>

          <n-alert 
            v-else-if="availableModels.length === 0" 
            type="info"
            title="모델을 불러올 수 없습니다"
          >
            API 키가 설정되지 않았거나 네트워크 연결에 문제가 있을 수 있습니다.
          </n-alert>

          <n-scrollbar v-else style="max-height: 400px;">
            <n-list>
              <n-list-item
                v-for="model in filteredAvailableModels"
                :key="model.id"
                class="model-item"
                @click="selectModel(model.id, model.name || model.id)"
              >
                <n-space justify="space-between" align="center">
                  <div>
                    <div class="model-name">{{ model.name || model.id }}</div>
                    <n-text depth="3" style="font-size: 12px;">{{ model.id }}</n-text>
                    <div v-if="model.pricing" class="model-pricing">
                      <n-tag size="tiny" type="info">
                        입력: ${{ model.pricing.prompt }} / 출력: ${{ model.pricing.completion }}
                      </n-tag>
                    </div>
                  </div>
                  <n-button type="primary" size="small">선택</n-button>
                </n-space>
              </n-list-item>
            </n-list>
          </n-scrollbar>
        </n-space>
      </n-tab-pane>

      <!-- 수동 입력 탭 -->
      <n-tab-pane name="manual" tab="직접 입력">
        <n-space direction="vertical" :size="24">
          <n-alert type="info" title="수동 모델 입력">
            OpenRouter에서 지원하는 모델 ID를 직접 입력할 수 있습니다.
            정확한 모델 ID를 입력해주세요.
          </n-alert>

          <n-form :model="manualForm" :rules="manualRules" ref="manualFormRef">
            <n-form-item label="모델 ID" path="modelId">
              <n-input
                v-model:value="manualForm.modelId"
                placeholder="예: openai/gpt-4o, anthropic/claude-3.5-sonnet"
              />
            </n-form-item>

            <n-form-item label="표시 이름" path="displayName">
              <n-input
                v-model:value="manualForm.displayName"
                placeholder="예: GPT-4O, Claude 3.5 Sonnet (선택사항)"
              />
            </n-form-item>

            <n-form-item>
              <n-button 
                type="primary" 
                @click="handleManualSubmit"
                :loading="validatingManual"
              >
                {{ validatingManual ? '검증 중...' : '추가' }}
              </n-button>
            </n-form-item>
          </n-form>
        </n-space>
      </n-tab-pane>
    </n-tabs>

    <n-divider />

    <n-space justify="end">
      <n-button @click="$emit('cancel')">취소</n-button>
    </n-space>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import {
  NTabs,
  NTabPane,
  NInput,
  NIcon,
  NSpace,
  NScrollbar,
  NList,
  NListItem,
  NButton,
  NText,
  NTag,
  NSpin,
  NAlert,
  NForm,
  NFormItem,
  NDivider,
  useMessage,
  type FormInst,
  type FormRules
} from 'naive-ui'
import { SearchOutline, RefreshOutline } from '@vicons/ionicons5'
import type { AIModelConfig } from '@/types'
import { POPULAR_MODELS, DEFAULT_MODEL_PARAMETERS } from '@/types'
import { LocalStorageManager, OpenRouterAPI, generateId } from '@/utils'

interface Emits {
  (e: 'select', model: AIModelConfig): void
  (e: 'cancel'): void
}

const emit = defineEmits<Emits>()
const message = useMessage()

const manualFormRef = ref<FormInst>()
const popularSearchQuery = ref('')
const availableSearchQuery = ref('')
const loadingAvailable = ref(false)
const validatingManual = ref(false)
const availableModels = ref<Array<{ id: string; name?: string; pricing?: any }>>([])

const manualForm = reactive({
  modelId: '',
  displayName: ''
})

const manualRules: FormRules = {
  modelId: [
    {
      required: true,
      message: '모델 ID를 입력해주세요',
      trigger: 'blur'
    },
    {
      pattern: /^[a-zA-Z0-9\-_/]+$/,
      message: '유효하지 않은 모델 ID 형식입니다',
      trigger: 'blur'
    }
  ]
}

// Computed
const filteredPopularModels = computed(() => {
  if (!popularSearchQuery.value) return POPULAR_MODELS

  const query = popularSearchQuery.value.toLowerCase()
  return POPULAR_MODELS.filter(model => 
    model.name.toLowerCase().includes(query) ||
    model.id.toLowerCase().includes(query) ||
    model.provider.toLowerCase().includes(query)
  )
})

const filteredAvailableModels = computed(() => {
  if (!availableSearchQuery.value) return availableModels.value

  const query = availableSearchQuery.value.toLowerCase()
  return availableModels.value.filter(model => 
    model.id.toLowerCase().includes(query) ||
    (model.name && model.name.toLowerCase().includes(query))
  )
})

// Methods
const selectModel = (modelId: string, displayName: string) => {
  const modelConfig: AIModelConfig = {
    id: generateId(),
    modelName: modelId,
    displayName: displayName || modelId,
    parameters: { ...DEFAULT_MODEL_PARAMETERS }
  }
  
  emit('select', modelConfig)
}

const loadAvailableModels = async () => {
  const apiKey = LocalStorageManager.getApiKey()
  if (!apiKey) {
    message.warning('API 키가 설정되지 않았습니다.')
    return
  }

  loadingAvailable.value = true
  try {
    const api = new OpenRouterAPI(apiKey)
    const models = await api.getAvailableModels()
    availableModels.value = models.slice(0, 100) // 처음 100개만 표시
  } catch (error) {
    console.error('Failed to load available models:', error)
    message.error('모델 목록을 불러오는데 실패했습니다.')
  } finally {
    loadingAvailable.value = false
  }
}

const handleManualSubmit = async () => {
  if (!manualFormRef.value) return

  try {
    await manualFormRef.value.validate()

    validatingManual.value = true

    // API 키로 모델 유효성 간단 검증 (선택사항)
    const apiKey = LocalStorageManager.getApiKey()
    if (apiKey) {
      try {
        const api = new OpenRouterAPI(apiKey)
        // 간단한 테스트 요청으로 모델 유효성 확인
        await api.chatCompletion({
          model: manualForm.modelId,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1
        })
      } catch (error) {
        message.warning('모델 ID가 유효하지 않을 수 있습니다. 그래도 추가하시겠습니까?')
      }
    }

    const displayName = manualForm.displayName || manualForm.modelId
    selectModel(manualForm.modelId, displayName)

    // 폼 리셋
    manualForm.modelId = ''
    manualForm.displayName = ''
    if (manualFormRef.value) {
      manualFormRef.value.restoreValidation()
    }

  } catch (error) {
    console.error('Manual model validation failed:', error)
  } finally {
    validatingManual.value = false
  }
}

// Lifecycle
onMounted(() => {
  // 컴포넌트 마운트 시 사용 가능한 모델 목록 자동 로드 (선택사항)
  // loadAvailableModels()
})
</script>

<style scoped>
.model-selector {
  .model-item {
    cursor: pointer;
    transition: background-color 0.2s;
    border-radius: 6px;
    padding: 8px;

    &:hover {
      background-color: var(--hover-color);
    }

    .model-name {
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 2px;
    }

    .model-provider {
      font-size: 12px;
      color: var(--text-color-2);
      margin-bottom: 2px;
    }

    .model-pricing {
      margin-top: 4px;
    }
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px;
    color: var(--text-color-2);
  }
}
</style>
