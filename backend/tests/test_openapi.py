"""El esquema OpenAPI de POST /reportes muestra fotos como archivos en Swagger UI."""

from fastapi.testclient import TestClient

from backend.main import app


def test_post_reportes_fotos_es_lista_de_archivos_binarios():
    response = TestClient(app).get("/openapi.json")
    assert response.status_code == 200
    openapi = response.json()

    contenido = openapi["paths"]["/reportes"]["post"]["requestBody"]["content"]
    assert list(contenido) == ["multipart/form-data"]
    esquemas = openapi["components"]["schemas"]

    def resolver(esquema: dict) -> dict:
        """Junta las propiedades del esquema y de sus allOf ($ref)."""
        if "$ref" in esquema:
            esquema = esquemas[esquema["$ref"].rsplit("/", 1)[-1]]
        propiedades = {}
        for parte in esquema.get("allOf", []):
            propiedades.update(resolver(parte))
        propiedades.update(esquema.get("properties", {}))
        return propiedades

    propiedades = resolver(contenido["multipart/form-data"]["schema"])

    # Un solo campo "fotos" que se repite; nada de fotos1, fotos2...
    assert set(propiedades) == {
        "id_categoria", "id_distrito", "descripcion", "referencia", "latitud", "longitud", "fotos",
    }
    fotos = propiedades["fotos"]
    assert fotos["type"] == "array"
    assert fotos["items"] == {"type": "string", "format": "binary"}
    assert (fotos["minItems"], fotos["maxItems"]) == (1, 3)
