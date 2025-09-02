<template>
  <div class="chat-page">
    <n-layout has-sider>
      <!-- 사이드바 -->
      <n-layout-sider
        bordered
        collapse-mode="width"
        :collapsed-width="64"
        :width="280"
        show-trigger
        v-model:collapsed="sidebarCollapsed"
      >
        <div class="sidebar-content">
          <!-- 모델 그룹 선택 -->
          <div class="group-selector">
            <n-select
              v-model:value="selectedGroupId"
              :options="modelGroupOptions"
              placeholder="AI 모델 그룹 선택"
              :disabled="isGenerating"
              @update:value="handleGroupChange"
            />
          </div>

          <!-- 세션 목록 -->
          <div class="session-list">
            <n-space justify="space-between" align="center" style="margin-bottom: 12px;">
              <h4 v-if="!sidebarCollapsed">채팅 세션</h4>
              <n-button 
                @click="createNewSession" 
                size="small" 
                type="primary"
                :disabled="!selectedGroupId"
              >
                <template #icon>
                  <n-icon><add-outline /></n-icon>
                </template>
                <span v-if="!sidebarCollapsed">새 채팅</span>
              </n-button>
            </n-space>

            <n-scrollbar style="max-height: calc(100vh - 200px);">
              <n-list v-if="chatSessions.length > 0">
                <n-list-item
                  v-for="session in chatSessions"
                  :key="session.id"
                  class="session-item"
                  :class="{ active: currentSessionId === session.id }"
                  @click="loadSession(session.id)"
                >
                  <div class="session-info">
                    <div class="session-title">{{ session.title }}</div>
                    <div class="session-meta">
                      {{ formatDate(session.updatedAt) }}
                    </div>
                  </div>
                </n-list-item>
              </n-list>
              
              <div v-else class="empty-sessions">
                <n-text depth="3" style="font-size: 12px;">
                  채팅 세션이 없습니다
                </n-text>
              </div>
            </n-scrollbar>
          </div>
        </div>
      </n-layout-sider>

      <!-- 메인 채팅 영역 -->
      <n-layout-content>
        <div class="chat-content">
          <!-- API 키 설정 안내 -->
          <div v-if="!hasApiKey" class="setup-required">
            <n-result status="info" title="설정이 필요합니다">
              <template #footer>
                <ApiKeyManager />
              </template>
            </n-result>
          </div>

          <!-- 모델 그룹 선택 안내 -->
          <div v-else-if="!selectedGroupId" class="group-required">
            <n-result status="info" title="AI 모델 그룹을 선택해주세요">
              <template #footer>
                <n-space>
                  <n-button type="primary" @click="$router.push('/groups')">
                    그룹 관리하기
                  </n-button>
                </n-space>
              </template>
            </n-result>
          </div>

          <!-- 채팅 인터페이스 -->
          <div v-else class="chat-interface">
            <!-- 메시지 목록 -->
            <div class="messages-container" ref="messagesContainer">
              <n-scrollbar>
                <div class="messages-list">
                  <ChatMessage
                    v-for="message in currentMessages"
                    :key="message.id"
                    :message="message"
                    :show-model-responses="showModelResponses"
                    @toggle-responses="showModelResponses = !showModelResponses"
                  />
                  
                  <!-- 로딩 중 메시지들 -->
                  <div v-if="isGenerating" class="generating-messages">
                    <div class="user-message">
                      <n-card embedded>
                        {{ pendingUserMessage }}
                      </n-card>
                    </div>
                    
                    <ModelResponsesDisplay
                      :responses="streamingResponses"
                      :is-generating="isGenerating"
                    />
                  </div>
                </div>
              </n-scrollbar>
            </div>

            <!-- 입력 영역 -->
            <div class="input-area">
              <MessageInput
                v-model:message="inputMessage"
                v-model:files="uploadedFiles"
                :disabled="isGenerating"
                @send="handleSendMessage"
                @stop="handleStopGeneration"
                :show-stop="isGenerating"
              />
            </div>
          </div>
        </div>
      </n-layout-content>
    </n-layout>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import {
  NLayout,
  NLayoutSider,
  NLayoutContent,
  NSelect,
  NButton,
  NIcon,
  NSpace,
  NList,
  NListItem,
  NText,
  NScrollbar,
  NResult,
  NCard,
  useMessage,
  type SelectOption
} from 'naive-ui'
import { AddOutline } from '@vicons/ionicons5'
import type { 
  AIModelGroup, 
  ChatSession, 
  ChatMessage as ChatMessageType, 
  ModelResponse,
  UploadedFile 
} from '@/types'
import { 
  LocalStorageManager, 
  OpenRouterAPI, 
  Synthesizer,
  generateId,
  formatDate 
} from '@/utils'
import ApiKeyManager from '@/components/ApiKeyManager.vue'
import ChatMessage from '@/components/ChatMessage.vue'
import MessageInput from '@/components/MessageInput.vue'
import ModelResponsesDisplay from '@/components/ModelResponsesDisplay.vue'

