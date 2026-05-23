"use client"

import { MessageSquare, Sparkles, FileText, Code, Brain, Globe, Pen } from "lucide-react"
import { useChatStore } from "@/store/chat-store"
import { Button } from "@/components/ui/button"
import { ModelSelector } from "./model-selector"

const suggestions = [
  {
    icon: Brain,
    text: "Explain quantum computing in simple terms",
    category: "Learning",
  },
  {
    icon: Code,
    text: "Write a Python script to analyze a CSV file and generate summary statistics",
    category: "Coding",
  },
  {
    icon: Pen,
    text: "Help me draft a professional email requesting a meeting",
    category: "Writing",
  },
  {
    icon: Globe,
    text: "Summarize the key differences between REST and GraphQL APIs",
    category: "Technology",
  },
  {
    icon: FileText,
    text: "Create a study guide for machine learning fundamentals",
    category: "Education",
  },
  {
    icon: Sparkles,
    text: "Explain how neural networks learn with an analogy",
    category: "AI",
  },
]

interface EmptyStateProps {
  onSuggestionClick: (text: string) => void
}

export function EmptyState({ onSuggestionClick }: EmptyStateProps) {
  const { models, ollamaAvailable, currentConversationId, updateConversation, conversations } = useChatStore()

  const currentConv = conversations.find((c) => c.id === currentConversationId)

  return (
    <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
      <div className="max-w-lg w-full text-center space-y-8">
        {/* Logo */}
        <div className="space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Private AI Studio
            </h1>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Your local, private AI workspace. All processing stays on your machine — zero data leaves your computer.
            </p>
          </div>
        </div>

        {/* Model selector */}
        <div className="flex items-center justify-center gap-3">
          <ModelSelector
            models={models}
            selectedModel={currentConv?.model || "auto"}
            onSelect={(m) => {
              if (currentConversationId) {
                updateConversation(currentConversationId, { model: m })
              }
            }}
          />
          {!ollamaAvailable && (
            <p className="text-xs text-destructive">Ollama not detected</p>
          )}
        </div>

        {/* Suggested prompts */}
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Try asking something
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {suggestions.map((s) => (
              <Button
                key={s.text}
                variant="outline"
                className="justify-start h-auto py-3 px-4 text-left gap-3 hover:bg-accent/50 transition-colors"
                onClick={() => onSuggestionClick(s.text)}
                disabled={!ollamaAvailable}
              >
                <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
                  <s.icon className="w-4 h-4 text-primary" />
                </div>
                <div className="text-left">
                  <span className="text-sm leading-tight block">{s.text}</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">{s.category}</span>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Status */}
        <p className="text-xs text-muted-foreground/60">
          {ollamaAvailable
            ? "Ready — select a model and start typing"
            : "Install Ollama to start chatting"
          }
        </p>
      </div>
    </div>
  )
}
