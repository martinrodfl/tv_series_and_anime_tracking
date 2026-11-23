# Anime Tracker — instrucciones para Copilot

App web personal (responsive, PWA más adelante) para hacer seguimiento de anime. Sin backend: todo se guarda localmente. El plan por etapas está en `ROADMAP.md`; se pide una etapa a la vez.

## Idioma

- Responde en español. Código e identificadores en inglés; comentarios breves en español.

## Stack

React + TypeScript + Vite · Material UI 7 · React Router v7 (`react-router`, `createBrowserRouter`) · Dexie.js (IndexedDB) + `dexie-react-hooks` · AniList GraphQL con `fetch` nativo · Vitest · `vite-plugin-pwa` (solo en la etapa PWA).

No agregar sin consultar: backend, autenticación, Redux, Axios, TanStack Query, otros proveedores (Kitsu), librerías de gráficos ni dependencias que no resuelvan una necesidad real del MVP. Antes de instalar algo, comprobar si el stack actual lo resuelve.

## Arquitectura

```text
src/
├── app/        router.tsx, theme.ts
├── components/ componentes reutilizables
├── pages/      Home, Library, Search, AnimeDetail
├── services/   anilist.service.ts
├── db/         database.ts, anime.repository.ts
├── hooks/      integración lógica ↔ React
├── types/      tipos internos compartidos
└── utils/      funciones puras (progress.ts)
```

Es una guía: crear archivos solo cuando se implemente una función concreta.

- Los componentes no construyen consultas GraphQL ni conocen el formato de AniList. Eso vive en `services/anilist.service.ts`, que devuelve tipos internos.
- Los componentes no acceden a IndexedDB: usan hooks que llaman a `db/anime.repository.ts`.
- La lógica de negocio (progreso, etc.) va en funciones puras de `utils/`, sin duplicarla en pantallas.
- Los tipos internos no se acoplan a las respuestas de AniList.

## AniList

- Endpoint: `https://graphql.anilist.co` (público, sin credenciales; nunca secretos en el frontend).
- Pedir solo los campos necesarios: `id`, `idMal`, `title { romaji english }`, `coverImage { large medium }`, `description`, `episodes`, `nextAiringEpisode { episode airingAt }`, `season`, `seasonYear`, `averageScore`, `genres`, `status`, `format`, `siteUrl`.
- Búsquedas paginadas con pocos resultados por página; debounce o búsqueda al enviar el formulario.
- Una respuesta HTTP exitosa puede traer `errors` de GraphQL: manejarlo. Manejar también errores de red y límites de peticiones.
- `description` llega en HTML: no usar `dangerouslySetInnerHTML` sin sanitizar, o pedirla con `asHtml: false`.
- No consultar AniList al marcar episodios ni al calcular progreso. No guardar respuestas completas.
- AniList no garantiza lista de episodios, títulos, duración ni fechas. No inventarlos.

## Datos locales (Dexie)

- Separar metadatos de AniList de datos personales. Clave del anime: `anilistId` (nunca el título).
- Tablas:
  - `library`: metadatos mínimos + `userStatus`, `favorite`, `rating`, `addedAt`, `updatedAt`.
  - `watchedEpisodes`: clave compuesta `[anilistId+episodeNumber]` + `watchedAt`.
- No persistir episodios generados: se derivan del total conocido. Solo se guarda lo visto.
- Marcar como visto es idempotente; desmarcar elimina el registro.
- Usar transacciones cuando se modifiquen datos relacionados (p. ej. quitar un anime borra sus episodios vistos).
- Cambios de esquema: nueva versión de Dexie con migración. Nunca borrar ni recrear la base.
- Los datos no están respaldados en la nube; exportar/importar JSON llega en una etapa posterior.

## Reglas de negocio

- Estados personales: `planned`, `watching`, `completed`, `paused`, `dropped`. Son independientes del estado de emisión de AniList.
- No pasar a `completed` automáticamente al llegar al 100 %; se puede sugerir.
- Episodios disponibles: si existe `nextAiringEpisode`, `nextAiringEpisode.episode - 1`; si no, `episodes`. Nunca contar episodios futuros.
- Progreso = vistos / disponibles × 100, limitado a 0–100 %, sin dividir por cero.
- Si no se conoce el total, mostrar el progreso como "no disponible", no como 0 %, y permitir gestión manual claramente identificada.
- Quitar un anime con progreso registrado pide confirmación.

## UI

- Funcionalidad antes que diseño. Componentes MUI estándar, sin animaciones decorativas ni estilos globales innecesarios.
- MUI 7: usar `Grid` con la prop `size` (`<Grid size={{ xs: 12, md: 6 }}>`). No usar la sintaxis antigua `item xs={...}` ni `Grid2`.
- Tema oscuro inicial, preparado para tema claro. Responsive en escritorio y móvil. Controles accesibles.
- Mostrar siempre estados de carga, error, vacío y éxito.

## Calidad

- TypeScript estricto; evitar `any`, usar `unknown` y validar los datos externos.
- Componentes pequeños con responsabilidades claras, sin fragmentar en exceso.
- Pruebas con Vitest para `utils/` y el repositorio (con `fake-indexeddb`).
- Sin datos personales en logs. No cambiar versiones mayores de dependencias sin revisar compatibilidad.

## Cómo trabajar

- Lee este archivo y `ROADMAP.md` antes de cambiar nada; revisa la estructura existente para no duplicar.
- Trabaja en etapas pequeñas y coherentes; no implementes varias a la vez.
- No agregues funciones fuera de alcance sin explicar por qué.
- Si falta una decisión técnica importante, explica las alternativas y pregunta antes de añadir complejidad.
- Tras cada etapa ejecuta TypeScript, lint, pruebas y build, y corrige los errores.
- No declares terminada una función si solo existe la interfaz y no la lógica o la persistencia.
