# Deploy to PaaS (Vercel + Render)

## Architecture
- **Frontend** → Vercel (Next.js static + serverless)
- **Backend** → Render (FastAPI + SQLite/PostgreSQL)
- **LLM** → Cloud API (OpenRouter, OpenAI, Groq, Together) instead of local Ollama

## Prerequisites
1. GitHub account (push your repo)
2. Vercel account (free)
3. Render account (free tier available)
4. Cloud LLM API key (pick one):
   - **OpenRouter** (recommended) — aggregagator, many models, `openrouter.ai`
   - **Groq** — fast inference, free tier, `groq.com`
   - **Together AI** — open models, `together.ai`
   - **OpenAI** — `platform.openai.com`

---

## 1. Deploy Backend (Render)

1. Go to [render.com](https://render.com) → **New +** → **Blueprint**
2. Connect your GitHub repo
3. Render reads `render.yaml` and pre-fills the service config
4. Set environment variables:
   ```
   LLM_PROVIDER=openrouter          # or groq, openai, together
   OPENROUTER_API_KEY=sk-or-v1-...  # your API key
   OPENROUTER_MODEL=meta-llama/llama-3.1-8b-instruct
   CORS_ORIGINS=https://your-app.vercel.app
   ```
5. Click **Apply** — Render builds and deploys
6. Copy the backend URL: `https://private-ai-studio-backend.onrender.com`

---

## 2. Deploy Frontend (Vercel)

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repo
3. Configure build settings:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
4. Add environment variable:
   ```
   BACKEND_URL=https://private-ai-studio-backend.onrender.com
   ```
5. Click **Deploy** — Vercel builds and gives you a live URL
6. (Optional) Connect a custom domain

---

## 3. Update CORS

After both are deployed, update the backend `CORS_ORIGINS` env var on Render to include your Vercel URL:
```
CORS_ORIGINS=https://your-app.vercel.app,https://your-domain.com
```

Redeploy the backend service on Render to apply.

---

## Alternative: Single Platform (Railway)

Railway can host both frontend + backend + PostgreSQL in one project:

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**
2. Add two services:
   - `backend/` (Python, set `PORT` env, add LLM API keys)
   - `frontend/` (Node, set `BACKEND_URL` to the internal Railway backend URL)
3. Add a PostgreSQL database plugin
4. Set `DATABASE_URL` on backend to the Railway Postgres connection string

---

## Cost Estimates

| Platform    | Free Tier                    | Paid From       |
| ----------- | ---------------------------- | --------------- |
| Vercel      | 100 GB bandwidth/mo          | $20/mo Pro      |
| Render      | 750 hrs/mo (spins down)      | $7/mo starter   |
| Railway     | $5 credit/mo trial           | Pay per usage   |
| OpenRouter  | Pay per token (~$0.001/req)  | Preload balance |
| Groq        | Free tier (6000 req/day)     | $0.07/M tokens  |

---

## Limitations vs Local

| Feature          | Local (Ollama)      | Cloud (PaaS)            |
| ---------------- | ------------------- | ----------------------- |
| Privacy          | 100% local          | Data sent to API        |
| Image generation | Stable Diffusion    | ❌ Not supported        |
| Vector search    | ChromaDB (local)    | ChromaDB (Render disk)  |
| Latency          | Depends on GPU      | ~200-800ms (Groq fast)  |
| Cost             | Free (your hardware)| API tokens + hosting    |
