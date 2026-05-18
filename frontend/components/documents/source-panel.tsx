"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, FileText, ExternalLink } from "lucide-react"

interface Source {
  id: string
  text: string
  metadata: Record<string, any>
  score: number
  document_id: number
}

interface SourcePanelProps {
  sources: Source[]
}

export function SourcePanel({ sources }: SourcePanelProps) {
  const [expanded, setExpanded] = useState(false)
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set())

  const toggleSource = (id: string) => {
    setExpandedSources((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (!sources || sources.length === 0) return null

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      <button
        className="flex items-center gap-2 w-full px-4 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <FileText className="h-3.5 w-3.5" />
        <span>{sources.length} source{sources.length !== 1 ? "s" : ""}</span>
        {expanded ? <ChevronUp className="h-3.5 w-3.5 ml-auto" /> : <ChevronDown className="h-3.5 w-3.5 ml-auto" />}
      </button>

      {expanded && (
        <div className="border-t divide-y divide-border">
          {sources.map((source, i) => {
            const filename = source.metadata?.filename || `doc_${source.document_id}`
            const page = source.metadata?.page_number
            const isExpanded = expandedSources.has(source.id)
            const text = source.text || ""

            return (
              <div key={source.id} className="text-sm">
                <button
                  className="flex items-center gap-2 w-full px-4 py-2 hover:bg-accent/50 transition-colors text-left"
                  onClick={() => toggleSource(source.id)}
                >
                  <span className="flex items-center justify-center w-5 h-5 rounded bg-primary/10 text-primary text-[10px] font-bold shrink-0">
                    {i + 1}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="text-xs font-medium truncate block">{filename}</span>
                    <span className="text-[10px] text-muted-foreground">
                      Score: {(source.score * 100).toFixed(0)}%
                      {page ? ` · Page ${page}` : ""}
                    </span>
                  </span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                </button>

                {isExpanded && (
                  <div className="px-4 pb-3">
                    <div className="bg-muted/50 rounded-md p-3 text-xs text-muted-foreground leading-relaxed max-h-32 overflow-y-auto">
                      &ldquo;{text}&rdquo;
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
