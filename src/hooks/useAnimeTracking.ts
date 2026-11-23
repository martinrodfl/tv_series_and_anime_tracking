import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import { animeRepository } from '../db/anime.repository'
import type { AnimeMetadata, LibraryEntry, UserStatus, WatchedEpisode } from '../types/anime'
import { hasSameMetadata } from '../utils/anime'

type TrackingQueryResult = { entry: LibraryEntry | undefined; watched: WatchedEpisode[] } | { error: unknown }

export type TrackingStatus = 'loading' | 'error' | 'ready'

/**
 * Entrada de la biblioteca y episodios vistos de un anime, en vivo, con las acciones para modificarlos.
 * Si llegan `freshMetadata` de AniList y difieren de lo guardado, se actualiza lo guardado
 * (el total y el próximo episodio cambian en los anime en emisión).
 */
export function useAnimeTracking(anilistId: number, freshMetadata: AnimeMetadata | null) {
  const result = useLiveQuery<TrackingQueryResult>(async () => {
    try {
      const entry = await animeRepository.getLibraryEntry(anilistId)
      const watched = entry ? await animeRepository.getWatchedEpisodes(anilistId) : []
      return { entry, watched }
    } catch (error) {
      return { error }
    }
  }, [anilistId])

  let status: TrackingStatus = 'loading'
  let entry: LibraryEntry | undefined
  let watchedEpisodes: number[] = []
  if (result) {
    if ('error' in result) {
      status = 'error'
    } else {
      status = 'ready'
      entry = result.entry
      watchedEpisodes = result.watched.map((episode) => episode.episodeNumber)
    }
  }

  useEffect(() => {
    if (freshMetadata && entry && !hasSameMetadata(freshMetadata, entry)) {
      animeRepository.refreshMetadata(freshMetadata).catch(() => {
        // Si falla, se siguen usando los datos guardados; no afecta a lo que el usuario hizo.
      })
    }
  }, [freshMetadata, entry])

  return {
    status,
    entry,
    watchedEpisodes,
    addAnime: (metadata: AnimeMetadata) => animeRepository.addToLibrary(metadata),
    setUserStatus: (userStatus: UserStatus) => animeRepository.updateLibraryEntry(anilistId, { userStatus }),
    markEpisode: (episodeNumber: number) => animeRepository.markEpisodeWatched(anilistId, episodeNumber),
    unmarkEpisode: (episodeNumber: number) => animeRepository.unmarkEpisodeWatched(anilistId, episodeNumber),
  }
}
