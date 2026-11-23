import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { Link as RouterLink, useParams } from 'react-router'

export default function AnimeDetail() {
  const { id } = useParams()
  const isValidId = id !== undefined && /^[1-9]\d*$/.test(id)

  return (
    <>
      <Typography variant="h4" component="h1" gutterBottom>
        Detalle del anime
      </Typography>
      {isValidId ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Anime #{id}: el detalle estará disponible en una etapa posterior.
        </Alert>
      ) : (
        <Alert severity="error" sx={{ mb: 2 }}>
          El identificador del anime no es válido.
        </Alert>
      )}
      <Button component={RouterLink} to="/library">
        Volver a la biblioteca
      </Button>
    </>
  )
}
