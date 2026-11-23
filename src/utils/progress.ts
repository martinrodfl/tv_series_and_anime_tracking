import type { AnimeMetadata } from '../types/anime'

type EpisodeInfo = Pick<AnimeMetadata, 'episodes' | 'nextEpisode'>

/**
 * Episodios ya emitidos: si hay próximo episodio, es el anterior a ese; si no, el total.
 * Devuelve null cuando no se puede saber. Nunca cuenta episodios futuros.
 */
export function getAvailableEpisodes({ episodes, nextEpisode }: EpisodeInfo): number | null {
  if (nextEpisode !== null) return Math.max(nextEpisode - 1, 0)
  return episodes
}

/** Porcentaje de 0 a 100, o null si no se conocen los episodios disponibles. */
export function calculateProgress(watchedCount: number, available: number | null): number | null {
  if (available === null) return null
  if (available <= 0) return 0
  const percent = (watchedCount / available) * 100
  return Math.min(100, Math.max(0, percent))
}
