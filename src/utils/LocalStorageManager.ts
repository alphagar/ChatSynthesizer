import type { AIModelGroup, ChatSession } from '@/types'
import { LOCAL_STORAGE_KEYS } from '@/types'

export class LocalStorageManager {
  /**
   * API 키를 저장합니다
   */
  static saveApiKey(apiKey: string): void {
    localStorage.setItem(LOCAL_STORAGE_KEYS.API_KEY, apiKey)
  }

  /**
   * API 키를 불러옵니다
   */
  static getApiKey(): string | null {
    return localStorage.getItem(LOCAL_STORAGE_KEYS.API_KEY)
  }

  /**
   * API 키를 삭제합니다
   */
  static clearApiKey(): void {
    localStorage.removeItem(LOCAL_STORAGE_KEYS.API_KEY)
  }

  /**
   * AI 모델 그룹들을 저장합니다
   */
  static saveModelGroups(groups: AIModelGroup[]): void {
    const serialized = JSON.stringify(groups, (key, value) => {
      if (key === 'createdAt' || key === 'updatedAt') {
        return value instanceof Date ? value.toISOString() : value
      }
      return value
    })
    localStorage.setItem(LOCAL_STORAGE_KEYS.MODEL_GROUPS, serialized)
  }

  /**
   * AI 모델 그룹들을 불러옵니다
   */
  static getModelGroups(): AIModelGroup[] {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.MODEL_GROUPS)
    if (!stored) return []

    try {
      const parsed = JSON.parse(stored)
      return parsed.map((group: any) => ({
        ...group,
        createdAt: new Date(group.createdAt),
        updatedAt: new Date(group.updatedAt)
      }))
    } catch (error) {
      console.error('Failed to parse model groups from localStorage:', error)
      return []
    }
  }

  /**
   * 특정 AI 모델 그룹을 불러옵니다
   */
  static getModelGroup(id: string): AIModelGroup | null {
    const groups = this.getModelGroups()
    return groups.find(group => group.id === id) || null
  }

  /**
   * AI 모델 그룹을 추가하거나 업데이트합니다
   */
  static saveModelGroup(group: AIModelGroup): void {
    const groups = this.getModelGroups()
    const existingIndex = groups.findIndex(g => g.id === group.id)

    if (existingIndex >= 0) {
      groups[existingIndex] = { ...group, updatedAt: new Date() }
    } else {
      groups.push(group)
    }

    this.saveModelGroups(groups)
  }

  /**
   * AI 모델 그룹을 삭제합니다
   */
  static deleteModelGroup(id: string): boolean {
    const groups = this.getModelGroups()
    const filteredGroups = groups.filter(group => group.id !== id)
    
    if (filteredGroups.length !== groups.length) {
      this.saveModelGroups(filteredGroups)
      return true
    }
    return false
  }

  /**
   * 모델 그룹 제목이 중복되는지 확인합니다
   */
  static isModelGroupTitleDuplicate(title: string, excludeId?: string): boolean {
    const groups = this.getModelGroups()
    return groups.some(group => 
      group.title.toLowerCase() === title.toLowerCase() && 
      group.id !== excludeId
    )
  }

  /**
   * 채팅 세션들을 저장합니다
   */
  static saveChatSessions(sessions: ChatSession[]): void {
    const serialized = JSON.stringify(sessions, (key, value) => {
      if (key === 'createdAt' || key === 'updatedAt' || key === 'timestamp') {
        return value instanceof Date ? value.toISOString() : value
      }
      return value
    })
    localStorage.setItem(LOCAL_STORAGE_KEYS.CHAT_SESSIONS, serialized)
  }

  /**
   * 채팅 세션들을 불러옵니다
   */
  static getChatSessions(): ChatSession[] {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.CHAT_SESSIONS)
    if (!stored) return []

    try {
      const parsed = JSON.parse(stored)
      return parsed.map((session: any) => ({
        ...session,
        createdAt: new Date(session.createdAt),
        updatedAt: new Date(session.updatedAt),
        messages: session.messages.map((message: any) => ({
          ...message,
          timestamp: new Date(message.timestamp),
          modelResponses: message.modelResponses?.map((response: any) => ({
            ...response,
            timestamp: new Date(response.timestamp)
          }))
        }))
      }))
    } catch (error) {
      console.error('Failed to parse chat sessions from localStorage:', error)
      return []
    }
  }

  /**
   * 특정 채팅 세션을 불러옵니다
   */
  static getChatSession(id: string): ChatSession | null {
    const sessions = this.getChatSessions()
    return sessions.find(session => session.id === id) || null
  }

  /**
   * 채팅 세션을 추가하거나 업데이트합니다
   */
  static saveChatSession(session: ChatSession): void {
    const sessions = this.getChatSessions()
    const existingIndex = sessions.findIndex(s => s.id === session.id)

    if (existingIndex >= 0) {
      sessions[existingIndex] = { ...session, updatedAt: new Date() }
    } else {
      sessions.push(session)
    }

    this.saveChatSessions(sessions)
  }

  /**
   * 채팅 세션을 삭제합니다
   */
  static deleteChatSession(id: string): boolean {
    const sessions = this.getChatSessions()
    const filteredSessions = sessions.filter(session => session.id !== id)
    
    if (filteredSessions.length !== sessions.length) {
      this.saveChatSessions(filteredSessions)
      return true
    }
    return false
  }

  /**
   * 모든 데이터를 삭제합니다
   */
  static clearAllData(): void {
    Object.values(LOCAL_STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key)
    })
  }

  /**
   * 애플리케이션 데이터를 내보냅니다 (백업용)
   */
  static exportData(): string {
    const data = {
      apiKey: this.getApiKey(),
      modelGroups: this.getModelGroups(),
      chatSessions: this.getChatSessions(),
      exportedAt: new Date().toISOString()
    }
    return JSON.stringify(data, null, 2)
  }

  /**
   * 애플리케이션 데이터를 가져옵니다 (복원용)
   */
  static importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData)
      
      if (data.apiKey) {
        this.saveApiKey(data.apiKey)
      }
      
      if (data.modelGroups && Array.isArray(data.modelGroups)) {
        this.saveModelGroups(data.modelGroups)
      }
      
      if (data.chatSessions && Array.isArray(data.chatSessions)) {
        this.saveChatSessions(data.chatSessions)
      }
      
      return true
    } catch (error) {
      console.error('Failed to import data:', error)
      return false
    }
  }
}
