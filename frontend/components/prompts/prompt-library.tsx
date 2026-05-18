"use client"

import { useState, useEffect, useCallback } from "react"
import {
  BookOpen, Plus, Search, Edit3, Trash2,
  Download, Upload, Play, MessageSquare,
  Filter, ArrowUpDown, ImageIcon, GitBranch,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/toast"

interface Prompt {
  id: number
  title: string
  content: string
  category: string
  tags: string[]
  variables: string[]
  created_at: string
  updated_at: string
}

function detectVariables(text: string): string[] {
  const matches = text.match(/\{(\w+)\}/g)
  if (!matches) return []
  const unique = new Set(matches.map((m) => m.slice(1, -1)))
  return Array.from(unique)
}

interface PromptLibraryProps {
  onSendToChat?: (text: string) => void
  onUseInImageStudio?: (text: string) => void
  onAddToWorkflow?: (text: string) => void
}

export function PromptLibrary({ onSendToChat, onUseInImageStudio, onAddToWorkflow }: PromptLibraryProps) {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [sort, setSort] = useState("updated")
  const { addToast } = useToast()
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<Partial<Prompt> | null>(null)
  const [testResult, setTestResult] = useState("")
  const [testOpen, setTestOpen] = useState(false)
  const [testPrompt, setTestPrompt] = useState<Prompt | null>(null)
  const [variableValues, setVariableValues] = useState<Record<string, string>>({})

  const loadPrompts = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (selectedCategory && selectedCategory !== "all") params.set("category", selectedCategory)
      if (search) params.set("search", search)
      params.set("sort", sort)
      const res = await fetch(`/api/prompts?${params}`)
      if (res.ok) setPrompts(await res.json())
    } catch (err) {
      addToast("error", "Failed to load prompts", err instanceof Error ? err.message : undefined)
    }
  }, [selectedCategory, search, sort, addToast])

  useEffect(() => {
    loadPrompts()
  }, [loadPrompts])

  const savePrompt = async () => {
    if (!editingPrompt?.title?.trim() || !editingPrompt?.content?.trim()) return
    try {
      const body = {
        title: editingPrompt.title,
        content: editingPrompt.content,
        category: editingPrompt.category || "general",
        tags: editingPrompt.tags || [],
      }
      if (editingPrompt.id) {
        await fetch(`/api/prompts/${editingPrompt.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      } else {
        await fetch(`/api/prompts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      }
      setEditorOpen(false)
      setEditingPrompt(null)
      loadPrompts()
    } catch (err) {
      addToast("error", "Failed to save prompt", err instanceof Error ? err.message : undefined)
    }
  }

  const deletePrompt = useCallback(async (id: number) => {
    try {
      await fetch(`/api/prompts/${id}`, { method: "DELETE" })
      setPrompts((p) => p.filter((x) => x.id !== id))
    } catch (err) {
      addToast("error", "Failed to delete prompt", err instanceof Error ? err.message : undefined)
    }
  }, [addToast])

  const openEditor = (p?: Prompt) => {
    setEditingPrompt(p ? { ...p } : { title: "", content: "", category: "general", tags: [] })
    setEditorOpen(true)
  }

  const runTest = async () => {
    if (!testPrompt) return
    try {
      const res = await fetch(`/api/prompts/${testPrompt.id}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt_id: testPrompt.id, variables: variableValues, model: "llama3.2" }),
      })
      if (res.ok) {
        const data = await res.json()
        setTestResult(data.response || "No response")
      } else {
        addToast("error", "Test failed", `HTTP ${res.status}`)
      }
    } catch (err) {
      addToast("error", "Test failed", err instanceof Error ? err.message : undefined)
    }
  }

  const exportPrompts = async () => {
    try {
      const res = await fetch(`/api/prompts/export/all`)
      if (res.ok) {
        const data = await res.json()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url; a.download = "prompts_export.json"; a.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      addToast("error", "Export failed", err instanceof Error ? err.message : undefined)
    }
  }

  const importPrompts = () => {
    const input = document.createElement("input")
    input.type = "file"; input.accept = ".json"
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement
      const file = target.files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        await fetch(`/api/prompts/import`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
        loadPrompts()
      } catch (err) {
        addToast("error", "Import failed", err instanceof Error ? err.message : "Invalid JSON")
      }
    }
    input.click()
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Toolbar */}
      <div className="border-b border-border p-4">
        <div className="max-w-5xl mx-auto space-y-3">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5" />
            <h2 className="font-semibold">Prompt Library</h2>
            <div className="flex-1" />
            <Button variant="outline" size="sm" className="gap-1" onClick={exportPrompts}>
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
            <Button variant="outline" size="sm" className="gap-1" onClick={importPrompts}>
              <Upload className="w-3.5 h-3.5" /> Import
            </Button>
            <Button size="sm" onClick={() => openEditor()}>
              <Plus className="w-4 h-4 mr-2" /> New Prompt
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search prompts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-9 w-36">
                <Filter className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="coding">Coding</SelectItem>
                <SelectItem value="writing">Writing</SelectItem>
                <SelectItem value="analysis">Analysis</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="h-9 w-40">
                <ArrowUpDown className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated">Recently Updated</SelectItem>
                <SelectItem value="created">Recently Created</SelectItem>
                <SelectItem value="alpha">A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Grid */}
      <ScrollArea className="flex-1 p-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          {prompts.map((p) => (
            <div key={p.id} className="rounded-lg border bg-card p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{p.title}</h3>
                  <Badge variant="secondary" className="text-[10px] mt-1">{p.category}</Badge>
                </div>
                <div className="flex gap-0.5 shrink-0 ml-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Play className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setTestPrompt(p); setTestResult(""); setVariableValues({}); setTestOpen(true)
                      }}>
                        <Play className="h-3.5 w-3.5 mr-2" /> Test Run
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        const filledContent = p.content.replace(/\{(\w+)\}/g, (_, key) => variableValues[key] || `{${key}}`)
                        if (onSendToChat) onSendToChat(filledContent)
                      }}>
                        <MessageSquare className="h-3.5 w-3.5 mr-2" /> Send to Chat
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        const filledContent = p.content.replace(/\{(\w+)\}/g, (_, key) => variableValues[key] || `{${key}}`)
                        if (onUseInImageStudio) onUseInImageStudio(filledContent)
                      }}>
                        <ImageIcon className="h-3.5 w-3.5 mr-2" /> Use in Image Studio
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        const filledContent = p.content.replace(/\{(\w+)\}/g, (_, key) => variableValues[key] || `{${key}}`)
                        if (onAddToWorkflow) onAddToWorkflow(filledContent)
                      }}>
                        <GitBranch className="h-3.5 w-3.5 mr-2" /> Add to Workflow
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditor(p)}>
                    <Edit3 className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deletePrompt(p.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap font-mono text-xs">
                {p.content}
              </p>
              {p.variables.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {p.variables.map((v) => (
                    <span key={v} className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">
                      {'{'}{v}{'}'}
                    </span>
                  ))}
                </div>
              )}
              {p.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {p.tags.map((t) => (
                    <span key={t} className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Editor Dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingPrompt?.id ? "Edit Prompt" : "New Prompt"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Prompt title"
              value={editingPrompt?.title || ""}
              onChange={(e) => setEditingPrompt((p) => ({ ...p, title: e.target.value }))}
            />
            <div className="flex gap-3">
              <Select
                value={editingPrompt?.category || "general"}
                onValueChange={(v) => setEditingPrompt((p) => ({ ...p, category: v }))}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="coding">Coding</SelectItem>
                  <SelectItem value="writing">Writing</SelectItem>
                  <SelectItem value="analysis">Analysis</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Tags (comma separated)"
                value={(editingPrompt?.tags || []).join(", ")}
                onChange={(e) => setEditingPrompt((p) => ({
                  ...p, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean)
                }))}
                className="flex-1"
              />
            </div>
            <div className="relative">
              <textarea
                placeholder="Write your prompt here... Use {variable_name} for placeholders"
                value={editingPrompt?.content || ""}
                onChange={(e) => setEditingPrompt((p) => ({ ...p, content: e.target.value }))}
                className="w-full min-h-[200px] rounded-md border border-input bg-background p-3 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {editingPrompt?.content && detectVariables(editingPrompt.content).length > 0 && (
              <div className="bg-muted/50 rounded-md p-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">Detected Variables:</p>
                <div className="flex flex-wrap gap-2">
                  {detectVariables(editingPrompt.content).map((v) => (
                    <Badge key={v} variant="outline" className="font-mono text-xs">
                      {'{'}{v}{'}'}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button onClick={savePrompt}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Dialog */}
      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Test: {testPrompt?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {testPrompt?.variables.map((v) => (
              <div key={v}>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  {'{'}{v}{'}'}
                </label>
                <Input
                  value={variableValues[v] || ""}
                  onChange={(e) => setVariableValues((pv) => ({ ...pv, [v]: e.target.value }))}
                  placeholder={`Enter value for ${v}`}
                />
              </div>
            ))}
            {testResult && (
              <div className="rounded-md border bg-card p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Response:</p>
                <p className="text-sm whitespace-pre-wrap">{testResult}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestOpen(false)}>Close</Button>
            <Button onClick={runTest} disabled={!testPrompt}>
              <Play className="w-4 h-4 mr-2" /> Run Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
