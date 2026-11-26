from fastapi import FastAPI

app = FastAPI(
    title="Wanka Resuelve API",
    description="API para el registro y seguimiento de incidencias urbanas.",
    version="1.0.0"
)


@app.get("/health", tags=["Sistema"])
def health_check():
    return {
        "status": "ok",
        "message": "Wanka Resuelve API funcionando"
    }
