# Wanka Resuelve — Especificación de entrega (Ciudadano + Operador)

Nov 26, 2026 · @Jose

## 1. Propósito y alcance

Esta entrega implementa un flujo completo entre **dos actores: Ciudadano y Operador**. El ciudadano registra y gestiona sus reportes (CRUD), y el operador los revisa, prioriza, asigna a una entidad del catálogo, atiende y cierra. La Entidad Responsable es solo un **catálogo de datos**: no tiene usuarios, no inicia sesión y no ejecuta acciones.

- **Base:** se deriva de la especificación funcional web v0.3 de Wanka Resuelve. Mantiene la terminología, las categorías, los distritos y los nombres de estado, y simplifica las reglas.
- **Prevalencia:** para esta entrega, este documento reemplaza a la especificación v0.3. Lo que no aparece aquí no se implementa.
- **Simulación académica:** las entidades, cuentas, direcciones y fotos son ficticias. La interfaz debe mostrar siempre el aviso *«Simulación académica — no es un canal oficial de emergencias»*.
- **Obligatorio:** la arquitectura del profesor (sección 11) y la autenticación con JWT y contraseñas con Argon2id (sección 10).
- **Objetivo verificable:** el guion de la sección 13 se ejecuta de punta a punta sin errores.

**Instrucción para el agente de IA:** implementa solo lo que describe este documento, fase por fase (sección 12). No agregues idempotencia, avisos, plazos automáticos, visitante público, usuarios de entidad ni funciones de la v0.3 que aquí no figuran.

## 2. Actores y permisos

Hay dos roles, guardados en `usuario.rol`: `CIUDADANO` y `OPERADOR`. El ciudadano se registra solo; el operador es una cuenta precargada por script. FastAPI verifica el rol y la propiedad del reporte en cada endpoint; ocultar botones en Angular no cuenta como autorización.

| Acción | Ciudadano | Operador |
| --- | --- | --- |
| Registrarse | Sí | No (precargado) |
| Iniciar sesión | Sí | Sí |
| Crear reporte | Sí | No |
| Listar reportes | Solo los propios | Todos, con filtros |
| Ver detalle e historial | Solo los propios | Todos |
| Editar reporte | Propio y en `RECIBIDO` | No |
| Eliminar reporte | Propio y en `RECIBIDO` | No |
| Asignar (prioridad + entidad) | No | En `RECIBIDO` |
| Rechazar con motivo | No | En `RECIBIDO` |
| Iniciar atención | No | En `ASIGNADO` |
| Cerrar con solución | No | En `EN_ATENCION` |

Respuestas ante accesos indebidos: sin sesión → `401`; rol incorrecto → `403`; reporte de otro ciudadano → `404` (no se revela que existe).

## 3. Catálogos y datos semilla

Los catálogos se precargan por script y no se editan desde la interfaz. Cada entidad ficticia atiende **una categoría en los tres distritos**, así la compatibilidad se valida solo por categoría.

**Categorías (exactamente cinco)**

1. Limpieza pública y residuos
2. Pistas y veredas
3. Semáforos y señalización vial
4. Parques, áreas verdes y mobiliario urbano
5. Drenaje y alcantarillas en vía pública

**Distritos:** Huancayo, El Tambo y Chilca.

**Entidades responsables (catálogo ficticio)**

| Entidad | Categoría que atiende |
| --- | --- |
| Unidad Simulada de Limpieza Pública | Limpieza pública y residuos |
| Unidad Simulada de Vías y Veredas | Pistas y veredas |
| Unidad Simulada de Señalización Vial | Semáforos y señalización vial |
| Unidad Simulada de Parques y Áreas Verdes | Parques, áreas verdes y mobiliario urbano |
| Unidad Simulada de Drenaje Urbano | Drenaje y alcantarillas en vía pública |

**Usuarios semilla**

- Categorías, distritos y entidades se cargan con SQL (`database/seed.sql`).
- El operador y un ciudadano de demostración se crean con `backend/scripts/seed_usuarios.py`, porque el hash Argon2id debe generarse en Python.
- El script lee correo, nombre y contraseña de variables del `.env` (`OPERADOR_CORREO`, `OPERADOR_NOMBRE`, `OPERADOR_CONTRASENA`, `DEMO_CIUDADANO_CORREO`, `DEMO_CIUDADANO_NOMBRE`, `DEMO_CIUDADANO_CONTRASENA`). No se escriben contraseñas en el repositorio.
- El script es re-ejecutable: si el correo ya existe, no duplica.

## 4. Reglas de negocio

Son doce reglas, numeradas RR-01 a RR-12 («regla reducida») para que no se confundan con las RN de la v0.3.

- **RR-01 Autoría:** solo un `CIUDADANO` autenticado crea reportes. El autor es el usuario de la sesión, nunca un campo enviado por el cliente.
- **RR-02 Datos obligatorios:** categoría, distrito, descripción, dirección o referencia escrita (ejemplo: «Av. Ferrocarril, frente a Mallplaza»), pin con latitud y longitud, y de 1 a 3 fotos.
- **RR-03 Identificación:** al crear, el servidor asigna código único `WR-AAAA-NNNNNN` (año + id con ceros), fecha y hora del servidor y estado `RECIBIDO`.
- **RR-04 Edición ciudadana:** el autor puede editar categoría, distrito, descripción, referencia y pin solo en `RECIBIDO`. Las fotos no se editan; para cambiarlas se elimina y se crea otro reporte.
- **RR-05 Eliminación ciudadana:** el autor puede eliminar su reporte solo en `RECIBIDO`. Se borran el registro, sus fotos en disco y su historial.
- **RR-06 Asignación:** el operador asigna un reporte `RECIBIDO` fijando prioridad (`BAJA`, `MEDIA` o `ALTA`) y una entidad cuya categoría coincida con la del reporte. Pasa a `ASIGNADO`. La prioridad es clasificación manual, no un plazo garantizado.
- **RR-07 Rechazo:** el operador rechaza un reporte `RECIBIDO` con motivo obligatorio (mínimo 10 caracteres). Pasa a `RECHAZADO`, estado final.
- **RR-08 Atención:** el operador pasa un reporte `ASIGNADO` a `EN_ATENCION`, con comentario opcional. Simula que la entidad empezó a trabajar.
- **RR-09 Cierre:** el operador cierra un reporte `EN_ATENCION` con comentario de solución obligatorio (mínimo 10 caracteres). Pasa a `CERRADO`, estado final.
- **RR-10 Inmutabilidad:** desde `ASIGNADO`, nadie cambia categoría, distrito, descripción, referencia, pin ni fotos.
- **RR-11 Transiciones:** el backend valida el estado de origen de cada acción. Una acción fuera de su estado responde `409` y no cambia nada.
- **RR-12 Historial:** cada transición, incluida la creación, agrega una fila a `historial_estado` con estado anterior, estado nuevo, usuario, fecha y comentario. Las filas no se modifican.

