import { describe, expect, it, vi } from 'vitest'
import { AniListError, createAniListService } from './anilist.service'

const jsonResponse = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' }, ...init })

const pageBody = (media: unknown[], pageInfo: unknown = { currentPage: 1, hasNextPage: true }) => ({
  data: { Page: { pageInfo, media } },
})

const serviceWith = (fetchImpl: () => Promise<Response>) => {
  const fetchMock = vi.fn(fetchImpl)
  return { fetchMock, service: createAniListService(fetchMock) }
}

describe('searchAnime', () => {
  it('envía la consulta paginada y transforma la respuesta a tipos internos', async () => {
    const { service, fetchMock } = serviceWith(async () =>
      jsonResponse(
        pageBody([
          {
            id: 21,
            title: { romaji: 'One Piece', english: null },
            coverImage: { large: 'https://img/large.jpg', medium: 'https://img/medium.jpg' },
            episodes: null,
            nextAiringEpisode: { episode: 1100 },
            status: 'RELEASING',
            format: 'TV',
            startDate: { year: 1999, month: 10, day: 20 },
            endDate: { year: null, month: null, day: null },
          },
        ]),
      ),
    )

    const result = await service.searchAnime('  one piece ', { page: 2, perPage: 5 })

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://graphql.anilist.co')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string).variables).toEqual({ search: 'one piece', page: 2, perPage: 5 })
    expect(result).toEqual({
      page: 1,
      hasNextPage: true,
      items: [
        {
          anilistId: 21,
          title: { romaji: 'One Piece', english: null },
          coverUrl: 'https://img/large.jpg',
          format: 'TV',
          airingStatus: 'RELEASING',
          episodes: null,
          nextEpisode: 1100,
          startDate: { year: 1999, month: 10, day: 20 },
          endDate: null,
        },
      ],
    })
  })

  it('usa valores nulos para campos ausentes o inválidos y descarta items sin id válido', async () => {
    const { service } = serviceWith(async () =>
      jsonResponse(pageBody([{ id: 5, episodes: 0, coverImage: { medium: 'https://img/m.jpg' } }, { id: 'x' }, null])),
    )

    const { items } = await service.searchAnime('x')

    expect(items).toEqual([
      {
        anilistId: 5,
        title: { romaji: null, english: null },
        coverUrl: 'https://img/m.jpg',
        format: null,
        airingStatus: null,
        episodes: null,
        nextEpisode: null,
        startDate: null,
        endDate: null,
      },
    ])
  })

  it.each([
    ['año, mes y día', { year: 2023, month: 9, day: 29 }, { year: 2023, month: 9, day: 29 }],
    ['solo año y mes', { year: 2023, month: 9, day: null }, { year: 2023, month: 9, day: null }],
    ['solo año', { year: 2023, month: null, day: null }, { year: 2023, month: null, day: null }],
    ['día sin mes (se descarta el día)', { year: 2023, month: null, day: 5 }, { year: 2023, month: null, day: null }],
    ['mes fuera de rango', { year: 2023, month: 13, day: 5 }, { year: 2023, month: null, day: null }],
    ['sin año', { year: null, month: 9, day: 29 }, null],
    ['campo ausente', undefined, null],
    ['valor que no es objeto', '2023-09-29', null],
  ])('valida las fechas de emisión: %s', async (_name, raw, expected) => {
    const { service } = serviceWith(async () => jsonResponse(pageBody([{ id: 1, startDate: raw }])))
    expect((await service.searchAnime('x')).items[0].startDate).toEqual(expected)
  })

  it('no consulta la API con un texto vacío', async () => {
    const { service, fetchMock } = serviceWith(async () => jsonResponse({}))
    expect(await service.searchAnime('   ')).toEqual({ items: [], page: 1, hasNextPage: false })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reporta los errors de GraphQL aunque el HTTP sea 200', async () => {
    const { service } = serviceWith(async () => jsonResponse({ errors: [{ message: 'Boom' }], data: null }))
    await expect(service.searchAnime('x')).rejects.toMatchObject({ kind: 'graphql', message: expect.stringContaining('Boom') })
  })

  it('reporta los errors de GraphQL en respuestas HTTP 400', async () => {
    const { service } = serviceWith(async () => jsonResponse({ errors: [{ message: 'Bad query' }] }, { status: 400 }))
    await expect(service.searchAnime('x')).rejects.toMatchObject({ kind: 'graphql' })
  })

  it('reporta el límite de peticiones con el tiempo de espera', async () => {
    const { service } = serviceWith(async () => new Response('{}', { status: 429, headers: { 'Retry-After': '42' } }))
    await expect(service.searchAnime('x')).rejects.toMatchObject({ kind: 'rate-limit', retryAfterSeconds: 42 })
  })

  it('reporta el límite de peticiones aunque falte Retry-After', async () => {
    const { service } = serviceWith(async () => new Response('', { status: 429 }))
    const error = await service.searchAnime('x').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(AniListError)
    expect(error).toMatchObject({ kind: 'rate-limit', retryAfterSeconds: undefined })
  })

  it('reporta otros errores HTTP', async () => {
    const { service } = serviceWith(async () => new Response('oops', { status: 500 }))
    await expect(service.searchAnime('x')).rejects.toMatchObject({ kind: 'http' })
  })

  it('reporta los fallos de red', async () => {
    const { service } = serviceWith(async () => {
      throw new TypeError('Failed to fetch')
    })
    await expect(service.searchAnime('x')).rejects.toMatchObject({ kind: 'network' })
  })

  it('propaga las cancelaciones sin convertirlas en errores de red', async () => {
    const { service } = serviceWith(async () => {
      throw new DOMException('Aborted', 'AbortError')
    })
    await expect(service.searchAnime('x')).rejects.toMatchObject({ name: 'AbortError' })
  })

  it.each([
    ['sin data', {}],
    ['sin media', { data: { Page: { pageInfo: {} } } }],
    ['no es JSON', 'texto'],
  ])('rechaza respuestas con forma inesperada (%s)', async (_name, body) => {
    const { service } = serviceWith(async () =>
      typeof body === 'string' ? new Response(body, { status: 200 }) : jsonResponse(body),
    )
    await expect(service.searchAnime('x')).rejects.toMatchObject({ kind: 'invalid-response' })
  })
})

