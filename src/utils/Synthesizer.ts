import type { ModelResponse, SynthesizerConfig, StreamChunk } from '@/types'
import { OpenRouterAPI } from './OpenRouterAPI'

export class Synthesizer {
  private api: OpenRouterAPI

  constructor(apiKey: string) {
    this.api = new OpenRouterAPI(apiKey)
  }

  /**
   * 여러 모델의 응답을 스트리밍으로 통합합니다
   */
  async* synthesizeStream(
    responses: ModelResponse[], 
    config: SynthesizerConfig,
    originalQuestion: string
  ): AsyncGenerator<string> {
    if (responses.length === 0) {
      yield "응답을 받지 못했습니다."
      return
    }

    // 완료된 응답들만 필터링
    const completedResponses = responses.filter(r => r.isCompleted && r.content.trim())

    if (completedResponses.length === 0) {
      yield "완료된 응답이 없습니다."
      return
    }

    switch (config.mode) {
      case 'union':
        yield* this.synthesizeUnionStream(completedResponses, config, originalQuestion)
        break
      
      case 'intersection':
        yield* this.synthesizeIntersectionStream(completedResponses, config, originalQuestion)
        break
      
      case 'selective':
        yield* this.synthesizeSelectiveStream(completedResponses, config, originalQuestion)
        break
      
      default:
        yield* this.synthesizeUnionStream(completedResponses, config, originalQuestion)
        break
    }
  }

  /**
   * 시스템 프롬프트 생성
   */
  private getSystemPrompt(mode: string): string {
    const basePrompt = `<instruction>
  <persona_and_role>
    <persona>You are an AI response synthesis specialist who expertly combines multiple AI model responses.</persona>
    <goal>Your goal is to create a comprehensive, accurate, and well-structured synthesized response from multiple AI model outputs.</goal>
    <tone>Your tone should be professional, analytical, and informative.</tone>
  </persona_and_role>

  <core_instructions>
    <title>Core Synthesis Instructions</title>
    <instruction id="1" name="Output Language">
      <detail>IMPORTANT: Your final synthesized response must be written in Korean (한국어). Always output your final answer in Korean, regardless of the input language.</detail>
    </instruction>
    <instruction id="2" name="Analysis Process">
      <description>Follow these steps for synthesis:</description>
      <process>
        <step id="a">
          <action>Analyze Input Responses</action>
          <detail>Carefully examine each AI model's response for key information, insights, and perspectives.</detail>
        </step>
        <step id="b">
          <action>Identify Patterns</action>
          <detail>Find commonalities, differences, and complementary information across responses.</detail>
        </step>
        <step id="c">
          <action>Create Unified Response</action>
          <detail>Synthesize the information according to the specified mode while maintaining accuracy and coherence.</detail>
        </step>
      </process>
    </instruction>
  </core_instructions>

  <additional_guidelines>
    <title>Quality Guidelines</title>
    <guideline id="1" name="Information Accuracy">
      <detail>Verify information consistency and highlight any conflicting viewpoints clearly.</detail>
    </guideline>
    <guideline id="2" name="Structure and Clarity">
      <detail>Organize information logically with clear headings, bullet points, and structured formatting for readability.</detail>
    </guideline>
    <guideline id="3" name="Completeness">
      <detail>Ensure all relevant information is included while avoiding unnecessary redundancy.</detail>
    </guideline>
  </additional_guidelines>
</instruction>`

    switch (mode) {
      case 'union':
        return `${basePrompt}

<synthesis_mode>
  <mode_name>Union Mode</mode_name>
  <description>Combine all available information from multiple AI responses into a comprehensive unified answer.</description>
  <specific_rules>
    <rule id="1">Include all valuable information from each response while eliminating redundancy</rule>
    <rule id="2">Present different perspectives and approaches when they exist</rule>
    <rule id="3">Verify information accuracy and clearly indicate any conflicting content</rule>
    <rule id="4">Structure the response systematically for easy reading and understanding</rule>
    <rule id="5">Prioritize breadth of information while maintaining quality</rule>
  </specific_rules>
</synthesis_mode>`

      case 'intersection':
        return `${basePrompt}

<synthesis_mode>
  <mode_name>Intersection Mode</mode_name>
  <description>Focus only on information that is commonly mentioned by multiple AI models to ensure high reliability.</description>
  <specific_rules>
    <rule id="1">Include only content mentioned by the specified minimum number of models</rule>
    <rule id="2">Clearly state if insufficient common content is found</rule>
    <rule id="3">Focus on highly reliable core information with strong consensus</rule>
    <rule id="4">Present findings concisely and accurately</rule>
    <rule id="5">Prioritize information quality and consensus over breadth</rule>
  </specific_rules>
</synthesis_mode>`

      case 'selective':
        return `${basePrompt}

<synthesis_mode>
  <mode_name>Selective Mode</mode_name>
  <description>Curate and present only the most valuable, accurate, and relevant information from all responses.</description>
  <specific_rules>
    <rule id="1">Select only the highest-quality and most accurate information</rule>
    <rule id="2">Prioritize content that directly addresses the original question</rule>
    <rule id="3">Exclude uncertain, low-importance, or questionable information</rule>
    <rule id="4">Provide practical and actionable answers</rule>
    <rule id="5">Focus on creating the best possible single response rather than comprehensive coverage</rule>
  </specific_rules>
</synthesis_mode>`

      default:
        return `${basePrompt}

<synthesis_mode>
  <mode_name>Default Mode</mode_name>
  <description>Standard synthesis combining information from multiple responses.</description>
</synthesis_mode>`
    }
  }