## 5. Estados y transiciones

El reporte tiene cinco estados: `RECIBIDO`, `ASIGNADO`, `EN_ATENCION`, `CERRADO` y `RECHAZADO`. Los dos últimos son finales. El ciudadano solo actúa mientras el reporte está en `RECIBIDO`; desde ahí, cada cambio lo hace el operador.

&#91;embedded content: ciclo de vida del reporte · 5 estados, 2 finales\]

El camino feliz es la columna central. Cualquier acción pedida fuera del estado de origen indicado responde `409` y no cambia nada.

| Desde | Acción | Actor | Endpoint | Hacia | Datos requeridos |
| --- | --- | --- | --- | --- | --- |
| — (nuevo) | Crear | Ciudadano | `POST /reportes` | `RECIBIDO` | Los de RR-02 |
| `RECIBIDO` | Editar | Ciudadano | `PUT /reportes/{id}` | `RECIBIDO` (no cambia) | Campos editables de RR-04 |
| `RECIBIDO` | Eliminar | Ciudadano | `DELETE /reportes/{id}` | Se borra | — |
| `RECIBIDO` | Asignar | Operador | `POST /operador/reportes/{id}/asignar` | `ASIGNADO` | `prioridad`, `id_entidad` de la misma categoría |
| `RECIBIDO` | Rechazar | Operador | `POST /operador/reportes/{id}/rechazar` | `RECHAZADO` | `motivo` |
| `ASIGNADO` | Iniciar atención | Operador | `POST /operador/reportes/{id}/iniciar-atencion` | `EN_ATENCION` | `comentario` opcional |
| `EN_ATENCION` | Cerrar | Operador | `POST /operador/reportes/{id}/cerrar` | `CERRADO` | `comentario_solucion` |

Crear, asignar, rechazar, iniciar atención y cerrar agregan una fila al historial. Editar y eliminar no la agregan, porque no son transiciones.

## 6. Modelo de datos MySQL

Son ocho tablas en 3FN, con InnoDB y `utf8mb4`, que se crean igual en `wkPrueba` y en `wkPrueba_test`. `database/schema.sql` **borra y vuelve a crear** todas las tablas: durante el desarrollo el esquema se corrige ahí y se vuelve a ejecutar. `database/seed.sql` carga los catálogos y se puede repetir sin duplicar datos (`INSERT IGNORE`).

| Tabla | Propósito | Relaciones |
| --- | --- | --- |
| `usuario` | Ciudadanos y operador | — |
| `categoria` | Las cinco categorías | — |
| `distrito` | Los tres distritos | — |
| `entidad_responsable` | Catálogo ficticio | N:1 `categoria` |
| `reporte` | Datos que registra el ciudadano + estado actual | N:1 `usuario`, `categoria`, `distrito` |
| `foto_reporte` | De 1 a 3 fotos (`orden` 1–3, único por reporte) | N:1 `reporte`, borrado en cascada |
| `asignacion_reporte` | Entidad y prioridad que decide el operador | 1:0..1 `reporte`; N:1 `entidad_responsable` |
| `historial_estado` | Bitácora de transiciones; guarda motivo de rechazo y solución en `comentario` | N:1 `reporte` (cascada), N:1 `usuario` |

**Justificación de la normalización**

- **1FN:** todos los valores son atómicos. Las fotos van en su propia tabla, no como columnas `foto1`, `foto2`, `foto3`.
- **2FN:** todas las claves primarias son de una sola columna, así que no hay dependencias parciales.
- **3FN:** ningún atributo no clave depende de otro atributo no clave. Por eso la entidad y la prioridad salen de `reporte` a `asignacion_reporte`: dentro de `reporte`, `id_entidad` determinaría la categoría (dependencia transitiva) y quedarían columnas nulas hasta la asignación. El motivo de rechazo y la solución se guardan una sola vez, en `historial_estado`.
- **Redundancias controladas y justificadas:** `reporte.estado` es el estado actual que usa el `UPDATE … WHERE estado = %s` para validar transiciones. `historial_estado.estado_anterior` forma parte del hecho auditado (la transición «de → a»). `reporte.codigo` es una clave candidata derivada del id, y una dependencia desde una clave candidata está permitida en 3FN.
- **Integridad en la propia base:** las `FOREIGN KEY` tienen nombre; los `UNIQUE` evitan correos, nombres y rutas duplicados y una cuarta foto; los `CHECK` validan longitudes mínimas, rango de coordenadas, tamaño y tipo de foto, y que una transición no repita el mismo estado.