describe('getAnimeById', () => {
  const media = {
    id: 154587,
    title: { romaji: 'Sousou no Frieren', english: 'Frieren' },
    coverImage: { large: 'https://img/l.jpg' },
    description: 'Primera línea.<br><br>\n(Fuente: <i>Alguien</i>)',
    genres: ['Adventure', 'Drama', 42, ''],
    episodes: 28,
    nextAiringEpisode: null,
    status: 'FINISHED',
    format: 'TV',
    startDate: { year: 2023, month: 9, day: 29 },
    endDate: { year: 2024, month: 3, day: 22 },
  }

  it('pide el anime por id y devuelve metadatos, géneros y descripción en texto plano', async () => {
    const { service, fetchMock } = serviceWith(async () => jsonResponse({ data: { Media: media } }))

    const detail = await service.getAnimeById(154587)

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(init.body as string).variables).toEqual({ id: 154587 })
    expect(detail).toEqual({
      anilistId: 154587,
      title: { romaji: 'Sousou no Frieren', english: 'Frieren' },
      coverUrl: 'https://img/l.jpg',
      format: 'TV',
      airingStatus: 'FINISHED',
      episodes: 28,
      nextEpisode: null,
      startDate: { year: 2023, month: 9, day: 29 },
      endDate: { year: 2024, month: 3, day: 22 },
      genres: ['Adventure', 'Drama'],
      description: 'Primera línea.\n\n(Fuente: Alguien)',
    })
  })

  it('usa descripción nula y géneros vacíos cuando faltan', async () => {
    const { service } = serviceWith(async () => jsonResponse({ data: { Media: { id: 3, description: '<br>' } } }))
    expect(await service.getAnimeById(3)).toMatchObject({ description: null, genres: [] })
  })

  it('reporta not-found cuando AniList responde 404', async () => {
    const { service } = serviceWith(async () =>
      jsonResponse({ errors: [{ message: 'Not Found.', status: 404 }], data: { Media: null } }, { status: 404 }),
    )
    await expect(service.getAnimeById(999999999)).rejects.toMatchObject({ kind: 'not-found' })
  })

  it('rechaza una respuesta sin Media', async () => {
    const { service } = serviceWith(async () => jsonResponse({ data: { Media: null } }))
    await expect(service.getAnimeById(1)).rejects.toMatchObject({ kind: 'invalid-response' })
  })
})
