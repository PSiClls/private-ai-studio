"use client"

import { useCallback, useRef, useEffect } from "react"
import { useChatStore } from "@/store/chat-store"
import { ChatMessage } from "./chat-message"
import { ChatInput } from "./chat-input"
import { EmptyState } from "./empty-state"
import { RagDocPicker } from "@/components/documents/rag-doc-picker"
import { SourcePanel } from "@/components/documents/source-panel"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertCircle } from "lucide-react"
import { api } from "@/lib/api"
import { useStreamChat } from "@/hooks/use-stream-chat"
import { useToast } from "@/components/ui/toast"

interface ChatInterfaceProps {
  initialMessage?: string | null
  onMessageSent?: () => void
}

export function ChatInterface({ initialMessage, onMessageSent }: ChatInterfaceProps) {
  const {
    currentConversationId,
    messages,
    isStreaming,
    streamingContent,
    streamingSources,
    ollamaAvailable,
  } = useChatStore()

  const scrollRef = useRef<HTMLDivElement>(null)
  const { streamMessage, stop } = useStreamChat()
  const { addToast } = useToast()
  const hasSentInitial = useRef(false)

  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200
      if (isNearBottom) {
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
      }
    }
  }, [messages, streamingContent])

  const handleSend = useCallback(async (text: string) => {
    const store = useChatStore.getState()
    let convId = store.currentConversationId

    if (!convId) {
      try {
        const conv = await api.conversations.create({
          title: text.length > 50 ? text.slice(0, 50) + "..." : text,
        })
        store.addConversation(conv)
        convId = conv.id
      } catch {
        addToast("error", "Failed to create conversation", "Could not connect to the backend.")
        return
      }
    }

    await streamMessage(convId, text)
  }, [streamMessage, addToast])

  useEffect(() => {
    if (initialMessage && !hasSentInitial.current && !isStreaming) {
      hasSentInitial.current = true
      handleSend(initialMessage)
      onMessageSent?.()
    }
  }, [initialMessage])

  const handleRegenerate = useCallback(async () => {
    const store = useChatStore.getState()
    const convId = store.currentConversationId
    const msgs = store.messages
    const lastUserMsg = [...msgs].reverse().find((m) => m.role === "user")
    if (!lastUserMsg || !convId) return
    const trimmed = msgs.slice(0, msgs.indexOf(lastUserMsg))
    store.setMessages(trimmed)
    await streamMessage(convId, lastUserMsg.content)
  }, [streamMessage])

  const handleStop = useCallback(() => {
    stop()
  }, [stop])

  if (!currentConversationId && messages.length === 0 && !isStreaming) {
    return <EmptyState onSuggestionClick={handleSend} />
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Ollama unavailable banner */}
      {!ollamaAvailable && (
        <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-3 text-sm text-destructive flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Ollama is not running</p>
            <p className="text-destructive/80 text-xs mt-0.5">
              Install from{" "}
              <a href="https://ollama.com/download" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                ollama.com/download
              </a>
              , launch the application, then{" "}
              <button onClick={() => window.location.reload()} className="underline font-medium">
                refresh
              </button>
              .
            </p>
          </div>
        </div>
      )}

      {/* RAG document picker */}
      <RagDocPicker />

      <ScrollArea ref={scrollRef} className="flex-1 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="py-4">
            {messages.length === 0 && isStreaming && (
              <div className="flex gap-4 py-4 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-20 bg-muted rounded" />
                  <div className="h-16 bg-muted rounded-lg" />
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={msg.id} className="message-enter">
                <ChatMessage
                  role={msg.role as "user" | "assistant"}
                  content={msg.content}
                  isLast={i === messages.length - 1 && !isStreaming}
                  onRegenerate={i === messages.length - 1 ? handleRegenerate : undefined}
                />
                {msg.role === "assistant" && i === messages.length - 1 && streamingSources.length > 0 && (
                  <div className="max-w-3xl mx-auto mb-4">
                    <SourcePanel sources={streamingSources} />
                  </div>
                )}
              </div>
            ))}

            {isStreaming && streamingContent && (
              <div className="message-enter">
                <ChatMessage role="assistant" content={streamingContent} isStreaming />
                {streamingSources.length > 0 && (
                  <div className="max-w-3xl mx-auto mb-4">
                    <SourcePanel sources={streamingSources} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      <ChatInput
        onSend={handleSend}
        onStop={handleStop}
        isStreaming={isStreaming}
        disabled={!ollamaAvailable}
      />
    </div>
  )
}
