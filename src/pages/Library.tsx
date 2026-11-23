import Alert from '@mui/material/Alert'
import Typography from '@mui/material/Typography'

export default function Library() {
  return (
    <>
      <Typography variant="h4" component="h1" gutterBottom>
        Biblioteca
      </Typography>
      <Alert severity="info">Tu biblioteca está vacía.</Alert>
    </>
  )
}
