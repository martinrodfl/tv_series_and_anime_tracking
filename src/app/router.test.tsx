import { ThemeProvider } from '@mui/material/styles'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createTestRouter } from './router'
import { darkTheme } from './theme'

// El detalle consulta AniList: aquí la petición queda pendiente para no salir a la red.
vi.mock('../services/anilist.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/anilist.service')>()),
  getAnimeById: vi.fn(() => new Promise(() => {})),
}))

function mockViewport(isDesktop: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: isDesktop,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  )
}

function renderAt(path: string) {
  return render(
    <ThemeProvider theme={darkTheme}>
      <RouterProvider router={createTestRouter([path])} />
    </ThemeProvider>,
  )
}

afterEach(() => vi.unstubAllGlobals())

describe('rutas', () => {
  it.each([
    ['/', 'Inicio'],
    ['/library', 'Biblioteca'],
    ['/search', 'Buscar'],
    ['/anime/21', 'Detalle del anime'],
    ['/no-existe', 'Página no encontrada'],
  ])('%s muestra el título "%s"', (path, title) => {
    mockViewport(true)
    renderAt(path)
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument()
  })

  it('/anime/:id consulta el anime y rechaza ids inválidos', () => {
    mockViewport(true)
    const { unmount } = renderAt('/anime/21')
    expect(screen.getByRole('progressbar', { name: 'Cargando anime' })).toBeInTheDocument()
    unmount()

    renderAt('/anime/abc')
    expect(screen.getByRole('alert')).toHaveTextContent('no es válido')
  })
})

describe.each([
  ['escritorio', true],
  ['móvil', false],
])('navegación en %s', (_name, isDesktop) => {
  it('permite navegar entre las secciones y marca la activa', async () => {
    mockViewport(isDesktop)
    const user = userEvent.setup()
    renderAt('/')

    const nav = screen.getByRole('navigation', { name: 'Navegación principal' })
    expect(nav).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Biblioteca' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Biblioteca' })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Buscar' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Buscar' })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Inicio' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Inicio' })).toBeInTheDocument()
  })
})
