# Roadmap — Anime Tracker

Plan por etapas. Se implementa una a la vez y cada etapa debe quedar ejecutable. Las reglas permanentes del proyecto están en `.github/copilot-instructions.md`.

**Etapa actual:** 6

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

- [x] Crear proyecto React + TypeScript + Vite.
- [x] Configurar MUI 7 con tema oscuro (preparado para tema claro).
- [x] Configurar React Router con las cuatro rutas.
- [x] Crear layout responsive con navegación.
- [x] Crear páginas vacías pero funcionales.
- [x] Configurar ESLint y Vitest.

**Hecho cuando:** arranca sin errores, `tsc`, lint y build pasan, y se navega entre rutas en escritorio y móvil. No avanzar a persistencia ni a AniList hasta que esta estructura esté revisada.

## Etapa 2 — Persistencia local

- [x] Instalar y configurar Dexie y `dexie-react-hooks`.
- [x] Crear el esquema inicial (`library` y `watchedEpisodes`).
- [x] Implementar `anime.repository.ts`: agregar, consultar, actualizar y eliminar.
- [x] Pruebas del repositorio con `fake-indexeddb`.

**Hecho cuando:** las operaciones del repositorio funcionan y están probadas, incluida la idempotencia de marcar episodios.

## Etapa 3 — AniList

- [x] Crear `anilist.service.ts` con búsqueda paginada.
- [x] Transformar las respuestas a tipos internos.
- [x] Manejar errores de red, `errors` de GraphQL y límites de peticiones.
- [x] Mostrar resultados en `/search` y permitir agregarlos a la biblioteca.

**Hecho cuando:** se busca, se agrega y el anime aparece en la biblioteca persistida.

## Etapa 4 — Seguimiento

- [x] Implementar la pantalla de detalle.
- [x] Calcular episodios disponibles (`episodes` o `nextAiringEpisode`).
- [x] Mostrar lista de episodios o seguimiento numerado según los datos disponibles.
- [x] Marcar y desmarcar episodios.
- [x] Calcular el progreso localmente, con pruebas de `utils/progress.ts`.

**Hecho cuando:** el progreso se actualiza al instante, sin llamadas a la API, y es correcto en los casos límite (sin total, en emisión, 0 disponibles).

## Etapa 5 — Funcionalidades complementarias

- [x] Favoritos y puntuación personal.
- [x] Quitar un anime de la biblioteca (desde el detalle y la biblioteca). Siempre pide confirmación; si tiene progreso registrado, el aviso lo indica y se borran también sus episodios vistos (el repositorio ya lo hace en una transacción).
- [x] Marcar varios episodios a la vez (p. ej. «marcar hasta el episodio N») en series largas. Operación idempotente y en una transacción; no cuenta episodios futuros.
- [x] Sugerir pasar a `completed` cuando el total es conocido, el anime no está en emisión y todos los episodios están vistos. Solo se sugiere: nunca se cambia el estado automáticamente.
- [x] Filtros y ordenamiento en la biblioteca.
- [x] Inicio con resumen.
- [x] Exportación e importación JSON con validación y confirmación.

## Etapa 6 — PWA

- [x] Incorporar `vite-plugin-pwa`, manifest e iconos.
- [x] Cachear los recursos de la aplicación.
- [x] Definir una estrategia prudente para imágenes y recursos externos: solo portadas de `*.anilist.co` (https, con CORS), máximo 150 y 30 días, solo respuestas 200; la API GraphQL nunca se cachea.
- [x] Verificar funcionamiento offline.
- [ ] Probar la instalación en escritorio y celular. (Chrome no reporta errores de manifest ni de instalabilidad; falta instalarla en un escritorio y un celular reales.)

## Criterios de aceptación del MVP

1. La aplicación arranca localmente sin errores.
2. Se puede buscar anime y agregarlo a la biblioteca.
3. La biblioteca persiste al cerrar y volver a abrir el navegador.
4. Se puede abrir el detalle, marcar y desmarcar episodios y cambiar el estado personal.
5. El progreso se calcula correctamente.
6. Todo funciona en escritorio y celular.
7. La biblioteca y el progreso se consultan sin conexión una vez guardados.

## Decisiones pendientes

- ~~Dónde se desplegará la app~~ Decidido: GitHub Pages en `/tv_series_and_anime_tracking/` (`base` en el build, `basename` en el router y `404.html` como fallback). Para otro hosting: `BASE_PATH=/ pnpm build`. Falta el flujo de publicación (p. ej. GitHub Actions).
- ~~Qué hacer con las portadas sin conexión~~ Decidido: se cachean con límite (ver Etapa 6).
- Fuente fiable de episodios detallados, si algún día se quiere ir más allá del seguimiento numerado.
