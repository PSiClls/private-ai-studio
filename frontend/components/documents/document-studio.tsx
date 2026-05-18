"use client"

import { useState, useCallback } from "react"
import { FileText } from "lucide-react"
import { DocumentList } from "./document-list"
import { ScrollArea } from "@/components/ui/scroll-area"

export function DocumentStudio() {
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [refreshKey, setRefreshKey] = useState(0)

  const handleToggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }, [])

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="border-b border-border p-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-5 h-5" />
            <h2 className="font-semibold">Documents</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Upload documents to enable RAG-powered chat. Supported: PDF, DOCX, TXT, MD, CSV
          </p>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="max-w-3xl mx-auto">
          <DocumentList
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onRefresh={handleRefresh}
            refreshKey={refreshKey}
          />
        </div>
      </ScrollArea>
    </div>
  )
}