  /**
   * 합집합 모드 프롬프트 생성
   */
  private createUnionPrompt(responses: ModelResponse[], originalQuestion: string): string {
    let prompt = `<synthesis_request>
  <original_question>${originalQuestion}</original_question>
  
  <ai_responses count="${responses.length}">
`

    responses.forEach((response, index) => {
      prompt += `    <ai_response model_name="${response.modelName}" model_id="${response.modelId}" index="${index + 1}">
${response.content}
    </ai_response>
`
    })

    prompt += `  </ai_responses>
  
  <task>
    <instruction>Synthesize the above AI responses using union mode methodology.</instruction>
    <requirements>
      <requirement>Include all valuable information from each response while eliminating redundancy</requirement>
      <requirement>Present different perspectives and approaches systematically</requirement>
      <requirement>Organize the content logically for maximum readability</requirement>
      <requirement>Remember: Your final response must be in Korean (한국어)</requirement>
    </requirements>
  </task>
</synthesis_request>`

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
    let prompt = `<synthesis_request>
  <original_question>${originalQuestion}</original_question>
  
  <ai_responses count="${responses.length}">
`

    responses.forEach((response, index) => {
      prompt += `    <ai_response model_name="${response.modelName}" model_id="${response.modelId}" index="${index + 1}">
${response.content}
    </ai_response>
`
    })

    prompt += `  </ai_responses>
  
  <task>
    <instruction>Synthesize the above AI responses using intersection mode methodology.</instruction>
    <parameters>
      <threshold>${threshold}</threshold>
      <description>Only include content mentioned by at least ${threshold} models</description>
    </parameters>
    <requirements>
      <requirement>Extract only information commonly mentioned by the minimum threshold of models</requirement>
      <requirement>Focus on highly reliable core information with strong consensus</requirement>
      <requirement>Clearly state if insufficient common content is found</requirement>
      <requirement>Remember: Your final response must be in Korean (한국어)</requirement>
    </requirements>
  </task>
</synthesis_request>`

    return prompt
  }

