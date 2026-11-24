import {
  USER_STATUSES,
  type AnimeMetadata,
  type LibraryEntry,
  type LibraryEntryChanges,
  type WatchedEpisode,
} from '../types/anime'
import { getAvailableEpisodes, MAX_EPISODE_NUMBER } from '../utils/progress'
import { db as defaultDb, type AnimeDatabase } from './database'

export class NotInLibraryError extends Error {
  constructor(anilistId: number) {
    super(`El anime ${anilistId} no está en la biblioteca`)
    this.name = 'NotInLibraryError'
  }
}

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0

// Solo se guardan los metadatos mínimos aunque llegue un objeto con más campos (p. ej. el detalle de AniList).
function pickMetadata(metadata: AnimeMetadata): AnimeMetadata {
  return {
    anilistId: metadata.anilistId,
    title: { romaji: metadata.title.romaji, english: metadata.title.english },
    coverUrl: metadata.coverUrl,
    format: metadata.format,
    airingStatus: metadata.airingStatus,
    episodes: metadata.episodes,
    nextEpisode: metadata.nextEpisode,
  }
}

function assertEpisodeNumber(episodeNumber: number) {
  if (!isPositiveInteger(episodeNumber) || episodeNumber > MAX_EPISODE_NUMBER) {
    throw new RangeError(`El número de episodio debe ser un entero entre 1 y ${MAX_EPISODE_NUMBER}`)
  }
}

function assertChanges(changes: LibraryEntryChanges) {
  if (changes.userStatus !== undefined && !USER_STATUSES.includes(changes.userStatus)) {
    throw new RangeError(`Estado personal no válido: ${String(changes.userStatus)}`)
  }
  if (changes.rating != null && !(Number.isInteger(changes.rating) && changes.rating >= 1 && changes.rating <= 10)) {
    throw new RangeError('La puntuación debe ser un entero entre 1 y 10')
  }
}

