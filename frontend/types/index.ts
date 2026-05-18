export interface Conversation {
  id: number
  title: string
  model: string
  system_prompt: string
  created_at: string
  updated_at: string
  pinned: boolean
  message_count: number
}

export interface Message {
  id: number
  conversation_id: number
  role: "user" | "assistant" | "system"
  content: string
  tokens: number | null
  parent_message_id: number | null
  created_at: string
}

export interface OllamaModel {
  name: string
  modified_at: string
  size: number
}

export interface HealthStatus {
  status: string
  ollama: boolean
  version: string
}

export interface SourceInfo {
  id: string
  text: string
  metadata: Record<string, any>
  score: number
  document_id: number
}
