"use client"

import { useState, useMemo, useCallback } from "react"
import { MessageSquare, Plus, Trash2, Search, ArrowUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Conversation, Message } from "@/types"

type SortMode = "newest" | "oldest" | "alpha-asc" | "alpha-desc"

interface ConversationListProps {
  conversations: Conversation[]
  messagesByConv: Record<number, Message[]>
  currentId: number | null
  searchQuery: string
  onSearchChange: (q: string) => void
  onSelect: (id: number) => void
  onNew: () => void
  onDelete: (id: number) => void
  onRename: (id: number, title: string) => void
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export function ConversationList({
  conversations,
  messagesByConv,
  currentId,
  searchQuery,
  onSearchChange,
  onSelect,
  onNew,
  onDelete,
  onRename,
}: ConversationListProps) {
  const [sortMode, setSortMode] = useState<SortMode>("newest")
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editValue, setEditValue] = useState("")

  const filtered = useMemo(() => {
    let list = conversations
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter((c) => c.title.toLowerCase().includes(q))
    }
    const sorted = [...list]
    switch (sortMode) {
      case "newest":
        sorted.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        break
      case "oldest":
        sorted.sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime())
        break
      case "alpha-asc":
        sorted.sort((a, b) => a.title.localeCompare(b.title))
        break
      case "alpha-desc":
        sorted.sort((a, b) => b.title.localeCompare(a.title))
        break
    }
    return sorted
  }, [conversations, searchQuery, sortMode])

  const handleDoubleClick = useCallback((conv: Conversation) => {
    setEditingId(conv.id)
    setEditValue(conv.title)
  }, [])

  const handleRenameSubmit = useCallback((id: number) => {
    if (editValue.trim()) {
      onRename(id, editValue.trim())
    }
    setEditingId(null)
  }, [editValue, onRename])

  const lastMessage = useCallback((convId: number): string => {
    const msgs = messagesByConv[convId]
    if (!msgs || msgs.length === 0) return ""
    const last = msgs[msgs.length - 1]
    const text = last.content.replace(/\n/g, " ").trim()
    return text.length > 60 ? text.slice(0, 60) + "..." : text
  }, [messagesByConv])

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Conversations
          </h2>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNew}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <Select value={sortMode} onValueChange={(v: SortMode) => setSortMode(v)}>
          <SelectTrigger className="h-8 text-xs">
            <ArrowUpDown className="h-3 w-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
            <SelectItem value="alpha-asc">A-Z</SelectItem>
            <SelectItem value="alpha-desc">Z-A</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-0.5 px-2 pb-2">
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              {searchQuery ? "No conversations found" : "No conversations yet — click + to start"}
            </p>
          )}
          {filtered.map((conv) => (
            <div
              key={conv.id}
              className={cn(
                "group relative flex flex-col gap-0.5 px-3 py-2.5 rounded-lg cursor-pointer transition-colors",
                conv.id === currentId ? "bg-accent" : "hover:bg-accent/50"
              )}
              onClick={() => {
                if (editingId !== conv.id) onSelect(conv.id)
              }}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                <div className="flex-1 min-w-0">
                  {editingId === conv.id ? (
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => handleRenameSubmit(conv.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRenameSubmit(conv.id)
                        if (e.key === "Escape") setEditingId(null)
                      }}
                      className="w-full text-sm font-medium bg-background border border-input rounded px-1 py-0.5"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <p
                      className="text-sm font-medium truncate"
                      onDoubleClick={(e) => {
                        e.stopPropagation()
                        handleDoubleClick(conv)
                      }}
                      title="Double-click to rename"
                    >
                      {conv.title}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {lastMessage(conv.id) || "No messages yet"}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                    {timeAgo(conv.updated_at)}
                  </p>
                </div>
              </div>
              <div className={cn(
                "absolute right-2 top-2 hidden group-hover:flex items-center gap-0",
                conv.id === currentId ? "flex" : ""
              )}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(conv.id)
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
