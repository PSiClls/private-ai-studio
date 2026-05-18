import { NextRequest } from "next/server"
import { BACKEND_URL } from "@/lib/backend-url"

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const res = await fetch(`${BACKEND_URL}/api/conversations/${params.id}/messages`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
