import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import { useState, type FormEvent } from 'react'
import { MAX_EPISODE_NUMBER } from '../utils/progress'

interface EpisodeTrackerProps {
  /** Episodios emitidos; null si no se conoce el total. */
  available: number | null
  watched: number[]
  onMark: (episodeNumber: number) => void
  onUnmark: (episodeNumber: number) => void
  onMarkUpTo: (episodeNumber: number) => void
}

function parseEpisodeNumber(value: string, max: number): number | null {
  const episodeNumber = Number(value)
  return Number.isInteger(episodeNumber) && episodeNumber >= 1 && episodeNumber <= max ? episodeNumber : null
}

function ManualEpisodeForm({ onMark }: { onMark: (episodeNumber: number) => void }) {
  const [value, setValue] = useState('')
  const [invalid, setInvalid] = useState(false)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const episodeNumber = parseEpisodeNumber(value, MAX_EPISODE_NUMBER)
    if (episodeNumber === null) {
      setInvalid(true)
      return
    }
    setInvalid(false)
    setValue('')
    onMark(episodeNumber)
  }

  return (
    <Box component="form" noValidate onSubmit={handleSubmit} sx={{ display: 'flex', gap: 1, my: 2 }}>
      <TextField
        label="Número de episodio"
        type="number"
        size="small"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        error={invalid}
        helperText={invalid ? 'Escribe un número entero positivo.' : undefined}
        slotProps={{ htmlInput: { min: 1, step: 1 } }}
      />
      <Button type="submit" variant="outlined" sx={{ alignSelf: 'flex-start' }}>
        Marcar como visto
      </Button>
    </Box>
  )
}

/** Marca de una vez todos los episodios hasta el indicado (solo emitidos). */
function MarkUpToForm({ available, onMarkUpTo }: { available: number; onMarkUpTo: (episodeNumber: number) => void }) {
  const [value, setValue] = useState('')
  const [invalid, setInvalid] = useState(false)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const episodeNumber = parseEpisodeNumber(value, available)
    if (episodeNumber === null) {
      setInvalid(true)
      return
    }
    setInvalid(false)
    setValue('')
    onMarkUpTo(episodeNumber)
  }

  return (
    <Box component="form" noValidate onSubmit={handleSubmit} sx={{ display: 'flex', gap: 1, mb: 2 }}>
      <TextField
        label="Marcar hasta el episodio"
        type="number"
        size="small"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        error={invalid}
        helperText={invalid ? `Escribe un entero entre 1 y ${available}.` : undefined}
        slotProps={{ htmlInput: { min: 1, max: available, step: 1 } }}
      />
      <Button type="submit" variant="outlined" sx={{ alignSelf: 'flex-start' }}>
        Marcar hasta aquí
      </Button>
    </Box>
  )
}

export default function EpisodeTracker({ available, watched, onMark, onUnmark, onMarkUpTo }: EpisodeTrackerProps) {
  const watchedSet = new Set(watched)
  const emitted = Array.from({ length: available ?? 0 }, (_, index) => index + 1)
  const numbers = [...new Set([...emitted, ...watched])].sort((a, b) => a - b)

  return (
    <Box>
      {available === null && (
        <>
          <Alert severity="info" sx={{ mb: 1 }}>
            Se desconoce el total de episodios: el seguimiento es manual. Indica los números de los episodios que
            hayas visto.
          </Alert>
          <ManualEpisodeForm onMark={onMark} />
        </>
      )}

      {available !== null && available >= 2 && <MarkUpToForm available={available} onMarkUpTo={onMarkUpTo} />}

      {available === 0 && numbers.length === 0 && (
        <Alert severity="info">Aún no hay episodios emitidos que marcar.</Alert>
      )}

      {numbers.length > 0 && (
        <Box role="group" aria-label="Episodios" sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {numbers.map((episodeNumber) => {
            const isWatched = watchedSet.has(episodeNumber)
            return (
              <ToggleButton
                key={episodeNumber}
                value={episodeNumber}
                selected={isWatched}
                size="small"
                color="success"
                aria-label={`Episodio ${episodeNumber}`}
                onChange={() => (isWatched ? onUnmark(episodeNumber) : onMark(episodeNumber))}
                sx={{ minWidth: 48 }}
              >
                {episodeNumber}
              </ToggleButton>
            )
          })}
        </Box>
      )}
    </Box>
  )
}
