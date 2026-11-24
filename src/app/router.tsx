import { createBrowserRouter, createMemoryRouter, type RouteObject } from 'react-router'
import AppLayout from '../components/AppLayout'
import AnimeDetail from '../pages/AnimeDetail'
import Home from '../pages/Home'
import Library from '../pages/Library'
import NotFound from '../pages/NotFound'
import Search from '../pages/Search'

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/library', element: <Library /> },
      { path: '/search', element: <Search /> },
      { path: '/anime/:id', element: <AnimeDetail /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]

// BASE_URL es «/» en desarrollo y la ruta del despliegue en producción (p. ej. GitHub Pages).
export const router = createBrowserRouter(routes, { basename: import.meta.env.BASE_URL })

export const createTestRouter = (initialEntries: string[]) =>
  createMemoryRouter(routes, { initialEntries })
