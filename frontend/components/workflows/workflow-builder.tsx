"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  type Connection,
  type Node,
  type Edge,
  type NodeTypes,
  type NodeChange,
  type EdgeChange,
  type ReactFlowInstance,
} from "reactflow"
import "reactflow/dist/style.css"
import {
  Save,
  Play,
  FileText,
  MessageSquare,
  Braces,
  Search,
  GitBranch,
  Type,
  Download,
  Upload,
  Undo2,
  Redo2,
  Terminal,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/toast"

interface WorkflowNodeData {
  label: string
  nodeType: string
  config: Record<string, any>
}

const nodeDefs = [
  {
    type: "input",
    label: "Input",
    icon: Type,
    color: "#3b82f6",
    inputs: [],
    outputs: ["text"],
    description: "Text content input",
    category: "Input",
  },
  {
    type: "llm",
    label: "LLM Call",
    icon: Sparkles,
    color: "#22c55e",
    inputs: ["prompt", "context"],
    outputs: ["response"],
    description: "Call an LLM model",
    category: "AI",
  },
  {
    type: "prompt",
    label: "Prompt Template",
    icon: Braces,
    color: "#a855f7",
    inputs: ["variables"],
    outputs: ["formatted_prompt"],
    description: "Template with {placeholders}",
    category: "Processing",
  },
  {
    type: "search",
    label: "Vector Search",
    icon: Search,
    color: "#f97316",
    inputs: ["query"],
    outputs: ["relevant_chunks"],
    description: "Search document vectors",
    category: "AI",
  },
  {
    type: "condition",
    label: "Conditional",
    icon: GitBranch,
    color: "#ef4444",
    inputs: ["text"],
    outputs: ["true_branch", "false_branch"],
    description: "If/else branching",
    category: "Processing",
  },
  {
    type: "output",
    label: "Output",
    icon: Terminal,
    color: "#6b7280",
    inputs: ["value"],
    outputs: [],
    description: "Display or save result",
    category: "Output",
  },
]

const categories = ["Input", "Processing", "AI", "Output"]

const initialNodes: Node[] = []
const initialEdges: Edge[] = []

interface WorkflowBuilderProps {
  initialPromptNode?: string | null
  onPromptNodeSet?: () => void
}

export function WorkflowBuilder({ initialPromptNode, onPromptNodeSet }: WorkflowBuilderProps) {
  const { addToast } = useToast()
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [name, setName] = useState("Untitled Workflow")
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [workflowId, setWorkflowId] = useState<number | null>(null)
  const [history, setHistory] = useState<{ nodes: Node[]; edges: Edge[] }[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null)

  useEffect(() => {
    if (initialPromptNode) {
      const id = `prompt-${Date.now()}`
      const newNode: Node = {
        id,
        type: "prompt",
        position: { x: 100, y: 100 },
        data: { label: "Prompt Template", nodeType: "prompt", config: { template: initialPromptNode } },
      }
      setNodes((nds) => [...nds, newNode])
      onPromptNodeSet?.()
    }
  }, [initialPromptNode])

  const saveToHistory = useCallback(
    (newNodes: Node[], newEdges: Edge[]) => {
      const entry = { nodes: JSON.parse(JSON.stringify(newNodes)), edges: JSON.parse(JSON.stringify(newEdges)) }
      setHistory((prev) => {
        const trimmed = prev.slice(0, historyIndex + 1)
        return [...trimmed, entry].slice(-50)
      })
      setHistoryIndex((i) => Math.min(i + 1, 49))
    },
    [historyIndex]
  )

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIdx = historyIndex - 1
      setHistoryIndex(newIdx)
      setNodes(JSON.parse(JSON.stringify(history[newIdx].nodes)))
      setEdges(JSON.parse(JSON.stringify(history[newIdx].edges)))
    }
  }, [history, historyIndex, setNodes, setEdges])

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIdx = historyIndex + 1
      setHistoryIndex(newIdx)
      setNodes(JSON.parse(JSON.stringify(history[newIdx].nodes)))
      setEdges(JSON.parse(JSON.stringify(history[newIdx].edges)))
    }
  }, [history, historyIndex, setNodes, setEdges])

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes)
    },
    [onNodesChange]
  )

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes)
    },
    [onEdgesChange]
  )

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => {
        const newEdges = addEdge(params, eds)
        saveToHistory(nodes, newEdges)
        return newEdges
      })
    },
    [nodes, setEdges, saveToHistory]
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const type = event.dataTransfer.getData("application/reactflow")
      if (!type || !reactFlowInstance) return

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      const def = nodeDefs.find((d) => d.type === type)
      const newNode: Node<WorkflowNodeData> = {
        id: `${type}-${Date.now()}`,
        type: "default",
        position,
        data: {
          label: def?.label || type,
          nodeType: type,
          config: {},
        },
      }
      setNodes((nds) => {
        const newNodes = [...nds, newNode]
        saveToHistory(newNodes, edges)
        return newNodes
      })
    },
    [reactFlowInstance, setNodes, edges, saveToHistory]
  )

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
  }, [])

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
  }, [])

  const addNode = useCallback(
    (type: string) => {
      if (!reactFlowInstance) return
      const center = reactFlowInstance.screenToFlowPosition({
        x: window.innerWidth / 2 - 100 + Math.random() * 200,
        y: window.innerHeight / 2 - 100 + Math.random() * 200,
      })
      const def = nodeDefs.find((d) => d.type === type)
      const newNode: Node<WorkflowNodeData> = {
        id: `${type}-${Date.now()}`,
        type: "default",
        position: center,
        data: { label: def?.label || type, nodeType: type, config: {} },
      }
      setNodes((nds) => {
        const newNodes = [...nds, newNode]
        saveToHistory(newNodes, edges)
        return newNodes
      })
    },
    [reactFlowInstance, setNodes, edges, saveToHistory]
  )

  const updateNodeConfig = useCallback(
    (nodeId: string, key: string, value: unknown) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === nodeId) {
            const updated = {
              ...n,
              data: {
                ...n.data,
                config: { ...n.data.config, [key]: value },
                label: key === "label" ? value : n.data.label,
              },
            }
            return updated
          }
          return n
        })
      )
    },
    [setNodes]
  )

  const saveWorkflow = useCallback(async () => {
    const payload = { name, description: "", nodes, edges }
    try {
      if (workflowId) {
        await fetch(`/api/workflows/${workflowId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      } else {
        const res = await fetch("/api/workflows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          const data = await res.json()
          setWorkflowId(data.id)
        }
      }
      addToast("success", "Workflow saved")
    } catch (err) {
      addToast("error", "Failed to save workflow", err instanceof Error ? err.message : undefined)
    }
  }, [workflowId, name, nodes, edges, addToast])

  const executeWorkflow = useCallback(async () => {
    const targetId = workflowId
    if (!targetId) return
    try {
      const res = await fetch(`/api/workflows/${targetId}/execute`, { method: "POST" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      addToast("success", "Execution started")
    } catch (err) {
      addToast("error", "Execution failed", err instanceof Error ? err.message : undefined)
    }
  }, [workflowId, addToast])

  const exportWorkflow = useCallback(() => {
    const payload = { name, nodes, edges }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${name.replace(/\s+/g, "_")}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [name, nodes, edges])

  const importWorkflow = useCallback(() => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement
      const file = target.files?.[0]
      if (!file) return
      const text = await file.text()
      try {
        const data = JSON.parse(text)
        setName(data.name || "Imported Workflow")
        setNodes(data.nodes || [])
        setEdges(data.edges || [])
        saveToHistory(data.nodes || [], data.edges || [])
      } catch (err) {
        addToast("error", "Import failed", err instanceof Error ? err.message : "Invalid workflow JSON")
      }
    }
    input.click()
  }, [saveToHistory, addToast])

  const selectedConfig = selectedNode?.data?.config || {}

  return (
    <div className="flex-1 flex h-full">
      {/* Left Palette */}
      <div className="w-52 border-r border-border bg-card flex flex-col">
        <div className="p-3 border-b border-border">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full text-sm font-medium bg-transparent border-b border-transparent hover:border-input focus:border-input outline-none px-1 py-0.5"
          />
        </div>
        <ScrollArea className="flex-1 p-3">
          {categories.map((cat) => (
            <div key={cat} className="mb-4">
              <h4 className="text-[10px] font-semibold text-muted-foreground uppercase mb-2">{cat}</h4>
              {nodeDefs
                .filter((d) => d.category === cat)
                .map((def) => (
                  <div
                    key={def.type}
                    className="flex items-center gap-2 px-2 py-2 rounded-md text-sm cursor-grab hover:bg-accent transition-colors mb-1 active:cursor-grabbing"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/reactflow", def.type)
                      e.dataTransfer.effectAllowed = "move"
                    }}
                    onClick={() => addNode(def.type)}
                  >
                    <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: def.color + "20" }}>
                      <def.icon className="w-3.5 h-3.5" style={{ color: def.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">{def.label}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{def.description}</p>
                    </div>
                  </div>
                ))}
            </div>
          ))}
        </ScrollArea>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="h-10 border-b border-border flex items-center gap-1 px-3 bg-card">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={undo} title="Undo">
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={redo} title="Redo">
            <Redo2 className="h-3.5 w-3.5" />
          </Button>
          <div className="w-px h-5 bg-border mx-1" />
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={saveWorkflow}>
            <Save className="h-3.5 w-3.5" /> Save
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={executeWorkflow}>
            <Play className="h-3.5 w-3.5" /> Execute
          </Button>
          <div className="w-px h-5 bg-border mx-1" />
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={exportWorkflow}>
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={importWorkflow}>
            <Upload className="h-3.5 w-3.5" /> Import
          </Button>
        </div>

        {/* Flow Canvas */}
        <div className="flex-1" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            deleteKeyCode="Delete"
            snapToGrid
            snapGrid={[16, 16]}
            fitView
          >
            <Controls />
            <MiniMap position="bottom-right" />
            <Background gap={16} size={1} color="rgba(0,0,0,0.05)" />
          </ReactFlow>
        </div>
      </div>

      {/* Properties Panel */}
      {selectedNode && (
        <div className="w-64 border-l border-border bg-card p-4 overflow-y-auto">
          <h3 className="text-sm font-semibold mb-4">Node Properties</h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Label</label>
              <Input
                value={selectedNode.data.label || ""}
                onChange={(e) => updateNodeConfig(selectedNode.id, "label", e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Type</label>
              <p className="text-sm font-mono text-muted-foreground">{selectedNode.data.nodeType}</p>
            </div>
            <div className="border-t pt-3">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2">Configuration</h4>
              {selectedNode.data.nodeType === "input" && (
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Text Content</label>
                  <textarea
                    value={selectedNode.data.config?.text || ""}
                    onChange={(e) => updateNodeConfig(selectedNode.id, "text", e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm min-h-[60px] resize-none"
                  />
                </div>
              )}
              {selectedNode.data.nodeType === "llm" && (
                <>
                  <div className="mb-2">
                    <label className="text-xs text-muted-foreground block mb-1">Model</label>
                    <Input
                      value={selectedNode.data.config?.model || "auto"}
                      onChange={(e) => updateNodeConfig(selectedNode.id, "model", e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Temperature</label>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={selectedNode.data.config?.temperature ?? 0.7}
                      onChange={(e) => updateNodeConfig(selectedNode.id, "temperature", parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <span className="text-xs text-muted-foreground">{selectedNode.data.config?.temperature ?? 0.7}</span>
                  </div>
                </>
              )}
              {selectedNode.data.nodeType === "prompt" && (
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Template</label>
                  <textarea
                    value={selectedNode.data.config?.template || ""}
                    onChange={(e) => updateNodeConfig(selectedNode.id, "template", e.target.value)}
                    placeholder="Use {variable} for placeholders"
                    className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm min-h-[80px] resize-none font-mono"
                  />
                </div>
              )}
              {selectedNode.data.nodeType === "condition" && (
                <>
                  <div className="mb-2">
                    <label className="text-xs text-muted-foreground block mb-1">Condition Type</label>
                    <select
                      value={selectedNode.data.config?.conditionType || "contains"}
                      onChange={(e) => updateNodeConfig(selectedNode.id, "conditionType", e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                    >
                      <option value="contains">Contains</option>
                      <option value="regex">Regex Match</option>
                      <option value="equals">Equals</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Value</label>
                    <Input
                      value={selectedNode.data.config?.conditionValue || ""}
                      onChange={(e) => updateNodeConfig(selectedNode.id, "conditionValue", e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                </>
              )}
              {selectedNode.data.nodeType === "output" && (
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Format</label>
                  <select
                    value={selectedNode.data.config?.format || "text"}
                    onChange={(e) => updateNodeConfig(selectedNode.id, "format", e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                  >
                    <option value="text">Text</option>
                    <option value="markdown">Markdown</option>
                    <option value="json">JSON</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
