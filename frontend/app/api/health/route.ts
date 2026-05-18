import { BACKEND_URL } from "@/lib/backend-url"

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/health`, {
      signal: AbortSignal.timeout(5000),
    })
    const data = await res.json()
    return Response.json(data, { status: res.status })
  } catch {
    return Response.json(
      { status: "error", ollama: false, version: "unknown" },
      { status: 503 }
    )
  }
}
