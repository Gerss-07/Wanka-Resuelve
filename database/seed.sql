-- =====================================================================
-- Wanka Resuelve — Datos semilla de catálogos (ficticios)
-- Ejecutar después de schema.sql:
--   mysql -h 127.0.0.1 -P 3307 -u root -p wkPrueba < database/seed.sql
--   mysql -h 127.0.0.1 -P 3307 -u root -p wkPrueba_test < database/seed.sql
-- Re-ejecutable: INSERT IGNORE evita duplicados por los UNIQUE de nombre.
-- Los usuarios (operador y ciudadano demo) NO van aquí: los crea
-- backend/scripts/seed_usuarios.py porque el hash Argon2id se genera en Python.
-- =====================================================================

SET NAMES utf8mb4;

-- Categorías (exactamente cinco)
INSERT IGNORE INTO categoria (nombre) VALUES
  ('Limpieza pública y residuos'),
  ('Pistas y veredas'),
  ('Semáforos y señalización vial'),
  ('Parques, áreas verdes y mobiliario urbano'),
  ('Drenaje y alcantarillas en vía pública');

-- Distritos
INSERT IGNORE INTO distrito (nombre) VALUES
  ('Huancayo'),
  ('El Tambo'),
  ('Chilca');

-- Entidades responsables ficticias (una por categoría; el id de la
-- categoría se busca por nombre para no depender de ids fijos)
INSERT IGNORE INTO entidad_responsable (nombre, id_categoria)
SELECT 'Unidad Simulada de Limpieza Pública', id_categoria
FROM categoria WHERE nombre = 'Limpieza pública y residuos';

INSERT IGNORE INTO entidad_responsable (nombre, id_categoria)
SELECT 'Unidad Simulada de Vías y Veredas', id_categoria
FROM categoria WHERE nombre = 'Pistas y veredas';

INSERT IGNORE INTO entidad_responsable (nombre, id_categoria)
SELECT 'Unidad Simulada de Señalización Vial', id_categoria
FROM categoria WHERE nombre = 'Semáforos y señalización vial';

INSERT IGNORE INTO entidad_responsable (nombre, id_categoria)
SELECT 'Unidad Simulada de Parques y Áreas Verdes', id_categoria
FROM categoria WHERE nombre = 'Parques, áreas verdes y mobiliario urbano';

INSERT IGNORE INTO entidad_responsable (nombre, id_categoria)
SELECT 'Unidad Simulada de Drenaje Urbano', id_categoria
FROM categoria WHERE nombre = 'Drenaje y alcantarillas en vía pública';
