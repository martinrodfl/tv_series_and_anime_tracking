import 'fake-indexeddb/auto'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnimeMetadata } from '../types/anime'
import { createAnimeRepository, NotInLibraryError } from './anime.repository'
import { createDatabase } from './database'

const database = createDatabase('anime-tracker-test')
const repo = createAnimeRepository(database)

const anime = (anilistId: number, overrides: Partial<AnimeMetadata> = {}): AnimeMetadata => ({
  anilistId,
  title: { romaji: `Anime ${anilistId}`, english: null },
  coverUrl: null,
  format: 'TV',
  airingStatus: 'FINISHED',
  episodes: 12,
  nextEpisode: null,
  ...overrides,
})

beforeEach(async () => {
  await database.library.clear()
  await database.watchedEpisodes.clear()
  vi.useRealTimers()
})

afterAll(() => database.delete())

describe('biblioteca', () => {
  it('agrega un anime con estado planned y sin datos personales', async () => {
    const entry = await repo.addToLibrary(anime(1))
    expect(entry).toMatchObject({ anilistId: 1, userStatus: 'planned', favorite: false, rating: null })
    expect(await repo.getLibraryEntry(1)).toEqual(entry)
  })

  it('agregar guarda solo los metadatos mínimos aunque llegue un objeto con más campos', async () => {
    const detail = { ...anime(1), description: 'texto largo', genres: ['Drama'] }

    await repo.addToLibrary(detail)

    expect(Object.keys((await repo.getLibraryEntry(1)) ?? {}).sort()).toEqual(
      [
        'addedAt', 'airingStatus', 'anilistId', 'coverUrl', 'episodes', 'favorite', 'format',
        'nextEpisode', 'rating', 'title', 'updatedAt', 'userStatus',
      ].sort(),
    )
  })

  it('agregar dos veces no sobrescribe los datos personales', async () => {
    await repo.addToLibrary(anime(1))
    await repo.updateLibraryEntry(1, { userStatus: 'watching', favorite: true, rating: 8 })
    await repo.addToLibrary(anime(1))
    expect(await repo.getLibraryEntry(1)).toMatchObject({ userStatus: 'watching', favorite: true, rating: 8 })
    expect(await repo.listLibrary()).toHaveLength(1)
  })

  it('rechaza ids no válidos', async () => {
    await expect(repo.addToLibrary(anime(0))).rejects.toThrow(RangeError)
    await expect(repo.addToLibrary(anime(1.5))).rejects.toThrow(RangeError)
  })

  it('devuelve undefined si el anime no existe', async () => {
    expect(await repo.getLibraryEntry(99)).toBeUndefined()
  })

  it('lista primero lo modificado más recientemente', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(1000)
    await repo.addToLibrary(anime(1))
    vi.setSystemTime(2000)
    await repo.addToLibrary(anime(2))
    vi.setSystemTime(3000)
    await repo.updateLibraryEntry(1, { favorite: true })
    expect((await repo.listLibrary()).map((e) => e.anilistId)).toEqual([1, 2])
  })

  it('actualiza solo los campos indicados y refresca updatedAt', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(1000)
    await repo.addToLibrary(anime(1))
    vi.setSystemTime(5000)
    const updated = await repo.updateLibraryEntry(1, { userStatus: 'paused' })
    expect(updated).toMatchObject({ userStatus: 'paused', favorite: false, rating: null, addedAt: 1000, updatedAt: 5000 })
  })

  it('permite quitar la puntuación con null', async () => {
    await repo.addToLibrary(anime(1))
    await repo.updateLibraryEntry(1, { rating: 7 })
    expect((await repo.updateLibraryEntry(1, { rating: null })).rating).toBeNull()
  })

  it('valida estado y puntuación', async () => {
    await repo.addToLibrary(anime(1))
    // @ts-expect-error estado inválido a propósito
    await expect(repo.updateLibraryEntry(1, { userStatus: 'finished' })).rejects.toThrow(RangeError)
    await expect(repo.updateLibraryEntry(1, { rating: 0 })).rejects.toThrow(RangeError)
    await expect(repo.updateLibraryEntry(1, { rating: 11 })).rejects.toThrow(RangeError)
    await expect(repo.updateLibraryEntry(1, { rating: 7.5 })).rejects.toThrow(RangeError)
  })

  it('actualizar un anime inexistente falla', async () => {
    await expect(repo.updateLibraryEntry(99, { favorite: true })).rejects.toThrow(NotInLibraryError)
  })

  it('refreshMetadata actualiza los metadatos sin tocar datos personales ni updatedAt', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(1000)
    await repo.addToLibrary(anime(1, { episodes: null, nextEpisode: 5 }))
    await repo.updateLibraryEntry(1, { userStatus: 'watching', favorite: true })
    const before = await repo.getLibraryEntry(1)

    vi.setSystemTime(9000)
    await repo.refreshMetadata(anime(1, { episodes: 12, nextEpisode: null, airingStatus: 'FINISHED' }))

    expect(await repo.getLibraryEntry(1)).toEqual({
      ...before,
      episodes: 12,
      nextEpisode: null,
      airingStatus: 'FINISHED',
    })
  })

  it('refreshMetadata ignora los anime que no están en la biblioteca', async () => {
    await repo.refreshMetadata(anime(99))
    expect(await repo.getLibraryEntry(99)).toBeUndefined()
  })

  it('quitar un anime borra también sus episodios vistos, y solo los suyos', async () => {
    await repo.addToLibrary(anime(1))
    await repo.addToLibrary(anime(2))
    await repo.markEpisodeWatched(1, 1)
    await repo.markEpisodeWatched(1, 2)
    await repo.markEpisodeWatched(2, 1)

    await repo.removeFromLibrary(1)

    expect(await repo.getLibraryEntry(1)).toBeUndefined()
    expect(await repo.getWatchedEpisodes(1)).toEqual([])
    expect(await repo.getWatchedEpisodes(2)).toHaveLength(1)
  })

  it('quitar un anime inexistente no falla', async () => {
    await expect(repo.removeFromLibrary(99)).resolves.toBeUndefined()
  })
})

