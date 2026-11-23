import { ThemeProvider } from '@mui/material/styles'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { darkTheme } from '../app/theme'
import { animeRepository } from '../db/anime.repository'
import { db } from '../db/database'
import * as anilist from '../services/anilist.service'
import type { AnimeDetail as AnimeDetailData } from '../types/anime'
import AnimeDetail from './AnimeDetail'

vi.mock('../services/anilist.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/anilist.service')>()),
  getAnimeById: vi.fn(),
}))

const getAnimeById = vi.mocked(anilist.getAnimeById)

const detailOf = (overrides: Partial<AnimeDetailData> = {}): AnimeDetailData => ({
  anilistId: 10,
  title: { romaji: 'Sousou no Frieren', english: 'Frieren' },
  coverUrl: null,
  format: 'TV',
  airingStatus: 'FINISHED',
  episodes: 4,
  nextEpisode: null,
  description: 'Una elfa.\n\nSegundo párrafo.',
  genres: ['Adventure', 'Drama'],
  ...overrides,
})

function renderDetail(id: string | number = 10) {
  const router = createMemoryRouter([{ path: '/anime/:id', element: <AnimeDetail /> }], {
    initialEntries: [`/anime/${id}`],
  })
  render(
    <ThemeProvider theme={darkTheme}>
      <RouterProvider router={router} />
    </ThemeProvider>,
  )
}

const episodeButton = (n: number) => screen.findByRole('button', { name: `Episodio ${n}` })
const progressText = (text: string | RegExp) => screen.findByText(text)

beforeEach(async () => {
  getAnimeById.mockReset()
  await db.library.clear()
  await db.watchedEpisodes.clear()
})