const message = useMessage()

// Reactive state
const sidebarCollapsed = ref(false)
const selectedGroupId = ref<string | null>(null)
const currentSessionId = ref<string | null>(null)
const chatSessions = ref<ChatSession[]>([])
const currentMessages = ref<ChatMessageType[]>([])
const inputMessage = ref('')
const uploadedFiles = ref<UploadedFile[]>([])
const isGenerating = ref(false)
const showModelResponses = ref(false)
const messagesContainer = ref<HTMLElement>()

// Streaming state
const streamingResponses = ref<ModelResponse[]>([])
const pendingUserMessage = ref('')
const abortControllers = ref<AbortController[]>([])

// Computed
const hasApiKey = computed(() => !!LocalStorageManager.getApiKey())

const modelGroups = computed(() => LocalStorageManager.getModelGroups())

const modelGroupOptions = computed<SelectOption[]>(() => 
  modelGroups.value.map(group => ({
    label: group.title,
    value: group.id
  }))
)

const selectedGroup = computed(() => 
  modelGroups.value.find(g => g.id === selectedGroupId.value) || null
)

// Methods
const loadChatSessions = () => {
  if (!selectedGroupId.value) {
    chatSessions.value = []
    return
  }

  const allSessions = LocalStorageManager.getChatSessions()
  chatSessions.value = allSessions
    .filter(session => session.modelGroupId === selectedGroupId.value)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
}

const handleGroupChange = (groupId: string | null) => {
  selectedGroupId.value = groupId
  currentSessionId.value = null
  currentMessages.value = []
  loadChatSessions()
}

const createNewSession = () => {
  if (!selectedGroupId.value) return

  const session: ChatSession = {
    id: generateId(),
    title: `새 채팅 ${new Date().toLocaleString()}`,
    modelGroupId: selectedGroupId.value,
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date()
  }

  LocalStorageManager.saveChatSession(session)
  loadChatSessions()
  loadSession(session.id)
}

const loadSession = (sessionId: string) => {
  const session = LocalStorageManager.getChatSession(sessionId)
  if (!session) return

  currentSessionId.value = sessionId
  currentMessages.value = [...session.messages]
  scrollToBottom()
}

const handleSendMessage = async (content: string, files: UploadedFile[]) => {
  if (!selectedGroup.value || !hasApiKey.value) return

  // 현재 세션이 없으면 새로 생성
  if (!currentSessionId.value) {
    createNewSession()
    await nextTick()
  }

  isGenerating.value = true
  pendingUserMessage.value = content
  uploadedFiles.value = []
  
  // 스트리밍 응답 초기화
  streamingResponses.value = selectedGroup.value.models.map(model => ({
    modelId: model.id,
    modelName: model.displayName,
    content: '',
    isCompleted: false,
    timestamp: new Date()
  }))

  try {
    const apiKey = LocalStorageManager.getApiKey()!
    const api = new OpenRouterAPI(apiKey)

    // 사용자 메시지 생성
    const userMessage = await api.createMessageWithFiles(content, files)

    // 각 모델에 대해 병렬로 요청 시작
    const promises = selectedGroup.value.models.map(async (model, index) => {
      const controller = new AbortController()
      abortControllers.value.push(controller)

      try {
        const request = {
          model: model.modelName,
          messages: buildConversationHistory(userMessage),
          ...model.parameters,
          stream: true
        }

        const stream = api.streamChatCompletion(request)
        
        for await (const chunk of stream) {
          if (controller.signal.aborted) break

          const content = chunk.choices[0]?.delta?.content || ''
          if (content) {
            streamingResponses.value[index].content += content
          }

          if (chunk.choices[0]?.finish_reason) {
            streamingResponses.value[index].isCompleted = true
          }
          
          // 자동 스크롤
          await nextTick()
          scrollToBottom()
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error(`Model ${model.displayName} failed:`, error)
          streamingResponses.value[index].content = `[오류: ${error}]`
          streamingResponses.value[index].isCompleted = true
        }
      }
    })

    // 모든 모델 완료 대기
    await Promise.all(promises)

    // 싱크로나이저로 최종 통합
    const synthesizer = new Synthesizer(apiKey)
    const synthesizedContent = await synthesizer.synthesize(
      streamingResponses.value,
      selectedGroup.value.synthesizer,
      content
    )

    // 메시지 저장
    await saveConversation(content, synthesizedContent, files)

  } catch (error) {
    console.error('Generation failed:', error)
    message.error('메시지 생성에 실패했습니다.')
  } finally {
    isGenerating.value = false
    pendingUserMessage.value = ''
    streamingResponses.value = []
    abortControllers.value = []
  }
}

