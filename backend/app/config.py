from pathlib import Path
from typing import List, Optional
from pydantic import field_validator, ConfigDict
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Private AI Studio"
    data_dir: Path = Path.home() / ".private-ai-studio"
    database_url: str = f"sqlite+aiosqlite:///{data_dir / 'studio.db'}"
    chroma_persist_dir: str = str(data_dir / "chroma")
    embedding_model: str = "all-MiniLM-L6-v2"
    cors_origins: List[str] = ["http://localhost:3000"]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            try:
                import json
                return json.loads(v)
            except json.JSONDecodeError:
                return [o.strip() for o in v.split(",") if o.strip()]
        return v

    @property
    def data_dir_path(self) -> Path:

    model_post_process_dir: Path = data_dir / "models"
    image_output_dir: Path = data_dir / "images"

    llm_provider: str = "ollama"

    ollama_base_url: str = "http://localhost:11434"

    openai_api_key: Optional[str] = None
    openai_api_base: str = "https://api.openai.com/v1"
    openai_model: str = "gpt-4o-mini"

    openrouter_api_key: Optional[str] = None
    openrouter_model: str = "meta-llama/llama-3.1-8b-instruct"

    groq_api_key: Optional[str] = None
    groq_model: str = "llama-3.1-8b-instant"

    together_api_key: Optional[str] = None
    together_model: str = "meta-llama/Llama-3.1-8B-Instruct-Turbo"

    model_config = ConfigDict(env_file=".env", env_file_encoding="utf-8")

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def data_dir_path(self) -> Path:
        return self.data_dir

    def ensure_dirs(self):
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.model_post_process_dir.mkdir(parents=True, exist_ok=True)
        self.image_output_dir.mkdir(parents=True, exist_ok=True)
        chroma_dir = Path(self.chroma_persist_dir)
        chroma_dir.mkdir(parents=True, exist_ok=True)


settings = Settings()
