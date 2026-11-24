import type { AnimeMetadata, UserStatus } from '../types/anime'

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  planned: 'Planeado',
  watching: 'Viendo',
  completed: 'Completado',
  paused: 'En pausa',
  dropped: 'Abandonado',
}

export function getDisplayTitle(anime: Pick<AnimeMetadata, 'anilistId' | 'title'>): string {
  return anime.title.english ?? anime.title.romaji ?? `Anime #${anime.anilistId}`
}

/**
 * URL con la que se muestra una portada (con `crossOrigin="anonymous"`, para poder cachearla sin respuesta opaca).
 * El CDN de AniList no envía `Vary: Origin`: una portada cargada antes SIN CORS queda en la caché HTTP sin cabeceras
 * CORS y el navegador la bloquea al pedirla con CORS. El parámetro da una URL que nunca se cargó sin CORS;
 * el CDN lo ignora y devuelve la misma imagen. En la biblioteca se sigue guardando la URL original.
 */
export function coverImageUrl(coverUrl: string): string {
  const url = new URL(coverUrl)
  url.searchParams.set('cors', '1')
  return url.toString()
}

/** Texto corto con formato y total de episodios; no inventa el total si se desconoce. */
export function describeAnime(anime: Pick<AnimeMetadata, 'format' | 'episodes'>): string {
  const format = anime.format?.replaceAll('_', ' ')
  const episodes =
    anime.episodes === null
      ? 'Episodios sin confirmar'
      : `${anime.episodes} ${anime.episodes === 1 ? 'episodio' : 'episodios'}`
  return [format, episodes].filter(Boolean).join(' · ')
}

export function hasSameMetadata(a: AnimeMetadata, b: AnimeMetadata): boolean {
  return (
    a.title.romaji === b.title.romaji &&
    a.title.english === b.title.english &&
    a.coverUrl === b.coverUrl &&
    a.format === b.format &&
    a.airingStatus === b.airingStatus &&
    a.episodes === b.episodes &&
    a.nextEpisode === b.nextEpisode
  )
}

const AIRING_STATUS_LABELS: Record<string, string> = {
  RELEASING: 'En emisión',
  FINISHED: 'Finalizado',
  NOT_YET_RELEASED: 'Sin estrenar',
  CANCELLED: 'Cancelado',
  HIATUS: 'En pausa',
}

export function describeAiringStatus(status: string | null): string | null {
  if (status === null) return null
  return AIRING_STATUS_LABELS[status] ?? status
}
