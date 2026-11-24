export const USER_STATUSES = ['planned', 'watching', 'completed', 'paused', 'dropped'] as const

export type UserStatus = (typeof USER_STATUSES)[number]

/** Metadatos mínimos del anime, ya traducidos a un formato interno (no el de AniList). */
export interface AnimeMetadata {
  anilistId: number
  title: { romaji: string | null; english: string | null }
  coverUrl: string | null
  format: string | null
  airingStatus: string | null
  /** Total de episodios, si se conoce. */
  episodes: number | null
  /** Número del próximo episodio por emitir, si lo hay. */
  nextEpisode: number | null
}

export interface LibraryEntry extends AnimeMetadata {
  userStatus: UserStatus
  favorite: boolean
  /** Puntuación personal entera de 1 a 10, o null si no hay. */
  rating: number | null
  addedAt: number
  updatedAt: number
}

export interface WatchedEpisode {
  anilistId: number
  episodeNumber: number
  watchedAt: number
}

/** Campos personales que el usuario puede modificar. */
export type LibraryEntryChanges = Partial<Pick<LibraryEntry, 'userStatus' | 'favorite' | 'rating'>>

/** Una página de resultados de búsqueda, ya en tipos internos. */
export interface SearchPage {
  items: AnimeSearchResult[]
  page: number
  hasNextPage: boolean
}

/** Fecha que AniList puede dar incompleta: siempre hay año; mes y día solo a veces. */
export interface PartialDate {
  year: number
  month: number | null
  day: number | null
}

/** Fechas de emisión; solo para mostrar, no se guardan en la biblioteca. */
export interface AnimeDates {
  startDate: PartialDate | null
  endDate: PartialDate | null
}

export type AnimeSearchResult = AnimeMetadata & AnimeDates

/** Datos para la pantalla de detalle; no se guardan en la biblioteca. */
export interface AnimeDetail extends AnimeMetadata, AnimeDates {
  /** Texto plano, sin HTML. */
  description: string | null
  genres: string[]
}

/** Contenido del archivo de respaldo JSON. */
export interface BackupData {
  app: 'anime-tracker'
  version: 1
  exportedAt: string
  library: LibraryEntry[]
  watchedEpisodes: WatchedEpisode[]
}
