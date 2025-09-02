<template>
  <n-card title="OpenRouter API 키 설정" style="max-width: 500px; margin: 0 auto;">
    <div class="api-key-manager">
      <n-alert
        v-if="!hasApiKey && !showApiKeyInput"
        title="API 키가 필요합니다"
        type="warning"
        style="margin-bottom: 16px;"
      >
        ChatSynthesizer를 사용하려면 OpenRouter API 키가 필요합니다.
        <br>
        <n-button 
          text 
          type="primary" 
          @click="showApiKeyInput = true"
          style="margin-top: 8px;"
        >
          API 키 입력하기
        </n-button>
      </n-alert>

      <div v-if="hasApiKey && !showApiKeyInput" class="setup-complete">
        <n-alert
          title="✨ API 키 설정 완료"
          type="success"
          style="margin-bottom: 24px;"
        >
          OpenRouter API 키가 성공적으로 설정되었습니다!
        </n-alert>

        <n-steps :current="hasModelGroups ? 2 : 1" size="small" style="margin-bottom: 24px;">
          <n-step title="API 키 설정" description="완료" />
          <n-step 
            :title="hasModelGroups ? '모델 그룹 설정' : '모델 그룹 설정'" 
            :description="hasModelGroups ? '완료' : '설정 필요'" 
          />
          <n-step title="채팅 시작" :description="hasModelGroups ? '준비됨' : '대기 중'" />
        </n-steps>

        <n-alert
          :title="nextStepText"
          :type="hasModelGroups ? 'info' : 'warning'"
          style="margin-bottom: 24px;"
        >
          <template v-if="!hasModelGroups">
            ChatSynthesizer는 여러 AI 모델의 응답을 비교하고 통합합니다.<br>
            먼저 사용할 AI 모델들을 그룹으로 설정해주세요.
          </template>
          <template v-else>
            설정이 완료되었습니다! 이제 AI와 대화를 시작할 수 있습니다.
          </template>
        </n-alert>

        <n-space justify="center" style="margin-bottom: 24px;">
          <n-button 
            type="primary" 
            size="large"
            @click="handleNextStep"
          >
            {{ nextStepButtonText }}
          </n-button>
        </n-space>

        <n-divider />
        
        <n-space justify="center" size="small">
          <n-button 
            text 
            size="small"
            type="primary" 
            @click="showApiKeyInput = true"
          >
            API 키 변경
          </n-button>
          <n-button 
            text 
            size="small"
            type="error" 
            @click="handleDeleteApiKey"
          >
            API 키 삭제
          </n-button>
        </n-space>
      </div>

      <div v-if="showApiKeyInput" class="api-key-input-section">
        <n-form :model="form" :rules="rules" ref="formRef">
          <n-form-item label="OpenRouter API 키" path="apiKey">
            <n-input
              v-model:value="form.apiKey"
              type="password"
              show-password-on="click"
              placeholder="sk-or-v1-..."
              :disabled="isValidating"
            />
          </n-form-item>
          
          <n-form-item>
            <n-space>
              <n-button
                type="primary"
                :loading="isValidating"
                @click="handleSaveApiKey"
              >
                {{ isValidating ? '검증 중...' : '저장' }}
              </n-button>
              <n-button
                @click="handleCancel"
                :disabled="isValidating"
              >
                취소
              </n-button>
            </n-space>
          </n-form-item>
        </n-form>
      </div>

      <n-divider />

      <div class="help-section">
        <h4>OpenRouter API 키 획득 방법:</h4>
        <ol>
          <li>
            <n-button 
              text 
              type="primary" 
              tag="a" 
              href="https://openrouter.ai/" 
              target="_blank"
            >
              OpenRouter 웹사이트
            </n-button>
            방문
          </li>
          <li>계정 생성 및 로그인</li>
          <li>대시보드에서 "API Keys" 메뉴 선택</li>
          <li>"Create Key" 버튼을 클릭하여 새 API 키 생성</li>
          <li>생성된 키를 복사하여 위 입력란에 붙여넣기</li>
        </ol>
      </div>
    </div>
  </n-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { 
  NCard, 
  NAlert, 
  NButton, 
  NForm, 
  NFormItem, 
  NInput, 
  NSpace, 
  NDivider,
  NSteps,
  NStep,
  useMessage,
  type FormInst,
  type FormRules
} from 'naive-ui'
import { LocalStorageManager, OpenRouterAPI } from '@/utils'

