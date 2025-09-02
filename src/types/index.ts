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
  { id: 'openai/gpt-5', name: 'GPT-5', provider: 'OpenAI' },
  { id: 'openai/gpt-5-mini', name: 'GPT-5 Mini', provider: 'OpenAI' },
  { id: 'openai/gpt-5-nano', name: 'GPT-5 Nano', provider: 'OpenAI' },
  { id: 'openai/gpt-4.1', name: 'GPT-4.1', provider: 'OpenAI' },

  { id: 'anthropic/claude-opus-4.1', name: 'Claude Opus 4.1', provider: 'Anthropic' },
  { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'Anthropic' },

  { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google' },
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google' },
  { id: 'google/gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', provider: 'Google' },

  { id: 'x-ai/grok-4', name: 'Grok 4', provider: 'xAI' }
] as const

// 기본 모델 파라미터
export const DEFAULT_MODEL_PARAMETERS = {
  temperature: 0.7,
  top_p: 0.9,
  top_k: 40,
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

// OpenRouter API 유효성 검증에 사용되는 요청 정보
export const VALIDATE_REQUEST_INFO: OpenRouterRequest = {
  model: 'google/gemini-2.5-flash-lite',
  messages: [
    { role: 'user', content: 'Hello' }
  ],
  max_tokens: 1
} as const

// 기본 싱크로나이저 설정
export const DEFAULT_SYNTHESIZER: SynthesizerConfig = {
  model: 'google/gemini-2.5-pro',
  mode: 'union',
  intersectionThreshold: 2
} as const