# Frontend — instrucciones de desarrollo

## Alcance y estado

Frontend de Wanka Resuelve construido con Angular 22, TypeScript y SCSS. La aplicación actual conserva la plantilla inicial de Angular y sus rutas están vacías. No asumir que la interfaz de incidencias, sus formularios o la integración con backend ya existen.

## Estructura y responsabilidades

- `components/`: componentes visuales Angular con TypeScript, HTML y SCSS. Mantenerlos enfocados en presentación e interacción.
- `interfaces/`: contratos y tipos de datos compartidos con las respuestas y solicitudes de la API; mantenerlos alineados con los schemas acordados en backend.
- `services/`: comunicación HTTP con la API REST y coordinación de datos remotos. Centralizar aquí las llamadas HTTP, no en componentes.
- `config/`: configuración no sensible de la aplicación, como la URL base de API según el mecanismo que se defina para los entornos.
- `guards/`: protección de navegación únicamente si existe un requisito acordado que la necesite; no inventar autenticación ni roles.
- `interceptors/`: comportamiento HTTP transversal solo cuando esté justificado por requisitos, como tratamiento coherente de errores. No añadir manejo de tokens sin una solución de autenticación definida.

Flujo obligatorio: **componentes → servicios → API REST**. Los componentes no deben llamar directamente a `HttpClient`; los servicios deben usar contratos definidos y no sustituir la lógica de negocio del backend.

## Angular, rutas y contratos

- Respetar el estilo standalone y las convenciones presentes en el proyecto salvo decisión explícita de arquitectura distinta.
- Declarar y mantener rutas en la configuración de routing existente; protegerlas mediante guards solo cuando corresponda.
- Usar interfaces TypeScript para los contratos de API; evitar `any` cuando exista una estructura conocida.
- Usar configuración por entorno para URL y opciones no secretas. Nunca incluir credenciales de base de datos en el frontend: todo valor entregado al navegador es público.
- Tratar los datos del backend como externos; modelar estados de carga, éxito y error de manera explícita y accesible.

## Formularios, validación y seguridad

- Validar campos con restricciones comprensibles y mensajes accesibles. Aplicar la validación equivalente en backend; la validación del navegador no es una barrera de seguridad.
- No inventar campos, reglas, estados, categorías adicionales ni flujos que no estén respaldados por requisitos aprobados.
- No insertar contenido externo como HTML confiable ni exponer tokens o datos sensibles en consola, almacenamiento o URLs.
- Mostrar errores útiles para la persona usuaria sin filtrar respuestas internas, trazas ni información sensible.

## Diseño y estilos

- Escribir estilos en SCSS y priorizar diseño responsive para móvil, tableta y escritorio.
- Mantener componentes organizados y reutilizables cuando exista una necesidad real; evitar duplicación y estilos globales innecesarios.
- Usar Bootstrap u otra herramienta equivalente solo si su incorporación está aprobada y disponible; no asumir que está instalada ni añadir dependencias sin autorización.
- Cuidar semántica HTML, navegación por teclado, etiquetas de formularios, contraste y mensajes de estado accesibles.

## Pruebas y calidad

- Añadir pruebas para componentes, interacciones, validaciones y servicios, incluyendo errores de API.
- Verificar compilación y pruebas con los scripts declarados en `package.json` cuando el entorno lo permita.
- No afirmar que build o pruebas pasaron si no se ejecutaron; informar cualquier bloqueo.

## Criterios de aceptación

- La interacción con la API está encapsulada en services y respeta interfaces acordadas.
- Componentes y rutas están organizados y no contienen lógica de persistencia.
- Formularios validan entradas y presentan errores accesibles; backend conserva su propia validación.
- La interfaz es responsive y no expone secretos.
- Hay pruebas pertinentes y se informa su estado real.
- Se diferencia lo implementado de lo pendiente y lo verificado.
