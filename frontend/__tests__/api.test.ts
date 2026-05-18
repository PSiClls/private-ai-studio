/**
 * @jest-environment node
 */
import { api } from "@/lib/api"

describe("api", () => {
  it("has health method", () => {
    expect(typeof api.health).toBe("function")
  })

  it("has conversations methods", () => {
    expect(typeof api.conversations.list).toBe("function")
    expect(typeof api.conversations.create).toBe("function")
    expect(typeof api.conversations.get).toBe("function")
    expect(typeof api.conversations.update).toBe("function")
    expect(typeof api.conversations.delete).toBe("function")
    expect(typeof api.conversations.messages.list).toBe("function")
  })

  it("has chat models method", () => {
    expect(typeof api.chat.models).toBe("function")
  })
})