const handleStopGeneration = () => {
  abortControllers.value.forEach(controller => controller.abort())
  isGenerating.value = false
  pendingUserMessage.value = ''
  streamingResponses.value = []
  abortControllers.value = []
}

const buildConversationHistory = (userMessage: any) => {
  const messages = []
  
  // 시스템 메시지 (선택사항)
  messages.push({
    role: 'system' as const,
    content: '당신은 도움이 되는 AI 어시스턴트입니다. 한국어로 응답해주세요.'
  })

  // 이전 대화 내역 추가 (두 번째 메시지부터는 synthesizer 결과만)
  let isFirstMessage = true
  for (const msg of currentMessages.value) {
    if (msg.role === 'user') {
      messages.push({
        role: 'user' as const,
        content: msg.content
      })
      isFirstMessage = false
    } else if (msg.role === 'assistant' && !isFirstMessage) {
      // 두 번째 메시지부터는 synthesizer 결과만 사용
      messages.push({
        role: 'assistant' as const,
        content: msg.content
      })
    }
  }

  // 현재 사용자 메시지
  messages.push(userMessage)

  return messages
}

const saveConversation = async (userContent: string, assistantContent: string, files: UploadedFile[]) => {
  if (!currentSessionId.value) return

  const userMessage: ChatMessageType = {
    id: generateId(),
    role: 'user',
    content: userContent,
    timestamp: new Date(),
    modelResponses: [...streamingResponses.value]
  }

  const assistantMessage: ChatMessageType = {
    id: generateId(),
    role: 'assistant', 
    content: assistantContent,
    timestamp: new Date(),
    synthesizedFrom: selectedGroup.value?.models.map(m => m.displayName)
  }

  currentMessages.value.push(userMessage, assistantMessage)

  // 세션 저장
  const session = LocalStorageManager.getChatSession(currentSessionId.value)
  if (session) {
    session.messages = [...currentMessages.value]
    session.title = userContent.length > 30 ? userContent.slice(0, 30) + '...' : userContent
    session.updatedAt = new Date()
    LocalStorageManager.saveChatSession(session)
  }

  loadChatSessions()
  scrollToBottom()
}

const scrollToBottom = () => {
  if (messagesContainer.value) {
    const scrollContainer = messagesContainer.value.querySelector('.n-scrollbar-container')
    if (scrollContainer) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight
    }
  }
}

// Lifecycle
onMounted(() => {
  // 초기 로드
  if (modelGroups.value.length > 0) {
    selectedGroupId.value = modelGroups.value[0].id
    handleGroupChange(selectedGroupId.value)
  }
})
</script>

<style scoped>
.chat-page {
  height: 100vh;
  
  .sidebar-content {
    padding: 16px;
    height: 100%;
    display: flex;
    flex-direction: column;

    .group-selector {
      margin-bottom: 24px;
    }

    .session-list {
      flex: 1;
      overflow: hidden;

      h4 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: var(--text-color-2);
      }

      .session-item {
        cursor: pointer;
        padding: 12px;
        border-radius: 8px;
        margin-bottom: 4px;
        transition: background-color 0.2s;

        &:hover {
          background-color: var(--hover-color);
        }

        &.active {
          background-color: var(--primary-color-hover);
        }

        .session-info {
          .session-title {
            font-size: 14px;
            font-weight: 500;
            margin-bottom: 4px;
          }

          .session-meta {
            font-size: 12px;
            color: var(--text-color-3);
          }
        }
      }

      .empty-sessions {
        text-align: center;
        padding: 20px;
      }
    }
  }

  .chat-content {
    height: 100vh;
    display: flex;
    flex-direction: column;

    .setup-required,
    .group-required {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .chat-interface {
      flex: 1;
      display: flex;
      flex-direction: column;

      .messages-container {
        flex: 1;
        min-height: 0;

        .messages-list {
          padding: 24px;
          
          .generating-messages {
            .user-message {
              margin-bottom: 24px;
            }
          }
        }
      }

      .input-area {
        border-top: 1px solid var(--border-color);
        padding: 24px;
      }
    }
  }
}
</style>
