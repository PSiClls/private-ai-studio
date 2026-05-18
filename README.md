# Private AI Studio

Local-first, fully private AI workspace — all data stays on your machine.

## Features

- **Chat** — Conversations with local LLMs via [Ollama](https://ollama.com). Streaming responses, RAG document support, code syntax highlighting, markdown rendering.
- **Images** — Text-to-image generation using SDXL-Turbo (GPU required).
- **Documents** — Upload PDF, DOCX, TXT, MD, CSV files. Automatic chunking, embedding, and vector indexing via ChromaDB.
- **Workflows** — Visual workflow builder with drag-and-drop nodes. LLM, vector search, condition, and output nodes. Persisted execution history.
- **Prompts** — Prompt template library with variable substitution, test runs, export/import.

## Architecture

```
┌─────────────┐       ┌─────────────┐       ┌─────────┐
│   Frontend  │──────▶│   Backend   │──────▶│ Ollama  │
│  Next.js 14 │  :3000│  FastAPI    │  :8000│  :11434 │
│  React 18   │◀──────│  SQLAlchemy │◀──────└─────────┘
│  Tailwind   │       │  ChromaDB   │
└─────────────┘       └─────────────┘
```

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- [Ollama](https://ollama.com/download) (recommended)

### Manual Setup

```powershell
# Run the setup script
.\setup.ps1

# Or manually:
# Terminal 1 - Backend
cd backend
.\venv\Scripts\python.exe run.py

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Docker

```bash
docker compose up --build
```

## Project Structure

```
├── backend/                 # FastAPI + SQLAlchemy async
│   ├── app/
│   │   ├── routers/         # API endpoints
│   │   ├── services/        # Business logic
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models.py
│   │   └── schemas.py
│   └── tests/               # pytest integration tests
├── frontend/                # Next.js 14 App Router
│   ├── app/                 # Pages + API proxy routes
│   ├── components/          # React components
│   ├── hooks/               # Custom hooks
│   ├── lib/                 # Utilities
│   ├── store/               # Zustand state
│   └── __tests__/           # Jest unit tests
├── Dockerfile
├── docker-compose.yml
└── setup.ps1
```

## API

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Health check + Ollama status |
| `/api/chat/models` | GET | List available Ollama models |
| `/api/chat/stream` | POST | Stream chat (SSE) |
| `/api/chat/rag-stream` | POST | Stream chat with RAG (SSE) |
| `/api/chat/cancel` | POST | Cancel active generation |
| `/api/conversations` | GET/POST | Conversation CRUD |
| `/api/documents` | GET | List uploaded documents |
| `/api/documents/upload` | POST | Upload & embed document |
| `/api/images/generate` | POST | Queue image generation |
| `/api/prompts` | GET/POST | Prompt template CRUD |
| `/api/workflows` | GET/POST | Workflow CRUD |
| `/api/workflows/{id}/execute` | POST | Execute workflow |
| `/api/settings` | GET/PUT | Key-value settings store |
| `/api/system/gpu` | GET | GPU detection status |

## License

MIT
