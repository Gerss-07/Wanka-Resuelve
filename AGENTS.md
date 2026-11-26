# Wanka Resuelve — instrucciones generales

## Propósito y alcance

Wanka Resuelve es un proyecto universitario para el registro y seguimiento **simulado** de incidencias urbanas en Huancayo, El Tambo y Chilca. Las categorías consideradas son pistas y veredas, residuos sólidos, señalización, parques y áreas verdes, y drenaje y alcantarillas. Estas categorías describen el contexto; no implican que las funcionalidades estén implementadas.

## Estado verificado

- El backend usa Python, FastAPI, Uvicorn, `uv`, `mysql-connector-python` y `python-dotenv`.
- El frontend usa Angular 22, TypeScript y SCSS; conserva la plantilla inicial.
- `backend/src/backend/main.py` expone `GET /health`.
- La base `bd_wanka_resuelve` existe y todavía no tiene tablas.
- Existe `backend/.env`. Su contenido es secreto y no debe leerse, imprimirse, copiarse ni incluirse en documentación, logs, respuestas o commits.
- La configuración Git del equipo sigue pendiente.
- SSR no es un requisito del proyecto. No diseñar funcionalidades que dependan de SSR.

Distinguir siempre entre **implementado**, **pendiente** y **verificado**. No afirmar que algo funciona solo porque está planeado o documentado.

## Arquitectura obligatoria

### Frontend

Mantener las responsabilidades bajo estas áreas:

- `components/`: componentes visuales Angular y sus archivos TypeScript, HTML y SCSS.
- `interfaces/`: contratos y estructuras de datos.
- `services/`: comunicación HTTP con la API.
- `config/`: configuración de la aplicación.
- `guards/`: protección de rutas solo cuando corresponda a requisitos definidos.
- `interceptors/`: interceptores HTTP solo cuando sean necesarios.

Flujo: **componentes → servicios → API REST**. Las interfaces expresan los contratos; los componentes no deben asumir el papel de cliente HTTP.

### Backend

Flujo: **`main.py` → `apis/` → `services/` → `repositories/` → MySQL**.

- `main.py`: inicialización y configuración de FastAPI.
- `apis/`: endpoints y rutas HTTP; delegan la lógica.
- `schemas/`: validación y estructuras de entrada/salida, de uso transversal.
- `services/`: reglas y lógica de negocio.
- `repositories/`: persistencia y consultas SQL.

No intercambiar responsabilidades entre capas.

## Reglas de desarrollo

- Inspeccionar el código y los requisitos antes de cambiarlo; trabajar secuencialmente y no inventar requisitos, entidades, atributos, endpoints ni flujos.
- Respetar la estructura existente. Crear únicamente archivos y carpetas necesarios para una tarea autorizada.
- No utilizar SQLAlchemy ni ningún ORM. Usar exclusivamente `mysql-connector-python` para el acceso a MySQL.
- Usar SQL parametrizado. No construir consultas concatenando valores de entrada.
- No escribir SQL en APIs ni lógica de negocio en repositories.
- Usar variables de entorno para configuración sensible. No incluir credenciales en código, ejemplos con valores reales, documentación, commits ni salidas de consola.
- Validar los datos en el límite apropiado mediante schemas y validaciones del frontend; la validación del cliente no sustituye la del servidor.
- Implementar pruebas relevantes para cada funcionalidad y ejecutar las comprobaciones que correspondan antes de declarar un cambio verificado.
- No instalar dependencias sin necesidad justificada y autorización. No instalar MySQL 8.4; se utilizará la instalación existente.
- Mantener compatibilidad e integración mediante contratos explícitos entre frontend y backend.

## Datos y base de datos

La base oficial es `bd_wanka_resuelve`, en MySQL Community Server 26.10.0, puerto `3306`. El usuario de aplicación indicado es `wanka_app`; nunca documentar ni solicitar su contraseña.

Diseñar entidades y relaciones solo después de revisar los requisitos funcionales. Definir claves primarias y foráneas, integridad referencial y normalización hasta 3FN. Organizar los scripts SQL y evitar redundancias e inconsistencias. La base existe, pero todavía no tiene tablas.

## Seguridad

- Tratar `.env` y cualquier secreto como información confidencial; no revelar siquiera su contenido al diagnosticar errores.
- No registrar contraseñas, tokens, cadenas de conexión completas ni datos sensibles.
- No confiar en datos recibidos desde el navegador; validar en el backend.
- Usar consultas parametrizadas y no exponer detalles internos de excepciones al cliente.
- Mantener los permisos de base de datos limitados a las necesidades de la aplicación.

## Pruebas y aceptación

Una tarea se acepta cuando:

1. cumple requisitos expresamente acordados y mantiene la arquitectura;
2. valida entradas y maneja errores de forma segura;
3. incluye pruebas pertinentes, ejecutadas cuando el entorno lo permita;
4. no expone secretos ni introduce dependencias innecesarias;
5. frontend, API y persistencia respetan sus contratos;
6. la documentación diferencia claramente lo implementado, pendiente y verificado.

Si una prueba no se ejecuta, indicar el motivo y no presentarla como aprobada.

## Equipo y Git

Integrantes: Gersson y Kerry. Flujo previsto: `main` para versión estable, `develop` para integración y `feature/*` para trabajo independiente. Integrar mediante Pull Requests y usar commits descriptivos. La configuración Git aún está pendiente: no asumir que ramas, remoto o protección ya existen ni configurarlos sin autorización.

## Forma de trabajo

Inspeccionar antes de implementar, explicar el alcance y los cambios, trabajar una etapa a la vez y respetar la autorización del usuario. No modificar archivos fuera del alcance solicitado. Comunicar claramente lo implementado, lo pendiente y lo verificado.
