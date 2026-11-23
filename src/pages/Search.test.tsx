import { ThemeProvider } from '@mui/material/styles'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { darkTheme } from '../app/theme'
import { animeRepository } from '../db/anime.repository'
import { db } from '../db/database'
import * as anilist from '../services/anilist.service'
import type { AnimeMetadata, SearchPage } from '../types/anime'
import Library from './Library'
import Search from './Search'

vi.mock('../services/anilist.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/anilist.service')>()),
  searchAnime: vi.fn(),
}))

const searchAnime = vi.mocked(anilist.searchAnime)

const frieren: AnimeMetadata = {
  anilistId: 154587,
  title: { romaji: 'Sousou no Frieren', english: 'Frieren: Beyond Journey’s End' },
  coverUrl: null,
  format: 'TV',
  airingStatus: 'FINISHED',
  episodes: 28,
  nextEpisode: null,
}

const page = (items: AnimeMetadata[], overrides: Partial<SearchPage> = {}): SearchPage => ({
  items,
  page: 1,
  hasNextPage: false,
  ...overrides,
})

function renderApp(initialPath = '/search') {
  const router = createMemoryRouter(
    [
      { path: '/search', element: <Search /> },
      { path: '/library', element: <Library /> },
    ],
    { initialEntries: [initialPath] },
  )
  render(
    <ThemeProvider theme={darkTheme}>
      <RouterProvider router={router} />
    </ThemeProvider>,
  )
  return router
}

async function search(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.type(screen.getByRole('textbox', { name: 'Buscar anime' }), `${text}{Enter}`)
}

beforeEach(async () => {
  searchAnime.mockReset()
  await db.library.clear()
  await db.watchedEpisodes.clear()
})

describe('/search', () => {
  it('busca, agrega y el anime aparece persistido en la biblioteca', async () => {
    searchAnime.mockResolvedValue(page([frieren]))
    const user = userEvent.setup()
    const router = renderApp()

    await search(user, 'frieren')
    expect(await screen.findByText('Frieren: Beyond Journey’s End')).toBeInTheDocument()
    expect(searchAnime).toHaveBeenCalledWith('frieren', expect.objectContaining({ page: 1 }))

    await user.click(await screen.findByRole('button', { name: 'Agregar' }))

    expect(await screen.findByText('Ya agregado')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Agregar' })).not.toBeInTheDocument()
    expect(await animeRepository.getLibraryEntry(frieren.anilistId)).toMatchObject({ userStatus: 'planned' })

    await act(() => router.navigate('/library'))
    expect(await screen.findByText('Frieren: Beyond Journey’s End')).toBeInTheDocument()
    expect(screen.getByText('Planeado')).toBeInTheDocument()
  })

  it('marca como ya agregado un anime que ya está en la biblioteca', async () => {
    await animeRepository.addToLibrary(frieren)
    searchAnime.mockResolvedValue(page([frieren]))
    renderApp('/search?q=frieren')

    expect(await screen.findByText('Ya agregado')).toBeInTheDocument()
  })

  it('muestra el mensaje de error y permite reintentar', async () => {
    searchAnime.mockRejectedValueOnce(new anilist.AniListError('rate-limit', 'Demasiadas peticiones a AniList.'))
    searchAnime.mockResolvedValueOnce(page([frieren]))
    const user = userEvent.setup()
    renderApp('/search?q=frieren')

    expect(await screen.findByText('Demasiadas peticiones a AniList.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('Frieren: Beyond Journey’s End')).toBeInTheDocument()
  })

  it('muestra un mensaje cuando no hay resultados', async () => {
    searchAnime.mockResolvedValue(page([]))
    renderApp('/search?q=zzzz')

    expect(await screen.findByText('Sin resultados para «zzzz».')).toBeInTheDocument()
  })

  it('pagina con Anterior y Siguiente', async () => {
    searchAnime.mockImplementation(async (_query, options) =>
      page([frieren], { page: options?.page ?? 1, hasNextPage: (options?.page ?? 1) < 2 }),
    )
    const user = userEvent.setup()
    renderApp('/search?q=frieren')

    await screen.findByText('Página 1')
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Siguiente' }))

    await screen.findByText('Página 2')
    await waitFor(() => expect(searchAnime).toHaveBeenLastCalledWith('frieren', expect.objectContaining({ page: 2 })))
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled()
  })
})

describe('/library', () => {
  it('muestra el estado vacío cuando no hay anime', async () => {
    renderApp('/library')
    expect(await screen.findByText('Tu biblioteca está vacía.')).toBeInTheDocument()
  })
})