```sql
SET NAMES utf8mb4;

DROP TABLE IF EXISTS historial_estado;
DROP TABLE IF EXISTS asignacion_reporte;
DROP TABLE IF EXISTS foto_reporte;
DROP TABLE IF EXISTS reporte;
DROP TABLE IF EXISTS entidad_responsable;
DROP TABLE IF EXISTS distrito;
DROP TABLE IF EXISTS categoria;
DROP TABLE IF EXISTS usuario;

CREATE TABLE usuario (
  id_usuario      INT          NOT NULL AUTO_INCREMENT,
  nombre          VARCHAR(100) NOT NULL,
  correo          VARCHAR(150) NOT NULL,
  contrasena_hash VARCHAR(255) NOT NULL,
  rol             ENUM('CIUDADANO','OPERADOR') NOT NULL,
  fecha_creacion  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_usuario PRIMARY KEY (id_usuario),
  CONSTRAINT uq_usuario_correo UNIQUE (correo),
  CONSTRAINT ck_usuario_nombre CHECK (CHAR_LENGTH(nombre) >= 2),
  CONSTRAINT ck_usuario_correo CHECK (correo LIKE '%_@_%._%')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE categoria (
  id_categoria INT          NOT NULL AUTO_INCREMENT,
  nombre       VARCHAR(100) NOT NULL,
  CONSTRAINT pk_categoria PRIMARY KEY (id_categoria),
  CONSTRAINT uq_categoria_nombre UNIQUE (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE distrito (
  id_distrito INT         NOT NULL AUTO_INCREMENT,
  nombre      VARCHAR(50) NOT NULL,
  CONSTRAINT pk_distrito PRIMARY KEY (id_distrito),
  CONSTRAINT uq_distrito_nombre UNIQUE (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE entidad_responsable (
  id_entidad   INT          NOT NULL AUTO_INCREMENT,
  nombre       VARCHAR(150) NOT NULL,
  id_categoria INT          NOT NULL,
  CONSTRAINT pk_entidad_responsable PRIMARY KEY (id_entidad),
  CONSTRAINT uq_entidad_nombre UNIQUE (nombre),
  CONSTRAINT fk_entidad_categoria FOREIGN KEY (id_categoria)
    REFERENCES categoria (id_categoria)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE reporte (
  id_reporte          INT           NOT NULL AUTO_INCREMENT,
  codigo              VARCHAR(20)   NULL,
  id_ciudadano        INT           NOT NULL,
  id_categoria        INT           NOT NULL,
  id_distrito         INT           NOT NULL,
  descripcion         VARCHAR(1000) NOT NULL,
  referencia          VARCHAR(255)  NOT NULL,
  latitud             DECIMAL(9,6)  NOT NULL,
  longitud            DECIMAL(9,6)  NOT NULL,
  estado              ENUM('RECIBIDO','RECHAZADO','ASIGNADO','EN_ATENCION','CERRADO')
                                    NOT NULL DEFAULT 'RECIBIDO',
  fecha_creacion      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT pk_reporte PRIMARY KEY (id_reporte),
  CONSTRAINT uq_reporte_codigo UNIQUE (codigo),
  CONSTRAINT fk_reporte_ciudadano FOREIGN KEY (id_ciudadano) REFERENCES usuario (id_usuario),
  CONSTRAINT fk_reporte_categoria FOREIGN KEY (id_categoria) REFERENCES categoria (id_categoria),
  CONSTRAINT fk_reporte_distrito  FOREIGN KEY (id_distrito)  REFERENCES distrito (id_distrito),
  CONSTRAINT ck_reporte_descripcion CHECK (CHAR_LENGTH(descripcion) >= 10),
  CONSTRAINT ck_reporte_referencia  CHECK (CHAR_LENGTH(referencia) >= 5),
  CONSTRAINT ck_reporte_latitud     CHECK (latitud  BETWEEN -90  AND 90),
  CONSTRAINT ck_reporte_longitud    CHECK (longitud BETWEEN -180 AND 180),
  INDEX idx_reporte_estado_fecha    (estado, fecha_creacion),
  INDEX idx_reporte_ciudadano_fecha (id_ciudadano, fecha_creacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE foto_reporte (
  id_foto       INT          NOT NULL AUTO_INCREMENT,
  id_reporte    INT          NOT NULL,
  orden         TINYINT      NOT NULL,
  ruta_relativa VARCHAR(255) NOT NULL,
  tipo_mime     VARCHAR(20)  NOT NULL,
  tamano_bytes  INT          NOT NULL,
  fecha_subida  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_foto_reporte PRIMARY KEY (id_foto),
  CONSTRAINT uq_foto_reporte_orden UNIQUE (id_reporte, orden),
  CONSTRAINT uq_foto_reporte_ruta  UNIQUE (ruta_relativa),
  CONSTRAINT fk_foto_reporte FOREIGN KEY (id_reporte)
    REFERENCES reporte (id_reporte) ON DELETE CASCADE,
  CONSTRAINT ck_foto_orden  CHECK (orden BETWEEN 1 AND 3),
  CONSTRAINT ck_foto_tamano CHECK (tamano_bytes BETWEEN 1 AND 2000000),
  CONSTRAINT ck_foto_tipo   CHECK (tipo_mime IN ('image/jpeg','image/png'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE asignacion_reporte (
  id_reporte INT NOT NULL,
  id_entidad INT NOT NULL,
  prioridad  ENUM('BAJA','MEDIA','ALTA') NOT NULL,
  CONSTRAINT pk_asignacion_reporte PRIMARY KEY (id_reporte),
  CONSTRAINT fk_asignacion_reporte FOREIGN KEY (id_reporte)
    REFERENCES reporte (id_reporte) ON DELETE CASCADE,
  CONSTRAINT fk_asignacion_entidad FOREIGN KEY (id_entidad)
    REFERENCES entidad_responsable (id_entidad)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE historial_estado (
  id_historial    INT           NOT NULL AUTO_INCREMENT,
  id_reporte      INT           NOT NULL,
  estado_anterior ENUM('RECIBIDO','RECHAZADO','ASIGNADO','EN_ATENCION','CERRADO') NULL,
  estado_nuevo    ENUM('RECIBIDO','RECHAZADO','ASIGNADO','EN_ATENCION','CERRADO') NOT NULL,
  id_usuario      INT           NOT NULL,
  comentario      VARCHAR(1000) NULL,
  fecha           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_historial_estado PRIMARY KEY (id_historial),
  CONSTRAINT fk_historial_reporte FOREIGN KEY (id_reporte)
    REFERENCES reporte (id_reporte) ON DELETE CASCADE,
  CONSTRAINT fk_historial_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario),
  CONSTRAINT ck_historial_transicion
    CHECK (estado_anterior IS NULL OR estado_anterior <> estado_nuevo),
  INDEX idx_historial_reporte_fecha (id_reporte, fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

**Notas para la implementación**

- **Ejecución:** MySQL 8.4 corre en Docker en `127.0.0.1:3307`. En este entorno local de desarrollo el backend se conecta como `root`; la contraseña solo va en `backend/.env`. El orden es `schema.sql`, luego `seed.sql` y luego `seed_usuarios.py`, en `wkPrueba` y en `wkPrueba_test`.
- **Código:** el reporte se inserta con `codigo` en `NULL` y, en la misma transacción, se actualiza a `WR-{año}-{id:06d}`.
- **Crear:** el reporte, sus fotos (`orden` 1, 2, 3) y el historial `NULL → RECIBIDO` van en una sola transacción. Si algo falla, se hace *rollback* y se borran los archivos ya escritos.
- **Asignar:** en una transacción van el `UPDATE reporte SET estado = 'ASIGNADO' WHERE id_reporte = %s AND estado = 'RECIBIDO'`, el `INSERT` en `asignacion_reporte` y el `INSERT` en el historial. Antes, el servicio comprueba que `entidad_responsable.id_categoria` sea igual a `reporte.id_categoria`.
- **Rechazar, iniciar atención y cerrar:** `UPDATE` del estado con su estado de origen en el `WHERE` + `INSERT` en el historial, con el motivo o el comentario en `comentario`.
- **Lecturas para la API:** `prioridad` y `entidad` salen de un `LEFT JOIN` con `asignacion_reporte`; `motivo_rechazo` es el `comentario` del historial con `estado_nuevo = 'RECHAZADO'`, y `comentario_solucion` el de `estado_nuevo = 'CERRADO'`. El contrato de la sección 7 no cambia.
- **Fotos:** se guardan en `UPLOADS_DIR/reportes/` con nombre `uuid4().hex` más la extensión real. En MySQL solo va la ruta relativa (`reportes/3f9a…c1.jpg`). La carpeta `uploads/` va en `.gitignore`.

## 7. Contrato de la API REST

La base es `http://localhost:8000`. El backend y el frontend se implementan contra este contrato sin cambiar rutas ni nombres de campos. Todo es JSON, salvo la creación de reportes (`multipart/form-data`). Las fechas van en ISO 8601 y los errores usan el formato de FastAPI: `{"detail": "mensaje"}`.

