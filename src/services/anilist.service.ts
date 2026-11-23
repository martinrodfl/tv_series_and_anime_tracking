import type { AnimeMetadata, SearchPage } from '../types/anime'

const ANILIST_ENDPOINT = 'https://graphql.anilist.co'

// Solo los campos que usan la búsqueda y la biblioteca.
const SEARCH_QUERY = `
query ($search: String!, $page: Int!, $perPage: Int!) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { currentPage hasNextPage }
    media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
      id
      title { romaji english }
      coverImage { large medium }
      episodes
      nextAiringEpisode { episode }
      status
      format
    }
  }
}`

export type AniListErrorKind = 'network' | 'rate-limit' | 'http' | 'graphql' | 'invalid-response'

export class AniListError extends Error {
  kind: AniListErrorKind
  retryAfterSeconds?: number

  constructor(kind: AniListErrorKind, message: string, retryAfterSeconds?: number) {
    super(message)
    this.name = 'AniListError'
    this.kind = kind
    this.retryAfterSeconds = retryAfterSeconds
  }
}

export interface SearchOptions {
  page?: number
  perPage?: number
  signal?: AbortSignal
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const asString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value : null

const asPositiveInteger = (value: unknown): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null

const isAbortError = (error: unknown) => error instanceof DOMException && error.name === 'AbortError'

function parseMedia(media: unknown): AnimeMetadata | null {
  if (!isRecord(media)) return null
  const anilistId = asPositiveInteger(media.id)
  if (anilistId === null) return null

  const title = isRecord(media.title) ? media.title : {}
  const cover = isRecord(media.coverImage) ? media.coverImage : {}
  const next = isRecord(media.nextAiringEpisode) ? media.nextAiringEpisode : {}

  return {
    anilistId,
    title: { romaji: asString(title.romaji), english: asString(title.english) },
    coverUrl: asString(cover.large) ?? asString(cover.medium),
    format: asString(media.format),
    airingStatus: asString(media.status),
    episodes: asPositiveInteger(media.episodes),
    nextEpisode: asPositiveInteger(next.episode),
  }
}

function parseSearchPage(body: unknown, requestedPage: number): SearchPage {
  const page = isRecord(body) && isRecord(body.data) ? body.data.Page : undefined
  if (!isRecord(page) || !Array.isArray(page.media) || !isRecord(page.pageInfo)) {
    throw new AniListError('invalid-response', 'AniList devolvió una respuesta inesperada.')
  }
  return {
    items: page.media.map(parseMedia).filter((item): item is AnimeMetadata => item !== null),
    page: asPositiveInteger(page.pageInfo.currentPage) ?? requestedPage,
    hasNextPage: page.pageInfo.hasNextPage === true,
  }
}

// Una respuesta HTTP exitosa también puede traer `errors` de GraphQL.
function graphQLErrorMessage(body: unknown): string | null {
  if (!isRecord(body) || !Array.isArray(body.errors) || body.errors.length === 0) return null
  const first: unknown = body.errors[0]
  return (isRecord(first) ? asString(first.message) : null) ?? 'Error desconocido de AniList'
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return undefined
  }
}

function parseRetryAfter(response: Response): number | undefined {
  const seconds = Number(response.headers.get('Retry-After'))
  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : undefined
}

export function createAniListService(fetchImpl: FetchLike = (input, init) => fetch(input, init)) {
  return {
    async searchAnime(query: string, { page = 1, perPage = 10, signal }: SearchOptions = {}): Promise<SearchPage> {
      const search = query.trim()
      if (!search) return { items: [], page: 1, hasNextPage: false }

      let response: Response
      try {
        response = await fetchImpl(ANILIST_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ query: SEARCH_QUERY, variables: { search, page, perPage } }),
          signal,
        })
      } catch (error) {
        if (isAbortError(error)) throw error
        throw new AniListError('network', 'No se pudo conectar con AniList. Revisa tu conexión.')
      }

      if (response.status === 429) {
        const retryAfter = parseRetryAfter(response)
        throw new AniListError(
          'rate-limit',
          retryAfter
            ? `Demasiadas peticiones a AniList. Reintenta en ${retryAfter} s.`
            : 'Demasiadas peticiones a AniList. Reintenta en un momento.',
          retryAfter,
        )
      }

      const body = await readJson(response)
      const graphQLError = graphQLErrorMessage(body)
      if (graphQLError) throw new AniListError('graphql', `AniList respondió con un error: ${graphQLError}`)
      if (!response.ok) throw new AniListError('http', `AniList respondió con el estado ${response.status}.`)

      return parseSearchPage(body, page)
    },
  }
}

export const { searchAnime } = createAniListService()
