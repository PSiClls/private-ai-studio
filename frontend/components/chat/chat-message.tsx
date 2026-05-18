"use client"

import { useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"
import { Copy, Check, User, Bot, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface ChatMessageProps {
  role: "user" | "assistant"
  content: string
  isStreaming?: boolean
  isLast?: boolean
  onRegenerate?: () => void
}

export function ChatMessage({ role, content, isStreaming, isLast, onRegenerate }: ChatMessageProps) {
  const isUser = role === "user"

  return (
    <div className={cn("flex gap-4 py-4 group", isUser ? "flex-row-reverse" : "")}>
      <div
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-full shrink-0 mt-1",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>
      <div className={cn("flex-1 space-y-2 min-w-0", isUser ? "items-end" : "")}>
        <div className="font-medium text-sm text-muted-foreground">
          {isUser ? "You" : "Assistant"}
        </div>
        <div
          className={cn(
            "prose prose-sm dark:prose-invert max-w-none",
            isUser
              ? "bg-primary/10 rounded-2xl rounded-tr-sm px-4 py-3 inline-block text-left"
              : "",
            isStreaming && !content ? "streaming-cursor" : ""
          )}
        >
          {isUser ? (
            <p className="leading-relaxed whitespace-pre-wrap">{content}</p>
          ) : (
            <MarkdownContent content={content} isStreaming={isStreaming} />
          )}
        </div>
        {!isUser && !isStreaming && content && isLast && onRegenerate && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={onRegenerate}>
              <RefreshCw className="h-3 w-3" />
              Regenerate
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function MarkdownContent({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  if (!content && isStreaming) {
    return <span className="streaming-cursor" />
  }

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "")
          const codeStr = String(children).replace(/\n$/, "")
          if (match) {
            return <CodeBlock language={match[1]} code={codeStr} />
          }
          return (
            <code className="bg-muted px-1.5 py-0.5 rounded text-sm before:content-none after:content-none" {...props}>
              {children}
            </code>
          )
        },
        pre({ children }) {
          return <>{children}</>
        },
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group my-3">
      <div className="flex items-center justify-between px-4 py-2 bg-muted rounded-t-lg border-b border-border">
        <span className="text-xs text-muted-foreground uppercase font-mono">{language}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={handleCopy}>
          {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>
      <SyntaxHighlighter
        style={oneDark}
        language={language}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          borderBottomLeftRadius: "0.5rem",
          borderBottomRightRadius: "0.5rem",
          fontSize: "0.8rem",
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )
}
