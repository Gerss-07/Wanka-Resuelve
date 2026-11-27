from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.apis.catalogos import router as catalogos_router
from backend.apis.health import router as health_router
from backend.apis.operador import router as operador_router
from backend.apis.reportes import router as reportes_router
from backend.core.config import get_settings
from backend.core.exception_handlers import register_exception_handlers
from backend.core.lifespan import lifespan

app = FastAPI(
    title="Wanka Resuelve API",
    description="API para el registro y seguimiento de incidencias urbanas.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(health_router)
app.include_router(catalogos_router)
app.include_router(reportes_router)
app.include_router(operador_router)
register_exception_handlers(app)
app.mount(
    "/uploads", StaticFiles(directory=get_settings().uploads_path(), check_dir=False),
    name="uploads",
)
