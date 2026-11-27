# Wanka Resuelve

Aplicación web universitaria para el registro y seguimiento de incidencias urbanas en **Huancayo, El Tambo y Chilca**.

> **Simulación académica — no es un canal oficial de emergencias.**
> Las entidades responsables, cuentas, direcciones y fotos son ficticias. Ningún reporte llega a una institución real.

## Alcance de esta entrega

La entrega se rige por [`docs/ESPECIFICACION_ENTREGA.md`](docs/ESPECIFICACION_ENTREGA.md), que prevalece sobre cualquier versión anterior. Lo que no figura allí no se implementa.

Hay **dos actores**:

- **Ciudadano:** se registra, inicia sesión y gestiona sus reportes. Puede crearlos con categoría, distrito, descripción, referencia, pin en el mapa y de 1 a 3 fotos. Puede listarlos, verlos y, mientras están en `RECIBIDO`, editarlos o eliminarlos.
- **Operador:** cuenta precargada. Revisa todos los reportes en una bandeja con filtros. Asigna prioridad (`BAJA`, `MEDIA`, `ALTA`) y una entidad de la misma categoría, o rechaza con motivo. Después inicia la atención y cierra con un comentario de solución.

La **entidad responsable** es solo un catálogo de datos: no tiene usuarios ni ejecuta acciones.

Ciclo de vida del reporte:

```text
RECIBIDO ──asignar──▶ ASIGNADO ──iniciar atención──▶ EN_ATENCION ──cerrar──▶ CERRADO
    └──rechazar──▶ RECHAZADO                                   (CERRADO y RECHAZADO son finales)
```

Catálogos precargados:
- **Categorías:** Limpieza pública y residuos; Pistas y veredas; Semáforos y señalización vial; Parques, áreas verdes y mobiliario urbano; Drenaje y alcantarillas en vía pública.
- **Distritos:** Huancayo, El Tambo y Chilca.
- **Entidades:** una entidad ficticia por categoría.

### Estado (rama `Kerry`)

| Parte | Estado |
| --- | --- |
| F0 Base: esquema, semillas, configuración, `GET /health` | Implementado |
| F1 Backend ciudadano: catálogos y CRUD de reportes con fotos | Implementado y verificado con `pytest` |
| F2 Backend operador: bandeja con filtros y 4 transiciones | Implementado y verificado con `pytest` |
| F5 parte A: registro, login, JWT y `/auth/me` | Implementado y verificado con `pytest`; **convive con el modo dev** |
| F5 parte B: eliminar el modo dev (`AUTH_MODO`, `X-Dev-Usuario-Id`) | Pendiente |
| F3/F4 Frontend ciudadano y operador | Pendiente en esta rama: el frontend de `Kerry` conserva la plantilla inicial de Angular (el trabajo de frontend va en la rama `gersson`) |
| F6 Guion de validación completo (sección 13) e integración en `develop` | Pendiente |

## Tecnologías

- **Backend:** Python 3.13, FastAPI, Uvicorn y `uv`.
  - Base de datos con `mysql-connector-python`, con SQL parametrizado y sin ORM.
  - Configuración con `pydantic-settings` y archivos con `python-multipart`.
  - Contraseñas con `argon2-cffi` (Argon2id), tokens con `PyJWT` (HS256) y correos con `email-validator`.
  - Pruebas con `pytest` y `httpx`.
- **Base de datos:** MySQL 8.4 en un contenedor Docker, publicado en el puerto `3307`. Hay dos bases: `wkPrueba` (desarrollo) y `wkPrueba_test` (pruebas).
- **Frontend:** Angular 22, TypeScript y SCSS.

Arquitectura del backend:

```text
main.py → apis/ → services/ → repositories/ → MySQL
```

- `schemas/` contiene los contratos y lo usan las tres capas.
- `core/` arma la cadena conexión → repositorio → servicio y contiene la configuración, la conexión por request, las dependencias de sesión y la traducción de errores.