**Autenticación (fase 5)**

| Método | Ruta | Rol | Entrada | Respuesta OK | Errores |
| --- | --- | --- | --- | --- | --- |
| POST | `/auth/registro` | Público | `{nombre, correo, contrasena}` | `201` `Usuario` | `409` correo ya registrado, `422` |
| POST | `/auth/login` | Público | `{correo, contrasena}` | `200` `{access_token, token_type: "bearer", usuario: Usuario}` | `401` «Credenciales inválidas» |
| GET | `/auth/me` | Autenticado | — | `200` `Usuario` | `401` |

**Catálogos**

| Método | Ruta | Rol | Entrada | Respuesta OK |
| --- | --- | --- | --- | --- |
| GET | `/categorias` | Autenticado | — | `200` `[{id_categoria, nombre}]` |
| GET | `/distritos` | Autenticado | — | `200` `[{id_distrito, nombre}]` |
| GET | `/entidades` | Operador | `?id_categoria=` (opcional) | `200` `[{id_entidad, nombre, id_categoria}]` |

**Ciudadano**

| Método | Ruta | Entrada | Respuesta OK | Errores |
| --- | --- | --- | --- | --- |
| POST | `/reportes` | *multipart*: `id_categoria`, `id_distrito`, `descripcion`, `referencia`, `latitud`, `longitud`, `fotos` (1–3 archivos) | `201` `ReporteDetalle` | `422` validación o fotos, `403` |
| GET | `/reportes/mis-reportes` | — | `200` `[ReporteResumen]`, del más reciente al más antiguo | `403` |
| GET | `/reportes/{id}` | — | `200` `ReporteDetalle` (autor u operador) | `404` |
| PUT | `/reportes/{id}` | `{id_categoria, id_distrito, descripcion, referencia, latitud, longitud}` | `200` `ReporteDetalle` | `404`, `409` si no está en `RECIBIDO`, `422` |
| DELETE | `/reportes/{id}` | — | `204` | `404`, `409` si no está en `RECIBIDO` |

**Operador**

| Método | Ruta | Entrada | Respuesta OK | Errores |
| --- | --- | --- | --- | --- |
| GET | `/operador/reportes` | `?estado=&id_categoria=&id_distrito=&fecha_desde=&fecha_hasta=` (todos opcionales; fechas `AAAA-MM-DD`) | `200` `[ReporteResumen]` | `403`, `422` |
| POST | `/operador/reportes/{id}/asignar` | `{prioridad, id_entidad}` | `200` `ReporteDetalle` | `404`, `409` estado, `422` entidad incompatible |
| POST | `/operador/reportes/{id}/rechazar` | `{motivo}` | `200` `ReporteDetalle` | `404`, `409`, `422` |
| POST | `/operador/reportes/{id}/iniciar-atencion` | `{comentario}` (opcional) | `200` `ReporteDetalle` | `404`, `409` |
| POST | `/operador/reportes/{id}/cerrar` | `{comentario_solucion}` | `200` `ReporteDetalle` | `404`, `409`, `422` |

El operador ve el detalle con el mismo `GET /reportes/{id}`.

En FastAPI, `GET /reportes/mis-reportes` se declara **antes** que `GET /reportes/{id}`. Si no, «mis-reportes» se interpreta como un id y la ruta responde `422`.

**Esquemas de respuesta**

```json
// Usuario
{ "id_usuario": 1, "nombre": "Ana Demo", "correo": "ana@demo.test", "rol": "CIUDADANO" }

// ReporteResumen
{
  "id_reporte": 7, "codigo": "WR-2026-000007",
  "ciudadano": { "id_usuario": 3, "nombre": "Ana Demo" },
  "categoria": { "id_categoria": 2, "nombre": "Pistas y veredas" },
  "distrito": { "id_distrito": 1, "nombre": "Huancayo" },
  "estado": "RECIBIDO", "prioridad": null,
  "fecha_creacion": "2026-11-26T15:04:00"
}

// ReporteDetalle = ReporteResumen +
{
  "descripcion": "Hueco profundo en la calzada",
  "referencia": "Av. Ferrocarril, frente a Mallplaza",
  "latitud": -12.065100, "longitud": -75.204900,
  "entidad": null,
  "motivo_rechazo": null, "comentario_solucion": null,
  "fotos": [ { "id_foto": 11, "url": "/uploads/reportes/3f9a...c1.jpg" } ],
  "historial": [
    { "estado_anterior": null, "estado_nuevo": "RECIBIDO",
      "usuario": { "id_usuario": 3, "nombre": "Ana Demo", "rol": "CIUDADANO" },
      "comentario": null, "fecha": "2026-11-26T15:04:00" }
  ],
  "fecha_actualizacion": "2026-11-26T15:04:00"
}
```

Cuando el reporte ya fue asignado, `entidad` es `{ "id_entidad": 2, "nombre": "Unidad Simulada de Vías y Veredas", "id_categoria": 2 }`; antes es `null`. Todos los errores, incluidos los `422` de validación, llegan como `{"detail": "mensaje"}` con un solo texto listo para mostrar.

Las rutas no llevan prefijo `/api`, igual que el ejemplo. La respuesta nunca incluye `contrasena_hash`. Las fotos se sirven con `StaticFiles` montado en `/uploads` (por ejemplo `http://localhost:8000/uploads/reportes/3f9a…c1.jpg`), con nombres aleatorios no adivinables; ver la limitación en la sección 14.

## 8. Validaciones y errores

Todo se valida dos veces: en Angular, para mostrar errores por campo, y en FastAPI con Pydantic y en `services/`, que es la validación que cuenta. Los textos se recortan (*trim*) antes de medirlos.

