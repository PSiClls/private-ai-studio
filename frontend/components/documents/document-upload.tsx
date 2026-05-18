"use client"

import { useState, useCallback, useRef } from "react"
import { Upload, File, X, Loader2, AlertCircle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/toast"

const MAX_SIZE_MB = 50
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024
const SUPPORTED = [".txt", ".md", ".csv", ".pdf", ".docx"]
const SUPPORTED_LABEL = SUPPORTED.join(", ")

interface DocumentUploadProps {
  onUploadComplete: () => void
}

export function DocumentUpload({ onUploadComplete }: DocumentUploadProps) {
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState("")
  const [chunkSize, setChunkSize] = useState(1000)
  const [chunkOverlap, setChunkOverlap] = useState(200)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { addToast } = useToast()

  const validateFile = useCallback((file: File): string | null => {
    const ext = "." + file.name.split(".").pop()?.toLowerCase()
    if (!SUPPORTED.includes(ext)) {
      return `Unsupported file type '${ext}'. Supported: ${SUPPORTED_LABEL}`
    }
    if (file.size > MAX_SIZE_BYTES) {
      return `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum: ${MAX_SIZE_MB} MB`
    }
    if (file.size === 0) {
      return "File is empty"
    }
    return null
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => setDragOver(false), [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (!file) return
      const err = validateFile(file)
      if (err) {
        setError(err)
        addToast("error", "Invalid file", err)
        return
      }
      setError(null)
      setSelectedFile(file)
    },
    [validateFile, addToast]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      const err = validateFile(file)
      if (err) {
        setError(err)
        addToast("error", "Invalid file", err)
        return
      }
      setError(null)
      setSelectedFile(file)
    },
    [validateFile, addToast]
  )

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return
    setUploading(true)
    setProgress(0)
    setProgressLabel("Uploading...")
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("chunk_size", String(chunkSize))
      formData.append("chunk_overlap", String(chunkOverlap))

      setProgress(15)
      setProgressLabel("Uploading...")

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }))
        throw new Error(errData.detail || `Upload failed (${res.status})`)
      }

      setProgress(60)
      setProgressLabel("Processing & embedding...")

      const doc = await res.json()
      setProgress(100)
      setProgressLabel("Complete!")

      addToast("success", "Document uploaded", `${selectedFile.name} — ${doc.chunk_count} chunks created`)
      setSelectedFile(null)
      onUploadComplete()

      setTimeout(() => {
        setProgress(0)
        setProgressLabel("")
      }, 1500)

    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed"
      setError(msg)
      addToast("error", "Upload failed", msg)
    } finally {
      setUploading(false)
    }
  }, [selectedFile, chunkSize, chunkOverlap, addToast, onUploadComplete])

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
          dragOver
            ? "border-primary bg-primary/5"
            : error
              ? "border-red-300 bg-red-500/5"
              : "border-border hover:border-muted-foreground/50"
        )}
        onClick={() => !uploading && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={SUPPORTED.map((e) => e).join(",")}
          className="hidden"
          onChange={handleFileSelect}
          disabled={uploading}
        />

        {uploading ? (
          <div className="space-y-3">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <div className="w-full max-w-xs mx-auto bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">{progressLabel}</p>
          </div>
        ) : (
          <>
            <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm font-medium">
              {error ? (
                <span className="text-destructive flex items-center justify-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </span>
              ) : (
                "Drag & drop a file here, or click to browse"
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Supported: {SUPPORTED_LABEL} (max {MAX_SIZE_MB} MB)
            </p>
          </>
        )}
      </div>

      {/* Selected file */}
      {selectedFile && !uploading && (
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
          <File className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => { setSelectedFile(null); setError(null) }}
          >
            <X className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={handleUpload}>
            Upload & Process
          </Button>
        </div>
      )}

      {/* Chunk config */}
      <details className="text-sm">
        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
          Chunk settings
        </summary>
        <div className="flex gap-4 mt-2">
          <div className="space-y-1 flex-1">
            <label className="text-xs font-medium text-muted-foreground">Chunk Size</label>
            <input
              type="number"
              value={chunkSize}
              onChange={(e) => setChunkSize(Math.max(100, Math.min(5000, Number(e.target.value))))}
              min={100}
              max={5000}
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            />
          </div>
          <div className="space-y-1 flex-1">
            <label className="text-xs font-medium text-muted-foreground">Chunk Overlap</label>
            <input
              type="number"
              value={chunkOverlap}
              onChange={(e) => setChunkOverlap(Math.max(0, Math.min(1000, Number(e.target.value))))}
              min={0}
              max={1000}
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            />
          </div>
        </div>
      </details>
    </div>
  )
}