const message = useMessage()
const router = useRouter()
const formRef = ref<FormInst>()

// Emit events
const emit = defineEmits<{
  'api-key-updated': []
}>()

const form = ref({
  apiKey: ''
})

const rules: FormRules = {
  apiKey: [
    {
      required: true,
      message: 'API 키를 입력해주세요',
      trigger: 'blur'
    },
    {
      min: 10,
      message: 'API 키가 너무 짧습니다',
      trigger: 'blur'
    }
  ]
}

const hasApiKey = ref(false)
const showApiKeyInput = ref(false)
const isValidating = ref(false)

// Computed
const apiKeyExists = computed(() => {
  return LocalStorageManager.getApiKey() !== null
})

const hasModelGroups = computed(() => {
  return LocalStorageManager.getModelGroups().length > 0
})

const nextStepText = computed(() => {
  if (hasModelGroups.value) {
    return '이제 채팅을 시작할 수 있습니다!'
  } else {
    return 'AI 모델 그룹을 설정해야 채팅을 시작할 수 있습니다.'
  }
})

const nextStepButtonText = computed(() => {
  if (hasModelGroups.value) {
    return '채팅 시작하기'
  } else {
    return '모델 그룹 설정하기'
  }
})

// Methods
const checkApiKeyExists = () => {
  hasApiKey.value = apiKeyExists.value
  if (!hasApiKey.value) {
    showApiKeyInput.value = true
  }
}

const handleSaveApiKey = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    isValidating.value = true

    // API 키 유효성 검증
    const api = new OpenRouterAPI(form.value.apiKey)
    const isValid = await api.validateApiKey()

    if (!isValid) {
      message.error('유효하지 않은 API 키입니다. 다시 확인해주세요.')
      return
    }

    // API 키 저장
    LocalStorageManager.saveApiKey(form.value.apiKey)
    hasApiKey.value = true
    showApiKeyInput.value = false
    form.value.apiKey = ''

    message.success('API 키가 성공적으로 저장되었습니다!')
    
    // 부모 컴포넌트에 API 키 업데이트 알림
    emit('api-key-updated')
    
  } catch (error) {
    console.error('API key validation error:', error)
    message.error('API 키 검증 중 오류가 발생했습니다.')
  } finally {
    isValidating.value = false
  }
}

const handleCancel = () => {
  showApiKeyInput.value = hasApiKey.value
  form.value.apiKey = ''
  if (formRef.value) {
    formRef.value.restoreValidation()
  }
}

const handleDeleteApiKey = () => {
  LocalStorageManager.clearApiKey()
  hasApiKey.value = false
  showApiKeyInput.value = true
  message.info('API 키가 삭제되었습니다.')
}

const handleNextStep = () => {
  if (hasModelGroups.value) {
    // 모델 그룹이 있으면 채팅 페이지로 이동
    router.push('/')
  } else {
    // 모델 그룹이 없으면 그룹 관리 페이지로 이동
    router.push('/groups')
  }
}

// Lifecycle
onMounted(() => {
  checkApiKeyExists()
})

// Expose methods for parent components
defineExpose({
  checkApiKeyExists,
  hasApiKey: computed(() => hasApiKey.value)
})
</script>

<style scoped>
.api-key-manager {
  .api-key-input-section {
    margin-bottom: 24px;
  }

  .setup-complete {
    text-align: center;
  }

  .help-section {
    h4 {
      margin-bottom: 12px;
      color: var(--text-color-1);
    }

    ol {
      padding-left: 20px;
      line-height: 1.8;
      
      li {
        margin-bottom: 4px;
      }
    }
  }
}
</style>