| Campo | Regla | Mensaje |
| --- | --- | --- |
| `nombre` | 2–100 caracteres | «El nombre debe tener entre 2 y 100 caracteres» |
| `correo` | Formato válido, máximo 150, se guarda en minúsculas | «Correo inválido» |
| `contrasena` | 8–128 caracteres | «La contraseña debe tener al menos 8 caracteres» |
| `id_categoria`, `id_distrito` | Deben existir en el catálogo | «Categoría inválida» / «Distrito inválido» |
| `descripcion` | 10–1000 caracteres | «Describe la incidencia (mínimo 10 caracteres)» |
| `referencia` | 5–255 caracteres | «Indica una dirección o referencia (mínimo 5 caracteres)» |
| `latitud` / `longitud` | Obligatorias; rango −90 a 90 y −180 a 180 | «Marca la ubicación en el mapa» |
| `fotos` | 1 a 3 archivos | «Adjunta entre 1 y 3 fotos» |
| Cada foto | Máximo 2 000 000 bytes; tipo real JPEG o PNG | «Cada foto debe ser JPEG o PNG de hasta 2 MB» |
| `prioridad` | `BAJA`, `MEDIA` o `ALTA` | «Prioridad inválida» |
| `id_entidad` | Debe existir y atender la categoría del reporte | «La entidad no atiende la categoría del reporte» |
| `motivo` (rechazo) | 10–500 caracteres | «Indica el motivo del rechazo (mínimo 10 caracteres)» |
| `comentario_solucion` | 10–1000 caracteres | «Describe la solución (mínimo 10 caracteres)» |
| `comentario` (atención) | Opcional, máximo 1000 | — |

**Validación de fotos en el backend**

- El tipo se decide por los primeros bytes, no por la extensión ni por el `content-type` del navegador. JPEG empieza con `FF D8 FF`; PNG con `89 50 4E 47 0D 0A 1A 0A`.
- Se leen como máximo 2 000 001 bytes por archivo; si se alcanza ese límite, el archivo se rechaza.
- Se valida todo antes de escribir en disco o en MySQL.

**Transiciones seguras**

Cada cambio de estado usa `UPDATE reporte SET … WHERE id_reporte = %s AND estado = %s` y revisa `rowcount`. Si es 0, el estado ya cambió y se responde `409` «El reporte no está en un estado que permita esta acción». El `UPDATE` y la fila del historial van en la misma transacción.

| Código | Cuándo |
| --- | --- |
| `401` | Sin token, token inválido o vencido, credenciales incorrectas |
| `403` | Rol no permitido para el endpoint |
| `404` | El reporte no existe o pertenece a otro ciudadano |
| `409` | Acción no válida para el estado actual; correo ya registrado |
| `422` | Datos inválidos, fotos inválidas, entidad incompatible |
| `500` | Error no controlado; se registra en el log sin exponer detalles ni credenciales |

## 9. Frontend: rutas y pantallas

Son ocho pantallas en Angular 22 con componentes *standalone* y SCSS responsive. El flujo es **componente → servicio → API REST**: los componentes nunca llaman a `HttpClient` directamente.

| Ruta | Pantalla | Rol | Contenido |
| --- | --- | --- | --- |
| `/login` | Iniciar sesión | Público | Correo, contraseña, error genérico, enlace a registro |
| `/registro` | Crear cuenta | Público | Nombre, correo, contraseña y confirmación; al terminar redirige a login |
| `/ciudadano/reportes` | Mis reportes | Ciudadano | Tabla: código, categoría, distrito, estado, fecha. Botones Ver, Editar y Eliminar; los dos últimos solo en `RECIBIDO`. Botón «Nuevo reporte» |
| `/ciudadano/reportes/nuevo` | Nuevo reporte | Ciudadano | Paso 1: formulario + mapa + fotos con miniaturas. Paso 2: resumen con «Confirmar» y «Volver a editar». Al confirmar muestra el código generado |
| `/ciudadano/reportes/:id` | Detalle | Ciudadano | Datos, fotos, mapa de solo lectura, entidad y prioridad si las hay, motivo de rechazo o solución, historial cronológico |
| `/ciudadano/reportes/:id/editar` | Editar | Ciudadano | Mismo formulario sin fotos; solo si está en `RECIBIDO` |
| `/operador/reportes` | Bandeja | Operador | Filtros de estado, categoría, distrito y rango de fechas. Tabla con código, ciudadano, categoría, distrito, estado, prioridad y fecha |
| `/operador/reportes/:id` | Revisión | Operador | Detalle completo y un panel de acciones según el estado (tabla siguiente) |

- `/` redirige según el rol: ciudadano a `/ciudadano/reportes`, operador a `/operador/reportes`, sin sesión a `/login`.
- Una ruta desconocida redirige a `/`.

**Panel de acciones del operador**

| Estado | Acciones visibles |
| --- | --- |
| `RECIBIDO` | Asignar: prioridad + entidad (la lista solo muestra entidades de la categoría del reporte). Rechazar: motivo obligatorio |
| `ASIGNADO` | Iniciar atención, con comentario opcional |
| `EN_ATENCION` | Cerrar, con comentario de solución obligatorio |
| `RECHAZADO`, `CERRADO` | Ninguna; solo lectura |

**Mapa (Leaflet + OpenStreetMap)**

- Instalar `leaflet` y `@types/leaflet`, y agregar `leaflet/dist/leaflet.css` en `styles` de `angular.json`.
- Centro inicial en Huancayo (−12.0651, −75.2049), zoom 14. Un clic coloca o mueve el pin y llena `latitud` y `longitud`.
- Usar `L.circleMarker` en vez del marcador por defecto, para evitar el problema de rutas del ícono en Angular.
- El botón «Usar mi ubicación» es opcional: centra el mapa, pero el pin lo confirma el usuario.

**Estructura de `frontend/src/app/`**

```text
frontend/src/
├── environments/  environment.ts, environment.development.ts
│                  apiUrl = 'http://localhost:8000' (sin barra final); devUsuarios solo en development
└── app/
    app.routes.ts, app.config.ts
    components/    layout/, login/, registro/, mis-reportes/, reporte-form/, reporte-detalle/,
                   mapa-selector/, estado-badge/, bandeja-operador/, revision-operador/
                   (cada uno con xxx.ts + xxx.html; clase sin sufijo: Login, ReporteForm…)
    interfaces/    auth.interface.ts, catalogo.interface.ts, reporte.interface.ts
    services/      auth.service.ts, sesion.service.ts, catalogo.service.ts,
                   reporte.service.ts, operador.service.ts
    guards/        auth.guard.ts  (authGuard, invitadoGuard, rolGuard)
    interceptors/  auth.interceptor.ts
```

**Convenciones del frontend (iguales al ejemplo)**

