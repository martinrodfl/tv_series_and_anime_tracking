import FavoriteIcon from '@mui/icons-material/Favorite'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'
import IconButton from '@mui/material/IconButton'

interface FavoriteButtonProps {
  favorite: boolean
  title: string
  onToggle: (favorite: boolean) => void
}

export default function FavoriteButton({ favorite, title, onToggle }: FavoriteButtonProps) {
  return (
    <IconButton
      size="small"
      color={favorite ? 'error' : 'default'}
      // Nombre fijo: el estado lo comunica aria-pressed, no el texto.
      aria-pressed={favorite}
      aria-label={`Favorito: «${title}»`}
      onClick={() => onToggle(!favorite)}
    >
      {favorite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
    </IconButton>
  )
}
