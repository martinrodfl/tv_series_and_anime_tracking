import { describe, expect, it } from 'vitest'
import type { LibraryEntry } from '../types/anime'
import { DEFAULT_LIBRARY_FILTERS, filterAndSortLibrary, summarizeLibrary, type LibraryFilters } from './library'

const entry = (anilistId: number, overrides: Partial<LibraryEntry> = {}): LibraryEntry => ({
  anilistId,
  title: { romaji: `Anime ${anilistId}`, english: null },
  coverUrl: null,
  format: 'TV',
  airingStatus: 'FINISHED',
  episodes: 12,
  nextEpisode: null,
  userStatus: 'planned',
  favorite: false,
  rating: null,
  addedAt: anilistId,
  updatedAt: anilistId,
  ...overrides,
})

const ids = (entries: LibraryEntry[]) => entries.map((e) => e.anilistId)
const filter = (entries: LibraryEntry[], overrides: Partial<LibraryFilters>) =>
  filterAndSortLibrary(entries, { ...DEFAULT_LIBRARY_FILTERS, ...overrides })

describe('filterAndSortLibrary', () => {
  const entries = [
    entry(1, { title: { romaji: 'Sousou no Frieren', english: 'Frieren' }, userStatus: 'watching', favorite: true, rating: 9 }),
    entry(2, { title: { romaji: 'Naruto', english: null }, userStatus: 'completed', rating: 7, addedAt: 50, updatedAt: 10 }),
    entry(3, { title: { romaji: 'Él y ella', english: null }, userStatus: 'watching', updatedAt: 30, addedAt: 5 }),
    entry(4, { title: { romaji: 'Bleach', english: null }, userStatus: 'dropped', rating: 7, updatedAt: 20, addedAt: 100 }),
  ]

  it('ordena por defecto por modificación reciente', () => {
    expect(ids(filter(entries, {}))).toEqual([3, 4, 2, 1])
  })

  it('ordena por agregado reciente, título y puntuación (sin puntuar al final)', () => {
    expect(ids(filter(entries, { sort: 'added' }))).toEqual([4, 2, 3, 1])
    expect(ids(filter(entries, { sort: 'title' }))).toEqual([4, 3, 1, 2])
    expect(ids(filter(entries, { sort: 'rating' }))).toEqual([1, 4, 2, 3])
  })

  it('filtra por estado y por favoritos', () => {
    expect(ids(filter(entries, { status: 'watching' })).sort()).toEqual([1, 3])
    expect(ids(filter(entries, { favoritesOnly: true }))).toEqual([1])
    expect(ids(filter(entries, { status: 'watching', favoritesOnly: true }))).toEqual([1])
    expect(filter(entries, { status: 'paused' })).toEqual([])
  })

  it('busca en ambos títulos sin distinguir mayúsculas ni acentos', () => {
    expect(ids(filter(entries, { search: 'FRIEREN' }))).toEqual([1])
    expect(ids(filter(entries, { search: 'sousou' }))).toEqual([1])
    expect(ids(filter(entries, { search: 'el y' }))).toEqual([3])
    expect(ids(filter(entries, { search: '  ' }))).toHaveLength(4)
    expect(filter(entries, { search: 'zzz' })).toEqual([])
  })

  it('no modifica la lista original', () => {
    const copy = [...entries]
    filter(entries, { sort: 'title' })
    expect(entries).toEqual(copy)
  })
})

describe('summarizeLibrary', () => {
  it('cuenta el total y los que se están viendo, y limita los recientes', () => {
    const entries = [
      entry(1, { userStatus: 'watching', updatedAt: 10 }),
      entry(2, { userStatus: 'watching', updatedAt: 30 }),
      entry(3, { updatedAt: 20 }),
    ]
    const summary = summarizeLibrary(entries, 2)
    expect(summary.total).toBe(3)
    expect(summary.watching).toBe(2)
    expect(ids(summary.recent)).toEqual([2, 3])
  })

  it('con la biblioteca vacía todo es cero', () => {
    expect(summarizeLibrary([])).toEqual({ total: 0, watching: 0, recent: [] })
  })
})