- **URLs:** los servicios arman la URL con `${environment.apiUrl}/reportes`. No hay carpeta `config/`. Los *environments* se generan con `ng generate environments`.
- **Servicios:** `inject(HttpClient)`, `async`/`await` con `firstValueFrom` y estado en *signals*.
- **Interfaces:** tipos `XxxApi` en *snake\_case*, espejo de la sección 7, y modelos de la app en *camelCase*. La conversión se hace con `desdeApi`/`haciaApi` dentro del servicio.
- **Sesión:** `SesionService` guarda token, usuario, rol y expiración en `localStorage` y no usa `HttpClient`. `AuthService` hace las peticiones y delega en él. El interceptor depende de `SesionService`.
- **Guards:** `authGuard`, `invitadoGuard` y `rolGuard` (compara con `data.rol` de la ruta). Las rutas usan `loadComponent`.
- **Formularios:** *Signal Forms* (`@angular/forms/signals`: `form`, `required`, `email`…), como `login.ts` del ejemplo.
- **SSR y Leaflet:** si el proyecto tiene SSR (`app.config.server.ts`), Leaflet se carga solo en el navegador (`afterNextRender(async () => { const L = await import('leaflet'); … })`) y `localStorage` se protege con `isPlatformBrowser`, como hace el ejemplo.
- **CORS:** el backend acepta al frontend con `CORS_ORIGENES` del `.env`.

Una barra fija muestra siempre: *«Simulación académica — no es un canal oficial de emergencias»*. Cada operación exitosa muestra un mensaje de confirmación, y cada error muestra el `detail` del backend.

## 10. Autenticación JWT + Argon2id (fase final)

La autenticación se implementa al final, como recomendó el profesor, pero el código se prepara desde el inicio. Todos los endpoints dependen de `get_current_user`; en la fase 5 solo cambia el interior de esa función y los endpoints no se tocan.

**Antes de la fase 5 (modo desarrollo temporal)**

- Con `AUTH_MODO=dev` en el `.env`, `get_current_user` lee la cabecera `X-Dev-Usuario-Id`, busca el usuario en MySQL y lo devuelve. Si falta la cabecera o el usuario no existe, responde `401`.
- En Angular, `auth.interceptor.ts` envía esa cabecera, y el layout tiene un selector temporal «Actuar como: Ciudadano demo / Operador» guardado en `localStorage`.
- `require_rol("OPERADOR")` y `require_rol("CIUDADANO")` ya protegen los endpoints desde la fase 1, así los permisos se prueban desde el inicio.

Los ids del selector temporal los imprime `seed_usuarios.py` al terminar (id del operador e id del ciudadano demo) y se copian en `environments/environment.development.ts` como `devUsuarios`. No se crea ningún endpoint para listar usuarios.

**Fase 5: autenticación real**

- **Contraseñas:** `argon2-cffi` con `PasswordHasher()`, cuyo tipo por defecto es Argon2id. Se usa `hash()` al registrar y `verify()` al iniciar sesión, capturando `VerifyMismatchError`. El hash empieza con `$argon2id$`.
- **Token:** `PyJWT`, algoritmo `HS256`, secreto `JWT_SECRETO` del `.env` y vigencia `JWT_EXPIRA_MINUTOS` (60 por defecto). Lleva los claims `sub` (id del usuario como texto), `rol`, `iat` y `exp`.
- **Verificación:** `get_current_user` lee `Authorization: Bearer <token>`, decodifica y valida `exp`, y carga el usuario desde MySQL. Si algo falla, responde `401`.
- **Login:** el mismo mensaje «Credenciales inválidas» tanto si el correo no existe como si la contraseña es incorrecta.
- **Registro:** siempre crea rol `CIUDADANO`; si el cliente envía un campo `rol`, se ignora.
- **Angular:** `AuthService` pide el token y `SesionService` guarda `access_token`, `usuario`, `rol` y la expiración en `localStorage`. El interceptor agrega `Authorization: Bearer`; ante un `401` cierra la sesión y redirige a `/login`. `authGuard` exige token, `invitadoGuard` impide volver a login con sesión activa y `rolGuard` compara el rol con `data.rol` de la ruta. Cerrar sesión borra el almacenamiento.
- **Limpieza obligatoria:** al terminar la fase 5 se eliminan `AUTH_MODO`, la cabecera `X-Dev-Usuario-Id` y el selector temporal. No debe quedar ninguna puerta trasera en la entrega.

**Variables de entorno (`backend/.env.example`, sin valores reales)**

```text
# MySQL 8.4 en contenedor Docker, publicado en el puerto 3307 del equipo
DB_HOST=127.0.0.1
DB_PORT=3307
DB_NOMBRE=wkPrueba
DB_USUARIO=root
DB_CONTRASENA=
DB_NOMBRE_TEST=wkPrueba_test
AUTH_MODO=dev                # se elimina en la fase 5
JWT_SECRETO=
JWT_EXPIRA_MINUTOS=60
CORS_ORIGENES=http://localhost:4200,http://127.0.0.1:4200
UPLOADS_DIR=uploads
OPERADOR_CORREO=
OPERADOR_NOMBRE=
OPERADOR_CONTRASENA=
DEMO_CIUDADANO_CORREO=
DEMO_CIUDADANO_NOMBRE=
DEMO_CIUDADANO_CONTRASENA=
```

Los nombres de las variables de base de datos son una propuesta. Si el `backend/.env` existente ya usa otros, se mantienen esos y solo se agregan los que falten.

## 11. Arquitectura y restricciones técnicas

La arquitectura copia la del proyecto ejemplar del profesor (backend de `personas`). Las dependencias van en un solo sentido, **`main.py` → `apis/` → `services/` → `repositories/` → MySQL**, y de vuelta por el mismo camino. `schemas/` lo usan `apis/`, `services/` y `repositories/`. `core/` contiene la infraestructura y es el único lugar que arma la cadena conexión → repositorio → servicio.

| Módulo | Puede importar | Nunca importa | Responsabilidad |
| --- | --- | --- | --- |
| `main.py` | `apis/`, `core/` | `services/`, `repositories/` | Crea la app, CORS, registra *routers*, *handlers* de excepciones, *lifespan* y monta `/uploads`. Sin endpoints ni lógica |
| `apis/` | `core.dependencies` (los `*Dep`), `schemas/` | `repositories/`, `mysql.connector` | Rutas: reciben un schema, llaman al servicio y devuelven un schema |
| `services/` | `repositories/`, `schemas/`, `services.exceptions`, `services.security`, `core.config` | `fastapi`, SQL | Reglas RR-01 a RR-12, propiedad del reporte, transiciones, hash, JWT y archivos |
| `repositories/` | `schemas/`, `services.exceptions`, `mysql.connector` | `fastapi`, `argon2`, `jwt` | Solo SQL parametrizado con `%s`. Reciben la conexión en el constructor y no hacen *commit* |
| `schemas/` | `pydantic` | Las demás capas | Contratos de entrada y salida |
| `core/` | Todo lo necesario para cablear | — | `config.py`, `database.py`, `dependencies.py`, `exception_handlers.py`, `lifespan.py` |

**Convenciones (iguales al ejemplo)**

