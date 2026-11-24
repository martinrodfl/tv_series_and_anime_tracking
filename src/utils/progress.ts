import type { AnimeMetadata, LibraryEntry } from '../types/anime'

type EpisodeInfo = Pick<AnimeMetadata, 'episodes' | 'nextEpisode'>

/** Tope razonable para un número de episodio; evita datos absurdos. */
export const MAX_EPISODE_NUMBER = 10_000

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

/** Texto corto de progreso para listas. */
export function describeProgress(watchedCount: number, available: number | null): string {
  const progress = calculateProgress(watchedCount, available)
  if (progress === null || available === null) return 'Progreso no disponible'
  // Nunca se muestran más vistos que emitidos (p. ej. si el total se corrigió a la baja).
  return `${Math.min(watchedCount, available)} / ${available} (${Math.round(progress)} %)`
}

/**
 * Solo se sugiere (nunca se aplica solo): total conocido, anime ya terminado de emitir
 * y todos los episodios del 1 al total vistos.
 */
export function shouldSuggestCompleted(
  entry: Pick<LibraryEntry, 'userStatus' | 'episodes' | 'nextEpisode' | 'airingStatus'>,
  watchedEpisodes: number[],
): boolean {
  if (entry.userStatus === 'completed') return false
  if (entry.episodes === null || entry.nextEpisode !== null) return false
  if (entry.airingStatus === 'RELEASING' || entry.airingStatus === 'NOT_YET_RELEASED') return false
  const watched = new Set(watchedEpisodes)
  for (let episode = 1; episode <= entry.episodes; episode++) {
    if (!watched.has(episode)) return false
  }
  return true
}
