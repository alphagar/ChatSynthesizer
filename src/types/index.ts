// OpenRouter API 관련 타입들
export interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system'
  content: string | Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }>
}

export interface OpenRouterRequest {
  model: string
  messages: OpenRouterMessage[]
  stream?: boolean
  max_tokens?: number
  temperature?: number
  top_p?: number
  top_k?: number
  frequency_penalty?: number
  presence_penalty?: number
  repetition_penalty?: number
  seed?: number
  user?: string
}

export interface OpenRouterChoice {
  index: number
  message: OpenRouterMessage
  finish_reason: string
}

export interface OpenRouterResponse {
  id: string
  object: string
  created: number
  model: string
  choices: OpenRouterChoice[]
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface StreamChunk {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    delta: {
      role?: string
      content?: string
    }
    finish_reason: string | null
  }>
}

// 애플리케이션 타입들
export interface AIModelConfig {
  id: string
  modelName: string
  displayName: string
  parameters: Record<string, any>
}

export interface SynthesizerConfig {
  model: string
  mode: 'union' | 'intersection' | 'selective'
  intersectionThreshold?: number // 교집합 모드에서 최소 몇 개의 AI가 언급해야 하는지
}

export interface AIModelGroup {
  id: string
  title: string
  models: AIModelConfig[]
  synthesizer: SynthesizerConfig
  createdAt: Date
  updatedAt: Date
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  modelResponses?: ModelResponse[] // 개별 모델 응답들 (synthesizer가 처리하기 전)
  synthesizedFrom?: string[] // 어떤 모델들로부터 합성되었는지
}

export interface ModelResponse {
  modelId: string
  modelName: string
  content: string
  isCompleted: boolean
  timestamp: Date
}

export interface ChatSession {
  id: string
  title: string
  modelGroupId: string
  messages: ChatMessage[]
  createdAt: Date
  updatedAt: Date
}

// 로컬 스토리지 키들
export const LOCAL_STORAGE_KEYS = {
  API_KEY: 'openrouter_api_key',
  MODEL_GROUPS: 'ai_model_groups',
  CHAT_SESSIONS: 'chat_sessions'
} as const

// 잘 알려진 AI 모델 목록
export const POPULAR_MODELS = [
  { id: 'openai/gpt-4o', name: 'GPT-4O', provider: 'OpenAI' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4O Mini', provider: 'OpenAI' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
  { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku', provider: 'Anthropic' },
  { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5', provider: 'Google' },
  { id: 'google/gemini-flash-1.5', name: 'Gemini Flash 1.5', provider: 'Google' },
  { id: 'meta-llama/llama-3.2-90b-vision-instruct', name: 'Llama 3.2 90B Vision', provider: 'Meta' },
  { id: 'mistralai/mistral-large', name: 'Mistral Large', provider: 'Mistral' },
] as const

// 기본 모델 파라미터
export const DEFAULT_MODEL_PARAMETERS = {
  temperature: 0.7,
  top_p: 0.9,
  top_k: 40,
  max_tokens: 1000,
  frequency_penalty: 0,
  presence_penalty: 0,
  repetition_penalty: 1
} as const

// 파일 업로드 타입
export interface UploadedFile {
  id: string
  name: string
  type: string
  size: number
  data: string // base64 데이터
  url?: string
}
