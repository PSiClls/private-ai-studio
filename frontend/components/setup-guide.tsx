"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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

export function SetupGuide({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [tab, setTab] = useState("ollama")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Setup Guide</DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ollama">Local (Ollama)</TabsTrigger>
            <TabsTrigger value="cloud">Cloud API</TabsTrigger>
          </TabsList>
          <TabsContent value="ollama" className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              <strong>Ollama</strong> runs models locally on your machine. No data leaves your computer.
              Requires ~8GB RAM for 7B models, ~16GB for 13B models.
            </p>
            <Tabs defaultValue="macOS">
              <TabsList className="grid w-full grid-cols-4">
                {ollamaSteps.map((p) => (
                  <TabsTrigger key={p.platform} value={p.platform} className="text-xs">{p.platform}</TabsTrigger>
                ))}
              </TabsList>
              {ollamaSteps.map((p) => (
                <TabsContent key={p.platform} value={p.platform} className="space-y-2 py-2">
                  <ol className="space-y-2 text-sm list-decimal list-inside text-muted-foreground">
                    {p.steps.map((s, i) => (
                      <li key={i} dangerouslySetInnerHTML={{ __html: s }} />
                    ))}
                  </ol>
                </TabsContent>
              ))}
            </Tabs>
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
          </TabsContent>
          <TabsContent value="cloud" className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              <strong>Cloud LLM</strong> routes requests to remote APIs. No local GPU required.
              Configure via environment variables.
            </p>
            <div className="space-y-3">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Groq (default)</p>
                <p className="text-xs text-muted-foreground">Set <code className="text-xs bg-muted px-1 py-0.5 rounded">GROQ_API_KEY</code> and <code className="text-xs bg-muted px-1 py-0.5 rounded">LLM_PROVIDER=groq</code></p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">OpenRouter</p>
                <p className="text-xs text-muted-foreground">Set <code className="text-xs bg-muted px-1 py-0.5 rounded">OPENROUTER_API_KEY</code> and <code className="text-xs bg-muted px-1 py-0.5 rounded">LLM_PROVIDER=openrouter</code></p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">OpenAI</p>
                <p className="text-xs text-muted-foreground">Set <code className="text-xs bg-muted px-1 py-0.5 rounded">OPENAI_API_KEY</code> and <code className="text-xs bg-muted px-1 py-0.5 rounded">LLM_PROVIDER=openai</code></p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Together AI</p>
                <p className="text-xs text-muted-foreground">Set <code className="text-xs bg-muted px-1 py-0.5 rounded">TOGETHER_API_KEY</code> and <code className="text-xs bg-muted px-1 py-0.5 rounded">LLM_PROVIDER=together</code></p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
