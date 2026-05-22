import type { Conversation, Message, OllamaModel, HealthStatus } from "@/types"

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API Error ${res.status}: ${text}`)
  }
  return res.json()
}

export const api = {
  health: () => fetchJson<HealthStatus>("/api/health"),

  conversations: {
    list: (search?: string) => {
      const params = search ? `?search=${encodeURIComponent(search)}` : ""
      return fetchJson<Conversation[]>(`/api/conversations${params}`)
    },
    create: (data: { title?: string; model?: string; system_prompt?: string }) =>
      fetchJson<Conversation>("/api/conversations", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    get: (id: number) => fetchJson<Conversation>(`/api/conversations/${id}`),
    update: (id: number, data: Partial<Conversation>) =>
      fetchJson<Conversation>(`/api/conversations/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      fetchJson<{ ok: boolean }>(`/api/conversations/${id}`, {
        method: "DELETE",
      }),
    messages: {
      list: (convId: number) =>
        fetchJson<Message[]>(`/api/conversations/${convId}/messages`),
    },
  },

  chat: {
    models: () =>
      fetchJson<{ available: boolean; models: OllamaModel[] }>("/api/chat/models"),
  },
}
