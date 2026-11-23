import { useCallback, useEffect, useState } from 'react'
import { AniListError, searchAnime } from '../services/anilist.service'
import type { SearchPage } from '../types/anime'

interface Settled {
  key: string
  data?: SearchPage
  error?: unknown
}

export type AnimeSearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: SearchPage }
  | { status: 'error'; message: string }

/** Busca en AniList cuando cambian `query` o `page`; cancela la petición anterior. */
export function useAnimeSearch(query: string, page: number) {
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<Settled | null>(null)
  const key = `${query}|${page}|${attempt}`

  useEffect(() => {
    if (!query) return
    const controller = new AbortController()
    searchAnime(query, { page, signal: controller.signal }).then(
      (data) => {
        if (!controller.signal.aborted) setSettled({ key, data })
      },
      (error: unknown) => {
        if (!controller.signal.aborted) setSettled({ key, error })
      },
    )
    return () => controller.abort()
  }, [query, page, key])

  const retry = useCallback(() => setAttempt((value) => value + 1), [])

  let state: AnimeSearchState
  if (!query) {
    state = { status: 'idle' }
  } else if (settled?.key !== key) {
    state = { status: 'loading' }
  } else if (settled.data) {
    state = { status: 'success', data: settled.data }
  } else {
    const message =
      settled.error instanceof AniListError ? settled.error.message : 'Ocurrió un error inesperado al buscar.'
    state = { status: 'error', message }
  }

  return { state, retry }
}
