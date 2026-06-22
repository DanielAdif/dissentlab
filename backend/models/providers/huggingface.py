import os
import asyncio
from typing import AsyncIterator
from .base import BaseProvider, ModelConfig

MODEL_ID = "Qwen/Qwen3-0.6B"
MODEL_PATH = os.environ.get("MODELS_PATH", "/data/models") + "/Qwen3-0.6B"

_model = None
_tokenizer = None
_model_lock = asyncio.Lock()

def _is_downloaded() -> bool:
    return os.path.exists(MODEL_PATH) and os.path.exists(os.path.join(MODEL_PATH, "config.json"))

async def download_model() -> AsyncIterator[dict]:
    if _is_downloaded():
        yield {"status": "already_downloaded", "progress": 100, "message": "Model already available"}
        return
    yield {"status": "downloading", "progress": 0, "message": "Starting download of Qwen3-0.6B (~400MB)..."}
    try:
        from huggingface_hub import snapshot_download
        import threading
        result = {}
        def _download():
            try:
                snapshot_download(repo_id=MODEL_ID, local_dir=MODEL_PATH)
                result["success"] = True
            except Exception as e:
                result["error"] = str(e)
        thread = threading.Thread(target=_download)
        thread.start()
        while thread.is_alive():
            await asyncio.sleep(2)
            yield {"status": "downloading", "progress": 50, "message": "Downloading..."}
        thread.join()
        if result.get("error"):
            yield {"status": "error", "progress": 0, "message": result["error"]}
        else:
            yield {"status": "completed", "progress": 100, "message": "Download complete"}
    except Exception as e:
        yield {"status": "error", "progress": 0, "message": str(e)}

async def _load_model():
    global _model, _tokenizer
    async with _model_lock:
        if _model is not None:
            return
        if not _is_downloaded():
            raise RuntimeError("Qwen3-0.6B model not downloaded. Use the onboarding screen to download it first.")
        from transformers import AutoModelForCausalLM, AutoTokenizer
        import torch
        _tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
        _model = AutoModelForCausalLM.from_pretrained(MODEL_PATH, torch_dtype=torch.float32)
        _model.eval()

class HuggingFaceProvider(BaseProvider):
    async def generate(self, messages: list[dict], config: ModelConfig) -> str:
        await _load_model()
        import torch
        prompt = _tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        inputs = _tokenizer(prompt, return_tensors="pt")
        with torch.no_grad():
            outputs = _model.generate(
                **inputs,
                max_new_tokens=1024,
                temperature=0.7,
                do_sample=True,
                pad_token_id=_tokenizer.eos_token_id,
            )
        generated = outputs[0][inputs["input_ids"].shape[1]:]
        return _tokenizer.decode(generated, skip_special_tokens=True)

    async def stream(self, messages: list[dict], config: ModelConfig) -> AsyncIterator[str]:
        result = await self.generate(messages, config)
        for word in result.split():
            yield word + " "
            await asyncio.sleep(0.02)

    @property
    def supports_tool_calling(self) -> bool:
        return False

    @property
    def context_window(self) -> int:
        return 32768
