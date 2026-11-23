# Roadmap — Anime Tracker

Plan por etapas. Se implementa una a la vez y cada etapa debe quedar ejecutable. Las reglas permanentes del proyecto están en `.github/copilot-instructions.md`.

**Etapa actual:** 1

## Objetivo del MVP

Una app personal, sencilla y fácil de mantener, que permita:

1. Buscar anime en AniList y ver su información básica.
2. Agregar y quitar anime de una biblioteca personal.
3. Abrir el detalle de un anime.
4. Marcar y desmarcar episodios como vistos (con seguimiento numerado si solo se conoce el total).
5. Calcular y mostrar el progreso.
6. Cambiar el estado personal del anime.
7. Guardar todo localmente, sin backend.

No invertir tiempo en animaciones ni diseño sofisticado hasta que lo funcional esté probado.

## Pantallas

| Ruta         | Contenido                                                                                                                                                                    |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`          | Resumen simple: cantidad de anime en biblioteca, los que se están viendo y los últimos agregados o modificados. Sin estadísticas avanzadas.                                  |
| `/library`   | Lista o grilla con portada (si existe), título, estado personal, progreso (si se conoce) y acceso al detalle. Filtro por estado y búsqueda local.                            |
| `/search`    | Campo de búsqueda, resultados paginados, indicador de carga, mensajes de error y de resultados vacíos, acción de agregar e indicador de "ya agregado".                       |
| `/anime/:id` | Títulos, portada, descripción, géneros, formato y estado de emisión, total de episodios, estado personal, favorito, progreso, lista de episodios y controles para marcarlos. |

## Etapa 1 — Base del proyecto

- [ ] Crear proyecto React + TypeScript + Vite.
- [ ] Configurar MUI 7 con tema oscuro (preparado para tema claro).
- [ ] Configurar React Router con las cuatro rutas.
- [ ] Crear layout responsive con navegación.
- [ ] Crear páginas vacías pero funcionales.
- [ ] Configurar ESLint y Vitest.

**Hecho cuando:** arranca sin errores, `tsc`, lint y build pasan, y se navega entre rutas en escritorio y móvil. No avanzar a persistencia ni a AniList hasta que esta estructura esté revisada.

## Etapa 2 — Persistencia local

- [ ] Instalar y configurar Dexie y `dexie-react-hooks`.
- [ ] Crear el esquema inicial (`library` y `watchedEpisodes`).
- [ ] Implementar `anime.repository.ts`: agregar, consultar, actualizar y eliminar.
- [ ] Pruebas del repositorio con `fake-indexeddb`.

**Hecho cuando:** las operaciones del repositorio funcionan y están probadas, incluida la idempotencia de marcar episodios.

## Etapa 3 — AniList

- [ ] Crear `anilist.service.ts` con búsqueda paginada.
- [ ] Transformar las respuestas a tipos internos.
- [ ] Manejar errores de red, `errors` de GraphQL y límites de peticiones.
- [ ] Mostrar resultados en `/search` y permitir agregarlos a la biblioteca.

**Hecho cuando:** se busca, se agrega y el anime aparece en la biblioteca persistida.

## Etapa 4 — Seguimiento

- [ ] Implementar la pantalla de detalle.
- [ ] Calcular episodios disponibles (`episodes` o `nextAiringEpisode`).
- [ ] Mostrar lista de episodios o seguimiento numerado según los datos disponibles.
- [ ] Marcar y desmarcar episodios.
- [ ] Calcular el progreso localmente, con pruebas de `utils/progress.ts`.

**Hecho cuando:** el progreso se actualiza al instante, sin llamadas a la API, y es correcto en los casos límite (sin total, en emisión, 0 disponibles).

## Etapa 5 — Funcionalidades complementarias

- [ ] Favoritos y puntuación personal.
- [ ] Filtros y ordenamiento en la biblioteca.
- [ ] Inicio con resumen.
- [ ] Exportación e importación JSON con validación y confirmación.

## Etapa 6 — PWA

- [ ] Incorporar `vite-plugin-pwa`, manifest e iconos.
- [ ] Cachear los recursos de la aplicación.
- [ ] Definir una estrategia prudente para imágenes y recursos externos.
- [ ] Verificar funcionamiento offline.
- [ ] Probar la instalación en escritorio y celular.

## Criterios de aceptación del MVP

1. La aplicación arranca localmente sin errores.
2. Se puede buscar anime y agregarlo a la biblioteca.
3. La biblioteca persiste al cerrar y volver a abrir el navegador.
4. Se puede abrir el detalle, marcar y desmarcar episodios y cambiar el estado personal.
5. El progreso se calcula correctamente.
6. Todo funciona en escritorio y celular.
7. La biblioteca y el progreso se consultan sin conexión una vez guardados.

## Decisiones pendientes

- Dónde se desplegará la app. Con `BrowserRouter` el hosting necesita fallback a `index.html`; en GitHub Pages haría falta `basename` o `HashRouter`.
- Qué hacer con las portadas sin conexión (cachearlas o mostrar un marcador).
- Fuente fiable de episodios detallados, si algún día se quiere ir más allá del seguimiento numerado.