- **Clases:** `XxxRepository(connection)` y `XxxService(repository)`. En `core/dependencies.py` se construyen con `Depends` y se exponen como `XxxServiceDep`; las APIs solo reciben esos `*Dep`.
- **Archivos por entidad, en plural:** el mismo nombre en cada capa cuando aplica (`reportes.py` en `apis/`, `services/`, `repositories/` y `schemas/`).
- **Schemas:** `Entidad` + `Create`/`Update` para el CRUD (`ReporteCreate`, `ReporteUpdate`); sustantivos para las salidas (`ReporteResumen`, `ReporteDetalle`, `Usuario`, `Token`); acciones en español para el resto (`UsuarioRegistro`, `UsuarioLogin`, `ReporteAsignar`, `ReporteRechazar`, `ReporteIniciarAtencion`, `ReporteCerrar`). Los textos se recortan con `ConfigDict(str_strip_whitespace=True)`.
- **Fila interna con el hash:** `UsuarioRecord` (`dataclass`) vive en `repositories/usuarios.py` y nunca sale del servicio; la API expone `schemas.auth.Usuario`.
- **Conexión y transacción:** `core/database.py` define `get_db()`, que abre una conexión de `mysql-connector-python` por request y hace *commit* al final o *rollback* si hay una excepción. Por eso crear un reporte con sus fotos y su historial es atómico. Si algo falla después de escribir fotos en disco, el servicio las borra y vuelve a lanzar la excepción.
- **SQL:** consultas parametrizadas con `%s` dentro de los repositorios, **sin procedimientos almacenados**. Se usa `cursor(dictionary=True)`. Un duplicado (`IntegrityError` con `errno` 1062) se traduce a una excepción de dominio dentro del repositorio.
- **Configuración:** `core/config.py` usa `pydantic-settings` y lee `backend/.env` con las variables de la sección 10.
- **Errores:** las excepciones de dominio van en `services/exceptions.py` y `core/exception_handlers.py` las traduce a `401`, `403`, `404`, `409` y `422`.
- **Seguridad:** `services/security.py` contiene Argon2id y JWT. `get_current_user` y `require_rol` van en `core/dependencies.py`.
- **Health:** `apis/health.py` → `services/health.py` → `core.database.check_connection()` (`SELECT 1`), igual que el ejemplo.
- **Seed:** `scripts/seed_usuarios.py` abre una conexión, construye `UsuarioRepository` y el servicio, y llama a un método del servicio. Nunca escribe SQL ni llama al repositorio directamente.

```text
backend/src/backend/
├── main.py
├── core/          config.py, database.py, dependencies.py, exception_handlers.py, lifespan.py
├── apis/          auth.py, catalogos.py, reportes.py, operador.py, health.py
├── schemas/       auth.py, catalogos.py, reportes.py
├── services/      auth.py, catalogos.py, reportes.py, operador.py, fotos.py, health.py,
│                  security.py, exceptions.py
└── repositories/  usuarios.py, catalogos.py, reportes.py, fotos.py, asignaciones.py, historial.py
backend/scripts/seed_usuarios.py
backend/tests/     conftest.py, test_auth.py, test_reportes.py, test_operador.py, test_permisos.py
backend/uploads/reportes/      # en .gitignore
database/schema.sql, database/seed.sql
```

**Dependencias:** `fastapi`, `uvicorn`, `mysql-connector-python`, `pydantic-settings`, `python-multipart`, `argon2-cffi`, `PyJWT` y `email-validator`; como dependencias de desarrollo, `pytest` y `httpx`. En el frontend se agregan `leaflet` y `@types/leaflet`.

**Restricciones**

- Prohibido: SQLAlchemy, cualquier ORM y Flutter. Docker se usa solo para el servidor MySQL 8.4 local (puerto 3307); el backend y el frontend no corren en Docker.
- SQL siempre parametrizado; nunca concatenar valores del usuario en una consulta.
- Ningún secreto en el repositorio, en el código, en los logs ni en las respuestas de la API.
- Las pruebas usan la base `wkPrueba_test` (`DB_NOMBRE_TEST`), seleccionada en `conftest.py`. En las pruebas, `UPLOADS_DIR` apunta a una carpeta temporal.

## 12. Plan de implementación por fases

Son siete fases que suman unas 8 h 45 min y dejan 15 min de margen dentro de las 9 horas. Cada fase termina con sus pruebas pasando y un commit en `develop`; no se empieza la siguiente con la anterior rota.

| Fase | Rama | Contenido | Criterio de salida | Tiempo |
| --- | --- | --- | --- | --- |
| F0 Base | `develop` | Git con `main` y `develop`, `.gitignore`, `schema.sql`, `seed.sql`, `seed_usuarios.py`, `conexion.py`, `config.py`, `.env.example`, CORS | Las 8 tablas existen en la base principal y en la de pruebas; catálogos y 2 usuarios cargados; `GET /health` responde | 0:45 |
| F1 Backend ciudadano | `Kerry` | Catálogos, `POST/GET/PUT/DELETE` de reportes, fotos, historial, `get_current_user` en modo dev, `require_rol` | `pytest` en verde para CRUD, fotos inválidas y propiedad | 1:30 |
| F2 Backend operador | `Kerry` | Bandeja con filtros, asignar, rechazar, iniciar atención, cerrar | `pytest` en verde para las 4 transiciones, el `409` y la entidad incompatible | 1:00 |
| F3 Frontend ciudadano | `gersson` | Layout con aviso, selector temporal de usuario, interfaces, servicios, mapa, formulario con resumen, Mis reportes, detalle, editar, eliminar | Desde el navegador se crea, ve, edita y elimina un reporte con foto y pin | 2:00 |
| F4 Frontend operador | `gersson` | Bandeja con filtros y pantalla de revisión con el panel de acciones | Desde el navegador se lleva un reporte de `RECIBIDO` a `CERRADO` y otro a `RECHAZADO` | 1:00 |
| F5 Autenticación | `Kerry` + `gersson` | Registro, login, `/auth/me`, Argon2id, JWT, interceptor, guards, cerrar sesión; eliminar el modo dev | `pytest` de auth en verde; no queda `X-Dev-Usuario-Id` en el código | 1:30 |
| F6 Validación y entrega | `develop` → `main` | Guion completo de la sección 13, ajustes, README con el alcance de esta entrega y los comandos | Las 20 pruebas del guion pasan; merge a `main` | 1:00 |

**Uso con Orca y OpenCode**

