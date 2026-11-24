import { ThemeProvider } from '@mui/material/styles'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { darkTheme } from '../app/theme'
import { animeRepository } from '../db/anime.repository'
import { db } from '../db/database'
import type { AnimeMetadata } from '../types/anime'
import { createBackup } from '../utils/backup'
import { downloadTextFile } from '../utils/download'
import Home from './Home'

vi.mock('../utils/download', () => ({ downloadTextFile: vi.fn() }))

const anime = (anilistId: number, romaji: string): AnimeMetadata => ({
  anilistId,
  title: { romaji, english: null },
  coverUrl: null,
  format: 'TV',
  airingStatus: 'FINISHED',
  episodes: 12,
  nextEpisode: null,
})

function renderHome() {
  const router = createMemoryRouter([{ path: '/', element: <Home /> }], { initialEntries: ['/'] })
  render(
    <ThemeProvider theme={darkTheme}>
      <RouterProvider router={router} />
    </ThemeProvider>,
  )
}

const backupFile = (content: unknown) =>
  new File([typeof content === 'string' ? content : JSON.stringify(content)], 'respaldo.json', {
    type: 'application/json',
  })

beforeEach(async () => {
  vi.useRealTimers()
  vi.mocked(downloadTextFile).mockReset()
  await db.library.clear()
  await db.watchedEpisodes.clear()
})

describe('Inicio: resumen', () => {
  it('muestra el estado vacío y mantiene visible la copia de seguridad', async () => {
    renderHome()

    expect(await screen.findByText('Aún no hay anime en tu biblioteca.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Importar' })).toBeInTheDocument()
  })

  it('cuenta lo que hay y lo que se está viendo, y lista los últimos modificados', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    for (let id = 1; id <= 6; id++) {
      vi.setSystemTime(id * 1000)
      await animeRepository.addToLibrary(anime(id, `Anime ${id}`))
    }
    vi.setSystemTime(7000)
    await animeRepository.updateLibraryEntry(2, { userStatus: 'watching' })
    vi.setSystemTime(8000)
    await animeRepository.updateLibraryEntry(3, { userStatus: 'watching' })
    vi.setSystemTime(9000)
    await animeRepository.markEpisodeWatched(1, 1)
    renderHome()

    const total = (await screen.findByText('En tu biblioteca', { selector: 'p' })).previousElementSibling
    expect(total).toHaveTextContent('6')
    expect(screen.getByText('Viendo', { selector: 'p' }).previousElementSibling).toHaveTextContent('2')
    const recent = screen
      .getAllByRole('heading', { level: 2 })
      .map((h) => h.textContent)
      .filter((text) => text?.startsWith('Anime '))
    expect(recent).toEqual(['Anime 1', 'Anime 3', 'Anime 2', 'Anime 6', 'Anime 5'])
    expect(screen.queryByText('Anime 4')).not.toBeInTheDocument()
  })
})

describe('Inicio: copia de seguridad', () => {
  it('exporta un JSON con la biblioteca y el progreso', async () => {
    await animeRepository.addToLibrary(anime(1, 'Naruto'))
    await animeRepository.markEpisodesUpTo(1, 2)
    renderHome()

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Exportar' }))

    await waitFor(() => expect(downloadTextFile).toHaveBeenCalledTimes(1))
    const [filename, content] = vi.mocked(downloadTextFile).mock.calls[0]
    expect(filename).toMatch(/^anime-tracker-respaldo-\d{4}-\d{2}-\d{2}\.json$/)
    const parsed = JSON.parse(content)
    expect(parsed).toMatchObject({ app: 'anime-tracker', version: 1 })
    expect(parsed.library).toHaveLength(1)
    expect(parsed.watchedEpisodes).toHaveLength(2)
  })

  it('importa un respaldo válido tras confirmar, reemplazando los datos actuales', async () => {
    // Respaldo con 2 anime y 4 episodios vistos.
    await animeRepository.addToLibrary(anime(1, 'Actual'))
    await animeRepository.markEpisodeWatched(1, 1)
    await animeRepository.addToLibrary(anime(7, 'Importado'))
    await animeRepository.markEpisodesUpTo(7, 3)
    const { library, watchedEpisodes } = await animeRepository.exportData()
    const backup = createBackup(library, watchedEpisodes)

    // Estado actual distinto: 1 anime y 1 episodio visto.
    await db.library.clear()
    await db.watchedEpisodes.clear()
    await animeRepository.addToLibrary(anime(1, 'Actual'))
    await animeRepository.markEpisodeWatched(1, 1)
    const user = userEvent.setup()
    renderHome()

    await user.upload(await screen.findByLabelText('Archivo de copia de seguridad'), backupFile(backup))

    const dialog = await screen.findByRole('dialog', { name: '¿Reemplazar tus datos?' })
    expect(dialog).toHaveTextContent('El archivo contiene 2 anime y 4 episodios vistos')
    expect(dialog).toHaveTextContent('(1 anime y 1 episodio visto)')
    expect(await animeRepository.getLibraryEntry(7)).toBeUndefined()

    await user.click(within(dialog).getByRole('button', { name: 'Reemplazar' }))

    await waitFor(async () => expect(await animeRepository.getLibraryEntry(7)).toBeDefined())
    expect(await animeRepository.getWatchedEpisodes(7)).toHaveLength(3)
    expect(await screen.findByText('Copia de seguridad importada.')).toBeInTheDocument()
  })

  it('cancelar la confirmación no modifica nada', async () => {
    await animeRepository.addToLibrary(anime(1, 'Actual'))
    const backup = createBackup([], [])
    const user = userEvent.setup()
    renderHome()

    await user.upload(await screen.findByLabelText('Archivo de copia de seguridad'), backupFile(backup))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancelar' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await animeRepository.getLibraryEntry(1)).toBeDefined()
  })

  it.each([
    ['no es JSON', 'esto no es json', /no es un JSON válido/],
    ['no es un respaldo de la app', { hola: 'mundo' }, /app:/],
    ['tiene datos inválidos', { ...createBackup([], []), library: [{ anilistId: 'x' }] }, /library\[0\]/],
  ])('rechaza un archivo que %s sin tocar los datos', async (_name, content, message) => {
    await animeRepository.addToLibrary(anime(1, 'Actual'))
    const user = userEvent.setup()
    renderHome()

    await user.upload(await screen.findByLabelText('Archivo de copia de seguridad'), backupFile(content))

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await animeRepository.getLibraryEntry(1)).toBeDefined()
  })
})
