from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.sessions import router as sessions_router
from api.models import router as models_router
from api.settings import router as settings_router
from api.ws import router as ws_router

app = FastAPI(title="DissentLab API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://frontend:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sessions_router)
app.include_router(models_router)
app.include_router(settings_router)
app.include_router(ws_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