Las reglas completas están en [`AGENTS.md`](AGENTS.md), [`backend/AGENTS.md`](backend/AGENTS.md) y [`frontend/AGENTS.md`](frontend/AGENTS.md).

## Requisitos

- **Docker**, para el servidor MySQL 8.4. El backend y el frontend no corren en Docker.
- **uv** para el backend. `uv` instala Python 3.13 si no está (ver `backend/.python-version`).
- **Node.js con npm.** El proyecto declara `npm@11.19.0` en `frontend/package.json`.
- Un cliente MySQL es opcional: los comandos de abajo usan el que viene dentro del contenedor.

## Puesta en marcha

Los comandos usan la sintaxis de **Git Bash** y se ejecutan desde la raíz del repositorio, salvo que se indique otra cosa. En PowerShell, la redirección `< archivo` no existe: usa `Get-Content archivo | comando`.

### 1. Contenedor de MySQL 8.4

Crea el contenedor una sola vez. El nombre `wanka-mysql` es un ejemplo. Elige tu propia contraseña de `root` y **no la escribas en el repositorio**: la pondrás solo en `backend/.env`.

```bash
docker run --name wanka-mysql \
  -e MYSQL_ROOT_PASSWORD='<elige-una-contraseña>' \
  -p 3307:3306 -d mysql:8.4
```

Las veces siguientes basta con `docker start wanka-mysql`.

Crea las dos bases. `schema.sql` no crea la base, solo las tablas.

```bash
docker exec -i wanka-mysql sh -c 'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD"' <<'SQL'
CREATE DATABASE IF NOT EXISTS wkPrueba      CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE DATABASE IF NOT EXISTS wkPrueba_test CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
SQL
```

`"$MYSQL_ROOT_PASSWORD"` se expande **dentro** del contenedor, así que la contraseña no aparece en tu historial de comandos.

Es normal que MySQL muestre el aviso «Using a password on the command line interface can be insecure».

### 2. Tablas y catálogos (`schema.sql` y `seed.sql`)

> ⚠️ `database/schema.sql` **borra y vuelve a crear** las 8 tablas, así que se pierden los datos. Ejecútalo solo contra `wkPrueba`.

```bash
docker exec -i wanka-mysql sh -c 'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" wkPrueba' < database/schema.sql
docker exec -i wanka-mysql sh -c 'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" wkPrueba' < database/seed.sql
```

`seed.sql` carga las 5 categorías, los 3 distritos y las 5 entidades. Se puede repetir sin duplicar datos (`INSERT IGNORE`).

La base `wkPrueba_test` no necesita este paso: `pytest` le aplica `schema.sql` y `seed.sql` en cada corrida (ver el paso 7).

### 3. Variables de entorno (`backend/.env`)

```bash
cp backend/.env.example backend/.env
```

Completa `backend/.env` con tus valores. El archivo está en `.gitignore`: **no lo subas ni compartas su contenido**.

| Variable | Qué poner |
| --- | --- |
| `DB_HOST`, `DB_PORT` | `127.0.0.1` y `3307` |
| `DB_NOMBRE`, `DB_NOMBRE_TEST` | `wkPrueba` y `wkPrueba_test`. La de pruebas **debe** terminar en `_test` y ser distinta de `DB_NOMBRE`; si no, `pytest` se niega a correr. |
| `DB_USUARIO`, `DB_CONTRASENA` | `root` y la contraseña que elegiste para el contenedor |
| `AUTH_MODO` | `dev` mientras exista el modo temporal (se elimina en F5 parte B) |
| `JWT_SECRETO` | Al menos 32 caracteres; si no, **la API no arranca**. Puedes generarlo con `python -c "import secrets; print(secrets.token_urlsafe(48))"`. |
| `JWT_EXPIRA_MINUTOS` | Vigencia del token, por ejemplo `60` |
| `CORS_ORIGENES` | `http://localhost:4200,http://127.0.0.1:4200` |
| `UPLOADS_DIR` | `uploads`, relativo a `backend/`; ahí se guardan las fotos y está en `.gitignore` |
| `OPERADOR_*`, `DEMO_CIUDADANO_*` | Correo, nombre y contraseña (mínimo 8 caracteres) del operador y del ciudadano de demostración |

