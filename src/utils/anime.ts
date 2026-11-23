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

/** Texto corto con formato y total de episodios; no inventa el total si se desconoce. */
export function describeAnime(anime: Pick<AnimeMetadata, 'format' | 'episodes'>): string {
  const format = anime.format?.replaceAll('_', ' ')
  const episodes =
    anime.episodes === null
      ? 'Episodios sin confirmar'
      : `${anime.episodes} ${anime.episodes === 1 ? 'episodio' : 'episodios'}`
  return [format, episodes].filter(Boolean).join(' · ')
}
