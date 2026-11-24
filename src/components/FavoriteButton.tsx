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
      aria-pressed={favorite}
      aria-label={favorite ? `Quitar «${title}» de favoritos` : `Marcar «${title}» como favorito`}
      onClick={() => onToggle(!favorite)}
    >
      {favorite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
    </IconButton>
  )
}
