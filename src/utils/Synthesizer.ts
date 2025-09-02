import type { ModelResponse, SynthesizerConfig } from '@/types'
import { OpenRouterAPI } from './OpenRouterAPI'

export class Synthesizer {
  private api: OpenRouterAPI

  constructor(apiKey: string) {
    this.api = new OpenRouterAPI(apiKey)
  }

  /**
   * 여러 모델의 응답을 통합합니다
   */
  async synthesize(
    responses: ModelResponse[], 
    config: SynthesizerConfig,
    originalQuestion: string
  ): Promise<string> {
    if (responses.length === 0) {
      return "응답을 받지 못했습니다."
    }

    // 완료된 응답들만 필터링
    const completedResponses = responses.filter(r => r.isCompleted && r.content.trim())

    if (completedResponses.length === 0) {
      return "완료된 응답이 없습니다."
    }

    switch (config.mode) {
      case 'union':
        return this.synthesizeUnion(completedResponses, config, originalQuestion)
      
      case 'intersection':
        return this.synthesizeIntersection(completedResponses, config, originalQuestion)
      
      case 'selective':
        return this.synthesizeSelective(completedResponses, config, originalQuestion)
      
      default:
        return this.synthesizeUnion(completedResponses, config, originalQuestion)
    }
  }

  /**
   * 합집합 모드: 중복 제거하여 정보 통합
   */
  private async synthesizeUnion(
    responses: ModelResponse[], 
    config: SynthesizerConfig, 
    originalQuestion: string
  ): Promise<string> {
    const prompt = this.createUnionPrompt(responses, originalQuestion)
    
    try {
      const response = await this.api.chatCompletion({
        model: config.model,
        messages: [
          { role: 'system', content: this.getSystemPrompt('union') },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3
      })

      return response.choices[0]?.message.content || "통합된 응답을 생성할 수 없습니다."
    } catch (error) {
      console.error('Union synthesis failed:', error)
      return this.fallbackSynthesis(responses, 'union')
    }
  }

  /**
   * 교집합 모드: 공통 언급 내용만 추출
   */
  private async synthesizeIntersection(
    responses: ModelResponse[], 
    config: SynthesizerConfig, 
    originalQuestion: string
  ): Promise<string> {
    const threshold = config.intersectionThreshold || Math.max(2, Math.ceil(responses.length / 2))
    const prompt = this.createIntersectionPrompt(responses, originalQuestion, threshold)
    
    try {
      const response = await this.api.chatCompletion({
        model: config.model,
        messages: [
          { role: 'system', content: this.getSystemPrompt('intersection') },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2
      })

      return response.choices[0]?.message.content || "공통 내용을 찾을 수 없습니다."
    } catch (error) {
      console.error('Intersection synthesis failed:', error)
      return this.fallbackSynthesis(responses, 'intersection')
    }
  }

  /**
   * 선별 모드: 가치 높은 정보만 선별
   */
  private async synthesizeSelective(
    responses: ModelResponse[], 
    config: SynthesizerConfig, 
    originalQuestion: string
  ): Promise<string> {
    const prompt = this.createSelectivePrompt(responses, originalQuestion)
    
    try {
      const response = await this.api.chatCompletion({
        model: config.model,
        messages: [
          { role: 'system', content: this.getSystemPrompt('selective') },
          { role: 'user', content: prompt }
        ],
        temperature: 0.4
      })

      return response.choices[0]?.message.content || "선별된 응답을 생성할 수 없습니다."
    } catch (error) {
      console.error('Selective synthesis failed:', error)
      return this.fallbackSynthesis(responses, 'selective')
    }
  }

  /**
   * 시스템 프롬프트 생성
   */
  private getSystemPrompt(mode: string): string {
    const basePrompt = "당신은 여러 AI 모델의 응답을 통합하는 전문가입니다. 한국어로 응답해주세요."

    switch (mode) {
      case 'union':
        return `${basePrompt}

합집합 모드에서는 다음 규칙을 따라주세요:
1. 모든 응답의 정보를 포함하되, 중복되는 내용은 제거하세요
2. 서로 다른 관점이나 접근법이 있다면 모두 포함하세요
3. 정보의 정확성을 검증하고, 상충하는 내용이 있다면 명시하세요
4. 체계적이고 읽기 쉽게 정리하세요`

      case 'intersection':
        return `${basePrompt}

교집합 모드에서는 다음 규칙을 따라주세요:
1. 지정된 수 이상의 모델이 공통으로 언급하는 내용만 포함하세요
2. 공통 내용이 부족하다면 그 사실을 명시하세요
3. 신뢰성이 높은 핵심 정보에 집중하세요
4. 간결하고 정확하게 정리하세요`

      case 'selective':
        return `${basePrompt}

선별 모드에서는 다음 규칙을 따라주세요:
1. 가장 가치 있고 정확한 정보만 선별하세요
2. 질문에 가장 직접적으로 답하는 내용을 우선하세요
3. 불확실하거나 중요도가 낮은 정보는 제외하세요
4. 실용적이고 유용한 답변을 제공하세요`

      default:
        return basePrompt
    }
  }

  /**
   * 합집합 모드 프롬프트 생성
   */
  private createUnionPrompt(responses: ModelResponse[], originalQuestion: string): string {
    let prompt = `원본 질문: "${originalQuestion}"\n\n`
    prompt += `다음은 ${responses.length}개의 AI 모델이 제공한 응답들입니다:\n\n`

    responses.forEach((response, index) => {
      prompt += `=== ${response.modelName} (${response.modelId}) ===\n`
      prompt += `${response.content}\n\n`
    })

    prompt += `위 응답들을 합집합 방식으로 통합해주세요. 모든 유용한 정보를 포함하되 중복은 제거하고, 체계적으로 정리해주세요.`

    return prompt
  }

  /**
   * 교집합 모드 프롬프트 생성
   */
  private createIntersectionPrompt(
    responses: ModelResponse[], 
    originalQuestion: string, 
    threshold: number
  ): string {
    let prompt = `원본 질문: "${originalQuestion}"\n\n`
    prompt += `다음은 ${responses.length}개의 AI 모델이 제공한 응답들입니다:\n\n`

    responses.forEach((response, index) => {
      prompt += `=== ${response.modelName} (${response.modelId}) ===\n`
      prompt += `${response.content}\n\n`
    })

    prompt += `위 응답들에서 최소 ${threshold}개 이상의 모델이 공통으로 언급하는 내용만을 추출하여 통합해주세요.`

    return prompt
  }

  /**
   * 선별 모드 프롬프트 생성
   */
  private createSelectivePrompt(responses: ModelResponse[], originalQuestion: string): string {
    let prompt = `원본 질문: "${originalQuestion}"\n\n`
    prompt += `다음은 ${responses.length}개의 AI 모델이 제공한 응답들입니다:\n\n`

    responses.forEach((response, index) => {
      prompt += `=== ${response.modelName} (${response.modelId}) ===\n`
      prompt += `${response.content}\n\n`
    })

    prompt += `위 응답들에서 가장 정확하고 가치 있는 정보만을 선별하여 최고 품질의 답변을 만들어주세요. 질문에 가장 직접적이고 실용적인 답변을 제공해주세요.`

    return prompt
  }

  /**
   * API 호출 실패시 폴백 통합 방식
   */
  private fallbackSynthesis(responses: ModelResponse[], mode: string): string {
    let result = `[${mode} 모드 - 기본 통합]\n\n`

    if (mode === 'intersection') {
      result += "공통 내용을 자동으로 찾을 수 없어 모든 응답을 제공합니다:\n\n"
    } else if (mode === 'selective') {
      result += "자동 선별이 실패하여 첫 번째 응답을 제공합니다:\n\n"
      return result + responses[0]?.content || "응답을 찾을 수 없습니다."
    }

    responses.forEach((response, index) => {
      result += `**${response.modelName}의 응답:**\n`
      result += `${response.content}\n\n`
    })

    return result
  }

  /**
   * 응답 품질 평가
   */
  evaluateResponse(content: string): number {
    if (!content || content.trim().length === 0) return 0

    let score = 0

    // 길이 평가 (너무 짧거나 너무 길지 않은 것)
    const length = content.length
    if (length > 50 && length < 5000) score += 20
    else if (length > 10) score += 10

    // 구조화 평가
    if (content.includes('\n') || content.includes('•') || content.includes('-')) score += 10

    // 특수 문자나 코드 블록 포함
    if (content.includes('```') || content.includes('`')) score += 5

    // 질문 형태나 불확실성 표현 감점
    const uncertainPhrases = ['모르겠', '확실하지', '잘 모르', '아마도', '가능합니다만']
    const uncertainCount = uncertainPhrases.reduce((count, phrase) => 
      count + (content.includes(phrase) ? 1 : 0), 0
    )
    score -= uncertainCount * 10

    return Math.max(0, Math.min(100, score))
  }
}
