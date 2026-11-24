import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import FormControl from '@mui/material/FormControl'
import Grid from '@mui/material/Grid'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import Typography from '@mui/material/Typography'
import { Link as RouterLink, useSearchParams } from 'react-router'
import AnimeCard from '../components/AnimeCard'
import FavoriteButton from '../components/FavoriteButton'
import NoticeSnackbar from '../components/NoticeSnackbar'
import RemoveAnimeButton from '../components/RemoveAnimeButton'
import { useLibrary } from '../hooks/useLibrary'
import { useNotice } from '../hooks/useNotice'
import { USER_STATUSES, type LibraryEntry } from '../types/anime'
import { getDisplayTitle, USER_STATUS_LABELS } from '../utils/anime'
import {
  DEFAULT_LIBRARY_FILTERS,
  filterAndSortLibrary,
  LIBRARY_SORT_LABELS,
  LIBRARY_SORTS,
  type LibraryFilters,
} from '../utils/library'
import { describeProgress, getAvailableEpisodes } from '../utils/progress'

function readFilters(params: URLSearchParams): LibraryFilters {
  return {
    search: params.get('q') ?? '',
    status: USER_STATUSES.find((status) => status === params.get('status')) ?? 'all',
    favoritesOnly: params.get('fav') === '1',
    sort: LIBRARY_SORTS.find((sort) => sort === params.get('sort')) ?? DEFAULT_LIBRARY_FILTERS.sort,
  }
}

// Solo se escriben en la URL los filtros que difieren de los valores por defecto.
function writeFilters(filters: LibraryFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.search) params.set('q', filters.search)
  if (filters.status !== 'all') params.set('status', filters.status)
  if (filters.favoritesOnly) params.set('fav', '1')
  if (filters.sort !== DEFAULT_LIBRARY_FILTERS.sort) params.set('sort', filters.sort)
  return params
}

export default function Library() {
  const { status, entries, watchedCounts, setFavorite, removeAnime } = useLibrary()
  const [params, setParams] = useSearchParams()
  const { notice, clearNotice, run } = useNotice()

  const filters = readFilters(params)
  const visible = filterAndSortLibrary(entries, filters)
  const hasActiveFilters = filters.search.trim() !== '' || filters.status !== 'all' || filters.favoritesOnly

  const updateFilters = (changes: Partial<LibraryFilters>) =>
    setParams(writeFilters({ ...filters, ...changes }), { replace: true })

  const renderEntry = (entry: LibraryEntry) => {
    const title = getDisplayTitle(entry)
    const watchedCount = watchedCounts.get(entry.anilistId) ?? 0
    return (
      <AnimeCard
        anime={entry}
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', width: '100%' }}>
            <Chip label={USER_STATUS_LABELS[entry.userStatus]} size="small" />
            {entry.rating !== null && <Chip label={`★ ${entry.rating}/10`} size="small" variant="outlined" />}
            <Box sx={{ flexGrow: 1 }} />
            <FavoriteButton
              favorite={entry.favorite}
              title={title}
              onToggle={(favorite) =>
                void run(() => setFavorite(entry.anilistId, favorite), null, 'No se pudo cambiar el favorito.')
              }
            />
            <RemoveAnimeButton
              title={title}
              watchedCount={watchedCount}
              onRemove={() =>
                void run(
                  () => removeAnime(entry.anilistId),
                  `«${title}» se quitó de la biblioteca.`,
                  `No se pudo quitar «${title}» de la biblioteca.`,
                )
              }
            />
          </Box>
        }
      >
        <Typography variant="body2" color="text.secondary">
          {describeProgress(watchedCount, getAvailableEpisodes(entry))}
        </Typography>
      </AnimeCard>
    )
  }

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
        <>
          <Box role="search" aria-label="Filtros de la biblioteca" sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
            <TextField
              label="Buscar en la biblioteca"
              size="small"
              value={filters.search}
              onChange={(event) => updateFilters({ search: event.target.value })}
              sx={{ flexGrow: 1, minWidth: 200 }}
            />
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel id="filter-status-label">Estado</InputLabel>
              <Select
                labelId="filter-status-label"
                label="Estado"
                value={filters.status}
                onChange={(event) =>
                  updateFilters({ status: USER_STATUSES.find((s) => s === event.target.value) ?? 'all' })
                }
              >
                <MenuItem value="all">Todos</MenuItem>
                {USER_STATUSES.map((userStatus) => (
                  <MenuItem key={userStatus} value={userStatus}>
                    {USER_STATUS_LABELS[userStatus]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="sort-label">Ordenar por</InputLabel>
              <Select
                labelId="sort-label"
                label="Ordenar por"
                value={filters.sort}
                onChange={(event) =>
                  updateFilters({
                    sort: LIBRARY_SORTS.find((s) => s === event.target.value) ?? DEFAULT_LIBRARY_FILTERS.sort,
                  })
                }
              >
                {LIBRARY_SORTS.map((sort) => (
                  <MenuItem key={sort} value={sort}>
                    {LIBRARY_SORT_LABELS[sort]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <ToggleButton
              value="favorites"
              size="small"
              selected={filters.favoritesOnly}
              onChange={() => updateFilters({ favoritesOnly: !filters.favoritesOnly })}
            >
              Solo favoritos
            </ToggleButton>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }} aria-live="polite">
            Mostrando {visible.length} de {entries.length}
          </Typography>

          {visible.length === 0 ? (
            <Alert
              severity="info"
              action={
                hasActiveFilters ? (
                  <Button color="inherit" size="small" onClick={() => setParams({}, { replace: true })}>
                    Limpiar filtros
                  </Button>
                ) : undefined
              }
            >
              Ningún anime coincide con los filtros.
            </Alert>
          ) : (
            <Grid container spacing={2}>
              {visible.map((entry) => (
                <Grid key={entry.anilistId} size={{ xs: 12, md: 6 }}>
                  {renderEntry(entry)}
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}

      <NoticeSnackbar notice={notice} onClose={clearNotice} />
    </>
  )
}
