import { useLiveQuery } from 'dexie-react-hooks'
import { animeRepository } from '../db/anime.repository'
import type { AnimeMetadata, LibraryEntry } from '../types/anime'

type LibraryQueryResult = { entries: LibraryEntry[]; watchedCounts: Map<number, number> } | { error: unknown }

export type LibraryStatus = 'loading' | 'error' | 'ready'

/** Biblioteca en vivo (con episodios vistos por anime): se actualiza sola cuando cambia IndexedDB. */
export function useLibrary() {
  // Se captura el error dentro de la consulta para mostrarlo en pantalla en lugar de romper el render.
  const result = useLiveQuery<LibraryQueryResult>(async () => {
    try {
      return {
        entries: await animeRepository.listLibrary(),
        watchedCounts: await animeRepository.getWatchedCounts(),
      }
    } catch (error) {
      return { error }
    }
  }, [])

  let status: LibraryStatus = 'loading'
  let entries: LibraryEntry[] = []
  let watchedCounts = new Map<number, number>()
  if (result) {
    if ('error' in result) {
      status = 'error'
    } else {
      status = 'ready'
      entries = result.entries
      watchedCounts = result.watchedCounts
    }
  }

  return {
    status,
    entries,
    watchedCounts,
    addAnime: (metadata: AnimeMetadata) => animeRepository.addToLibrary(metadata),
    setFavorite: (anilistId: number, favorite: boolean) =>
      animeRepository.updateLibraryEntry(anilistId, { favorite }),
    removeAnime: (anilistId: number) => animeRepository.removeFromLibrary(anilistId),
  }
}
