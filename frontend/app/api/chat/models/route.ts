export const runtime = "edge"

import { BACKEND_URL } from "@/lib/backend-url"

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/chat/models`, {
      signal: AbortSignal.timeout(30000),
    })
    const data = await res.json()
    return Response.json(data, { status: res.status })
  } catch {
    return Response.json({ available: false, models: [] })
  }
}
