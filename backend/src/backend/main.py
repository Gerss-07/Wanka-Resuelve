from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.apis.health_api import router as health_router
from backend.config import cors_origenes

app = FastAPI(
    title="Wanka Resuelve API",
    description="API para el registro y seguimiento de incidencias urbanas.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origenes(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(health_router)


@app.get("/health", tags=["Sistema"])
def health_check():
    return {
        "status": "ok",
        "message": "Wanka Resuelve API funcionando"
    }
