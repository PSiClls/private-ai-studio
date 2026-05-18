"use client"

import { useEffect, useState, useCallback } from "react"
import { FileText, Trash2, CheckCircle, Clock, AlertCircle, Loader2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/components/ui/toast"
import { DocumentUpload } from "./document-upload"

interface DocItem {
  id: number
  filename: string
  file_type: string
  file_size: number
  chunk_count: number
  status: string
  created_at: string
}

interface DocumentListProps {
  selectedIds: number[]
  onToggleSelect: (id: number) => void
  onRefresh: () => void
  refreshKey: number
}

const statusIcons: Record<string, typeof CheckCircle> = {
  ready: CheckCircle,
  processing: Loader2,
  error: AlertCircle,
  pending: Clock,
}

const statusColors: Record<string, string> = {
  ready: "text-green-500",
  processing: "text-blue-500 animate-spin",
  error: "text-red-500",
  pending: "text-yellow-500",
}

export function DocumentList({ selectedIds, onToggleSelect, onRefresh, refreshKey }: DocumentListProps) {
  const [documents, setDocuments] = useState<DocItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const { addToast } = useToast()

  const loadDocuments = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/documents")
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setDocuments(await res.json())
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load documents"
      setError(msg)
      addToast("error", "Failed to load documents", "Make sure the backend is running.")
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => {
    loadDocuments()
  }, [refreshKey, loadDocuments])

  const handleDelete = useCallback(async (id: number, filename: string) => {
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setDocuments((prev) => prev.filter((d) => d.id !== id))
      const stillSelected = selectedIds.filter((sid) => sid !== id)
      if (stillSelected.length !== selectedIds.length) {
        onToggleSelect(id)
      }
      addToast("success", "Document deleted", filename)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delete failed"
      addToast("error", "Delete failed", msg)
    }
  }, [selectedIds, onToggleSelect, addToast])

  const handleUploadComplete = useCallback(() => {
    setShowUpload(false)
    onRefresh()
    loadDocuments()
  }, [onRefresh, loadDocuments])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading documents...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-8 w-8 mx-auto mb-3 text-destructive" />
        <p className="text-sm font-medium text-destructive">Failed to load documents</p>
        <p className="text-xs text-muted-foreground mt-1">{error}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={loadDocuments}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Upload section */}
      {showUpload ? (
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">Upload Document</h3>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setShowUpload(false)}>
              Cancel
            </Button>
          </div>
          <DocumentUpload onUploadComplete={handleUploadComplete} />
        </div>
      ) : (
        <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => setShowUpload(true)}>
          <Upload className="h-4 w-4" />
          Upload Document
        </Button>
      )}

      {/* Document count */}
      {documents.length > 0 && (
        <p className="text-xs text-muted-foreground px-1">
          {documents.length} document{documents.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* Empty state */}
      {documents.length === 0 && !showUpload && (
        <div className="text-center py-8">
          <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No documents uploaded</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Upload a PDF, DOCX, TXT, MD, or CSV to enable RAG-powered chat
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3 gap-2"
            onClick={() => setShowUpload(true)}
          >
            <Upload className="h-4 w-4" />
            Upload your first document
          </Button>
        </div>
      )}

      {/* Document list */}
      {documents.length > 0 && (
        <ScrollArea className="max-h-[280px] -mx-1 px-1">
          <div className="space-y-1">
            {documents.map((doc) => {
              const StatusIcon = statusIcons[doc.status] || Clock
              const isSelected = selectedIds.includes(doc.id)
              return (
                <div
                  key={doc.id}
                  className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                    isSelected ? "bg-accent ring-1 ring-primary/30" : "hover:bg-accent/50"
                  }`}
                  onClick={() => onToggleSelect(doc.id)}
                >
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate font-medium">{doc.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.chunk_count} chunk{doc.chunk_count !== 1 ? "s" : ""} &middot; {(doc.file_size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] gap-1 py-0 h-5">
                    <StatusIcon className={`h-3 w-3 ${statusColors[doc.status] || ""}`} />
                    {doc.status}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(doc.id, doc.filename)
                    }}
                    title="Delete document"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
