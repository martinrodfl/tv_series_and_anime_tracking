import Alert from '@mui/material/Alert'
import Typography from '@mui/material/Typography'

export default function Search() {
  return (
    <>
      <Typography variant="h4" component="h1" gutterBottom>
        Buscar
      </Typography>
      <Alert severity="info">La búsqueda estará disponible en una etapa posterior.</Alert>
    </>
  )
}
