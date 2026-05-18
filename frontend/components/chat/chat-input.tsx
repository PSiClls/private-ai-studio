"use client"

import { useRef, useCallback, KeyboardEvent } from "react"
import { Send, Square } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ChatInputProps {
  onSend: (message: string) => void
  onStop: () => void
  isStreaming: boolean
  disabled?: boolean
}

export function ChatInput({
  onSend,
  onStop,
  isStreaming,
  disabled,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    const text = textarea.value.trim()
    if (!text) return
    onSend(text)
    textarea.value = ""
    textarea.style.height = "auto"
  }, [onSend])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  const handleInput = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = "auto"
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px"
  }, [])

  if (isStreaming) {
    return (
      <div className="border-t border-border p-4">
        <div className="max-w-3xl mx-auto flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={onStop}
            className="gap-2"
          >
            <Square className="w-4 h-4 fill-current" />
            Stop generation
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="border-t border-border p-4">
      <div className="max-w-3xl mx-auto flex gap-3 items-end">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            placeholder="Message Private AI Studio..."
            rows={1}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            disabled={disabled}
            className="flex w-full rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none min-h-[44px] max-h-[200px]"
          />
        </div>
        <Button
          onClick={handleSubmit}
          disabled={disabled}
          size="icon"
          className="h-11 w-11 rounded-xl shrink-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