describe('episodios vistos', () => {
  beforeEach(async () => {
    await repo.addToLibrary(anime(1))
  })

  it('marcar es idempotente y conserva el watchedAt original', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(1000)
    const first = await repo.markEpisodeWatched(1, 3)
    vi.setSystemTime(9000)
    const second = await repo.markEpisodeWatched(1, 3)

    expect(second).toEqual(first)
    expect(second.watchedAt).toBe(1000)
    expect(await repo.getWatchedEpisodes(1)).toHaveLength(1)
  })

  it('devuelve los episodios ordenados por número', async () => {
    await repo.markEpisodeWatched(1, 10)
    await repo.markEpisodeWatched(1, 2)
    await repo.markEpisodeWatched(1, 5)
    expect((await repo.getWatchedEpisodes(1)).map((e) => e.episodeNumber)).toEqual([2, 5, 10])
  })

  it('desmarcar elimina el registro y es idempotente', async () => {
    await repo.markEpisodeWatched(1, 1)
    await repo.unmarkEpisodeWatched(1, 1)
    await repo.unmarkEpisodeWatched(1, 1)
    expect(await repo.getWatchedEpisodes(1)).toEqual([])
  })

  it('marcar y desmarcar actualizan updatedAt del anime', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(2000)
    await repo.markEpisodeWatched(1, 1)
    expect((await repo.getLibraryEntry(1))?.updatedAt).toBe(2000)
    vi.setSystemTime(3000)
    await repo.unmarkEpisodeWatched(1, 1)
    expect((await repo.getLibraryEntry(1))?.updatedAt).toBe(3000)
  })

  it('no guarda episodios de un anime que no está en la biblioteca', async () => {
    await expect(repo.markEpisodeWatched(99, 1)).rejects.toThrow(NotInLibraryError)
    expect(await repo.getWatchedEpisodes(99)).toEqual([])
  })

  it.each([0, -1, 1.5, Number.NaN, 10_001])('rechaza el número de episodio %s', async (n) => {
    await expect(repo.markEpisodeWatched(1, n)).rejects.toThrow(RangeError)
    await expect(repo.unmarkEpisodeWatched(1, n)).rejects.toThrow(RangeError)
  })
})

