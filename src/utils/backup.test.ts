import { describe, expect, it } from 'vitest'
import type { LibraryEntry, WatchedEpisode } from '../types/anime'
import { BackupError, createBackup, parseBackup } from './backup'

const entry: LibraryEntry = {
  anilistId: 1,
  title: { romaji: 'Sousou no Frieren', english: 'Frieren' },
  coverUrl: 'https://img/cover.jpg',
  format: 'TV',
  airingStatus: 'FINISHED',
  episodes: 28,
  nextEpisode: null,
  userStatus: 'watching',
  favorite: true,
  rating: 9,
  addedAt: 1000,
  updatedAt: 2000,
}
const watched: WatchedEpisode = { anilistId: 1, episodeNumber: 3, watchedAt: 1500 }

const valid = () => JSON.parse(JSON.stringify(createBackup([entry], [watched], new Date('2026-01-02T03:04:05Z'))))

describe('parseBackup', () => {
  it('acepta lo que genera createBackup (ida y vuelta por JSON)', () => {
    const backup = parseBackup(valid())
    expect(backup.library).toEqual([entry])
    expect(backup.watchedEpisodes).toEqual([watched])
    expect(backup.exportedAt).toBe('2026-01-02T03:04:05.000Z')
  })

  it('acepta un respaldo vacío', () => {
    expect(parseBackup(createBackup([], []))).toMatchObject({ library: [], watchedEpisodes: [] })
  })

  it('descarta los campos desconocidos', () => {
    const data = valid()
    data.library[0].extra = 'x'
    data.extraRoot = true
    expect(parseBackup(data).library[0]).not.toHaveProperty('extra')
  })

  it.each([
    ['no es un objeto', [], /objeto JSON/],
    ['app incorrecta', { ...valid(), app: 'otra' }, /app:/],
    ['versión no soportada', { ...valid(), version: 2 }, /version:/],
    ['library que no es lista', { ...valid(), library: {} }, /library: debe ser una lista/],
  ])('rechaza un respaldo con %s', (_name, data, message) => {
    expect(() => parseBackup(data)).toThrow(BackupError)
    expect(() => parseBackup(data)).toThrow(message)
  })

  const mutate = (change: (data: ReturnType<typeof valid>) => void) => {
    const data = valid()
    change(data)
    return data
  }

  it.each([
    ['estado inválido', mutate((d) => (d.library[0].userStatus = 'finished')), /library\[0\]\.userStatus/],
    ['puntuación fuera de rango', mutate((d) => (d.library[0].rating = 11)), /library\[0\]\.rating/],
    ['puntuación decimal', mutate((d) => (d.library[0].rating = 7.5)), /library\[0\]\.rating/],
    ['id no positivo', mutate((d) => (d.library[0].anilistId = 0)), /library\[0\]\.anilistId/],
    ['favorite que no es booleano', mutate((d) => (d.library[0].favorite = 'si')), /library\[0\]\.favorite/],
    ['portada que no es https', mutate((d) => (d.library[0].coverUrl = 'http://img/cover.jpg')), /coverUrl/],
    ['portada javascript:', mutate((d) => (d.library[0].coverUrl = 'javascript:alert(1)')), /coverUrl/],
    ['título que no es objeto', mutate((d) => (d.library[0].title = 'x')), /title/],
    ['total negativo', mutate((d) => (d.library[0].episodes = -1)), /episodes/],
    ['fecha inválida', mutate((d) => (d.library[0].addedAt = 'ayer')), /addedAt/],
    ['episodio visto inválido', mutate((d) => (d.watchedEpisodes[0].episodeNumber = 0)), /watchedEpisodes\[0\]\.episodeNumber/],
    ['episodio visto absurdo', mutate((d) => (d.watchedEpisodes[0].episodeNumber = 1e9)), /episodeNumber/],
  ])('rechaza datos con %s e indica dónde', (_name, data, message) => {
    expect(() => parseBackup(data)).toThrow(message)
  })

  it('rechaza animes repetidos, episodios repetidos y episodios huérfanos', () => {
    expect(() => parseBackup(mutate((d) => d.library.push({ ...d.library[0] })))).toThrow(/repetido/)
    expect(() => parseBackup(mutate((d) => d.watchedEpisodes.push({ ...d.watchedEpisodes[0] })))).toThrow(/repetido/)
    expect(() => parseBackup(mutate((d) => (d.watchedEpisodes[0].anilistId = 99)))).toThrow(/no está en la biblioteca/)
  })
})
