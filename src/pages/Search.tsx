import AddIcon from '@mui/icons-material/Add'
import CheckIcon from '@mui/icons-material/Check'
import SearchIcon from '@mui/icons-material/Search'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import Snackbar from '@mui/material/Snackbar'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import AnimeCard from '../components/AnimeCard'
import { useAnimeSearch } from '../hooks/useAnimeSearch'
import { useLibrary } from '../hooks/useLibrary'
import type { AnimeMetadata } from '../types/anime'
import { getDisplayTitle } from '../utils/anime'

interface Notice {
  severity: 'success' | 'error'
  text: string
}

function parsePage(value: string | null): number {
  const page = Number(value)
  return Number.isInteger(page) && page > 0 ? page : 1
}

interface SearchFormProps {
  initialQuery: string
  onSubmit: (query: string) => void
}

function SearchForm({ initialQuery, onSubmit }: SearchFormProps) {
  const [value, setValue] = useState(initialQuery)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const query = value.trim()
    if (query) onSubmit(query)
  }

  return (
    <Box component="form" onSubmit={handleSubmit} role="search" sx={{ display: 'flex', gap: 1, mb: 3 }}>
      <TextField
        label="Buscar anime"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        fullWidth
        size="small"
      />
      <Button type="submit" variant="contained" startIcon={<SearchIcon />} disabled={!value.trim()}>
        Buscar
      </Button>
    </Box>
  )
}

export default function Search() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q')?.trim() ?? ''
  const page = parsePage(params.get('page'))

  const { state, retry } = useAnimeSearch(query, page)
  const library = useLibrary()
  const [notice, setNotice] = useState<Notice | null>(null)

  const addedIds = new Set(library.entries.map((entry) => entry.anilistId))

  const goToPage = (nextPage: number) => setParams({ q: query, page: String(nextPage) })

  const handleAdd = async (anime: AnimeMetadata) => {
    const title = getDisplayTitle(anime)
    try {
      await library.addAnime(anime)
      setNotice({ severity: 'success', text: `«${title}» se agregó a la biblioteca.` })
    } catch {
      setNotice({ severity: 'error', text: `No se pudo agregar «${title}» a la biblioteca.` })
    }
  }

  return (
    <>
      <Typography variant="h4" component="h1" gutterBottom>
        Buscar
      </Typography>

      <SearchForm key={query} initialQuery={query} onSubmit={(q) => setParams({ q })} />

      {library.status === 'error' && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          No se pudo leer tu biblioteca; no es posible agregar anime por ahora.
        </Alert>
      )}

      {state.status === 'idle' && (
        <Alert severity="info">Escribe un título y pulsa «Buscar» para consultar AniList.</Alert>
      )}

      {state.status === 'loading' && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress aria-label="Buscando" />
        </Box>
      )}

      {state.status === 'error' && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={retry}>
              Reintentar
            </Button>
          }
        >
          {state.message}
        </Alert>
      )}

      {state.status === 'success' && state.data.items.length === 0 && (
        <Alert severity="info">
          {page > 1 ? 'No hay más resultados.' : `Sin resultados para «${query}».`}
        </Alert>
      )}

      {state.status === 'success' && state.data.items.length > 0 && (
        <>
          <Grid container spacing={2}>
            {state.data.items.map((anime) => (
              <Grid key={anime.anilistId} size={{ xs: 12, md: 6 }}>
                <AnimeCard
                  anime={anime}
                  action={
                    addedIds.has(anime.anilistId) ? (
                      <Chip icon={<CheckIcon />} label="Ya agregado" color="success" variant="outlined" />
                    ) : (
                      <Button
                        size="small"
                        startIcon={<AddIcon />}
                        disabled={library.status !== 'ready'}
                        onClick={() => void handleAdd(anime)}
                      >
                        Agregar
                      </Button>
                    )
                  }
                />
              </Grid>
            ))}
          </Grid>

          <Box
            component="nav"
            aria-label="Paginación de resultados"
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mt: 3 }}
          >
            <Button disabled={page <= 1} onClick={() => goToPage(page - 1)}>
              Anterior
            </Button>
            <Typography>Página {state.data.page}</Typography>
            <Button disabled={!state.data.hasNextPage} onClick={() => goToPage(page + 1)}>
              Siguiente
            </Button>
          </Box>
        </>
      )}

      <Snackbar open={notice !== null} autoHideDuration={4000} onClose={() => setNotice(null)}>
        {notice ? (
          <Alert severity={notice.severity} onClose={() => setNotice(null)} variant="filled">
            {notice.text}
          </Alert>
        ) : undefined}
      </Snackbar>
    </>
  )
}
