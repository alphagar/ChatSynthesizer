<template>
  <div class="message-input">
    <!-- 파일 업로드 영역 -->
    <div v-if="files.length > 0" class="uploaded-files">
      <n-space :size="8">
        <div
          v-for="(file, index) in files"
          :key="file.id"
          class="file-item"
        >
          <n-tag closable @close="removeFile(index)">
            <template #icon>
              <n-icon>
                <document-outline v-if="!file.type.startsWith('image/')" />
                <image-outline v-else />
              </n-icon>
            </template>
            {{ file.name }}
          </n-tag>
        </div>
      </n-space>
    </div>

    <!-- 입력 영역 -->
    <div class="input-container">
      <div class="input-wrapper">
        <!-- 파일 업로드 버튼 -->
        <n-button
          text
          @click="triggerFileInput"
          :disabled="disabled"
          title="파일 첨부"
        >
          <template #icon>
            <n-icon><attach-outline /></n-icon>
          </template>
        </n-button>

        <!-- 텍스트 입력 -->
        <n-input
          v-model:value="localMessage"
          type="textarea"
          :placeholder="placeholder"
          :disabled="disabled"
          :autosize="{ minRows: 1, maxRows: 8 }"
          @keydown="handleKeyDown"
          style="flex: 1;"
        />

        <!-- 전송/정지 버튼 -->
        <n-button
          v-if="showStop"
          @click="$emit('stop')"
          type="error"
          title="생성 중지"
        >
          <template #icon>
            <n-icon><stop-outline /></n-icon>
          </template>
        </n-button>
        
        <n-button
          v-else
          @click="handleSend"
          type="primary"
          :disabled="disabled || !canSend"
          title="메시지 전송 (Ctrl+Enter)"
        >
          <template #icon>
            <n-icon><send-outline /></n-icon>
          </template>
        </n-button>
      </div>
    </div>

    <!-- 숨겨진 파일 입력 -->
    <input
      ref="fileInputRef"
      type="file"
      multiple
      accept="image/*,.pdf,.txt,.md,.doc,.docx"
      @change="handleFileSelect"
      style="display: none;"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  NInput,
  NButton,
  NIcon,
  NSpace,
  NTag,
  useMessage
} from 'naive-ui'
import {
  AttachOutline,
  SendOutline,
  StopOutline,
  DocumentOutline,
  ImageOutline
} from '@vicons/ionicons5'
import type { UploadedFile } from '@/types'
import { generateId, readFileAsBase64, formatFileSize } from '@/utils'

interface Props {
  message: string
  files: UploadedFile[]
  disabled?: boolean
  placeholder?: string
  showStop?: boolean
}

interface Emits {
  (e: 'update:message', value: string): void
  (e: 'update:files', value: UploadedFile[]): void
  (e: 'send', message: string, files: UploadedFile[]): void
  (e: 'stop'): void
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  placeholder: '메시지를 입력하세요... (Ctrl+Enter로 전송)',
  showStop: false
})

const emit = defineEmits<Emits>()
const message = useMessage()

const fileInputRef = ref<HTMLInputElement>()

// v-model을 위한 로컬 상태
const localMessage = computed({
  get: () => props.message,
  set: (value: string) => emit('update:message', value)
})

// Computed
const canSend = computed(() => {
  return props.message.trim().length > 0 || props.files.length > 0
})

// Methods
const handleSend = () => {
  if (!canSend.value) return
  
  emit('send', props.message, props.files)
  emit('update:message', '')
  emit('update:files', [])
}

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    handleSend()
  }
}

const triggerFileInput = () => {
  if (fileInputRef.value) {
    fileInputRef.value.click()
  }
}

const handleFileSelect = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const files = input.files
  if (!files) return

  const maxFileSize = 10 * 1024 * 1024 // 10MB
  const maxFiles = 5

  if (props.files.length + files.length > maxFiles) {
    message.warning(`최대 ${maxFiles}개 파일까지만 업로드할 수 있습니다.`)
    return
  }

  const newFiles: UploadedFile[] = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]

    if (file.size > maxFileSize) {
      message.warning(`${file.name} 파일이 너무 큽니다. (최대 10MB)`)
      continue
    }

    try {
      const base64Data = await readFileAsBase64(file)
      const uploadedFile: UploadedFile = {
        id: generateId(),
        name: file.name,
        type: file.type,
        size: file.size,
        data: base64Data
      }

      newFiles.push(uploadedFile)
    } catch (error) {
      console.error('File reading error:', error)
      message.error(`${file.name} 파일을 읽는데 실패했습니다.`)
    }
  }

  if (newFiles.length > 0) {
    emit('update:files', [...props.files, ...newFiles])
    message.success(`${newFiles.length}개 파일이 추가되었습니다.`)
  }

  // 입력 초기화
  input.value = ''
}

const removeFile = (index: number) => {
  const newFiles = [...props.files]
  newFiles.splice(index, 1)
  emit('update:files', newFiles)
}
</script>

<style scoped>
.message-input {
  .uploaded-files {
    margin-bottom: 12px;
    padding: 12px;
    background: var(--input-color);
    border-radius: 8px;
    border: 1px dashed var(--border-color);

    .file-item {
      display: inline-block;
    }
  }

  .input-container {
    .input-wrapper {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      padding: 16px;
      background: var(--card-color);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      transition: border-color 0.3s ease;

      &:focus-within {
        border-color: var(--primary-color);
        box-shadow: 0 0 0 2px var(--primary-color-hover);
      }

      :deep(.n-input) {
        .n-input__border,
        .n-input__state-border {
          border: none !important;
        }

        .n-input-wrapper {
          padding: 0;
        }

        .n-input__textarea {
          resize: none;
        }
      }
    }
  }
}
</style>
