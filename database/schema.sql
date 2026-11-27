-- =====================================================================
-- Wanka Resuelve — Esquema de base de datos (MySQL, normalizado a 3FN)
-- Entrega: Ciudadano + Operador
--
-- Uso (la base ya existe; el script NO la crea):
--   mysql -h 127.0.0.1 -P 3307 -u root -p wkPrueba < database/schema.sql
--   mysql -h 127.0.0.1 -P 3307 -u root -p wkPrueba_test < database/schema.sql
-- Después: database/seed.sql y backend/scripts/seed_usuarios.py
--
-- ATENCIÓN: el script borra y vuelve a crear todas las tablas.
-- Se pierden los datos. Es intencional: durante el desarrollo el
-- esquema se corrige aquí y se vuelve a ejecutar.
-- =====================================================================

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------
-- 1. Borrado en orden inverso a las dependencias
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS historial_estado;
DROP TABLE IF EXISTS asignacion_reporte;
DROP TABLE IF EXISTS foto_reporte;
DROP TABLE IF EXISTS reporte;
DROP TABLE IF EXISTS entidad_responsable;
DROP TABLE IF EXISTS distrito;
DROP TABLE IF EXISTS categoria;
DROP TABLE IF EXISTS usuario;

-- ---------------------------------------------------------------------
-- 2. Usuarios (ciudadanos y operador)
-- ---------------------------------------------------------------------
CREATE TABLE usuario (
  id_usuario      INT          NOT NULL AUTO_INCREMENT,
  nombre          VARCHAR(100) NOT NULL,
  correo          VARCHAR(150) NOT NULL,
  contrasena_hash VARCHAR(255) NOT NULL,          -- Argon2id, nunca texto plano
  rol             ENUM('CIUDADANO','OPERADOR') NOT NULL,
  fecha_creacion  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_usuario PRIMARY KEY (id_usuario),
  CONSTRAINT uq_usuario_correo UNIQUE (correo),
  CONSTRAINT ck_usuario_nombre CHECK (CHAR_LENGTH(nombre) >= 2),
  CONSTRAINT ck_usuario_correo CHECK (correo LIKE '%_@_%._%')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 3. Catálogos (solo lectura desde la aplicación)
-- ---------------------------------------------------------------------
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

-- Cada entidad ficticia atiende una categoría en los tres distritos.
CREATE TABLE entidad_responsable (
  id_entidad   INT          NOT NULL AUTO_INCREMENT,
  nombre       VARCHAR(150) NOT NULL,
  id_categoria INT          NOT NULL,
  CONSTRAINT pk_entidad_responsable PRIMARY KEY (id_entidad),
  CONSTRAINT uq_entidad_nombre UNIQUE (nombre),
  CONSTRAINT fk_entidad_categoria FOREIGN KEY (id_categoria)
    REFERENCES categoria (id_categoria)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 4. Reporte: solo los datos que registra el ciudadano + estado actual
--    (prioridad y entidad van en asignacion_reporte;
--     motivo de rechazo y solución van en historial_estado)
-- ---------------------------------------------------------------------
CREATE TABLE reporte (
  id_reporte          INT           NOT NULL AUTO_INCREMENT,
  codigo              VARCHAR(20)   NULL,       -- WR-AAAA-NNNNNN, se fija en la misma transacción del INSERT
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
  CONSTRAINT fk_reporte_ciudadano FOREIGN KEY (id_ciudadano)
    REFERENCES usuario (id_usuario),
  CONSTRAINT fk_reporte_categoria FOREIGN KEY (id_categoria)
    REFERENCES categoria (id_categoria),
  CONSTRAINT fk_reporte_distrito FOREIGN KEY (id_distrito)
    REFERENCES distrito (id_distrito),
  CONSTRAINT ck_reporte_descripcion CHECK (CHAR_LENGTH(descripcion) >= 10),
  CONSTRAINT ck_reporte_referencia  CHECK (CHAR_LENGTH(referencia) >= 5),
  CONSTRAINT ck_reporte_latitud     CHECK (latitud  BETWEEN -90  AND 90),
  CONSTRAINT ck_reporte_longitud    CHECK (longitud BETWEEN -180 AND 180),
  INDEX idx_reporte_estado_fecha    (estado, fecha_creacion),
  INDEX idx_reporte_ciudadano_fecha (id_ciudadano, fecha_creacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- De 1 a 3 fotos por reporte: "orden" + UNIQUE impiden una cuarta foto.
CREATE TABLE foto_reporte (
  id_foto       INT          NOT NULL AUTO_INCREMENT,
  id_reporte    INT          NOT NULL,
  orden         TINYINT      NOT NULL,
  ruta_relativa VARCHAR(255) NOT NULL,          -- p. ej. reportes/3f9a...c1.jpg
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

-- ---------------------------------------------------------------------
-- 5. Asignación (relación 1 a 0..1 con reporte): la decide el operador.
--    Existe solo para reportes ASIGNADO, EN_ATENCION o CERRADO.
--    Quién y cuándo asignó se registra en historial_estado.
-- ---------------------------------------------------------------------
CREATE TABLE asignacion_reporte (
  id_reporte INT  NOT NULL,
  id_entidad INT  NOT NULL,
  prioridad  ENUM('BAJA','MEDIA','ALTA') NOT NULL,
  CONSTRAINT pk_asignacion_reporte PRIMARY KEY (id_reporte),
  CONSTRAINT fk_asignacion_reporte FOREIGN KEY (id_reporte)
    REFERENCES reporte (id_reporte) ON DELETE CASCADE,
  CONSTRAINT fk_asignacion_entidad FOREIGN KEY (id_entidad)
    REFERENCES entidad_responsable (id_entidad)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 6. Historial de transiciones (solo INSERT, nunca UPDATE)
--    comentario guarda: motivo de rechazo, comentario de atención
--    o comentario de solución, según estado_nuevo.
-- ---------------------------------------------------------------------
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
  CONSTRAINT fk_historial_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuario (id_usuario),
  CONSTRAINT ck_historial_transicion
    CHECK (estado_anterior IS NULL OR estado_anterior <> estado_nuevo),
  INDEX idx_historial_reporte_fecha (id_reporte, fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
