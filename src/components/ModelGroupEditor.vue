<template>
  <div class="model-group-editor">
    <n-form :model="form" :rules="rules" ref="formRef">
      <n-tabs type="line" animated>
        <!-- 기본 정보 탭 -->
        <n-tab-pane name="basic" tab="기본 정보">
          <n-space direction="vertical" :size="24">
            <n-form-item label="그룹 이름" path="title">
              <n-input
                v-model:value="form.title"
                placeholder="AI 모델 그룹의 이름을 입력하세요"
              />
            </n-form-item>
          </n-space>
        </n-tab-pane>

        <!-- 모델 설정 탭 -->
        <n-tab-pane name="models" tab="AI 모델">
          <n-space direction="vertical" :size="24">
            <div>
              <n-space justify="space-between" align="center" style="margin-bottom: 16px;">
                <h3>포함될 AI 모델 ({{ form.models.length }}개)</h3>
                <n-button type="primary" @click="showAddModelModal = true">
                  <template #icon>
                    <n-icon><add-outline /></n-icon>
                  </template>
                  모델 추가
                </n-button>
              </n-space>

              <!-- 모델 목록 -->
              <div v-if="form.models.length === 0" class="empty-models">
                <n-empty description="추가된 모델이 없습니다">
                  <template #extra>
                    <n-button type="primary" @click="showAddModelModal = true">
                      첫 번째 모델 추가하기
                    </n-button>
                  </template>
                </n-empty>
              </div>

              <n-list v-else>
                <n-list-item v-for="(model, index) in form.models" :key="model.id">
                  <ModelConfigItem
                    :model="model"
                    @update="updateModel(index, $event)"
                    @delete="removeModel(index)"
                  />
                </n-list-item>
              </n-list>
            </div>
          </n-space>
        </n-tab-pane>

        <!-- 싱크로나이저 탭 -->
        <n-tab-pane name="synthesizer" tab="싱크로나이저">
          <n-space direction="vertical" :size="24">
            <n-form-item label="싱크로나이저 모델" path="synthesizer.model">
              <n-select
                v-model:value="form.synthesizer.model"
                :options="synthesizerModelOptions"
                placeholder="싱크로나이저로 사용할 모델을 선택하세요"
                filterable
              />
            </n-form-item>

            <n-form-item label="통합 모드" path="synthesizer.mode">
              <n-radio-group v-model:value="form.synthesizer.mode">
                <n-space direction="vertical" :size="16">
                  <n-radio value="union">
                    <div>
                      <strong>합집합 모드</strong>
                      <div class="mode-description">
                        AI 모델들이 반환한 정보에서 중복된 내용만 제거하여 하나의 메시지로 병합
                      </div>
                    </div>
                  </n-radio>
                  
                  <n-radio value="intersection">
                    <div>
                      <strong>교집합 모드</strong>
                      <div class="mode-description">
                        AI 모델들이 공통으로 언급하는 내용만 추출하여 하나의 메시지로 병합
                      </div>
                    </div>
                  </n-radio>
                  
                  <n-radio value="selective">
                    <div>
                      <strong>선별 모드</strong>
                      <div class="mode-description">
                        AI 모델들이 반환한 정보에서 가치가 높은 정보만 선별하여 하나의 메시지로 반환
                      </div>
                    </div>
                  </n-radio>
                </n-space>
              </n-radio-group>
            </n-form-item>

            <!-- 교집합 모드 추가 설정 -->
            <n-form-item 
              v-if="form.synthesizer.mode === 'intersection'"
              label="최소 언급 횟수"
              path="synthesizer.intersectionThreshold"
            >
              <n-input-number
                v-model:value="form.synthesizer.intersectionThreshold"
                :min="2"
                :max="form.models.length"
                style="width: 200px;"
              />
              <template #suffix>
                <span class="input-suffix">
                  / {{ form.models.length }}개 모델
                </span>
              </template>
            </n-form-item>
          </n-space>
        </n-tab-pane>
      </n-tabs>
    </n-form>

    <!-- 액션 버튼 -->
    <n-divider />
    <n-space justify="end">
      <n-button @click="handleCancel">취소</n-button>
      <n-button type="primary" @click="handleSave" :loading="isSaving">
        {{ isEditing ? '수정' : '생성' }}
      </n-button>
    </n-space>

    <!-- 모델 추가 모달 -->
    <n-modal v-model:show="showAddModelModal" preset="card" title="AI 모델 추가" style="width: 600px;">
      <ModelSelector @select="handleAddModel" @cancel="showAddModelModal = false" />
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import {
  NForm,
  NFormItem,
  NInput,
  NButton,
  NSpace,
  NTabs,
  NTabPane,
  NIcon,
  NSelect,
  NRadioGroup,
  NRadio,
  NInputNumber,
  NDivider,
  NModal,
  NList,
  NListItem,
  NEmpty,
  useMessage,
  type FormInst,
  type FormRules,
  type SelectOption
} from 'naive-ui'
import { AddOutline } from '@vicons/ionicons5'
import type { AIModelGroup, AIModelConfig } from '@/types'
import { POPULAR_MODELS, DEFAULT_MODEL_PARAMETERS } from '@/types'
import { generateId, LocalStorageManager, OpenRouterAPI } from '@/utils'
import ModelConfigItem from './ModelConfigItem.vue'
import ModelSelector from './ModelSelector.vue'