describe('marcar hasta un episodio', () => {
  it('marca solo los que faltan, conserva los ya vistos y es idempotente', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    await repo.addToLibrary(anime(1, { episodes: 12 }))
    vi.setSystemTime(1000)
    await repo.markEpisodeWatched(1, 2)
    vi.setSystemTime(5000)

    expect(await repo.markEpisodesUpTo(1, 4)).toBe(3)
    expect(await repo.markEpisodesUpTo(1, 4)).toBe(0)

    const watched = await repo.getWatchedEpisodes(1)
    expect(watched.map((e) => e.episodeNumber)).toEqual([1, 2, 3, 4])
    expect(watched.find((e) => e.episodeNumber === 2)?.watchedAt).toBe(1000)
    expect(watched.find((e) => e.episodeNumber === 1)?.watchedAt).toBe(5000)
    expect((await repo.getLibraryEntry(1))?.updatedAt).toBe(5000)
  })

  it('no cuenta episodios futuros de un anime en emisión', async () => {
    await repo.addToLibrary(anime(1, { episodes: 24, nextEpisode: 4 }))
    await expect(repo.markEpisodesUpTo(1, 4)).rejects.toThrow(RangeError)
    expect(await repo.getWatchedEpisodes(1)).toEqual([])
    expect(await repo.markEpisodesUpTo(1, 3)).toBe(3)
  })

  it('con total desconocido deja marcar hasta cualquier episodio válido', async () => {
    await repo.addToLibrary(anime(1, { episodes: null, nextEpisode: null }))
    expect(await repo.markEpisodesUpTo(1, 30)).toBe(30)
  })

  it('valida el número y que el anime esté en la biblioteca', async () => {
    await repo.addToLibrary(anime(1))
    await expect(repo.markEpisodesUpTo(1, 0)).rejects.toThrow(RangeError)
    await expect(repo.markEpisodesUpTo(99, 1)).rejects.toThrow(NotInLibraryError)
  })
})

describe('conteo y respaldo', () => {
  it('cuenta los episodios vistos por anime', async () => {
    await repo.addToLibrary(anime(1))
    await repo.addToLibrary(anime(2))
    await repo.addToLibrary(anime(3))
    await repo.markEpisodesUpTo(1, 3)
    await repo.markEpisodeWatched(2, 5)

    expect(await repo.getWatchedCounts()).toEqual(
      new Map([
        [1, 3],
        [2, 1],
      ]),
    )
  })

  it('exporta todo y la importación reemplaza los datos locales', async () => {
    await repo.addToLibrary(anime(1))
    await repo.markEpisodesUpTo(1, 2)
    const exported = await repo.exportData()
    expect(exported.library).toHaveLength(1)
    expect(exported.watchedEpisodes).toHaveLength(2)

    await repo.addToLibrary(anime(2))
    await repo.markEpisodeWatched(2, 1)
    await repo.importData(exported)

    expect(await repo.listLibrary()).toEqual(exported.library)
    expect(await repo.getWatchedEpisodes(1)).toHaveLength(2)
    expect(await repo.getLibraryEntry(2)).toBeUndefined()
    expect(await repo.getWatchedEpisodes(2)).toEqual([])
  })

  it('si la importación falla no se pierde nada', async () => {
    await repo.addToLibrary(anime(1))
    await repo.markEpisodeWatched(1, 1)
    const [entry] = await repo.listLibrary()

    // Un anime repetido hace fallar bulkAdd a mitad de la transacción.
    await expect(repo.importData({ library: [entry, entry], watchedEpisodes: [] })).rejects.toThrow()

    expect(await repo.listLibrary()).toEqual([entry])
    expect(await repo.getWatchedEpisodes(1)).toHaveLength(1)
  })
})