1. **Ramas:** cada integrante trabaja en su rama personal (`Kerry` para Fernando y `gersson` para Gersson). `develop` solo recibe lo que se integra de las dos ramas, y `main` solo lo que ya se validó en `develop`.
2. **F0 (hecha):** ya está en `develop` como base común. Las dos ramas personales nacen de ahí.
3. **F1 y F2 (Fernando):** en `Kerry`.
4. **F3 y F4 (Gersson), en paralelo:** en `gersson`, contra el contrato de la sección 7. Conecta cada pantalla al backend real cuando el endpoint ya está en `develop`.
5. **Integración:** merge de `Kerry` y de `gersson` a `develop`, y prueba del flujo completo en modo dev. Después, cada uno actualiza su rama desde `develop`.
6. **F5 al final (login real):** Fernando hace el backend en `Kerry` y Gersson el frontend en `gersson`. Se integran juntas en `develop`, porque el modo dev se elimina en los dos lados a la vez.
7. **F6 (los dos):** recorren el guion de la sección 13 en `develop` y, si todo pasa, hacen el merge a `main`.

A cada agente se le entrega este documento completo.

En paralelo, las fases F1–F2 y F3–F4 se solapan y el total baja a unas 7 horas.

**F7 opcional:** si F6 termina con tiempo de sobra, se agrega una vista pública de solo lectura, sin identidad ni coordenadas. Antes de implementarla se actualiza este documento; hasta entonces sigue fuera de alcance.

## 13. Flujo de validación: guion de pruebas

La entrega está lista cuando las 20 pruebas marcan OK, ejecutadas en orden sobre una base recién cargada. En la columna Tipo, **P** significa automatizada con `pytest` contra FastAPI y **M** significa manual desde el navegador; las que dicen P+M se hacen de las dos formas.

**Preparación:** ejecutar `schema.sql`, `seed.sql` y `seed_usuarios.py`; levantar el backend (`uv run --directory backend uvicorn backend.main:app --app-dir src --reload`) y el frontend (`npm start`); tener a mano una imagen JPEG, una PNG, una GIF renombrada a `.jpg` y una imagen de más de 2 MB.

| ID | Actor | Acción | Resultado esperado | Tipo | Resultado |
| --- | --- | --- | --- | --- | --- |
| V-01 | Sin cuenta | Registrarse con un correo nuevo | `201`, rol `CIUDADANO`; en MySQL el hash empieza con `$argon2id$` | P+M | Pendiente |
| V-02 | Sin cuenta | Registrarse otra vez con el mismo correo | `409`; no se crea otra cuenta | P | Pendiente |
| V-03 | Ciudadano | Iniciar sesión con contraseña incorrecta | `401` «Credenciales inválidas»; no hay sesión | P+M | Pendiente |
| V-04 | Ciudadano | Iniciar sesión correctamente | Recibe token; entra a Mis reportes | P+M | Pendiente |
| V-05 | Ciudadano | Continuar el formulario sin foto o sin pin | Error en el campo; no se envía nada | M | Pendiente |
| V-06 | Ciudadano | Enviar 4 fotos, la GIF renombrada o la de más de 2 MB | `422`; no se crea reporte ni archivos | P | Pendiente |
| V-07 | Ciudadano | Llenar bien el formulario, ver el resumen y pulsar «Volver a editar» | Vuelve al formulario con los datos; el reporte no existe aún | M | Pendiente |
| V-08 | Ciudadano | Confirmar el reporte con 2 fotos y pin | Código `WR-2026-…`, estado `RECIBIDO`, 1 fila de historial, 2 archivos en `uploads/` | P+M | Pendiente |
| V-09 | Ciudadano | Editar la descripción y mover el pin | Cambios guardados; el detalle los muestra | P+M | Pendiente |
| V-10 | Ciudadano B | Abrir el reporte del ciudadano A por id | `404` | P | Pendiente |
| V-11 | Ciudadano | Llamar a `POST /operador/reportes/{id}/asignar` | `403`; nada cambia | P | Pendiente |
| V-12 | Ciudadano | Cerrar sesión y abrir `/ciudadano/reportes`; llamar a la API sin token | Redirige a `/login`; la API responde `401` | P+M | Pendiente |
| V-13 | Operador | Iniciar sesión y filtrar por `RECIBIDO` y un distrito | Solo aparecen los reportes que coinciden | P+M | Pendiente |
| V-14 | Operador | Asignar con una entidad de otra categoría (forzando el id por API) | `422`; sigue en `RECIBIDO` | P | Pendiente |
| V-15 | Operador | Asignar con prioridad `ALTA` y la entidad correcta | `ASIGNADO`; 2 filas de historial | P+M | Pendiente |
| V-16 | Ciudadano | Editar o eliminar el reporte `ASIGNADO` | `409`; en la interfaz no aparecen esos botones | P+M | Pendiente |
| V-17 | Operador | Cerrar directamente un reporte `ASIGNADO` | `409`; no cambia | P | Pendiente |
| V-18 | Operador | Iniciar atención y luego cerrar con comentario de solución | `EN_ATENCION` y luego `CERRADO`; el ciudadano ve la solución y 4 filas de historial | P+M | Pendiente |
| V-19 | Operador | Rechazar otro reporte sin motivo y luego con motivo | Primero `422`; después `RECHAZADO`, y el ciudadano ve el motivo sin poder editar | P+M | Pendiente |
| V-20 | Ciudadano | Eliminar un reporte en `RECIBIDO` | `204`; desaparece de la lista y sus fotos se borran del disco | P+M | Pendiente |

V-08, V-15 y V-18 forman el camino feliz completo; si solo hay tiempo para una demostración en vivo, se muestran esas tres más V-19.

## 14. Fuera de alcance y limitaciones

Queda fuera de esta entrega todo lo de la v0.3 que no se describe aquí. Lo más relevante:

- Consulta pública para visitantes y la aprobación de fotos para publicarlas.
- Usuarios de Entidad Responsable, titularidad, reasignación entre entidades y cobertura por distrito.
- Solicitudes de información, corrección de categoría por el operador y edición de fotos.
- Confirmación ciudadana, disconformidades, reaperturas, revisión especial y los cuatro motivos de cierre.
- Plazos de cinco días, cierres automáticos y reloj simulado.
- Bandeja de avisos, correo, SMS y notificaciones push.
- Idempotencia de creación y huella SHA-256.
- Verificación de correo, recuperación de contraseña, *refresh tokens* y revocación de tokens.
- Validación geográfica automática, mantenimiento de catálogos desde la interfaz y alojamiento público.

**Limitaciones aceptadas en esta entrega**

- Las fotos se sirven por `/uploads` sin verificar sesión; las protege solo su nombre aleatorio. Una versión futura las serviría por un endpoint autenticado.
- Cerrar sesión borra el token del navegador, pero el token sigue siendo válido hasta que vence (60 min).
- El token se guarda en `localStorage`, aceptable para un prototipo local.
- El mapa necesita internet para cargar los mosaicos de OpenStreetMap.
