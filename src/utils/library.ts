import type { LibraryEntry, UserStatus } from '../types/anime'
import { getDisplayTitle } from './anime'

export const LIBRARY_SORTS = ['updated', 'added', 'title', 'rating'] as const
export type LibrarySort = (typeof LIBRARY_SORTS)[number]

export const LIBRARY_SORT_LABELS: Record<LibrarySort, string> = {
  updated: 'Modificado recientemente',
  added: 'Agregado recientemente',
  title: 'Título (A–Z)',
  rating: 'Mejor puntuados',
}

export interface LibraryFilters {
  search: string
  status: UserStatus | 'all'
  favoritesOnly: boolean
  sort: LibrarySort
}

export const DEFAULT_LIBRARY_FILTERS: LibraryFilters = {
  search: '',
  status: 'all',
  favoritesOnly: false,
  sort: 'updated',
}

/** Minúsculas y sin acentos, para comparar textos. */
const normalize = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

const compareTitles = (a: LibraryEntry, b: LibraryEntry) =>
  getDisplayTitle(a).localeCompare(getDisplayTitle(b), 'es', { sensitivity: 'base' })

const SORTERS: Record<LibrarySort, (a: LibraryEntry, b: LibraryEntry) => number> = {
  updated: (a, b) => b.updatedAt - a.updatedAt,
  added: (a, b) => b.addedAt - a.addedAt,
  title: compareTitles,
  // Sin puntuación al final; a igual puntuación, por título.
  rating: (a, b) => (b.rating ?? 0) - (a.rating ?? 0) || compareTitles(a, b),
}

export function filterAndSortLibrary(entries: LibraryEntry[], filters: LibraryFilters): LibraryEntry[] {
  const search = normalize(filters.search.trim())
  return entries
    .filter((entry) => filters.status === 'all' || entry.userStatus === filters.status)
    .filter((entry) => !filters.favoritesOnly || entry.favorite)
    .filter(
      (entry) =>
        search === '' ||
        [entry.title.english, entry.title.romaji].some((title) => title !== null && normalize(title).includes(search)),
    )
    .sort(SORTERS[filters.sort])
}

export interface LibrarySummary {
  total: number
  watching: number
  recent: LibraryEntry[]
}

/** Resumen simple para Inicio: totales y los últimos agregados o modificados. */
export function summarizeLibrary(entries: LibraryEntry[], recentLimit = 5): LibrarySummary {
  return {
    total: entries.length,
    watching: entries.filter((entry) => entry.userStatus === 'watching').length,
    recent: [...entries].sort(SORTERS.updated).slice(0, recentLimit),
  }
}
