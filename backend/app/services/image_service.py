import os
import uuid
import asyncio
import time
from typing import Optional, Dict
from ..config import settings


class TaskManager:
    def __init__(self):
        self._tasks: Dict[str, dict] = {}

    def create_task(self) -> str:
        task_id = uuid.uuid4().hex[:12]
        self._tasks[task_id] = {
            "status": "queued",
            "progress": 0.0,
            "results": [],
            "error": None,
            "created_at": time.time(),
        }
        return task_id

    def update(self, task_id: str, **kwargs):
        if task_id in self._tasks:
            self._tasks[task_id].update(kwargs)

    def get(self, task_id: str) -> Optional[dict]:
        return self._tasks.get(task_id)

    def get_all(self) -> list[dict]:
        return list(self._tasks.values())


task_manager = TaskManager()


class ImageGenerator:
    def __init__(self):
        self._pipeline = None
        self._device = "cpu"
        self._available = False
        self._session_factory = None

    async def initialize(self):
        loop = asyncio.get_event_loop()
        self._device = await loop.run_in_executor(None, self._detect_device)

        if self._device == "cpu":
            print("Image generation: CPU only — performance will be slow")
            return False

        try:
            await loop.run_in_executor(None, self._load_pipeline)
            self._available = True
            print(f"Image generation: available on {self._device}")
            return True
        except Exception as e:
            print(f"Image generation unavailable: {e}")
            return False

    def _detect_device(self) -> str:
        try:
            import torch
            if torch.cuda.is_available():
                return "cuda"
            if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
                return "mps"
        except ImportError:
            pass
        return "cpu"

    def _load_pipeline(self):
        from diffusers import DiffusionPipeline
        import torch

        dtype = torch.float16 if self._device == "cuda" else torch.float32
        variant = "fp16" if self._device == "cuda" else None

        print(f"Loading SDXL-Turbo pipeline on {self._device}...")
        self._pipeline = DiffusionPipeline.from_pretrained(
            "stabilityai/sdxl-turbo",
            torch_dtype=dtype,
            variant=variant,
            use_safetensors=True,
        )
        self._pipeline.to(self._device)
        self._pipeline.set_progress_bar_config(disable=True)
        print("SDXL-Turbo loaded successfully")

    async def _save_to_db(self, prompt, negative_prompt, params, image_path, seed):
        try:
            from ..database import async_session
            from ..models import ImageGeneration
            import datetime
            async with async_session() as session:
                record = ImageGeneration(
                    prompt=prompt,
                    negative_prompt=negative_prompt,
                    params=params,
                    image_path=str(image_path),
                    seed=seed,
                    created_at=datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None),
                )
                session.add(record)
                await session.commit()
        except Exception as e:
            print(f"Failed to save image record to DB: {e}")

    async def generate_async(
        self,
        task_id: str,
        prompt: str,
        negative_prompt: str = "",
        width: int = 512,
        height: int = 512,
        steps: int = 4,
        guidance_scale: float = 0.0,
        seed: Optional[int] = None,
    ):
        task_manager.update(task_id, status="running", progress=0.0)

        try:
            if seed is None:
                seed = int.from_bytes(os.urandom(4), "big")

            loop = asyncio.get_event_loop()
            image, final_seed = await loop.run_in_executor(
                None,
                lambda: self._generate_sync(
                    prompt, negative_prompt, width, height, steps, guidance_scale, seed
                ),
            )

            filename = f"gen_{uuid.uuid4().hex[:12]}.png"
            output_path = settings.image_output_dir / filename
            image.save(output_path, "PNG")

            result = {
                "image_path": str(output_path),
                "filename": filename,
                "seed": final_seed,
                "prompt": prompt,
                "negative_prompt": negative_prompt,
                "params": {
                    "width": width,
                    "height": height,
                    "steps": steps,
                    "guidance_scale": guidance_scale,
                },
            }

            task_manager.update(task_id, status="completed", progress=1.0, results=[result])

            await self._save_to_db(
                prompt=prompt,
                negative_prompt=negative_prompt,
                params=result["params"],
                image_path=output_path,
                seed=final_seed,
            )

        except Exception as e:
            task_manager.update(task_id, status="failed", error=str(e))

    def _generate_sync(
        self, prompt, negative_prompt, width, height, steps, guidance_scale, seed
    ):
        import torch
        generator = torch.Generator(device=self._device).manual_seed(seed)

        result = self._pipeline(
            prompt=prompt,
            negative_prompt=negative_prompt if negative_prompt else None,
            width=width,
            height=height,
            num_inference_steps=steps,
            guidance_scale=guidance_scale,
            generator=generator,
            output_type="pil",
        )
        return result.images[0], seed

    @property
    def available(self) -> bool:
        return self._available

    @property
    def device(self) -> str:
        return self._device


image_generator = ImageGenerator()
