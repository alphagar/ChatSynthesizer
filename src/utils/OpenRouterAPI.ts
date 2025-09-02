import type { 
  OpenRouterRequest, 
  OpenRouterResponse, 
  StreamChunk,
  OpenRouterMessage,
  UploadedFile 
} from '@/types'
import { VALIDATE_REQUEST_INFO } from '@/types'

export class OpenRouterAPI {
  private apiKey: string
  private baseUrl = 'https://openrouter.ai/api/v1'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  /**
   * 단일 모델에 채팅 완성 요청을 보냅니다
   */
  async chatCompletion(request: OpenRouterRequest): Promise<OpenRouterResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'ChatSynthesizer'
      },
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenRouter API Error: ${response.status} - ${error}`)
    }

    return response.json()
  }

  /**
   * 스트리밍 채팅 완성 요청을 보냅니다
   */
  async *streamChatCompletion(request: OpenRouterRequest): AsyncGenerator<StreamChunk> {
    const streamRequest = { ...request, stream: true }
    
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'ChatSynthesizer'
      },
      body: JSON.stringify(streamRequest)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenRouter API Error: ${response.status} - ${error}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('Failed to get stream reader')
    }

    const decoder = new TextDecoder()

    try {
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            
            if (data === '[DONE]') {
              return
            }

            try {
              const parsed: StreamChunk = JSON.parse(data)
              yield parsed
            } catch (e) {
              console.warn('Failed to parse stream chunk:', data)
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  /**
   * 파일을 base64로 인코딩하여 메시지에 포함할 수 있는 형식으로 변환합니다
   */
  async prepareFileForMessage(file: UploadedFile): Promise<string> {
    if (file.type.startsWith('image/')) {
      return `data:${file.type};base64,${file.data}`
    }
    
    // 텍스트 파일의 경우 내용을 직접 포함
    if (file.type.startsWith('text/') || 
        file.type === 'application/pdf' || 
        file.name.endsWith('.pdf')) {
      return `[File: ${file.name}]\n${atob(file.data)}`
    }

    return `[Uploaded file: ${file.name} (${file.type})]`
  }

  /**
   * 메시지에 파일을 포함시킵니다
   */
  async createMessageWithFiles(
    content: string, 
    files: UploadedFile[]
  ): Promise<OpenRouterMessage> {
    if (files.length === 0) {
      return {
        role: 'user',
        content
      }
    }

    // 이미지가 포함된 경우 multimodal 형식 사용
    const hasImages = files.some(f => f.type.startsWith('image/'))
    
    if (hasImages) {
      const contentArray: Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }> = []
      
      // 텍스트 추가
      if (content.trim()) {
        contentArray.push({
          type: 'text',
          text: content
        })
      }

      // 파일들 추가
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          contentArray.push({
            type: 'image_url',
            image_url: {
              url: await this.prepareFileForMessage(file)
            }
          })
        } else {
          // 이미지가 아닌 파일은 텍스트로 추가
          const fileContent = await this.prepareFileForMessage(file)
          contentArray.push({
            type: 'text',
            text: fileContent
          })
        }
      }

      return {
        role: 'user',
        content: contentArray
      }
    } else {
      // 이미지가 없는 경우 단순 텍스트로 처리
      let fullContent = content

      for (const file of files) {
        const fileContent = await this.prepareFileForMessage(file)
        fullContent += '\n\n' + fileContent
      }

      return {
        role: 'user',
        content: fullContent
      }
    }
  }

  /**
   * API 키가 유효한지 확인합니다
   */
  async validateApiKey(): Promise<boolean> {
    try {
      await this.chatCompletion(VALIDATE_REQUEST_INFO)
      return true
    } catch (error) {
      console.error('API Key validation failed:', error)
      return false
    }
  }

  /**
   * 사용 가능한 모델 목록을 가져옵니다
   */
  async getAvailableModels(): Promise<Array<{ id: string; name: string; pricing: any }>> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`)
      }

      const data = await response.json()
      return data.data || []
    } catch (error) {
      console.error('Failed to fetch available models:', error)
      return []
    }
  }
}
