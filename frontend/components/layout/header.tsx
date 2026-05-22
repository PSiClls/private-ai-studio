"use client"

import { useState, useEffect, useCallback } from "react"
import { useChatStore } from "@/store/chat-store"
import { ModelSelector } from "@/components/chat/model-selector"
import { api } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Settings, Sun, Moon, AlertCircle, Menu } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/toast"

interface HeaderProps {
  onMenuToggle?: () => void
}

export function Header({ onMenuToggle }: HeaderProps) {
  const {
    conversations,
    currentConversationId,
    models,
    ollamaAvailable,
    setModels,
    setOllamaAvailable,
    updateConversation,
  } = useChatStore()

  const [modelLoading, setModelLoading] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [theme, setTheme] = useState<"light" | "dark">("dark")
  const { addToast } = useToast()

  const loadModels = useCallback(async () => {
    setModelLoading(true)
    try {
      const data = await api.chat.models()
      setOllamaAvailable(data.available)
      if (data.available) {
        setModels(data.models)
      }
    } catch {
      setOllamaAvailable(false)
    } finally {
      setModelLoading(false)
    }
  }, [setOllamaAvailable, setModels])

  useEffect(() => {
    const saved = localStorage.getItem("theme")
    if (saved === "light" || saved === "dark") {
      setTheme(saved)
      document.documentElement.classList.toggle("dark", saved === "dark")
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      setTheme(prefersDark ? "dark" : "light")
      document.documentElement.classList.toggle("dark", prefersDark)
    }
    loadModels()
  }, [loadModels])

  const currentConv = conversations.find((c) => c.id === currentConversationId)

  const handleModelChange = useCallback((model: string) => {
    if (currentConversationId) {
      updateConversation(currentConversationId, { model })
      api.conversations.update(currentConversationId, { model }).catch((err) => {
        addToast("warning", "Sync failed", `Model change: ${err instanceof Error ? err.message : err}`)
      })
    }
  }, [currentConversationId, updateConversation, addToast])

  const handleSystemPromptChange = useCallback((value: string) => {
    if (currentConversationId) {
      updateConversation(currentConversationId, { system_prompt: value })
      api.conversations.update(currentConversationId, { system_prompt: value }).catch((err) => {
        addToast("warning", "Sync failed", `System prompt: ${err instanceof Error ? err.message : err}`)
      })
    }
  }, [currentConversationId, updateConversation, addToast])

  const toggleTheme = useCallback(() => {
    const newTheme = theme === "light" ? "dark" : "light"
    setTheme(newTheme)
    document.documentElement.classList.toggle("dark", newTheme === "dark")
    localStorage.setItem("theme", newTheme)
  }, [theme])

  if (!currentConv) {
    return (
      <header className="h-12 border-b border-border flex items-center justify-between px-2 sm:px-4 bg-card">
        <div className="flex items-center gap-2">
          {onMenuToggle && (
            <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden" onClick={onMenuToggle}>
              <Menu className="h-4 w-4" />
            </Button>
          )}
          {!ollamaAvailable && (
            <Badge variant="destructive" className="gap-1 text-xs">
              <AlertCircle className="w-3 h-3" />
              <span className="hidden sm:inline">Ollama not running</span>
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleTheme}>
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </header>
    )
  }

  return (
    <>
      <header className="h-12 border-b border-border flex items-center justify-between px-2 sm:px-4 bg-card">
        <div className="flex items-center gap-2 sm:gap-3">
          {onMenuToggle && (
            <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden" onClick={onMenuToggle}>
              <Menu className="h-4 w-4" />
            </Button>
          )}
          <ModelSelector
            models={models}
            selectedModel={currentConv.model}
            onSelect={handleModelChange}
            loading={modelLoading}
          />
          {!ollamaAvailable && (
            <Badge variant="destructive" className="gap-1 cursor-pointer" title="Download from https://ollama.com">
              <AlertCircle className="w-3 h-3" />
              Ollama unavailable &mdash; launch it
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleTheme}>
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>System Prompt</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="px-2 py-2">
                <textarea
                  className="w-full min-h-[100px] rounded-md border border-input bg-background p-2.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring font-mono"
                  placeholder="Enter a system prompt to set the behavior of the AI..."
                  value={currentConv?.system_prompt || ""}
                  onChange={(e) => handleSystemPromptChange(e.target.value)}
                />
                <div className="flex justify-between mt-2">
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => handleSystemPromptChange("")}>
                    Reset to default
                  </Button>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Default Model</label>
              <Input placeholder="llama-3.1-8b-instant" />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
