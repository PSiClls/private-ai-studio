"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { ImageIcon, Sparkles, Loader2, RefreshCw, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/components/ui/toast"

interface GeneratedImage {
  id: number
  prompt: string
  negative_prompt: string
  params: Record<string, any>
  image_path: string
  seed: number | null
  created_at: string
}

interface ImageStudioProps {
  initialPrompt?: string | null
  onPromptSet?: () => void
}

export function ImageStudio({ initialPrompt, onPromptSet }: ImageStudioProps) {
  const [prompt, setPrompt] = useState("")
  const [negativePrompt, setNegativePrompt] = useState("")
  const [steps, setSteps] = useState(4)
  const [generating, setGenerating] = useState(false)
  const [images, setImages] = useState<GeneratedImage[]>([])
  const [loadingGallery, setLoadingGallery] = useState(false)
  const [status, setStatus] = useState<{ available: boolean; device: string } | null>(null)
  const [taskIds, setTaskIds] = useState<string[]>([])
  const [taskStatuses, setTaskStatuses] = useState<Record<string, string>>({})
  const { addToast } = useToast()

  const loadGallery = useCallback(async () => {
    setLoadingGallery(true)
    try {
      const res = await fetch("/api/images/gallery?page=1&per_page=20")
      if (res.ok) {
        setImages(await res.json())
      }
    } catch {
      addToast("error", "Failed to load gallery")
    } finally {
      setLoadingGallery(false)
    }
  }, [addToast])

  const pollTasks = useCallback(async () => {
    const pending = taskIds.filter((id) => !taskStatuses[id] || taskStatuses[id] === "queued" || taskStatuses[id] === "processing")
    if (pending.length === 0) return
    const updated: Record<string, string> = {}
    for (const id of pending) {
      try {
        const res = await fetch(`/api/images/status/${id}`)
        if (res.ok) {
          const data = await res.json()
          updated[id] = data.status
        }
      } catch {
        // ignore
      }
    }
    setTaskStatuses((prev) => ({ ...prev, ...updated }))
    if (Object.values(updated).some((s) => s === "completed")) {
      loadGallery()
    }
  }, [taskIds, taskStatuses, loadGallery])

  useEffect(() => {
    loadGallery()
    const interval = setInterval(pollTasks, 3000)
    return () => clearInterval(interval)
  }, [loadGallery, pollTasks])

  useEffect(() => {
    if (initialPrompt) {
      setPrompt(initialPrompt)
      onPromptSet?.()
    }
  }, [initialPrompt])

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return
    setGenerating(true)
    try {
      const res = await fetch("/api/images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          negative_prompt: negativePrompt,
          steps,
          width: 512,
          height: 512,
          guidance_scale: 0,
        }),
      })
      if (!res.ok) {
        const errText = await res.text()
        throw new Error(errText || `HTTP ${res.status}`)
      }
      const data = await res.json()
      if (data.task_ids?.length) {
        setTaskIds((prev) => [...prev, ...data.task_ids])
        setTaskStatuses((prev) => ({
          ...prev,
          ...Object.fromEntries(data.task_ids.map((id: string) => [id, "queued"])),
        }))
      }
      addToast("success", "Generation queued", data.message || `Task ${data.task_ids?.length || 1} started`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Generation failed"
      addToast("error", "Generation failed", msg)
    } finally {
      setGenerating(false)
    }
  }, [prompt, negativePrompt, steps, addToast])

  const handleDelete = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/images/${id}`, { method: "DELETE" })
      if (res.ok) {
        setImages((prev) => prev.filter((img) => img.id !== id))
        addToast("success", "Image deleted")
      }
    } catch {
      addToast("error", "Failed to delete image")
    }
  }, [addToast])

  const handleRefresh = useCallback(() => {
    loadGallery()
    setTaskIds([])
    setTaskStatuses({})
  }, [loadGallery])

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/images/status")
      if (res.ok) setStatus(await res.json())
    } catch {
      setStatus({ available: false, device: "unknown" })
    }
  }, [])

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="border-b border-border p-4">
        <div className="max-w-3xl mx-auto space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <ImageIcon className="w-5 h-5" />
            <h2 className="font-semibold">Image Studio</h2>
            <Button variant="outline" size="sm" className="ml-auto text-xs gap-1" onClick={handleRefresh}>
              <RefreshCw className={`w-3 h-3 ${loadingGallery ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button variant="outline" size="sm" className="text-xs" onClick={checkStatus}>
              GPU
            </Button>
            {status && (
              <span className={`text-xs ${status.available ? "text-green-500" : "text-red-500"}`}>
                {status.available ? `GPU: ${status.device}` : "CPU only"}
              </span>
            )}
          </div>

          <div className="space-y-2">
            <textarea
              placeholder="Describe the image you want to generate..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex gap-2">
              <input
                placeholder="Negative prompt (optional)"
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">Steps:</label>
                <input
                  type="number"
                  value={steps}
                  onChange={(e) => setSteps(Number(e.target.value))}
                  min={1}
                  max={50}
                  className="w-16 rounded-lg border border-input bg-background px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <Button onClick={handleGenerate} disabled={generating || !prompt.trim()}>
                {generating ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Generate
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="max-w-5xl mx-auto">
          {images.length === 0 && !generating && (
            <div className="text-center py-16 text-muted-foreground">
              <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Enter a prompt and click Generate to create images</p>
              <p className="text-xs mt-1">SDXL-Turbo with 1-4 step generation</p>
            </div>
          )}

          {generating && (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
                <p className="text-sm text-muted-foreground">Generating...</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((img) => {
              const filename = img.image_path.split("\\").pop()?.split("/").pop()
              return (
                <div key={img.id} className="group relative rounded-lg overflow-hidden border bg-card">
                  <img
                    src={`/api/images/file/${filename}`}
                    alt={img.prompt}
                    className="w-full aspect-square object-cover"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                    <p className="text-xs text-white line-clamp-2">{img.prompt}</p>
                    <p className="text-xs text-white/70 mt-1">Seed: {img.seed}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 absolute top-2 right-2 text-white/80 hover:text-white hover:bg-white/20"
                      onClick={(e) => { e.stopPropagation(); handleDelete(img.id) }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Task progress indicators */}
          {Object.entries(taskStatuses).filter(([, s]) => s !== "completed" && s !== "failed").length > 0 && (
            <div className="mt-6 p-3 rounded-lg border bg-card">
              <p className="text-xs font-medium mb-2">Active generations:</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(taskStatuses).filter(([, s]) => s !== "completed" && s !== "failed").map(([id, s]) => (
                  <span key={id} className="text-[10px] bg-muted px-2 py-1 rounded flex items-center gap-1">
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
