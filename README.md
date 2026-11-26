# Wanka Resuelve

Aplicación web universitaria para el registro y seguimiento **simulado** de incidencias urbanas en Huancayo, El Tambo y Chilca. El contexto contempla pistas y veredas, residuos sólidos, señalización, parques y áreas verdes, y drenaje y alcantarillas. No se consideran implementadas funcionalidades de gestión por el solo hecho de describir estas categorías.

## Estado actual

**Verificado:** el frontend Angular conserva la plantilla inicial; el backend FastAPI incluye `GET /health`; la base `bd_wanka_resuelve` existe y todavía no contiene tablas.

**Pendiente:** funcionalidades de incidencias, modelo de datos y tablas, integración completa entre frontend, API y base de datos, pruebas de funcionalidades y configuración del flujo Git del equipo.

## Tecnologías

- Frontend: Angular 22, TypeScript y SCSS.
- Backend: Python, FastAPI, Uvicorn, `uv`, `mysql-connector-python` y `python-dotenv`.
- Base de datos: MySQL Community Server 26.10.0; host `127.0.0.1`, puerto `3306`, base `bd_wanka_resuelve`, usuario de aplicación `wanka_app`.

No instalar MySQL 8.4. La aplicación obtiene la configuración sensible del entorno; existe `backend/.env`, cuyo contenido no debe mostrarse, compartirse ni incluirse en el repositorio.

## Estructura

```text
.
├── AGENTS.md
├── README.md
├── backend/
│   ├── AGENTS.md
│   ├── pyproject.toml
│   ├── uv.lock
│   └── src/backend/
│       ├── main.py
│       ├── apis/
│       ├── schemas/
│       ├── services/
│       └── repositories/
└── frontend/
    ├── AGENTS.md
    ├── package.json
    └── src/
        └── app/
```

Las carpetas `components/`, `interfaces/`, `services/`, `config/`, `guards/` e `interceptors/` son la organización frontend requerida; se incorporarán cuando corresponda al desarrollo. No se sobrescriben los README generados dentro de `frontend/` y `backend/`.

## Requisitos previos

- Node.js 26.7.0 y npm 11.19.0.
- Python 3.13 o compatible con `backend/pyproject.toml`, y `uv`.
- La instalación existente de MySQL Community Server 26.10.0 y la base `bd_wanka_resuelve`.
- Configuración local de entorno para backend. No copiar ni compartir secretos; consultar al equipo los nombres de variables requeridos antes de preparar el entorno.

## Ejecución local

Los siguientes comandos corresponden a los scripts y la estructura configurados en el repositorio; **no se han verificado ejecutándolos como parte de esta documentación**.

### Frontend

Desde `frontend/`:

```bash
npm start
```

El script ejecuta `ng serve`. Para construir o correr las pruebas configuradas:

```bash
npm run build
npm test
```

### Backend

Desde la raíz del repositorio:

```bash
uv run --directory backend uvicorn backend.main:app --app-dir src --reload
```

Este comando inicia Uvicorn con el módulo de aplicación `backend.main:app`; el endpoint de salud existente es `GET /health`. La disponibilidad de la conexión a MySQL requiere configurar correctamente el entorno local. No incluir valores secretos en comandos, capturas o registros.

## Arquitectura y reglas

- Frontend: **componentes → servicios → API REST**; interfaces definen los contratos.
- Backend: **`main.py` → APIs → services → repositories → MySQL**; `schemas/` valida datos transversalmente.
- No usar SQLAlchemy ni ORM. Usar `mysql-connector-python`, SQL parametrizado y separación de responsabilidades.
- No colocar SQL en APIs ni lógica de negocio en repositories.
- Validar datos en frontend y backend, y añadir pruebas para cada funcionalidad.
- SSR no es un requisito del proyecto.

Las instrucciones detalladas están en [`AGENTS.md`](AGENTS.md), [`backend/AGENTS.md`](backend/AGENTS.md) y [`frontend/AGENTS.md`](frontend/AGENTS.md).

## Trabajo en equipo

Integrantes: Gersson y Kerry. Flujo previsto: `main` (estable), `develop` (integración) y `feature/*` (funcionalidades), con Pull Requests y commits descriptivos. La configuración Git aún está pendiente.
