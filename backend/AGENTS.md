# Backend — instrucciones de desarrollo

## Alcance y estado

Backend de Wanka Resuelve: Python, FastAPI, Uvicorn y `uv`. El punto de entrada actual está en `src/backend/main.py` e incluye `GET /health`. Los paquetes `apis/`, `schemas/`, `services/` y `repositories/` existen, pero no se debe asumir que contienen funcionalidades de dominio. La base `bd_wanka_resuelve` existe y todavía no tiene tablas.

## Flujo y responsabilidades

```text
main.py → apis/ → services/ → repositories/ → MySQL
                   ↑
            schemas/ valida transversalmente
```

- `main.py`: construir/configurar FastAPI e incluir routers. No alojar reglas de dominio ni SQL.
- `apis/`: declarar rutas, parámetros, códigos y contratos HTTP; validar/serializar con schemas y delegar operaciones a services. No ejecutar consultas SQL ni implementar reglas de negocio.
- `schemas/`: definir y validar datos de entrada y salida, con formatos y restricciones explícitos. No acceder a la base de datos.
- `services/`: implementar reglas de negocio y coordinar operaciones; no contener detalles de transporte HTTP ni consultas SQL.
- `repositories/`: encapsular persistencia y consultas SQL; no tomar decisiones de negocio ni validar reglas propias del dominio.

Mantener las capas desacopladas y el sentido de dependencias. No saltarse services o repositories para resolver una operación.

## MySQL y SQL

- Usar exclusivamente `mysql-connector-python`; **no usar SQLAlchemy, ORM ni abstracciones ORM**.
- Base oficial: MySQL Community Server 26.10.0, host `127.0.0.1`, puerto `3306`, base `bd_wanka_resuelve`, usuario de aplicación `wanka_app`.
- Obtener configuración mediante variables de entorno y `python-dotenv` según el esquema que acuerde el proyecto. No asumir ni inventar nombres de variables como si ya fueran estándar.
- Existe `backend/.env`: no leerlo para imprimirlo, no incluirlo en respuestas, logs, ejemplos ni commits; nunca registrar contraseñas ni cadenas de conexión con credenciales.
- Parametrizar todos los valores de consultas SQL mediante la API del conector. No interpolar ni concatenar entradas para formar valores SQL.
- Los identificadores dinámicos (por ejemplo, nombres de columnas) no se parametrizan como valores: evitarlos o seleccionarlos desde listas permitidas.
- Gestionar conexiones, cursores, transacciones y errores de persistencia explícitamente; liberar recursos y no enviar detalles internos al cliente.
- Mantener SQL exclusivamente en repositories. Los scripts de esquema y datos deben organizarse fuera de las APIs y alinearse con requisitos aprobados.
- Diseñar tablas solo después de revisar requisitos; definir claves y relaciones, preservar integridad referencial y normalizar hasta 3FN. No inventar entidades ni atributos.

## APIs, validación y seguridad

- Usar schemas para validar solicitudes y respuestas; devolver errores HTTP coherentes sin filtrar trazas, credenciales ni detalles internos.
- Mantener las APIs enfocadas en HTTP y delegación a la capa de servicios.
- Validar entradas en servidor aunque el frontend también las valide.
- Mantener configuración sensible fuera del código fuente. No exponer `.env`, credenciales, datos sensibles ni mensajes de excepción detallados.
- Aplicar mínimo privilegio al usuario de base de datos y tratar las entradas externas como no confiables.

## Pruebas

Añadir pruebas pertinentes para endpoints, schemas, reglas de negocio y repositories, usando dobles o una base aislada cuando corresponda para no depender de datos locales compartidos. Verificar casos válidos, inválidos y errores. No afirmar que las pruebas se ejecutaron si no se ejecutaron; informar bloqueos del entorno.

## Criterios de aceptación

- Cada endpoint delega a services y cada operación de persistencia se realiza en repositories.
- Los datos se validan con schemas; la lógica de dominio reside en services.
- Se usa `mysql-connector-python` con SQL parametrizado; no hay ORM ni SQL en APIs.
- Configuración y secretos se obtienen de entorno y nunca se revelan.
- Hay pruebas relevantes y su estado de ejecución queda informado.
- Se documentan por separado elementos implementados, pendientes y verificados.
