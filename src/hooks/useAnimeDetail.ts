import { useCallback, useEffect, useState } from 'react'
import { AniListError, getAnimeById } from '../services/anilist.service'
import type { AnimeDetail } from '../types/anime'

interface Settled {
  key: string
  data?: AnimeDetail
  error?: unknown
}

export type AnimeDetailState =
  | { status: 'loading' }
  | { status: 'success'; data: AnimeDetail }
  | { status: 'error'; message: string; retryable: boolean }

/** Consulta AniList una vez por anime (y por reintento); cancela la petición si se cambia de anime. */
export function useAnimeDetail(anilistId: number) {
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<Settled | null>(null)
  const key = `${anilistId}|${attempt}`

  useEffect(() => {
    const controller = new AbortController()
    getAnimeById(anilistId, { signal: controller.signal }).then(
      (data) => {
        if (!controller.signal.aborted) setSettled({ key, data })
      },
      (error: unknown) => {
        if (!controller.signal.aborted) setSettled({ key, error })
      },
    )
    return () => controller.abort()
  }, [anilistId, key])

  const retry = useCallback(() => setAttempt((value) => value + 1), [])

  let state: AnimeDetailState
  if (settled?.key !== key) {
    state = { status: 'loading' }
  } else if (settled.data) {
    state = { status: 'success', data: settled.data }
  } else if (settled.error instanceof AniListError) {
    state = { status: 'error', message: settled.error.message, retryable: settled.error.kind !== 'not-found' }
  } else {
    state = { status: 'error', message: 'Ocurrió un error inesperado al consultar AniList.', retryable: true }
  }

  return { state, retry }
}
