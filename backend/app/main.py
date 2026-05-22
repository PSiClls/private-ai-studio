import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database import init_db
from .routers import conversations, chat, documents, images, workflows, prompts, system
from .routers import settings as settings_router
from .services.ollama import ollama_service
from .services.cloud_llm import cloud_llm_service
from .services.image_service import image_generator

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.ensure_dirs()
    await init_db()
    try:
        await image_generator.initialize()
        print(f"Image generation: {'available on ' + image_generator.device if image_generator.available else 'not available (CPU only)'}")
    except Exception as e:
        print(f"Image generation init skipped: {e}")
    yield
    if settings.llm_provider == "ollama":
        await ollama_service.close()
    else:
        await cloud_llm_service.close()


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(conversations.router)
app.include_router(chat.router)
app.include_router(documents.router)
app.include_router(images.router)
app.include_router(workflows.router)
app.include_router(prompts.router)
app.include_router(settings_router.router)
app.include_router(system.router)


@app.get("/api/health")
async def health():
    if settings.llm_provider == "ollama":
        llm_ok = await ollama_service.check_available()
    else:
        llm_ok = await cloud_llm_service.check_available()
    return {
        "status": "ok",
        "ollama": llm_ok,
        "provider": settings.llm_provider,
        "version": "1.0.0",
    }
