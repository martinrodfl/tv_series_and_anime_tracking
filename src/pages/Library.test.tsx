import { ThemeProvider } from '@mui/material/styles'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { darkTheme } from '../app/theme'
import { animeRepository } from '../db/anime.repository'
import { db } from '../db/database'
import type { AnimeMetadata, LibraryEntryChanges } from '../types/anime'
import Library from './Library'

const anime = (anilistId: number, romaji: string, overrides: Partial<AnimeMetadata> = {}): AnimeMetadata => ({
  anilistId,
  title: { romaji, english: null },
  coverUrl: null,
  format: 'TV',
  airingStatus: 'FINISHED',
  episodes: 10,
  nextEpisode: null,
  ...overrides,
})

async function seed(metadata: AnimeMetadata, changes: LibraryEntryChanges = {}, watchedUpTo = 0) {
  await animeRepository.addToLibrary(metadata)
  if (Object.keys(changes).length > 0) await animeRepository.updateLibraryEntry(metadata.anilistId, changes)
  if (watchedUpTo > 0) await animeRepository.markEpisodesUpTo(metadata.anilistId, watchedUpTo)
}

function renderLibrary(path = '/library') {
  const router = createMemoryRouter([{ path: '/library', element: <Library /> }], { initialEntries: [path] })
  render(
    <ThemeProvider theme={darkTheme}>
      <RouterProvider router={router} />
    </ThemeProvider>,
  )
  return router
}

const titles = () => screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)

beforeEach(async () => {
  await db.library.clear()
  await db.watchedEpisodes.clear()
})

describe('/library', () => {
  beforeEach(async () => {
    await seed(anime(1, 'Naruto'), { userStatus: 'watching', rating: 7 }, 4)
    await seed(anime(2, 'Bleach', { episodes: null }), { userStatus: 'completed', favorite: true, rating: 9 })
    await seed(anime(3, 'Akira'), { userStatus: 'planned' })
  })

  it('muestra estado, puntuación y progreso (o "no disponible" sin total) de cada anime', async () => {
    renderLibrary()

    expect(await screen.findByText('4 / 10 (40 %)')).toBeInTheDocument()
    expect(screen.getByText('Progreso no disponible')).toBeInTheDocument()
    expect(screen.getByText('★ 9/10')).toBeInTheDocument()
    expect(screen.getByText('Mostrando 3 de 3')).toBeInTheDocument()
  })

  it('busca por título sin distinguir mayúsculas y lo guarda en la URL', async () => {
    const user = userEvent.setup()
    const router = renderLibrary()

    await user.type(await screen.findByRole('textbox', { name: 'Buscar en la biblioteca' }), 'BLEA')

    expect(titles()).toEqual(['Bleach'])
    expect(screen.getByText('Mostrando 1 de 3')).toBeInTheDocument()
    expect(router.state.location.search).toBe('?q=BLEA')
  })

  it('filtra por estado y por favoritos', async () => {
    const user = userEvent.setup()
    renderLibrary()

    await user.click(await screen.findByRole('combobox', { name: 'Estado' }))
    await user.click(await screen.findByRole('option', { name: 'Viendo' }))
    expect(titles()).toEqual(['Naruto'])

    await user.click(screen.getByRole('combobox', { name: 'Estado' }))
    await user.click(await screen.findByRole('option', { name: 'Todos' }))
    await user.click(screen.getByRole('button', { name: 'Solo favoritos' }))
    expect(titles()).toEqual(['Bleach'])
  })

  it('ordena por título y por puntuación', async () => {
    const user = userEvent.setup()
    renderLibrary('/library?sort=title')
    expect(await screen.findByText('Mostrando 3 de 3')).toBeInTheDocument()
    expect(titles()).toEqual(['Akira', 'Bleach', 'Naruto'])

    await user.click(screen.getByRole('combobox', { name: 'Ordenar por' }))
    await user.click(await screen.findByRole('option', { name: 'Mejor puntuados' }))
    expect(titles()).toEqual(['Bleach', 'Naruto', 'Akira'])
  })

  it('ignora valores inválidos de la URL y permite limpiar los filtros', async () => {
    const user = userEvent.setup()
    renderLibrary('/library?status=nada&sort=raro&q=zzz')

    expect(await screen.findByText('Ningún anime coincide con los filtros.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    expect(titles()).toHaveLength(3)
  })

  it('cambia el favorito desde la tarjeta y se guarda', async () => {
    const user = userEvent.setup()
    renderLibrary()

    await user.click(await screen.findByRole('button', { name: 'Marcar «Akira» como favorito' }))

    await waitFor(async () => expect((await animeRepository.getLibraryEntry(3))?.favorite).toBe(true))
    expect(await screen.findByRole('button', { name: 'Quitar «Akira» de favoritos' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('quita sin confirmar un anime sin progreso', async () => {
    const user = userEvent.setup()
    renderLibrary()

    await user.click(await screen.findByRole('button', { name: 'Quitar «Akira» de la biblioteca' }))

    await waitFor(async () => expect(await animeRepository.getLibraryEntry(3)).toBeUndefined())
    await waitFor(() => expect(titles()).not.toContain('Akira'))
  })

  it('pide confirmación si hay progreso: cancelar no borra y confirmar borra también los episodios', async () => {
    const user = userEvent.setup()
    renderLibrary()

    await user.click(await screen.findByRole('button', { name: 'Quitar «Naruto» de la biblioteca' }))
    const dialog = await screen.findByRole('dialog', { name: '¿Quitar de la biblioteca?' })
    expect(within(dialog).getByText(/4 episodios vistos registrados/)).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await animeRepository.getLibraryEntry(1)).toBeDefined()
    expect(await animeRepository.getWatchedEpisodes(1)).toHaveLength(4)

    await user.click(screen.getByRole('button', { name: 'Quitar «Naruto» de la biblioteca' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Quitar' }))

    await waitFor(async () => expect(await animeRepository.getLibraryEntry(1)).toBeUndefined())
    expect(await animeRepository.getWatchedEpisodes(1)).toEqual([])
  })
})
