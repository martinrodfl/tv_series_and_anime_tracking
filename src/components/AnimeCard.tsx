import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardActions from '@mui/material/CardActions'
import CardContent from '@mui/material/CardContent'
import CardMedia from '@mui/material/CardMedia'
import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'
import { Link as RouterLink } from 'react-router'
import type { AnimeMetadata } from '../types/anime'
import { describeAnime, getDisplayTitle } from '../utils/anime'

interface AnimeCardProps {
  anime: AnimeMetadata
  action?: ReactNode
  /** Contenido extra bajo el subtítulo (p. ej. el progreso). */
  children?: ReactNode
}

export default function AnimeCard({ anime, action, children }: AnimeCardProps) {
  const title = getDisplayTitle(anime)

  return (
    <Card variant="outlined" sx={{ display: 'flex', height: '100%' }}>
      {anime.coverUrl ? (
        <CardMedia
          component="img"
          image={anime.coverUrl}
          alt={`Portada de ${title}`}
          loading="lazy"
          sx={{ width: 96, flexShrink: 0, objectFit: 'cover' }}
        />
      ) : (
        <Box
          role="img"
          aria-label="Sin portada"
          sx={{ width: 96, flexShrink: 0, bgcolor: 'action.hover' }}
        />
      )}
      <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0 }}>
        <CardContent sx={{ flexGrow: 1 }}>
          <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600 }}>
            <Link component={RouterLink} to={`/anime/${anime.anilistId}`} color="inherit" underline="hover">
              {title}
            </Link>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {describeAnime(anime)}
          </Typography>
          {children}
        </CardContent>
        {action && <CardActions>{action}</CardActions>}
      </Box>
    </Card>
  )
}
