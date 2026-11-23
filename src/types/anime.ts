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
  items: AnimeMetadata[]
  page: number
  hasNextPage: boolean
}

/** Datos para la pantalla de detalle; no se guardan en la biblioteca. */
export interface AnimeDetail extends AnimeMetadata {
  /** Texto plano, sin HTML. */
  description: string | null
  genres: string[]
}