  /**
   * 선별 모드 프롬프트 생성
   */
  private createSelectivePrompt(responses: ModelResponse[], originalQuestion: string): string {
    let prompt = `<synthesis_request>
  <original_question>${originalQuestion}</original_question>
  
  <ai_responses count="${responses.length}">
`

    responses.forEach((response, index) => {
      prompt += `    <ai_response model_name="${response.modelName}" model_id="${response.modelId}" index="${index + 1}">
${response.content}
    </ai_response>
`
    })

    prompt += `  </ai_responses>
  
  <task>
    <instruction>Synthesize the above AI responses using selective mode methodology.</instruction>
    <requirements>
      <requirement>Select only the highest-quality and most accurate information</requirement>
      <requirement>Prioritize content that directly addresses the original question</requirement>
      <requirement>Exclude uncertain, low-importance, or questionable information</requirement>
      <requirement>Create the most practical and actionable answer possible</requirement>
      <requirement>Focus on quality over comprehensiveness</requirement>
      <requirement>Remember: Your final response must be in Korean (한국어)</requirement>
    </requirements>
  </task>
</synthesis_request>`

    return prompt
  }

  /**
   * 합집합 모드 스트리밍: 중복 제거하여 정보 통합
   */
  private async* synthesizeUnionStream(
    responses: ModelResponse[], 
    config: SynthesizerConfig, 
    originalQuestion: string
  ): AsyncGenerator<string> {
    const prompt = this.createUnionPrompt(responses, originalQuestion)
    
    try {
      const stream = this.api.streamChatCompletion({
        model: config.model.modelName,
        messages: [
          { role: 'system', content: this.getSystemPrompt('union') },
          { role: 'user', content: prompt }
        ],
        temperature: config.model.parameters.temperature ?? 0.3,
        ...this.extractModelParameters(config.model.parameters)
      })

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || ''
        if (content) {
          yield content
        }
      }
    } catch (error) {
      console.error('Union synthesis stream failed:', error)
      yield this.fallbackSynthesis(responses, 'union')
    }
  }

  /**
   * 교집합 모드 스트리밍: 공통 언급 내용만 추출
   */
  private async* synthesizeIntersectionStream(
    responses: ModelResponse[], 
    config: SynthesizerConfig, 
    originalQuestion: string
  ): AsyncGenerator<string> {
    const threshold = config.intersectionThreshold || Math.max(2, Math.ceil(responses.length / 2))
    const prompt = this.createIntersectionPrompt(responses, originalQuestion, threshold)
    
    try {
      const stream = this.api.streamChatCompletion({
        model: config.model.modelName,
        messages: [
          { role: 'system', content: this.getSystemPrompt('intersection') },
          { role: 'user', content: prompt }
        ],
        temperature: config.model.parameters.temperature ?? 0.2,
        ...this.extractModelParameters(config.model.parameters)
      })

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || ''
        if (content) {
          yield content
        }
      }
    } catch (error) {
      console.error('Intersection synthesis stream failed:', error)
      yield this.fallbackSynthesis(responses, 'intersection')
    }
  }

  /**
   * 선별 모드 스트리밍: 가치 높은 정보만 선별
   */
  private async* synthesizeSelectiveStream(
    responses: ModelResponse[], 
    config: SynthesizerConfig, 
    originalQuestion: string
  ): AsyncGenerator<string> {
    const prompt = this.createSelectivePrompt(responses, originalQuestion)
    
    try {
      const stream = this.api.streamChatCompletion({
        model: config.model.modelName,
        messages: [
          { role: 'system', content: this.getSystemPrompt('selective') },
          { role: 'user', content: prompt }
        ],
        temperature: config.model.parameters.temperature ?? 0.4,
        ...this.extractModelParameters(config.model.parameters)
      })

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || ''
        if (content) {
          yield content
        }
      }
    } catch (error) {
      console.error('Selective synthesis stream failed:', error)
      yield this.fallbackSynthesis(responses, 'selective')
    }
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
   * 모델 파라미터에서 OpenRouter API에 사용할 파라미터만 추출
   */
  private extractModelParameters(parameters: Record<string, any>): Record<string, any> {
    const validParams: Record<string, any> = {}
    
    // OpenRouter API에서 지원하는 파라미터들
    const supportedParams = [
      'max_tokens', 'top_p', 'top_k', 'frequency_penalty', 
      'presence_penalty', 'repetition_penalty', 'seed', 'user'
    ]
    
    for (const param of supportedParams) {
      if (parameters[param] !== undefined && parameters[param] !== null) {
        validParams[param] = parameters[param]
      }
    }
    
    return validParams
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
