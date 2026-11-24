import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'
import Typography from '@mui/material/Typography'
import { calculateProgress } from '../utils/progress'

interface ProgressSummaryProps {
  watchedCount: number
  available: number | null
}

export default function ProgressSummary({ watchedCount, available }: ProgressSummaryProps) {
  const progress = calculateProgress(watchedCount, available)

  if (progress === null || available === null) {
    return (
      <Box>
        <Typography variant="subtitle2">Progreso</Typography>
        <Typography color="text.secondary">
          Progreso no disponible: no se conoce el total de episodios. Episodios marcados: {watchedCount}.
        </Typography>
      </Box>
    )
  }

  const percent = Math.round(progress)

  return (
    <Box>
      <Typography variant="subtitle2" id="progress-label">
        Progreso
      </Typography>
      <LinearProgress
        variant="determinate"
        value={progress}
        aria-labelledby="progress-label"
        sx={{ height: 8, borderRadius: 4, my: 1 }}
      />
      <Typography color="text.secondary">
        {available === 0
          ? 'Aún no se emitió ningún episodio.'
          : `${Math.min(watchedCount, available)} de ${available} episodios vistos (${percent} %)`}
      </Typography>
    </Box>
  )
}
