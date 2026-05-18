import { NextRequest } from "next/server"
import { BACKEND_URL } from "@/lib/backend-url"

export async function POST(request: NextRequest) {
  const body = await request.json()

  const backendRes = await fetch(`${BACKEND_URL}/api/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  if (!backendRes.ok) {
    return new Response(await backendRes.text(), {
      status: backendRes.status,
    })
  }

  const reader = backendRes.body?.getReader()
  if (!reader) {
    return new Response("No response body", { status: 502 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async pull(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            controller.close()
            break
          }
          controller.enqueue(value)
        }
      } catch (err) {
        controller.error(err)
      }
    },
    cancel() {
      reader.cancel()
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
