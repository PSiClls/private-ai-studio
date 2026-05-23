"use client"

import { useCallback, useRef } from "react"
import { useChatStore } from "@/store/chat-store"
import { api } from "@/lib/api"
import { useToast } from "@/components/ui/toast"

const DEFAULT_MODEL = "auto"
const STREAM_TIMEOUT_MS = 120000

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError"
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

export function useStreamChat() {
  const { addToast } = useToast()
  const abortRef = useRef<AbortController | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const convIdRef = useRef<number | null>(null)

  const cleanup = useCallback(() => {
    const store = useChatStore.getState()
    store.setIsStreaming(false)
    store.setStreamingContent("")
    store.setAbortController(null)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const streamMessage = useCallback(async (convId: number, text: string) => {
    convIdRef.current = convId
    const store = useChatStore.getState()
    store.setIsStreaming(true)
    store.setStreamingContent("")
    store.setStreamingSources([])

    const abortController = new AbortController()
    abortRef.current = abortController
    store.setAbortController(abortController)

    timeoutRef.current = setTimeout(() => {
      abortController.abort()
      cleanup()
      addToast("error", "Generation timed out", "The response took too long. Try a shorter prompt or a different model.")
    }, STREAM_TIMEOUT_MS)

    try {
      const convs = store.conversations
      const conv = convs.find((c) => c.id === convId)
      const model = conv?.model || DEFAULT_MODEL
      const systemPrompt = conv?.system_prompt || ""

      const isRag = store.ragMode && store.ragDocumentIds.length > 0
      const endpoint = isRag ? "/api/chat/rag-stream" : "/api/chat/stream"

      const body = isRag
        ? {
            conversation_id: convId,
            message: text,
            model,
            system_prompt: systemPrompt,
            document_ids: store.ragDocumentIds,
            n_results: 5,
            relevance_threshold: 0.3,
          }
        : {
            conversation_id: convId,
            message: text,
            model,
            system_prompt: systemPrompt,
          }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: abortController.signal,
      })

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Stream error ${response.status}: ${errText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No response body reader")

      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          try {
            const data = JSON.parse(line.slice(6))
            const current = useChatStore.getState()
            switch (data.event) {
              case "token":
                current.appendStreamingContent(data.data)
                break
              case "sources":
                try {
                  current.setStreamingSources(JSON.parse(data.data))
                } catch {
                  // ignore
                }
                break
              case "done":
                current.setStreamingContent("")
                current.setIsStreaming(false)
                if (current.currentConversationId === convIdRef.current) {
                  api.conversations.messages.list(convId).then((msgs) => {
                    const latest = useChatStore.getState()
                    if (latest.currentConversationId === convIdRef.current) {
                      latest.setMessages(msgs)
                    }
                  }).catch(() => {})
                }
                break
              case "title_suggestion":
                current.updateConversation(convId, { title: data.data })
                break
              case "model_info":
                current.setAutoSelectedModel(data.data)
                break
              case "retry":
                current.setStreamingContent("[Rate limited, waiting " + data.data + "s before retry...]")
                break
              case "error":
                current.setIsStreaming(false)
                current.setStreamingContent("")
                addToast("error", "Generation error", data.data)
                break
            }
          } catch {
            // skip unparseable lines
          }
        }
      }
    } catch (error: unknown) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      if (isAbortError(error)) {
        addToast("info", "Generation stopped", "The response was cancelled.")
      } else {
        addToast("error", "Connection error", getErrorMessage(error) || "Failed to reach the backend.")
      }
      cleanup()
    } finally {
      abortRef.current = null
      convIdRef.current = null
      useChatStore.getState().setAbortController(null)
    }
  }, [addToast, cleanup])

  const stop = useCallback(() => {
    abortRef.current?.abort()
    cleanup()
  }, [cleanup])

  return { streamMessage, stop }
}