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

export const router = createBrowserRouter(routes)

export const createTestRouter = (initialEntries: string[]) =>
  createMemoryRouter(routes, { initialEntries })
