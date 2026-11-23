import Dexie, { type EntityTable, type Table } from 'dexie'
import type { LibraryEntry, WatchedEpisode } from '../types/anime'

export type AnimeDatabase = Dexie & {
  library: EntityTable<LibraryEntry, 'anilistId'>
  watchedEpisodes: Table<WatchedEpisode, [number, number]>
}

export function createDatabase(name = 'anime-tracker'): AnimeDatabase {
  const database = new Dexie(name) as AnimeDatabase

  // Los booleanos no son claves válidas en IndexedDB, por eso `favorite` no se indexa.
  // Para cambiar el esquema, agregar una nueva versión con su migración; no editar esta.
  database.version(1).stores({
    library: 'anilistId, userStatus, addedAt, updatedAt',
    watchedEpisodes: '[anilistId+episodeNumber], anilistId',
  })

  return database
}

export const db = createDatabase()
