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
  /** Episodios vistos registrados; si hay alguno se pide confirmación. */
  watchedCount: number
  variant?: 'icon' | 'text'
  onRemove: () => void
}

export default function RemoveAnimeButton({ title, watchedCount, variant = 'icon', onRemove }: RemoveAnimeButtonProps) {
  const [confirming, setConfirming] = useState(false)
  const label = `Quitar «${title}» de la biblioteca`

  const handleClick = () => (watchedCount > 0 ? setConfirming(true) : onRemove())

  return (
    <>
      {variant === 'icon' ? (
        <IconButton size="small" aria-label={label} onClick={handleClick}>
          <DeleteOutlineIcon />
        </IconButton>
      ) : (
        <Button color="error" startIcon={<DeleteOutlineIcon />} onClick={handleClick}>
          Quitar de la biblioteca
        </Button>
      )}

      <Dialog open={confirming} onClose={() => setConfirming(false)} aria-labelledby="remove-dialog-title">
        <DialogTitle id="remove-dialog-title">¿Quitar de la biblioteca?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            «{title}» tiene {watchedCount} {watchedCount === 1 ? 'episodio visto registrado' : 'episodios vistos registrados'}.
            Se borrarán junto con el anime y no se podrán recuperar.
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
