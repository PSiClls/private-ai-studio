/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react"
import { ChatInterface } from "@/components/chat/chat-interface"
import { useChatStore } from "@/store/chat-store"
import { useStreamChat } from "@/hooks/use-stream-chat"
import { api } from "@/lib/api"

jest.mock("@/hooks/use-stream-chat", () => ({
  useStreamChat: jest.fn(),
}))

jest.mock("@/lib/api", () => ({
  api: {
    conversations: {
      create: jest.fn(),
    },
  },
}))

jest.mock("@/components/documents/rag-doc-picker", () => ({
  RagDocPicker: () => null,
}))

jest.mock("@/components/documents/source-panel", () => ({
  SourcePanel: () => null,
}))

jest.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => children,
}))

const mockStreamMessage = jest.fn()
const mockStop = jest.fn()

function resetStore() {
  useChatStore.setState({
    conversations: [],
    currentConversationId: null,
    messages: [],
    isStreaming: false,
    streamingContent: "",
    streamingSources: [],
    abortController: null,
    models: [],
    ollamaAvailable: true,
    ragMode: false,
    ragDocumentIds: [],
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(useStreamChat as jest.Mock).mockReturnValue({ streamMessage: mockStreamMessage, stop: mockStop })
  resetStore()
})

describe("ChatInterface", () => {
  it("renders empty state when no messages", () => {
    render(<ChatInterface />)
    expect(screen.getByText(/Private AI Studio/i)).toBeTruthy()
  })

  it("shows Ollama banner when unavailable", () => {
    useChatStore.setState({ ollamaAvailable: false, messages: [{ id: "1", role: "user", content: "x", timestamp: new Date().toISOString() }] })
    render(<ChatInterface />)
    expect(screen.getByText(/Ollama is not running/i)).toBeTruthy()
  })

  it("renders messages from store", () => {
    useChatStore.setState({
      currentConversationId: 1,
      messages: [
        { id: "1", role: "user", content: "Hello", timestamp: new Date().toISOString() },
        { id: "2", role: "assistant", content: "Hi there", timestamp: new Date().toISOString() },
      ],
    })
    render(<ChatInterface />)
    expect(screen.getByText("Hello")).toBeTruthy()
    expect(screen.getByText("Hi there")).toBeTruthy()
  })

  it("sends message and creates conversation if needed", async () => {
    const mockCreate = api.conversations.create as jest.Mock
    mockCreate.mockResolvedValue({ id: 1, title: "Test", created_at: new Date().toISOString() })

    useChatStore.setState({ messages: [{ id: "1", role: "user", content: "x", timestamp: new Date().toISOString() }] })
    render(<ChatInterface />)

    await act(async () => {
      mockStreamMessage.mockResolvedValue(undefined)
      const store = useChatStore.getState()
      await store.setIsStreaming(true)
    })

    expect(screen.getByText(/Stop generation/i)).toBeTruthy()
  })

  it("shows stop button while streaming", () => {
    useChatStore.setState({
      isStreaming: true,
      streamingContent: "Generating...",
      messages: [{ id: "1", role: "user", content: "x", timestamp: new Date().toISOString() }],
    })
    render(<ChatInterface />)
    expect(screen.getByText(/Stop generation/i)).toBeTruthy()
  })

  it("calls stop when stop button clicked", () => {
    useChatStore.setState({
      isStreaming: true,
      streamingContent: "Generating...",
      messages: [{ id: "1", role: "user", content: "x", timestamp: new Date().toISOString() }],
    })
    render(<ChatInterface />)
    fireEvent.click(screen.getByText(/Stop generation/i))
    expect(mockStop).toHaveBeenCalled()
  })

  it("auto-sends initial message when provided", async () => {
    const mockCreate = api.conversations.create as jest.Mock
    mockCreate.mockResolvedValue({ id: 1, title: "Test", created_at: new Date().toISOString() })

    useChatStore.setState({ messages: [{ id: "1", role: "user", content: "x", timestamp: new Date().toISOString() }] })
    render(<ChatInterface initialMessage="Prompt from library" />)

    await waitFor(() => {
      expect(mockStreamMessage).toHaveBeenCalledWith(1, "Prompt from library")
    })
  })

  it("does not double-send initial message", async () => {
    const mockCreate = api.conversations.create as jest.Mock
    mockCreate.mockResolvedValue({ id: 1, title: "Test", created_at: new Date().toISOString() })

    useChatStore.setState({ messages: [{ id: "1", role: "user", content: "x", timestamp: new Date().toISOString() }] })
    const { rerender } = render(<ChatInterface initialMessage="Once only" />)

    await waitFor(() => {
      expect(mockStreamMessage).toHaveBeenCalledTimes(1)
    })

    rerender(<ChatInterface initialMessage="Once only" />)
    expect(mockStreamMessage).toHaveBeenCalledTimes(1)
  })

  it("shows streaming content", () => {
    useChatStore.setState({
      isStreaming: true,
      streamingContent: "Thinking...",
      messages: [{ id: "1", role: "user", content: "x", timestamp: new Date().toISOString() }],
    })
    render(<ChatInterface />)
    expect(screen.getByText("Thinking...")).toBeTruthy()
  })
})
