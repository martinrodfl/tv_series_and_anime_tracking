import type {
  AnimeDates,
  AnimeDetail,
  AnimeMetadata,
  AnimeSearchResult,
  PartialDate,
  SearchPage,
} from '../types/anime'

const ANILIST_ENDPOINT = 'https://graphql.anilist.co'

// Solo los campos que se necesitan en cada pantalla.
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
      startDate { year month day }
      endDate { year month day }
    }
  }
}`

const DETAIL_QUERY = `
query ($id: Int!) {
  Media(id: $id, type: ANIME) {
    id
    title { romaji english }
    coverImage { large medium }
    description(asHtml: false)
    genres
    episodes
    nextAiringEpisode { episode }
    status
    format
    startDate { year month day }
    endDate { year month day }
  }
}`

export type AniListErrorKind =
  | 'network'
  | 'rate-limit'
  | 'http'
  | 'graphql'
  | 'not-found'
  | 'invalid-response'

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

export interface RequestOptions {
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

// Las fechas de AniList son opcionales y pueden venir incompletas: sin año no hay fecha; el día exige el mes.
function parsePartialDate(value: unknown): PartialDate | null {
  if (!isRecord(value)) return null
  const year = asPositiveInteger(value.year)
  if (year === null) return null
  const month = typeof value.month === 'number' && Number.isInteger(value.month) && value.month >= 1 && value.month <= 12 ? value.month : null
  const day =
    month !== null && typeof value.day === 'number' && Number.isInteger(value.day) && value.day >= 1 && value.day <= 31
      ? value.day
      : null
  return { year, month, day }
}

function parseDates(media: Record<string, unknown>): AnimeDates {
  return { startDate: parsePartialDate(media.startDate), endDate: parsePartialDate(media.endDate) }
}

function parseSearchResult(media: unknown): AnimeSearchResult | null {
  const metadata = parseMedia(media)
  return metadata && isRecord(media) ? { ...metadata, ...parseDates(media) } : null
}

function parseSearchPage(body: unknown, requestedPage: number): SearchPage {
  const page = isRecord(body) && isRecord(body.data) ? body.data.Page : undefined
  if (!isRecord(page) || !Array.isArray(page.media) || !isRecord(page.pageInfo)) {
    throw new AniListError('invalid-response', 'AniList devolvió una respuesta inesperada.')
  }
  return {
    items: page.media.map(parseSearchResult).filter((item): item is AnimeSearchResult => item !== null),
    page: asPositiveInteger(page.pageInfo.currentPage) ?? requestedPage,
    hasNextPage: page.pageInfo.hasNextPage === true,
  }
}

// AniList devuelve la descripción con etiquetas como <br> incluso sin pedir HTML: se reduce a texto plano.
function toPlainText(raw: string | null): string | null {
  if (raw === null) return null
  const text = raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return text === '' ? null : text
}

function parseDetail(body: unknown): AnimeDetail {
  const media = isRecord(body) && isRecord(body.data) ? body.data.Media : undefined
  const metadata = parseMedia(media)
  if (!metadata || !isRecord(media)) {
    throw new AniListError('invalid-response', 'AniList devolvió una respuesta inesperada.')
  }
  const genres = Array.isArray(media.genres)
    ? media.genres.map(asString).filter((genre): genre is string => genre !== null)
    : []
  return { ...metadata, ...parseDates(media), description: toPlainText(asString(media.description)), genres }
}

// Una respuesta HTTP exitosa también puede traer `errors` de GraphQL.
function parseGraphQLError(body: unknown): { message: string; status: unknown } | null {
  if (!isRecord(body) || !Array.isArray(body.errors) || body.errors.length === 0) return null
  const first: unknown = body.errors[0]
  const record = isRecord(first) ? first : {}
  return { message: asString(record.message) ?? 'Error desconocido de AniList', status: record.status }
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
  async function request(query: string, variables: Record<string, unknown>, signal?: AbortSignal): Promise<unknown> {
    let response: Response
    try {
      response = await fetchImpl(ANILIST_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ query, variables }),
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
    const graphQLError = parseGraphQLError(body)
    if (graphQLError) {
      if (graphQLError.status === 404) {
        throw new AniListError('not-found', 'No se encontró el anime en AniList.')
      }
      throw new AniListError('graphql', `AniList respondió con un error: ${graphQLError.message}`)
    }
    if (!response.ok) throw new AniListError('http', `AniList respondió con el estado ${response.status}.`)
    return body
  }

  return {
    async searchAnime(query: string, { page = 1, perPage = 10, signal }: SearchOptions = {}): Promise<SearchPage> {
      const search = query.trim()
      if (!search) return { items: [], page: 1, hasNextPage: false }
      const body = await request(SEARCH_QUERY, { search, page, perPage }, signal)
      return parseSearchPage(body, page)
    },

    async getAnimeById(anilistId: number, { signal }: RequestOptions = {}): Promise<AnimeDetail> {
      const body = await request(DETAIL_QUERY, { id: anilistId }, signal)
      return parseDetail(body)
    },
  }
}

export const { searchAnime, getAnimeById } = createAniListService()
