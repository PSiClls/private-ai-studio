# Deploy to PaaS (Vercel + Render)

## Architecture

```
Browser → Vercel (Next.js) → Proxy (app/api/[...backend]) → Render (FastAPI) → Cloud LLM API
```

- **Frontend** → Vercel (Next.js 14 serverless)
- **Backend** → Render (FastAPI, SQLite, ChromaDB)
- **LLM** → Cloud API (OpenRouter, Groq, OpenAI, Together) — Ollama skipped on PaaS
- **Image generation** → Not available on PaaS (needs GPU)
- **RAG (vector search)** → ChromaDB with SQLite; embeddings use chromadb built-in ONNX (sentence-transformers not available)

## Prerequisites

1. Push repo to GitHub
2. Cloud LLM API key (pick one):
   - **OpenRouter** (recommended) → [openrouter.ai/keys](https://openrouter.ai/keys)
   - **Groq** (fastest, free tier) → [console.groq.com/keys](https://console.groq.com/keys)
   - **OpenAI** → [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
   - **Together** → [api.together.ai/settings/api-keys](https://api.together.ai/settings/api-keys)

---

## Step 1: Deploy Backend (Render)

1. Go to [dashboard.render.com/blueprints](https://dashboard.render.com/blueprints)
2. Click **New Blueprint Instance** → connect your GitHub repo
3. Render reads `render.yaml` — it will show a web service
4. When prompted, set the manual env var:
   - `OPENROUTER_API_KEY` = `sk-or-v1-...`
5. Click **Apply**
6. Wait for build (~3 min). Get URL like: `https://private-ai-studio-backend.onrender.com`

---

## Step 2: Deploy Frontend (Vercel)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repo
3. In the configure step:
   - **Root Directory**: type `frontend` (Vercel auto-detects Next.js)
   - **Build Command**: `next build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)
4. Do NOT add any env vars yet
5. Click **Deploy** (~2 min)
6. Copy the Vercel URL: `https://private-ai-studio.vercel.app`

---

## Step 3: Wire Together

1. **Vercel** → Project → **Settings** → **Environment Variables**:
   ```
   BACKEND_URL = https://private-ai-studio-backend.onrender.com
   ```
2. **Render** → Backend dashboard → **Environment**:
   ```
   CORS_ORIGINS = https://private-ai-studio.vercel.app
   ```
3. Redeploy both (Render auto-deploys on env change, Vercel needs manual redeploy)

---

## Step 4: Verify

1. Open `https://private-ai-studio.vercel.app`
2. Start a chat — messages flow to Render backend → OpenRouter API → back
3. Check Render logs for any errors

---

## Env Vars Reference

### Vercel (frontend)

| Variable | Required | Value |
|---|---|---|
| `BACKEND_URL` | ✅ | `https://your-backend.onrender.com` |

No other env vars needed.

### Render (backend)

| Variable | Required | Notes |
|---|---|---|
| `OPENROUTER_API_KEY` | ✅ | API key from openrouter.ai |
| `OPENROUTER_MODEL` | Optional | Default: `meta-llama/llama-3.1-8b-instruct` |
| `CORS_ORIGINS` | ✅ | Your Vercel URL |
| `LLM_PROVIDER` | Optional | Default: `ollama`. Use `openrouter`, `groq`, `openai`, `together` |
| `GROQ_API_KEY` | If provider=groq | |
| `OPENAI_API_KEY` | If provider=openai | |
| `TOGETHER_API_KEY` | If provider=together | |

---

## Limitations vs Local

| Feature | Local (Ollama + GPU) | Cloud (PaaS) |
|---|---|---|
| Privacy | 100% local | Prompts sent to LLM API |
| Image gen | Stable Diffusion | ❌ Not available |
| Vector search | sentence-transformers | ChromaDB built-in (limited) |
| Latency | Depends on GPU | 200-800ms (Groq fastest) |
| Cost | Free (your hardware) | API tokens + hosting |
| Offline | ✅ Works | ❌ Needs internet |

---

## Troubleshooting

**Frontend can't reach backend**
- Verify `BACKEND_URL` is set in Vercel env vars
- Check Render service is running (not spun down on free tier)
- Check `CORS_ORIGINS` on Render matches the Vercel URL

**Chat returns errors**
- Check `OPENROUTER_API_KEY` is set on Render
- Verify the model name is valid (e.g. `meta-llama/llama-3.1-8b-instruct`)
- Check Render logs for API error responses

**Build fails on Vercel**
- Verify Root Directory is set to `frontend`
- Check the build log for specific errors
- Run `npm install && npm run build` locally inside `frontend/`

**Build fails on Render**
- May need to set `PYTHON_VERSION=3.11.9`
- Check the `requirements.cloud.txt` file exists
- Free tier may timeout for large builds

---

## Cost Estimates

| Service | Free Tier | Paid From |
|---|---|---|
| Vercel | 100 GB bandwidth | $20/mo |
| Render | 750 hrs/month (spins down) | $7/mo |
| Groq | 6000 req/day free | $0.07/M tokens |
| OpenRouter | Pay per use | ~$0.001/req |
| OpenAI | $5 free credit | Pay per use |