interface Props {
  group?: AIModelGroup | null
}

interface Emits {
  (e: 'save', group: AIModelGroup): void
  (e: 'cancel'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const message = useMessage()

const formRef = ref<FormInst>()
const isSaving = ref(false)
const showAddModelModal = ref(false)

const form = reactive({
  id: '',
  title: '',
  models: [] as AIModelConfig[],
  synthesizer: {
    model: 'openai/gpt-4o',
    mode: 'union' as 'union' | 'intersection' | 'selective',
    intersectionThreshold: 2
  }
})

const rules: FormRules = {
  title: [
    {
      required: true,
      message: '그룹 이름을 입력해주세요',
      trigger: 'blur'
    },
    {
      min: 2,
      message: '그룹 이름은 최소 2자 이상이어야 합니다',
      trigger: 'blur'
    }
  ],
  'synthesizer.model': [
    {
      required: true,
      message: '싱크로나이저 모델을 선택해주세요',
      trigger: 'change'
    }
  ]
}

// Computed
const isEditing = computed(() => !!props.group)

const synthesizerModelOptions = computed<SelectOption[]>(() => {
  return POPULAR_MODELS.map(model => ({
    label: `${model.name} (${model.provider})`,
    value: model.id
  }))
})

// Methods
const initializeForm = () => {
  if (props.group) {
    form.id = props.group.id
    form.title = props.group.title
    form.models = [...props.group.models]
    form.synthesizer = { 
      ...props.group.synthesizer,
      intersectionThreshold: props.group.synthesizer.intersectionThreshold ?? 2
    }
  } else {
    form.id = generateId()
    form.title = ''
    form.models = []
    form.synthesizer = {
      model: 'openai/gpt-4o',
      mode: 'union',
      intersectionThreshold: 2
    }
  }
}

const handleAddModel = (modelConfig: AIModelConfig) => {
  // 중복 확인
  const exists = form.models.some(m => m.modelName === modelConfig.modelName)
  if (exists) {
    message.error('이미 추가된 모델입니다.')
    return
  }

  form.models.push({
    ...modelConfig,
    id: generateId()
  })
  showAddModelModal.value = false
  message.success('모델이 추가되었습니다.')
}

const updateModel = (index: number, updatedModel: AIModelConfig) => {
  form.models[index] = updatedModel
}

const removeModel = (index: number) => {
  form.models.splice(index, 1)
  message.info('모델이 제거되었습니다.')
}

const handleSave = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()

    if (form.models.length === 0) {
      message.error('최소 1개 이상의 AI 모델을 추가해야 합니다.')
      return
    }

    // 타이틀 중복 확인
    if (LocalStorageManager.isModelGroupTitleDuplicate(form.title, form.id)) {
      message.error('이미 존재하는 그룹 이름입니다.')
      return
    }

    isSaving.value = true

    const now = new Date()
    const group: AIModelGroup = {
      id: form.id,
      title: form.title,
      models: form.models,
      synthesizer: form.synthesizer,
      createdAt: props.group?.createdAt || now,
      updatedAt: now
    }

    emit('save', group)
  } catch (error) {
    console.error('Form validation failed:', error)
  } finally {
    isSaving.value = false
  }
}

const handleCancel = () => {
  emit('cancel')
}

// Watch for threshold adjustment when models change
watch(
  () => form.models.length,
  (newLength) => {
    if (form.synthesizer.mode === 'intersection') {
      const currentThreshold = form.synthesizer.intersectionThreshold || 2
      if (currentThreshold > newLength) {
        form.synthesizer.intersectionThreshold = Math.max(2, newLength)
      }
    }
  }
)

// Lifecycle
onMounted(() => {
  initializeForm()
})
</script>

<style scoped>
.model-group-editor {
  .mode-description {
    font-size: 12px;
    color: var(--text-color-3);
    margin-top: 4px;
    line-height: 1.4;
  }

  .input-suffix {
    color: var(--text-color-3);
    font-size: 12px;
    margin-left: 8px;
  }

  .empty-models {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 200px;
    border: 2px dashed var(--border-color);
    border-radius: 8px;
  }

  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }
}
</style>
