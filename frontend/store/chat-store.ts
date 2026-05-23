import { create } from "zustand"
import type { Conversation, Message, OllamaModel, SourceInfo } from "@/types"

interface ChatState {
  conversations: Conversation[]
  currentConversationId: number | null
  messages: Message[]
  isStreaming: boolean
  streamingContent: string
  streamingSources: SourceInfo[]
  abortController: AbortController | null
  models: OllamaModel[]
  ollamaAvailable: boolean
  ragMode: boolean
  ragDocumentIds: number[]
  autoSelectedModel: string | null

  setConversations: (convs: Conversation[]) => void
  addConversation: (conv: Conversation) => void
  updateConversation: (id: number, data: Partial<Conversation>) => void
  removeConversation: (id: number) => void
  setCurrentConversationId: (id: number | null) => void
  setMessages: (msgs: Message[]) => void
  addMessage: (msg: Message) => void
  updateLastAssistantMessage: (content: string) => void
  setIsStreaming: (v: boolean) => void
  setStreamingContent: (v: string) => void
  appendStreamingContent: (v: string) => void
  setStreamingSources: (s: SourceInfo[]) => void
  setAbortController: (c: AbortController | null) => void
  setModels: (models: OllamaModel[]) => void
  setOllamaAvailable: (v: boolean) => void
  setRagMode: (v: boolean) => void
  setRagDocumentIds: (ids: number[]) => void
  setAutoSelectedModel: (v: string | null) => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  currentConversationId: null,
  messages: [],
  isStreaming: false,
  streamingContent: "",
  streamingSources: [],
  abortController: null,
  models: [],
  ollamaAvailable: false,
  ragMode: false,
  ragDocumentIds: [],
  autoSelectedModel: null,

  setConversations: (conversations) => set({ conversations }),

  addConversation: (conv) =>
    set((state) => ({
      conversations: [conv, ...state.conversations],
      currentConversationId: conv.id,
    })),

  updateConversation: (id, data) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, ...data } : c
      ),
    })),

  removeConversation: (id) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      currentConversationId:
        state.currentConversationId === id ? null : state.currentConversationId,
    })),

  setCurrentConversationId: (id) => set({ currentConversationId: id }),

  setMessages: (messages) => set({ messages }),

  addMessage: (msg) =>
    set((state) => ({ messages: [...state.messages, msg] })),

  updateLastAssistantMessage: (content) =>
    set((state) => {
      const msgs = [...state.messages]
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === "assistant") {
          msgs[i] = { ...msgs[i], content }
          break
        }
      }
      return { messages: msgs }
    }),

  setIsStreaming: (v) => set({ isStreaming: v }),
  setStreamingContent: (v) => set({ streamingContent: v }),
  appendStreamingContent: (v) =>
    set((state) => ({ streamingContent: state.streamingContent + v })),
  setAbortController: (c) => set({ abortController: c }),
  setModels: (models) => set({ models }),
  setOllamaAvailable: (v) => set({ ollamaAvailable: v }),
  setStreamingSources: (s) => set({ streamingSources: s }),
  setRagMode: (v) => set({ ragMode: v }),
  setRagDocumentIds: (ids) => set({ ragDocumentIds: ids }),
  setAutoSelectedModel: (v) => set({ autoSelectedModel: v }),
}))
