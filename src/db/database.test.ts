import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { createDatabase } from './database'

const NAME = 'anime-tracker-migration-test'

afterEach(() => Dexie.delete(NAME))

describe('migración a la versión 2', () => {
  it('quita description y genres de lo ya guardado y conserva el resto, incluido el progreso', async () => {
    const legacy = new Dexie(NAME)
    legacy.version(1).stores({
      library: 'anilistId, userStatus, addedAt, updatedAt',
      watchedEpisodes: '[anilistId+episodeNumber], anilistId',
    })
    await legacy.table('library').bulkAdd([
      { anilistId: 1, title: { romaji: 'A', english: null }, userStatus: 'watching', favorite: true, rating: 8, addedAt: 1, updatedAt: 2, description: 'largo', genres: ['Drama'] },
      { anilistId: 2, title: { romaji: 'B', english: null }, userStatus: 'planned', favorite: false, rating: null, addedAt: 3, updatedAt: 4 },
    ])
    await legacy.table('watchedEpisodes').add({ anilistId: 1, episodeNumber: 3, watchedAt: 5 })
    legacy.close()

    const database = createDatabase(NAME)
    const migrated = await database.library.get(1)

    expect(migrated).toEqual({
      anilistId: 1,
      title: { romaji: 'A', english: null },
      userStatus: 'watching',
      favorite: true,
      rating: 8,
      addedAt: 1,
      updatedAt: 2,
    })
    expect(await database.library.count()).toBe(2)
    expect(await database.watchedEpisodes.count()).toBe(1)
    database.close()
  })
})