export function createAnimeRepository(database: AnimeDatabase = defaultDb) {
  const { library, watchedEpisodes } = database

  return {
    /** Agrega el anime con estado `planned`. Si ya existe, no toca sus datos personales. */
    async addToLibrary(metadata: AnimeMetadata): Promise<LibraryEntry> {
      if (!isPositiveInteger(metadata.anilistId)) {
        throw new RangeError('anilistId debe ser un entero positivo')
      }
      return database.transaction('rw', library, async () => {
        const existing = await library.get(metadata.anilistId)
        if (existing) return existing
        const now = Date.now()
        const entry: LibraryEntry = {
          ...pickMetadata(metadata),
          userStatus: 'planned',
          favorite: false,
          rating: null,
          addedAt: now,
          updatedAt: now,
        }
        await library.add(entry)
        return entry
      })
    },

    getLibraryEntry(anilistId: number): Promise<LibraryEntry | undefined> {
      return library.get(anilistId)
    },

    /** Biblioteca ordenada de lo modificado más recientemente a lo más antiguo. */
    listLibrary(): Promise<LibraryEntry[]> {
      return library.orderBy('updatedAt').reverse().toArray()
    },

    async updateLibraryEntry(anilistId: number, changes: LibraryEntryChanges): Promise<LibraryEntry> {
      assertChanges(changes)
      return database.transaction('rw', library, async () => {
        const existing = await library.get(anilistId)
        if (!existing) throw new NotInLibraryError(anilistId)
        const updated: LibraryEntry = {
          ...existing,
          ...(changes.userStatus !== undefined && { userStatus: changes.userStatus }),
          ...(changes.favorite !== undefined && { favorite: changes.favorite }),
          ...(changes.rating !== undefined && { rating: changes.rating }),
          updatedAt: Date.now(),
        }
        await library.put(updated)
        return updated
      })
    },

    /** Actualiza solo los metadatos de AniList (total, próximo episodio…); no toca datos personales ni `updatedAt`. */
    async refreshMetadata(metadata: AnimeMetadata): Promise<void> {
      await library.update(metadata.anilistId, {
        title: metadata.title,
        coverUrl: metadata.coverUrl,
        format: metadata.format,
        airingStatus: metadata.airingStatus,
        episodes: metadata.episodes,
        nextEpisode: metadata.nextEpisode,
      })
    },

    /** Elimina el anime y, en la misma transacción, sus episodios vistos. */
    async removeFromLibrary(anilistId: number): Promise<void> {
      await database.transaction('rw', [library, watchedEpisodes], async () => {
        await watchedEpisodes.where('anilistId').equals(anilistId).delete()
        await library.delete(anilistId)
      })
    },

    /** Idempotente: si el episodio ya estaba visto, conserva el `watchedAt` original. */
    async markEpisodeWatched(anilistId: number, episodeNumber: number): Promise<WatchedEpisode> {
      assertEpisodeNumber(episodeNumber)
      return database.transaction('rw', [library, watchedEpisodes], async () => {
        const entry = await library.get(anilistId)
        if (!entry) throw new NotInLibraryError(anilistId)
        const existing = await watchedEpisodes.get([anilistId, episodeNumber])
        if (existing) return existing
        const now = Date.now()
        const watched: WatchedEpisode = { anilistId, episodeNumber, watchedAt: now }
        await watchedEpisodes.add(watched)
        await library.update(anilistId, { updatedAt: now })
        return watched
      })
    },

    /**
     * Marca los episodios 1..upTo que falten, en una transacción. Idempotente: los ya vistos conservan su `watchedAt`.
     * Si se conoce cuántos episodios se emitieron, no deja pasar de ahí. Devuelve cuántos marcó.
     */
    async markEpisodesUpTo(anilistId: number, upTo: number): Promise<number> {
      assertEpisodeNumber(upTo)
      return database.transaction('rw', [library, watchedEpisodes], async () => {
        const entry = await library.get(anilistId)
        if (!entry) throw new NotInLibraryError(anilistId)
        const available = getAvailableEpisodes(entry)
        if (available !== null && upTo > available) {
          throw new RangeError('No se pueden marcar episodios que aún no se emitieron')
        }
        const alreadyWatched = new Set(
          (await watchedEpisodes.where('anilistId').equals(anilistId).toArray()).map((e) => e.episodeNumber),
        )
        const now = Date.now()
        const missing: WatchedEpisode[] = []
        for (let episodeNumber = 1; episodeNumber <= upTo; episodeNumber++) {
          if (!alreadyWatched.has(episodeNumber)) missing.push({ anilistId, episodeNumber, watchedAt: now })
        }
        if (missing.length > 0) {
          await watchedEpisodes.bulkAdd(missing)
          await library.update(anilistId, { updatedAt: now })
        }
        return missing.length
      })
    },

    /** Desmarcar elimina el registro; si no existía, no hace nada. */
    async unmarkEpisodeWatched(anilistId: number, episodeNumber: number): Promise<void> {
      assertEpisodeNumber(episodeNumber)
      await database.transaction('rw', [library, watchedEpisodes], async () => {
        const existing = await watchedEpisodes.get([anilistId, episodeNumber])
        if (!existing) return
        await watchedEpisodes.delete([anilistId, episodeNumber])
        await library.update(anilistId, { updatedAt: Date.now() })
      })
    },

    /** Episodios vistos, ordenados por número. */
    async getWatchedEpisodes(anilistId: number): Promise<WatchedEpisode[]> {
      const watched = await watchedEpisodes.where('anilistId').equals(anilistId).toArray()
      return watched.sort((a, b) => a.episodeNumber - b.episodeNumber)
    },

    /** Cantidad de episodios vistos por anime (solo los que tienen alguno). */
    async getWatchedCounts(): Promise<Map<number, number>> {
      const counts = new Map<number, number>()
      for (const key of await watchedEpisodes.orderBy('anilistId').keys()) {
        const anilistId = key as number
        counts.set(anilistId, (counts.get(anilistId) ?? 0) + 1)
      }
      return counts
    },

    /** Todos los datos locales, leídos de forma consistente, para exportarlos. */
    exportData(): Promise<{ library: LibraryEntry[]; watchedEpisodes: WatchedEpisode[] }> {
      return database.transaction('r', [library, watchedEpisodes], async () => ({
        library: await library.toArray(),
        watchedEpisodes: await watchedEpisodes.toArray(),
      }))
    },

    /** Reemplaza TODOS los datos locales por los recibidos (ya validados). Todo o nada. */
    importData(data: { library: LibraryEntry[]; watchedEpisodes: WatchedEpisode[] }): Promise<void> {
      return database.transaction('rw', [library, watchedEpisodes], async () => {
        await watchedEpisodes.clear()
        await library.clear()
        await library.bulkAdd(data.library)
        await watchedEpisodes.bulkAdd(data.watchedEpisodes)
      })
    },
  }
}

export type AnimeRepository = ReturnType<typeof createAnimeRepository>

export const animeRepository = createAnimeRepository()
