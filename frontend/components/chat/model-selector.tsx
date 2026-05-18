"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import type { OllamaModel } from "@/types"

interface ModelSelectorProps {
  models: OllamaModel[]
  selectedModel: string
  onSelect: (model: string) => void
  loading?: boolean
}

export function ModelSelector({
  models,
  selectedModel,
  onSelect,
  loading,
}: ModelSelectorProps) {
  if (loading) {
    return <Skeleton className="h-10 w-48" />
  }

  return (
    <Select value={selectedModel} onValueChange={onSelect}>
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Select model" />
      </SelectTrigger>
      <SelectContent>
        {models.length === 0 && (
          <SelectItem value="none" disabled>
            No models available
          </SelectItem>
        )}
        {models.map((model) => (
          <SelectItem key={model.name} value={model.name}>
            {model.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