describe('/anime/:id', () => {
  it('muestra los datos de AniList y, sin estar en la biblioteca, ofrece agregarlo', async () => {
    getAnimeById.mockResolvedValue(detailOf())
    renderDetail()

    expect(await screen.findByRole('heading', { level: 1, name: 'Frieren' })).toBeInTheDocument()
    expect(screen.getByText('Sousou no Frieren')).toBeInTheDocument()
    expect(screen.getByText('Adventure')).toBeInTheDocument()
    expect(screen.getByText(/Una elfa\./)).toBeInTheDocument()
    expect(screen.getByText('Finalizado')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Episodios' })).not.toBeInTheDocument()

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Agregar a la biblioteca' }))

    expect(await screen.findByRole('combobox', { name: 'Estado' })).toHaveTextContent('Planeado')
    expect(await animeRepository.getLibraryEntry(10)).toBeDefined()
  })

  it('marca y desmarca episodios y el progreso se actualiza', async () => {
    getAnimeById.mockResolvedValue(detailOf())
    await animeRepository.addToLibrary(detailOf())
    const user = userEvent.setup()
    renderDetail()

    expect(await progressText('0 de 4 episodios vistos (0 %)')).toBeInTheDocument()

    await user.click(await episodeButton(1))
    await user.click(await episodeButton(2))

    expect(await progressText('2 de 4 episodios vistos (50 %)')).toBeInTheDocument()
    expect(await episodeButton(1)).toHaveAttribute('aria-pressed', 'true')
    expect((await animeRepository.getWatchedEpisodes(10)).map((e) => e.episodeNumber)).toEqual([1, 2])

    await user.click(await episodeButton(2))

    expect(await progressText('1 de 4 episodios vistos (25 %)')).toBeInTheDocument()
    expect(await episodeButton(2)).toHaveAttribute('aria-pressed', 'false')
    expect(getAnimeById).toHaveBeenCalledTimes(1)
  })

  it('en emisión solo permite marcar los episodios ya emitidos', async () => {
    getAnimeById.mockResolvedValue(detailOf({ episodes: 12, nextEpisode: 4, airingStatus: 'RELEASING' }))
    await animeRepository.addToLibrary(detailOf())
    renderDetail()

    const group = await screen.findByRole('group', { name: 'Episodios' })
    expect(within(group).getAllByRole('button')).toHaveLength(3)
    expect(await progressText('0 de 3 episodios vistos (0 %)')).toBeInTheDocument()
  })

  it('con 0 episodios emitidos no muestra controles ni divide por cero', async () => {
    getAnimeById.mockResolvedValue(detailOf({ episodes: 12, nextEpisode: 1, airingStatus: 'NOT_YET_RELEASED' }))
    await animeRepository.addToLibrary(detailOf())
    renderDetail()

    expect(await screen.findAllByText('Aún no se emitió ningún episodio.')).not.toHaveLength(0)
    expect(screen.getByText('Aún no hay episodios emitidos que marcar.')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Episodios' })).not.toBeInTheDocument()
  })

  it('sin total conocido, el progreso no está disponible y el seguimiento es manual', async () => {
    const unknown = detailOf({ episodes: null, nextEpisode: null, airingStatus: 'RELEASING' })
    getAnimeById.mockResolvedValue(unknown)
    await animeRepository.addToLibrary(unknown)
    const user = userEvent.setup()
    renderDetail()

    expect(await progressText(/Progreso no disponible/)).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()

    await user.type(await screen.findByRole('spinbutton', { name: 'Número de episodio' }), '7')
    await user.click(screen.getByRole('button', { name: 'Marcar como visto' }))

    expect(await episodeButton(7)).toHaveAttribute('aria-pressed', 'true')
    expect(await progressText(/Episodios marcados: 1/)).toBeInTheDocument()

    await user.type(screen.getByRole('spinbutton', { name: 'Número de episodio' }), '0')
    await user.click(screen.getByRole('button', { name: 'Marcar como visto' }))
    expect(screen.getByText('Escribe un número entero positivo.')).toBeInTheDocument()
    expect(await animeRepository.getWatchedEpisodes(10)).toHaveLength(1)
  })

  it('cambia el estado personal', async () => {
    getAnimeById.mockResolvedValue(detailOf())
    await animeRepository.addToLibrary(detailOf())
    const user = userEvent.setup()
    renderDetail()

    await user.click(await screen.findByRole('combobox', { name: 'Estado' }))
    await user.click(await screen.findByRole('option', { name: 'Viendo' }))

    await waitFor(async () => expect((await animeRepository.getLibraryEntry(10))?.userStatus).toBe('watching'))
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Estado' })).toHaveTextContent('Viendo'))
  })

  it('actualiza los metadatos guardados cuando AniList trae datos nuevos', async () => {
    await animeRepository.addToLibrary(detailOf({ episodes: null, nextEpisode: 5 }))
    getAnimeById.mockResolvedValue(detailOf({ episodes: 12, nextEpisode: null }))
    renderDetail()

    expect(await progressText('0 de 12 episodios vistos (0 %)')).toBeInTheDocument()
    await waitFor(async () => expect(await animeRepository.getLibraryEntry(10)).toMatchObject({ episodes: 12, nextEpisode: null }))
  })

  it('sin conexión, muestra los datos guardados y un aviso con reintento', async () => {
    getAnimeById.mockRejectedValueOnce(new anilist.AniListError('network', 'No se pudo conectar con AniList.'))
    await animeRepository.addToLibrary(detailOf())
    const user = userEvent.setup()
    renderDetail()

    expect(await screen.findByText(/No se pudo conectar con AniList\./)).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 1, name: 'Frieren' })).toBeInTheDocument()
    expect(screen.getByText(/Descripción no disponible/)).toBeInTheDocument()
    expect(await episodeButton(1)).toBeInTheDocument()

    getAnimeById.mockResolvedValueOnce(detailOf())
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText(/Una elfa\./)).toBeInTheDocument()
  })

  it('muestra el error sin reintento cuando el anime no existe en AniList', async () => {
    getAnimeById.mockRejectedValue(new anilist.AniListError('not-found', 'No se encontró el anime en AniList.'))
    renderDetail(999)

    expect(await screen.findByText('No se encontró el anime en AniList.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
  })
})
