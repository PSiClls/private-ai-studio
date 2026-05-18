"use client"

import { useState, useEffect, useCallback } from "react"
import { useChatStore } from "@/store/chat-store"
import { ConversationList } from "@/components/chat/conversation-list"
import { api } from "@/lib/api"
import { PanelLeftClose, PanelLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import type { Message } from "@/types"

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const {
    conversations,
    currentConversationId,
    setConversations,
    addConversation,
    removeConversation,
    updateConversation,
    setCurrentConversationId,
    setMessages,
  } = useChatStore()

  const [searchQuery, setSearchQuery] = useState("")
  const [messagesByConv, setMessagesByConv] = useState<Record<number, Message[]>>({})
  const { addToast } = useToast()

  useEffect(() => {
    api.conversations.list().then(setConversations).catch((err) => {
      addToast("error", "Failed to load conversations", err instanceof Error ? err.message : undefined)
    })
  }, [setConversations, addToast])

  useEffect(() => {
    const fetchMissing = conversations
      .filter((conv) => !messagesByConv[conv.id])
      .map((conv) =>
        api.conversations.messages.list(conv.id).then((msgs) => {
          setMessagesByConv((prev) => ({ ...prev, [conv.id]: msgs }))
        })
      )
    Promise.all(fetchMissing).catch((err) => {
      addToast("warning", "Failed to load some messages", err instanceof Error ? err.message : undefined)
    })
  }, [conversations, addToast])

  const handleNew = useCallback(async () => {
    try {
      const conv = await api.conversations.create({})
      addConversation(conv)
      setMessages([])
    } catch (err) {
      addToast("error", "Failed to create conversation", err instanceof Error ? err.message : undefined)
    }
  }, [addConversation, setMessages, addToast])

  const handleSelect = useCallback(async (id: number) => {
    setCurrentConversationId(id)
    try {
      const msgs = await api.conversations.messages.list(id)
      setMessages(msgs)
      setMessagesByConv((prev) => ({ ...prev, [id]: msgs }))
    } catch (err) {
      addToast("error", "Failed to load messages", err instanceof Error ? err.message : undefined)
    }
  }, [setCurrentConversationId, setMessages, addToast])

  const handleDelete = useCallback(async (id: number) => {
    try {
      await api.conversations.delete(id)
      removeConversation(id)
      if (useChatStore.getState().currentConversationId === id) {
        setCurrentConversationId(null)
        setMessages([])
      }
    } catch (err) {
      addToast("error", "Failed to delete conversation", err instanceof Error ? err.message : undefined)
    }
  }, [removeConversation, setCurrentConversationId, setMessages, addToast])

  const handleRename = useCallback(async (id: number, title: string) => {
    try {
      await api.conversations.update(id, { title })
      updateConversation(id, { title })
    } catch (err) {
      addToast("error", "Failed to rename conversation", err instanceof Error ? err.message : undefined)
    }
  }, [updateConversation, addToast])

  if (collapsed) {
    return (
      <div className="w-12 border-r border-border flex flex-col items-center py-3 gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggle}>
          <PanelLeft className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="w-72 max-w-[85vw] border-r border-border flex flex-col bg-card">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <span className="text-sm font-semibold">Private AI Studio</span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggle}>
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-hidden">
        <ConversationList
          conversations={conversations}
          messagesByConv={messagesByConv}
          currentId={currentConversationId}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelect={handleSelect}
          onNew={handleNew}
          onDelete={handleDelete}
          onRename={handleRename}
        />
      </div>
    </div>
  )
}
