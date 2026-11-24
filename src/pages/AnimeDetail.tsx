import AddIcon from '@mui/icons-material/Add'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import FormControl from '@mui/material/FormControl'
import Grid from '@mui/material/Grid'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Select from '@mui/material/Select'
import Typography from '@mui/material/Typography'
import { Link as RouterLink, useParams } from 'react-router'
import EpisodeTracker from '../components/EpisodeTracker'
import FavoriteButton from '../components/FavoriteButton'
import NoticeSnackbar from '../components/NoticeSnackbar'
import ProgressSummary from '../components/ProgressSummary'
import RemoveAnimeButton from '../components/RemoveAnimeButton'
import { useAnimeDetail } from '../hooks/useAnimeDetail'
import { useAnimeTracking } from '../hooks/useAnimeTracking'
import { useNotice } from '../hooks/useNotice'
import { USER_STATUSES, type AnimeMetadata } from '../types/anime'
import { describeAiringStatus, describeAnime, getDisplayTitle, USER_STATUS_LABELS } from '../utils/anime'
import { getAvailableEpisodes, shouldSuggestCompleted } from '../utils/progress'

const RATINGS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

function parseAnimeId(value: string | undefined): number | null {
  return value !== undefined && /^[1-9]\d*$/.test(value) ? Number(value) : null
}

export default function AnimeDetail() {
  const { id } = useParams()
  const anilistId = parseAnimeId(id)

  if (anilistId === null) {
    return (
      <>
        <Typography variant="h4" component="h1" gutterBottom>
          Detalle del anime
        </Typography>
        <Alert severity="error" sx={{ mb: 2 }}>
          El identificador del anime no es válido.
        </Alert>
        <BackLink />
      </>
    )
  }

  return <AnimeDetailContent key={anilistId} anilistId={anilistId} />
}

function BackLink() {
  return (
    <Button component={RouterLink} to="/library" sx={{ mt: 2 }}>
      Volver a la biblioteca
    </Button>
  )
}

