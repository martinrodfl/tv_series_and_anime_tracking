import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import { Link as RouterLink } from 'react-router'
import AnimeCard from '../components/AnimeCard'
import BackupPanel from '../components/BackupPanel'
import { useLibrary } from '../hooks/useLibrary'
import { USER_STATUS_LABELS } from '../utils/anime'
import { summarizeLibrary } from '../utils/library'

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="h4" component="p">
        {value}
      </Typography>
      <Typography color="text.secondary">{label}</Typography>
    </Paper>
  )
}

export default function Home() {
  const { status, entries, watchedCounts } = useLibrary()
  const summary = summarizeLibrary(entries)
  const watchedEpisodes = [...watchedCounts.values()].reduce((sum, count) => sum + count, 0)

  return (
    <>
      <Typography variant="h4" component="h1" gutterBottom>
        Inicio
      </Typography>

      {status === 'loading' && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress aria-label="Cargando resumen" />
        </Box>
      )}

      {status === 'error' && <Alert severity="error">No se pudo leer tu biblioteca.</Alert>}

      {status === 'ready' && summary.total === 0 && (
        <Alert
          severity="info"
          action={
            <Button color="inherit" size="small" component={RouterLink} to="/search">
              Buscar anime
            </Button>
          }
        >
          Aún no hay anime en tu biblioteca.
        </Alert>
      )}

      {status === 'ready' && summary.total > 0 && (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 6, md: 3 }}>
              <Stat label="En tu biblioteca" value={summary.total} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Stat label="Viendo" value={summary.watching} />
            </Grid>
          </Grid>

          <Typography variant="h6" component="h2" gutterBottom>
            Últimos agregados o modificados
          </Typography>
          <Grid container spacing={2}>
            {summary.recent.map((entry) => (
              <Grid key={entry.anilistId} size={{ xs: 12, md: 6 }}>
                <AnimeCard
                  anime={entry}
                  action={<Chip label={USER_STATUS_LABELS[entry.userStatus]} size="small" />}
                />
              </Grid>
            ))}
          </Grid>
        </>
      )}

      <BackupPanel currentAnime={entries.length} currentEpisodes={watchedEpisodes} />
    </>
  )
}
