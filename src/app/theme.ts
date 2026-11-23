import { createTheme, type Theme } from '@mui/material/styles'

export type ThemeMode = 'dark' | 'light'

// Para activar el tema claro basta con pasar 'light'; hoy se usa siempre 'dark'.
export function createAppTheme(mode: ThemeMode): Theme {
  return createTheme({
    palette: {
      mode,
      primary: { main: mode === 'dark' ? '#90caf9' : '#1565c0' },
    },
  })
}

export const darkTheme = createAppTheme('dark')