function AnimeDetailContent({ anilistId }: { anilistId: number }) {
  const detail = useAnimeDetail(anilistId)
  const remote = detail.state.status === 'success' ? detail.state.data : null
  const tracking = useAnimeTracking(anilistId, remote)
  const { notice, clearNotice, run } = useNotice()

  const { entry } = tracking
  // Datos de AniList si llegaron; si no (p. ej. sin conexión), los guardados en la biblioteca.
  const info: AnimeMetadata | null = remote ?? entry ?? null
  const title = info ? getDisplayTitle(info) : 'Detalle del anime'
  const available = info ? getAvailableEpisodes(info) : null

  return (
    <>
      <Typography variant="h4" component="h1" gutterBottom>
        {title}
      </Typography>
      {info && info.title.romaji && info.title.romaji !== title && (
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          {info.title.romaji}
        </Typography>
      )}

      {detail.state.status === 'loading' && !info && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress aria-label="Cargando anime" />
        </Box>
      )}

      {detail.state.status === 'error' && (
        <Alert
          severity={info ? 'warning' : 'error'}
          sx={{ mb: 2 }}
          action={
            detail.state.retryable ? (
              <Button color="inherit" size="small" onClick={detail.retry}>
                Reintentar
              </Button>
            ) : undefined
          }
        >
          {detail.state.message}
          {info && ' Se muestran los datos guardados en tu biblioteca.'}
        </Alert>
      )}

      {info && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 4, md: 3 }}>
            {info.coverUrl ? (
              <Box
                component="img"
                src={info.coverUrl}
                alt={`Portada de ${title}`}
                sx={{ width: '100%', maxWidth: 260, borderRadius: 1, display: 'block' }}
              />
            ) : (
              <Box role="img" aria-label="Sin portada" sx={{ height: 260, maxWidth: 260, bgcolor: 'action.hover' }} />
            )}
          </Grid>
          <Grid size={{ xs: 12, sm: 8, md: 9 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              <Chip label={describeAnime(info)} />
              {describeAiringStatus(info.airingStatus) && <Chip label={describeAiringStatus(info.airingStatus)} />}
              {remote?.genres.map((genre) => <Chip key={genre} label={genre} variant="outlined" />)}
            </Box>
            {remote ? (
              <Typography sx={{ whiteSpace: 'pre-line' }}>
                {remote.description ?? 'AniList no tiene descripción para este anime.'}
              </Typography>
            ) : detail.state.status === 'loading' ? (
              <CircularProgress size={20} aria-label="Cargando descripción" />
            ) : (
              <Typography color="text.secondary">Descripción no disponible sin conexión con AniList.</Typography>
            )}
          </Grid>
        </Grid>
      )}

      {info && (
        <Paper variant="outlined" component="section" aria-labelledby="tracking-heading" sx={{ p: 2 }}>
          <Typography variant="h6" component="h2" id="tracking-heading" gutterBottom>
            Seguimiento
          </Typography>

          {tracking.status === 'loading' && <CircularProgress size={24} aria-label="Cargando seguimiento" />}

          {tracking.status === 'error' && <Alert severity="error">No se pudo leer tu biblioteca.</Alert>}

          {tracking.status === 'ready' && !entry && (
            <Alert
              severity="info"
              action={
                <Button
                  color="inherit"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() =>
                    void run(
                      () => tracking.addAnime(info),
                      `«${title}» se agregó a la biblioteca.`,
                      `No se pudo agregar «${title}» a la biblioteca.`,
                    )
                  }
                >
                  Agregar a la biblioteca
                </Button>
              }
            >
              Agrega este anime a tu biblioteca para llevar el seguimiento.
            </Alert>
          )}

          {tracking.status === 'ready' && entry && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel id="user-status-label">Estado</InputLabel>
                  <Select
                    labelId="user-status-label"
                    label="Estado"
                    value={entry.userStatus}
                    onChange={(event) => {
                      const userStatus = USER_STATUSES.find((status) => status === event.target.value)
                      if (userStatus) {
                        void run(() => tracking.setUserStatus(userStatus), null, 'No se pudo cambiar el estado.')
                      }
                    }}
                  >
                    {USER_STATUSES.map((status) => (
                      <MenuItem key={status} value={status}>
                        {USER_STATUS_LABELS[status]}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel id="rating-label">Puntuación</InputLabel>
                  <Select
                    labelId="rating-label"
                    label="Puntuación"
                    value={entry.rating === null ? 'none' : String(entry.rating)}
                    onChange={(event) => {
                      const rating = RATINGS.find((value) => String(value) === event.target.value) ?? null
                      void run(() => tracking.setRating(rating), null, 'No se pudo cambiar la puntuación.')
                    }}
                  >
                    <MenuItem value="none">Sin puntuar</MenuItem>
                    {RATINGS.map((rating) => (
                      <MenuItem key={rating} value={String(rating)}>
                        {rating} / 10
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FavoriteButton
                  favorite={entry.favorite}
                  title={title}
                  onToggle={(favorite) =>
                    void run(() => tracking.setFavorite(favorite), null, 'No se pudo cambiar el favorito.')
                  }
                />

                <Box sx={{ flexGrow: 1 }} />

                <RemoveAnimeButton
                  variant="text"
                  title={title}
                  watchedCount={tracking.watchedEpisodes.length}
                  onRemove={() =>
                    void run(
                      () => tracking.removeAnime(),
                      `«${title}» se quitó de la biblioteca.`,
                      `No se pudo quitar «${title}» de la biblioteca.`,
                    )
                  }
                />
              </Box>

              {shouldSuggestCompleted(entry, tracking.watchedEpisodes) && (
                <Alert
                  severity="success"
                  action={
                    <Button
                      color="inherit"
                      size="small"
                      onClick={() =>
                        void run(() => tracking.setUserStatus('completed'), null, 'No se pudo cambiar el estado.')
                      }
                    >
                      Marcar como completado
                    </Button>
                  }
                >
                  Viste todos los episodios. ¿Quieres marcar el anime como completado?
                </Alert>
              )}

              <ProgressSummary watchedCount={tracking.watchedEpisodes.length} available={available} />

              <EpisodeTracker
                available={available}
                watched={tracking.watchedEpisodes}
                onMark={(episodeNumber) =>
                  void run(
                    () => tracking.markEpisode(episodeNumber),
                    null,
                    `No se pudo marcar el episodio ${episodeNumber}.`,
                  )
                }
                onUnmark={(episodeNumber) =>
                  void run(
                    () => tracking.unmarkEpisode(episodeNumber),
                    null,
                    `No se pudo desmarcar el episodio ${episodeNumber}.`,
                  )
                }
                onMarkUpTo={(episodeNumber) =>
                  void run(
                    () => tracking.markEpisodesUpTo(episodeNumber),
                    null,
                    `No se pudieron marcar los episodios hasta el ${episodeNumber}.`,
                  )
                }
              />
            </Box>
          )}
        </Paper>
      )}

      <BackLink />

      <NoticeSnackbar notice={notice} onClose={clearNotice} />
    </>
  )
}
