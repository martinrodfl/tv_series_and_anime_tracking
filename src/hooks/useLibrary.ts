import { useLiveQuery } from 'dexie-react-hooks'
import { animeRepository } from '../db/anime.repository'
import type { AnimeMetadata, LibraryEntry } from '../types/anime'

type LibraryQueryResult = { entries: LibraryEntry[] } | { error: unknown }

export type LibraryStatus = 'loading' | 'error' | 'ready'

/** Biblioteca en vivo: se actualiza sola cuando cambia IndexedDB. */
export function useLibrary() {
  // Se captura el error dentro de la consulta para mostrarlo en pantalla en lugar de romper el render.
  const result = useLiveQuery<LibraryQueryResult>(async () => {
    try {
      return { entries: await animeRepository.listLibrary() }
    } catch (error) {
      return { error }
    }
  }, [])

  let status: LibraryStatus = 'loading'
  let entries: LibraryEntry[] = []
  if (result) {
    if ('entries' in result) {
      status = 'ready'
      entries = result.entries
    } else {
      status = 'error'
    }
  }

  const addAnime = (metadata: AnimeMetadata) => animeRepository.addToLibrary(metadata)

  return { status, entries, addAnime }
}
