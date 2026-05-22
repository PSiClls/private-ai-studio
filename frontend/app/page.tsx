"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { ChatInterface } from "@/components/chat/chat-interface"
import { ImageStudio } from "@/components/images/image-studio"
import { DocumentStudio } from "@/components/documents/document-studio"
import { WorkflowBuilder } from "@/components/workflows/workflow-builder"
import { PromptLibrary } from "@/components/prompts/prompt-library"
import { ToastProvider } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { MessageSquare, ImageIcon, FileText, Workflow, BookOpen } from "lucide-react"
import { api } from "@/lib/api"

type Studio = "chat" | "images" | "documents" | "workflows" | "prompts"

export default function Home() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [activeStudio, setActiveStudio] = useState<Studio>("chat")
  const [ollamaOk, setOllamaOk] = useState<boolean | null>(null)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [pendingChatMessage, setPendingChatMessage] = useState<string | null>(null)
  const [pendingImagePrompt, setPendingImagePrompt] = useState<string | null>(null)
  const [pendingWorkflowNode, setPendingWorkflowNode] = useState<string | null>(null)

  useEffect(() => {
    if (pendingChatMessage) setActiveStudio("chat")
    if (pendingImagePrompt) setActiveStudio("images")
    if (pendingWorkflowNode) setActiveStudio("workflows")
  }, [pendingChatMessage, pendingImagePrompt, pendingWorkflowNode])

  useEffect(() => {
    const isMobile = window.innerWidth < 768
    setSidebarCollapsed(isMobile)
    api.health()
      .then((h) => setOllamaOk(h.ollama))
      .catch(() => setOllamaOk(false))
  }, [])

  // Keep Render free tier from spinning down
  useEffect(() => {
    const interval = setInterval(() => {
      api.health().catch(() => {})
    }, 300000) // every 5 minutes
    return () => clearInterval(interval)
  }, [])

  const studios: { id: Studio; label: string; icon: typeof MessageSquare }[] = [
    { id: "chat", label: "Chat", icon: MessageSquare },
    { id: "images", label: "Images", icon: ImageIcon },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "workflows", label: "Workflows", icon: Workflow },
    { id: "prompts", label: "Prompts", icon: BookOpen },
  ]

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "1") { e.preventDefault(); setActiveStudio("chat") }
      if ((e.ctrlKey || e.metaKey) && e.key === "2") { e.preventDefault(); setActiveStudio("images") }
      if ((e.ctrlKey || e.metaKey) && e.key === "3") { e.preventDefault(); setActiveStudio("documents") }
      if ((e.ctrlKey || e.metaKey) && e.key === "4") { e.preventDefault(); setActiveStudio("workflows") }
      if ((e.ctrlKey || e.metaKey) && e.key === "5") { e.preventDefault(); setActiveStudio("prompts") }
    },
    []
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  if (ollamaOk === null) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-pulse flex items-center justify-center">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-primary animate-pulse" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Connecting to backend...</p>
        </div>
      </div>
    )
  }

  return (
    <ToastProvider>
      <div className="h-screen flex overflow-hidden bg-background">
        {/* Mobile sidebar backdrop */}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}
        {/* Sidebar: always visible on desktop, overlay on mobile */}
        <div className={`${sidebarCollapsed ? 'hidden md:flex' : 'fixed inset-y-0 left-0 z-50 md:relative md:z-auto'} ${sidebarCollapsed ? '' : 'flex'}`}>
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggle={() => {
              setSidebarCollapsed(!sidebarCollapsed)
              setMobileSidebarOpen(false)
            }}
          />
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <Header onMenuToggle={() => {
            setSidebarCollapsed(false)
            setMobileSidebarOpen(true)
          }} />
          <div className="flex overflow-x-auto border-b border-border bg-card">
            {studios.map((s, i) => (
              <Button
                key={s.id}
                variant="ghost"
                size="sm"
                className={`relative rounded-none border-b-2 ${
                  activeStudio === s.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveStudio(s.id)}
                title={`Ctrl+${i + 1}`}
              >
                <s.icon className="w-4 h-4 mr-2" />
                {s.label}
                <span className="ml-1.5 text-[10px] text-muted-foreground/40 hidden sm:inline">
                  Ctrl+{i + 1}
                </span>
              </Button>
            ))}
          </div>
          {activeStudio === "chat" && <ChatInterface initialMessage={pendingChatMessage} onMessageSent={() => setPendingChatMessage(null)} />}
          {activeStudio === "images" && <ImageStudio initialPrompt={pendingImagePrompt} onPromptSet={() => setPendingImagePrompt(null)} />}
          {activeStudio === "documents" && <DocumentStudio />}
          {activeStudio === "workflows" && <WorkflowBuilder initialPromptNode={pendingWorkflowNode} onPromptNodeSet={() => setPendingWorkflowNode(null)} />}
          {activeStudio === "prompts" && <PromptLibrary onSendToChat={(text) => setPendingChatMessage(text)} onUseInImageStudio={(text) => setPendingImagePrompt(text)} onAddToWorkflow={(text) => setPendingWorkflowNode(text)} />}
        </div>
      </div>
    </ToastProvider>
  )
}
