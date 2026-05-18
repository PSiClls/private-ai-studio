"use client"

import { useEffect, useState, useCallback } from "react"
import { FileText, BookOpen, Loader2, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/toast"
import { useChatStore } from "@/store/chat-store"

interface DocItem {
  id: number
  filename: string
  chunk_count: number
  status: string
}

export function RagDocPicker() {
  const { ragMode, ragDocumentIds, setRagMode, setRagDocumentIds } = useChatStore()
  const [docs, setDocs] = useState<DocItem[]>([])
  const [loading, setLoading] = useState(false)
  const { addToast } = useToast()

  const loadDocs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/documents")
      if (res.ok) {
        const data = await res.json()
        setDocs(data.filter((d: DocItem) => d.status === "ready"))
      }
    } catch {
      addToast("error", "Failed to load documents")
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => {
    if (ragMode) loadDocs()
  }, [ragMode, loadDocs])

  const toggleDoc = useCallback((id: number) => {
    const store = useChatStore.getState()
    const current = store.ragDocumentIds
    store.setRagDocumentIds(
      current.includes(id)
        ? current.filter((did) => did !== id)
        : [...current, id]
    )
  }, [])

  const readyDocs = docs.filter((d) => d.status === "ready")

  return (
    <div className="border-t border-border bg-card">
      <div className="max-w-3xl mx-auto px-4 py-2">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={ragMode}
              onChange={(e) => {
                setRagMode(e.target.checked)
                if (!e.target.checked) setRagDocumentIds([])
              }}
              className="rounded border-input"
            />
            <BookOpen className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">Chat with Documents</span>
          </label>

          {ragMode && (
            <div className="flex items-center gap-2 flex-1">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : readyDocs.length === 0 ? (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  No documents ready — upload one first
                </span>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {readyDocs.map((doc) => (
                    <Badge
                      key={doc.id}
                      variant={ragDocumentIds.includes(doc.id) ? "default" : "outline"}
                      className="cursor-pointer text-[10px] h-5 gap-1"
                      onClick={() => toggleDoc(doc.id)}
                    >
                      <FileText className="h-3 w-3" />
                      {doc.filename.length > 20
                        ? doc.filename.slice(0, 18) + "..."
                        : doc.filename}
                    </Badge>
                  ))}
                </div>
              )}
              {ragDocumentIds.length > 0 && (
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {ragDocumentIds.length} selected
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
