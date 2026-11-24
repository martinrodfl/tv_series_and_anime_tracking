import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import { useState } from 'react'

interface RemoveAnimeButtonProps {
  title: string
  /** Episodios vistos registrados; solo cambia el texto de la confirmación. */
  watchedCount: number
  variant?: 'icon' | 'text'
  onRemove: () => void
}

export default function RemoveAnimeButton({ title, watchedCount, variant = 'icon', onRemove }: RemoveAnimeButtonProps) {
  const [confirming, setConfirming] = useState(false)
  const label = `Quitar «${title}» de la biblioteca`

  return (
    <>
      {variant === 'icon' ? (
        <IconButton size="small" aria-label={label} onClick={() => setConfirming(true)}>
          <DeleteOutlineIcon />
        </IconButton>
      ) : (
        <Button color="error" startIcon={<DeleteOutlineIcon />} onClick={() => setConfirming(true)}>
          Quitar de la biblioteca
        </Button>
      )}

      <Dialog open={confirming} onClose={() => setConfirming(false)} aria-labelledby="remove-dialog-title">
        <DialogTitle id="remove-dialog-title">¿Quitar de la biblioteca?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {watchedCount > 0
              ? `«${title}» tiene ${watchedCount} ${watchedCount === 1 ? 'episodio visto registrado' : 'episodios vistos registrados'}. Se borrarán junto con el anime y no se podrán recuperar.`
              : `«${title}» se quitará de tu biblioteca junto con su estado, puntuación y favorito. No se podrá recuperar.`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirming(false)}>Cancelar</Button>
          <Button
            color="error"
            onClick={() => {
              setConfirming(false)
              onRemove()
            }}
          >
            Quitar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
