import { NextRequest } from "next/server"
import { BACKEND_URL } from "@/lib/backend-url"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const params = searchParams.toString()
  const url = `${BACKEND_URL}/api/conversations${params ? `?${params}` : ""}`
  const res = await fetch(url)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const res = await fetch(`${BACKEND_URL}/api/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
