import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import { Link as RouterLink } from 'react-router'
import AnimeCard from '../components/AnimeCard'
import { useLibrary } from '../hooks/useLibrary'
import { USER_STATUS_LABELS } from '../utils/anime'

export default function Library() {
  const { status, entries } = useLibrary()

  return (
    <>
      <Typography variant="h4" component="h1" gutterBottom>
        Biblioteca
      </Typography>

      {status === 'loading' && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress aria-label="Cargando biblioteca" />
        </Box>
      )}

      {status === 'error' && <Alert severity="error">No se pudo leer tu biblioteca.</Alert>}

      {status === 'ready' && entries.length === 0 && (
        <Alert
          severity="info"
          action={
            <Button color="inherit" size="small" component={RouterLink} to="/search">
              Buscar anime
            </Button>
          }
        >
          Tu biblioteca está vacía.
        </Alert>
      )}

      {status === 'ready' && entries.length > 0 && (
        <Grid container spacing={2}>
          {entries.map((entry) => (
            <Grid key={entry.anilistId} size={{ xs: 12, md: 6 }}>
              <AnimeCard
                anime={entry}
                action={<Chip label={USER_STATUS_LABELS[entry.userStatus]} size="small" />}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </>
  )
}
