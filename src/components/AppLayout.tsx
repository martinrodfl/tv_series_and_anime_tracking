import AppBar from '@mui/material/AppBar'
import BottomNavigation from '@mui/material/BottomNavigation'
import BottomNavigationAction from '@mui/material/BottomNavigationAction'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Paper from '@mui/material/Paper'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import HomeIcon from '@mui/icons-material/Home'
import SearchIcon from '@mui/icons-material/Search'
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary'
import type { ReactElement } from 'react'
import { Link as RouterLink, Outlet, useLocation } from 'react-router'

interface NavItem {
  label: string
  path: string
  icon: ReactElement
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Inicio', path: '/', icon: <HomeIcon /> },
  { label: 'Biblioteca', path: '/library', icon: <VideoLibraryIcon /> },
  { label: 'Buscar', path: '/search', icon: <SearchIcon /> },
]

const isActive = (itemPath: string, pathname: string) =>
  itemPath === '/' ? pathname === '/' : pathname.startsWith(itemPath)

export default function AppLayout() {
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))
  const { pathname } = useLocation()
  const activePath = NAV_ITEMS.find((item) => isActive(item.path, pathname))?.path ?? false

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="sticky" color="default" enableColorOnDark>
        <Toolbar>
          <Typography variant="h6" component="span" sx={{ flexGrow: 1 }}>
            Anime Tracker
          </Typography>
          {isDesktop && (
            <Box component="nav" aria-label="Navegación principal" sx={{ display: 'flex', gap: 1 }}>
              {NAV_ITEMS.map((item) => (
                <Button
                  key={item.path}
                  component={RouterLink}
                  to={item.path}
                  color={activePath === item.path ? 'primary' : 'inherit'}
                  startIcon={item.icon}
                  aria-current={activePath === item.path ? 'page' : undefined}
                >
                  {item.label}
                </Button>
              ))}
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Container
        component="main"
        maxWidth="lg"
        sx={{ flexGrow: 1, py: 3, pb: isDesktop ? 3 : 10 }}
      >
        <Outlet />
      </Container>

      {!isDesktop && (
        <Paper
          component="nav"
          aria-label="Navegación principal"
          elevation={3}
          sx={{ position: 'fixed', bottom: 0, left: 0, right: 0 }}
        >
          <BottomNavigation showLabels value={activePath}>
            {NAV_ITEMS.map((item) => (
              <BottomNavigationAction
                key={item.path}
                component={RouterLink}
                to={item.path}
                value={item.path}
                label={item.label}
                icon={item.icon}
              />
            ))}
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  )
}
