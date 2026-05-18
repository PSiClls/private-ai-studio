import { NextRequest } from "next/server"
import { BACKEND_URL } from "@/lib/backend-url"

export async function GET(
  request: NextRequest,
  { params }: { params: { backend: string[] } }
) {
  return proxy(request, params.backend, "GET")
}

export async function POST(
  request: NextRequest,
  { params }: { params: { backend: string[] } }
) {
  return proxy(request, params.backend, "POST")
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { backend: string[] } }
) {
  return proxy(request, params.backend, "PUT")
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { backend: string[] } }
) {
  return proxy(request, params.backend, "PATCH")
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { backend: string[] } }
) {
  return proxy(request, params.backend, "DELETE")
}

async function proxy(request: NextRequest, pathSegments: string[], method: string) {
  const path = "/api/" + pathSegments.join("/")
  const search = request.nextUrl.search
  const url = `${BACKEND_URL}${path}${search}`

  const headers: Record<string, string> = {}
  request.headers.forEach((value, key) => {
    if (!["host", "connection", "content-length"].includes(key.toLowerCase())) {
      headers[key] = value
    }
  })

  try {
    const body = method === "GET" || method === "HEAD" ? undefined : await request.text()
    const backendRes = await fetch(url, {
      method,
      headers,
      body: body || undefined,
      signal: AbortSignal.timeout(60000),
    })

    const contentType = backendRes.headers.get("content-type") || ""
    if (contentType.includes("text/event-stream")) {
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
              if (done) { controller.close(); break }
              controller.enqueue(value)
            }
          } catch (err) { controller.error(err) }
        },
        cancel() { reader.cancel() },
      })
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      })
    }

    const data = contentType.includes("application/json") ? await backendRes.json() : await backendRes.text()
    return Response.json(data, { status: backendRes.status })
  } catch {
    return Response.json(
      { error: "Backend unreachable", available: false },
      { status: 503 }
    )
  }
}
