import Alert from '@mui/material/Alert'
import Typography from '@mui/material/Typography'

export default function Home() {
  return (
    <>
      <Typography variant="h4" component="h1" gutterBottom>
        Inicio
      </Typography>
      <Alert severity="info">Aún no hay anime en tu biblioteca.</Alert>
    </>
  )
}