### 4. Dependencias y usuarios semilla (`seed_usuarios.py`)

```bash
cd backend
uv sync
uv run python scripts/seed_usuarios.py
cd ..
```

El script crea el operador y el ciudadano de demostración con contraseñas Argon2id, a partir de las variables `OPERADOR_*` y `DEMO_CIUDADANO_*`. Es re-ejecutable: si el correo ya existe, no lo duplica. Al terminar imprime los `id_usuario` de ambos, que sirven para el modo dev.

### 5. Backend (API en `http://localhost:8000`)

```bash
uv run --directory backend uvicorn backend.main:app --app-dir src --reload
```

- Documentación interactiva en `http://localhost:8000/docs`. El botón **Authorize** acepta el token de `POST /auth/login`.
- `GET /health` comprueba la API y `GET /health/db` la conexión a MySQL.
- Las fotos se sirven en `/uploads/reportes/…`.
- Todas las conexiones usan la hora de Perú (`-05:00`).

Mientras `AUTH_MODO=dev`, también se puede actuar como un usuario con la cabecera `X-Dev-Usuario-Id: <id_usuario>`, sin token. Este atajo es temporal y se elimina en la parte B de F5.

### 6. Frontend (`http://localhost:4200`)

```bash
cd frontend
npm install
npm start
```

`npm start` ejecuta `ng serve`. `npm run build` compila y `npm test` corre las pruebas configuradas.

En la rama `Kerry` el frontend todavía es la plantilla inicial de Angular; las pantallas de la entrega se desarrollan en la rama `gersson`.

### 7. Pruebas del backend (`pytest`)

Requiere el contenedor encendido, la base `wkPrueba_test` creada (paso 1) y `backend/.env` completo.

```bash
uv run --directory backend pytest -q
```

- `tests/conftest.py` **borra y recrea** las tablas de `DB_NOMBRE_TEST` y crea sus propios usuarios de prueba. Antes de tocar MySQL comprueba que el nombre de la base termina en `_test` y es distinto de `DB_NOMBRE`.
- Las fotos se escriben en una carpeta temporal y el `JWT_SECRETO` de las pruebas se genera al azar en cada corrida, así que los datos de `wkPrueba` y tu `.env` no se tocan.
- Cubre los casos automatizables del guion de la sección 13 de la especificación, además de permisos, validaciones y transiciones inválidas.

## API (resumen)

El contrato completo, con campos, códigos y esquemas de respuesta, está en la sección 7 de la especificación. Las rutas no llevan el prefijo `/api`, y todos los errores llegan como `{"detail": "mensaje"}`.

| Grupo | Rutas |
| --- | --- |
| Autenticación | `POST /auth/registro`, `POST /auth/login`, `GET /auth/me` |
| Catálogos | `GET /categorias`, `GET /distritos`, `GET /entidades` (operador) |
| Ciudadano | `POST /reportes` (multipart, 1–3 fotos), `GET /reportes/mis-reportes`, `GET/PUT/DELETE /reportes/{id}` |
| Operador | `GET /operador/reportes` (filtros), `POST /operador/reportes/{id}/asignar`, `…/rechazar`, `…/iniciar-atencion`, `…/cerrar` |

## Limitaciones aceptadas

- Las fotos se sirven por `/uploads` sin verificar sesión; solo las protege su nombre aleatorio.
- Cerrar sesión borra el token del navegador, pero el token sigue siendo válido hasta que vence.
- El mapa necesita internet para cargar los mosaicos de OpenStreetMap.

## Equipo y ramas

Integrantes: **Gersson** y **Kerry**.

- `main`: versión validada.
- `develop`: integración.
- `Kerry` y `gersson`: ramas personales de trabajo.

La integración se hace mediante Pull Requests.
