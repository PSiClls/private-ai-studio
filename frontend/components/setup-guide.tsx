"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const ollamaSteps = [
  {
    platform: "macOS",
    steps: [
      'Download from <a href="https://ollama.com/download" class="underline underline-offset-2">ollama.com/download</a>',
      "Open the downloaded .zip and drag Ollama to Applications",
      'Open Terminal and run: <code class="text-xs bg-muted px-1 py-0.5 rounded">ollama pull llama3.2</code>',
      'Verify: <code class="text-xs bg-muted px-1 py-0.5 rounded">ollama list</code>',
    ],
  },
  {
    platform: "Windows",
    steps: [
      'Download from <a href="https://ollama.com/download" class="underline underline-offset-2">ollama.com/download</a>',
      "Run the installer and follow the prompts",
      'Open PowerShell and run: <code class="text-xs bg-muted px-1 py-0.5 rounded">ollama pull llama3.2</code>',
      'Verify: <code class="text-xs bg-muted px-1 py-0.5 rounded">ollama list</code>',
    ],
  },
  {
    platform: "Linux",
    steps: [
      'Run: <code class="text-xs bg-muted px-1 py-0.5 rounded">curl -fsSL https://ollama.com/install.sh | sh</code>',
      'Then: <code class="text-xs bg-muted px-1 py-0.5 rounded">ollama pull llama3.2</code>',
      'Verify: <code class="text-xs bg-muted px-1 py-0.5 rounded">ollama list</code>',
      "The app will auto-detect Ollama on localhost:11434",
    ],
  },
  {
    platform: "Docker",
    steps: [
      'Run: <code class="text-xs bg-muted px-1 py-0.5 rounded">docker run -d -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama</code>',
      'Then pull a model: <code class="text-xs bg-muted px-1 py-0.5 rounded">docker exec -it ollama ollama pull llama3.2</code>',
      'Set environment variable: <code class="text-xs bg-muted px-1 py-0.5 rounded">OLLAMA_BASE_URL=http://localhost:11434</code>',
    ],
  },
]

const cloudProviders = [
  {
    name: "Groq (default)",
    vars: ["GROQ_API_KEY", "LLM_PROVIDER=groq"],
  },
  {
    name: "OpenRouter",
    vars: ["OPENROUTER_API_KEY", "LLM_PROVIDER=openrouter"],
  },
  {
    name: "OpenAI",
    vars: ["OPENAI_API_KEY", "LLM_PROVIDER=openai"],
  },
  {
    name: "Together AI",
    vars: ["TOGETHER_API_KEY", "LLM_PROVIDER=together"],
  },
]

export function SetupGuide({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [tab, setTab] = useState<"ollama" | "cloud">("ollama")
  const [platform, setPlatform] = useState("macOS")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Setup Guide</DialogTitle>
        </DialogHeader>

        {/* Tab switcher */}
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <button
            className={cn("flex-1 text-sm py-1.5 px-3 rounded-md transition-colors", tab === "ollama" ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:text-foreground")}
            onClick={() => setTab("ollama")}
          >
            Local (Ollama)
          </button>
          <button
            className={cn("flex-1 text-sm py-1.5 px-3 rounded-md transition-colors", tab === "cloud" ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:text-foreground")}
            onClick={() => setTab("cloud")}
          >
            Cloud API
          </button>
        </div>

        {tab === "ollama" && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              <strong>Ollama</strong> runs models locally on your machine. No data leaves your computer.
              Requires ~8GB RAM for 7B models, ~16GB for 13B models.
            </p>

            {/* Platform selector */}
            <div className="flex gap-1 bg-muted rounded-lg p-1">
              {ollamaSteps.map((p) => (
                <button
                  key={p.platform}
                  className={cn("flex-1 text-xs py-1.5 px-2 rounded-md transition-colors", platform === p.platform ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:text-foreground")}
                  onClick={() => setPlatform(p.platform)}
                >
                  {p.platform}
                </button>
              ))}
            </div>

            {/* Steps */}
            <ol className="space-y-2 text-sm list-decimal list-inside text-muted-foreground">
              {ollamaSteps.find((p) => p.platform === platform)?.steps.map((s, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: s }} />
              ))}
            </ol>

            {/* Recommended models */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-1.5 text-sm">
              <p className="font-medium text-xs uppercase tracking-wider text-muted-foreground">Recommended models</p>
              <p className="text-xs text-muted-foreground">
                <code className="text-xs bg-muted px-1 py-0.5 rounded">llama3.2</code> — 3B, fastest
                &nbsp;&nbsp;
                <code className="text-xs bg-muted px-1 py-0.5 rounded">llama3.1:8b</code> — 8B, balanced
                &nbsp;&nbsp;
                <code className="text-xs bg-muted px-1 py-0.5 rounded">llama3.3:70b</code> — 70B, most capable
              </p>
            </div>
          </div>
        )}

        {tab === "cloud" && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              <strong>Cloud LLM</strong> routes requests to remote APIs. No local GPU required.
              Configure via environment variables.
            </p>
            <div className="space-y-3">
              {cloudProviders.map((p) => (
                <div key={p.name} className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Set {p.vars.map((v, i) => (
                      <span key={v}>
                        {i > 0 && " and "}
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">{v}</code>
                      </span>
                    ))}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
