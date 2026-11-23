import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { Link as RouterLink } from 'react-router'

export default function NotFound() {
  return (
    <>
      <Typography variant="h4" component="h1" gutterBottom>
        Página no encontrada
      </Typography>
      <Button component={RouterLink} to="/">
        Ir al inicio
      </Button>
    </>
  )
}
